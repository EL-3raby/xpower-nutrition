'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSiteConfig } from '@/lib/firebase/admin-actions';
import { SiteConfig } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';

export default function TermsClientPage() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const cfg = await getSiteConfig();
        setConfig(cfg);
      } catch (err) {
        console.error('Error loading site config in terms page:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  if (loading) {
    return (
      <div className="bg-[#050505] text-text-primary min-h-screen py-16 px-6 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-accent-red/5 to-transparent pointer-events-none"></div>
        <Spinner className="inline-block w-12 h-12 text-accent-red animate-spin drop-shadow-[0_0_10px_rgba(227,30,36,0.5)]" />
      </div>
    );
  }

  const whatsappNumber = config?.contactInfo?.whatsapp || '01012345678';
  const cleanWhatsapp = whatsappNumber.replace(/[^0-9]/g, '');

  const isCodEnabled = config?.paymentMethodsEnabled?.cod ?? false;
  const isVodafoneCashEnabled = config?.paymentMethodsEnabled?.vodafoneCash ?? true;
  const isInstapayEnabled = config?.paymentMethodsEnabled?.instapay ?? true;
  const enabledCount = (isCodEnabled ? 1 : 0) + (isVodafoneCashEnabled ? 1 : 0) + (isInstapayEnabled ? 1 : 0);

  return (
    <div className="bg-[#050505] text-text-primary min-h-screen py-10 sm:py-16 md:py-20 px-4 sm:px-6 relative overflow-hidden" dir="rtl">
      {/* Ambient background lights */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent-red/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-accent-red/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 space-y-8 sm:space-y-10 text-right">
        
        {/* Page Header */}
        <div className="space-y-3.5 border-b border-white/10 pb-6 sm:pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs font-product-title font-bold">
            <span className="material-symbols-outlined text-[16px]">gavel</span>
            <span>اتفاقية الاستخدام والتعامل التجاري</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-wide">
            الشروط والأحكام
          </h1>
          <p className="font-body text-text-muted text-xs sm:text-sm md:text-base leading-relaxed">
            مرحباً بك في متجر <strong className="text-white">Xpower Nutrition</strong>. تحكم هذه الشروط والأحكام كافة المعاملات وعمليات الشراء وطلب المنتجات عبر موقعنا الإلكتروني، وتهدف لضمان تجربة تسوق آمنة، عادلة، وشفافة لجميع عملائنا.
          </p>
        </div>

        {/* Section 1: Store Usage & Eligibility */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-accent-red rounded-full shrink-0"></span>
            <h2 className="font-product-title text-base sm:text-lg font-bold text-white">
              1. شروط الاستخدام وأهلية الطلب
            </h2>
          </div>
          <p className="font-body text-xs sm:text-sm text-text-muted leading-relaxed">
            باستخدامك للمتجر وتقديم أي طلب، فإنك تقر بأنك تبلغ من العمر 18 عاماً على الأقل، أو تستخدم الموقع تحت إشراف ولي الأمر. كما يلتزم العميل بتقديم بيانات اتصال صحيحة ودقيقة بالكامل (الاسم الثلاثي، رقم هاتف مصري نشط يستقبل المكالمات والرسائل، والعنوان التفصيلي مع ذكر المحافظة والمدينة) لضمان سرعة معالجة الطلب والتسليم بدون تأخير.
          </p>
        </div>

        {/* Section 2: Payment Methods & Shipping Deposit Policy */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-accent-red rounded-full shrink-0"></span>
            <h2 className="font-product-title text-base sm:text-lg font-bold text-white">
              {isCodEnabled ? '2. طرق الدفع ونظام ديبوزيت الشحن' : '2. طرق الدفع المتاحة'}
            </h2>
          </div>
          <p className="font-body text-xs sm:text-sm text-text-muted leading-relaxed">
            نوفر في Xpower Nutrition وسائل دفع متعددة ومرنة لتناسب احتياجاتكم مع حماية تامة لجميع المعاملات:
          </p>
          
          <div className={`grid grid-cols-1 ${
            enabledCount === 1 ? 'sm:grid-cols-1 max-w-md mx-auto' :
            enabledCount === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'
          } gap-3 pt-1`}>
            {isCodEnabled && (
              <div className="bg-black/50 border border-white/5 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-accent-red font-bold text-xs font-product-title">
                  <span className="material-symbols-outlined text-sm">payments</span>
                  <span>الدفع عند الاستلام (COD)</span>
                </div>
                <p className="text-[11px] sm:text-xs text-text-muted font-body leading-relaxed">
                  يتم سداد مصاريف الشحن مسبقاً كديبوزيت جدية عبر فودافون كاش أو انستاباي لتأكيد الطلب، بينما يتم سداد قيمة المنتجات بالكامل كاش للمندوب عند الاستلام بعد المعاينة.
                </p>
              </div>
            )}

            {isVodafoneCashEnabled && (
              <div className="bg-black/50 border border-white/5 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs font-product-title">
                  <div className="w-3.5 h-3.5 shrink-0">
                    <img src="/images/vodafone.png" alt="Vodafone" className="w-full h-full object-contain" />
                  </div>
                  <span>فودافون كاش (دفع كامل)</span>
                </div>
                <p className="text-[11px] sm:text-xs text-text-muted font-body leading-relaxed">
                  تحويل إجمالي قيمة الطلب مسبقاً لرقم المحفظة المعلن وإرفاق صورة الإيصال أو رقم التحويل في صفحة إتمام الطلب لتأكيد الشحن فوراً.
                </p>
              </div>
            )}

            {isInstapayEnabled && (
              <div className="bg-black/50 border border-white/5 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs font-product-title">
                  <div className="w-3.5 h-3.5 shrink-0">
                    <img src="/images/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                  </div>
                  <span>انستاباي — InstaPay (دفع كامل)</span>
                </div>
                <p className="text-[11px] sm:text-xs text-text-muted font-body leading-relaxed">
                  تحويل إجمالي الفاتورة لحظياً عبر تطبيق InstaPay للحساب أو العنوان المعتمد للمتجر، وإرفاق إثبات التحويل لمطابقته آلياً.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Pricing, Coupons & Free Shipping */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-accent-red rounded-full shrink-0"></span>
            <h2 className="font-product-title text-base sm:text-lg font-bold text-white">
              3. الأسعار، العروض، وكوبونات الخصم
            </h2>
          </div>
          <ul className="space-y-2 font-body text-xs sm:text-sm text-text-muted leading-relaxed list-disc list-inside">
            <li>جميع الأسعار المعروضة على المتجر محددة بالجنيه المصري (EGP) وتتضمن الخصومات المعلنة.</li>
            <li>يتم تطبيق كوبونات الخصم الترويجية في صفحة الشراء قبل إتمام الطلب، ولا يمكن دمج أكثر من كوبون في نفس المعاملة إلا إذا نص العرض صراحة على ذلك.</li>
            <li>في حال تفعيل عرض الشحن المجاني للطلبات التي تتجاوز حداً مالياً معيناً، يُعفى العميل تلقائياً من مصاريف التوصيل بالكامل لجميع محافظات مصر.</li>
          </ul>
        </div>

        {/* Section 4: Product Authenticity & Verification */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-accent-red rounded-full shrink-0"></span>
            <h2 className="font-product-title text-base sm:text-lg font-bold text-white">
              4. ضمان الأصالة 100% وأكواد التحقق
            </h2>
          </div>
          <p className="font-body text-xs sm:text-sm text-text-muted leading-relaxed">
            نلتزم بأن تكون كافة المكملات والمنتجات المعروضة في Xpower Nutrition أصلية 100% ومصنعة وفقاً لأعلى معايير الجودة وسلامة الغذاء. يحتوي كل منتج أصلي على باركود رسمي وكود تحقق حصري (Authenticity Code) أسفل طبقة الكشط الآمنة، ويمكن للعميل التحقق من صحة وصلاحية المنتج عبر صفحة التحقق الرسمية في الموقع.
          </p>
        </div>

        {/* Section 5: Inspection upon Delivery */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-accent-red rounded-full shrink-0"></span>
            <h2 className="font-product-title text-base sm:text-lg font-bold text-white">
              5. حق المعاينة عند الاستلام
            </h2>
          </div>
          <p className="font-body text-xs sm:text-sm text-text-muted leading-relaxed">
            {isCodEnabled
              ? 'انطلاقاً من ثقتنا المطلقة في جودة وأصالة منتجاتنا، يمنح المتجر عملاءه كامل الحق في فتح الطرد الخارجي ومعاينة العبوات والتأكد من مطابقة المنتجات، النكهات، وتواريخ الصلاحية بحضور مندوب شركة الشحن قبل سداد المبلغ المتبقي، دون أي شروط مجحفة.'
              : 'انطلاقاً من ثقتنا المطلقة في جودة وأصالة منتجاتنا، يمنح المتجر عملاءه كامل الحق في فتح الطرد الخارجي ومعاينة العبوات والتأكد من مطابقة المنتجات، النكهات، وتواريخ الصلاحية بحضور مندوب شركة الشحن عند الاستلام، دون أي شروط مجحفة.'}
          </p>
        </div>

        {/* Section 6: Order Cancellation & Policy Updates */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-accent-red rounded-full shrink-0"></span>
            <h2 className="font-product-title text-base sm:text-lg font-bold text-white">
              6. إلغاء الطلبات وتحديث الشروط
            </h2>
          </div>
          <p className="font-body text-xs sm:text-sm text-text-muted leading-relaxed">
            يحتفظ المتجر بحق رفض أو تعليق أي طلب شراء في حال تعذر التواصل مع العميل، أو عدم مطابقة إثبات تحويل الدفع، أو ثبوت تكرار إدخال بيانات غير صحيحة. كما يحق لـ Xpower Nutrition تعديل وتطوير هذه الشروط والأحكام مستقبلاً بما يخدم جودة الخدمة وسلامة المعاملات، وتعتبر التحديثات نافذة بمجرد نشرها على الموقع.
          </p>
        </div>

        {/* Contact Card */}
        <div className="bg-gradient-to-r from-accent-red/10 via-[#0d0d0d] to-accent-red/5 border border-accent-red/20 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1 text-center sm:text-right">
            <h3 className="font-product-title text-base font-bold text-white">هل لديك أي استفسار حول الشروط والأحكام؟</h3>
            <p className="font-body text-xs text-text-muted">فريق خدمة العملاء متاح لمساعدتك والإجابة على استفساراتك على مدار الساعة.</p>
          </div>
          <a
            href={`https://wa.me/2${cleanWhatsapp}?text=${encodeURIComponent('السلام عليكم، كان عندي استفسار بخصوص الشروط والأحكام في متجر Xpower Nutrition.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs sm:text-sm font-bold font-product-title shadow-lg shadow-[#25D366]/20 transition-all active:scale-95"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.09-3.969l.325.193c1.614.959 3.477 1.464 5.378 1.465 5.867 0 10.641-4.757 10.644-10.627.002-2.844-1.1-5.516-3.104-7.52C17.387 1.54 14.72 1.43 11.879 1.43c-5.872 0-10.647 4.757-10.65 10.628 0 2.01.528 3.974 1.53 5.73l.21.365-1.01 3.682 3.778-.992zM17.15 13.9c-.279-.14-1.654-.816-1.91-.909-.255-.094-.44-.14-.625.14-.184.28-.71.909-.87 1.096-.159.186-.32.21-.599.07-.279-.14-1.18-.435-2.247-1.387-.83-.74-1.39-1.653-1.553-1.933-.163-.28-.018-.43.122-.569.126-.125.279-.327.42-.49.14-.163.187-.28.279-.465.093-.186.047-.35-.024-.49-.07-.14-.625-1.507-.856-2.066-.225-.544-.45-.47-.625-.479-.16-.008-.34-.01-.52-.01-.18 0-.475.067-.723.34-.247.272-.945.923-.945 2.25 0 1.327.966 2.607 1.1 2.785.135.178 1.9 2.9 4.602 4.069.642.278 1.144.444 1.534.568.646.206 1.233.177 1.698.108.518-.077 1.654-.676 1.888-1.332.235-.656.235-1.22.165-1.332-.07-.11-.256-.2-.536-.34z"/>
            </svg>
            <span>تواصل عبر الواتساب</span>
          </a>
        </div>

      </div>
    </div>
  );
}
