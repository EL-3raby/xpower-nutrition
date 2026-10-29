'use client';

import React, { useState, useEffect } from 'react';
import { getSiteConfig } from '@/lib/firebase/admin-actions';
import { SiteConfig } from '@/lib/types';
import Link from 'next/link';
import Spinner from '@/components/ui/Spinner';

export default function ShippingPolicyClientPage() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPolicyData() {
      try {
        const cfg = await getSiteConfig();
        setConfig(cfg);
      } catch (err) {
        console.error('Error loading shipping policy data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPolicyData();
  }, []);

  if (loading) {
    return (
      <div className="bg-[#050505] text-text-primary min-h-screen py-16 px-6 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-accent-red/5 to-transparent pointer-events-none"></div>
        <Spinner className="inline-block w-12 h-12 text-accent-red animate-spin drop-shadow-[0_0_10px_rgba(227,30,36,0.5)]" />
      </div>
    );
  }

  const freeShipping = config?.freeShipping;
  const isFreeShippingEnabled = freeShipping?.isEnabled ?? true;
  const freeShippingThreshold = freeShipping?.thresholdAmount ?? 1000;
  const whatsappNumber = config?.contactInfo?.whatsapp || '01012345678';
  const cleanWhatsapp = whatsappNumber.replace(/[^0-9]/g, '');

  const isCodEnabled = config?.paymentMethodsEnabled?.cod ?? false;
  const isVodafoneCashEnabled = config?.paymentMethodsEnabled?.vodafoneCash ?? true;
  const isInstapayEnabled = config?.paymentMethodsEnabled?.instapay ?? true;
  const enabledCount = (isCodEnabled ? 1 : 0) + (isVodafoneCashEnabled ? 1 : 0) + (isInstapayEnabled ? 1 : 0);

  return (
    <div className="bg-[#050505] text-text-primary min-h-screen py-10 sm:py-16 md:py-20 px-4 sm:px-6 relative overflow-hidden" dir="rtl">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent-red/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-accent-red/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 space-y-8 sm:space-y-10 text-right">
        
        {/* Page Header */}
        <div className="space-y-3.5 border-b border-white/10 pb-6 sm:pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs font-product-title font-bold">
            <span className="material-symbols-outlined text-[16px]">local_shipping</span>
            <span>توصيل سريع ومضمون لكافة محافظات مصر</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-wide">
            سياسة ومصاريف الشحن والتوصيل
          </h1>
          <p className="font-body text-text-muted text-xs sm:text-sm md:text-base leading-relaxed">
            في <strong className="text-white">Xpower Nutrition</strong> نضمن لك وصول مكملاتك الغذائية الأصلية 100% بأعلى معايير الحماية والتخزين، مع الشفافية الكاملة في مصاريف الشحن، وحق المعاينة قبل الدفع.
          </p>
        </div>

        {/* Dynamic Free Shipping Offer */}
        {isFreeShippingEnabled && freeShippingThreshold > 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-accent-red/30 bg-gradient-to-r from-accent-red/15 via-[#0d0d0d] to-accent-red/5 p-4 sm:p-6 shadow-[0_0_30px_rgba(227,30,36,0.12)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-accent-red/20 border border-accent-red/30 flex items-center justify-center shrink-0 text-accent-red shadow-inner">
                  <span className="material-symbols-outlined text-2xl">redeem</span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-product-title text-base sm:text-lg font-bold text-white">عرض الشحن المجاني</span>
                    <span className="text-[10px] bg-accent-red text-white px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">Free Delivery</span>
                  </div>
                  <p className="text-text-muted text-xs sm:text-sm font-body">
                    اطلب الآن بقيمة <strong className="text-white font-mono">{freeShippingThreshold} جنيه</strong> أو أكثر واحصل على <strong className="text-accent-red font-bold">شحن مجاني بالكامل</strong> لأي مكان في مصر.
                  </p>
                </div>
              </div>
              <Link
                href="/products"
                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-accent-red hover:bg-accent-red/90 text-white text-xs font-bold font-product-title transition-all active:scale-95 shadow-md shadow-accent-red/20"
              >
                <span>تسوق الآن</span>
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </Link>
            </div>
          </div>
        )}

        {/* Section 1: Payment Methods & Shipping Deposit Policy */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-accent-red rounded-full"></span>
            <h2 className="font-product-title text-lg sm:text-xl font-bold text-white">
              {isCodEnabled ? 'طرق الدفع ونظام ديبوزيت الشحن' : 'طرق الدفع المتاحة'}
            </h2>
          </div>

          <div className={`grid grid-cols-1 ${
            enabledCount === 1 ? 'md:grid-cols-1 max-w-md mx-auto' :
            enabledCount === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
          } gap-4`}>
            
            {/* Card 1: COD with Deposit */}
            {isCodEnabled && (
              <div className="bg-[#0a0a0a] border border-accent-red/30 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-accent-red transition-all relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-24 h-24 bg-accent-red/5 rounded-full blur-xl pointer-events-none" />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-11 h-11 rounded-xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center text-accent-red">
                      <span className="material-symbols-outlined text-xl">payments</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl">
                      <div className="w-4 h-4 shrink-0">
                        <img src="/images/vodafone.png" alt="Vodafone Cash" className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[10px] text-text-muted font-bold">+</span>
                      <div className="w-4 h-4 shrink-0">
                        <img src="/images/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-product-title font-bold text-white text-sm sm:text-base mb-1">
                      الدفع عند الاستلام (COD)
                    </h3>
                    <span className="text-[11px] text-accent-red font-bold inline-block mb-2">
                      ديبوزيت شحن مسبق + باقي الحساب كاش 
                    </span>
                    <p className="text-text-muted text-xs leading-relaxed font-body">
                      لضمان جدية الطلب، يتم تحويل مبلغ مصاريف الشحن فقط مسبقاً (ديبوزيت)، بينما يتم دفع باقي ثمن المكملات نقداً للمندوب بعد استلام ومعاينة الطرد.
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-text-muted/80 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-accent-red text-sm">security</span>
                  <span>الديبوزيت مسترد بالكامل في حال وجود أي خلل بالمنتج</span>
                </div>
              </div>
            )}

            {/* Card 2: Vodafone Cash Full */}
            {isVodafoneCashEnabled && (
              <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-accent-red/40 transition-all group">
                <div className="space-y-3">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img src="/images/vodafone.png" alt="Vodafone Cash" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-product-title font-bold text-white text-sm sm:text-base">
                        محفظة فودافون كاش
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">
                        Vodafone Cash
                      </span>
                    </div>
                    <span className="text-[11px] text-rose-400 font-bold inline-block mb-2">
                      دفع كامل المبلغ مسبقاً
                    </span>
                    <p className="text-text-muted text-xs leading-relaxed font-body">
                      تحويل إجمالي قيمة الطلب مسبقاً عبر فودافون كاش، مع إمكانية استخدام كود التحويل السريع المباشر أو التطبيق، وتستلم طلبك بدون أي دفعات نقدية للمندوب.
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-text-muted/80 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-rose-500 text-sm">phone_iphone</span>
                  <span>كود تحويل مباشر بنقرة واحدة عند إتمام الطلب</span>
                </div>
              </div>
            )}

            {/* Card 3: InstaPay Full */}
            {isInstapayEnabled && (
              <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-accent-red/40 transition-all group">
                <div className="space-y-3">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img src="/images/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-product-title font-bold text-white text-sm sm:text-base">
                        تطبيق انستاباي (InstaPay)
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/20">
                        InstaPay IPN
                      </span>
                    </div>
                    <span className="text-[11px] text-purple-400 font-bold inline-block mb-2">
                      تحويل بنكي لحظي مباشر
                    </span>
                    <p className="text-text-muted text-xs leading-relaxed font-body">
                      تحويل فوري عبر شبكة المدفوعات اللحظية (IPN) برابط الدفع المباشر من التطبيق، لمعاملة آمنة ولحظية بدون أي رسوم تحويل إضافية.
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-text-muted/80 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-purple-400 text-sm">bolt</span>
                  <span>تحويل فوري معتمد من البنك المركزي المصري</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Section 2: Regional Shipping Rates & Delivery Time */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-accent-red rounded-full"></span>
            <h2 className="font-product-title text-lg sm:text-xl font-bold text-white">
              تكلفة الشحن ومواعيد التوصيل حسب المحافظة
            </h2>
          </div>

          {/* Regional Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Region 1: Lower Egypt & Capital */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-accent-red/30 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-product-title font-bold text-white text-sm sm:text-base">القاهرة الكبرى، وجه بحري ومدن القناة</span>
                  <span className="font-mono font-black text-accent-red text-base bg-accent-red/10 px-2.5 py-0.5 rounded-lg border border-accent-red/20">
                    100 ج.م
                  </span>
                </div>
                <p className="text-text-muted text-xs leading-relaxed font-body">
                  القاهرة، الجيزة، الإسكندرية، القليوبية، الغربية، الدقهلية، الشرقية، المنوفية، البحيرة، كفر الشيخ، دمياط، بورسعيد، الإسماعيلية، السويس، ومطروح.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-text-muted text-[11px] mt-4 pt-3 border-t border-white/5">
                <span className="material-symbols-outlined text-sm text-accent-red">schedule</span>
                <span>مدة التوصيل: <strong className="text-white font-mono">24 - 48 ساعة</strong></span>
              </div>
            </div>

            {/* Region 2: Upper Egypt & Frontiers */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-accent-red/30 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-product-title font-bold text-white text-sm sm:text-base">محافظات الصعيد والمحافظات الحدودية</span>
                  <span className="font-mono font-black text-accent-red text-base bg-accent-red/10 px-2.5 py-0.5 rounded-lg border border-accent-red/20">
                    120 ج.م
                  </span>
                </div>
                <p className="text-text-muted text-xs leading-relaxed font-body">
                  الفيوم، بني سويف، المنيا، أسيوط، سوهاج، قنا، الأقصر، أسوان، البحر الأحمر، الوادي الجديد، شمال سيناء، وجنوب سيناء.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-text-muted text-[11px] mt-4 pt-3 border-t border-white/5">
                <span className="material-symbols-outlined text-sm text-accent-red">schedule</span>
                <span>مدة التوصيل: <strong className="text-white font-mono">2 - 3 أيام عمل</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Guarantees & Inspection Rights */}
        <div className="bg-gradient-to-br from-[#0c0c0c] to-[#080808] border border-white/10 rounded-2xl p-5 sm:p-7 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-accent-red/15 border border-accent-red/30 flex items-center justify-center text-accent-red shrink-0">
              <span className="material-symbols-outlined text-xl">verified_user</span>
            </div>
            <div>
              <h3 className="font-product-title text-base sm:text-lg font-bold text-white">
                {isCodEnabled ? 'حق المعاينة والفحص الكامل قبل الدفع' : 'حق المعاينة والفحص الكامل عند الاستلام'}
              </h3>
              <p className="text-text-muted text-xs">ثقتك هي أولويتنا في Xpower Nutrition</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                <span className="material-symbols-outlined text-accent-red text-base">package_2</span>
                <span>فحص الطرد خارجياً وداخلياً</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed font-body">
                من حقك فتح الكرتونة أمام مندوب الشحن والتأكد من تطابق المكمل المطلوب ونكهته وحجمه.
              </p>
            </div>

            <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                <span className="material-symbols-outlined text-accent-red text-base">qr_code_scanner</span>
                <span>التحقق من الكود والأصالة</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed font-body">
                تأكد من وجود باركود الأصالة، ختم الأمان وسريان تاريخ الصلاحية المدون على العبوة.
              </p>
            </div>

            <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                <span className="material-symbols-outlined text-accent-red text-base">replay</span>
                <span>ضمان استرجاع فوري</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed font-body">
                {isCodEnabled
                  ? 'إذا وجدت أي تلف ناتج عن الشحن أو خطأ، يحق لك رفض الاستلام مع استرداد الديبوزيت فوراً.'
                  : 'إذا وجدت أي تلف ناتج عن الشحن أو خطأ، يحق لك رفض الاستلام مع استرداد كامل المبلغ المدفوع فوراً.'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Important Delivery Notes */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-3">
          <h3 className="font-product-title text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <span className="w-1 h-4 bg-accent-red rounded-full"></span>
            تعليمات هامة لضمان سرعة الاستلام
          </h3>
          <ul className="space-y-2 text-xs text-text-muted font-body leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-accent-red text-sm mt-0.5 shrink-0">check_circle</span>
              <span>يرجى التأكد من كتابة رقم هاتف متاح ومسجل على واتساب حتى يتمكن المندوب من التواصل وتأكيد اللوكيشن بدقة.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-accent-red text-sm mt-0.5 shrink-0">check_circle</span>
              <span>تصلك رسالة تأكيد ومتابعة عبر واتساب فور شحن طلبك وتحديد موعد التسليم المتوقع.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-accent-red text-sm mt-0.5 shrink-0">check_circle</span>
              <span>في حال رغبتك في تعديل العنوان أو تأجيل موعد الاستلام، يرجى إبلاغنا أو التنسيق مع المندوب قبل موعد خروج الشحنة.</span>
            </li>
          </ul>
        </div>

        {/* Actions & Contact CTA */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            href="/products"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-accent-red to-red-600 hover:from-red-600 hover:to-accent-red text-white font-product-title font-bold text-xs sm:text-sm px-8 py-3.5 rounded-full shadow-[0_0_20px_rgba(227,30,36,0.3)] hover:scale-105 active:scale-95 transition-all"
          >
            <span>تسوق المكملات الآن</span>
            <span className="material-symbols-outlined text-base">arrow_back</span>
          </Link>

          <a
            href={`https://wa.me/2${cleanWhatsapp}?text=${encodeURIComponent('مرحباً، لدي استفسار بخصوص سياسة ومصاريف الشحن في Xpower')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-product-title font-bold text-xs sm:text-sm px-6 py-3.5 rounded-full border border-white/10 hover:border-white/20 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-base text-emerald-400">chat</span>
            <span>استفسار عبر واتساب</span>
          </a>
        </div>

      </div>
    </div>
  );
}
