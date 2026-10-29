'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductDetailContainer from '@/components/site/ProductDetailContainer';

export default function NotFound() {
  const [isProductRoute, setIsProductRoute] = useState(false);
  const [productSlug, setProductSlug] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const path = window.location.pathname;
    if (path.startsWith('/products/') && path.length > '/products/'.length) {
      const slug = path.split('/')[2];
      // Exclude generic paths or static paths if needed, but any unbuilt product hits here
      if (slug && slug !== 'detail') {
        setIsProductRoute(true);
        setProductSlug(slug);
      }
    }
  }, []);

  // Prevent hydration mismatch by showing nothing until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#050505]" />
    );
  }

  // SPA Fallback for newly added products that don't have static HTML yet
  if (isProductRoute && productSlug) {
    return <ProductDetailContainer initialProduct={null} slug={productSlug} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary px-6 relative overflow-hidden" dir="rtl">
      
      {/* Background Decorative Glowing Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-accent-red/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/4 w-72 h-72 rounded-full bg-accent-red/5 blur-[100px] pointer-events-none"></div>

      <div className="max-w-md w-full text-center z-10 space-y-8 py-12">
        
        {/* Animated Sporty 404 Motif */}
        <div className="relative inline-block select-none">
          <h1 className="font-display text-8xl md:text-9xl font-black tracking-tighter text-white/5 skew-y-3">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-6xl md:text-7xl font-black text-accent-red tracking-wider drop-shadow-[0_0_15px_rgba(235,0,0,0.5)]">
              404
            </span>
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-3">
          <h2 className="font-display text-xl md:text-2xl font-black text-white">عذرًا، الصفحة غير موجودة!</h2>
          <p className="font-body text-sm text-text-muted leading-relaxed max-w-sm mx-auto">
            يبدو أن الرابط الذي اتبعته غير صحيح، أو تم نقل الصفحة أو حذفها. ابدأ مجددًا من الروابط بالأسفل للعودة للمسار الصحيح.
          </p>
        </div>

        {/* Premium Action CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center font-product-title">
          <Link 
            href="/"
            className="w-full sm:w-auto bg-accent-red hover:bg-accent-red/90 text-white font-bold py-3.5 px-8 btn-diagonal transition-transform hover:scale-105 text-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            <span>الرئيسية</span>
          </Link>
          
          <Link 
            href="/products"
            className="w-full sm:w-auto border border-text-muted/20 hover:border-white hover:bg-white/5 text-white font-bold py-3.5 px-8 transition-all hover:scale-105 text-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
            <span>تصفح المنتجات</span>
          </Link>
        </div>

      </div>

    </div>
  );
}
