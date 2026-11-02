'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/lib/types';
import { getOptimizedImageUrl } from '@/lib/utils/image';
import { toEgyptTime } from '@/lib/date-utils';
import CountdownTimer from '@/components/site/CountdownTimer';
import ScrollReveal from '@/components/site/ScrollReveal';

export type FlashSaleDateInput = string | Date | { seconds: number; nanoseconds?: number } | { toDate: () => Date } | null | undefined;

export interface FlashSaleOfferItem {
  product: Product;
  endDateTime?: FlashSaleDateInput;
  badgeText?: string;
}

interface FlashSaleBigCardProps {
  offers: FlashSaleOfferItem[];
  defaultEndDateTime?: FlashSaleDateInput;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 35 : -35,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -35 : 35,
    opacity: 0,
  }),
};

export default function FlashSaleBigCard({ offers, defaultEndDateTime }: FlashSaleBigCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  // Touch swipe support for mobile
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const offersCount = offers ? offers.length : 0;
  const hasMultipleOffers = offersCount > 1;

  // Auto-play timer: slides automatically every 3 seconds if multiple offers exist
  useEffect(() => {
    if (!hasMultipleOffers || isPaused) return;

    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % offersCount);
    }, 3000);

    return () => clearInterval(timer);
  }, [hasMultipleOffers, isPaused, offersCount]);

  if (!offers || offers.length === 0) return null;

  const currentOffer = offers[currentIndex] || offers[0];
  const product = currentOffer.product;
  const hasDiscount = Boolean(product.oldPrice && product.oldPrice > product.price);
  const savings = hasDiscount ? (product.oldPrice! - product.price) : 0;
  const discountPercentage = hasDiscount 
    ? Math.round(((product.oldPrice! - product.price) / product.oldPrice!) * 100) 
    : 0;
  const cleanProductName = product.name.replace(/_/g, ' ');
  const targetEndDate = currentOffer.endDateTime || defaultEndDateTime;

  const handleNext = () => {
    if (offersCount === 0) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % offersCount);
  };

  const handlePrev = () => {
    if (offersCount === 0) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + offersCount) % offersCount);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 40;
    const isRightSwipe = distance < -40;
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <section className="relative w-full border-y border-white/[0.08] bg-[#070707] py-4 sm:py-10 lg:py-16 overflow-hidden select-none">
      {/* Soft Subtle Ambient Radial Lighting */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] bg-accent-red/[0.06] rounded-full blur-[120px] sm:blur-[160px] pointer-events-none" />

      <div className="w-full max-w-6xl mx-auto px-0 sm:px-6 relative z-10">
        <ScrollReveal>
          {/* Big Athletic Showcase Ad Card — Cinematic Hero (ستايل عالمي مفتوح) */}
          <div 
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={(e) => {
              setIsPaused(true);
              handleTouchStart(e);
            }}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => {
              handleTouchEnd();
              setTimeout(() => setIsPaused(false), 2500);
            }}
            className="relative rounded-none sm:rounded-3xl border-0 sm:border sm:border-white/[0.08] hover:border-accent-red/30 bg-gradient-to-b from-[#0d0d0f] via-[#09090a] to-[#050506] px-4 py-5 sm:p-10 lg:p-12 overflow-hidden shadow-none sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] transition-all duration-300"
          >
            {/* Top metallic glow line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-red/50 to-transparent pointer-events-none" />
            
            {/* Ambient fiery backlight behind product */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-accent-red/[0.12] rounded-full blur-[130px] pointer-events-none" />

            {/* ============================================================ */}
            {/* Top Bar: Minimalist & Clean on both Mobile & Desktop         */}
            {/* ============================================================ */}
            <div className="w-full flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-8 border-b border-white/[0.06] relative z-20" dir="rtl">
              
              {/* Right: Sleek Special Offer Pill */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 bg-accent-red/10 border border-accent-red/30 px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(227,30,36,0.2)] backdrop-blur-md">
                  <span className="relative flex h-2 w-2 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-red opacity-80" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-red shadow-[0_0_6px_#E31E24]" />
                  </span>
                  <span className="material-symbols-outlined text-accent-red text-base select-none">
                    local_fire_department
                  </span>
                  <span className="font-display font-black text-xs sm:text-sm text-white tracking-wide">
                    {currentOffer.badgeText || 'عرض خاص لفترة محدودة'}
                  </span>
                </div>
              </div>

              {/* Left: Counter Badge & Minimal Dots */}
              {hasMultipleOffers && (
                <div className="flex items-center gap-2 sm:gap-3" dir="ltr">
                  <span className="text-xs font-product-title font-bold text-accent-red bg-accent-red/10 border border-accent-red/20 px-2.5 py-0.5 rounded-full" dir="rtl">
                    {currentIndex + 1} / {offers.length}
                  </span>

                  <div className="hidden sm:flex items-center gap-1.5">
                    {offers.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setDirection(i > currentIndex ? 1 : -1);
                          setCurrentIndex(i);
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                          i === currentIndex ? 'w-6 bg-accent-red shadow-[0_0_8px_#E31E24]' : 'w-2 bg-white/20 hover:bg-white/40'
                        }`}
                        aria-label={`الانتقال للعرض ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop & Tablet Floating Side Arrows */}
            {hasMultipleOffers && (
              <>
                <button
                  type="button"
                  onClick={handleNext}
                  className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/75 hover:bg-accent-red text-white border border-white/15 hover:border-accent-red items-center justify-center transition-all active:scale-95 shadow-xl backdrop-blur-md cursor-pointer"
                  aria-label="العرض التالي"
                >
                  <span className="material-symbols-outlined text-xl">arrow_forward_ios</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/75 hover:bg-accent-red text-white border border-white/15 hover:border-accent-red items-center justify-center transition-all active:scale-95 shadow-xl backdrop-blur-md cursor-pointer"
                  aria-label="العرض السابق"
                >
                  <span className="material-symbols-outlined text-xl">arrow_back_ios</span>
                </button>
              </>
            )}

            {/* Slide Body with AnimatePresence */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={`offer-slide-${product.id}-${currentIndex}`}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                {/* ============================================================ */}
                {/* 1. DESKTOP VIEW (hidden lg:grid) — Cinematic Open Hero Stage */}
                {/* ============================================================ */}
                <div className="hidden lg:grid lg:grid-cols-12 gap-8 lg:gap-14 items-center relative z-10" dir="rtl">
                  
                  {/* Right Column: Hero Headline & Action Deck (7 cols) */}
                  <div className="lg:col-span-7 flex flex-col items-start text-right gap-5">
                    
                    {/* Headline Title */}
                    <h2 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-white uppercase tracking-tight leading-[1.08] hover:text-accent-red transition-colors">
                      <Link href={`/products/${product.slug || product.id}`}>
                        {cleanProductName}
                      </Link>
                    </h2>

                    {/* Short Punchy Narrative Pitch */}
                    <p className="text-sm lg:text-base text-zinc-300 font-body leading-relaxed max-w-xl">
                      {product.description || 'بكج متكامل مصمم خصيصاً لتحقيق أقصى ضخ دموي، زيادة الكتلة العضلية، وتحفيز الطاقة والاستشفاء بدون هبوط.'}
                    </p>

                    {/* Open Fluid Pricing & Telemetry (No Clunky Box!) */}
                    <div className="flex flex-wrap items-center gap-6 lg:gap-8 pt-3 pb-3 border-y border-white/[0.06] w-full">
                      {/* Price Stack */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-baseline gap-2.5" dir="ltr">
                          <span className="font-display font-black text-4xl sm:text-5xl text-white tracking-tight">
                            {product.price}
                          </span>
                          <span className="font-product-title font-bold text-accent-red text-xl">EGP</span>
                          {hasDiscount && (
                            <span className="font-product-title text-zinc-500 line-through text-lg ml-2">
                              {product.oldPrice} EGP
                            </span>
                          )}
                        </div>
                        {hasDiscount && (
                          <span className="text-xs font-bold text-accent-red font-body">
                            وفرت {savings} EGP من السعر الأصلي
                          </span>
                        )}
                      </div>

                      {/* Subtle Vertical Divider */}
                      <div className="hidden sm:block h-12 w-px bg-white/10" />

                      {/* Countdown Timer Block */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-zinc-400 font-medium">ينتهي العرض خلال:</span>
                        <CountdownTimer
                          endDate={toEgyptTime(targetEndDate)}
                          itemClassName="flex flex-col items-center justify-center bg-white/[0.04] border border-white/[0.08] px-3.5 py-1.5 rounded-xl min-w-[54px]"
                          numberClassName="font-product-title text-xl font-black text-white leading-none"
                          labelClassName="text-[9px] text-zinc-400 mt-1 uppercase font-body"
                        />
                      </div>
                    </div>

                    {/* High-Impact Tactical CTA & Trust */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-5 pt-2 w-full">
                      <Link
                        href={`/products/${product.slug || product.id}`}
                        className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-accent-red via-[#e31e24] to-[#b31419] hover:from-[#ff2d33] hover:to-accent-red text-white px-9 py-4 rounded-xl font-display font-black text-base sm:text-lg tracking-wide transition-all duration-300 shadow-[0_12px_30px_rgba(227,30,36,0.35)] hover:shadow-[0_16px_40px_rgba(227,30,36,0.5)] active:scale-[0.98] group/btn cursor-pointer"
                      >
                        <span>اطلب العرض الآن</span>
                        <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover/btn:-translate-x-1">
                          arrow_back
                        </span>
                      </Link>

                      <div className="flex items-center gap-4 text-xs text-zinc-400 font-body">
                        <div className="flex items-center gap-1.5 text-white/90">
                          <span className="material-symbols-outlined text-emerald-400 text-base">verified_user</span>
                          <span>أصلي 100% ومضمون</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-accent-red text-base">local_shipping</span>
                          <span>معاينة وفحص قبل الدفع</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Left Column: Free-Floating 3D Hero Product Stage (5 cols) */}
                  <div className="lg:col-span-5 relative w-full aspect-square max-h-[420px] flex items-center justify-center group/hero">
                    {/* Elliptical 3D Floor Halo & Shadow */}
                    <div className="absolute bottom-2 inset-x-8 h-8 bg-accent-red/25 rounded-full blur-2xl pointer-events-none group-hover/hero:bg-accent-red/35 transition-colors duration-500" />
                    <div className="absolute bottom-4 inset-x-12 h-3 bg-black/90 rounded-full blur-sm pointer-events-none" />

                    {/* Floating Dark Glass & Neon Glow Savings Badge */}
                    {hasDiscount && (
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/85 border border-accent-red/60 shadow-[0_0_20px_rgba(227,30,36,0.35)] backdrop-blur-md">
                        <span className="material-symbols-outlined text-accent-red text-base select-none">
                          local_fire_department
                        </span>
                        <span className="font-display font-bold text-xs text-white/90">خصم</span>
                        <span className="font-product-title font-black text-sm text-accent-red tracking-wider" dir="ltr">
                          {discountPercentage}%
                        </span>
                      </div>
                    )}

                    {/* Product Bundle Image */}
                    <Link href={`/products/${product.slug || product.id}`} className="relative z-10 w-full h-full flex items-center justify-center transition-transform duration-500 ease-out group-hover/hero:scale-105">
                      <img
                        src={getOptimizedImageUrl(product.images[0], { width: 750, height: 750 })}
                        alt={cleanProductName}
                        loading="lazy"
                        className="w-full h-full object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.95)]"
                      />
                    </Link>
                  </div>

                </div>

                {/* ============================================================ */}
                {/* 2. MOBILE VIEW (block lg:hidden) — Clean Open Cinematic Flow */}
                {/* ============================================================ */}
                <div className="block lg:hidden relative w-full">
                  <div className="flex flex-col items-center text-center gap-4 relative z-10">
                    
                    {/* Free-Floating Mobile Stage with In-stage Arrows */}
                    <div className="relative w-full max-w-[300px] aspect-square max-h-[260px] flex items-center justify-center">
                      {/* Floor Halo */}
                      <div className="absolute bottom-2 inset-x-6 h-6 bg-accent-red/25 rounded-full blur-xl pointer-events-none" />

                      {/* Floating Dark Glass & Neon Glow Discount Tag */}
                      {hasDiscount && (
                        <div className="absolute top-2 right-2 z-20 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/85 border border-accent-red/60 shadow-[0_0_15px_rgba(227,30,36,0.3)] backdrop-blur-md">
                          <span className="material-symbols-outlined text-accent-red text-sm select-none">
                            local_fire_department
                          </span>
                          <span className="font-display font-bold text-[11px] text-white/90">خصم</span>
                          <span className="font-product-title font-black text-xs text-accent-red tracking-wider" dir="ltr">
                            {discountPercentage}%
                          </span>
                        </div>
                      )}

                      {/* Mobile Product Image */}
                      <Link href={`/products/${product.slug || product.id}`} className="relative z-10 w-full h-full flex items-center justify-center">
                        <img
                          src={getOptimizedImageUrl(product.images[0], { width: 500, height: 500 })}
                          alt={cleanProductName}
                          loading="lazy"
                          className="w-full h-full object-contain drop-shadow-[0_16px_30px_rgba(0,0,0,0.9)]"
                        />
                      </Link>

                      {/* Floating Mobile Arrows (تم تنزيلها لأسفل قليلاً لتكون مريحة للإبهام ولا تغطي رؤوس المنتجات) */}
                      {hasMultipleOffers && (
                        <div className="flex items-center justify-between w-full absolute top-[62%] -translate-y-1/2 -px-1 pointer-events-none z-30">
                          <button
                            type="button"
                            onClick={handlePrev}
                            className="pointer-events-auto w-9 h-9 rounded-full bg-black/85 border border-white/15 hover:border-accent-red text-white flex items-center justify-center active:scale-90 transition-transform shadow-lg backdrop-blur-md cursor-pointer"
                            aria-label="العرض السابق"
                          >
                            <span className="material-symbols-outlined text-base">chevron_right</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleNext}
                            className="pointer-events-auto w-9 h-9 rounded-full bg-black/85 border border-white/15 hover:border-accent-red text-white flex items-center justify-center active:scale-90 transition-transform shadow-lg backdrop-blur-md cursor-pointer"
                            aria-label="العرض التالي"
                          >
                            <span className="material-symbols-outlined text-base">chevron_left</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Mobile Dots Indicator */}
                    {hasMultipleOffers && (
                      <div className="flex items-center justify-center gap-1.5">
                        {offers.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setDirection(i > currentIndex ? 1 : -1);
                              setCurrentIndex(i);
                            }}
                            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                              i === currentIndex ? 'w-5 bg-accent-red shadow-[0_0_8px_#E31E24]' : 'w-1.5 bg-white/20'
                            }`}
                            aria-label={`العرض ${i + 1}`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Mobile Title */}
                    <h2 className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-tight leading-tight">
                      <Link href={`/products/${product.slug || product.id}`}>
                        {cleanProductName}
                      </Link>
                    </h2>

                    {/* Mobile Open Price Display */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-baseline gap-2" dir="ltr">
                        <span className="font-display font-black text-3xl text-white">
                          {product.price}
                        </span>
                        <span className="font-product-title font-bold text-accent-red text-base">EGP</span>
                        {hasDiscount && (
                          <span className="font-product-title text-sm text-zinc-500 line-through ml-1.5">
                            {product.oldPrice} EGP
                          </span>
                        )}
                      </div>
                      {hasDiscount && (
                        <span className="text-xs text-accent-red font-bold font-body">
                          وفرت {savings} EGP من السعر الأصلي
                        </span>
                      )}
                    </div>

                    {/* Mobile Countdown Timer */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-zinc-400 font-medium">ينتهي خلال:</span>
                      <CountdownTimer
                        endDate={toEgyptTime(targetEndDate)}
                        className="flex items-center gap-1.5"
                        itemClassName="flex flex-col items-center justify-center bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded-xl min-w-[42px]"
                        numberClassName="font-product-title text-base font-black text-white leading-none"
                        labelClassName="text-[8px] text-zinc-400 mt-0.5 uppercase font-body"
                      />
                    </div>

                    {/* Mobile Full-Width Athletic Button */}
                    <Link
                      href={`/products/${product.slug || product.id}`}
                      className="w-full max-w-sm bg-gradient-to-r from-accent-red via-[#e31e24] to-[#b31419] hover:from-[#ff2d33] hover:to-accent-red text-white py-3.5 rounded-xl font-display font-black text-base tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-accent-red/30 cursor-pointer"
                    >
                      <span>اطلب العرض الآن</span>
                      <span className="material-symbols-outlined text-lg">arrow_back</span>
                    </Link>

                    {/* Trust indicators */}
                    <div className="flex items-center justify-center gap-3 text-[11px] text-zinc-400 font-body">
                      <span className="flex items-center gap-1 text-white/90">
                        <span className="material-symbols-outlined text-xs text-emerald-400">verified</span>
                        <span>أصلي 100%</span>
                      </span>
                      <span>•</span>
                      <span>معاينة قبل الدفع</span>
                      <span>•</span>
                      <span>دفع عند الاستلام</span>
                    </div>

                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
