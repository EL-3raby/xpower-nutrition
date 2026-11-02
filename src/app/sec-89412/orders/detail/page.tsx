'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getOrderById, updateOrderStatus, markOrderAsRead, updateOrderPaymentStatus } from '@/lib/firebase/orders';
import { getProductById } from '@/lib/firebase/products';
import { getSiteConfig } from '@/lib/firebase/admin-actions';
import { Order, SiteConfig } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';

function OrderDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id') as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [productSlugs, setProductSlugs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusVal, setStatusVal] = useState<Order['status']>('pending');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [autoPrint, setAutoPrint] = useState(true);
  const [autoPrintFormat, setAutoPrintFormat] = useState<'a4' | 'thermal'>('thermal');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAutoPrint = localStorage.getItem('xpower_auto_print');
      if (savedAutoPrint !== null) {
        setAutoPrint(savedAutoPrint === 'true');
      }
      const savedFormat = localStorage.getItem('xpower_auto_print_format');
      if (savedFormat === 'a4' || savedFormat === 'thermal') {
        setAutoPrintFormat(savedFormat);
        setPrintFormat(savedFormat);
      }
    }
  }, []);

  const handlePrint = (format: 'a4' | 'thermal') => {
    setPrintFormat(format);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleConfirmPayment = async () => {
    if (!order) return;
    setUpdatingPayment(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await updateOrderPaymentStatus(orderId, 'confirmed', 'confirmed');
      setSuccessMsg('تم تأكيد الدفع وتحديث حالة الطلب إلى (تم التأكيد) بنجاح!');
      setStatusVal('confirmed');
      setOrder({ ...order, paymentStatus: 'confirmed', status: 'confirmed' });
      
      const isCodDeposit = order.paymentMethod === 'cod' && (order.depositAmount ?? 0) > 0;
      const remainingAmount = Math.max(0, order.totalPrice - (order.depositAmount || 0));
      const orderSubtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const isFreeShipping = Math.max(0, order.totalPrice - (orderSubtotal - (order.discountAmount || 0))) === 0;
      const depositLabel = isFreeShipping ? 'الديبوزيت التأميني' : 'ديبوزيت الشحن';

      let text = '';
      if (isCodDeposit) {
        text = `\u200Fأهلاً بك يا ${order.customerName}\n\u200Fمعاك فريق عمل Xpower Nutrition.\n\n\u200Fتم التحقق من إثبات التحويل وتأكيد استلام ${depositLabel} (${order.depositAmount} جنيه) بنجاح لطلبك رقم (#${orderId}).\n\n\u200F- المتبقي للتحصيل عند الاستلام كاش للمندوب: ${remainingAmount.toFixed(0)} جنيه\n\u200F- إجمالي قيمة الطلب: ${order.totalPrice} جنيه\n\n\u200Fالطلب الآن مؤكد وجاري تجهيزه وتسليمه لشركة الشحن في أسرع وقت. شكراً لثقتك بنا!`;
      } else {
        text = `\u200Fأهلاً بك يا ${order.customerName}\n\u200Fمعاك فريق عمل Xpower Nutrition.\n\n\u200Fتم التحقق من إثبات التحويل وتأكيد استلام كامل المبلغ (${order.totalPrice} جنيه) بنجاح لطلبك رقم (#${orderId}).\n\n\u200Fالطلب الآن مؤكد وجاري تجهيزه وتسليمه لشركة الشحن في أسرع وقت. شكراً لثقتك بنا!`;
      }

      const formattedPhone = order.phone.startsWith('0') ? `2${order.phone}` : order.phone;
      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');

      if (autoPrint) {
        setSuccessMsg('تم تأكيد الدفع والطلب بنجاح! جاري فتح نافذة الطباعة التلقائية للفاتورة...');
        setTimeout(() => {
          handlePrint(autoPrintFormat);
        }, 500);
      }
    } catch (err: any) {
      console.error('Error confirming payment:', err);
      setErrorMsg(err.message || 'فشل تأكيد الدفع.');
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!order) return;
    setUpdatingPayment(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await updateOrderPaymentStatus(orderId, 'rejected', 'cancelled');
      setSuccessMsg('تم رفض الدفع وتحديث حالة الطلب إلى (ملغي).');
      setStatusVal('cancelled');
      setOrder({ ...order, paymentStatus: 'rejected', status: 'cancelled' });

      const text = `\u200Fأهلاً بك يا ${order.customerName}\n\u200Fمعاك فريق عمل Xpower Nutrition.\n\n\u200Fبخصوص طلبك رقم (#${orderId})، تعذر علينا التحقق من صحة إثبات التحويل المرفق أو مطابقة بيانات الدفع، وتم تعليق تأكيد الطلب مؤقتاً.\n\n\u200Fيرجى تزويدنا بصورة واضحة من إشعار التحويل أو رقم العملية هنا في المحادثة حتى نتمكن من مراجعتها وتأكيد طلبك في أقرب وقت.\n\n\u200Fفريق خدمة العملاء في خدمتك دائماً لمساعدتك.`;

      const formattedPhone = order.phone.startsWith('0') ? `2${order.phone}` : order.phone;
      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');
    } catch (err: any) {
      console.error('Error rejecting payment:', err);
      setErrorMsg(err.message || 'فشل تسجيل رفض الدفع.');
    } finally {
      setUpdatingPayment(false);
    }
  };

  useEffect(() => {
    async function loadOrder() {
      try {
        const config = await getSiteConfig();
        if (config) setSiteConfig(config);
      } catch (e) {
        console.error('Error loading siteConfig for invoice:', e);
      }
      if (!orderId) {
        setLoading(false);
        return;
      }
      try {
        const fetched = await getOrderById(orderId);
        if (fetched) {
          setOrder(fetched);
          setStatusVal(fetched.status);
          
          // Mark order as read automatically by admin
          if (!fetched.isReadByAdmin) {
            await markOrderAsRead(orderId);
          }

          // Fetch product slugs for review links
          if (fetched.items && fetched.items.length > 0) {
            const slugsMap: Record<string, string> = {};
            await Promise.all(
              fetched.items.map(async (item) => {
                try {
                  const prod = await getProductById(item.productId);
                  if (prod && prod.slug) {
                    slugsMap[item.productId] = prod.slug;
                  }
                } catch (e) {
                  console.error('Error fetching product for review link:', e);
                }
              })
            );
            setProductSlugs(slugsMap);
          }
        } else {
          setErrorMsg('الطلب المطلوب غير موجود.');
        }
      } catch (err) {
        console.error('Error fetching order detail for admin:', err);
        setErrorMsg('حدث خطأ أثناء تحميل تفاصيل الطلب.');
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [orderId]);

  const handleStatusChange = async (newStatus: Order['status']) => {
    setUpdating(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await updateOrderStatus(orderId, newStatus);
      setStatusVal(newStatus);
      const isConfirmed = newStatus === 'confirmed';
      setSuccessMsg(
        isConfirmed && autoPrint
          ? 'تم تأكيد الطلب بنجاح! جاري فتح نافذة الطباعة التلقائية للفاتورة...'
          : 'تم تحديث حالة الطلب بنجاح!'
      );
      // Update local state
      if (order) {
        setOrder({
          ...order,
          status: newStatus
        });
      }

      if (isConfirmed && autoPrint) {
        setTimeout(() => {
          handlePrint(autoPrintFormat);
        }, 350);
      }
    } catch (err: any) {
      console.error('Error updating order status:', err);
      setErrorMsg(err.message || 'فشل تحديث حالة الطلب.');
    } finally {
      setUpdating(false);
    }
  };

  // WhatsApp template message generator
  const getWhatsAppUrl = () => {
    if (!order) return '#';

    const siteDomain = typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
      ? window.location.origin
      : 'https://xpowernutrition-eg.com';

    const isCodDeposit = order.paymentMethod === 'cod' && (order.depositAmount ?? 0) > 0;
    const remainingCash = Math.max(0, order.totalPrice - (order.depositAmount || 0));
    const orderSubtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const isFreeShipping = Math.max(0, order.totalPrice - (orderSubtotal - (order.discountAmount || 0))) === 0;
    const depositLabel = isFreeShipping ? 'الديبوزيت التأميني' : 'ديبوزيت الشحن';

    let body = '';

    switch (statusVal) {
      case 'confirmed': {
        let paymentBreakdown = '';
        if (isCodDeposit) {
          paymentBreakdown = `\u200Fتفاصيل الدفع:\n\u200F- تم استلام ${depositLabel}: ${order.depositAmount} جنيه\n\u200F- المتبقي للتحصيل عند الاستلام كاش للمندوب: ${remainingCash.toFixed(0)} جنيه\n\u200F- إجمالي الفاتورة: ${order.totalPrice} جنيه`;
        } else if (order.paymentMethod === 'vodafone_cash' || order.paymentMethod === 'instapay') {
          paymentBreakdown = `\u200Fتفاصيل الدفع:\n\u200F- تم تأكيد استلام كامل المبلغ: ${order.totalPrice} جنيه`;
        } else {
          paymentBreakdown = `\u200Fتفاصيل الدفع:\n\u200F- إجمالي المبلغ المطلوب كاش عند الاستلام: ${order.totalPrice} جنيه`;
        }

        body = `\u200Fأهلاً بك يا ${order.customerName}\n\u200Fمعاك فريق عمل Xpower Nutrition.\n\n\u200Fنود إبلاغك بأنه تم تأكيد طلبك رقم (#${orderId}) بنجاح، وجاري تجهيزه حالياً لتسليمه إلى شركة الشحن في أسرع وقت.\n\n${paymentBreakdown}\n\n\u200Fسنوافيك برسالة تأكيد بمجرد خروج الشحنة مع المندوب. شكراً لثقتك بنا!`;
        break;
      }
      case 'shipped': {
        const codNote = (order.paymentMethod === 'cod')
          ? `\n\n\u200Fالمبلغ المطلوب سداده للمندوب عند الاستلام: ${remainingCash.toFixed(0)} جنيه.`
          : '';

        body = `\u200Fأهلاً بك يا ${order.customerName}\n\u200Fمعاك فريق عمل Xpower Nutrition.\n\n\u200Fيسعدنا إبلاغك بأن طلبك رقم (#${orderId}) خرج للشحن الآن وبحوزة مندوب التوصيل.\n\n\u200Fالمندوب سيتواصل معك هاتفياً قبل الوصول لتسليم الشحنة في العنوان المسجل:\n\u200F(${order.address}، ${order.city}).${codNote}\n\n\u200Fيرجى التأكد من جاهزية هاتفك لاستقبال مكالمة المندوب. نتمنى لك تجربة ممتازة!`;
        break;
      }
      case 'delivered': {
        // Generate product review links
        const reviewLinksList = order.items.map((item) => {
          const slug = productSlugs[item.productId] || '';
          const url = slug 
            ? `${siteDomain}/products/${slug}#reviews`
            : `${siteDomain}/products#reviews`;
          return `\u200F- ${item.name}:\n${url}`;
        }).join('\n\n');

        body = `\u200Fأهلاً بك يا ${order.customerName}\n\u200Fمعاك فريق عمل Xpower Nutrition.\n\n\u200Fتم تسليم طلبك رقم (#${orderId}) بنجاح. نتمنى أن تنال المنتجات كامل رضاك وإعجابك!\n\n\u200Fرأيك يهمنا جداً ويساعدنا دائماً على تقديم الأفضل. نسعد بمشاركتنا تقييمك وتجربتك للمنتج عبر الرابط التالي:\n\n${reviewLinksList}\n\n\u200Fشاكرين جداً اختيارك لـ Xpower Nutrition، وفي انتظارك دائماً!`;
        break;
      }
      case 'cancelled': {
        body = `\u200Fأهلاً بك يا ${order.customerName}\n\u200Fمعاك فريق عمل Xpower Nutrition.\n\n\u200Fنود إبلاغك بأنه تم إلغاء طلبك رقم (#${orderId}).\n\n\u200Fإذا كان هذا الإلغاء قد تم عن طريق الخطأ أو ترغب في تعديل تفاصيل الطلب وإعادة تفعيله، يسعدنا تواصلك معنا مباشرة عبر هذه المحادثة لمساعدتك في أي وقت.\n\n\u200Fشكراً لتواصلك مع Xpower Nutrition.`;
        break;
      }
      default: {
        body = `\u200Fأهلاً بك يا ${order.customerName}\n\u200Fمعاك فريق عمل Xpower Nutrition.\n\n\u200Fطلبك رقم (#${orderId}) مسجل لدينا حالياً وقيد المراجعة.\n\n\u200Fيقوم فريق المبيعات بمراجعة بيانات الطلب وتأكيده تمهيداً لبدء التجهيز والشحن.\n\n\u200Fفي حال وجود أي استفسار يسعدنا الرد عليك في أي وقت!`;
        break;
      }
    }

    const formattedPhone = order.phone.startsWith('0') ? `2${order.phone}` : order.phone;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(body)}`;
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Spinner className="inline-block w-10 h-10 text-accent-red animate-spin" />
      </div>
    );
  }

  if (errorMsg && !order) {
    return (
      <div className="space-y-6 text-right" dir="rtl">
        <div className="bg-accent-red/10 border-r-4 border-accent-red p-4 text-accent-red font-body text-sm">
          {errorMsg}
        </div>
        <Link href="/sec-89412/orders" className="text-text-muted hover:text-white font-product-title text-sm underline">العودة للأوردرات</Link>
      </div>
    );
  }

  const o = order!;

  const subtotal = o.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = o.discountAmount || 0;
  const shippingCost = o.totalPrice - (subtotal - discountAmount);

  return (
    <>
      <div className="space-y-8 text-right print:hidden max-w-7xl mx-auto" dir="rtl">
      
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-row-reverse justify-start">
            <Link href="/sec-89412/orders" className="text-xs text-text-muted hover:text-white transition-colors flex items-center gap-1">
              <span>الأوردرات</span>
            </Link>
            <span className="text-xs text-text-muted/40">/</span>
            <span className="text-xs text-accent-red font-mono font-bold">#{orderId}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-6 bg-accent-red rounded-full shrink-0"></span>
            <h1 className="font-product-title text-2xl md:text-3xl font-black text-white">تفاصيل الطلب #{orderId}</h1>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          {/* Auto Print Setting Toggle */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={autoPrint} 
                onChange={(e) => {
                  setAutoPrint(e.target.checked);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('xpower_auto_print', e.target.checked ? 'true' : 'false');
                  }
                }}
                className="accent-accent-red w-3.5 h-3.5 cursor-pointer"
              />
              <span className="font-product-title font-bold text-white text-[11px] sm:text-xs">
                طباعة تلقائية عند التأكيد
              </span>
            </label>
            <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-1">
              <button 
                type="button"
                onClick={() => {
                  setAutoPrintFormat('a4');
                  if (typeof window !== 'undefined') localStorage.setItem('xpower_auto_print_format', 'a4');
                }}
                title="الطباعة التلقائية بصيغة A4 براند"
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${autoPrintFormat === 'a4' ? 'bg-accent-red text-white' : 'text-text-muted hover:text-white'}`}
              >
                A4
              </button>
              <button 
                type="button"
                onClick={() => {
                  setAutoPrintFormat('thermal');
                  if (typeof window !== 'undefined') localStorage.setItem('xpower_auto_print_format', 'thermal');
                }}
                title="الطباعة التلقائية بصيغة طابعة حرارية 80mm"
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${autoPrintFormat === 'thermal' ? 'bg-amber-400 text-black font-black' : 'text-text-muted hover:text-white'}`}
              >
                حراري 80mm
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={() => handlePrint('a4')}
              title="طباعة فاتورة A4 براند كاملة (Shopify Packing Slip)"
              className="flex-1 sm:flex-none bg-accent-red hover:bg-accent-red/90 text-white font-product-title font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5 shadow-lg shadow-accent-red/20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">description</span>
              <span>A4 براند</span>
            </button>
            <button 
              onClick={() => handlePrint('thermal')}
              title="طباعة إيصال بوليصة شحن للطابعات الحرارية (80mm Thermal Slip)"
              className="flex-1 sm:flex-none bg-zinc-800 hover:bg-zinc-700 text-amber-400 hover:text-amber-300 border border-amber-400/30 font-product-title font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">receipt_long</span>
              <span>حراري (80mm)</span>
            </button>
            <Link 
              href="/sec-89412/orders" 
              className="text-center text-text-muted hover:text-white font-product-title text-xs border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2.5 rounded-xl transition-colors font-bold"
            >
              العودة
            </Link>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 text-emerald-400 font-body text-sm rounded-2xl flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-accent-red/10 border border-accent-red/25 p-4 text-accent-red font-body text-sm rounded-2xl flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Order Items and Client Info (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Client Details Card */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl md:rounded-3xl p-5 sm:p-7 flex flex-col gap-5 shadow-xl">
            <h2 className="font-product-title text-base sm:text-lg font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-accent-red text-xl">person</span>
              <span>بيانات العميل ومعلومات الشحن</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-body text-sm">
              <div className="bg-black/50 border border-white/5 rounded-xl p-3.5 flex flex-col gap-1">
                <span className="text-xs text-text-muted font-bold">اسم العميل:</span>
                <span className="text-white font-bold text-base">{o.customerName}</span>
              </div>
              <div className="bg-black/50 border border-white/5 rounded-xl p-3.5 flex flex-col gap-1">
                <span className="text-xs text-text-muted font-bold">رقم الهاتف:</span>
                <div className="flex items-center justify-between">
                  <span className="text-white font-mono font-bold select-all text-base tracking-wider" dir="ltr">{o.phone}</span>
                  <a 
                    href={`tel:${o.phone}`} 
                    className="text-xs text-text-muted hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">call</span>
                    <span>اتصال</span>
                  </a>
                </div>
              </div>
              <div className="bg-black/50 border border-white/5 rounded-xl p-3.5 flex flex-col gap-1 md:col-span-2">
                <span className="text-xs text-text-muted font-bold">العنوان ومكان التسليم:</span>
                <span className="text-white font-semibold leading-relaxed">{o.address} — {o.city}</span>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2 border-t border-white/5 pt-3">
                <span className="text-xs text-text-muted font-bold">طريقة وسجل الدفع:</span>
                <div className="pt-1">
                  {o.paymentMethod === 'vodafone_cash' ? (
                    <span className="bg-rose-500/10 text-rose-300 border border-rose-500/20 px-3.5 py-2 font-bold text-xs rounded-xl inline-flex items-center gap-2">
                      <div className="w-4 h-4 inline-flex items-center justify-center shrink-0">
                        <img src="/images/vodafone.png" alt="Vodafone" className="w-full h-full object-contain" />
                      </div>
                      <span>دفع كامل مقدماً — فودافون كاش ({o.totalPrice} EGP)</span>
                    </span>
                  ) : o.paymentMethod === 'instapay' ? (
                    <span className="bg-purple-500/10 text-purple-300 border border-purple-500/20 px-3.5 py-2 font-bold text-xs rounded-xl inline-flex items-center gap-2">
                      <div className="w-4 h-4 inline-flex items-center justify-center shrink-0">
                        <img src="/images/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                      </div>
                      <span>دفع كامل مقدماً — انستاباي ({o.totalPrice} EGP)</span>
                    </span>
                  ) : (o.depositAmount && o.depositAmount > 0) ? (
                    <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-3.5 py-2 font-bold text-xs rounded-xl inline-flex items-center gap-2">
                      {o.depositPaymentMethod === 'instapay' ? (
                        <div className="w-4 h-4 inline-flex items-center justify-center shrink-0">
                          <img src="/images/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 inline-flex items-center justify-center shrink-0">
                          <img src="/images/vodafone.png" alt="Vodafone" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <span>
                        {shippingCost <= 0 ? 'ديبوزيت تأميني' : 'ديبوزيت شحن'} ({o.depositAmount} جنيه) عبر [{o.depositPaymentMethod === 'instapay' ? 'انستاباي' : 'فودافون كاش'}] + الباقي ({(o.totalPrice - o.depositAmount).toFixed(0)} جنيه) كاش عند الاستلام
                      </span>
                    </span>
                  ) : (
                    <span className="bg-white/5 text-white border border-white/10 px-3.5 py-2 font-bold text-xs rounded-xl inline-flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-accent-red">payments</span>
                      <span>دفع عند الاستلام كاش بالكامل ({o.totalPrice} EGP)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Sender details according to method */}
              {o.paymentMethod === 'vodafone_cash' && o.vodafoneCashNumber && (
                <div className="flex flex-col gap-1 bg-rose-500/10 p-3.5 md:col-span-2 text-rose-300 border border-rose-500/20 rounded-xl">
                  <span className="text-xs text-text-muted font-bold">التحويل من محفظة فودافون كاش رقم:</span>
                  <span className="font-bold font-mono select-all text-base tracking-wider" dir="ltr">{o.vodafoneCashNumber}</span>
                </div>
              )}

              {o.paymentMethod === 'instapay' && o.instapayHandle && (
                <div className="flex flex-col gap-1 bg-purple-500/10 p-3.5 md:col-span-2 text-purple-300 border border-purple-500/20 rounded-xl">
                  <span className="text-xs text-text-muted font-bold">التحويل من حساب أو عنوان انستاباي:</span>
                  <span className="font-bold font-mono select-all text-base tracking-wider" dir="ltr">{o.instapayHandle}</span>
                </div>
              )}

              {o.paymentMethod === 'cod' && Boolean(o.depositAmount && o.depositAmount > 0) && (
                <div className="flex flex-col gap-2 bg-amber-500/10 p-4 md:col-span-2 text-amber-300 border border-amber-500/20 rounded-xl">
                  <div className="text-xs text-text-muted font-bold">
                    بيانات تحويل ديبوزيت التوصيل عبر ({o.depositPaymentMethod === 'instapay' ? 'انستاباي' : 'فودافون كاش'}):
                  </div>
                  <div className="font-bold font-mono select-all text-base tracking-wider text-white" dir="ltr">
                    {o.depositSenderInfo || 'غير محدد'}
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-white/10 font-bold">
                    <span>مبلغ الديبوزيت المحول: <strong className="text-amber-400 font-mono text-sm">{o.depositAmount} جنيه</strong></span>
                    <span>المتبقي كاش للمندوب: <strong className="text-emerald-400 font-mono text-sm">{(o.totalPrice - (o.depositAmount || 0)).toFixed(0)} جنيه</strong></span>
                  </div>
                </div>
              )}

              {/* Review section: for any order with paymentStatus / paymentProofUrl */}
              {(o.paymentStatus || o.paymentProofUrl) && (
                <div className="md:col-span-2 border-t border-white/10 pt-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-text-muted font-bold">حالة مراجعة الدفع:</span>
                    <span>
                      {o.paymentStatus === 'confirmed' ? (
                        <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 py-1 font-bold text-xs rounded-full">تم التأكيد</span>
                      ) : o.paymentStatus === 'rejected' ? (
                        <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-3 py-1 font-bold text-xs rounded-full">مرفوض</span>
                      ) : (
                        <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-3 py-1 font-bold text-xs rounded-full animate-pulse">قيد المراجعة</span>
                      )}
                    </span>
                  </div>

                  {o.paymentProofUrl ? (
                    <div className="flex flex-col gap-3">
                      <span className="text-xs text-text-muted font-bold block text-right">إثبات التحويل المرفق (اضغط للتكبير):</span>
                      <div 
                        className="relative w-48 h-48 border border-white/10 bg-black/60 cursor-pointer overflow-hidden group self-end md:self-start rounded-2xl shadow-lg" 
                        onClick={() => setIsLightboxOpen(true)}
                      >
                        <img 
                          src={o.paymentProofUrl} 
                          alt="إثبات الدفع" 
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform" 
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-2xl">zoom_in</span>
                        </div>
                      </div>

                      <div className="flex gap-2.5 justify-end pt-2">
                        <button 
                          onClick={handleConfirmPayment}
                          disabled={updatingPayment}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-product-title font-bold py-2.5 px-4 text-xs flex items-center gap-1.5 transition-all hover:scale-[1.02] rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          <span>تأكيد الدفع</span>
                        </button>
                        <button 
                          onClick={handleRejectPayment}
                          disabled={updatingPayment}
                          className="bg-rose-600 hover:bg-rose-500 text-white font-product-title font-bold py-2.5 px-4 text-xs flex items-center gap-1.5 transition-all hover:scale-[1.02] rounded-xl shadow-lg shadow-rose-600/20 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">cancel</span>
                          <span>رفض الدفع</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    o.paymentProofCleanedAt ? (
                      <div className="bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex items-center gap-2 font-body">
                        <span className="material-symbols-outlined text-sm shrink-0">verified_user</span>
                        <span>تمت أرشفة وحذف صورة الإيصال بنجاح لمرور أكثر من 14 يوماً على تسليم الطلب (حفاظاً على الخصوصية والمساحة).</span>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-400 text-right font-body">لم يتم إرفاق إثبات دفع لهذه المعاملة.</p>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Items Summary Table */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl md:rounded-3xl p-5 sm:p-7 shadow-xl">
            <h2 className="font-product-title text-base sm:text-lg font-bold text-white border-b border-white/10 pb-3 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-accent-red text-xl">list_alt</span>
              <span>المنتجات المطلوبة في الفاتورة</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-text-muted font-bold uppercase tracking-wider bg-white/[0.02]">
                    <th className="py-3.5 pr-4 text-right">المنتج</th>
                    <th className="py-3.5 text-center">الكمية</th>
                    <th className="py-3.5 text-center">السعر الفردي</th>
                    <th className="py-3.5 pl-4 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-body text-sm">
                  {o.items.map((item, index) => (
                    <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 pr-4 text-right text-white font-bold font-product-title tracking-wide">
                        <div>{item.name}</div>
                        {item.flavor && (
                          <div className="text-xs text-text-muted font-body mt-0.5 font-normal">النكهة: {item.flavor}</div>
                        )}
                      </td>
                      <td className="py-4 text-center font-mono font-bold text-white">{item.quantity}</td>
                      <td className="py-4 text-center font-mono text-text-muted">{item.price} EGP</td>
                      <td className="py-4 pl-4 text-left font-mono font-bold text-white">{item.price * item.quantity} EGP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-white/10 pt-4 mt-4 flex flex-col gap-2 font-body text-sm">
              <div className="flex justify-between items-center text-text-muted">
                <span className="text-xs">المجموع الفرعي للمنتجات:</span>
                <span className="font-mono font-bold text-white">{subtotal} EGP</span>
              </div>
              
              {o.couponCode && (
                <div className="flex justify-between items-center text-emerald-400">
                  <span className="text-xs font-bold">خصم الكوبون ({o.couponCode}):</span>
                  <span className="font-mono font-bold">-{discountAmount} EGP</span>
                </div>
              )}
              
              <div className="flex justify-between items-center text-text-muted">
                <span className="text-xs">مصاريف الشحن:</span>
                <span className="font-mono font-bold text-white">{shippingCost > 0 ? `${shippingCost} EGP` : 'توصيل مجاني'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-white/10 pt-4 mt-4 font-bold bg-white/[0.02] -mx-5 -mb-5 sm:-mx-7 sm:-mb-7 p-5 sm:p-7 rounded-b-2xl sm:rounded-b-3xl">
              <span className="font-product-title text-white text-base">المبلغ الإجمالي الكلي:</span>
              <span className="font-mono text-accent-red text-2xl sm:text-3xl font-black" dir="ltr">{o.totalPrice} <span className="text-xs font-body text-text-muted font-bold">EGP</span></span>
            </div>
          </div>

        </div>

        {/* Right Side: Status Updates & Actions (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Order Status Controller */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl md:rounded-3xl p-5 sm:p-6 flex flex-col gap-5 shadow-xl sticky top-6">
            <h2 className="font-product-title text-base sm:text-lg font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-accent-red text-xl">edit_document</span>
              <span>تعديل حالة الأوردر</span>
            </h2>

            <div className="flex flex-col gap-2">
              <label className="font-body text-xs text-text-muted font-bold">الحالة الحالية للشحن والطلب</label>
              <select 
                value={statusVal}
                onChange={(e) => handleStatusChange(e.target.value as Order['status'])}
                disabled={updating || o.paymentStatus === 'pending_review'}
                className="bg-black/60 text-white border border-white/10 rounded-xl px-4 py-3 font-body text-xs sm:text-sm focus:border-accent-red focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <option value="pending">قيد الانتظار (Pending)</option>
                <option value="confirmed">تم التأكيد (Confirmed)</option>
                <option value="shipped">تم الشحن (Shipped)</option>
                <option value="delivered">تم التوصيل (Delivered)</option>
                <option value="cancelled">إلغاء الطلب (Cancelled)</option>
              </select>
              {o.paymentStatus === 'pending_review' && (
                <p className="text-amber-400 text-xs mt-1 font-body">يرجى تأكيد إثبات الدفع أولاً لتفعيل تغيير حالة الشحن.</p>
              )}
            </div>

            {/* WhatsApp Updates Sender */}
            <a 
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-product-title font-bold py-3.5 px-4 rounded-xl transition-all hover:scale-[1.02] text-center flex items-center justify-center gap-2 text-xs sm:text-sm shadow-lg shadow-[#25D366]/20 cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.09-3.969l.325.193c1.614.959 3.477 1.464 5.378 1.465 5.867 0 10.641-4.757 10.644-10.627.002-2.844-1.1-5.516-3.104-7.52C17.387 1.54 14.72 1.43 11.879 1.43c-5.872 0-10.647 4.757-10.65 10.628 0 2.01.528 3.974 1.53 5.73l.21.365-1.01 3.682 3.778-.992zM17.15 13.9c-.279-.14-1.654-.816-1.91-.909-.255-.094-.44-.14-.625.14-.184.28-.71.909-.87 1.096-.159.186-.32.21-.599.07-.279-.14-1.18-.435-2.247-1.387-.83-.74-1.39-1.653-1.553-1.933-.163-.28-.018-.43.122-.569.126-.125.279-.327.42-.49.14-.163.187-.28.279-.465.093-.186.047-.35-.024-.49-.07-.14-.625-1.507-.856-2.066-.225-.544-.45-.47-.625-.479-.16-.008-.34-.01-.52-.01-.18 0-.475.067-.723.34-.247.272-.945.923-.945 2.25 0 1.327.966 2.607 1.1 2.785.135.178 1.9 2.9 4.602 4.069.642.278 1.144.444 1.534.568.646.206 1.233.177 1.698.108.518-.077 1.654-.676 1.888-1.332.235-.656.235-1.22.165-1.332-.07-.11-.256-.2-.536-.34z"/>
              </svg>
              <span>إرسال تحديث واتساب للعميل</span>
            </a>
          </div>

        </div>

      </div>

      {/* Lightbox / Image Enlargement Modal */}
      {isLightboxOpen && o.paymentProofUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn cursor-zoom-out" onClick={() => setIsLightboxOpen(false)}>
          <button className="absolute top-6 right-6 text-white hover:text-accent-red transition-colors bg-white/10 p-2 rounded-xl">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
          <div className="max-w-4xl max-h-[85vh] w-full h-full relative" onClick={(e) => e.stopPropagation()}>
            <img 
              src={o.paymentProofUrl} 
              alt="إثبات الدفع مكبر" 
              className="w-full h-full object-contain rounded-2xl" 
            />
          </div>
        </div>
      )}

    </div>

      {/* Printable Invoice Section (Shopify A4 Brand + 80mm Thermal Receipt) */}
      <style type="text/css" media="print">
        {`
          @media print {
            /* Common Print Defaults */
            *, *:before, *:after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
            }
            /* Hide web layout items */
            header, nav, aside, footer, #site-layout-container, .print\\:hidden {
              display: none !important;
            }
          }

          ${printFormat === 'thermal' ? `
            @page {
              size: 80mm auto;
              margin: 2mm 3mm;
            }
            .shopify-invoice-container {
              display: none !important;
            }
            .thermal-receipt-container {
              display: block !important;
              width: 74mm !important;
              max-width: 74mm !important;
              margin: 0 auto !important;
              padding: 2mm 1mm 10mm 1mm !important;
              box-sizing: border-box !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: var(--font-cairo), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
              font-size: 11px !important;
              line-height: 1.35 !important;
            }
          ` : `
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            .thermal-receipt-container {
              display: none !important;
            }
            .shopify-invoice-container {
              display: block !important;
              width: 165mm !important;
              max-width: 165mm !important;
              margin: 0 auto !important;
              padding: 6mm 8mm !important;
              box-sizing: border-box !important;
              background: #ffffff !important;
              color: #000000 !important;
              border: 2px dashed #000000 !important;
              border-radius: 8px !important;
              font-family: var(--font-cairo), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
              font-size: 12px !important;
              line-height: 1.4 !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
            }
          `}
        `}
      </style>

      {/* Main Print Wrapper */}
      <div className="hidden print:block text-black bg-white w-full min-h-screen absolute top-0 left-0 right-0 z-[999999]" dir="rtl">
        
       {/* 1. SHOPIFY BRAND INVOICE (A4 / Thermal-Receipt Style)                   */}
        {/* ========================================================================= */}
        <div className="shopify-invoice-container text-right">
          
          {/* Centered Thermal-Style Brand Header */}
          <div className="text-center pb-3 border-b-2 border-dashed border-black mb-3">
            <h1 className="text-2xl font-black uppercase tracking-wider text-black font-display">
              XPOWER NUTRITION
            </h1>
            <p className="text-xs font-bold text-black uppercase mt-0.5">مكملات رياضية أصلية 100% — Fuel Your Potential</p>
            <p className="text-xs font-mono font-bold mt-1" dir="ltr">خدمة العملاء: {siteConfig?.contactInfo?.phone || '01148445744'}</p>
            <p className="text-[11px] font-mono text-zinc-700">xpowernutrition-eg.com</p>
          </div>

          {/* Thermal-Style Order Meta Strip */}
          <div className="text-xs border-b-2 border-dashed border-black pb-3 mb-3 flex justify-between items-center font-bold">
            <div className="flex items-center gap-2">
              <span>رقم الأوردر:</span>
              <span className="font-mono text-base font-black">#{orderId}</span>
            </div>
            <div className="text-xs text-zinc-800">
              <span>التاريخ:</span>{' '}
              <span className="font-mono">
                {(o.createdAt instanceof Date 
                  ? o.createdAt 
                  : (o.createdAt as any)?.toDate?.() || ((o.createdAt as any)?.seconds ? new Date((o.createdAt as any).seconds * 1000) : new Date())
                ).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="bg-black text-white px-2.5 py-0.5 rounded text-[11px] font-bold">
              {o.paymentMethod === 'cod' ? 'COD - دفع عند الاستلام' : 'PREPAID - مدفوع مسبقاً'}
            </div>
          </div>

          {/* Recipient Details for Courier (High Visibility) */}
          <div className="border-b-2 border-dashed border-black pb-3 mb-3 space-y-1.5 text-xs">
            <div className="text-xs font-black uppercase bg-black text-white px-3 py-1 text-center mb-2 tracking-wider rounded">
              بيانات العميل والتسليم (خاص بشركة الشحن والمندوب)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <p><span className="font-bold">العميل:</span> <strong className="font-bold text-sm">{o.customerName}</strong></p>
              <p><span className="font-bold">الموبايل:</span> <strong className="font-mono font-black text-base tracking-wider" dir="ltr">{o.phone}</strong></p>
              <p><span className="font-bold">المحافظة:</span> <strong className="font-bold">{o.city}</strong></p>
              <p className="col-span-2 leading-relaxed"><span className="font-bold">العنوان التفصيلي:</span> {o.address}</p>
            </div>
          </div>

          {/* Thermal-Style Items List */}
          <div className="border-b-2 border-dashed border-black pb-3 mb-3">
            <div className="text-xs font-bold border-b border-black pb-1.5 mb-2 flex justify-between uppercase">
              <span>المنتج والمواصفات</span>
              <div className="flex gap-8">
                <span className="w-16 text-center">الكمية</span>
                <span className="w-20 text-center">سعر الوحدة</span>
                <span className="w-24 text-left">الإجمالي</span>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              {o.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start border-b border-dotted border-zinc-300 pb-1.5">
                  <div className="text-right flex-1 pr-1">
                    <span className="font-bold text-sm">{item.quantity}x {item.name}</span>
                    {item.flavor && <div className="text-[11px] text-zinc-700">النكهة: {item.flavor}</div>}
                  </div>
                  <div className="flex gap-8 items-center font-mono">
                    <span className="w-16 text-center font-bold">{item.quantity}</span>
                    <span className="w-20 text-center text-zinc-700">{item.price} ج.م</span>
                    <span className="w-24 text-left font-black">{item.price * item.quantity} ج.م</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Thermal-Style Financial Totals */}
          <div className="text-xs space-y-1.5 border-b-2 border-dashed border-black pb-3 mb-3">
            <div className="flex justify-between">
              <span>المجموع الفرعي:</span>
              <span className="font-mono font-bold">{subtotal} ج.م</span>
            </div>
            {o.couponCode && (
              <div className="flex justify-between font-bold text-rose-600">
                <span>خصم الكوبون ({o.couponCode}):</span>
                <span className="font-mono">-{discountAmount} ج.م</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>الشحن والتوصيل:</span>
              <span className="font-mono font-bold">{shippingCost > 0 ? `${shippingCost} ج.م` : 'شحن مجاني'}</span>
            </div>
            {Boolean(o.depositAmount && o.depositAmount > 0) && (
              <div className="flex justify-between font-bold text-emerald-700">
                <span>ديبوزيت شحن مسدد مسبقاً:</span>
                <span className="font-mono">-{o.depositAmount} ج.م</span>
              </div>
            )}
            <div className="flex justify-between font-black text-sm pt-1.5 border-t border-black">
              <span>إجمالي الفاتورة:</span>
              <span className="font-mono text-base">{o.totalPrice} ج.م</span>
            </div>
          </div>

          {/* Courier Cash Collection Box (The Exact High-Contrast Box) */}
          <div className="border-2 border-black p-3.5 my-3 text-center bg-zinc-50/50">
            {o.paymentMethod === 'cod' ? (
              <>
                <p className="text-xs font-black uppercase text-zinc-800 leading-none mb-1">المطلوب تحصيله كاش للمندوب:</p>
                <p className="text-3xl font-black font-mono tracking-tight leading-none my-1">
                  {(o.totalPrice - (o.depositAmount || 0)).toFixed(0)} EGP
                </p>
                {Boolean(o.depositAmount && o.depositAmount > 0) && (
                  <p className="text-[11px] font-bold mt-1 text-zinc-700">(تم سداد {o.depositAmount} ج.م ديبوزيت شحن مسبقاً)</p>
                )}
              </>
            ) : (
              <>
                <p className="text-base font-black uppercase text-black leading-none mb-1">مدفوع مسبقاً بالكامل (خالص)</p>
                <p className="text-xs font-bold text-zinc-800 leading-tight">ممنوع تحصيل أي مبالغ إضافية من العميل نهائياً</p>
              </>
            )}
          </div>

          {/* Thermal-Style Footer & Barcode */}
          <div className="text-center pt-2 text-xs space-y-1 text-zinc-800">
            <p className="font-bold text-black">* حق المعاينة مكفول للعميل قبل السداد *</p>
            <p className="text-[11px]">الاسترجاع 14 يوم بحالة العبوة الأصلية وفقاً لقانون حماية المستهلك المصري</p>
            <p className="font-bold font-display uppercase tracking-widest text-black pt-1">شكراً لتسوقكم من XPOWER NUTRITION</p>
            
            {/* Barcode */}
            <div className="flex justify-center items-center gap-0.5 h-8 pt-2">
              {orderId.split('').map((c, i) => (
                <span 
                  key={i} 
                  className="bg-black inline-block h-full" 
                  style={{ width: (c.charCodeAt(0) % 3) + 1.2, marginRight: (c.charCodeAt(0) % 2) + 0.8 }} 
                />
              ))}
            </div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-600 block mt-0.5 font-bold">*{orderId}*</span>
          </div>

        </div>

        {/* ========================================================================= */}
         {/* ========================================================================= */}
        {/* 2. 80MM POS THERMAL RECEIPT (طابعة الفواتير والبوالص الحرارية الصغيرة)       */}
        {/* ========================================================================= */}
        <div className="thermal-receipt-container text-right">
          
          {/* Thermal Header */}
          <div className="text-center pb-2 border-b border-dashed border-black mb-2">
            <h1 className="text-base font-black uppercase tracking-wider text-black font-display">
              XPOWER NUTRITION
            </h1>
            <p className="text-[10px] font-bold text-black uppercase">مكملات رياضية أصلية 100%</p>
            <p className="text-[10px] font-mono font-bold mt-0.5" dir="ltr">خدمة العملاء: {siteConfig?.contactInfo?.phone || '01148445744'}</p>
            <p className="text-[9px] font-mono text-zinc-700">xpowernutrition-eg.com</p>
          </div>

          {/* Thermal Order Meta */}
          <div className="text-[11px] border-b border-dashed border-black pb-2 mb-2 space-y-1">
            <div className="flex justify-between font-bold">
              <span>رقم الأوردر:</span>
              <span className="font-mono text-xs font-black">#{orderId}</span>
            </div>
            <div className="flex justify-between text-[10px] text-zinc-800">
              <span>التاريخ:</span>
              <span className="font-mono">
                {(o.createdAt instanceof Date 
                  ? o.createdAt 
                  : (o.createdAt as any)?.toDate?.() || ((o.createdAt as any)?.seconds ? new Date((o.createdAt as any).seconds * 1000) : new Date())
                ).toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Recipient Details for Courier (High Visibility) */}
          <div className="border-b border-dashed border-black pb-2 mb-2 space-y-1">
            <div className="text-[10px] font-black uppercase bg-black text-white px-1 py-0.5 text-center mb-1">
              بيانات العميل والتسليم
            </div>
            <p className="text-[11px]"><span className="font-bold">العميل:</span> <strong className="font-bold text-xs">{o.customerName}</strong></p>
            <p className="text-[12px]"><span className="font-bold">الموبايل:</span> <strong className="font-mono font-black text-sm tracking-wider" dir="ltr">{o.phone}</strong></p>
            <p className="text-[11px]"><span className="font-bold">المحافظة:</span> <strong className="font-bold">{o.city}</strong></p>
            <p className="text-[10px] leading-tight"><span className="font-bold">العنوان:</span> {o.address}</p>
          </div>

          {/* Thermal Items List */}
          <div className="border-b border-dashed border-black pb-2 mb-2">
            <div className="text-[10px] font-bold border-b border-black pb-1 mb-1.5 flex justify-between">
              <span>المنتج</span>
              <span>السعر</span>
            </div>
            <div className="space-y-1.5 text-[10px]">
              {o.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start leading-tight">
                  <div className="text-right flex-1 pr-1">
                    <span className="font-bold">{item.quantity}x {item.name}</span>
                    {item.flavor && <div className="text-[9px] text-zinc-700">({item.flavor})</div>}
                  </div>
                  <span className="font-mono font-bold whitespace-nowrap">{item.price * item.quantity} ج.م</span>
                </div>
              ))}
            </div>
          </div>

          {/* Thermal Financial Totals */}
          <div className="text-[10px] space-y-1 border-b border-dashed border-black pb-2 mb-2">
            <div className="flex justify-between">
              <span>المجموع الفرعي:</span>
              <span className="font-mono">{subtotal} ج.م</span>
            </div>
            {o.couponCode && (
              <div className="flex justify-between font-bold">
                <span>خصم الكوبون:</span>
                <span className="font-mono">-{discountAmount} ج.م</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>الشحن والتوصيل:</span>
              <span className="font-mono">{shippingCost > 0 ? `${shippingCost} ج.م` : 'مجاني'}</span>
            </div>
            {Boolean(o.depositAmount && o.depositAmount > 0) && (
              <div className="flex justify-between font-bold">
                <span>ديبوزيت شحن مسدد:</span>
                <span className="font-mono">-{o.depositAmount} ج.م</span>
              </div>
            )}
            <div className="flex justify-between font-black text-[11px] pt-1 border-t border-black">
              <span>إجمالي الفاتورة:</span>
              <span className="font-mono">{o.totalPrice} ج.م</span>
            </div>
          </div>

          {/* Thermal Courier Cash Box (The Most Critical Block) */}
          <div className="border-2 border-black p-2 my-2 text-center">
            {o.paymentMethod === 'cod' ? (
              <>
                <p className="text-[10px] font-bold uppercase leading-none mb-1">المطلوب تحصيله كاش للمندوب:</p>
                <p className="text-xl font-black font-mono tracking-tight leading-none">
                  {(o.totalPrice - (o.depositAmount || 0)).toFixed(0)} EGP
                </p>
                {Boolean(o.depositAmount && o.depositAmount > 0) && (
                  <p className="text-[9px] font-bold mt-1 text-zinc-700">(تم سداد ${o.depositAmount} ج.م ديبوزيت مسبقاً)</p>
                )}
              </>
            ) : (
              <>
                <p className="text-xs font-black uppercase text-black leading-none mb-0.5">مدفوع مسبقاً بالكامل (خالص)</p>
                <p className="text-[9px] font-bold text-zinc-800 leading-tight">ممنوع تحصيل أي مبالغ من العميل</p>
              </>
            )}
          </div>

          {/* Thermal Footer */}
          <div className="text-center pt-1 text-[9px] space-y-1 text-zinc-800">
            <p className="font-bold">* حق المعاينة مكفول قبل السداد *</p>
            <p>الاسترجاع 14 يوم بحالة العبوة الأصلية</p>
            <p className="font-bold font-display uppercase tracking-widest text-black pt-1">شكراً لتسوقكم من XPOWER</p>
            
            {/* Mini Barcode */}
            <div className="flex justify-center items-center gap-0.5 h-6 pt-1">
              {orderId.split('').map((c, i) => (
                <span 
                  key={i} 
                  className="bg-black inline-block h-full" 
                  style={{ width: (c.charCodeAt(0) % 2) + 1, marginRight: 1 }} 
                />
              ))}
            </div>
            <span className="font-mono text-[8px] font-bold block">*{orderId}*</span>
          </div>

        </div>

      </div>
    </>
  );
}

export default function AdminOrderDetailPage() {
  return (
    <Suspense fallback={
      <div className="h-96 flex items-center justify-center">
        <Spinner className="w-10 h-10 text-accent-red" />
      </div>
    }>
      <OrderDetailContent />
    </Suspense>
  );
}
