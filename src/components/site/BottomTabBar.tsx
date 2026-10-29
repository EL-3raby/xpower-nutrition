'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MobileCategoryDrawer from '@/components/site/MobileCategoryDrawer';

export default function BottomTabBar() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const lastScrollY = useRef(0);

  // Hide on specific routes where we want focus or have custom checkout bars
  const hideOnRoutes = ['/checkout', '/order-success', '/cart'];
  const shouldHide = hideOnRoutes.some(route => pathname?.startsWith(route));

  // Listen to open-mobile-menu event triggered from header
  useEffect(() => {
    const handleOpen = () => setIsMobileMenuOpen(true);
    window.addEventListener('open-mobile-menu', handleOpen);
    return () => window.removeEventListener('open-mobile-menu', handleOpen);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Always show near top of page
      if (currentScrollY <= 20) {
        setIsVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      const diff = currentScrollY - lastScrollY.current;

      // Ignore small jitter scrolls (less than 5px)
      if (Math.abs(diff) > 5) {
        if (diff > 0) {
          // Scrolling DOWN -> Hide
          setIsVisible(false);
        } else {
          // Scrolling UP -> Show
          setIsVisible(true);
        }
        lastScrollY.current = currentScrollY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (shouldHide) return null;

  const isHomeActive = pathname === '/';
  const isProductsActive = pathname === '/products' || pathname?.startsWith('/products/');
  const isVerifyActive = pathname === '/verify' || pathname?.startsWith('/verify/');
  const isTrackActive = pathname === '/track-order' || pathname?.startsWith('/track-order/');

  return (
    <>
      <nav 
        aria-label="شريط التنقل السفلي"
        className={`md:hidden fixed bottom-0 left-0 right-0 w-full z-50 transition-transform duration-300 ease-out select-none ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Full-width iOS & Android Facebook-style Navigation Bar with Subtle Red Ambient Glow */}
        <div 
          className="relative bg-[#08080a]/88 backdrop-blur-2xl border-t border-white/[0.08] shadow-[0_-8px_30px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)]"
          style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          }}
        >
          {/* Subtle Ambient Red Glow Bar at Top */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-accent-red/45 to-transparent pointer-events-none" />
          
          {/* Ambient red diffuse glow behind top border */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-48 h-8 bg-accent-red/15 blur-xl rounded-full pointer-events-none" />

          {/* Inner subtle surface gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-black/20 pointer-events-none" />

          <div className="flex items-center justify-around h-[50px] px-1 relative z-10 w-full max-w-lg mx-auto" dir="rtl">
            
            {/* 1. Home / الرئيسية */}
            <Link 
              href="/" 
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="flex-1 flex flex-col items-center justify-center h-full relative py-1 transition-all group active:scale-95"
            >
              {isHomeActive && (
                <>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-5 bg-accent-red/25 blur-md rounded-full pointer-events-none" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 sm:w-10 h-[2.5px] bg-accent-red rounded-full shadow-[0_0_10px_rgba(227,30,36,0.9)] animate-in fade-in duration-200" />
                </>
              )}
              <div className="w-6 h-6 flex items-center justify-center">
                <span 
                  className={`material-symbols-outlined text-[22px] leading-none transition-all duration-200 ${
                    isHomeActive ? 'text-accent-red drop-shadow-[0_0_8px_rgba(227,30,36,0.5)] scale-105' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                  style={{ fontVariationSettings: isHomeActive ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400" }}
                >
                  home
                </span>
              </div>
              <span className={`text-[10px] font-product-title font-bold tracking-tight text-center leading-none mt-1 transition-colors duration-200 ${
                isHomeActive ? 'text-accent-red' : 'text-zinc-400 group-hover:text-zinc-200'
              }`}>
                الرئيسية
              </span>
            </Link>

            {/* 2. Products / المنتجات */}
            <Link 
              href="/products" 
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="flex-1 flex flex-col items-center justify-center h-full relative py-1 transition-all group active:scale-95"
            >
              {isProductsActive && (
                <>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-5 bg-accent-red/25 blur-md rounded-full pointer-events-none" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 sm:w-10 h-[2.5px] bg-accent-red rounded-full shadow-[0_0_10px_rgba(227,30,36,0.9)] animate-in fade-in duration-200" />
                </>
              )}
              <div className="w-6 h-6 flex items-center justify-center">
                <span 
                  className={`material-symbols-outlined text-[22px] leading-none transition-all duration-200 ${
                    isProductsActive ? 'text-accent-red drop-shadow-[0_0_8px_rgba(227,30,36,0.5)] scale-105' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                  style={{ fontVariationSettings: isProductsActive ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400" }}
                >
                  grid_view
                </span>
              </div>
              <span className={`text-[10px] font-product-title font-bold tracking-tight text-center leading-none mt-1 transition-colors duration-200 ${
                isProductsActive ? 'text-accent-red' : 'text-zinc-400 group-hover:text-zinc-200'
              }`}>
                المنتجات
              </span>
            </Link>

            {/* 3. Verify / تحقق من المنتج (Hero Center Tab) */}
            <Link 
              href="/verify" 
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="flex-1 flex flex-col items-center justify-center h-full relative py-1 transition-all group active:scale-95"
            >
              {isVerifyActive && (
                <>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-5 bg-accent-red/25 blur-md rounded-full pointer-events-none" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 sm:w-10 h-[2.5px] bg-accent-red rounded-full shadow-[0_0_10px_rgba(227,30,36,0.9)] animate-in fade-in duration-200" />
                </>
              )}
              <div className="w-6 h-6 flex items-center justify-center relative">
                <span 
                  className={`material-symbols-outlined text-[22px] leading-none transition-all duration-200 ${
                    isVerifyActive ? 'text-accent-red drop-shadow-[0_0_8px_rgba(227,30,36,0.5)] scale-105' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                  style={{ fontVariationSettings: isVerifyActive ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400" }}
                >
                  verified
                </span>
              </div>
              <span className={`text-[10px] font-product-title font-bold tracking-tight text-center leading-none mt-1 transition-colors duration-200 ${
                isVerifyActive ? 'text-accent-red' : 'text-zinc-400 group-hover:text-zinc-200'
              }`}>
                تحقق
              </span>
            </Link>

            {/* 4. Track Order / طلبي */}
            <Link 
              href="/track-order" 
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="flex-1 flex flex-col items-center justify-center h-full relative py-1 transition-all group active:scale-95"
            >
              {isTrackActive && (
                <>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-5 bg-accent-red/25 blur-md rounded-full pointer-events-none" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 sm:w-10 h-[2.5px] bg-accent-red rounded-full shadow-[0_0_10px_rgba(227,30,36,0.9)] animate-in fade-in duration-200" />
                </>
              )}
              <div className="w-6 h-6 flex items-center justify-center">
                <span 
                  className={`material-symbols-outlined text-[22px] leading-none transition-all duration-200 ${
                    isTrackActive ? 'text-accent-red drop-shadow-[0_0_8px_rgba(227,30,36,0.5)] scale-105' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                  style={{ fontVariationSettings: isTrackActive ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400" }}
                >
                  local_shipping
                </span>
              </div>
              <span className={`text-[10px] font-product-title font-bold tracking-tight text-center leading-none mt-1 transition-colors duration-200 ${
                isTrackActive ? 'text-accent-red' : 'text-zinc-400 group-hover:text-zinc-200'
              }`}>
                طلبي
              </span>
            </Link>

          </div>
        </div>
      </nav>

      {/* Mobile Drawer Triggered from Bottom Bar 5th Tab */}
      <MobileCategoryDrawer 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
    </>
  );
}
