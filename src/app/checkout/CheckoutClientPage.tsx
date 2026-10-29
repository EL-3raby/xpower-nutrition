'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCart } from '@/hooks/useCart';
import { createOrder } from '@/lib/firebase/orders';
import { saveAbandonedCheckout } from '@/lib/firebase/abandoned-checkouts';
import { getSiteConfig, getShippingRates } from '@/lib/firebase/admin-actions';
import { sendNewOrderEmail } from '@/lib/emailjs';
import Link from 'next/link';
import { Coupon, SiteConfig, ShippingRate } from '@/lib/types';
import { db } from '@/lib/firebase/client';
import { getEgyptTime, toEgyptTime } from '@/lib/date-utils';
import { collection, doc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import Spinner from '@/components/ui/Spinner';
import { getOptimizedImageUrl } from '@/lib/utils/image';
import { trackBeginCheckout, trackPurchase } from '@/lib/analytics';
import { checkOrderSpamLimit, recordOrderSubmission, sanitizeText } from '@/lib/utils/security';

// Regex for Egyptian Phone Numbers
const phoneRegex = /^(010|011|012|015)[0-9]{8}$/;

// Validation Schema using Zod
const checkoutSchema = z.object({
  customerName: z.string()
    .min(1, { message: 'الاسم بالكامل مطلوب.' })
    .min(3, { message: 'يرجى كتابة الاسم الثلاثي على الأقل.' }),
  phone: z.string()
    .min(1, { message: 'رقم الموبايل مطلوب.' })
    .regex(phoneRegex, { message: 'يرجى كتابة رقم موبايل مصري صحيح (مثال: 01012345678).' }),
  governorate: z.string().min(1, { message: 'يرجى اختيار المحافظة.' }),
  city: z.string().min(1, { message: 'المدينة / المنطقة مطلوبة.' }),
  address: z.string()
    .min(1, { message: 'العنوان التفصيلي مطلوب.' })
    .min(5, { message: 'يرجى كتابة عنوان تفصيلي يشمل اسم الشارع ورقم المبنى.' }),
  notes: z.string().optional(),
  paymentMethod: z.enum(['cod', 'vodafone_cash', 'instapay'], {
    message: 'يرجى اختيار طريقة الدفع المناسبة أولاً.',
  }),
  vodafoneCashNumber: z.string().optional(),
  instapayHandle: z.string().optional(),
  depositPaymentMethod: z.enum(['vodafone_cash', 'instapay']).optional(),
  depositSenderInfo: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === 'vodafone_cash') {
    if (!data.vodafoneCashNumber || !phoneRegex.test(data.vodafoneCashNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'يرجى كتابة رقم المحفظة المحول منها بشكل صحيح (11 رقم).',
        path: ['vodafoneCashNumber'],
      });
    }
  }

  if (data.paymentMethod === 'instapay') {
    if (!data.instapayHandle || data.instapayHandle.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'يرجى كتابة رقم الموبايل أو عنوان انستاباي (IPA) المحول منه.',
        path: ['instapayHandle'],
      });
    }
  }

  if (data.paymentMethod === 'cod') {
    if (!data.governorate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'اختر المحافظة والمدينة أولاً لحساب مبلغ الديبوزيت.',
        path: ['governorate'],
      });
    }
  }
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function CheckoutClientPage() {
  const router = useRouter();
  const { cart, getCartTotal, clearCart } = useCart();

  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Payment Proof Upload States
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  // Lock background body scroll when Payment Mini-Page Modal is open
  useEffect(() => {
    if (isPaymentModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isPaymentModalOpen]);

  const handleCopyCoordinate = (text: string, fieldId: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  // Open Direct Payment Link / Screen for Vodafone Cash
  const handlePayViaVodafoneApp = (fieldId: string, amount: number) => {
    const number = siteConfig?.paymentReceivingInfo?.vodafoneCashNumber || siteConfig?.contactInfo?.whatsapp || '01012345678';
    const cleanNum = number.replace(/[^0-9]/g, '');
    const roundedAmount = Math.max(1, Math.round(amount));

    // 1. Copy wallet number to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cleanNum);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 3000);
    }

    if (typeof window === 'undefined') return;

    // Priority 1: If custom direct payment link configured in admin settings
    const customPaymentLink = siteConfig?.paymentReceivingInfo?.vodafoneCashPaymentLink?.trim();
    if (customPaymentLink) {
      window.open(customPaymentLink, '_blank');
      return;
    }

    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

    if (isMobile) {
      // Direct USSD Payment Code in Egypt: *9*7*WALLET_NUMBER*AMOUNT#
      // Opens the phone dialer with the exact payment transaction pre-filled
      window.location.href = `tel:*9*7*${cleanNum}*${roundedAmount}%23`;
    } else {
      window.open('https://web.vodafone.com.eg/ar/vodafone-cash', '_blank');
    }
  };

  // Open Direct Payment Link / Screen for InstaPay
  const handlePayViaInstapayApp = (fieldId: string, amount: number) => {
    const rawHandle = siteConfig?.paymentReceivingInfo?.instapayHandle || 'ahmeeedel3raby@instapay';
    const customPaymentLink = siteConfig?.paymentReceivingInfo?.instapayPaymentLink?.trim();

    // 1. Copy IPA handle to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(rawHandle);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 3000);
    }

    if (typeof window === 'undefined') return;

    // Priority 1: If direct InstaPay Share/Payment link configured by admin (e.g. https://ipn.eg/S/ahmeeedel3raby/instapay/8OMBs7)
    if (customPaymentLink && customPaymentLink.startsWith('http')) {
      window.open(customPaymentLink, '_blank');
      return;
    }

    // Priority 2: If the handle itself is already an ipn/http URL
    if (rawHandle.startsWith('http://') || rawHandle.startsWith('https://')) {
      window.open(rawHandle, '_blank');
      return;
    }

    // Priority 3: Construct exact https://ipn.eg/S/{username}/instapay link based on the account in admin
    const cleanUsername = rawHandle.replace(/@instapay$/i, '').replace(/^@/, '').trim();
    if (cleanUsername) {
      if (cleanUsername.toLowerCase() === 'ahmeeedel3raby') {
        window.open('https://ipn.eg/S/ahmeeedel3raby/instapay/8OMBs7', '_blank');
        return;
      }
      window.open(`https://ipn.eg/S/${cleanUsername}/instapay`, '_blank');
      return;
    }

    window.open('https://ipn.eg/S/ahmeeedel3raby/instapay/8OMBs7', '_blank');
  };

  // Coupon States
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  // Mobile Order Summary Accordion Toggle State
  const [showMobileOrderSummary, setShowMobileOrderSummary] = useState(false);

  // Mobile Checkout Step State (1: Shipping Info, 2: Payment & Review)
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);

  // Refs and visibility state to hide sticky mobile bar when inline action button is visible on screen
  const inlineActionStep1Ref = useRef<HTMLDivElement | null>(null);
  const inlineActionStep2Ref = useRef<HTMLDivElement | null>(null);
  const [isStickyVisible, setIsStickyVisible] = useState(true);
  const abandonedDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const targetEl = mobileStep === 1 ? inlineActionStep1Ref.current : inlineActionStep2Ref.current;
    if (!targetEl) {
      setIsStickyVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Hide sticky bar as soon as inline button is anywhere near or on screen (100px margin)
        setIsStickyVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '100px 0px 100px 0px' }
    );

    observer.observe(targetEl);
    return () => observer.disconnect();
  }, [mobileStep]);

  const subtotal = getCartTotal();
  const hasTrackedCheckoutRef = useRef(false);

  // Track Begin Checkout Event (GA4 & Meta Pixel)
  useEffect(() => {
    if (cart.length > 0 && !hasTrackedCheckoutRef.current) {
      hasTrackedCheckoutRef.current = true;
      trackBeginCheckout(
        cart.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        subtotal
      );
    }
  }, [cart, subtotal]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    trigger,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: '' as any,
      customerName: '',
      phone: '',
      governorate: '',
      city: '',
      address: '',
      notes: '',
      vodafoneCashNumber: '',
      instapayHandle: '',
      depositPaymentMethod: 'vodafone_cash',
      depositSenderInfo: '',
    },
  });

  const selectedGovernorate = watch('governorate');
  const selectedPaymentMethod = watch('paymentMethod');
  const watchedDepositMethod = watch('depositPaymentMethod') || 'vodafone_cash';
  const watchedPhone = watch('phone');
  const watchedName = watch('customerName');

  // Enabled Payment Methods based on SiteConfig (defaults to cod: false, vodafoneCash: true, instapay: true)
  const isCodEnabled = siteConfig?.paymentMethodsEnabled?.cod ?? false;
  const isVodafoneCashEnabled = siteConfig?.paymentMethodsEnabled?.vodafoneCash ?? true;
  const isInstapayEnabled = siteConfig?.paymentMethodsEnabled?.instapay ?? true;

  const enabledPaymentMethods = React.useMemo(() => {
    const list: ('cod' | 'vodafone_cash' | 'instapay')[] = [];
    if (isCodEnabled) list.push('cod');
    if (isVodafoneCashEnabled) list.push('vodafone_cash');
    if (isInstapayEnabled) list.push('instapay');
    return list;
  }, [isCodEnabled, isVodafoneCashEnabled, isInstapayEnabled]);

  // Auto-select valid payment method (defaults to single active method or first available)
  useEffect(() => {
    if (!loadingConfig && enabledPaymentMethods.length > 0) {
      if (!selectedPaymentMethod || !enabledPaymentMethods.includes(selectedPaymentMethod)) {
        setValue('paymentMethod', enabledPaymentMethods[0]);
      }
    }
  }, [loadingConfig, enabledPaymentMethods, selectedPaymentMethod, setValue]);

  // Switch payment method with clean slate for errors
  const switchPaymentMethod = (method: 'cod' | 'vodafone_cash' | 'instapay') => {
    setValue('paymentMethod', method);
    clearErrors(['vodafoneCashNumber', 'instapayHandle', 'depositSenderInfo']);
    setUploadError('');
  };

  // Switch deposit transfer method inside COD
  const switchDepositMethod = (method: 'vodafone_cash' | 'instapay') => {
    setValue('depositPaymentMethod', method);
    clearErrors('depositSenderInfo');
    setUploadError('');
  };

  // Validate and confirm payment mini-page modal inputs
  const handleConfirmPaymentModal = async () => {
    setUploadError('');
    clearErrors(['vodafoneCashNumber', 'instapayHandle', 'depositSenderInfo']);

    if (selectedPaymentMethod === 'vodafone_cash') {
      const isValid = await trigger('vodafoneCashNumber');
      if (!isValid) return;
      if (!paymentProofFile) {
        setUploadError('يرجى إرفاق صورة إيصال التحويل (الاسكرين شوت).');
        return;
      }
    } else if (selectedPaymentMethod === 'instapay') {
      const isValid = await trigger('instapayHandle');
      if (!isValid) return;
      if (!paymentProofFile) {
        setUploadError('يرجى إرفاق صورة إيصال التحويل (الاسكرين شوت).');
        return;
      }
    } else if (selectedPaymentMethod === 'cod') {
      const senderVal = (watch('depositSenderInfo') || '').trim();
      if (!senderVal || senderVal.length < 3) {
        setError('depositSenderInfo', {
          type: 'manual',
          message: watchedDepositMethod === 'vodafone_cash'
            ? 'يرجى كتابة رقم محفظة فودافون كاش المحول منها ديبوزيت التوصيل.'
            : 'يرجى كتابة رقم الموبايل أو عنوان انستاباي المحول منه ديبوزيت التوصيل.'
        });
        return;
      }
      if (watchedDepositMethod === 'vodafone_cash' && !phoneRegex.test(senderVal)) {
        setError('depositSenderInfo', {
          type: 'manual',
          message: 'يرجى كتابة رقم محفظة فودافون كاش صحيح مكون من 11 رقم (مثال: 01012345678).'
        });
        return;
      }
      if (!paymentProofFile) {
        setUploadError('يرجى إرفاق صورة إيصال تحويل مبلغ الديبوزيت.');
        return;
      }
    }

    setUploadError('');
    setIsPaymentModalOpen(false);
  };

  // Abandoned Checkout Tracking — save when phone is valid and cart is not empty
  useEffect(() => {
    if (abandonedDebounceRef.current) clearTimeout(abandonedDebounceRef.current);
    if (!phoneRegex.test(watchedPhone) || cart.length === 0) return;

    abandonedDebounceRef.current = setTimeout(() => {
      const cartTotal = getCartTotal();
      saveAbandonedCheckout({
        phone: watchedPhone.trim(),
        customerName: watchedName?.trim() || '',
        items: cart.map(item => ({
          productId: item.productId,
          name: item.name + (item.flavor ? ` (${item.flavor})` : ''),
          price: item.price,
          quantity: item.quantity,
        })),
        totalPrice: cartTotal,
      }).catch(err => console.error('Abandoned checkout save failed:', err));
    }, 2000);

    return () => {
      if (abandonedDebounceRef.current) clearTimeout(abandonedDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedPhone, cart]);

  // Validate Step 1 and proceed to Step 2 on Mobile
  const handleNextToPayment = async () => {
    const isValidStep1 = await trigger(['customerName', 'phone', 'governorate', 'city', 'address']);
    if (isValidStep1) {
      setMobileStep(2);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Load site config & shipping rates
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [config, rates] = await Promise.all([
          getSiteConfig(),
          getShippingRates()
        ]);
        setSiteConfig(config);
        setShippingRates(rates.filter(r => r.isActive));
      } catch (err) {
        console.error('Error loading checkout settings:', err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadInitialData();
  }, []);

  // Calculate dynamic shipping cost based on governorate & min free shipping threshold
  const calculatedShippingCost = React.useMemo(() => {
    if (subtotal === 0) return 0;

    const rateObj = shippingRates.find(r => r.cityName === selectedGovernorate);
    const baseCost = rateObj ? rateObj.rate : 100; // default 100 EGP (Lower Egypt base)

    // Check admin settings for free shipping
    if (siteConfig?.freeShipping?.isEnabled && siteConfig.freeShipping.thresholdAmount > 0) {
      if (subtotal >= siteConfig.freeShipping.thresholdAmount) {
        return 0; // Free shipping achieved!
      }
    }

    return baseCost;
  }, [subtotal, selectedGovernorate, shippingRates, siteConfig]);

  // Fixed or dynamic deposit amount for COD:
  // When shippingCost > 0: deposit is shippingCost.
  // When shippingCost === 0: deposit is depositAmountWhenFree from config (default 100 EGP).
  const codDepositAmount = React.useMemo(() => {
    if (calculatedShippingCost > 0) {
      return calculatedShippingCost;
    }
    return siteConfig?.freeShipping?.depositAmountWhenFree ?? 100;
  }, [calculatedShippingCost, siteConfig]);

  // Calculate discount
  const discountAmount = React.useMemo(() => {
    if (!appliedCoupon) return 0;

    if (appliedCoupon.discountType === 'percentage') {
      return (subtotal * appliedCoupon.discountValue) / 100;
    } else {
      return Math.min(subtotal, appliedCoupon.discountValue);
    }
  }, [subtotal, appliedCoupon]);

  const finalTotal = Math.max(0, subtotal - discountAmount + calculatedShippingCost);

  // File Upload Handler for Vodafone Cash Receipt
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('يرجى اختيار صورة صحيحة (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('حجم الصورة كبير جداً. الحد الأقصى هو 5 ميجابايت.');
      return;
    }

    setUploadError('');
    setPaymentProofFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentProofPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadPaymentProofToCloudinary = async (file: File): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'emjbso8n';
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'xpower_products';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.secure_url);
        } else {
          reject(new Error('فشل رفع صورة التحويل على السيرفر'));
        }
      };

      xhr.onerror = () => {
        reject(new Error('حدث خطأ في الاتصال أثناء رفع الصورة'));
      };

      xhr.send(formData);
    });
  };

  // Coupon Application
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setCheckingCoupon(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      const q = query(
        collection(db, 'coupons'),
        where('code', '==', couponCode.trim().toUpperCase()),
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setCouponError('كوبون الخصم غير صحيح أو منتهي الصلاحية');
        setAppliedCoupon(null);
        setCheckingCoupon(false);
        return;
      }

      const couponDoc = querySnapshot.docs[0];
      const couponData = { id: couponDoc.id, ...couponDoc.data() } as Coupon;

      if (couponData.expiryDate) {
        const now = getEgyptTime();
        const expiresAtDate = toEgyptTime(
          couponData.expiryDate instanceof Timestamp
            ? couponData.expiryDate.toDate()
            : new Date(couponData.expiryDate)
        );

        if (expiresAtDate < now) {
          setCouponError('هذا الكوبون انتهت فترة صلاحيته');
          setAppliedCoupon(null);
          setCheckingCoupon(false);
          return;
        }
      }

      if (couponData.minOrderValue && subtotal < couponData.minOrderValue) {
        setCouponError(`الحد الأدنى لاستخدام هذا الكوبون هو ${couponData.minOrderValue} ج.م`);
        setAppliedCoupon(null);
        setCheckingCoupon(false);
        return;
      }

      setAppliedCoupon(couponData);
      setCouponSuccess(`تم تطبيق الخصم بنجاح! (${couponData.discountType === 'percentage' ? `${couponData.discountValue}%` : `${couponData.discountValue} ج.م`})`);
    } catch (error) {
      console.error('Error applying coupon:', error);
      setCouponError('حدث خطأ أثناء التحقق من الكوبون');
    } finally {
      setCheckingCoupon(false);
    }
  };

  const onSubmit = async (data: CheckoutFormData) => {
    if (cart.length === 0) {
      setOrderError('سلة التسوق فارغة.');
      return;
    }

    // Security Anti-Spam Check: Prevent rapid repetitive submissions or bot flooding
    const spamCheck = checkOrderSpamLimit();
    if (!spamCheck.allowed) {
      setOrderError(spamCheck.reason || 'يرجى الانتظار قليلاً قبل تقديم طلب آخر.');
      return;
    }

    if (!enabledPaymentMethods.includes(data.paymentMethod as any)) {
      setOrderError('طريقة الدفع المختارة غير متاحة حالياً. يرجى اختيار طريقة دفع أخرى.');
      return;
    }

    setIsSubmitting(true);
    setOrderError('');

    try {
      let uploadedProofUrl = '';

      const isVodafone = data.paymentMethod === 'vodafone_cash';
      const isInstapay = data.paymentMethod === 'instapay';
      const isCod = data.paymentMethod === 'cod';
      const requiresProof = isVodafone || isInstapay || isCod;

      if (isCod) {
        if (!data.depositSenderInfo || data.depositSenderInfo.trim().length < 3) {
          setUploadError(
            data.depositPaymentMethod === 'instapay'
              ? 'يرجى كتابة رقم الموبايل أو عنوان انستاباي المحول منه ديبوزيت التوصيل.'
              : 'يرجى كتابة رقم محفظة فودافون كاش المحول منها ديبوزيت التوصيل.'
          );
          setIsPaymentModalOpen(true);
          setIsSubmitting(false);
          return;
        }
        if (data.depositPaymentMethod === 'vodafone_cash' && !phoneRegex.test(data.depositSenderInfo.trim())) {
          setUploadError('يرجى كتابة رقم محفظة فودافون كاش صحيح مكون من 11 رقم.');
          setIsPaymentModalOpen(true);
          setIsSubmitting(false);
          return;
        }
      }

      if (requiresProof) {
        if (!paymentProofFile) {
          setUploadError('يرجى إرفاق صورة إيصال التحويل (الاسكرين شوت) لتأكيد الطلب.');
          setIsPaymentModalOpen(true);
          setIsSubmitting(false);
          return;
        }

        setIsUploading(true);
        try {
          uploadedProofUrl = await uploadPaymentProofToCloudinary(paymentProofFile);
        } catch (uploadErr: any) {
          setUploadError(uploadErr.message || 'فشل رفع إيصال التحويل');
          setIsSubmitting(false);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      const formattedCity = `${data.governorate} — ${data.city}`;

      // Clean & sanitize text fields to prevent HTML injection or control characters
      const cleanCustomerName = sanitizeText(data.customerName, 100);
      const cleanAddress = sanitizeText(data.address, 250) + (data.notes ? ` (ملاحظات: ${sanitizeText(data.notes, 200)})` : '');
      const cleanCity = sanitizeText(formattedCity, 100);

      const newOrderData = {
        customerName: cleanCustomerName,
        phone: data.phone.trim(),
        address: cleanAddress,
        city: cleanCity,
        items: cart.map(item => ({
          productId: item.productId,
          name: sanitizeText(item.name + (item.flavor ? ` (${item.flavor})` : ''), 150),
          price: item.price,
          quantity: item.quantity,
          flavor: item.flavor || undefined
        })),
        totalPrice: finalTotal,
        paymentMethod: data.paymentMethod,
        vodafoneCashNumber: isVodafone && data.vodafoneCashNumber ? data.vodafoneCashNumber.trim() : undefined,
        instapayHandle: isInstapay && data.instapayHandle ? data.instapayHandle.trim() : undefined,
        depositPaymentMethod: isCod ? (data.depositPaymentMethod || 'vodafone_cash') : undefined,
        depositSenderInfo: isCod && data.depositSenderInfo ? sanitizeText(data.depositSenderInfo, 60) : undefined,
        depositAmount: isCod ? codDepositAmount : undefined,
        paymentProofUrl: uploadedProofUrl || undefined,
        paymentStatus: requiresProof ? ('pending_review' as const) : undefined,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        status: 'pending' as const,
        isReadByAdmin: false,
      };

      const createdOrderId = await createOrder(newOrderData);
      recordOrderSubmission();
      // Note: isConverted on abandonedCheckouts is marked atomically inside createOrder's transaction

      // Track Purchase Event (GA4 & Meta Pixel) — Fire-and-forget, triggered ONCE upon order creation
      trackPurchase({
        transactionId: createdOrderId,
        totalPrice: finalTotal,
        items: cart.map(item => ({
          productId: item.productId,
          name: item.name + (item.flavor ? ` (${item.flavor})` : ''),
          price: item.price,
          quantity: item.quantity,
        })),
      });

      // Send Email Notification
      try {
        await sendNewOrderEmail({
          id: createdOrderId,
          customerName: newOrderData.customerName,
          phone: newOrderData.phone,
          city: newOrderData.city,
          address: newOrderData.address,
          items: newOrderData.items,
          totalPrice: newOrderData.totalPrice,
          paymentMethod: newOrderData.paymentMethod,
          vodafoneCashNumber: newOrderData.vodafoneCashNumber,
          instapayHandle: newOrderData.instapayHandle,
          depositPaymentMethod: newOrderData.depositPaymentMethod,
          depositSenderInfo: newOrderData.depositSenderInfo,
          depositAmount: newOrderData.depositAmount,
          paymentProofUrl: newOrderData.paymentProofUrl,
          paymentStatus: newOrderData.paymentStatus,
          couponCode: newOrderData.couponCode,
          discountAmount: newOrderData.discountAmount,
          status: 'pending',
          isReadByAdmin: false,
          createdAt: new Date(),
        });
      } catch (emailErr) {
        console.error('Email alert error:', emailErr);
      }

      clearCart();

      router.push(`/order-success?orderId=${createdOrderId}`);
    } catch (err: any) {
      console.error('Order creation error:', err);
      setOrderError(err.message || 'حدث خطأ غير متوقع أثناء حفظ الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="bg-[#050505] text-text-primary min-h-screen py-16 px-6 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-accent-red/5 to-transparent pointer-events-none"></div>
        <Spinner className="inline-block w-12 h-12 text-accent-red animate-spin drop-shadow-[0_0_10px_rgba(227,30,36,0.5)]" />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="bg-[#050505] text-text-primary min-h-screen py-16 px-6 flex flex-col items-center justify-center text-center relative overflow-hidden" dir="rtl">
        <div className="bg-black/60 border border-white/5 p-12 max-w-lg shadow-2xl relative">
          <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6 text-accent-red">
            <span className="material-symbols-outlined text-4xl">shopping_cart</span>
          </div>
          <h1 className="font-display text-3xl font-black italic uppercase tracking-wider text-white mb-3">
            سلة التسوق فارغة
          </h1>
          <p className="text-text-muted font-body text-sm mb-8">
            لا توجد منتجات في سلتك لإتمام الطلب. تصفح منتجاتنا الآن وأضف مكملاتك المفضلة!
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center px-8 py-4 bg-accent-red text-white font-product-title font-bold text-sm tracking-wide hover:bg-accent-red-hover transition-colors"
          >
            تصفح المنتجات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#050505] text-text-primary min-h-screen py-8 md:py-12 px-4 md:px-8 pb-48 lg:pb-16 relative overflow-hidden" dir="rtl">
      {/* Background Lighting */}
      <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-accent-red/5 to-transparent pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Modern Header & Stepper */}
        <div className="mb-8 md:mb-10 text-right">
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex items-center gap-2 text-[10px] md:text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-sm">lock</span>
              دفع آمن 100%
            </div>
            
            <Link href="/cart" className="text-xs text-text-muted hover:text-white flex items-center gap-1 transition-colors">
              العودة للسلة
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          <div className="lg:hidden flex items-center justify-center max-w-sm mx-auto mb-8 relative">
            {/* Background Line */}
            <div className="absolute top-4 left-8 right-8 h-1 bg-white/10 rounded-full z-0"></div>
            {/* Active Line */}
            <div className={`absolute top-4 right-8 h-1 bg-accent-red rounded-full z-0 transition-all duration-500 ${mobileStep === 2 ? 'w-[calc(100%-4rem)]' : 'w-0'}`}></div>
            
            <div className="relative z-10 flex justify-between w-full px-2">
              <button
                type="button"
                onClick={() => setMobileStep(1)}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
                  mobileStep === 1 ? 'bg-accent-red text-white ring-4 ring-accent-red/20' : 'bg-accent-red text-white'
                }`}>
                  {mobileStep === 2 ? <span className="material-symbols-outlined text-sm">check</span> : '1'}
                </div>
                <span className={`text-[10px] md:text-xs font-bold transition-colors ${mobileStep === 1 ? 'text-white' : 'text-text-muted'}`}>الشحن</span>
              </button>

              <button
                type="button"
                onClick={handleNextToPayment}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
                  mobileStep === 2 ? 'bg-accent-red text-white ring-4 ring-accent-red/20' : 'bg-[#1a1a1a] text-text-muted border border-white/10'
                }`}>
                  2
                </div>
                <span className={`text-[10px] md:text-xs font-bold transition-colors ${mobileStep === 2 ? 'text-white' : 'text-text-muted'}`}>الدفع والتأكيد</span>
              </button>
            </div>
          </div>

          {/* Mobile Titles */}
          <div className="lg:hidden text-center">
            <h1 className="font-display text-3xl font-black italic uppercase tracking-wider text-white mb-2">
              {mobileStep === 1 ? 'بيانات الشحن' : 'الدفع وتأكيد الطلب'}
            </h1>
            <p className="text-text-muted font-body text-xs">
              {mobileStep === 1 
                ? 'أدخل بيانات التوصيل الخاصة بك بدقة.'
                : 'اختر طريقة الدفع المناسبة واعتمد طلبك.'}
            </p>
          </div>

          {/* Desktop Title */}
          <div className="hidden lg:block">
            <h1 className="font-display text-4xl font-black italic uppercase tracking-wider text-white mb-2">
              إتمام الطلب
            </h1>
            <p className="text-text-muted font-body text-sm">
              أدخل بيانات التوصيل الخاصة بك واختر طريقة الدفع المناسبة لاعتماد طلبك.
            </p>
          </div>
        </div>

        {/* MOBILE COLLAPSIBLE ORDER SUMMARY (Visible on mobile only: lg:hidden) */}
        <div className="lg:hidden mb-6 bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-red to-transparent opacity-50"></div>
          <button
            type="button"
            onClick={() => setShowMobileOrderSummary(!showMobileOrderSummary)}
            className="w-full p-4 flex items-center justify-between text-right bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center text-accent-red shrink-0 relative overflow-hidden group">
                <div className="absolute inset-0 bg-accent-red/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="material-symbols-outlined text-2xl drop-shadow-md">shopping_bag</span>
              </div>
              <div>
                <div className="text-[11px] text-text-muted font-bold">ملخص المنتجات ({cart.length})</div>
                <div className="text-sm font-bold text-white flex items-center gap-1 mt-0.5">
                  <span className="text-accent-red font-product-title text-lg" dir="ltr">{finalTotal.toFixed(2)} EGP</span>
                </div>
              </div>
            </div>

            <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 ${showMobileOrderSummary ? 'bg-accent-red border-accent-red text-white shadow-[0_0_15px_rgba(227,30,36,0.4)]' : 'bg-[#111] border-white/10 text-text-muted'}`}>
              <span className={`material-symbols-outlined transition-transform duration-300 ${showMobileOrderSummary ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </div>
          </button>

          {/* Accordion Body */}
          {showMobileOrderSummary && (
            <div className="p-4 border-t border-white/5 space-y-4 bg-black/60 animate-in fade-in slide-in-from-top-4 duration-300">
              {/* Cart items preview */}
              <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {cart.map((item, idx) => (
                  <div key={`mobile-cart-${item.productId}-${idx}`} className="flex items-center justify-between gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-12 h-12 bg-white/5 border border-white/10 p-1 rounded-xl shrink-0 flex items-center justify-center">
                        <img 
                          src={getOptimizedImageUrl(item.image, { width: 100, height: 100 })} 
                          alt={item.name} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-grow">
                        <div className="font-bold text-white text-xs line-clamp-1">{item.name}</div>
                        {item.flavor && <div className="text-[10px] text-text-muted">الطعم: <span className="text-white">{item.flavor}</span></div>}
                        <div className="flex justify-between items-center mt-1">
                          <div className="text-[11px] text-text-muted">{item.quantity} × {item.price} EGP</div>
                          <div className="font-product-title text-sm font-bold text-white" dir="ltr">
                            {(item.price * item.quantity).toFixed(2)} EGP
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 text-xs border-t border-white/10 pt-4 px-2">
                <div className="flex justify-between text-text-muted">
                  <span>المجموع الفرعي:</span>
                  <span className="text-white font-mono" dir="ltr">{subtotal.toFixed(2)} EGP</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>الخصم ({appliedCoupon.code}):</span>
                    <span className="font-mono" dir="ltr">-{discountAmount.toFixed(2)} EGP</span>
                  </div>
                )}
                <div className="flex justify-between text-text-muted">
                  <span>الشحن:</span>
                  {calculatedShippingCost === 0 ? (
                    <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded">مجاني</span>
                  ) : (
                    <span className="text-white font-mono" dir="ltr">{calculatedShippingCost} EGP</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Form Area (7 Cols) */}
          <div className="lg:col-span-7 space-y-6 md:space-y-8">
            
            {/* Customer Information Block (Always visible on Desktop, visible on Mobile Step 1) */}
            <div className={`bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 md:p-8 space-y-5 md:space-y-6 text-right relative shadow-xl ${
              mobileStep === 1 ? 'block' : 'hidden lg:block'
            }`}>
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-accent-red via-transparent to-transparent rounded-t-2xl"></div>
              
              <h2 className="font-product-title font-bold text-lg md:text-xl text-white flex items-center gap-2 border-b border-white/10 pb-3 md:pb-4">
                <span className="material-symbols-outlined text-accent-red">person</span>
                بيانات المستلم والشحن
              </h2>

              {/* Full Name */}
              <div>
                <label htmlFor="customerName" className="text-xs font-bold text-text-muted mb-2 block">الاسم بالكامل *</label>
                <div className="relative">
                  <input
                    id="customerName"
                    autoComplete="name"
                    type="text"
                    placeholder="مثال: أحمد محمد محمود"
                    {...register('customerName')}
                    className={`w-full bg-[#050505] border text-white text-sm px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      errors.customerName 
                        ? 'border-red-500/80 focus:ring-red-500/30' 
                        : 'border-white/10 focus:border-accent-red focus:ring-accent-red/20'
                    }`}
                  />
                </div>
                {errors.customerName && (
                  <span className="text-red-500 text-xs mt-1.5 block">{errors.customerName.message}</span>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="text-xs font-bold text-text-muted mb-2 block">رقم الموبايل (للتواصل والتوصيل) *</label>
                <div className="relative">
                  <input
                    id="phone"
                    autoComplete="tel"
                    type="tel"
                    placeholder="01012345678"
                    dir="ltr"
                    {...register('phone')}
                    className={`w-full bg-[#050505] border text-white text-sm px-4 py-3.5 text-right rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      errors.phone 
                        ? 'border-red-500/80 focus:ring-red-500/30' 
                        : 'border-white/10 focus:border-accent-red focus:ring-accent-red/20'
                    }`}
                  />
                </div>
                {errors.phone && (
                  <span className="text-red-500 text-xs mt-1.5 block">{errors.phone.message}</span>
                )}
              </div>

              {/* Governorate & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="governorate" className="text-xs font-bold text-text-muted mb-2 block">المحافظة *</label>
                  <select
                    id="governorate"
                    autoComplete="address-level1"
                    {...register('governorate')}
                    className={`w-full bg-[#050505] border text-white text-sm px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 cursor-pointer transition-all ${
                      errors.governorate 
                        ? 'border-red-500/80 focus:ring-red-500/30' 
                        : 'border-white/10 focus:border-accent-red focus:ring-accent-red/20'
                    }`}
                  >
                    <option value="">اختر المحافظة...</option>
                    {shippingRates.map((rate) => (
                      <option key={rate.id} value={rate.cityName}>
                        {rate.cityName} ({rate.rate === 0 ? 'شحن مجاني' : `${rate.rate} ج.م`})
                      </option>
                    ))}
                  </select>
                  {errors.governorate && (
                    <span className="text-red-500 text-xs mt-1.5 block">{errors.governorate.message}</span>
                  )}
                </div>

                <div>
                  <label htmlFor="city" className="text-xs font-bold text-text-muted mb-2 block">المدينة / المنطقة *</label>
                  <input
                    id="city"
                    autoComplete="address-level2"
                    type="text"
                    placeholder="مثال: المعادي / مدينة نصر / الدقي"
                    {...register('city')}
                    className={`w-full bg-[#050505] border text-white text-sm px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      errors.city 
                        ? 'border-red-500/80 focus:ring-red-500/30' 
                        : 'border-white/10 focus:border-accent-red focus:ring-accent-red/20'
                    }`}
                  />
                  {errors.city && (
                    <span className="text-red-500 text-xs mt-1.5 block">{errors.city.message}</span>
                  )}
                </div>
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address" className="text-xs font-bold text-text-muted mb-2 block">العنوان التفصيلي *</label>
                <input
                  id="address"
                  autoComplete="street-address"
                  type="text"
                  placeholder="اسم الشارع، رقم المبنى، رقم الشقة، علامة مميزة بجوارك"
                  {...register('address')}
                  className={`w-full bg-[#050505] border text-white text-sm px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.address 
                      ? 'border-red-500/80 focus:ring-red-500/30' 
                      : 'border-white/10 focus:border-accent-red focus:ring-accent-red/20'
                  }`}
                />
                {errors.address && (
                  <span className="text-red-500 text-xs mt-1.5 block">{errors.address.message}</span>
                )}
              </div>

              {/* Order Notes */}
              <div>
                <label htmlFor="notes" className="text-xs font-bold text-text-muted mb-2 block">ملاحظات إضافية (اختياري)</label>
                <textarea
                  id="notes"
                  autoComplete="off"
                  rows={2}
                  placeholder="أي تعليمات خاصة للمندوب وقت التوصيل..."
                  {...register('notes')}
                  className="w-full bg-[#050505] border border-white/10 text-white text-sm p-4 rounded-xl focus:border-accent-red focus:ring-2 focus:ring-accent-red/20 focus:outline-none transition-all"
                ></textarea>
              </div>

              {/* Mobile Step 1 -> Step 2 Action Button */}
              <div ref={inlineActionStep1Ref} className="lg:hidden pt-2">
                <button
                  type="button"
                  onClick={handleNextToPayment}
                  className="w-full py-4 bg-accent-red hover:bg-accent-red-hover text-white font-product-title font-bold text-base rounded-xl shadow-[0_0_20px_rgba(227,30,36,0.4)] flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <span>متابعة إلى طريقة الدفع</span>
                  <span className="material-symbols-outlined text-xl rtl:rotate-180">arrow_back</span>
                </button>
              </div>
            </div>

            {/* Payment Method Selection Block (Always visible on Desktop, visible on Mobile Step 2) */}
            <div className={`bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 md:p-8 space-y-5 md:space-y-6 text-right relative shadow-xl ${
              mobileStep === 2 ? 'block' : 'hidden lg:block'
            }`}>
              {/* Back to Step 1 Button on Mobile */}
              <div className="lg:hidden mb-2">
                <button
                  type="button"
                  onClick={() => setMobileStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-white bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-sm rtl:rotate-180">arrow_forward</span>
                  <span>← العودة لبيانات الشحن والتوصيل</span>
                </button>
              </div>

              <div className="flex items-center justify-between border-b border-white/10 pb-3 md:pb-4">
                <h2 className="font-product-title font-bold text-lg md:text-xl text-white flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent-red/10 border border-accent-red/30 flex items-center justify-center text-accent-red">
                    <span className="material-symbols-outlined text-lg">credit_card</span>
                  </div>
                  <span>طريقة الدفع</span>
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span className="material-symbols-outlined text-sm text-text-muted">lock</span>
                  <span>دفع مشفر وآمن 100%</span>
                </div>
              </div>

              {/* Payment Option Cards - Only render enabled methods */}
              <div className={`grid grid-cols-1 ${
                enabledPaymentMethods.length === 1 ? 'sm:grid-cols-1 max-w-md mx-auto' :
                enabledPaymentMethods.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'
              } gap-2.5 sm:gap-3.5`}>
                {/* 1. Cash on Delivery (COD) Option Card */}
                {isCodEnabled && (
                  <div
                    onClick={() => {
                      switchPaymentMethod('cod');
                      setIsPaymentModalOpen(true);
                    }}
                    className={`p-3.5 sm:p-5 rounded-2xl border transition-all cursor-pointer relative flex items-center sm:flex-col sm:justify-between gap-3 sm:gap-0 group ${
                      selectedPaymentMethod === 'cod'
                        ? 'border-accent-red bg-accent-red/[0.07] shadow-[0_4px_25px_rgba(227,30,36,0.18)] ring-1 ring-accent-red'
                        : 'border-white/10 bg-[#0d0d0d] hover:border-white/20 hover:bg-[#141414]'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 sm:w-full sm:flex-col sm:items-stretch sm:gap-0">
                      <div className="flex items-center justify-between sm:mb-3 shrink-0">
                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all ${
                          selectedPaymentMethod === 'cod'
                            ? 'bg-accent-red text-white shadow-md'
                            : 'bg-white/5 text-text-muted border border-white/10'
                        }`}>
                          <span className="material-symbols-outlined text-xl sm:text-2xl">local_shipping</span>
                        </div>
                        <div className={`hidden sm:flex w-5 h-5 rounded-full border-2 items-center justify-center transition-all ${
                          selectedPaymentMethod === 'cod'
                            ? 'border-accent-red bg-accent-red'
                            : 'border-white/30 bg-transparent'
                        }`}>
                          {selectedPaymentMethod === 'cod' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 sm:flex-initial">
                        <div className="font-product-title font-bold text-white text-sm sm:text-lg sm:mb-1 truncate">
                          الدفع عند الاستلام
                        </div>
                        <div className="text-[11px] text-text-muted truncate">
                          {calculatedShippingCost === 0 ? `شحن مجاني (ديبوزيت ${codDepositAmount} EGP)` : `مع ديبوزيت الشحن (${codDepositAmount} EGP)`}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Right-Side Action & Arrow */}
                    <div className="flex items-center gap-1.5 sm:hidden shrink-0">
                      <span className="text-[11px] font-bold text-accent-red">
                        {paymentProofFile && selectedPaymentMethod === 'cod' ? 'تم الإرفاق' : 'التفاصيل'}
                      </span>
                      <span className="material-symbols-outlined text-lg text-accent-red">chevron_left</span>
                    </div>

                    {/* Desktop Bottom Row */}
                    <div className="hidden sm:flex mt-4 pt-3 border-t border-white/5 items-center justify-between text-xs w-full">
                      <span className="text-text-muted group-hover:text-white transition-colors font-medium">
                        {paymentProofFile && selectedPaymentMethod === 'cod' ? 'تم إرفاق الإيصال' : 'عرض التفاصيل'}
                      </span>
                      <span className="material-symbols-outlined text-sm text-accent-red group-hover:translate-x-[-3px] transition-transform">
                        open_in_new
                      </span>
                    </div>

                    <input
                      type="radio"
                      value="cod"
                      {...register('paymentMethod')}
                      className="hidden"
                    />
                  </div>
                )}

                {/* 2. Vodafone Cash Option Card */}
                {isVodafoneCashEnabled && (
                  <div
                    onClick={() => {
                      switchPaymentMethod('vodafone_cash');
                      setIsPaymentModalOpen(true);
                    }}
                    className={`p-3.5 sm:p-5 rounded-2xl border transition-all cursor-pointer relative flex items-center sm:flex-col sm:justify-between gap-3 sm:gap-0 group ${
                      selectedPaymentMethod === 'vodafone_cash'
                        ? 'border-accent-red bg-accent-red/[0.07] shadow-[0_4px_25px_rgba(227,30,36,0.18)] ring-1 ring-accent-red'
                        : 'border-white/10 bg-[#0d0d0d] hover:border-white/20 hover:bg-[#141414]'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 sm:w-full sm:flex-col sm:items-stretch sm:gap-0">
                      <div className="flex items-center justify-between sm:mb-3 shrink-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center">
                          <img src="/images/vodafone.png" alt="Vodafone" className="w-full h-full object-contain" />
                        </div>
                        <div className={`hidden sm:flex w-5 h-5 rounded-full border-2 items-center justify-center transition-all ${
                          selectedPaymentMethod === 'vodafone_cash'
                            ? 'border-accent-red bg-accent-red'
                            : 'border-white/30 bg-transparent'
                        }`}>
                          {selectedPaymentMethod === 'vodafone_cash' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 sm:flex-initial">
                        <div className="font-product-title font-bold text-white text-sm sm:text-lg sm:mb-1 truncate">
                          فودافون كاش
                        </div>
                        <div className="text-[11px] text-text-muted truncate">
                          دفع كامل مسبقاً
                        </div>
                      </div>
                    </div>

                    {/* Mobile Right-Side Action & Arrow */}
                    <div className="flex items-center gap-1.5 sm:hidden shrink-0">
                      <span className="text-[11px] font-bold text-accent-red">
                        {paymentProofFile && selectedPaymentMethod === 'vodafone_cash' ? 'تم الإرفاق' : 'التفاصيل'}
                      </span>
                      <span className="material-symbols-outlined text-lg text-accent-red">chevron_left</span>
                    </div>

                    {/* Desktop Bottom Row */}
                    <div className="hidden sm:flex mt-4 pt-3 border-t border-white/5 items-center justify-between text-xs w-full">
                      <span className="text-text-muted group-hover:text-white transition-colors font-medium">
                        {paymentProofFile && selectedPaymentMethod === 'vodafone_cash' ? 'تم إرفاق الإيصال' : 'عرض التفاصيل'}
                      </span>
                      <span className="material-symbols-outlined text-sm text-accent-red group-hover:translate-x-[-3px] transition-transform">
                        open_in_new
                      </span>
                    </div>

                    <input
                      type="radio"
                      value="vodafone_cash"
                      {...register('paymentMethod')}
                      className="hidden"
                    />
                  </div>
                )}

                {/* 3. InstaPay Option Card */}
                {isInstapayEnabled && (
                  <div
                    onClick={() => {
                      switchPaymentMethod('instapay');
                      setIsPaymentModalOpen(true);
                    }}
                    className={`p-3.5 sm:p-5 rounded-2xl border transition-all cursor-pointer relative flex items-center sm:flex-col sm:justify-between gap-3 sm:gap-0 group ${
                      selectedPaymentMethod === 'instapay'
                        ? 'border-accent-red bg-accent-red/[0.07] shadow-[0_4px_25px_rgba(227,30,36,0.18)] ring-1 ring-accent-red'
                        : 'border-white/10 bg-[#0d0d0d] hover:border-white/20 hover:bg-[#141414]'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 sm:w-full sm:flex-col sm:items-stretch sm:gap-0">
                      <div className="flex items-center justify-between sm:mb-3 shrink-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center">
                          <img src="/images/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                        </div>
                        <div className={`hidden sm:flex w-5 h-5 rounded-full border-2 items-center justify-center transition-all ${
                          selectedPaymentMethod === 'instapay'
                            ? 'border-accent-red bg-accent-red'
                            : 'border-white/30 bg-transparent'
                        }`}>
                          {selectedPaymentMethod === 'instapay' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 sm:flex-initial">
                        <div className="font-product-title font-bold text-white text-sm sm:text-lg sm:mb-1 truncate">
                          انستاباي — InstaPay
                        </div>
                        <div className="text-[11px] text-text-muted truncate">
                          تحويل لحظي فوري
                        </div>
                      </div>
                    </div>

                    {/* Mobile Right-Side Action & Arrow */}
                    <div className="flex items-center gap-1.5 sm:hidden shrink-0">
                      <span className="text-[11px] font-bold text-accent-red">
                        {paymentProofFile && selectedPaymentMethod === 'instapay' ? 'تم الإرفاق' : 'التفاصيل'}
                      </span>
                      <span className="material-symbols-outlined text-lg text-accent-red">chevron_left</span>
                    </div>

                    {/* Desktop Bottom Row */}
                    <div className="hidden sm:flex mt-4 pt-3 border-t border-white/5 items-center justify-between text-xs w-full">
                      <span className="text-text-muted group-hover:text-white transition-colors font-medium">
                        {paymentProofFile && selectedPaymentMethod === 'instapay' ? 'تم إرفاق الإيصال' : 'عرض التفاصيل'}
                      </span>
                      <span className="material-symbols-outlined text-sm text-accent-red group-hover:translate-x-[-3px] transition-transform">
                        open_in_new
                      </span>
                    </div>

                    <input
                      type="radio"
                      value="instapay"
                      {...register('paymentMethod')}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Unselected Error Notice */}
              {errors.paymentMethod && (
                <div className="flex items-center gap-2 text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/25 px-4 py-2.5 rounded-xl">
                  <span className="material-symbols-outlined text-base shrink-0 text-red-500">error</span>
                  <span>{errors.paymentMethod.message}</span>
                </div>
              )}

              {/* Status Summary Card on Main Page */}
              <div className="bg-[#0a0a0a] border border-white/10 p-3.5 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    !selectedPaymentMethod
                      ? 'bg-white/5 text-text-muted border border-white/10'
                      : paymentProofFile
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                      : 'bg-accent-red/10 text-accent-red border border-accent-red/25'
                  }`}>
                    <span className="material-symbols-outlined text-lg sm:text-xl">
                      {!selectedPaymentMethod
                        ? 'touch_app'
                        : paymentProofFile
                        ? 'check_circle'
                        : 'info'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs sm:text-sm font-bold text-white">
                      {!selectedPaymentMethod
                        ? 'اختر طريقة الدفع المناسبة'
                        : selectedPaymentMethod === 'cod'
                        ? paymentProofFile
                          ? 'تم إرفاق إيصال ديبوزيت التوصيل بنجاح'
                          : calculatedShippingCost === 0
                          ? 'مطلوب إرفاق إيصال الديبوزيت التأميني'
                          : 'مطلوب إرفاق إيصال ديبوزيت التوصيل'
                        : selectedPaymentMethod === 'vodafone_cash'
                        ? paymentProofFile
                          ? 'تم إرفاق إيصال تحويل فودافون كاش بنجاح'
                          : 'مطلوب إرفاق إيصال تحويل فودافون كاش'
                        : paymentProofFile
                        ? 'تم إرفاق إيصال تحويل انستاباي بنجاح'
                        : 'مطلوب إرفاق إيصال تحويل انستاباي'}
                    </div>
                    <div className="text-[11px] sm:text-xs text-text-muted mt-0.5">
                      {!selectedPaymentMethod
                        ? 'اضغط على أي من الخيارات الثلاثة أعلاه (الدفع عند الاستلام، فودافون كاش، أو انستاباي) لاختيارها.'
                        : paymentProofFile
                        ? 'تم حفظ البيانات بنجاح، اضغط لتعديلها.'
                        : selectedPaymentMethod === 'cod'
                        ? calculatedShippingCost === 0
                          ? `طلبك مؤهل للشحن المجاني، يُطلب ديبوزيت تأميني (${codDepositAmount} EGP) يُخصم من إجمالي طلبك.`
                          : `يُطلب دفع ديبوزيت التوصيل (${codDepositAmount} EGP) لتأكيد الجدية وتجهيز الشحنة.`
                        : 'اضغط لعرض بيانات التحويل وإرفاق الإيصال.'}
                    </div>
                  </div>
                </div>

                {selectedPaymentMethod ? (
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-product-title font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {paymentProofFile ? 'edit' : 'launch'}
                    </span>
                    <span>{paymentProofFile ? 'تعديل البيانات' : 'فتح صفحة التفاصيل'}</span>
                  </button>
                ) : null}
              </div>

              {/* Dedicated Mini-Page Modal (Native Bottom Sheet on Mobile, Centered on Desktop) */}
              <div
                className={`fixed inset-0 z-[60] flex items-end sm:items-center justify-center transition-all duration-300 ${
                  isPaymentModalOpen
                    ? 'opacity-100 pointer-events-auto backdrop-blur-md bg-black/80'
                    : 'opacity-0 pointer-events-none'
                }`}
              >
                {/* Backdrop click to close */}
                <div 
                  className="fixed inset-0"
                  onClick={() => setIsPaymentModalOpen(false)}
                />

                {/* Modal Window Container */}
                <div 
                  className={`relative w-full sm:max-w-xl bg-[#0e0e0e] border-t sm:border border-white/15 rounded-t-[28px] sm:rounded-3xl shadow-2xl z-10 my-0 sm:my-auto max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden transition-all duration-300 ${
                    isPaymentModalOpen 
                      ? 'translate-y-0 opacity-100 scale-100' 
                      : 'translate-y-full sm:translate-y-4 opacity-0 sm:scale-95'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                  dir="rtl"
                >
                  {/* Mobile Drag Handle Pill */}
                  <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-2.5 mb-0.5 sm:hidden shrink-0" />

                  {/* Modal Header */}
                  <div className="px-4 py-3 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0e0e0e]">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      {selectedPaymentMethod === 'cod' ? (
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-red/15 text-accent-red border border-accent-red/30 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-lg sm:text-xl">local_shipping</span>
                        </div>
                      ) : selectedPaymentMethod === 'vodafone_cash' ? (
                        <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
                          <img src="/images/vodafone.png" alt="Vodafone" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
                          <img src="/images/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-product-title font-bold text-white text-sm sm:text-lg truncate">
                          {selectedPaymentMethod === 'cod'
                            ? 'الدفع عند الاستلام (ديبوزيت الشحن)'
                            : selectedPaymentMethod === 'vodafone_cash'
                            ? 'التحويل عبر فودافون كاش'
                            : 'التحويل عبر انستاباي (InstaPay)'}
                        </h3>
                        <span className="text-[10px] sm:text-[11px] text-text-muted truncate block">
                          {selectedPaymentMethod === 'cod' ? 'سداد قيمة الشحن لتأكيد خروج الشحنة' : 'سداد إجمالي الطلب مسبقاً وتأكيده'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPaymentModalOpen(false)}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-text-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    >
                      <span className="material-symbols-outlined text-lg sm:text-xl">close</span>
                    </button>
                  </div>

                  {/* Method Switcher Tabs inside Mini-Page Modal (Show only if more than 1 method is enabled) */}
                  {enabledPaymentMethods.length > 1 && (
                    <div className="px-3 sm:px-6 py-2 sm:py-2.5 bg-black/40 border-b border-white/10 flex gap-1.5 sm:gap-2 shrink-0">
                      {isCodEnabled && (
                        <button
                          type="button"
                          onClick={() => switchPaymentMethod('cod')}
                          className={`flex-1 py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            selectedPaymentMethod === 'cod'
                              ? 'bg-accent-red text-white shadow-md'
                              : 'bg-white/5 text-text-muted hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs sm:text-sm">local_shipping</span>
                          <span className="truncate">كاش (ديبوزيت)</span>
                        </button>
                      )}
                      {isVodafoneCashEnabled && (
                        <button
                          type="button"
                          onClick={() => switchPaymentMethod('vodafone_cash')}
                          className={`flex-1 py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            selectedPaymentMethod === 'vodafone_cash'
                              ? 'bg-accent-red text-white shadow-md'
                              : 'bg-white/5 text-text-muted hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <div className="w-4 h-4 inline-flex items-center justify-center shrink-0">
                            <img src="/images/vodafone.png" alt="Vodafone" className="w-full h-full object-contain" />
                          </div>
                          <span className="truncate">فودافون كاش</span>
                        </button>
                      )}
                      {isInstapayEnabled && (
                        <button
                          type="button"
                          onClick={() => switchPaymentMethod('instapay')}
                          className={`flex-1 py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            selectedPaymentMethod === 'instapay'
                              ? 'bg-accent-red text-white shadow-md'
                              : 'bg-white/5 text-text-muted hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <div className="w-4 h-4 inline-flex items-center justify-center shrink-0">
                            <img src="/images/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                          </div>
                          <span className="truncate">انستاباي</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Modal Scrollable Body */}
                  <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-3.5 sm:space-y-4 flex-1 min-h-0">
                    
                    {/* CASE 1: Cash on Delivery (COD) Details - only if cod is enabled */}
                    {isCodEnabled && selectedPaymentMethod === 'cod' && (
                      <div className="space-y-3.5 sm:space-y-4">
                        {!selectedGovernorate ? (
                          <div className="flex items-center gap-3 p-3.5 sm:p-4 bg-white/5 border border-white/10 rounded-xl text-text-muted text-xs sm:text-sm">
                            <span className="material-symbols-outlined text-accent-red text-lg sm:text-xl shrink-0">location_on</span>
                            <span>يرجى اختيار المحافظة والمدينة أولاً في بيانات الشحن لمعرفة مبلغ ديبوزيت التوصيل المطلوب.</span>
                          </div>
                        ) : (
                          <>
                            {/* Notice Banner based on shipping cost */}
                            {calculatedShippingCost === 0 ? (
                              <div className="flex items-center gap-3 p-3.5 sm:p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400 text-xs sm:text-sm">
                                <span className="material-symbols-outlined text-lg sm:text-xl shrink-0">verified</span>
                                <div>
                                  <div className="font-bold">
                                    مبروك! طلبك مؤهل للشحن المجاني — لتأكيد الطلب، يُطلب دفع مبلغ تأميني بسيط: <strong className="font-mono text-white text-sm sm:text-base mx-1">{codDepositAmount} جنيه</strong> (سيُخصم من إجمالي طلبك)
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 p-3.5 sm:p-4 bg-accent-red/10 border border-accent-red/25 rounded-xl text-white text-xs sm:text-sm">
                                <span className="material-symbols-outlined text-accent-red text-lg sm:text-xl shrink-0">info</span>
                                <div>
                                  <div className="font-bold">
                                    لإتمام الطلب، يُطلب دفع مبلغ التوصيل مقدمًا: <strong className="text-accent-red font-mono text-sm sm:text-base mx-1">{codDepositAmount} جنيه</strong>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Financial Breakdown (2 Tiles) */}
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                              <div className="bg-[#121212] border border-accent-red/30 p-2.5 sm:p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                <span className="text-[11px] sm:text-xs text-text-muted">
                                  {calculatedShippingCost === 0 ? 'ديبوزيت تأميني يُخصم من الطلب:' : 'مقدم الشحن الآن:'}
                                </span>
                                <span className="font-product-title font-bold text-accent-red text-sm sm:text-lg font-mono" dir="ltr">
                                  {codDepositAmount} EGP
                                </span>
                              </div>
                              <div className="bg-[#121212] border border-white/10 p-2.5 sm:p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                <span className="text-[11px] sm:text-xs text-text-muted">الباقي كاش للمندوب:</span>
                                <span className="font-product-title font-bold text-white text-sm sm:text-lg font-mono" dir="ltr">
                                  {Math.max(0, finalTotal - codDepositAmount).toFixed(2)} EGP
                                </span>
                              </div>
                            </div>

                            {/* Sub-choice: Vodafone Cash vs InstaPay */}
                            <div className="space-y-1.5 sm:space-y-2">
                              <label className="text-xs font-bold text-text-muted block">
                                طريقة تحويل الديبوزيت ({codDepositAmount} جنيه):
                              </label>
                              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <button
                                  type="button"
                                  onClick={() => switchDepositMethod('vodafone_cash')}
                                  className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                                    watchedDepositMethod === 'vodafone_cash'
                                      ? 'border-accent-red bg-accent-red/10 text-white ring-1 ring-accent-red'
                                      : 'border-white/10 bg-white/5 text-text-muted hover:border-white/20'
                                  }`}
                                >
                                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                    <img src="/images/vodafone.png" alt="Vodafone" className="w-full h-full object-contain" />
                                  </div>
                                  <span>فودافون كاش</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => switchDepositMethod('instapay')}
                                  className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                                    watchedDepositMethod === 'instapay'
                                      ? 'border-accent-red bg-accent-red/10 text-white ring-1 ring-accent-red'
                                      : 'border-white/10 bg-white/5 text-text-muted hover:border-white/20'
                                  }`}
                                >
                                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                    <img src="/images/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                                  </div>
                                  <span>انستاباي</span>
                                </button>
                              </div>
                            </div>

                            {/* Instructions and Receiver Bar */}
                            {watchedDepositMethod === 'vodafone_cash' ? (
                              <div className="space-y-2.5 sm:space-y-3 pt-1">
                                <p className="text-xs text-text-muted leading-relaxed">
                                  1. قم بتحويل مبلغ الديبوزيت (<strong className="text-white font-mono">{codDepositAmount} جنيه</strong>) إلى محفظة فودافون كاش:
                                </p>
                                <div className="bg-[#121212] border border-white/10 p-2.5 sm:p-3.5 rounded-xl flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 p-1.5 shrink-0 flex items-center justify-center">
                                      <img src="/images/vodafone.png" alt="Vodafone Cash" className="w-full h-full object-contain" />
                                    </div>
                                    <div className="flex flex-col text-right min-w-0">
                                      <span className="text-[10px] text-text-muted font-bold">رقم محفظة فودافون كاش:</span>
                                      <span className="font-mono font-bold text-sm sm:text-lg text-white tracking-wider select-all truncate" dir="ltr">
                                        {siteConfig?.paymentReceivingInfo?.vodafoneCashNumber || siteConfig?.contactInfo?.whatsapp || '01012345678'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyCoordinate(siteConfig?.paymentReceivingInfo?.vodafoneCashNumber || siteConfig?.contactInfo?.whatsapp || '01012345678', 'cod-vf')}
                                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1 transition-all border border-white/10 active:scale-95 cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-sm">
                                        {copiedField === 'cod-vf' ? 'check' : 'content_copy'}
                                      </span>
                                      <span>{copiedField === 'cod-vf' ? 'تم النسخ' : 'نسخ'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handlePayViaVodafoneApp('cod-vf', codDepositAmount)}
                                      className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-accent-red hover:bg-accent-red/90 text-white flex items-center justify-center gap-1.5 transition-all shadow-md shadow-accent-red/20 active:scale-95 cursor-pointer"
                                    >
                                      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                        <img src="/images/vodafone.png" alt="Vodafone Cash" className="w-full h-full object-contain" />
                                      </div>
                                      <span>الدفع من التطبيق</span>
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <label htmlFor="depositSenderInfo" className="text-xs font-bold text-text-muted mb-1 block">رقم المحفظة المحول منها الديبوزيت *</label>
                                  <input
                                    id="depositSenderInfo"
                                    type="tel"
                                    placeholder="010XXXXXXXX"
                                    dir="ltr"
                                    {...register('depositSenderInfo')}
                                    className={`w-full bg-[#050505] border text-white text-base sm:text-sm px-3.5 py-2.5 text-right rounded-xl focus:outline-none transition-all ${
                                      errors.depositSenderInfo ? 'border-red-500' : 'border-white/10 focus:border-accent-red'
                                    }`}
                                  />
                                  {errors.depositSenderInfo && (
                                    <span className="text-red-500 text-xs mt-1 block">{errors.depositSenderInfo.message}</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2.5 sm:space-y-3 pt-1">
                                <p className="text-xs text-text-muted leading-relaxed">
                                  1. قم بتحويل مبلغ الديبوزيت (<strong className="text-white font-mono">{codDepositAmount} جنيه</strong>) إلى حساب انستاباي:
                                </p>
                                <div className="bg-[#121212] border border-white/10 p-2.5 sm:p-3.5 rounded-xl flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 p-1.5 shrink-0 flex items-center justify-center">
                                      <img src="/images/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                                    </div>
                                    <div className="flex flex-col text-right min-w-0">
                                      <span className="text-[10px] text-text-muted font-bold">عنوان أو حساب انستاباي (IPA):</span>
                                      <span className="font-mono font-bold text-sm sm:text-lg text-white tracking-wider select-all truncate" dir="ltr">
                                        {siteConfig?.paymentReceivingInfo?.instapayHandle || 'ahmeeedel3raby@instapay'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyCoordinate(siteConfig?.paymentReceivingInfo?.instapayHandle || 'ahmeeedel3raby@instapay', 'cod-insta')}
                                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1 transition-all border border-white/10 active:scale-95 cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-sm">
                                        {copiedField === 'cod-insta' ? 'check' : 'content_copy'}
                                      </span>
                                      <span>{copiedField === 'cod-insta' ? 'تم النسخ' : 'نسخ'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handlePayViaInstapayApp('cod-insta', codDepositAmount)}
                                      className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-accent-red hover:bg-accent-red/90 text-white flex items-center justify-center gap-1.5 transition-all shadow-md shadow-accent-red/20 active:scale-95 cursor-pointer"
                                    >
                                      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                        <img src="/images/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                                      </div>
                                      <span>الدفع من التطبيق</span>
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <label htmlFor="depositSenderInfo" className="text-xs font-bold text-text-muted mb-1 block">رقم أو عنوان انستاباي (IPA) المحول منه *</label>
                                  <input
                                    id="depositSenderInfo"
                                    type="text"
                                    placeholder="username@instapay أو 010XXXXXXXX"
                                    dir="ltr"
                                    {...register('depositSenderInfo')}
                                    className={`w-full bg-[#050505] border text-white text-base sm:text-sm px-3.5 py-2.5 text-right rounded-xl focus:outline-none transition-all ${
                                      errors.depositSenderInfo ? 'border-red-500' : 'border-white/10 focus:border-accent-red'
                                    }`}
                                  />
                                  {errors.depositSenderInfo && (
                                    <span className="text-red-500 text-xs mt-1 block">{errors.depositSenderInfo.message}</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Receipt Upload Dropzone */}
                            <div>
                              <label className="text-xs font-bold text-text-muted mb-1.5 block">إرفاق صورة إيصال تحويل الديبوزيت *</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                                id="modal-cod-deposit-proof-input"
                              />

                              <label
                                htmlFor="modal-cod-deposit-proof-input"
                                className="border border-dashed border-white/20 hover:border-accent-red bg-[#0a0a0a] hover:bg-[#111111] p-3 sm:p-5 flex flex-col items-center justify-center cursor-pointer transition-all rounded-xl group"
                              >
                                {paymentProofPreview ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <img src={paymentProofPreview} alt="Receipt Preview" className="max-h-24 sm:max-h-32 max-w-full object-contain border border-white/10 rounded-lg shadow-md" />
                                    <span className="text-xs text-accent-red font-bold flex items-center gap-1">
                                      <span className="material-symbols-outlined text-sm">cached</span>
                                      <span>تغيير صورة الإيصال</span>
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-1.5 text-text-muted py-1">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-text-muted group-hover:text-accent-red group-hover:border-accent-red/30 transition-colors">
                                      <span className="material-symbols-outlined text-lg sm:text-xl">upload_file</span>
                                    </div>
                                    <span className="text-xs font-bold text-white">اضغط هنا لرفع صورة الإيصال</span>
                                    <span className="text-[10px] text-text-muted">JPG, PNG أو WebP (الحد الأقصى 5 ميجابايت)</span>
                                  </div>
                                )}
                              </label>

                              {uploadError && (
                                <span className="text-red-500 text-xs mt-1.5 block">{uploadError}</span>
                              )}

                              {isUploading && (
                                <div className="mt-2 space-y-1">
                                  <div className="flex justify-between text-xs text-accent-red">
                                    <span>جاري رفع الصورة...</span>
                                    <span>{uploadProgress}%</span>
                                  </div>
                                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-accent-red h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* CASE 2: Vodafone Cash Full Payment Details */}
                    {isVodafoneCashEnabled && selectedPaymentMethod === 'vodafone_cash' && (
                      <div className="space-y-3.5 sm:space-y-4">
                        <div className="bg-[#121212] border border-accent-red/30 p-2.5 sm:p-3.5 rounded-xl flex items-center justify-between gap-2 text-xs sm:text-sm">
                          <span className="text-text-muted">المبلغ المطلوب بالكامل:</span>
                          <span className="font-product-title font-bold text-accent-red text-base sm:text-lg md:text-xl font-mono" dir="ltr">
                            {finalTotal.toFixed(2)} EGP
                          </span>
                        </div>

                        <div className="space-y-2.5 sm:space-y-3 text-xs text-text-muted leading-relaxed">
                          <p>1. قم بتحويل المبلغ أعلاه إلى رقم محفظة فودافون كاش الرسمية التالية:</p>
                          <div className="bg-[#121212] border border-white/10 p-2.5 sm:p-3.5 rounded-xl flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 p-1.5 shrink-0 flex items-center justify-center">
                                <img src="/images/vodafone.png" alt="Vodafone Cash" className="w-full h-full object-contain" />
                              </div>
                              <div className="flex flex-col text-right min-w-0">
                                <span className="text-[10px] text-text-muted font-bold">رقم محفظة فودافون كاش:</span>
                                <span className="font-mono font-bold text-sm sm:text-lg text-white tracking-wider select-all truncate" dir="ltr">
                                  {siteConfig?.paymentReceivingInfo?.vodafoneCashNumber || siteConfig?.contactInfo?.whatsapp || '01012345678'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopyCoordinate(siteConfig?.paymentReceivingInfo?.vodafoneCashNumber || siteConfig?.contactInfo?.whatsapp || '01012345678', 'vf-full')}
                                className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1 transition-all border border-white/10 active:scale-95 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  {copiedField === 'vf-full' ? 'check' : 'content_copy'}
                                </span>
                                <span>{copiedField === 'vf-full' ? 'تم النسخ' : 'نسخ'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePayViaVodafoneApp('vf-full', finalTotal)}
                                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-accent-red hover:bg-accent-red/90 text-white flex items-center justify-center gap-1.5 transition-all shadow-md shadow-accent-red/20 active:scale-95 cursor-pointer"
                              >
                                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                  <img src="/images/vodafone.png" alt="Vodafone Cash" className="w-full h-full object-contain" />
                                </div>
                                <span>الدفع من التطبيق</span>
                              </button>
                            </div>
                          </div>
                          <p className="pt-0.5">2. اكتب رقم المحفظة المحول منها، وارفق صورة إيصال التحويل:</p>
                        </div>

                        <div>
                          <label htmlFor="vodafoneCashNumber" className="text-xs font-bold text-text-muted mb-1 block">رقم المحفظة المحول منها (11 رقم) *</label>
                          <input
                            id="vodafoneCashNumber"
                            autoComplete="tel"
                            type="tel"
                            placeholder="010XXXXXXXX"
                            dir="ltr"
                            {...register('vodafoneCashNumber')}
                            className={`w-full bg-[#050505] border text-white text-base sm:text-sm px-3.5 py-2.5 text-right rounded-xl focus:outline-none transition-all ${
                              errors.vodafoneCashNumber ? 'border-red-500' : 'border-white/10 focus:border-accent-red'
                            }`}
                          />
                          {errors.vodafoneCashNumber && (
                            <span className="text-red-500 text-xs mt-1 block">{errors.vodafoneCashNumber.message}</span>
                          )}
                        </div>

                        {/* Receipt Upload Dropzone */}
                        <div>
                          <label className="text-xs font-bold text-text-muted mb-1.5 block">إرفاق صورة إيصال التحويل *</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            id="modal-vodafone-proof-input"
                          />

                          <label
                            htmlFor="modal-vodafone-proof-input"
                            className="border border-dashed border-white/20 hover:border-accent-red bg-[#0a0a0a] hover:bg-[#111111] p-3 sm:p-5 flex flex-col items-center justify-center cursor-pointer transition-all rounded-xl group"
                          >
                            {paymentProofPreview ? (
                              <div className="flex flex-col items-center gap-2">
                                <img src={paymentProofPreview} alt="Receipt Preview" className="max-h-24 sm:max-h-32 max-w-full object-contain border border-white/10 rounded-lg shadow-md" />
                                <span className="text-xs text-accent-red font-bold flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm">cached</span>
                                  <span>تغيير صورة الإيصال</span>
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1.5 text-text-muted py-1">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-text-muted group-hover:text-accent-red group-hover:border-accent-red/30 transition-colors">
                                  <span className="material-symbols-outlined text-lg sm:text-xl">upload_file</span>
                                </div>
                                <span className="text-xs font-bold text-white">اضغط هنا لرفع صورة الإيصال</span>
                                <span className="text-[10px] text-text-muted">JPG, PNG أو WebP (الحد الأقصى 5 ميجابايت)</span>
                              </div>
                            )}
                          </label>

                          {uploadError && (
                            <span className="text-red-500 text-xs mt-1.5 block">{uploadError}</span>
                          )}

                          {isUploading && (
                            <div className="mt-2 space-y-1">
                              <div className="flex justify-between text-xs text-accent-red">
                                <span>جاري رفع الصورة...</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-accent-red h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CASE 3: InstaPay Full Payment Details */}
                    {isInstapayEnabled && selectedPaymentMethod === 'instapay' && (
                      <div className="space-y-3.5 sm:space-y-4">
                        <div className="bg-[#121212] border border-accent-red/30 p-2.5 sm:p-3.5 rounded-xl flex items-center justify-between gap-2 text-xs sm:text-sm">
                          <span className="text-text-muted">المبلغ المطلوب بالكامل:</span>
                          <span className="font-product-title font-bold text-accent-red text-base sm:text-lg md:text-xl font-mono" dir="ltr">
                            {finalTotal.toFixed(2)} EGP
                          </span>
                        </div>

                        <div className="space-y-2.5 sm:space-y-3 text-xs text-text-muted leading-relaxed">
                          <p>1. قم بتحويل المبلغ أعلاه إلى حساب أو عنوان انستاباي الرسمي التالي:</p>
                          <div className="bg-[#121212] border border-white/10 p-2.5 sm:p-3.5 rounded-xl flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 p-1.5 shrink-0 flex items-center justify-center">
                                <img src="/images/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                              </div>
                              <div className="flex flex-col text-right min-w-0">
                                <span className="text-[10px] text-text-muted font-bold">عنوان أو حساب انستاباي (IPA):</span>
                                <span className="font-mono font-bold text-sm sm:text-lg text-white tracking-wider select-all truncate" dir="ltr">
                                  {siteConfig?.paymentReceivingInfo?.instapayHandle || 'ahmeeedel3raby@instapay'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopyCoordinate(siteConfig?.paymentReceivingInfo?.instapayHandle || 'ahmeeedel3raby@instapay', 'insta-full')}
                                className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1 transition-all border border-white/10 active:scale-95 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  {copiedField === 'insta-full' ? 'check' : 'content_copy'}
                                </span>
                                <span>{copiedField === 'insta-full' ? 'تم النسخ' : 'نسخ'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePayViaInstapayApp('insta-full', finalTotal)}
                                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-accent-red hover:bg-accent-red/90 text-white flex items-center justify-center gap-1.5 transition-all shadow-md shadow-accent-red/20 active:scale-95 cursor-pointer"
                              >
                                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                  <img src="/images/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                                </div>
                                <span>الدفع من التطبيق</span>
                              </button>
                            </div>
                          </div>
                          <p className="pt-0.5">2. اكتب رقم الموبايل أو عنوان انستاباي المحول منه، وارفق صورة الإيصال:</p>
                        </div>

                        <div>
                          <label htmlFor="instapayHandle" className="text-xs font-bold text-text-muted mb-1 block">رقم أو عنوان انستاباي (IPA) المحول منه *</label>
                          <input
                            id="instapayHandle"
                            type="text"
                            placeholder="username@instapay أو 010XXXXXXXX"
                            dir="ltr"
                            {...register('instapayHandle')}
                            className={`w-full bg-[#050505] border text-white text-base sm:text-sm px-3.5 py-2.5 text-right rounded-xl focus:outline-none transition-all ${
                              errors.instapayHandle ? 'border-red-500' : 'border-white/10 focus:border-accent-red'
                            }`}
                          />
                          {errors.instapayHandle && (
                            <span className="text-red-500 text-xs mt-1 block">{errors.instapayHandle.message}</span>
                          )}
                        </div>

                        {/* Receipt Upload Dropzone */}
                        <div>
                          <label className="text-xs font-bold text-text-muted mb-1.5 block">إرفاق صورة إيصال التحويل *</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            id="modal-instapay-proof-input"
                          />

                          <label
                            htmlFor="modal-instapay-proof-input"
                            className="border border-dashed border-white/20 hover:border-accent-red bg-[#0a0a0a] hover:bg-[#111111] p-3 sm:p-5 flex flex-col items-center justify-center cursor-pointer transition-all rounded-xl group"
                          >
                            {paymentProofPreview ? (
                              <div className="flex flex-col items-center gap-2">
                                <img src={paymentProofPreview} alt="Receipt Preview" className="max-h-24 sm:max-h-32 max-w-full object-contain border border-white/10 rounded-lg shadow-md" />
                                <span className="text-xs text-accent-red font-bold flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm">cached</span>
                                  <span>تغيير صورة الإيصال</span>
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1.5 text-text-muted py-1">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-text-muted group-hover:text-accent-red group-hover:border-accent-red/30 transition-colors">
                                  <span className="material-symbols-outlined text-lg sm:text-xl">upload_file</span>
                                </div>
                                <span className="text-xs font-bold text-white">اضغط هنا لرفع صورة الإيصال</span>
                                <span className="text-[10px] text-text-muted">JPG, PNG أو WebP (الحد الأقصى 5 ميجابايت)</span>
                              </div>
                            )}
                          </label>

                          {uploadError && (
                            <span className="text-red-500 text-xs mt-1.5 block">{uploadError}</span>
                          )}

                          {isUploading && (
                            <div className="mt-2 space-y-1">
                              <div className="flex justify-between text-xs text-accent-red">
                                <span>جاري رفع الصورة...</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-accent-red h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Modal Footer - Native Mobile Action Bar */}
                  <div className="p-3.5 sm:p-5 border-t border-white/10 bg-[#0a0a0a] shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
                    <button
                      type="button"
                      onClick={() => setIsPaymentModalOpen(false)}
                      className="w-full sm:w-auto order-2 sm:order-1 py-2 sm:py-3 px-4 rounded-xl text-text-muted hover:text-white text-xs font-bold transition-colors text-center cursor-pointer"
                    >
                      إغلاق
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmPaymentModal}
                      className="w-full sm:w-auto order-1 sm:order-2 py-3.5 sm:py-3 px-6 rounded-xl bg-accent-red hover:bg-accent-red/90 text-white font-product-title font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-accent-red/25 transition-transform active:scale-[0.98] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg">check</span>
                      <span>حفظ وتأكيد بيانات الدفع</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar Order Summary (5 Cols) - Always visible on Desktop, visible on Mobile Step 2 */}
          <div className={`lg:col-span-5 bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 text-right lg:sticky lg:top-6 shadow-xl ${
            mobileStep === 2 ? 'block' : 'hidden lg:block'
          }`}>
            <h2 className="font-product-title font-bold text-xl text-white border-b border-white/10 pb-4 flex items-center justify-between">
              <span>منتجات الطلب ({cart.length})</span>
              <Link href="/cart" className="text-xs text-accent-red hover:underline font-normal">تعديل السلة</Link>
            </h2>

            {/* Cart Items List */}
            <div className="space-y-4 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {cart.map((item, idx) => (
                <div key={`${item.productId}-${item.flavor || 'default'}-${idx}`} className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={getOptimizedImageUrl(item.image, { width: 120, height: 120 })} 
                      alt={item.name} 
                      className="w-12 h-12 object-contain bg-white/5 border border-white/10 p-1 rounded-xl shrink-0"
                    />
                    <div>
                      <div className="font-bold text-white text-xs line-clamp-1">{item.name}</div>
                      {item.flavor && <div className="text-[10px] text-text-muted">الطعم: {item.flavor}</div>}
                      <div className="text-[11px] text-text-muted">{item.quantity} x {item.price} EGP</div>
                    </div>
                  </div>
                  <div className="font-mono text-sm font-bold text-white" dir="ltr">
                    {(item.price * item.quantity).toFixed(2)} EGP
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon Application Box */}
            <div className="border-t border-white/10 pt-4">
              <div className="space-y-2">
                <label htmlFor="couponCode" className="text-xs font-bold text-text-muted block">كوبون الخصم</label>
                <div className="flex gap-2">
                  <input
                    id="couponCode"
                    name="couponCode"
                    autoComplete="off"
                    type="text"
                    placeholder="ادخل الكود"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyCoupon(e);
                      }
                    }}
                    disabled={!!appliedCoupon || checkingCoupon}
                    className="bg-[#050505] border border-white/10 text-white text-xs px-3 py-2.5 rounded-xl flex-grow focus:border-accent-red focus:outline-none uppercase font-mono"
                  />
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={() => { setAppliedCoupon(null); setCouponCode(''); setCouponSuccess(''); }}
                      className="bg-red-500/20 text-red-500 border border-red-500/30 px-4 py-2.5 rounded-xl text-xs font-bold"
                    >
                      إلغاء
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={checkingCoupon || !couponCode.trim()}
                      className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      {checkingCoupon ? '...' : 'تطبيق'}
                    </button>
                  )}
                </div>
              </div>

              {couponError && <div className="text-red-500 text-xs mt-1">{couponError}</div>}
              {couponSuccess && <div className="text-emerald-500 text-xs mt-1">{couponSuccess}</div>}
            </div>

            {/* Price Calculations */}
            <div className="space-y-3 text-sm border-t border-white/10 pt-4">
              <div className="flex justify-between text-text-muted">
                <span>المجموع الفرعي:</span>
                <span className="text-white font-mono" dir="ltr">{subtotal.toFixed(2)} EGP</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-400">
                  <span>الخصم ({appliedCoupon.code}):</span>
                  <span className="font-mono" dir="ltr">-{discountAmount.toFixed(2)} EGP</span>
                </div>
              )}

              <div className="flex justify-between text-text-muted">
                <span>مصاريف الشحن:</span>
                {calculatedShippingCost === 0 ? (
                  <span className="text-emerald-400 font-bold">شحن مجاني</span>
                ) : (
                  <span className="text-white font-mono" dir="ltr">{calculatedShippingCost} EGP</span>
                )}
              </div>
            </div>

            {/* Total */}
            <div className="border-t border-white/10 pt-4 flex justify-between items-center">
              <span className="font-bold text-white text-base">المبلغ الإجمالي المطلق:</span>
              <span className="font-product-title font-black text-accent-red text-3xl" dir="ltr">
                {finalTotal.toFixed(2)} EGP
              </span>
            </div>

            {orderError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl text-right">
                {orderError}
              </div>
            )}

            {/* Desktop / Inline Submit Order Button */}
            <div ref={inlineActionStep2Ref}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-accent-red text-white font-product-title font-bold text-lg tracking-wide hover:bg-accent-red-hover transition-all rounded-xl shadow-[0_0_25px_rgba(227,30,36,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="w-5 h-5 text-white animate-spin" />
                    <span>جاري تسجيل وتأكيد الطلب...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">check_circle</span>
                    <span>تأكيد وشراء الطلب الآن</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-[10px] text-text-muted text-center space-y-1">
              <div>بضغطك على تأكيد الطلب، فأنت توافق على <Link href="/terms" className="text-white underline">الشروط والأحكام</Link> و <Link href="/return-policy" className="text-white underline">سياسة الاسترجاع</Link>.</div>
            </div>
          </div>

        </form>

        {/* STICKY BOTTOM MOBILE CHECKOUT BAR (Visible on mobile only: lg:hidden, hides when inline button is visible or modal is open) */}
        <div className={`lg:hidden fixed bottom-4 left-3 right-3 z-40 bg-[#0d0d0d]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-3 sm:p-4 shadow-[0_15px_40px_rgba(0,0,0,0.9)] transition-all duration-300 ${
          isStickyVisible && !isPaymentModalOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-8 pointer-events-none'
        }`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="text-right">
              <div className="text-[10px] text-text-muted">
                {mobileStep === 1 ? 'تقدير الإجمالي' : 'المبلغ النهائي'}
              </div>
              <div className="font-product-title font-black text-accent-red text-lg sm:text-xl" dir="ltr">
                {finalTotal.toFixed(2)} EGP
              </div>
            </div>

            {mobileStep === 1 ? (
              <button
                type="button"
                onClick={handleNextToPayment}
                className="flex-1 py-3.5 px-4 bg-gradient-to-r from-accent-red to-red-600 hover:from-red-600 hover:to-accent-red text-white font-product-title font-bold text-sm sm:text-base rounded-xl shadow-[0_0_20px_rgba(227,30,36,0.5)] flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <span>متابعة للدفع</span>
                <span className="material-symbols-outlined text-lg rtl:rotate-180">arrow_back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="flex-1 py-3.5 px-4 bg-gradient-to-r from-accent-red to-red-600 hover:from-red-600 hover:to-accent-red text-white font-product-title font-bold text-sm sm:text-base rounded-xl shadow-[0_0_20px_rgba(227,30,36,0.5)] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="w-4 h-4 text-white animate-spin" />
                    <span>جاري التأكيد...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    <span>تأكيد الشراء الآن</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
