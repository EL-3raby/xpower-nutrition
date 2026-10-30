'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/site/Logo';
import { getCategories, getSiteConfig } from '@/lib/firebase/admin-actions';
import { Category, SiteConfig } from '@/lib/types';

interface MobileCategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_FALLBACK_CATEGORIES: Category[] = [
  { id: 'cat1', name: 'بروتينات', slug: 'protein', order: 1, isActive: true },
  { id: 'cat2', name: 'كرياتين', slug: 'creatine', order: 2, isActive: true },
  { id: 'cat3', name: 'ضخامة عضلية', slug: 'mass-gainer', order: 3, isActive: true },
];

export default function MobileCategoryDrawer({ isOpen, onClose }: MobileCategoryDrawerProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_FALLBACK_CATEGORIES);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  
  // Accordion for categories: default open for ease of browsing
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [pathname]);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Lock body & document scroll completely when drawer is open to prevent background scrolling
  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origHtmlHeight = document.documentElement.style.height;
    const origBodyPosition = document.body.style.position;
    const origBodyTop = document.body.style.top;
    const origBodyLeft = document.body.style.left;
    const origBodyRight = document.body.style.right;
    const origBodyWidth = document.body.style.width;
    const origBodyOverflow = document.body.style.overflow;
    const origBodyHeight = document.body.style.height;

    // Pin background page strictly in place without breaking inner touch interactions
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100%';

    // Manage touch drag strictly inside the drawer container to prevent mobile scroll chaining / rubberbanding
    const scrollEl = scrollContainerRef.current;
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!scrollEl || e.touches.length !== 1) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;

      // If content fits completely inside the screen, prevent bounce from moving anything
      if (scrollHeight <= clientHeight) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      // At top edge and pulling downwards: cancel event to prevent chaining to the page
      if (scrollTop <= 0 && deltaY > 0) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      // At bottom edge and pulling upwards: cancel event to prevent chaining to the page
      if (scrollTop + clientHeight >= scrollHeight - 1 && deltaY < 0) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      // Inside normal scroll bounds: allow natural smooth touch swipe
      e.stopPropagation();
    };

    if (scrollEl) {
      scrollEl.addEventListener('touchstart', onTouchStart, { passive: true });
      scrollEl.addEventListener('touchmove', onTouchMove, { passive: false });
    }

    return () => {
      if (scrollEl) {
        scrollEl.removeEventListener('touchstart', onTouchStart);
        scrollEl.removeEventListener('touchmove', onTouchMove);
      }

      document.documentElement.style.overflow = origHtmlOverflow;
      document.documentElement.style.height = origHtmlHeight;
      document.body.style.position = origBodyPosition;
      document.body.style.top = origBodyTop;
      document.body.style.left = origBodyLeft;
      document.body.style.right = origBodyRight;
      document.body.style.width = origBodyWidth;
      document.body.style.overflow = origBodyOverflow;
      document.body.style.height = origBodyHeight;

      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch categories & site config
  useEffect(() => {
    let isMounted = true;
    async function loadDrawerData() {
      try {
        const [fetchedCategories, fetchedConfig] = await Promise.all([
          getCategories(),
          getSiteConfig()
        ]);
        if (!isMounted) return;
        
        if (fetchedCategories && fetchedCategories.length > 0) {
          const active = fetchedCategories
            .filter(c => c.isActive)
            .sort((a, b) => a.order - b.order);
          setCategories(active);
        }
        if (fetchedConfig) {
          setSiteConfig(fetchedConfig);
        }
      } catch (err) {
        console.error('Error loading mobile category drawer data:', err);
      }
    }

    if (isOpen) {
      loadDrawerData();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const formatWhatsappLink = (num?: string) => {
    if (!num) return 'https://wa.me/201012345678';
    let clean = num.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '20' + clean.slice(1);
    }
    return `https://wa.me/${clean}`;
  };

  const socialLinks = siteConfig?.socialLinks || {
    facebook: 'https://www.facebook.com/share/19JKVpTvHG/?mibextid=wwXIfr',
    instagram: 'https://www.instagram.com/xpower_nutrition?igsh=MWp2c3RydGp1dHNldg%3D%3D&utm_source=qr',
    tiktok: 'https://www.tiktok.com/@xpower.nutrition?_r=1&_t=ZS-98Cg9ZNUf4P'
  };

  if (!mounted) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-[99999] overflow-hidden transition-all duration-300 ${
        isOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
      }`}
      dir="rtl"
    >
      {/* Backdrop with touch cancellation */}
      <div 
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 touch-none ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        onTouchMove={(e) => {
          if (e.cancelable) e.preventDefault();
        }}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 left-0 max-w-full flex pr-14 z-10 pointer-events-auto">
        <aside 
          className={`w-screen max-w-[310px] bg-[#0A0A0A] border-r border-white/10 shadow-2xl flex flex-col h-[100dvh] transform transition-transform duration-300 ease-in-out overscroll-contain touch-pan-y ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Header: Logo & Close */}
          <div 
            className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#080808] touch-none select-none"
            onTouchMove={(e) => {
              if (e.cancelable) e.preventDefault();
            }}
          >
            <Link href="/" onClick={onClose}>
              <Logo size="sm" />
            </Link>
            
            <button 
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-2 transition-colors active:scale-90 rounded-full hover:bg-white/5"
              aria-label="إغلاق القائمة"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>

          {/* Navigation Links with custom scrollbar, overscroll containment, and smooth touch scroll */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-5 py-5 space-y-1.5 drawer-scrollbar overscroll-contain touch-pan-y"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* Quick Search Trigger in Mobile Drawer */}
            <div className="pb-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('open-global-search'));
                  }, 200);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:border-accent-red/40 text-xs font-display font-bold transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-accent-red text-lg">search</span>
                <span>ابحث في المكملات...</span>
              </button>
            </div>
            
            {/* الرئيسية */}
            <Link
              href="/"
              onClick={onClose}
              className={`flex items-center justify-between py-3 font-display text-[17px] tracking-wide transition-colors ${
                pathname === '/' ? 'text-accent-red font-black' : 'text-white hover:text-accent-red font-extrabold'
              }`}
            >
              <span>الرئيسية</span>
            </Link>

            {/* الأقسام (Accordion) */}
            <div className="py-1">
              <button
                type="button"
                onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                className="w-full flex items-center justify-between py-3 text-right font-display text-[17px] font-extrabold text-white hover:text-accent-red transition-colors"
              >
                <span>المنتجات والأقسام</span>
                <span 
                  className={`material-symbols-outlined text-[22px] text-zinc-400 transition-transform duration-200 ${
                    isCategoriesOpen ? 'rotate-180 text-accent-red' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>

              {/* Sub-categories */}
              <div 
                className={`transition-all duration-200 ease-out overflow-hidden ${
                  isCategoriesOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="pr-4 space-y-1 border-r-2 border-white/10 mr-1 my-2">
                  <Link
                    href="/products"
                    onClick={onClose}
                    className="block py-2 text-[15px] font-display font-black text-white hover:text-accent-red transition-colors"
                  >
                    جميع المنتجات
                  </Link>

                  {categories.map((cat) => (
                    <Link
                      key={cat.id || cat.slug}
                      href={`/products?category=${cat.slug}`}
                      onClick={onClose}
                      className="block py-2 text-[15px] font-display font-bold text-zinc-300 hover:text-white transition-colors"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* تأكد من الكود */}
            <Link
              href="/verify"
              onClick={onClose}
              className={`flex items-center justify-between py-3 font-display text-[17px] tracking-wide transition-colors ${
                pathname === '/verify' ? 'text-accent-red font-black' : 'text-white hover:text-accent-red font-extrabold'
              }`}
            >
              <span>تأكد من الكود</span>
            </Link>

            {/* تتبع الطلب */}
            <Link
              href="/track-order"
              onClick={onClose}
              className={`flex items-center justify-between py-3 font-display text-[17px] tracking-wide transition-colors ${
                pathname === '/track-order' ? 'text-accent-red font-black' : 'text-white hover:text-accent-red font-extrabold'
              }`}
            >
              <span>تتبع حالة الطلب</span>
            </Link>

            {/* Divider */}
            <div className="pt-4 pb-2">
              <div className="h-[1px] bg-white/10" />
            </div>

            {/* سياسات المتجر */}
            <Link
              href="/shipping-policy"
              onClick={onClose}
              className="block py-2 text-[14px] font-display font-bold text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              سياسة الشحن والتوصيل
            </Link>

            <Link
              href="/return-policy"
              onClick={onClose}
              className="block py-2 text-[14px] font-display font-bold text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              سياسة الاسترجاع والضمان
            </Link>

            <Link
              href="/faq"
              onClick={onClose}
              className="block py-2 text-[14px] font-display font-bold text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              الأسئلة الشائعة (FAQ)
            </Link>

          </div>

          {/* Footer: Simple WhatsApp & Socials */}
          <div 
            className="px-5 py-4 border-t border-white/5 space-y-3 shrink-0 bg-[#080808] touch-none"
            onTouchMove={(e) => {
              if (e.cancelable) e.preventDefault();
            }}
          >
            <a
              href={formatWhatsappLink(siteConfig?.contactInfo?.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-[14px] font-display font-bold text-zinc-200 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 text-emerald-400 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
              </svg>
              <span>واتساب خدمة العملاء</span>
            </a>

            <div className="flex items-center gap-4 text-zinc-500 pt-1">
              {socialLinks.instagram && (
                <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Instagram">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              )}
              {socialLinks.facebook && (
                <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Facebook">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              )}
              {socialLinks.tiktok && (
                <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="TikTok">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.76 1.47-.04 2.7-1.07 3-2.5.15-.63.17-1.28.16-1.93.01-4.57 0-9.14.01-13.71z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>

        </aside>
      </div>
    </div>,
    document.body
  );
}
