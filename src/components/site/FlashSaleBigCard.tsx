'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/lib/types';
import { getOptimizedImageUrl } from '@/lib/utils/image';
import { toEgyptTime } from '@/lib/date-utils';
import CountdownTimer from '@/components/site/CountdownTimer';
import ScrollReveal from '@/components/site/ScrollReveal';

export interface FlashSaleOfferItem {
  product: Product;
  endDateTime?: any;
  badgeText?: string;
}

interface FlashSaleBigCardProps {
  offers: FlashSaleOfferItem[];
  defaultEndDateTime?: any;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
};

export default function FlashSaleBigCard({ offers, defaultEndDateTime }: FlashSaleBigCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  if (!offers || offers.length === 0) return null;

  const hasMultipleOffers = offers.length > 1;
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
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % offers.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + offers.length) % offers.length);
  };

  return (
    <section className="relative w-full border-y border-white/[0.08] bg-[#070707] py-8 sm:py-12 lg:py-16 overflow-hidden select-none">
      {/* Soft Subtle Ambient Radial Lighting */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[550px] h-[550px] bg-accent-red/[0.06] rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <ScrollReveal>
          {/* Big Athletic Showcase Ad Card (الكارت الإعلاني الكبير) */}
          <div className="relative rounded-3xl border border-white/10 hover:border-accent-red/35 bg-gradient-to-b from-[#141414] via-[#0f0f0f] to-[#080808] p-6 sm:p-8 lg:p-12 overflow-hidden shadow-2xl transition-all duration-300">
            {/* Inner subtle red backlight */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-accent-red/[0.08] rounded-full blur-3xl pointer-events-none" />

            {/* Top Bar: Badges & Multi-offer Navigation Controls */}
            <div className="w-full flex items-center justify-between pb-4 mb-6 border-b border-white/[0.08] relative z-20" dir="rtl">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/10 px-3 py-1 rounded-full text-white/90 font-product-title font-semibold text-xs tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-ping" />
                  <span>{currentOffer.badgeText || 'عرض خاص لفترة محدودة'}</span>
                </span>
                <span className="text-text-muted/60 text-xs font-medium hidden sm:inline">
                  المتجر الرسمي
                </span>
              </div>

              {/* Slider Controls if multiple offers exist */}
              {hasMultipleOffers && (
                <div className="flex items-center gap-3" dir="ltr">
                  {/* Offer counter pill */}
                  <span className="text-[11px] font-product-title font-bold text-accent-red bg-accent-red/10 border border-accent-red/20 px-2.5 py-0.5 rounded-full" dir="rtl">
                    عرض {currentIndex + 1} من {offers.length}
                  </span>

                  {/* Dot Indicators */}
                  <div className="flex items-center gap-1.5 px-1">
                    {offers.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setDirection(i > currentIndex ? 1 : -1);
                          setCurrentIndex(i);
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                          i === currentIndex ? 'w-6 bg-accent-red' : 'w-2 bg-white/20 hover:bg-white/40'
                        }`}
                        aria-label={`الانتقال للعرض ${i + 1}`}
                      />
                    ))}
                  </div>

                  {/* Arrow Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrev}
                      aria-label="العرض السابق"
                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-accent-red text-white flex items-center justify-center border border-white/10 hover:border-accent-red transition-all active:scale-90 cursor-pointer shadow-md"
                    >
                      <span className="material-symbols-outlined text-base">chevron_left</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      aria-label="العرض التالي"
                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-accent-red text-white flex items-center justify-center border border-white/10 hover:border-accent-red transition-all active:scale-90 cursor-pointer shadow-md"
                    >
                      <span className="material-symbols-outlined text-base">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Floating Side Arrows for Desktop (Easy Browsing) */}
            {hasMultipleOffers && (
              <>
                <button
                  type="button"
                  onClick={handleNext}
                  className="hidden xl:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/75 hover:bg-accent-red text-white border border-white/15 hover:border-accent-red items-center justify-center transition-all active:scale-95 shadow-xl backdrop-blur-md cursor-pointer"
                  aria-label="العرض التالي"
                >
                  <span className="material-symbols-outlined text-xl">arrow_forward_ios</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="hidden xl:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/75 hover:bg-accent-red text-white border border-white/15 hover:border-accent-red items-center justify-center transition-all active:scale-95 shadow-xl backdrop-blur-md cursor-pointer"
                  aria-label="العرض السابق"
                >
                  <span className="material-symbols-outlined text-xl">arrow_back_ios</span>
                </button>
              </>
            )}

            {/* Slide Body with AnimatePresence for Smooth Crossfade */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={`offer-slide-${product.id}-${currentIndex}`}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                {/* ============================================================ */}
                {/* 1. DESKTOP VIEW (hidden md:grid) — 2 Columns Inside Big Card */}
                {/* ============================================================ */}
                <div className="hidden md:grid md:grid-cols-12 items-center gap-8 lg:gap-14 relative z-10" dir="rtl">
                  
                  {/* Right Column: Offer Details & Actions (7 cols) */}
                  <div className="col-span-7 flex flex-col items-start text-right gap-4 lg:gap-5">
                    
                    {/* Product Headline */}
                    <h2 className="font-product-title text-3xl lg:text-5xl font-black text-white uppercase tracking-tight leading-tight">
                      <Link href={`/products/${product.slug || product.id}`} className="hover:text-accent-red transition-colors">
                        {cleanProductName}
                      </Link>
                    </h2>

                    {/* Pricing Display */}
                    <div className="flex items-baseline gap-4 py-3 border-y border-white/[0.06] w-full">
                      <div className="flex items-baseline gap-2" dir="ltr">
                        <span className="font-product-title text-3xl lg:text-4xl font-black text-white">
                          {product.price} <span className="text-xs font-bold text-accent-red ml-1">EGP</span>
                        </span>
                        {hasDiscount && (
                          <span className="font-product-title text-lg text-text-muted/50 line-through">
                            {product.oldPrice} EGP
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
                        endDate={toEgyptTime(targetEndDate)}
                        itemClassName="flex flex-col items-center justify-center bg-[#121212] border border-white/[0.08] px-4 py-2.5 rounded-xl min-w-[65px]"
                        numberClassName="font-product-title text-2xl lg:text-3xl font-black text-white leading-none tracking-tight"
                        labelClassName="text-[10px] text-zinc-400 mt-1 uppercase font-medium"
                      />
                    </div>

                    {/* Action Button & Trust Guarantee */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-2 w-full">
                      <Link
                        href={`/products/${product.slug || product.id}`}
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
                        src={getOptimizedImageUrl(product.images[0], { width: 600, height: 600 })}
                        alt={cleanProductName}
                        loading="lazy"
                        className="w-full h-full object-contain relative z-10 drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
                      />

                      {/* Official Special Offer Circular Stamp (ختم عرض خاص) */}
                      <div className="absolute top-0 left-0 lg:top-2 lg:left-2 z-20 pointer-events-none select-none rotate-[-12deg] drop-shadow-[0_10px_25px_rgba(0,0,0,0.85)]">
                        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-accent-red/90 p-1 flex items-center justify-center bg-black/80 backdrop-blur-md shadow-[0_0_25px_rgba(227,30,36,0.3)]">
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

                {/* ============================================================ */}
                {/* 2. MOBILE VIEW (block md:hidden) — Clean Mobile Card Inside  */}
                {/* ============================================================ */}
                <div className="block md:hidden relative w-full">
                  <div className="flex flex-col items-center text-center gap-4 relative z-10">
                    
                    {/* Mobile Product Visual */}
                    <div className="relative w-56 h-56 my-2 flex items-center justify-center">
                      <img
                        src={getOptimizedImageUrl(product.images[0], { width: 450, height: 450 })}
                        alt={cleanProductName}
                        loading="lazy"
                        className="w-full h-full object-contain relative z-10 drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]"
                      />

                      {/* Official Special Offer Circular Stamp Mobile */}
                      <div className="absolute top-0 -left-1 z-20 pointer-events-none select-none rotate-[-12deg] drop-shadow-[0_8px_20px_rgba(0,0,0,0.85)]">
                        <div className="relative w-20 h-20 rounded-full border-2 border-accent-red p-1 flex items-center justify-center bg-black/85 backdrop-blur-md">
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
                      <Link href={`/products/${product.slug || product.id}`}>
                        {cleanProductName}
                      </Link>
                    </h2>

                    {/* Mobile Price Row */}
                    <div className="flex items-center justify-center gap-3 bg-white/[0.03] border border-white/[0.08] py-2 px-5 rounded-xl w-full max-w-sm">
                      <span className="font-product-title text-2xl font-black text-white" dir="ltr">
                        {product.price} <span className="text-xs font-bold text-accent-red ml-1">EGP</span>
                      </span>
                      {hasDiscount && (
                        <>
                          <span className="text-sm text-text-muted/60 line-through font-product-title" dir="ltr">
                            {product.oldPrice} EGP
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
                        endDate={toEgyptTime(targetEndDate)}
                        className="flex items-center justify-center gap-2 w-full"
                        itemClassName="flex-1 flex flex-col items-center justify-center bg-[#141414] border border-white/[0.08] py-2 rounded-xl"
                        numberClassName="font-product-title text-xl font-black text-white leading-none"
                        labelClassName="text-[10px] text-text-muted/70 mt-1 uppercase font-medium"
                      />
                    </div>

                    {/* Mobile Full-Width CTA Button */}
                    <Link
                      href={`/products/${product.slug || product.id}`}
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
                </div>
              </motion.div>
            </AnimatePresence>

          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

