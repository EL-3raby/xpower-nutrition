'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import Logo from '@/components/site/Logo';

export default function Navbar() {
  const pathname = usePathname();
  const { getCartCount, setIsDrawerOpen } = useCart();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || (pathname?.startsWith(`${path}/`));
  };

  return (
    <header className={`bg-[#050505]/85 backdrop-blur-xl border-b border-white/5 w-full z-50 sticky top-0 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] relative before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-accent-red/80 before:to-transparent before:opacity-50 transition-transform duration-300 ease-in-out ${!isVisible ? '-translate-y-full md:translate-y-0' : 'translate-y-0'}`}>
      {/* Subtle red ambient light glow underneath the navbar */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent-red/20 to-transparent pointer-events-none"></div>

      {/* Mobile Top Bar (md:hidden) */}
      <div className="md:hidden grid grid-cols-3 items-center w-full px-4 py-2.5 max-w-[1400px] mx-auto relative z-10" dir="rtl">
        {/* Right: Cart & Search Buttons */}
        <div className="flex items-center justify-start gap-1">
          <button 
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="text-zinc-100 hover:text-white active:scale-90 transition-all p-1.5 relative flex items-center justify-center"
            aria-label="سلة المشتريات"
          >
            <span className="material-symbols-outlined text-[25px]">shopping_cart</span>
            {getCartCount() > 0 && (
              <span className="absolute top-0 right-0 bg-gradient-to-b from-[#ff2a32] to-accent-red text-white text-[9px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5 font-display font-bold shadow-[0_2px_6px_rgba(227,30,36,0.6)] border border-[#050505]">
                {getCartCount()}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
            className="text-zinc-100 hover:text-white active:scale-90 transition-all p-1.5 flex items-center justify-center"
            aria-label="بحث في المتجر"
          >
            <span className="material-symbols-outlined text-[24px]">search</span>
          </button>
        </div>

        {/* Center: Logo */}
        <div className="flex justify-center items-center">
          <Link href="/" className="transition-transform duration-300 flex justify-center">
            <Logo size="lg" className="transform hover:scale-105 transition-transform duration-300" />
          </Link>
        </div>

        {/* Left: Menu Button */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-mobile-menu'))}
            className="text-zinc-100 hover:text-white active:scale-90 transition-all p-1.5 flex items-center justify-center"
            aria-label="فتح القائمة والتصنيفات"
          >
            <span className="material-symbols-outlined text-[25px]">menu</span>
          </button>
        </div>
      </div>

      {/* Desktop Facebook-Style Top Bar (hidden md:flex) */}
      <div className="hidden md:flex items-center justify-between w-full h-14 lg:h-16 px-6 lg:px-10 max-w-[1440px] mx-auto relative z-10" dir="rtl">
        
        {/* 1. Right (Start in RTL): Facebook-Style Navigation Tabs with Wide Spacing */}
        <nav className="flex items-center justify-start h-full flex-1 z-10">
          {[
            { href: '/', label: 'الرئيسية', icon: 'home' },
            { href: '/products', label: 'المنتجات', icon: 'grid_view' },
            { href: '/verify', label: 'فحص الأصالة', icon: 'verified' },
            { href: '/track-order', label: 'تتبع الطلب', icon: 'local_shipping' },
          ].map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link 
                key={tab.href}
                href={tab.href} 
                className="h-full w-20 lg:w-24 xl:w-28 flex items-center justify-center relative group select-none"
                aria-label={tab.label}
              >
                {/* Facebook Hover Capsule */}
                <div className={`w-full max-w-[76px] lg:max-w-[88px] xl:max-w-[100px] h-[78%] my-auto rounded-xl flex items-center justify-center transition-all duration-200 ${
                  active 
                    ? '' 
                    : 'hover:bg-white/[0.08]'
                }`}>
                  <span 
                    className={`material-symbols-outlined text-[25px] lg:text-[27px] transition-all duration-200 ${
                      active 
                        ? 'text-accent-red drop-shadow-[0_0_8px_rgba(227,30,36,0.65)] scale-105' 
                        : 'text-zinc-400 group-hover:text-zinc-100'
                    }`}
                    style={{ fontVariationSettings: active ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400" }}
                  >
                    {tab.icon}
                  </span>
                </div>

                {/* Facebook Solid Bottom Indicator Line */}
                {active && (
                  <div className="absolute bottom-0 inset-x-2 lg:inset-x-3 h-[3.5px] bg-accent-red rounded-t-[3px] shadow-[0_0_12px_rgba(227,30,36,0.9)] animate-in fade-in duration-200" />
                )}

                {/* Tooltip on Hover */}
                <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 pointer-events-none opacity-0 translate-y-1 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-150 ease-out z-50">
                  <div className="relative bg-[#101014]/95 backdrop-blur-2xl border border-white/[0.12] text-zinc-100 text-[11.5px] font-product-title font-bold px-3 py-1 rounded-lg shadow-[0_10px_25px_rgba(0,0,0,0.85)] whitespace-nowrap">
                    {tab.label}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* 2. Center: Logo (Centered with mathematical precision) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto z-20">
          <Link href="/" className="flex items-center group">
            <Logo size="lg" className="transform hover:scale-105 transition-transform duration-300 drop-shadow-[0_2px_10px_rgba(227,30,36,0.25)]" />
          </Link>
        </div>

        {/* 3. Left (End in RTL): Search & Cart Controls - Identical Tab Design */}
        <div className="flex items-center justify-end h-full flex-1 z-10">
          
          {/* Search Tab (Opens Global Instant Search Modal) */}
          <button 
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
            className="h-full w-20 lg:w-24 xl:w-28 flex items-center justify-center relative group select-none"
            aria-label="بحث في المنتجات"
          >
            {/* Facebook Hover Capsule */}
            <div className="w-full max-w-[76px] lg:max-w-[88px] xl:max-w-[100px] h-[78%] my-auto rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-white/[0.08]">
              <span className="material-symbols-outlined text-[25px] lg:text-[27px] text-zinc-400 group-hover:text-zinc-100 transition-all duration-200">
                search
              </span>
            </div>

            {/* Tooltip on Hover */}
            <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 pointer-events-none opacity-0 translate-y-1 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-150 ease-out z-50">
              <div className="relative bg-[#101014]/95 backdrop-blur-2xl border border-white/[0.12] text-zinc-100 text-[11.5px] font-product-title font-bold px-3 py-1 rounded-lg shadow-[0_10px_25px_rgba(0,0,0,0.85)] whitespace-nowrap flex items-center gap-1.5">
                <span>بحث</span>
                <span className="text-[9.5px] bg-white/10 px-1 py-0.2 rounded font-mono text-zinc-400">Ctrl+K</span>
              </div>
            </div>
          </button>

          {/* Cart Tab */}
          <button 
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="h-full w-20 lg:w-24 xl:w-28 flex items-center justify-center relative group select-none"
            aria-label="سلة المشتريات"
          >
            {/* Facebook Hover Capsule */}
            <div className="w-full max-w-[76px] lg:max-w-[88px] xl:max-w-[100px] h-[78%] my-auto rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-white/[0.08]">
              <div className="relative flex items-center justify-center">
                <span className="material-symbols-outlined text-[25px] lg:text-[27px] text-zinc-400 group-hover:text-zinc-100 transition-all duration-200">
                  shopping_cart
                </span>
                {getCartCount() > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-gradient-to-b from-[#ff2a32] to-accent-red text-white text-[9.5px] font-product-title font-black rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow-[0_0_10px_rgba(227,30,36,0.7)] border border-[#060608] animate-in zoom-in-50 duration-200">
                    {getCartCount()}
                  </span>
                )}
              </div>
            </div>

            {/* Tooltip on Hover */}
            <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 pointer-events-none opacity-0 translate-y-1 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-150 ease-out z-50">
              <div className="relative bg-[#101014]/95 backdrop-blur-2xl border border-white/[0.12] text-zinc-100 text-[11.5px] font-product-title font-bold px-3 py-1 rounded-lg shadow-[0_10px_25px_rgba(0,0,0,0.85)] whitespace-nowrap">
                سلة المشتريات
              </div>
            </div>
          </button>

        </div>

      </div>
    </header>
  );
}
