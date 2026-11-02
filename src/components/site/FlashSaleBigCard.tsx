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
    <section className="relative w-full border-y border-white/[0.08] bg-[#070707] py-6 sm:py-10 lg:py-16 overflow-hidden select-none">
      {/* Soft Subtle Ambient Radial Lighting */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] bg-accent-red/[0.06] rounded-full blur-[120px] sm:blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-3 sm:px-6 relative z-10">
        <ScrollReveal>
          {/* Big Athletic Showcase Ad Card (الكارت الإعلاني العالمي) */}
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
            className="relative rounded-3xl border border-white/[0.12] hover:border-accent-red/40 bg-gradient-to-b from-[#111113] via-[#0b0b0c] to-[#070708] p-5 sm:p-8 lg:p-10 overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_-20px_rgba(227,30,36,0.2)] transition-all duration-300"
          >
            {/* Top metallic glow border line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-red/60 to-transparent pointer-events-none" />
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[380px] h-[380px] bg-accent-red/[0.10] rounded-full blur-[110px] pointer-events-none" />

            {/* ============================================================ */}
            {/* Top Bar: Clean & Balanced on both Mobile & Desktop           */}
            {/* ============================================================ */}
            <div className="w-full flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-white/[0.08] relative z-20" dir="rtl">
              
              {/* Right: Enlarged Athletic Special Offer Badge */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 sm:gap-2.5 bg-gradient-to-r from-accent-red/20 via-black/80 to-[#141414] border border-accent-red/50 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-[0_0_20px_rgba(227,30,36,0.3)] backdrop-blur-md">
                  <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-red opacity-80" />
                    <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-accent-red shadow-[0_0_8px_#E31E24]" />
                  </span>
                  <span className="material-symbols-outlined text-accent-red text-lg sm:text-xl select-none">
                    local_fire_department
                  </span>
                  <span className="font-display font-black text-sm sm:text-base md:text-lg text-white tracking-wide">
                    {currentOffer.badgeText || 'عرض خاص'}
                  </span>
                </div>
              </div>

              {/* Left: Mobile Counter Badge / Desktop Dot Indicators */}
              {hasMultipleOffers && (
                <div className="flex items-center gap-2 sm:gap-3" dir="ltr">
                  
                  {/* Counter badge */}
                  <span className="text-xs sm:text-sm font-product-title font-bold text-accent-red bg-accent-red/10 border border-accent-red/25 px-2.5 sm:px-3 py-1 rounded-full" dir="rtl">
                    {currentIndex + 1} / {offers.length}
                  </span>

                  {/* Desktop Only: Dot Indicators in Header */}
                  <div className="hidden sm:flex items-center gap-1.5 px-1">
                    {offers.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setDirection(i > currentIndex ? 1 : -1);
                          setCurrentIndex(i);
                        }}
                        className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                          i === currentIndex ? 'w-7 bg-accent-red shadow-[0_0_10px_#E31E24]' : 'w-2 bg-white/20 hover:bg-white/40'
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
                {/* 1. DESKTOP VIEW (hidden lg:grid) — Cinematic Balanced Arena  */}
                {/* ============================================================ */}
                <div className="hidden lg:grid lg:grid-cols-12 gap-8 xl:gap-12 items-center relative z-10" dir="rtl">
                  
                  {/* Right Column: Offer Command & Conversion Deck (7 cols) */}
                  <div className="lg:col-span-7 flex flex-col items-start text-right gap-4 xl:gap-5">
                    
                    {/* Eyebrow & Category Tag */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-product-title font-black uppercase text-accent-red tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse" />
                        ⚡ بكج العرض الحصري • X-POWER FLASH SALE
                      </span>
                      {product.category && (
                        <>
                          <span className="text-zinc-600 text-xs">•</span>
                          <span className="text-xs text-zinc-400 font-medium">{product.category}</span>
                        </>
                      )}
                    </div>

                    {/* Product Headline */}
                    <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[1.15] hover:text-accent-red transition-colors">
                      <Link href={`/products/${product.slug || product.id}`}>
                        {cleanProductName}
                      </Link>
                    </h2>

                    {/* Punchy Narrative Pitch */}
                    <p className="text-sm lg:text-base text-zinc-300/90 leading-relaxed font-body line-clamp-2 max-w-xl">
                      {product.description || 'بكج متكامل مصمم خصيصاً لتحقيق أقصى ضخ دموي وزيادة الكتلة العضلية وتحفيز الطاقة والاستشفاء بدون هبوط.'}
                    </p>

                    {/* Highlights Bar (3 Athletic Badges) */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-zinc-200">
                        <span className="material-symbols-outlined text-accent-red text-sm">fitness_center</span>
                        <span>أعلى تركيز للمكونات الفعالة</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-zinc-200">
                        <span className="material-symbols-outlined text-accent-red text-sm">bolt</span>
                        <span>طاقة وضخ دم متفجر</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-zinc-200">
                        <span className="material-symbols-outlined text-emerald-400 text-sm">verified</span>
                        <span>مفحوص ومعتمد 100%</span>
                      </div>
                    </div>

                    {/* Integrated Pricing & Telemetry Deck */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                      {/* Price section */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-baseline gap-2" dir="ltr">
                          <span className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
                            {product.price}
                          </span>
                          <span className="font-display font-bold text-accent-red text-base sm:text-lg">ج.م</span>
                          {hasDiscount && (
                            <span className="font-display text-zinc-500 line-through text-base sm:text-lg ml-2">
                              {product.oldPrice} ج.م
                            </span>
                          )}
                        </div>
                        {hasDiscount && (
                          <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-md bg-accent-red/20 border border-accent-red/30 text-accent-red font-bold text-xs">
                            <span className="material-symbols-outlined text-xs">trending_down</span>
                            <span>وفرت {savings} ج.م (خصم {discountPercentage}%)</span>
                          </div>
                        )}
                      </div>

                      {/* Countdown Timer Block */}
                      <div className="flex flex-col items-start sm:items-end gap-1.5">
                        <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-400">
                          <span className="material-symbols-outlined text-accent-red text-xs">timer</span>
                          <span>ينتهي العرض خلال:</span>
                        </div>
                        <CountdownTimer
                          endDate={toEgyptTime(targetEndDate)}
                          itemClassName="flex flex-col items-center justify-center bg-black/70 border border-white/10 px-3 py-1.5 rounded-xl min-w-[54px] shadow-inner"
                          numberClassName="font-product-title text-xl font-black text-white leading-none"
                          labelClassName="text-[9px] text-zinc-400 mt-1 uppercase font-body"
                        />
                      </div>
                    </div>

                    {/* CTA Button & Trust Guarantees */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-1 w-full">
                      <Link
                        href={`/products/${product.slug || product.id}`}
                        className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-accent-red via-[#e31e24] to-[#b31419] hover:from-[#ff2d33] hover:to-accent-red text-white px-8 py-3.5 sm:py-4 rounded-xl font-display font-black text-base sm:text-lg tracking-wide transition-all duration-300 shadow-[0_10px_25px_rgba(227,30,36,0.35)] hover:shadow-[0_12px_35px_rgba(227,30,36,0.5)] active:scale-[0.98] group/btn cursor-pointer"
                      >
                        <span>اطلب العرض الآن</span>
                        <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover/btn:-translate-x-1">
                          arrow_back
                        </span>
                      </Link>

                      <div className="flex items-center gap-4 text-xs text-zinc-400 font-body">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-emerald-400 text-base">verified_user</span>
                          <span>أصلي 100% ومضمون</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-accent-red text-base">local_shipping</span>
                          <span>معاينة قبل الدفع</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Left Column: 3D Elevated Product Showcase Stage (5 cols) */}
                  <div className="lg:col-span-5 relative rounded-3xl bg-gradient-to-b from-white/[0.04] via-white/[0.02] to-black/60 border border-white/[0.08] p-6 lg:p-8 flex items-center justify-center overflow-hidden group/stage min-h-[360px] lg:min-h-[410px]">
                    {/* Stage Ambient Radial Backlight */}
                    <div className="absolute inset-0 bg-radial-gradient from-accent-red/20 via-transparent to-transparent opacity-60 group-hover/stage:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    {/* 3D Stage Pedestal Ellipse */}
                    <div className="absolute bottom-5 inset-x-10 h-8 bg-accent-red/25 rounded-full blur-xl pointer-events-none" />
                    <div className="absolute bottom-7 inset-x-16 h-3 bg-white/10 rounded-full blur-sm pointer-events-none" />

                    {/* Floating Top Discount Badge */}
                    {hasDiscount && (
                      <div className="absolute top-4 right-4 z-20 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/80 border border-accent-red/40 backdrop-blur-md shadow-lg shadow-accent-red/20">
                        <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
                        <span className="font-product-title font-black text-xs text-white">
                          خصم {discountPercentage}%-
                        </span>
                      </div>
                    )}

                    {/* Floating Bottom Trust Badge */}
                    <div className="absolute bottom-4 left-4 z-20 hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/80 border border-white/15 backdrop-blur-md text-[11px] text-zinc-300">
                      <span className="material-symbols-outlined text-emerald-400 text-xs">health_and_safety</span>
                      <span>معتمد أصلي 100%</span>
                    </div>

                    {/* Product Bundle Image */}
                    <Link href={`/products/${product.slug || product.id}`} className="relative z-10 w-full aspect-square max-h-[350px] flex items-center justify-center transition-transform duration-500 ease-out group-hover/stage:scale-105">
                      <img
                        src={getOptimizedImageUrl(product.images[0], { width: 650, height: 650 })}
                        alt={cleanProductName}
                        loading="lazy"
                        className="w-full h-full object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)]"
                      />
                    </Link>
                  </div>

                </div>

                {/* ============================================================ */}
                {/* 2. MOBILE VIEW (block lg:hidden) — App-Like Punchy Touch     */}
                {/* ============================================================ */}
                <div className="block lg:hidden relative w-full">
                  <div className="flex flex-col items-center text-center gap-3.5 relative z-10">
                    
                    {/* Mobile Stage Pedestal with Swipe Arrows */}
                    <div className="relative w-full max-w-[320px] aspect-square max-h-[250px] rounded-2xl bg-gradient-to-b from-white/[0.04] to-black/60 border border-white/[0.08] p-4 flex items-center justify-center overflow-hidden">
                      {/* Ambient Stage Glow */}
                      <div className="absolute bottom-3 inset-x-8 h-6 bg-accent-red/25 rounded-full blur-lg pointer-events-none" />

                      {/* Floating Discount Tag */}
                      {hasDiscount && (
                        <div className="absolute top-3 right-3 z-20 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-black/80 border border-accent-red/40 backdrop-blur-md shadow-md text-white font-product-title font-black text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse" />
                          <span>خصم {discountPercentage}%-</span>
                        </div>
                      )}

                      {/* Mobile Product Image */}
                      <Link href={`/products/${product.slug || product.id}`} className="relative z-10 w-full h-full flex items-center justify-center">
                        <img
                          src={getOptimizedImageUrl(product.images[0], { width: 450, height: 450 })}
                          alt={cleanProductName}
                          loading="lazy"
                          className="w-full h-full object-contain drop-shadow-[0_12px_25px_rgba(0,0,0,0.85)]"
                        />
                      </Link>

                      {/* Floating In-Stage Mobile Arrows */}
                      {hasMultipleOffers && (
                        <div className="flex items-center justify-between w-full absolute inset-y-0 -px-1 pointer-events-none z-30">
                          <button
                            type="button"
                            onClick={handlePrev}
                            className="pointer-events-auto w-8 h-8 rounded-full bg-black/80 border border-white/15 hover:border-accent-red text-white flex items-center justify-center active:scale-90 transition-transform shadow-lg backdrop-blur-md cursor-pointer"
                            aria-label="العرض السابق"
                          >
                            <span className="material-symbols-outlined text-base">chevron_right</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleNext}
                            className="pointer-events-auto w-8 h-8 rounded-full bg-black/80 border border-white/15 hover:border-accent-red text-white flex items-center justify-center active:scale-90 transition-transform shadow-lg backdrop-blur-md cursor-pointer"
                            aria-label="العرض التالي"
                          >
                            <span className="material-symbols-outlined text-base">chevron_left</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Mobile Dots Indicator under image */}
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

                    {/* Super-tag */}
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-product-title font-black uppercase text-accent-red tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse" />
                      <span>⚡ بكج العرض الحصري</span>
                    </div>

                    {/* Mobile Title */}
                    <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight leading-tight">
                      <Link href={`/products/${product.slug || product.id}`}>
                        {cleanProductName}
                      </Link>
                    </h2>

                    {/* Quick Benefits Chips */}
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-300 font-medium">
                        <span className="material-symbols-outlined text-accent-red text-xs">bolt</span>
                        <span>ضخ دم متفجر</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-300 font-medium">
                        <span className="material-symbols-outlined text-emerald-400 text-xs">verified</span>
                        <span>أصلي 100%</span>
                      </span>
                    </div>

                    {/* Pricing Card */}
                    <div className="w-full max-w-sm p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-2">
                      <div className="flex flex-col items-start gap-0.5">
                        <div className="flex items-baseline gap-1" dir="ltr">
                          <span className="font-display font-black text-2xl text-white">
                            {product.price}
                          </span>
                          <span className="font-display font-bold text-accent-red text-sm">ج.م</span>
                          {hasDiscount && (
                            <span className="font-display text-xs text-zinc-500 line-through ml-1.5">
                              {product.oldPrice} ج.م
                            </span>
                          )}
                        </div>
                        {hasDiscount && (
                          <span className="text-[10px] text-accent-red font-bold">
                            وفرت {savings} ج.م ({discountPercentage}%-)
                          </span>
                        )}
                      </div>

                      {/* Mobile Countdown Timer */}
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] text-zinc-400 font-medium">ينتهي خلال:</span>
                        <CountdownTimer
                          endDate={toEgyptTime(targetEndDate)}
                          className="flex items-center gap-1"
                          itemClassName="flex flex-col items-center justify-center bg-black/80 border border-white/10 px-1.5 py-0.5 rounded-lg min-w-[34px]"
                          numberClassName="font-product-title text-sm font-black text-white leading-none"
                          labelClassName="text-[7px] text-zinc-400 mt-0.5 uppercase font-body"
                        />
                      </div>
                    </div>

                    {/* Mobile Full-Width High-Impact CTA Button */}
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
                        <span>أصلي ومضمون</span>
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
