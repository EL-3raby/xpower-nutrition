'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getOrderById, updateOrderStatus, markOrderAsRead, updateOrderPaymentStatus } from '@/lib/firebase/orders';
import { getProductById } from '@/lib/firebase/products';
import { Order } from '@/lib/types';
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
      setSuccessMsg('تم تحديث حالة الطلب بنجاح!');
      // Update local state
      if (order) {
        setOrder({
          ...order,
          status: newStatus
        });
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
        <Link href="/admin/orders" className="text-text-muted hover:text-white font-product-title text-sm underline">العودة للأوردرات</Link>
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
            <Link href="/admin/orders" className="text-xs text-text-muted hover:text-white transition-colors flex items-center gap-1">
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

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => window.print()}
            className="flex-1 sm:flex-none bg-accent-red hover:bg-accent-red/90 text-white font-product-title font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-accent-red/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">print</span>
            <span>طباعة الفاتورة</span>
          </button>
          <Link 
            href="/admin/orders" 
            className="flex-1 sm:flex-none text-center text-text-muted hover:text-white font-product-title text-xs sm:text-sm border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-xl transition-colors font-bold"
          >
            العودة للطلبات
          </Link>
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
                    <p className="text-xs text-amber-400 text-right font-body">لم يتم إرفاق إثبات دفع لهذه المعاملة.</p>
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

      {/* Printable Invoice (Only visible when printing) */}
      <style type="text/css" media="print">
        {`
          @page { size: A4; margin: 0; }
          body { 
            margin: 0; 
            padding: 0;
            background: white !important; 
          }
          .invoice-container {
            width: 210mm;
            min-height: 297mm;
            padding: 15mm;
            margin: 0 auto;
            box-sizing: border-box;
            background: white;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
        `}
      </style>
      <div className="hidden print:flex justify-center text-black bg-white w-full h-full absolute top-0 left-0 right-0 z-[99999]" dir="rtl">
        <div className="invoice-container flex flex-col justify-between">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
            <div className="flex flex-col" dir="ltr">
              <h1 className="text-5xl font-black uppercase tracking-widest text-black flex items-center justify-start">
                <span className="italic transform -skew-x-6 pr-1">X</span>
                PO<span className="text-black">W</span>ER
              </h1>
              <p className="bg-black text-white text-[10px] font-black tracking-[0.25em] uppercase px-2 py-1 w-max mt-1 transform -skew-x-6 self-start">
                NUTRITION
              </p>
            </div>
            <div className="text-left flex flex-col items-end">
              <h2 className="text-3xl font-black mb-2 uppercase border-b-4 border-black inline-block pb-1">   فاتورة شحـن</h2>
              <div className="bg-black text-white px-3 py-1.5 font-mono text-lg font-bold mb-1">
                #{orderId}
              </div>
              <p className="text-sm font-bold">تاريخ الطلب: {
                (o.createdAt instanceof Date 
                  ? o.createdAt 
                  : (o.createdAt as any)?.seconds 
                    ? new Date((o.createdAt as any).seconds * 1000) 
                    : new Date()
                ).toLocaleDateString('ar-EG')
              }</p>
            </div>
          </div>

          {/* Customer & Payment Info Split */}
          <div className="grid grid-cols-2 gap-6 border-b-2 border-black pb-6 mb-6">
            
            {/* Customer Details */}
            <div>
              <h3 className="text-lg font-black bg-black text-white inline-block px-3 py-1 mb-3 uppercase">بيانات المستلم</h3>
              <div className="space-y-2 text-lg">
                <p><span className="font-bold">الاسم:</span> {o.customerName}</p>
                <p><span className="font-bold">رقم الهاتف:</span> <span className="font-mono font-bold" dir="ltr">{o.phone}</span></p>
                <p><span className="font-bold">المحافظة/المدينة:</span> {o.city}</p>
                <p><span className="font-bold">العنوان:</span> {o.address}</p>
              </div>
            </div>

            {/* Payment Details */}
            <div className="text-left flex flex-col items-end">
              <h3 className="text-lg font-black bg-black text-white inline-block px-3 py-1 mb-3 uppercase">تفاصيل الدفع</h3>
              <p className="text-lg font-bold mb-2">
                طريقة الدفع: {
                  o.paymentMethod === 'vodafone_cash'
                    ? 'فودافون كاش (مدفوع مسبقاً)'
                    : o.paymentMethod === 'instapay'
                    ? 'انستاباي (مدفوع مسبقاً)'
                    : Boolean(o.depositAmount && o.depositAmount > 0)
                    ? `كاش مع ${shippingCost <= 0 ? 'ديبوزيت تأميني' : 'ديبوزيت شحن'} (${o.depositAmount} ج.م)`
                    : 'كاش عند الاستلام'
                }
              </p>
              {o.paymentMethod === 'cod' ? (
                 <div className="text-center border-4 border-black p-4 mt-2 inline-block">
                   <p className="text-sm font-bold uppercase mb-1">المبلغ المطلوب تحصيله كاش من العميل</p>
                   <p className="text-3xl font-black">{(o.totalPrice - (o.depositAmount || 0)).toFixed(0)} EGP</p>
                   {Boolean(o.depositAmount && o.depositAmount > 0) && (
                     <p className="text-xs font-bold mt-1 text-gray-700">
                       (تم دفع {shippingCost <= 0 ? 'ديبوزيت تأميني' : 'ديبوزيت شحن'} {o.depositAmount} EGP مسبقاً)
                     </p>
                   )}
                 </div>
              ) : (
                 <div className="text-center border-4 border-black p-4 mt-2 inline-block bg-gray-200">
                   <p className="text-sm font-bold uppercase mb-1">حالة الدفع</p>
                   <p className="text-2xl font-black">مدفوع مسبقاً بالكامل (خالص)</p>
                   <p className="text-sm font-bold mt-1">لا يتم تحصيل أي مبالغ من العميل</p>
                 </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6 flex-grow">
            <h3 className="text-base font-black bg-black text-white inline-block px-3 py-1 mb-3 uppercase">المنتجات المطلوبة</h3>
            <table className="w-full text-right border-collapse border-2 border-black">
              <thead>
                <tr className="bg-black text-white text-lg">
                  <th className="p-3 border-2 border-black">اسم المنتج</th>
                  <th className="p-3 border-2 border-black text-center w-24">الكمية</th>
                  <th className="p-3 border-2 border-black text-center w-32">السعر</th>
                </tr>
              </thead>
              <tbody className="text-lg">
                {o.items.map((item, i) => (
                  <tr key={i} className="border-b-2 border-black">
                    <td className="p-3 border-2 border-black font-bold">
                      {item.name}
                      {item.flavor && <div className="text-sm font-normal text-gray-700 mt-1">النكهة: {item.flavor}</div>}
                    </td>
                    <td className="p-3 border-2 border-black text-center font-bold font-mono text-xl">{item.quantity}</td>
                    <td className="p-3 border-2 border-black text-center font-bold font-mono">{item.price * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Invoice Summary */}
          <div className="flex justify-end mb-6">
            <div className="w-2/3 border-2 border-black p-3 space-y-1 text-base font-bold">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="font-mono">{subtotal} EGP</span>
              </div>
              {o.couponCode && (
                <div className="flex justify-between text-gray-700">
                  <span>خصم كوبون ({o.couponCode}):</span>
                  <span className="font-mono">-{discountAmount} EGP</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>الشحن والتوصيل:</span>
                <span className="font-mono">{shippingCost > 0 ? `${shippingCost} EGP` : 'توصيل مجاني'}</span>
              </div>
              <div className="flex justify-between border-t-2 border-black pt-2 mt-1 text-xl font-black">
                <span>الإجمالي الكلي:</span>
                <span className="font-mono">{o.totalPrice} EGP</span>
              </div>
            </div>
          </div>

          {/* Footer Notes */}
          <div className="text-center pt-6 border-t-2 border-black mt-auto">
            <p className="font-black text-xl uppercase tracking-wider mb-1">شكراً لاختياركم XPOWER NUTRITION</p>
            <p className="text-base font-bold text-gray-600">تأكد من مراجعة الطرد قبل الاستلام</p>
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
        <Spinner className="inline-block w-10 h-10 text-accent-red animate-spin" />
      </div>
    }>
      <OrderDetailContent />
    </Suspense>
  );
}
