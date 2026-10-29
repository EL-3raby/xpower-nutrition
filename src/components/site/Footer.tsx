'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSiteConfig, getCategories } from '@/lib/firebase/admin-actions';
import { SiteConfig, Category } from '@/lib/types';
import Logo from '@/components/site/Logo';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const [settings, setSettings] = useState<SiteConfig | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const fetchedConfig = await getSiteConfig();
        setSettings(fetchedConfig);
        
        const fetchedCategories = await getCategories();
        // Get only active categories, sorted by order, and take the first 4
        const activeCategories = fetchedCategories
          .filter(c => c.isActive)
          .sort((a, b) => a.order - b.order)
          .slice(0, 4);
        setCategories(activeCategories);
      } catch (err) {
        console.error('Error loading data in footer:', err);
      }
    }
    loadData();
  }, []);

  const isLinkActive = (link?: string) => {
    return link && link.trim() !== '';
  };

  const formatWhatsappLink = (num: string) => {
    if (!num) return 'https://wa.me/201012345678';
    let clean = num.replace(/\D/g, ''); // keep digits only
    if (clean.startsWith('0')) {
      clean = '20' + clean.slice(1);
    }
    return `https://wa.me/${clean}`;
  };

  return (
    <>
      <footer className="relative bg-[#050505] text-text-muted mt-auto w-full border-t-[3px] border-accent-red overflow-hidden">
        {/* Subtle Background Texture/Logo */}
        <div className="absolute top-0 right-0 w-full h-full opacity-[0.03] pointer-events-none flex items-center justify-center overflow-hidden">
          <span className="font-display text-[20vw] font-black italic tracking-tighter text-white transform -skew-x-12 select-none">
            XPOWER
          </span>
        </div>

        <div className="relative z-10 w-full px-6 py-16 max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 text-right" dir="rtl">
          
          {/* Brand Info & Socials */}
          <div className="flex flex-col gap-6">
            <Link href="/" className="transition-transform duration-300 self-start mb-2">
              <Logo size="lg" className="transform hover:scale-105 transition-transform duration-300" />
            </Link>
            <p className="font-body text-sm text-text-muted leading-relaxed">
              شريكك الأقوى عشان توصل لأقصى إمكانياتك. أحسن المكملات الغذائية للرياضيين في مصر بأعلى جودة.
            </p>
            
            {/* Social Media */}
            {(isLinkActive(settings?.socialLinks?.facebook) || isLinkActive(settings?.socialLinks?.instagram) || isLinkActive(settings?.socialLinks?.tiktok)) && (
              <div className="flex gap-3 mt-2">
                {isLinkActive(settings?.socialLinks?.facebook) && (
                  <a href={settings!.socialLinks!.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 hover:bg-accent-red text-white border border-white/10 hover:border-accent-red rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M14 13.5h2.5l1-3H14V8.5c0-.85.2-1.2 1-1.2h1.5V4.5H14c-2.5 0-4 1.5-4 4v2H8v3h2V20h4v-6.5z"/></svg>
                  </a>
                )}
                {isLinkActive(settings?.socialLinks?.instagram) && (
                  <a href={settings!.socialLinks!.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 hover:bg-accent-red text-white border border-white/10 hover:border-accent-red rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  </a>
                )}
                {isLinkActive(settings?.socialLinks?.tiktok) && (
                  <a href={settings!.socialLinks!.tiktok} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 hover:bg-accent-red text-white border border-white/10 hover:border-accent-red rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.9-1.78-.31-.31-.57-.67-.77-1.07v7.39c0 3.94-2.48 6.87-6.36 7.15-3.86.3-7.23-2.23-7.5-6.07-.3-3.84 2.21-7.21 6.05-7.49.5-.04 1-.02 1.5.07v4.09c-.83-.24-1.75-.12-2.47.37-.88.6-.14 2.04.14 2.47.64.99 2.23.95 2.87-.12.44-.75.39-1.75.39-2.6V0h.04z"/></svg>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-6">
            <h4 className="font-display text-white font-black text-xl uppercase tracking-wider relative inline-block w-fit">
              روابط تهمك
              <span className="absolute -bottom-2 right-0 w-8 h-1 bg-accent-red"></span>
            </h4>
            <nav className="flex flex-col gap-3 mt-2">
              <Link className="font-body text-sm hover:text-accent-red transition-all duration-300 hover:-translate-x-1 flex items-center gap-2" href="/track-order">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span> تتبع الطلب
              </Link>
              <Link className="font-body text-sm hover:text-accent-red transition-all duration-300 hover:-translate-x-1 flex items-center gap-2" href="/verify">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span> تحقق من المنتج
              </Link>
              <Link className="font-body text-sm hover:text-accent-red transition-all duration-300 hover:-translate-x-1 flex items-center gap-2" href="/shipping-policy">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span> سياسة الشحن والتوصيل
              </Link>
              <Link className="font-body text-sm hover:text-accent-red transition-all duration-300 hover:-translate-x-1 flex items-center gap-2" href="/return-policy">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span> سياسة الاسترجاع والاستبدال
              </Link>
              <Link className="font-body text-sm hover:text-accent-red transition-all duration-300 hover:-translate-x-1 flex items-center gap-2" href="/faq">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span> الأسئلة الشائعة (FAQ)
              </Link>
              <Link className="font-body text-sm hover:text-accent-red transition-all duration-300 hover:-translate-x-1 flex items-center gap-2" href="/terms">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span> الشروط والأحكام
              </Link>
            </nav>
          </div>

          {/* Main Categories */}
          <div className="flex flex-col gap-6">
            <h4 className="font-display text-white font-black text-xl uppercase tracking-wider relative inline-block w-fit">
              أقسام رئيسية
              <span className="absolute -bottom-2 right-0 w-8 h-1 bg-accent-red"></span>
            </h4>
            <nav className="flex flex-col gap-3 mt-2">
              {categories.map((category) => (
                <Link 
                  key={category.id}
                  className="font-body text-sm hover:text-accent-red transition-all duration-300 hover:-translate-x-1 flex items-center gap-2" 
                  href={`/products?category=${category.slug}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span> {category.name}
                </Link>
              ))}
              {categories.length === 0 && (
                <div className="text-text-muted/60 text-sm">جاري التحميل...</div>
              )}
            </nav>
          </div>

          {/* Contact Details */}
          <div className="flex flex-col gap-6">
            <h4 className="font-display text-white font-black text-xl uppercase tracking-wider relative inline-block w-fit">
              تواصل معانا
              <span className="absolute -bottom-2 right-0 w-8 h-1 bg-accent-red"></span>
            </h4>
            <div className="flex flex-col gap-4 font-body text-sm mt-2">
              <div className="flex items-center gap-3 justify-start group">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-accent-red transition-colors">
                  <span className="material-symbols-outlined text-white text-lg">mail</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-text-muted/60 text-xs mb-0.5">البريد الإلكتروني</span>
                  <a href={`mailto:${settings?.contactInfo?.email || 'support@xpower-nutrition.com'}`} className="hover:text-white transition-colors font-mono text-xs sm:text-sm" dir="ltr">
                    {settings?.contactInfo?.email || 'support@xpower-nutrition.com'}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-start group">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-accent-red transition-colors">
                  <span className="material-symbols-outlined text-white text-lg">call</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-text-muted/60 text-xs mb-0.5">رقم الهاتف</span>
                  <a href={`tel:${settings?.contactInfo?.phone || '01012345678'}`} className="hover:text-white transition-colors font-mono text-xs sm:text-sm" dir="ltr">
                    {settings?.contactInfo?.phone || '01012345678'}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="relative z-10 text-center py-6 border-t border-white/5 text-text-muted/60 text-xs font-body bg-black">
          © {currentYear} Xpower Nutrition. كل الحقوق محفوظة. 
        </div>
      </footer>

      {/* Floating Actions Widgets (Home page only) */}
      {isHomePage && (
        <div 
          className="fixed md:bottom-6 left-5 flex flex-col gap-4.5 z-40"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 70px)' }}
        >
          {/* WhatsApp Button */}
          <a 
            href={formatWhatsappLink(settings?.contactInfo?.whatsapp || '')} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center hover:scale-110 hover:-translate-y-1 transition-all duration-300 shadow-[0_10px_20px_rgba(37,211,102,0.3)]"
            title="تواصل معنا عبر واتساب"
          >
            <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.09-3.969l.325.193c1.614.959 3.477 1.464 5.378 1.465 5.867 0 10.641-4.757 10.644-10.627.002-2.844-1.1-5.516-3.104-7.52C17.387 1.54 14.72 1.43 11.879 1.43c-5.872 0-10.647 4.757-10.65 10.628 0 2.01.528 3.974 1.53 5.73l.21.365-1.01 3.682 3.778-.992zM17.15 13.9c-.279-.14-1.654-.816-1.91-.909-.255-.094-.44-.14-.625.14-.184.28-.71.909-.87 1.096-.159.186-.32.21-.599.07-.279-.14-1.18-.435-2.247-1.387-.83-.74-1.39-1.653-1.553-1.933-.163-.28-.018-.43.122-.569.126-.125.279-.327.42-.49.14-.163.187-.28.279-.465.093-.186.047-.35-.024-.49-.07-.14-.625-1.507-.856-2.066-.225-.544-.45-.47-.625-.479-.16-.008-.34-.01-.52-.01-.18 0-.475.067-.723.34-.247.272-.945.923-.945 2.25 0 1.327.966 2.607 1.1 2.785.135.178 1.9 2.9 4.602 4.069.642.278 1.144.444 1.534.568.646.206 1.233.177 1.698.108.518-.077 1.654-.676 1.888-1.332.235-.656.235-1.22.165-1.332-.07-.11-.256-.2-.536-.34z"/>
            </svg>
          </a>
        </div>
      )}
    </>
  );
}
