'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Product } from '@/lib/types';
import ProductCard from './ProductCard';

interface AllProductsMarqueeProps {
  products: Product[];
}

export default function AllProductsMarquee({ products }: AllProductsMarqueeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Duplicate max once if less than 6 items to ensure track is full
  // We duplicate it multiple times to ensure infinite scroll illusion
  const displayList = products && products.length > 0
    ? [...products, ...products, ...products, ...products]
    : [];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isHovered || displayList.length === 0) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const scroll = (time: number) => {
      if (!el || isHovered) return;
      
      const deltaTime = time - lastTime;
      // Scroll by ~1px per 16ms (approx 60fps)
      if (deltaTime > 16) {
        // Since dir="rtl", scrollLeft goes from 0 to negative in some browsers, or positive in others.
        // It's safer to use dir="ltr" on the container for predictable scrolling
        el.scrollLeft += 1; 
        
        // Reset if reached the end
        if (el.scrollLeft >= (el.scrollWidth - el.clientWidth)) {
          el.scrollLeft = 0;
        }
        lastTime = time;
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isHovered, displayList.length]);

  // Early return AFTER all hooks
  if (!products || products.length === 0) return null;

  return (
    <section className="py-10 md:py-20 w-full overflow-hidden bg-transparent border-y border-text-muted/5 relative">
      {/* Title */}
      <div className="text-center mb-6 md:mb-10 relative z-10 px-6">
        <h2 className="font-display text-2xl md:text-3xl font-black text-white uppercase tracking-widest flex flex-col items-center gap-2">
          <span className="pb-1 leading-relaxed">كل المنتجات</span>
          <span className="w-12 h-1 bg-accent-red rounded-full"></span>
        </h2>
      </div>

      {/* Marquee Track Container */}
      <div 
        className="relative w-full overflow-hidden" 
        dir="ltr"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
      >
        {/* Left/Right Fade Gradients for a seamless effect */}
        <div className="absolute top-0 left-0 w-8 md:w-32 h-full bg-gradient-to-r from-black to-transparent z-10 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-8 md:w-32 h-full bg-gradient-to-l from-black to-transparent z-10 pointer-events-none"></div>
        
        {/* Native Scroll Track with Auto-Scroll via JS */}
        <div 
          ref={scrollRef}
          className="flex gap-4 md:gap-6 px-4 md:px-6 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {displayList.map((product, idx) => (
            <div 
              key={`marquee-item-${product.id}-${idx}`} 
              className="w-[220px] sm:w-[260px] md:w-[280px] shrink-0 flex flex-col"
            >
              <ProductCard product={product} hideAddToCart={true} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
