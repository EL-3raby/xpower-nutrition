'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Product } from '@/lib/types';
import ProductCard from './ProductCard';

interface BestSellersSliderProps {
  products: Product[];
}

export default function BestSellersSlider({ products }: BestSellersSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // References for drag calculations
  const isDownRef = useRef(false);
  const hasMovedRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // Check scroll boundary to update arrow buttons
  const checkScrollBoundaries = useCallback(() => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  }, []);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    checkScrollBoundaries();
    slider.addEventListener('scroll', checkScrollBoundaries, { passive: true });
    window.addEventListener('resize', checkScrollBoundaries);

    return () => {
      slider.removeEventListener('scroll', checkScrollBoundaries);
      window.removeEventListener('resize', checkScrollBoundaries);
    };
  }, [checkScrollBoundaries, products]);

  // Global mousemove and mouseup listeners for seamless dragging outside container
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDownRef.current || !sliderRef.current) return;
      e.preventDefault();

      const slider = sliderRef.current;
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startXRef.current) * 1.4; // Speed multiplier

      if (Math.abs(walk) > 6) {
        hasMovedRef.current = true;
      }

      slider.scrollLeft = scrollLeftRef.current - walk;
    };

    const handleGlobalMouseUp = () => {
      if (isDownRef.current) {
        isDownRef.current = false;
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = Math.max(sliderRef.current.clientWidth * 0.75, 300);
      sliderRef.current.scrollBy({ 
        left: direction === 'left' ? -scrollAmount : scrollAmount, 
        behavior: 'smooth' 
      });
    }
  };

  // Keyboard navigation when user is focused on the slider
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      scroll('right');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scroll('left');
    }
  };

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;
    if (e.button !== 0) return; // only left click
    
    isDownRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - sliderRef.current.offsetLeft;
    scrollLeftRef.current = sliderRef.current.scrollLeft;
    setIsDragging(true);
  };

  // Prevent link click / navigation if user was dragging
  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasMovedRef.current = false;
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <div 
      className="relative w-full group/slider select-none focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="قائمة المنتجات - استخدم الأسهم أو اسحب بالماوس للتنقل"
    >
      {/* Scroll Button Right (forward) */}
      <button 
        onClick={() => scroll('right')}
        disabled={!canScrollRight}
        className={`absolute -right-3 md:-right-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#0a0a0a]/90 backdrop-blur-md border border-white/20 text-white hidden md:flex items-center justify-center transition-all duration-300 shadow-[0_4px_25px_rgba(0,0,0,0.8)] ${
          canScrollRight 
            ? 'hover:bg-accent-red hover:border-accent-red hover:scale-110 active:scale-95 cursor-pointer opacity-80 group-hover/slider:opacity-100' 
            : 'opacity-20 cursor-not-allowed pointer-events-none'
        }`}
        aria-label="تمرير للأمام"
      >
        <span className="material-symbols-outlined text-2xl">chevron_right</span>
      </button>

      {/* Scroll Button Left (backward) */}
      <button 
        onClick={() => scroll('left')}
        disabled={!canScrollLeft}
        className={`absolute -left-3 md:-left-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#0a0a0a]/90 backdrop-blur-md border border-white/20 text-white hidden md:flex items-center justify-center transition-all duration-300 shadow-[0_4px_25px_rgba(0,0,0,0.8)] ${
          canScrollLeft 
            ? 'hover:bg-accent-red hover:border-accent-red hover:scale-110 active:scale-95 cursor-pointer opacity-80 group-hover/slider:opacity-100' 
            : 'opacity-20 cursor-not-allowed pointer-events-none'
        }`}
        aria-label="تمرير للخلف"
      >
        <span className="material-symbols-outlined text-2xl">chevron_left</span>
      </button>

      {/* Slider Container */}
      <div 
        ref={sliderRef}
        onMouseDown={handleMouseDown}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()}
        className={`flex gap-4 md:gap-5 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0 select-none ${
          isDragging ? 'cursor-grabbing select-none scroll-auto' : 'cursor-grab scroll-smooth'
        }`}
        style={{ 
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          userSelect: 'none'
        }}
        dir="ltr"
      >
        {products.map((product) => (
          <div 
            key={product.id} 
            className="w-[240px] sm:w-[260px] md:w-[285px] shrink-0 pointer-events-auto select-none flex flex-col"
            onDragStart={(e) => e.preventDefault()}
            style={{ WebkitUserDrag: 'none' } as React.CSSProperties}
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
