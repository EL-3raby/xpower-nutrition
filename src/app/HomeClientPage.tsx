'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import ProductCard from '@/components/site/ProductCard';
import ScrollReveal from '@/components/site/ScrollReveal';
import CountdownTimer from '@/components/site/CountdownTimer';
import BestSellersSlider from '@/components/site/BestSellersSlider';
import AllProductsMarquee from '@/components/site/AllProductsMarquee';
import { getProducts } from '@/lib/firebase/products';
import { getSiteConfig, getCategories } from '@/lib/firebase/admin-actions';
import { Product, Category, SiteConfig } from '@/lib/types';
import { getOptimizedImageUrl } from '@/lib/utils/image';
import { toEgyptTime } from '@/lib/date-utils';
import AuthenticitySection from '@/components/site/AuthenticitySection';
import HomePreloader from '@/components/site/HomePreloader';

function HeroBanner({ settings, titleMain, titleAccent }: { settings: SiteConfig; titleMain: string; titleAccent: string }) {
  const heroMobileImg = settings.heroBanner?.mobileImageUrl || settings.heroBanner?.imageUrl;
  const heroDesktopImg = settings.heroBanner?.imageUrl;

  return (
    <section className="relative w-full flex flex-col md:flex-row md:items-center md:justify-center md:min-h-[600px] md:h-[80vh] bg-transparent overflow-hidden border-b border-text-muted/10">

      {/* MOBILE LAYOUT (Stacked) — Snappy, compact animation */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full md:hidden flex justify-center bg-transparent"
      >
        <img
          src={getOptimizedImageUrl(heroMobileImg, { width: 600, quality: '80' })}
          alt="Hero Banner Mobile"
          className="w-full h-auto object-contain"
        />
      </motion.div>

      <div className="md:hidden relative z-10 w-full px-6 py-10 flex flex-col items-center text-center bg-transparent">
        <motion.h1 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-4xl sm:text-5xl font-black text-white leading-tight uppercase tracking-tight drop-shadow-xl"
        >
          {(() => {
            const full = `${titleMain} ${titleAccent}`.trim();
            if (full.includes('تبدأ من')) {
              const [firstPart, ...rest] = full.split('تبدأ من');
              const restText = rest.join('تبدأ من').trim();
              return (
                <>
                  <span className="block">{firstPart.trim()}</span>
                  <span className="block mt-1">
                    تبدأ من{' '}
                    <span className="text-accent-red drop-shadow-[0_0_15px_rgba(227,30,36,0.5)]">
                      {restText || titleAccent}
                    </span>
                  </span>
                </>
              );
            }
            return (
              <>
                <span className="block">{titleMain}</span>
                <span className="text-accent-red block drop-shadow-[0_0_15px_rgba(227,30,36,0.5)]">
                  {titleAccent}
                </span>
              </>
            );
          })()}
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="font-body text-base text-text-muted max-w-2xl leading-relaxed font-light mt-4"
        >
          {settings.heroBanner?.subtitle}
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          whileTap={{ scale: 0.96 }}
        >
          <Link
            href={settings.heroBanner?.ctaLink || '/products'}
            className="inline-flex items-center justify-center gap-2.5 h-[50px] px-9 rounded-2xl bg-accent-red hover:bg-accent-red-hover text-white font-product-title font-black text-base shadow-[0_6px_25px_rgba(227,30,36,0.45)] active:scale-95 transition-all duration-200 mt-6 tracking-wide"
          >
            <span>{settings.heroBanner?.ctaText || 'اطلب الآن'}</span>
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </Link>
        </motion.div>
      </div>

      {/* DESKTOP LAYOUT (Overlaid) — Cinematic, rich staggered motion */}
      <div className="hidden md:block absolute inset-0 z-0 overflow-hidden">
        <motion.img
          src={getOptimizedImageUrl(heroDesktopImg, { width: 1200, quality: '80' })}
          alt="Hero Banner Desktop"
          fetchPriority="high"
          loading="eager"
          className="w-full h-full object-cover object-top opacity-50 pointer-events-none"
          initial={{ scale: 1.12, opacity: 0 }}
          animate={{ scale: 1.05, opacity: 0.5 }}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20 pointer-events-none h-full" />
      </div>

      <div className="hidden md:flex relative z-10 max-w-4xl mx-auto px-6 w-full flex-col items-center justify-center gap-6 text-center">
        <div className="w-full flex flex-col items-center gap-6 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-7xl font-black text-white leading-tight uppercase tracking-tight drop-shadow-2xl"
          >
            {titleMain}{' '}
            <span className="text-accent-red inline drop-shadow-[0_0_15px_rgba(227,30,36,0.5)]">
              {titleAccent}
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="font-body text-xl text-text-muted max-w-2xl leading-relaxed font-light px-2 drop-shadow-md"
          >
            {settings.heroBanner?.subtitle}
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="mt-4"
          >
            <Link
              href={settings.heroBanner?.ctaLink || '/products'}
              className="group inline-flex items-center justify-center gap-3 h-[56px] px-10 rounded-2xl bg-accent-red hover:bg-accent-red-hover text-white font-product-title font-black text-lg shadow-[0_8px_30px_rgba(227,30,36,0.45)] hover:shadow-[0_12px_40px_rgba(227,30,36,0.6)] transition-all duration-300 tracking-wide"
            >
              <span>{settings.heroBanner?.ctaText || 'اطلب الآن'}</span>
              <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover:-translate-x-1.5">arrow_back</span>
            </Link>
          </motion.div>
        </div>
      </div>

    </section>
  );
}

interface HomeClientPageProps {
  initialSettings: SiteConfig;
  initialCategories: Category[];
  initialProducts: Product[];
  initialFlashSaleProduct: Product | null;
  initialBestSellers: Product[];
}

export default function HomeClientPage({
  initialSettings,
  initialCategories,
  initialProducts,
  initialFlashSaleProduct,
  initialBestSellers,
}: HomeClientPageProps) {
  const [settings, setSettings] = useState<SiteConfig>(initialSettings);
  const [activeCategories, setActiveCategories] = useState<Category[]>(initialCategories || []);
  const [displayProducts, setDisplayProducts] = useState<Product[]>(initialProducts || []);
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts || []);
  const [flashSaleProduct, setFlashSaleProduct] = useState<Product | null>(initialFlashSaleProduct || null);
  const [bestSellers, setBestSellers] = useState<Product[]>(initialBestSellers || []);
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialProducts || initialProducts.length === 0);

  useEffect(() => {
    setHasMounted(true);

    async function refreshData() {
      try {
        const [cfg, cats, prods] = await Promise.all([
          getSiteConfig(),
          getCategories(),
          getProducts(undefined, true),
        ]);

        const isAccessory = (val?: string) => {
          if (!val) return false;
          const lower = val.toLowerCase().trim();
          return lower === 'اكسسوارات' || lower.includes('access') || lower === 'accessories';
        };

        const sortedCategories = cats
          .filter((cat) => cat.isActive)
          .sort((a, b) => {
            const aAcc = isAccessory(a.slug) || isAccessory(a.name);
            const bAcc = isAccessory(b.slug) || isAccessory(b.name);
            if (aAcc && !bAcc) return 1;
            if (!aAcc && bAcc) return -1;
            return 0;
          });

        const sortedProducts = [...prods].sort((a, b) => {
          const aAcc = isAccessory(a.category);
          const bAcc = isAccessory(b.category);
          if (aAcc && !bAcc) return 1;
          if (!aAcc && bAcc) return -1;
          return 0;
        });

        setSettings(cfg);
        setActiveCategories(sortedCategories);
        setAllProducts(prods);
        setDisplayProducts(sortedProducts);

        if (cfg.flashSale?.isActive && cfg.flashSale.productId) {
          const flashProd = prods.find((p) => p.id === cfg.flashSale!.productId);
          setFlashSaleProduct(flashProd || null);
        } else {
          setFlashSaleProduct(null);
        }

        if (cfg.bestSellers?.isActive) {
          let sortedBestSellers: Product[] = [];
          if (cfg.bestSellers.productIds && cfg.bestSellers.productIds.length > 0) {
            sortedBestSellers = cfg.bestSellers.productIds
              .map((id) => prods.find((p) => p.id === id))
              .filter(Boolean) as Product[];
          } else {
            sortedBestSellers = [...prods]
              .filter((p) => p.salesCount && p.salesCount > 0)
              .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
              .slice(0, 10);
          }
          setBestSellers(sortedBestSellers);
        } else {
          setBestSellers([]);
        }
      } catch (err) {
        console.error('Error refreshing homepage data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    refreshData();
  }, []);

  const fullTitle = settings.heroBanner?.title || 'أقوى المكملات لأعلى أداء';
  const words = fullTitle.trim().split(' ');
  const titleAccent = words.length > 1 ? words.pop()! : '';
  const titleMain = words.join(' ');

  const shippingBannerDisplayText = useMemo(() => {
    const rawText = settings.promoBanner?.text?.trim();
    if (rawText && !rawText.includes('خصم خاص') && !rawText.includes('%')) {
      return rawText;
    }
    if (settings.freeShipping?.isEnabled) {
      const threshold = settings.freeShipping.thresholdAmount;
      if (threshold && threshold > 0) {
        return `شحن مجاني لجميع محافظات مصر للأوردرات فوق ${threshold.toLocaleString('ar-EG')} ج.م 🚚📦`;
      }
      return 'شحن مجاني لجميع محافظات مصر لفترة محدودة 🚚📦';
    }
    return rawText || 'شحن سريع لجميع محافظات مصر والتوصيل لحد باب بيتك 🚚⚡';
  }, [settings.promoBanner?.text, settings.freeShipping]);

  return (
    <div className="bg-black text-text-primary overflow-x-hidden" dir="rtl">
      <HomePreloader />

      {/* Hero Banner Section */}
      <HeroBanner settings={settings} titleMain={titleMain} titleAccent={titleAccent} />

      {/* Shipping Ticker Strip (Animated Infinite Ticker Linked to Shipping) */}
      {settings.promoBanner?.isActive && (
        <Link 
          href="/shipping-policy"
          title="اضغط لمعرفة تفاصيل الشحن والتوصيل للمحافظات"
          className="block relative w-full overflow-hidden bg-accent-red hover:bg-[#ff1a22] text-white py-2.5 md:py-3.5 border-y border-white/15 shadow-[0_4px_25px_rgba(227,30,36,0.35)] z-20 select-none group transition-colors"
          dir="ltr"
        >
          <div className="animate-promo-ticker">
            {[0, 1].map((trackIdx) => (
              <div 
                key={`promo-track-${trackIdx}`}
                className="flex items-center shrink-0 gap-8 md:gap-14 px-4 md:px-7"
                dir="rtl"
              >
                {[0, 1, 2, 3].map((itemIdx) => (
                  <div 
                    key={`promo-item-${trackIdx}-${itemIdx}`}
                    className="flex items-center gap-2.5 md:gap-3.5 text-white font-product-title font-black text-base sm:text-lg md:text-xl lg:text-2xl tracking-wide whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-xl md:text-2xl lg:text-3xl text-white drop-shadow-sm group-hover:scale-110 transition-transform">
                      local_shipping
                    </span>
                    <span className="drop-shadow-sm">{shippingBannerDisplayText}</span>
                    <span className="text-white/40 text-xs md:text-sm font-bold mx-2">★</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Link>
      )}

      {/* Flash Sale Banner (Modern Minimal Athletic Design) */}
      {settings.flashSale?.isActive && flashSaleProduct && (() => {
        const hasDiscount = Boolean(flashSaleProduct.oldPrice && flashSaleProduct.oldPrice > flashSaleProduct.price);
        const savings = hasDiscount ? (flashSaleProduct.oldPrice! - flashSaleProduct.price) : 0;
        const discountPercentage = hasDiscount ? Math.round(((flashSaleProduct.oldPrice! - flashSaleProduct.price) / flashSaleProduct.oldPrice!) * 100) : 0;
        const cleanProductName = flashSaleProduct.name.replace(/_/g, ' ');

        return (
          <section className="relative w-full border-y border-white/[0.08] bg-[#090909] overflow-hidden select-none">
            
            {/* ============================================================ */}
            {/* 1. DESKTOP VIEW (hidden md:block) — Modern Clean Showcase   */}
            {/* ============================================================ */}
            <div className="hidden md:block relative w-full py-12 lg:py-16 bg-[#0a0a0a]">
              {/* Soft Subtle Ambient Radial Lighting */}
              <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[420px] h-[420px] bg-accent-red/[0.06] rounded-full blur-[140px] pointer-events-none" />

              <div className="max-w-7xl mx-auto px-6 lg:px-10 relative z-10">
                <ScrollReveal>
                  <div className="grid grid-cols-12 items-center gap-8 lg:gap-14" dir="rtl">
                    
                    {/* Right Column: Offer Details & Actions (7 cols) */}
                    <div className="col-span-7 flex flex-col items-start text-right gap-4 lg:gap-5">
                      
                      {/* Top Status & Category Row */}
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/10 px-3 py-1 rounded-full text-white/90 font-product-title font-semibold text-xs tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-red" />
                          <span>عرض خاص لفترة محدودة</span>
                        </span>
                        <span className="text-text-muted/60 text-xs font-medium">
                          المتجر الرسمي
                        </span>
                      </div>

                      {/* Product Headline (Human Clean Typography) */}
                      <h2 className="font-product-title text-3xl lg:text-5xl font-black text-white uppercase tracking-tight leading-tight">
                        {cleanProductName}
                      </h2>

                      {/* Pricing Display */}
                      <div className="flex items-baseline gap-4 py-3 border-y border-white/[0.06] w-full">
                        <div className="flex items-baseline gap-2" dir="ltr">
                          <span className="font-product-title text-3xl lg:text-4xl font-black text-white">
                            {flashSaleProduct.price} <span className="text-xs font-bold text-accent-red ml-1">EGP</span>
                          </span>
                          {hasDiscount && (
                            <span className="font-product-title text-lg text-text-muted/50 line-through">
                              {flashSaleProduct.oldPrice} EGP
                            </span>
                          )}
                        </div>

                        {hasDiscount && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-red text-white text-xs font-bold font-product-title">
                            <span>وفر {savings} EGP</span>
                            <span className="text-[10px] opacity-90">({discountPercentage}%-)</span>
                          </div>
                        )}
                      </div>

                      {/* Countdown Timer Block */}
                      <div className="flex flex-col gap-2">
                        <span className="text-xs text-text-muted font-medium tracking-wide">
                          الوقت المتبقي قبل انتهاء العرض:
                        </span>
                        <CountdownTimer
                          endDate={toEgyptTime(settings.flashSale?.endDateTime)}
                          itemClassName="flex flex-col items-center justify-center bg-[#121212] border border-white/[0.08] px-4 py-2.5 rounded-xl min-w-[65px]"
                          numberClassName="font-product-title text-2xl lg:text-3xl font-black text-white leading-none tracking-tight"
                          labelClassName="text-[10px] text-zinc-400 mt-1 uppercase font-medium"
                        />
                      </div>

                      {/* Action Button & Trust Guarantee */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-2 w-full">
                        <Link
                          href={`/products/${flashSaleProduct.slug || flashSaleProduct.id}`}
                          className="inline-flex items-center justify-center gap-2.5 bg-accent-red hover:bg-accent-red-hover text-white px-8 py-3.5 rounded-xl font-product-title text-sm sm:text-base font-bold tracking-wider transition-all duration-200 active:scale-[0.98] shadow-md shadow-accent-red/20 hover:shadow-lg hover:shadow-accent-red/35 cursor-pointer"
                        >
                          <span>اطلب العرض الآن</span>
                          <span className="material-symbols-outlined text-lg rtl:rotate-180">arrow_forward</span>
                        </Link>

                        <div className="flex flex-col text-xs text-text-muted/80 gap-0.5 font-body">
                          <span className="flex items-center gap-1.5 text-white/90 font-medium">
                            <span className="material-symbols-outlined text-sm text-emerald-400">verified</span>
                            <span>منتج أصلي 100% معتمد</span>
                          </span>
                          <span className="text-[11px] text-text-muted/70">معاينة وفحص الطلب قبل الاستلام والدفع</span>
                        </div>
                      </div>

                    </div>

                    {/* Left Column: Product Presentation Stage (5 cols) */}
                    <div className="col-span-5 flex items-center justify-center relative">
                      <div className="relative w-72 h-72 lg:w-96 lg:h-96 flex items-center justify-center">
                        <img
                          src={getOptimizedImageUrl(flashSaleProduct.images[0], { width: 600, height: 600 })}
                          alt={cleanProductName}
                          loading="lazy"
                          className="w-full h-full object-contain relative z-10 drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
                        />

                        {/* Official Special Offer Circular Stamp (ختم عرض خاص) */}
                        <div className="absolute top-0 left-0 lg:top-2 lg:left-2 z-20 pointer-events-none select-none rotate-[-12deg] drop-shadow-[0_10px_25px_rgba(0,0,0,0.85)]">
                          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-accent-red/90 p-1 flex items-center justify-center bg-black/80 backdrop-blur-md shadow-[0_0_25px_rgba(227,30,36,0.3)]">
                            {/* Inner dashed ring */}
                            <div className="w-full h-full rounded-full border border-dashed border-accent-red/70 flex flex-col items-center justify-center p-1.5 text-center">
                              <span className="text-[8px] sm:text-[9px] font-product-title uppercase font-black tracking-widest text-accent-red leading-none">
                                ★ XPOWER ★
                              </span>
                              <span className="font-display font-black text-white text-sm sm:text-base leading-tight my-0.5 drop-shadow-sm">
                                عرض خاص
                              </span>
                              {hasDiscount ? (
                                <span className="text-[10px] sm:text-[11px] font-product-title font-black text-accent-red leading-none tracking-wider">
                                  خصم {discountPercentage}%-
                                </span>
                              ) : (
                                <span className="text-[8px] sm:text-[9px] font-product-title font-bold text-text-muted/80 leading-none tracking-wider uppercase">
                                  LIMITED DEAL
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </ScrollReveal>
              </div>
            </div>

            {/* ============================================================ */}
            {/* 2. MOBILE VIEW (block md:hidden) — Clean Mobile Card        */}
            {/* ============================================================ */}
            <div className="block md:hidden relative w-full px-4 py-8 bg-[#0a0a0a]">
              <ScrollReveal>
                <div className="flex flex-col items-center text-center gap-4 relative z-10">
                  
                  {/* Mobile Top Bar */}
                  <div className="w-full flex items-center justify-between pb-3 border-b border-white/[0.08]" dir="rtl">
                    <span className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/10 px-3 py-1 rounded-full text-white/90 text-xs font-semibold font-product-title">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-red" />
                      <span>عرض خاص لفترة محدودة</span>
                    </span>
                    <span className="text-[11px] text-text-muted/70 font-medium">
                      المتجر الرسمي
                    </span>
                  </div>

                  {/* Mobile Product Visual */}
                  <div className="relative w-56 h-56 my-2 flex items-center justify-center">
                    <img
                      src={getOptimizedImageUrl(flashSaleProduct.images[0], { width: 450, height: 450 })}
                      alt={cleanProductName}
                      loading="lazy"
                      className="w-full h-full object-contain relative z-10 drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]"
                    />

                    {/* Official Special Offer Circular Stamp (ختم عرض خاص) Mobile */}
                    <div className="absolute top-0 -left-1 z-20 pointer-events-none select-none rotate-[-12deg] drop-shadow-[0_8px_20px_rgba(0,0,0,0.85)]">
                      <div className="relative w-20 h-20 rounded-full border-2 border-accent-red p-1 flex items-center justify-center bg-black/85 backdrop-blur-md">
                        {/* Inner dashed ring */}
                        <div className="w-full h-full rounded-full border border-dashed border-accent-red/80 flex flex-col items-center justify-center p-1 text-center">
                          <span className="text-[7px] font-product-title uppercase font-black tracking-widest text-accent-red leading-none">
                            ★ XPOWER ★
                          </span>
                          <span className="font-display font-black text-white text-xs leading-tight my-0.5">
                            عرض خاص
                          </span>
                          {hasDiscount ? (
                            <span className="text-[9px] font-product-title font-black text-accent-red leading-none tracking-wider">
                              خصم {discountPercentage}%-
                            </span>
                          ) : (
                            <span className="text-[7px] font-product-title font-bold text-text-muted/80 leading-none tracking-wider uppercase">
                              LIMITED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Product Title */}
                  <h2 className="font-product-title text-2xl font-black text-white uppercase tracking-tight leading-tight">
                    {cleanProductName}
                  </h2>

                  {/* Mobile Price Row */}
                  <div className="flex items-center justify-center gap-3 bg-white/[0.03] border border-white/[0.08] py-2 px-5 rounded-xl w-full max-w-sm">
                    <span className="font-product-title text-2xl font-black text-white" dir="ltr">
                      {flashSaleProduct.price} <span className="text-xs font-bold text-accent-red ml-1">EGP</span>
                    </span>
                    {hasDiscount && (
                      <>
                        <span className="text-sm text-text-muted/60 line-through font-product-title" dir="ltr">
                          {flashSaleProduct.oldPrice} EGP
                        </span>
                        <span className="bg-accent-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded font-product-title">
                          {discountPercentage}%-
                        </span>
                      </>
                    )}
                  </div>

                  {/* Mobile Countdown Timer */}
                  <div className="w-full max-w-sm flex flex-col items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-text-muted/70 font-medium">الوقت المتبقي قبل انتهاء العرض:</span>
                    <CountdownTimer
                      endDate={toEgyptTime(settings.flashSale?.endDateTime)}
                      className="flex items-center justify-center gap-2 w-full"
                      itemClassName="flex-1 flex flex-col items-center justify-center bg-[#141414] border border-white/[0.08] py-2 rounded-xl"
                      numberClassName="font-product-title text-xl font-black text-white leading-none"
                      labelClassName="text-[10px] text-text-muted/70 mt-1 uppercase font-medium"
                    />
                  </div>

                  {/* Mobile Full-Width CTA Button */}
                  <Link
                    href={`/products/${flashSaleProduct.slug || flashSaleProduct.id}`}
                    className="w-full max-w-sm bg-accent-red hover:bg-accent-red-hover text-white py-3.5 rounded-xl font-product-title font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-accent-red/25 mt-2"
                  >
                    <span>اطلب العرض الآن</span>
                    <span className="material-symbols-outlined text-lg rtl:rotate-180">arrow_forward</span>
                  </Link>

                  {/* Mobile Trust Micro-Perks */}
                  <div className="flex items-center justify-center gap-4 text-[11px] text-text-muted/70 font-body pt-1">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-emerald-400">verified</span>
                      <span>أصلي 100% معتمد</span>
                    </span>
                    <span>•</span>
                    <span>معاينة قبل الدفع</span>
                    <span>•</span>
                    <span>دفع عند الاستلام</span>
                  </div>

                </div>
              </ScrollReveal>
            </div>

          </section>
        );
      })()}

      {/* Quick Categories grid */}
      {activeCategories.length > 0 && (
        <section className="py-8 md:py-12 px-1 md:px-2 max-w-full mx-auto w-full bg-transparent">
          <ScrollReveal>
            <div className="text-center mb-6 md:mb-10 relative">
              <h2 className="font-display text-3xl md:text-5xl font-black text-white inline-flex flex-col items-center gap-2">
                أقسام تهمك
                <span className="w-16 h-1.5 bg-accent-red rounded-full"></span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 px-2 md:px-0">
            {activeCategories.slice(0, 8).map((category, index) => (
              <ScrollReveal key={category.id} delay={index * 100}>
                <Link
                  href={`/products?category=${category.slug}`}
                  className="group flex flex-col gap-2 md:gap-3 cursor-pointer"
                >
                  {/* Square Image Card with Card 02 3D Design Template */}
                  <div className="relative w-full aspect-square bg-[#0a0a0a] rounded-[20px] md:rounded-[30px] overflow-hidden border border-white/10 group-hover:border-accent-red/60 transition-all duration-500 shadow-[0_10px_25px_rgba(0,0,0,0.6)] group-hover:shadow-[0_15px_35px_rgba(227,30,36,0.35)]">

                    {/* Card 02 3D Metallic X & Honeycomb Background Template */}
                    <img 
                      src="/images/categories/category-card-bg.jpg" 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 select-none pointer-events-none"
                    />

                    {/* Ambient Glow Overlay */}
                    <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/10 to-black/40 pointer-events-none"></div>

                    {/* Dynamic 3D Arabic Text from Admin */}
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none p-1.5 sm:p-2.5 text-center">
                      <span
                        className="font-display text-white font-black text-[26px] sm:text-[32px] md:text-[40px] lg:text-[50px] drop-shadow-[0_10px_15px_rgba(0,0,0,0.95)] tracking-tight leading-tight text-center select-none flex flex-col items-center justify-center gap-1.5 sm:gap-2 md:gap-2.5"
                        style={{
                          WebkitTextStroke: '1.2px rgba(255,255,255,0.9)',
                          textShadow: '0 2px 0 #7a0609, 0 4px 0 #4a0204, 0 8px 15px rgba(0,0,0,0.9), 0 0 30px rgba(227,30,36,0.85)'
                        }}
                      >
                        {category.name.trim().split(/\s+/).map((part, pIdx) => (
                          <span key={pIdx} className="block whitespace-nowrap">
                            {part}
                          </span>
                        ))}
                      </span>
                    </div>

                    {/* Bottom Right Chevron Button (Card 02 Style) */}
                    <div className="absolute bottom-2.5 right-2.5 md:bottom-3.5 md:right-3.5 w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center bg-black/80 border border-accent-red/70 text-accent-red z-20 group-hover:bg-accent-red group-hover:text-white transition-all duration-300 shadow-[0_0_12px_rgba(227,30,36,0.4)]">
                      <span className="material-symbols-outlined text-[16px] md:text-[20px]">chevron_right</span>
                    </div>
                  </div>

                  {/* English Collection Name & Arrow Below */}
                  <div className="flex items-center justify-between px-1">
                    <span className="font-product-title text-white text-[9px] md:text-[11px] font-bold tracking-wider uppercase opacity-90 group-hover:opacity-100 transition-opacity">
                      {category.slug === 'protein' ? 'PROTEIN COLLECTION' :
                        category.slug === 'creatine' ? 'CREATINE COLLECTION' :
                          category.slug === 'carbs' ? 'CARB COLLECTION' :
                            category.slug === 'mass-gainer' ? 'PUMP COLLECTION' :
                              category.slug === 'cream-of-rice' ? 'CREAM OF RICE' :
                                `${category.slug.replace(/-/g, ' ')} COLLECTION`}
                    </span>
                    <span className="text-text-muted text-[10px] md:text-xs">
                      <span className="material-symbols-outlined text-[16px] md:text-[20px] rtl:rotate-180 opacity-60 group-hover:opacity-100 group-hover:text-accent-red transition-all group-hover:translate-x-1">arrow_right_alt</span>
                    </span>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </section>
      )}

      {/* Best Sellers Section */}
      {settings.bestSellers?.isActive && bestSellers.length > 0 && (
        <section className="py-10 md:py-20 px-6 max-w-7xl mx-auto w-full">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 gap-4">
              <h2 className="font-display text-2xl md:text-3xl font-black flex items-center gap-4 text-white">
                <span className="w-8 h-1 bg-accent-red inline-block"></span>
                الأكثر مبيعاً
              </h2>
              <p className="text-text-muted font-body text-sm max-w-md">المنتجات اللي كل الرياضيين بيثقوا فيها وبيطلبوها باستمرار.</p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <BestSellersSlider products={bestSellers} />
          </ScrollReveal>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-10 md:py-20 px-6 max-w-7xl mx-auto w-full bg-transparent border-y border-text-muted/5">
        <ScrollReveal>
          <h2 className="font-display text-2xl md:text-3xl font-black mb-8 md:mb-12 flex items-center gap-4 text-white">
            <span className="w-8 h-1 bg-accent-red inline-block"></span>
            أفضل المنتجات
          </h2>
        </ScrollReveal>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-white/5 animate-pulse h-64 md:h-80" />
            ))}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="text-center py-12 text-text-muted font-body">
            مفيش منتجات مميزة دلوقتي. جرب تزورنا بعدين.
          </div>
        ) : (
          <ScrollReveal delay={150}>
            <BestSellersSlider products={displayProducts} />
          </ScrollReveal>
        )}

        <ScrollReveal className="flex justify-center mt-12">
          <Link
            href="/products"
            className="group relative flex items-center justify-center gap-2 border-2 border-accent-red text-white px-10 py-3.5 rounded-full font-product-title text-sm font-bold transition-all duration-300 overflow-hidden hover:shadow-[0_0_20px_rgba(227,30,36,0.3)] hover:scale-105"
          >
            <div className="absolute inset-0 bg-accent-red -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-0"></div>
            <div className="relative z-10 flex items-center justify-center gap-2 w-full">
              <span>شوف كل المنتجات</span>
              <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-2">arrow_back</span>
            </div>
          </Link>
        </ScrollReveal>
      </section>

      {/* All Products Marquee Section */}
      {isLoading ? (
        <div className="w-full h-12 bg-white/5 animate-pulse my-8" />
      ) : (
        <AllProductsMarquee products={allProducts} />
      )}

      {/* Why Choose Xpower */}
      <section className="py-12 md:py-24 px-6 relative w-full overflow-hidden bg-transparent border-y border-white/5">
        <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none mix-blend-screen" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[400px] bg-accent-red/20 blur-[150px] rounded-full pointer-events-none -z-10 opacity-60"></div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <ScrollReveal>
            <div className="text-center mb-10 md:mb-24 relative">
              <span className="font-product-title text-accent-red tracking-[0.2em] text-xs md:text-sm font-bold uppercase mb-4 block">The Gold Standard</span>
              <h2 className="font-display text-4xl md:text-6xl font-black text-white inline-block relative z-10 uppercase tracking-tight">
                ليه تختار Xpower؟
              </h2>
              <div className="flex justify-center mt-6">
                <div className="w-24 h-1.5 bg-gradient-to-r from-transparent via-accent-red to-transparent rounded-full opacity-80" />
              </div>
              <p className="text-text-muted font-body mt-6 max-w-2xl mx-auto text-base md:text-lg leading-relaxed px-4">
                مش مجرد متجر مكملات. إحنا شريكك في رحلة الوصول لأقوى نسخة من نفسك بأمان وبأقصى سرعة.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 lg:gap-10">
            <ScrollReveal delay={0} className="col-span-1 md:col-span-1">
              <div className="group relative flex flex-col items-center justify-center text-center bg-[#050505] md:bg-gradient-to-b md:from-[#111111] md:to-[#050505] border border-accent-red/80 md:border-white/5 rounded-2xl md:rounded-[2.5rem] p-4 md:p-10 shadow-[0_0_15px_rgba(227,30,36,0.15)] md:shadow-none hover:border-accent-red/50 transition-all duration-500 md:hover:-translate-y-3 md:hover:shadow-[0_20px_40px_rgba(227,30,36,0.15)] overflow-hidden h-full">
                <span className="hidden md:block absolute -top-10 -right-6 text-[150px] font-display font-black text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.03)] group-hover:[-webkit-text-stroke:2px_rgba(227,30,36,0.1)] transition-all duration-700 select-none z-0">01</span>

                <div className="relative w-8 h-8 md:w-24 md:h-24 mb-2 md:mb-8 z-10 flex items-center justify-center">
                  <div className="hidden md:block absolute inset-0 bg-accent-red/20 rounded-full blur-xl group-hover:bg-accent-red/40 transition-colors duration-500" />
                  <div className="hidden md:flex relative items-center justify-center w-full h-full bg-[#0a0a0a] border border-white/10 rounded-full group-hover:border-accent-red/50 transition-all duration-500 overflow-hidden">
                    <div className="absolute inset-[-50%] w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(227,30,36,1)_360deg)] animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-[2px] bg-[#0a0a0a] rounded-full flex items-center justify-center group-hover:bg-[#110505] transition-colors duration-500">
                      <svg className="w-10 h-10 text-white group-hover:text-accent-red transition-all duration-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] group-hover:drop-shadow-[0_0_15px_rgba(227,30,36,0.8)] group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
                        <path d="M2 9h20" />
                        <path d="M12 21V9" />
                        <path d="M18 3l-6 6-6-6" />
                      </svg>
                    </div>
                  </div>
                  <svg className="md:hidden w-8 h-8 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
                    <path d="M2 9h20" />
                    <path d="M12 21V9" />
                    <path d="M18 3l-6 6-6-6" />
                  </svg>
                </div>

                <h3 className="font-display text-white text-[12px] md:text-2xl font-black mb-0 md:mb-4 uppercase italic md:not-italic tracking-wider md:tracking-wide relative z-10 drop-shadow-md">جودة ملهاش مثيل</h3>
                <p className="hidden md:block text-text-muted font-body text-[15px] leading-relaxed relative z-10">
                  بنقدم فقط المكملات اللي اتعملها اختبارات نقاء صارمة لضمان الفعالية والأمان الرياضي الكامل.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={150} className="col-span-1 md:col-span-1">
              <div className="group relative flex flex-col items-center justify-center text-center bg-[#050505] md:bg-gradient-to-b md:from-[#111111] md:to-[#050505] border border-accent-red/80 md:border-white/5 rounded-2xl md:rounded-[2.5rem] p-4 md:p-10 shadow-[0_0_15px_rgba(227,30,36,0.15)] md:shadow-none hover:border-accent-red/50 transition-all duration-500 md:hover:-translate-y-3 md:hover:shadow-[0_20px_40px_rgba(227,30,36,0.15)] overflow-hidden h-full">
                <span className="hidden md:block absolute -top-10 -right-6 text-[150px] font-display font-black text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.03)] group-hover:[-webkit-text-stroke:2px_rgba(227,30,36,0.1)] transition-all duration-700 select-none z-0">02</span>

                <div className="relative w-8 h-8 md:w-24 md:h-24 mb-2 md:mb-8 z-10 flex items-center justify-center">
                  <div className="hidden md:block absolute inset-0 bg-accent-red/20 rounded-full blur-xl group-hover:bg-accent-red/40 transition-colors duration-500" />
                  <div className="hidden md:flex relative items-center justify-center w-full h-full bg-[#0a0a0a] border border-white/10 rounded-full group-hover:border-accent-red/50 transition-all duration-500 overflow-hidden">
                    <div className="absolute inset-[-50%] w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(227,30,36,1)_360deg)] animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-[2px] bg-[#0a0a0a] rounded-full flex items-center justify-center group-hover:bg-[#110505] transition-colors duration-500">
                      <svg className="w-10 h-10 text-white group-hover:text-accent-red transition-all duration-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] group-hover:drop-shadow-[0_0_15px_rgba(227,30,36,0.8)] group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="M9 12l2 2 4-4" />
                      </svg>
                    </div>
                  </div>
                  <svg className="md:hidden w-8 h-8 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>

                <h3 className="font-display text-white text-[12px] md:text-2xl font-black mb-0 md:mb-4 uppercase italic md:not-italic tracking-wider md:tracking-wide relative z-10 drop-shadow-md">أصالة مضمونة</h3>
                <p className="hidden md:block text-text-muted font-body text-[15px] leading-relaxed relative z-10">
                  منتجات مستوردة مباشرة من الشركات المصنعة، مع كود تأكيد الأصالة وضمان استرجاع فوري.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={300} className="col-span-1 md:col-span-1">
              <div className="group relative flex flex-col items-center justify-center text-center bg-[#050505] md:bg-gradient-to-b md:from-[#111111] md:to-[#050505] border border-accent-red/80 md:border-white/5 rounded-2xl md:rounded-[2.5rem] p-4 md:p-10 shadow-[0_0_15px_rgba(227,30,36,0.15)] md:shadow-none hover:border-accent-red/50 transition-all duration-500 md:hover:-translate-y-3 md:hover:shadow-[0_20px_40px_rgba(227,30,36,0.15)] overflow-hidden h-full py-6 md:py-10">
                <span className="hidden md:block absolute -top-10 -right-6 text-[150px] font-display font-black text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.03)] group-hover:[-webkit-text-stroke:2px_rgba(227,30,36,0.1)] transition-all duration-700 select-none z-0">03</span>

                <div className="relative w-8 h-8 md:w-24 md:h-24 mb-2 md:mb-8 z-10 flex items-center justify-center">
                  <div className="hidden md:block absolute inset-0 bg-accent-red/20 rounded-full blur-xl group-hover:bg-accent-red/40 transition-colors duration-500" />
                  <div className="hidden md:flex relative items-center justify-center w-full h-full bg-[#0a0a0a] border border-white/10 rounded-full group-hover:border-accent-red/50 transition-all duration-500 overflow-hidden">
                    <div className="absolute inset-[-50%] w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(227,30,36,1)_360deg)] animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-[2px] bg-[#0a0a0a] rounded-full flex items-center justify-center group-hover:bg-[#110505] transition-colors duration-500">
                      <svg className="w-10 h-10 text-white group-hover:text-accent-red transition-all duration-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] group-hover:drop-shadow-[0_0_15px_rgba(227,30,36,0.8)] group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                        <path d="M12 14v4" />
                        <path d="M12 8l-2 3h4l-2 3" className="stroke-accent-red group-hover:stroke-white transition-colors duration-300" />
                      </svg>
                    </div>
                  </div>
                  <svg className="md:hidden w-8 h-8 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                    <path d="M12 14v4" />
                  </svg>
                </div>

                <h3 className="font-display text-white text-[12px] md:text-2xl font-black mb-0 md:mb-4 uppercase italic md:not-italic tracking-wider md:tracking-wide relative z-10 drop-shadow-md">دعم فني رياضي</h3>
                <p className="hidden md:block text-text-muted font-body text-[15px] leading-relaxed relative z-10">
                  فريق من المدربين جاهز يرد على استشاراتك ويساعدك تختار أفضل مكمل يناسب فورمتك.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={450} className="col-span-1 md:col-span-1">
              <div className="group relative flex flex-col items-center justify-center text-center bg-[#050505] md:bg-gradient-to-b md:from-[#111111] md:to-[#050505] border border-accent-red/80 md:border-white/5 rounded-2xl md:rounded-[2.5rem] p-4 md:p-10 shadow-[0_0_15px_rgba(227,30,36,0.15)] md:shadow-none hover:border-accent-red/50 transition-all duration-500 md:hover:-translate-y-3 md:hover:shadow-[0_20px_40px_rgba(227,30,36,0.15)] overflow-hidden h-full py-6 md:py-10">
                <span className="hidden md:block absolute -top-10 -right-6 text-[150px] font-display font-black text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.03)] group-hover:[-webkit-text-stroke:2px_rgba(227,30,36,0.1)] transition-all duration-700 select-none z-0">04</span>

                <div className="relative w-8 h-8 md:w-24 md:h-24 mb-2 md:mb-8 z-10 flex items-center justify-center">
                  <div className="hidden md:block absolute inset-0 bg-accent-red/20 rounded-full blur-xl group-hover:bg-accent-red/40 transition-colors duration-500" />
                  <div className="hidden md:flex relative items-center justify-center w-full h-full bg-[#0a0a0a] border border-white/10 rounded-full group-hover:border-accent-red/50 transition-all duration-500 overflow-hidden">
                    <div className="absolute inset-[-50%] w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(227,30,36,1)_360deg)] animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-[2px] bg-[#0a0a0a] rounded-full flex items-center justify-center group-hover:bg-[#110505] transition-colors duration-500">
                      <svg className="w-10 h-10 text-white group-hover:text-accent-red transition-all duration-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] group-hover:drop-shadow-[0_0_15px_rgba(227,30,36,0.8)] group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="3" width="15" height="13" />
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                        <circle cx="5.5" cy="18.5" r="2.5" />
                        <circle cx="18.5" cy="18.5" r="2.5" />
                      </svg>
                    </div>
                  </div>
                  <svg className="md:hidden w-8 h-8 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>

                <h3 className="font-display text-white text-[12px] md:text-2xl font-black mb-0 md:mb-4 uppercase italic md:not-italic tracking-wider md:tracking-wide relative z-10 drop-shadow-md">توصيل صاروخي</h3>
                <p className="hidden md:block text-text-muted font-body text-[15px] leading-relaxed relative z-10">
                  شحن سريع لجميع المحافظات مع إمكانية الدفع عند الاستلام بعد التأكد من طلبك.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={600} className="col-span-2 md:col-span-1">
              <div className="group relative flex flex-col items-center justify-center text-center bg-[#050505] md:bg-gradient-to-b md:from-[#111111] md:to-[#050505] border border-accent-red/80 md:border-white/5 rounded-2xl md:rounded-[2.5rem] p-4 md:p-10 shadow-[0_0_15px_rgba(227,30,36,0.15)] md:shadow-none hover:border-accent-red/50 transition-all duration-500 md:hover:-translate-y-3 md:hover:shadow-[0_20px_40px_rgba(227,30,36,0.15)] overflow-hidden h-full py-6 md:py-10">
                <span className="hidden md:block absolute -top-10 -right-6 text-[150px] font-display font-black text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.03)] group-hover:[-webkit-text-stroke:2px_rgba(227,30,36,0.1)] transition-all duration-700 select-none z-0">05</span>

                <div className="relative w-8 h-8 md:w-24 md:h-24 mb-2 md:mb-8 z-10 flex items-center justify-center">
                  <div className="hidden md:block absolute inset-0 bg-accent-red/20 rounded-full blur-xl group-hover:bg-accent-red/40 transition-colors duration-500" />
                  <div className="hidden md:flex relative items-center justify-center w-full h-full bg-[#0a0a0a] border border-white/10 rounded-full group-hover:border-accent-red/50 transition-all duration-500 overflow-hidden">
                    <div className="absolute inset-[-50%] w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(227,30,36,1)_360deg)] animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-[2px] bg-[#0a0a0a] rounded-full flex items-center justify-center group-hover:bg-[#110505] transition-colors duration-500">
                      <svg className="w-10 h-10 text-white group-hover:text-accent-red transition-all duration-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] group-hover:drop-shadow-[0_0_15px_rgba(227,30,36,0.8)] group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                    </div>
                  </div>
                  <svg className="md:hidden w-8 h-8 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                </div>

                <h3 className="font-display text-white text-[12px] md:text-2xl font-black mb-0 md:mb-4 uppercase italic md:not-italic tracking-wider md:tracking-wide relative z-10 drop-shadow-md">أقوى العروض</h3>
                <p className="hidden md:block text-text-muted font-body text-[15px] leading-relaxed relative z-10">
                  أسعار منافسة وخصومات حصرية مبتحصلش غير عندنا عشان نوفرلك الأفضل بسعر يناسبك.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Authenticity Check Section — only rendered when active in settings */}
      {settings.authenticityCheck?.isActive && (
        <AuthenticitySection settings={settings} />
      )}

    </div>
  );
}
