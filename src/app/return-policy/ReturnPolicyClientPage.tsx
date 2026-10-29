'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSiteConfig } from '@/lib/firebase/admin-actions';
import { SiteConfig } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';

export default function ReturnPolicyClientPage() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const cfg = await getSiteConfig();
        setConfig(cfg);
      } catch (err) {
        console.error('Error loading site config in return policy page:', err);
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

  return (
    <div className="bg-[#050505] text-text-primary min-h-screen py-10 sm:py-16 md:py-20 px-4 sm:px-6 relative overflow-hidden" dir="rtl">
      {/* Ambient background lights */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent-red/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-accent-red/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 space-y-8 sm:space-y-10 text-right">
        
        {/* Page Header */}
        <div className="space-y-3.5 border-b border-white/10 pb-6 sm:pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs font-product-title font-bold">
            <span className="material-symbols-outlined text-[16px]">assignment_return</span>
            <span>ضمان الرضا وحماية حقوق العميل</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-wide">
            سياسة الاستبدال والاسترجاع
          </h1>
          <p className="font-body text-text-muted text-xs sm:text-sm md:text-base leading-relaxed">
            في <strong className="text-white">Xpower Nutrition</strong> نلتزم بتقديم مكملات غذائية أصلية 100% بأعلى معايير التخزين والجودة. رضاكم هو غايتنا الأولى، ولذلك نتيح نظام استبدال واسترجاع مرناً وواضحاً متوافقاً مع قانون حماية المستهلك المصري.
          </p>
        </div>

        {/* Section 1: 14-Day Return Window & Conditions */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-accent-red rounded-full shrink-0"></span>
            <h2 className="font-product-title text-base sm:text-lg font-bold text-white">
              1. فترة وشروط الاستبدال والاسترجاع (14 يوماً)
            </h2>
          </div>
          <p className="font-body text-xs sm:text-sm text-text-muted leading-relaxed">
            يحق للعميل طلب استرجاع أو استبدال أي منتج خلال <strong className="text-white">14 يوماً</strong> من تاريخ استلام الشحنة، بشرط استيفاء المعايير التالية:
          </p>
          <ul className="space-y-2 font-body text-xs sm:text-sm text-text-muted leading-relaxed list-disc list-inside">
            <li>أن يكون المنتج في حالته الأصلية تماماً التي تم الاستلام بها، وغير مستخدم.</li>
            <li>أن تكون العبوة مغلقة بإحكام بالغلاف البلاستيكي الحراري الخارجي وختم الأمان المصنعي السليم.</li>
            <li>عدم تعرض العبوة لأي خدوش، تمزق، أو سوء تخزين في درجات حرارة أو رطوبة غير مناسبة.</li>
            <li>إرفاق الفاتورة أو إشعار الطلب الموضح لكود الأوردر.</li>
          </ul>
        </div>

        {/* Section 2: Non-Returnable Items (Health & Safety) */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-accent-red rounded-full shrink-0"></span>
            <h2 className="font-product-title text-base sm:text-lg font-bold text-white">
              2. المنتجات المستثناة من الاسترجاع (معايير سلامة الغذاء)
            </h2>
          </div>
          <p className="font-body text-xs sm:text-sm text-text-muted leading-relaxed">
            حفاظاً على الصحة العامة وسلامة المنتجات الغذائية والرياضية وفقاً للإرشادات الصحية:
          </p>
          <div className="bg-accent-red/10 border border-accent-red/20 rounded-xl p-4 space-y-1 text-accent-red text-xs sm:text-sm font-body">
            <p className="font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">warning</span>
              <span>تنبيه هام حول العبوات المفتوحة:</span>
            </p>
            <p className="text-text-muted leading-relaxed">
              لا يُقبل استرجاع أو استبدال أي عبوة مكمل غذائي تم فض غلافها الخارجي أو نزع شريط الأمان الداخلي أو كشط كود التحقق (Authenticity Scratch Code)، حيث يُصنف المنتج فور فتحه كمنتج غذائي تم استهلاكه لأسباب وقائية وصحية.
            </p>
          </div>
        </div>

        {/* Section 3: Right of Inspection upon Delivery */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-accent-red rounded-full shrink-0"></span>
            <h2 className="font-product-title text-base sm:text-lg font-bold text-white">
              {isCodEnabled ? '3. حق المعاينة الفورية وقت الاستلام (قبل الدفع)' : '3. حق المعاينة الفورية وقت الاستلام'}
            </h2>
          </div>
          <p className="font-body text-xs sm:text-sm text-text-muted leading-relaxed">
            لحماية حقوقك بشكل استباقي، يحق لك بالكامل فتح الطرد الخارجي ومعاينة محتوياته والتأكد من سلامة الأختام وتاريخ الصلاحية بحضور مندوب شركة الشحن:
          </p>
          <ul className="space-y-2 font-body text-xs sm:text-sm text-text-muted leading-relaxed list-disc list-inside">
            <li>في حال استلام منتج غير مطابق للطلب (نكهة مختلفة، حجم مختلف، أو تلف ظاهر في العبوة)، يحق لك رفض الاستلام مع المندوب فوراً دون سداد أي مصاريف إضافية، ويتم شحن المنتج الصحيح لك أو استرداد أموالك فوراً.</li>
          </ul>
        </div>

        {/* Section 4: Refund Policy & Shipping Deposit */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-accent-red rounded-full shrink-0"></span>
            <h2 className="font-product-title text-base sm:text-lg font-bold text-white">
              {isCodEnabled ? '4. سياسة استرداد الأموال وديبوزيت الشحن' : '4. سياسة استرداد الأموال'}
            </h2>
          </div>
          <div className={`grid grid-cols-1 ${isCodEnabled ? 'sm:grid-cols-2' : ''} gap-3.5`}>
            <div className="bg-black/50 border border-white/5 rounded-xl p-4 space-y-2">
              <span className="text-emerald-400 font-bold text-xs font-product-title flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">verified</span>
                <span>الاسترجاع لخطأ بالطلب أو عيب مصنعي</span>
              </span>
              <p className="text-[11px] sm:text-xs text-text-muted font-body leading-relaxed">
                {isCodEnabled
                  ? 'يتحمل المتجر كافة تكاليف الشحن ذهاباً وعودة، ويتم رد كامل المبلغ المسدد بما فيه ديبوزيت الشحن أو استبدال المنتج مجاناً وبدون أي اقتطاعات.'
                  : 'يتحمل المتجر كافة تكاليف الشحن ذهاباً وعودة، ويتم رد كامل المبلغ المسدد بالكامل أو استبدال المنتج مجاناً وبدون أي اقتطاعات.'}
              </p>
            </div>

            {isCodEnabled && (
              <div className="bg-black/50 border border-white/5 rounded-xl p-4 space-y-2">
                <span className="text-amber-400 font-bold text-xs font-product-title flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">info</span>
                  <span>رفض الاستلام لسبب شخصي (تغيير الرأي)</span>
                </span>
                <p className="text-[11px] sm:text-xs text-text-muted font-body leading-relaxed">
                  في حال خروج الشحنة ورفض الاستلام بدون وجود أي عيب في المنتج، يُخصم ديبوزيت الشحن المسبق لتغطية التكلفة الفعلية لشركة التوصيل، حمايةً من الطلبات غير الجادة.
                </p>
              </div>
            )}
          </div>
          <div className="border-t border-white/5 pt-3">
            <p className="font-body text-xs sm:text-sm text-text-muted leading-relaxed">
              <strong className="text-white">آلية تحويل المبالغ المستردة:</strong> تتم عملية استرداد الأموال خلال 24 إلى 48 ساعة عمل من تاريخ وصول وفحص المنتج في مخازننا، ويتم التحويل إلكترونياً وبشكل فوري عبر المحافظ الإلكترونية المعتمدة (فودافون كاش أو انستاباي — InstaPay).
            </p>
          </div>
        </div>

        {/* Section 5: Return Process Steps */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-accent-red rounded-full shrink-0"></span>
            <h2 className="font-product-title text-base sm:text-lg font-bold text-white">
              5. خطوات تقديم طلب الاستبدال أو الاسترجاع
            </h2>
          </div>
          <ol className="space-y-2.5 font-body text-xs sm:text-sm text-text-muted leading-relaxed list-decimal list-inside">
            <li>التواصل مع فريق الدعم الفني عبر محادثة الواتساب الرسمية.</li>
            <li>تزويدنا برقم الطلب (Order ID)، وصور واضحة للعبوة المغلقة والغلاف الخارجي لتقييم الحالة.</li>
            <li>يتم مراجعة الطلب والموافقة عليه خلال ساعات قليلة، وتوجيه مندوب الشحن لاستلام الطرد من عنوانك.</li>
            <li>فور استلام المنتج وفحصه، يتم تنفيذ الاستبدال وشحن المنتج الجديد أو تحويل المبلغ المالي فوراً.</li>
          </ol>
        </div>

        {/* Contact Card */}
        <div className="bg-gradient-to-r from-accent-red/10 via-[#0d0d0d] to-accent-red/5 border border-accent-red/20 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1 text-center sm:text-right">
            <h3 className="font-product-title text-base font-bold text-white">هل ترغب في استبدال أو استرجاع منتج؟</h3>
            <p className="font-body text-xs text-text-muted">فريق خدمة العملاء جاهز لخدمتك والتنسيق معك خطوة بخطوة.</p>
          </div>
          <a
            href={`https://wa.me/2${cleanWhatsapp}?text=${encodeURIComponent('السلام عليكم، كنت حابب أقدم طلب استبدال/استرجاع لمنتج من متجر Xpower Nutrition.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs sm:text-sm font-bold font-product-title shadow-lg shadow-[#25D366]/20 transition-all active:scale-95"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.09-3.969l.325.193c1.614.959 3.477 1.464 5.378 1.465 5.867 0 10.641-4.757 10.644-10.627.002-2.844-1.1-5.516-3.104-7.52C17.387 1.54 14.72 1.43 11.879 1.43c-5.872 0-10.647 4.757-10.65 10.628 0 2.01.528 3.974 1.53 5.73l.21.365-1.01 3.682 3.778-.992zM17.15 13.9c-.279-.14-1.654-.816-1.91-.909-.255-.094-.44-.14-.625.14-.184.28-.71.909-.87 1.096-.159.186-.32.21-.599.07-.279-.14-1.18-.435-2.247-1.387-.83-.74-1.39-1.653-1.553-1.933-.163-.28-.018-.43.122-.569.126-.125.279-.327.42-.49.14-.163.187-.28.279-.465.093-.186.047-.35-.024-.49-.07-.14-.625-1.507-.856-2.066-.225-.544-.45-.47-.625-.479-.16-.008-.34-.01-.52-.01-.18 0-.475.067-.723.34-.247.272-.945.923-.945 2.25 0 1.327.966 2.607 1.1 2.785.135.178 1.9 2.9 4.602 4.069.642.278 1.144.444 1.534.568.646.206 1.233.177 1.698.108.518-.077 1.654-.676 1.888-1.332.235-.656.235-1.22.165-1.332-.07-.11-.256-.2-.536-.34z"/>
            </svg>
            <span>بدء طلب استبدال أو استرجاع عبر الواتساب</span>
          </a>
        </div>

      </div>
    </div>
  );
}
