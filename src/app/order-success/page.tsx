'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, isDummyFirebase } from '@/lib/firebase/client';
import { getOrderById } from '@/lib/firebase/orders';
import { getSiteConfig } from '@/lib/firebase/admin-actions';
import { Order, SiteConfig } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopyOrderId = () => {
    if (orderId) {
      if (navigator?.clipboard) {
        navigator.clipboard.writeText(orderId);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    // Load site config
    async function loadConfig() {
      try {
        const cfg = await getSiteConfig();
        setSettings(cfg);
      } catch (err) {
        console.error('Error loading config on success page:', err);
      }
    }
    loadConfig();

    if (isDummyFirebase) {
      // In dummy mode, query the memory array DEFAULT_ORDERS
      const checkMockOrder = async () => {
        const fetched = await getOrderById(orderId);
        if (fetched) {
          setOrder({ ...fetched });
        }
      };

      checkMockOrder();
      setLoading(false);

      // Poll memory changes every 1 second
      const interval = setInterval(checkMockOrder, 1000);
      return () => clearInterval(interval);
    } else {
      // Live Firestore snapshot subscription
      const docRef = doc(db, 'orders', orderId);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setOrder({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
          } as Order);
        } else {
          setOrder(null);
        }
        setLoading(false);
      }, (err) => {
        console.error('Snapshot listener error:', err);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="bg-[#050505] text-text-primary min-h-screen py-16 px-6 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-accent-red/5 to-transparent pointer-events-none"></div>
        <Spinner className="inline-block w-12 h-12 text-accent-red animate-spin drop-shadow-[0_0_10px_rgba(227,30,36,0.5)]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-[#050505] text-text-primary min-h-screen py-16 px-6 flex flex-col items-center justify-center text-center relative overflow-hidden" dir="rtl">
        <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-accent-red/5 to-transparent pointer-events-none"></div>
        <div className="bg-black/60 border border-white/5 p-8 max-w-md shadow-2xl relative">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-red to-transparent opacity-50"></div>
          <span className="material-symbols-outlined text-6xl text-text-muted/30 mb-4 inline-block">search_off</span>
          <h2 className="font-display font-black text-2xl text-white mb-3">الطلب مش موجود</h2>
          <p className="font-body text-sm text-text-muted mb-8 leading-relaxed">معلش، مقدرناش نلاقي تفاصيل الطلب ده. اتأكد من الرابط أو كلم خدمة العملاء.</p>
          <Link href="/products" className="bg-accent-red text-white px-8 py-3.5 btn-diagonal flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(227,30,36,0.3)] hover:scale-105 transition-all">
            <span className="material-symbols-outlined text-lg">shopping_bag</span>
            شوف المنتجات
          </Link>
        </div>
      </div>
    );
  }

  // Format phone number to international code (Egypt: 20)
  const rawWhatsapp = settings?.contactInfo?.whatsapp || '01012345678';
  const shopWhatsapp = rawWhatsapp.startsWith('0') ? `2${rawWhatsapp}` : rawWhatsapp;

  const isVodafone = order.paymentMethod === 'vodafone_cash';
  const isInstapay = order.paymentMethod === 'instapay';
  const isCodDeposit = order.paymentMethod === 'cod' && (order.depositAmount ?? 0) > 0;
  const remainingCash = Math.max(0, order.totalPrice - (order.depositAmount || 0));
  const orderSubtotal = order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
  const isFreeShippingOrder = Math.max(0, order.totalPrice - (orderSubtotal - (order.discountAmount || 0))) === 0;
  const codDepositLabel = isFreeShippingOrder ? 'الديبوزيت التأميني' : 'ديبوزيت الشحن';

  // Construct a professional, natural, beautifully-spaced RTL message for WhatsApp confirmation
  let paymentDetailsText = '';
  if (isCodDeposit) {
    const depositMethod = order.depositPaymentMethod === 'instapay' ? 'انستاباي' : 'فودافون كاش';
    const senderInfo = order.depositSenderInfo ? ` (من: ${order.depositSenderInfo})` : '';
    paymentDetailsText = `\u200Fتفاصيل الدفع:\n\u200F- تم سداد ${codDepositLabel}: ${order.depositAmount} جنيه عبر ${depositMethod}${senderInfo}\n\u200F- المتبقي كاش للمندوب عند الاستلام: ${remainingCash.toFixed(0)} جنيه\n\u200F- إجمالي قيمة الطلب: ${order.totalPrice} جنيه`;
  } else if (isVodafone) {
    const senderNum = order.vodafoneCashNumber ? `\n\u200F- محفظة التحويل: ${order.vodafoneCashNumber}` : '';
    paymentDetailsText = `\u200Fتفاصيل الدفع:\n\u200F- طريقة الدفع: فودافون كاش (دفع كامل)\n\u200F- إجمالي المبلغ المسدد: ${order.totalPrice} جنيه${senderNum}`;
  } else if (isInstapay) {
    const senderHandle = order.instapayHandle ? `\n\u200F- حساب انستاباي المحول منه: ${order.instapayHandle}` : '';
    paymentDetailsText = `\u200Fتفاصيل الدفع:\n\u200F- طريقة الدفع: انستاباي (دفع كامل)\n\u200F- إجمالي المبلغ المسدد: ${order.totalPrice} جنيه${senderHandle}`;
  } else {
    paymentDetailsText = `\u200Fتفاصيل الدفع:\n\u200F- طريقة الدفع: الدفع كاش عند الاستلام بالكامل\n\u200F- إجمالي المبلغ المطلوب عند الاستلام: ${order.totalPrice} جنيه`;
  }

  const itemsList = order.items && order.items.length > 0
    ? `\n\n\u200Fالمنتجات المطلوبة:\n` + order.items.map(item => `\u200F- ${item.name} (${item.quantity}×)`).join('\n')
    : '';

  const shortOrderId = orderId.length > 6 ? orderId.slice(-6) : orderId;

  const whatsappText = `\u200Fالسلام عليكم،\n\u200Fحابب أأكد طلبي من Xpower Nutrition وأتابع تفاصيل الشحن والتسليم.\n\n\u200Fبيانات الطلب:\n\u200F- كود الطلب: (#${shortOrderId})\n\u200F- الاسم: ${order.customerName}\n\u200F- رقم الموبايل: ${order.phone}\n\u200F- عنوان التوصيل: ${order.address}، ${order.city}${itemsList}\n\n${paymentDetailsText}\n\n\u200Fفي انتظار تأكيدكم وبدء التجهيز. شكراً جزيلاً!`;
  const whatsappUrl = `https://wa.me/${shopWhatsapp}?text=${encodeURIComponent(whatsappText)}`;

  return (
    <div className="bg-[#050505] text-text-primary min-h-screen py-10 md:py-16 px-4 sm:px-6 flex flex-col items-center justify-center relative overflow-hidden" dir="rtl">
      {/* Ambient background light */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none"></div>

      <div className="w-full max-w-2xl bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 p-5 sm:p-8 md:p-12 flex flex-col items-center text-center gap-6 sm:gap-8 relative shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-3xl">
        {/* Glowing top border accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50 rounded-t-3xl" />

        {/* Success Animated Badge */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)] relative shrink-0">
          <div className="absolute inset-0 rounded-full border border-emerald-500/40 animate-ping opacity-25"></div>
          <span className="material-symbols-outlined text-emerald-400 text-5xl sm:text-6xl drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]">check_circle</span>
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-4xl font-black text-white italic tracking-wide uppercase">
            تم استلام طلبك بنجاح!
          </h1>
          <p className="font-body text-xs sm:text-sm text-text-muted">
            شكراً لثقتك في <span className="text-white font-bold">Xpower Nutrition</span>. كود الطلب الخاص بك هو:
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleCopyOrderId}
              className="inline-flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 font-mono text-lg sm:text-2xl font-black px-5 py-2 rounded-full tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all cursor-pointer group"
              title="اضغط لنسخ كود الطلب"
            >
              <span>#{orderId}</span>
              <span className="material-symbols-outlined text-base sm:text-lg text-emerald-400 group-hover:scale-110 transition-transform">
                {copied ? 'check_circle' : 'content_copy'}
              </span>
              {copied && (
                <span className="text-[11px] bg-emerald-500 text-black font-bold font-body px-2 py-0.5 rounded-full animate-in fade-in zoom-in duration-200">
                  تم النسخ!
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Payment & Status Notice Cards */}
        <div className="w-full text-right">
          {order.paymentMethod === 'cod' && !isCodDeposit ? (
            <div className="bg-gradient-to-r from-emerald-950/40 via-[#0d0d0d] to-[#0d0d0d] border border-emerald-500/30 p-4 sm:p-5 rounded-2xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bottom-0 w-1 bg-emerald-500"></div>
              <h3 className="font-product-title font-bold text-white text-base sm:text-lg mb-1.5 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-2xl">local_shipping</span>
                <span>طلبك قيد التجهيز الآن!</span>
              </h3>
              <p className="font-body text-xs sm:text-sm text-text-muted leading-relaxed">
                سيقوم مندوب الشحن بالتواصل معك هاتفياً لتسليم الشحنة، والدفع سيكون كاش بالكامل عند الاستلام.
              </p>
            </div>
          ) : (
            <>
              {order.paymentStatus === 'pending_review' && (
                <div className="bg-gradient-to-r from-amber-950/40 via-[#0d0d0d] to-[#0d0d0d] border border-amber-500/30 p-4 sm:p-5 rounded-2xl shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 bottom-0 w-1 bg-amber-500"></div>
                  <h3 className="font-product-title font-bold text-white text-base sm:text-lg mb-1.5 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-2xl animate-spin-slow">sync</span>
                    <span>
                      {isCodDeposit
                        ? (isFreeShippingOrder ? 'مراجعة إيصال الديبوزيت التأميني' : 'مراجعة إيصال ديبوزيت التوصيل')
                        : 'مراجعة إثبات التحويل'}
                    </span>
                  </h3>
                  <p className="font-body text-xs sm:text-sm text-text-muted leading-relaxed">
                    {isCodDeposit
                      ? `نقوم الآن بمراجعة إيصال تحويل ${codDepositLabel} (${order.depositAmount} جنيه). وسيتم تأكيد الطلب فور مطابقة البيانات، على أن يتم تحصيل باقي المبلغ (${remainingCash.toFixed(0)} جنيه) كاش عند الاستلام.`
                      : isInstapay
                      ? 'نقوم الآن بمراجعة صورة تحويل انستاباي. وسيتم تأكيد الطلب والبدء في شحنه فور مطابقة المعاملة.'
                      : 'نقوم الآن بمراجعة صورة تحويل فودافون كاش. وسيتم تأكيد الطلب والبدء في شحنه فور مطابقة المعاملة.'}
                  </p>
                </div>
              )}

              {order.paymentStatus === 'confirmed' && (
                <div className="bg-gradient-to-r from-emerald-950/40 via-[#0d0d0d] to-[#0d0d0d] border border-emerald-500/30 p-4 sm:p-5 rounded-2xl shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 bottom-0 w-1 bg-emerald-500"></div>
                  <h3 className="font-product-title font-bold text-white text-base sm:text-lg mb-1.5 flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-2xl">verified</span>
                    <span>تم تأكيد الدفع والطلب بنجاح</span>
                  </h3>
                  <p className="font-body text-xs sm:text-sm text-text-muted leading-relaxed">
                    {isCodDeposit
                      ? `تم تأكيد استلام ديبوزيت الشحن بنجاح، وجاري تجهيز الشحنة. باقي المبلغ (${remainingCash.toFixed(0)} جنيه) سيتم سداده كاش للمندوب عند الاستلام.`
                      : 'تمت الموافقة على التحويل بنجاح، وجاري تجهيز الشحنة لتسليمها لشركة الشحن في أقرب وقت.'}
                  </p>
                </div>
              )}

              {order.paymentStatus === 'rejected' && (
                <div className="bg-gradient-to-r from-red-950/40 via-[#0d0d0d] to-[#0d0d0d] border border-accent-red/30 p-4 sm:p-5 rounded-2xl shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 bottom-0 w-1 bg-accent-red"></div>
                  <h3 className="font-product-title font-bold text-white text-base sm:text-lg mb-1.5 flex items-center gap-2">
                    <span className="material-symbols-outlined text-accent-red text-2xl">error</span>
                    <span>تعذر تأكيد التحويل</span>
                  </h3>
                  <p className="font-body text-xs sm:text-sm text-text-muted leading-relaxed">
                    لم نتمكن من مطابقة صورة الإيصال المرفقة. يرجى التواصل معنا عبر الواتساب لتوضيح التفاصيل وتأكيد طلبك فوراً.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Receipt Summary Card */}
        <div className="w-full bg-[#050505] border border-white/10 p-4 sm:p-6 text-right flex flex-col gap-3.5 font-body text-xs sm:text-sm text-text-muted rounded-2xl shadow-inner relative overflow-hidden">
          <h3 className="font-product-title text-white font-bold text-base sm:text-lg border-b border-white/10 pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-accent-red text-xl">receipt_long</span>
              <span>تفاصيل الفاتورة</span>
            </span>
            <button
              type="button"
              onClick={handleCopyOrderId}
              className="text-[11px] text-text-muted hover:text-emerald-400 font-mono flex items-center gap-1 transition-colors cursor-pointer"
              title="انقر لنسخ الكود الكامل"
            >
              <span>ID: #{orderId.slice(-6)}</span>
              <span className="material-symbols-outlined text-xs">
                {copied ? 'check' : 'content_copy'}
              </span>
            </button>
          </h3>

          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-text-muted">الاسم:</span>
            <span className="text-white font-bold">{order.customerName}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-text-muted">رقم الموبايل:</span>
            <span className="text-white font-bold font-mono dir-ltr">{order.phone}</span>
          </div>

          <div className="flex justify-between items-start py-1 border-b border-white/5 gap-3">
            <span className="text-text-muted shrink-0">عنوان التوصيل:</span>
            <span className="text-white font-bold text-left leading-relaxed">{order.address}، {order.city}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-text-muted">طريقة الدفع:</span>
            <span className="text-white font-bold bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-xs inline-flex items-center gap-1.5">
              {isVodafone ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full bg-white p-0.5 inline-flex items-center justify-center shrink-0">
                    <img src="/images/vodafone.png" alt="Vodafone" className="w-full h-full object-contain" />
                  </div>
                  <span>فودافون كاش (دفع كامل)</span>
                </>
              ) : isInstapay ? (
                <>
                  <div className="w-3.5 h-3.5 rounded bg-white p-0.5 inline-flex items-center justify-center shrink-0">
                    <img src="/images/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                  </div>
                  <span>انستاباي — InstaPay (دفع كامل)</span>
                </>
              ) : isCodDeposit ? (
                <span>كاش عند الاستلام (مع ديبوزيت شحن)</span>
              ) : (
                <span>الدفع كاش عند الاستلام</span>
              )}
            </span>
          </div>

          {isVodafone && order.vodafoneCashNumber && (
            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-rose-400">محفظة التحويل:</span>
              <span className="text-rose-300 font-mono font-bold bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg text-xs dir-ltr">
                {order.vodafoneCashNumber}
              </span>
            </div>
          )}

          {isInstapay && order.instapayHandle && (
            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-purple-400">حساب انستاباي المحول منه:</span>
              <span className="text-purple-300 font-mono font-bold bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg text-xs dir-ltr">
                {order.instapayHandle}
              </span>
            </div>
          )}

          {isCodDeposit && (
            <>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-amber-400">ديبوزيت الشحن المسدد:</span>
                <span className="text-amber-300 font-mono font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg text-xs dir-ltr">
                  {order.depositAmount} EGP عبر {order.depositPaymentMethod === 'instapay' ? 'انستاباي' : 'فودافون كاش'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-emerald-400 font-bold">المتبقي كاش للمندوب:</span>
                <span className="text-emerald-300 font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-xs dir-ltr">
                  {remainingCash.toFixed(0)} EGP
                </span>
              </div>
            </>
          )}

          <div className="flex justify-between items-center text-white pt-3 mt-1">
            <span className="font-product-title font-bold text-base sm:text-lg">المبلغ الإجمالي النهائي:</span>
            <span className="font-product-title text-emerald-400 text-2xl sm:text-3xl font-black font-mono drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]" dir="ltr">
              {order.totalPrice} EGP
            </span>
          </div>
        </div>

        {/* Action Buttons Stack */}
        <div className="w-full flex flex-col gap-3 pt-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gradient-to-r from-[#25D366] to-emerald-600 hover:from-emerald-600 hover:to-[#25D366] text-white font-product-title font-bold py-3.5 sm:py-4 px-6 rounded-xl flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(37,211,102,0.35)] active:scale-95 transition-all text-sm sm:text-base"
          >
            <svg className="w-5 h-5 fill-current drop-shadow" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.09-3.969l.325.193c1.614.959 3.477 1.464 5.378 1.465 5.867 0 10.641-4.757 10.644-10.627.002-2.844-1.1-5.516-3.104-7.52C17.387 1.54 14.72 1.43 11.879 1.43c-5.872 0-10.647 4.757-10.65 10.628 0 2.01.528 3.974 1.53 5.73l.21.365-1.01 3.682 3.778-.992zM17.15 13.9c-.279-.14-1.654-.816-1.91-.909-.255-.094-.44-.14-.625.14-.184.28-.71.909-.87 1.096-.159.186-.32.21-.599.07-.279-.14-1.18-.435-2.247-1.387-.83-.74-1.39-1.653-1.553-1.933-.163-.28-.018-.43.122-.569.126-.125.279-.327.42-.49.14-.163.187-.28.279-.465.093-.186.047-.35-.024-.49-.07-.14-.625-1.507-.856-2.066-.225-.544-.45-.47-.625-.479-.16-.008-.34-.01-.52-.01-.18 0-.475.067-.723.34-.247.272-.945.923-.945 2.25 0 1.327.966 2.607 1.1 2.785.135.178 1.9 2.9 4.602 4.069.642.278 1.144.444 1.534.568.646.206 1.233.177 1.698.108.518-.077 1.654-.676 1.888-1.332.235-.656.235-1.22.165-1.332-.07-.11-.256-.2-.536-.34z" />
            </svg>
            <span>تأكيد المتابعة عبر الواتساب</span>
          </a>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/products"
              className="w-full border border-white/10 hover:border-accent-red/50 bg-white/5 hover:bg-accent-red/10 text-white font-product-title font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 text-xs sm:text-sm"
            >
              <span className="material-symbols-outlined text-lg text-accent-red">shopping_bag</span>
              <span>متابعة التسوق</span>
            </Link>

            <Link
              href={`/track-order?id=${orderId}`}
              className="w-full border border-white/10 hover:border-white/20 text-white bg-black hover:bg-white/5 font-product-title font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 text-xs sm:text-sm"
            >
              <span className="material-symbols-outlined text-lg text-emerald-400">local_shipping</span>
              <span>تتبع الشحنة الآن</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="bg-[#050505] text-text-primary min-h-screen py-16 px-6 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-accent-red/5 to-transparent pointer-events-none"></div>
        <Spinner className="inline-block w-12 h-12 text-accent-red animate-spin drop-shadow-[0_0_10px_rgba(227,30,36,0.5)]" />
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}
