'use client';

import React from 'react';
import Logo from '@/components/site/Logo';
import { SiteConfig } from '@/lib/types';

interface MaintenancePageProps {
  config?: SiteConfig | null;
}

export default function MaintenancePage({ config }: MaintenancePageProps) {
  const maintenance = config?.maintenanceMode;
  const contact = config?.contactInfo;
  const social = config?.socialLinks;

  const rawWhatsapp = contact?.whatsapp || '01012345678';
  const cleanWhatsapp = rawWhatsapp.startsWith('0') ? `2${rawWhatsapp}` : rawWhatsapp;
  const whatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent('مرحباً، أود الاستفسار أو إتمام طلب خلال فترة صيانة وتحديث الموقع.')}`;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col justify-between items-center px-4 py-8 sm:py-12 relative overflow-hidden select-none" dir="rtl">
      {/* Top subtle athletic energy glow line */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent-red to-transparent opacity-80" />
      
      {/* Background ambient lighting */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-accent-red/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-20 right-1/4 w-[400px] h-[250px] bg-accent-red/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header with Official Brand Logo */}
      <header className="w-full max-w-5xl flex items-center justify-center pt-2 sm:pt-4 relative z-10">
        <div className="flex flex-col items-center gap-2">
          <Logo size="xl" className="h-12 sm:h-16 w-auto drop-shadow-[0_4px_25px_rgba(227,30,36,0.35)]" />
        </div>
      </header>

      {/* Center Main Content Card */}
      <main className="w-full max-w-2xl mx-auto my-auto py-8 sm:py-12 relative z-10 text-center flex flex-col items-center">
        {/* Status Indicator */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-text-muted text-xs font-bold mb-6 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-red opacity-80" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-red" />
          </span>
          <span className="font-product-title tracking-wider uppercase text-white/90 text-[11px] sm:text-xs">
            تحديث الأنظمة وتطوير التجربة | SYSTEM UPGRADE
          </span>
        </div>

        {/* Dynamic Title */}
        <h1 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight mb-4 max-w-xl leading-snug sm:leading-tight">
          {maintenance?.title || 'الموقع تحت الصيانة والتطوير'}
        </h1>

        {/* Dynamic Message */}
        <p className="font-body text-text-muted text-sm sm:text-base leading-relaxed max-w-lg mb-8">
          {maintenance?.message || 'نعمل حالياً على تحديث بنيتنا التقنية وتطوير تجربة المتجر لنمنحكم سرعة فائقة وتجربة تسوق رياضية لا مثيل لها. سنعود للعمل بكامل طاقتنا في أقرب وقت.'}
        </p>

        {/* Estimated Return Time (If specified) */}
        {maintenance?.estimatedEndTime && (
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-bg-elevated border border-accent-red/30 text-xs sm:text-sm text-text-muted mb-8 shadow-lg shadow-black/40">
            <span className="material-symbols-outlined text-accent-red text-base">timer</span>
            <span>الموعد المتوقع لإعادة الفتح:</span>
            <strong className="text-white font-display font-bold text-sm sm:text-base">{maintenance.estimatedEndTime}</strong>
          </div>
        )}

        {/* Real-world Reassurance Tiles (Practical & Authentic) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full mb-8 text-right">
          <div className="bg-bg-elevated/70 border border-white/5 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-accent-red text-xl">local_shipping</span>
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-white mb-1">الطلبات الجارية والشحن</h2>
              <p className="font-body text-xs text-text-muted leading-relaxed">
                جميع الطلبات المؤكدة سابقاً قيد التجهيز والشحن في مواعيدها مع شركة الشحن دون أي تأخير.
              </p>
            </div>
          </div>

          <div className="bg-bg-elevated/70 border border-white/5 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-accent-red text-xl">support_agent</span>
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-white mb-1">الطلبات والاستفسار السريع</h2>
              <p className="font-body text-xs text-text-muted leading-relaxed">
                فريق المبيعات وخدمة العملاء متواجد على مدار الساعة عبر واتساب لمساعدتك في أي طلب عاجل.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Action Box */}
        <div className="w-full bg-[#111111] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
          <p className="font-display text-xs sm:text-sm text-white font-bold">
            هل تحتاج إلى متابعة شحنتك أو إتمام طلب مستعجل الآن؟
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
            {/* WhatsApp CTA Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-[#25D366] hover:bg-[#20ba5a] text-white font-product-title font-bold py-3.5 px-5 rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2.5 text-xs sm:text-sm shadow-lg shadow-[#25D366]/20 cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.09-3.969l.325.193c1.614.959 3.477 1.464 5.378 1.465 5.867 0 10.641-4.757 10.644-10.627.002-2.844-1.1-5.516-3.104-7.52C17.387 1.54 14.72 1.43 11.879 1.43c-5.872 0-10.647 4.757-10.65 10.628 0 2.01.528 3.974 1.53 5.73l.21.365-1.01 3.682 3.778-.992zM17.15 13.9c-.279-.14-1.654-.816-1.91-.909-.255-.094-.44-.14-.625.14-.184.28-.71.909-.87 1.096-.159.186-.32.21-.599.07-.279-.14-1.18-.435-2.247-1.387-.83-.74-1.39-1.653-1.553-1.933-.163-.28-.018-.43.122-.569.126-.125.279-.327.42-.49.14-.163.187-.28.279-.465.093-.186.047-.35-.024-.49-.07-.14-.625-1.507-.856-2.066-.225-.544-.45-.47-.625-.479-.16-.008-.34-.01-.52-.01-.18 0-.475.067-.723.34-.247.272-.945.923-.945 2.25 0 1.327.966 2.607 1.1 2.785.135.178 1.9 2.9 4.602 4.069.642.278 1.144.444 1.534.568.646.206 1.233.177 1.698.108.518-.077 1.654-.676 1.888-1.332.235-.656.235-1.22.165-1.332-.07-.11-.256-.2-.536-.34z" />
              </svg>
              <span>تواصل مع الدعم عبر واتساب</span>
            </a>

            {/* Direct Phone Call Button */}
            {contact?.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-product-title font-bold py-3.5 px-5 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2 text-xs sm:text-sm hover:border-white/20"
              >
                <span className="material-symbols-outlined text-accent-red text-lg">call</span>
                <span dir="ltr">{contact.phone}</span>
              </a>
            )}
          </div>
        </div>

        {/* Social Media Links */}
        {(social?.facebook || social?.instagram || social?.tiktok) && (
          <div className="flex items-center gap-3 mt-6">
            {social.facebook && (
              <a
                href={social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 hover:border-accent-red/50 hover:bg-accent-red/10 flex items-center justify-center text-text-muted hover:text-white transition-all hover:scale-105"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            )}
            {social.instagram && (
              <a
                href={social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 hover:border-accent-red/50 hover:bg-accent-red/10 flex items-center justify-center text-text-muted hover:text-white transition-all hover:scale-105"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            )}
            {social.tiktok && (
              <a
                href={social.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 hover:border-accent-red/50 hover:bg-accent-red/10 flex items-center justify-center text-text-muted hover:text-white transition-all hover:scale-105"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
                </svg>
              </a>
            )}
          </div>
        )}
      </main>

      {/* Clean Footer (Admin link removed as requested) */}
      <footer className="w-full max-w-5xl text-center text-xs text-text-muted/60 relative z-10 pt-4 border-t border-white/5 font-body">
        <p>&copy; {new Date().getFullYear()} Xpower Nutrition. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
