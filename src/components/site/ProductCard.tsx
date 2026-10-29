'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { useCart } from '@/hooks/useCart';
import { motion } from 'framer-motion';
import { getOptimizedImageUrl } from '@/lib/utils/image';

interface ProductCardProps {
  product: Product;
  hideAddToCart?: boolean;
  viewMode?: 'grid' | 'list';
}

export default function ProductCard({ product, hideAddToCart = false, viewMode = 'grid' }: ProductCardProps) {
  const { addToCart } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 3;
  const discountPercentage = product.oldPrice && product.oldPrice > product.price 
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) 
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product, 1);
  };

  const handleToggleImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.images && product.images.length > 1) {
      setCurrentImageIndex(prev => (prev + 1) % product.images.length);
    }
  };

  const categoryName = product.category
    ? product.category.replace(/-/g, ' ').toUpperCase()
    : 'SUPPLEMENT';

  // Check if product has flavor(s)
  const flavorDisplay =
    product.flavors && product.flavors.length > 0
      ? product.flavors.join(' • ')
      : (product as any).flavor || null;

  // Check if product has any secondary details (flavor, weight, servings, ratings)
  const hasExtraDetails = Boolean(
    flavorDisplay || 
    (product.weight && String(product.weight).trim().length > 0) || 
    (product.servings && Number(product.servings) > 0) || 
    (product.reviewCount && product.reviewCount > 0)
  );

  // List View (Used in filtered catalog list mode)
  if (viewMode === 'list') {
    return (
      <Link 
        href={`/products/${product.slug}`}
        className="block outline-none"
      >
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-[#0c0c0c] hover:bg-[#121212] flex flex-row relative group cursor-pointer rounded-2xl overflow-hidden border border-white/[0.08] hover:border-accent-red/40 transition-all duration-300 h-36 sm:h-44 p-2 sm:p-2.5 gap-3 sm:gap-4 shadow-lg shadow-black/40"
          dir="rtl"
        >
          {/* Framed Image Container */}
          <div className="bg-[#f8f9fa] w-32 sm:w-44 h-full rounded-xl relative flex items-center justify-center shrink-0 overflow-hidden p-2">
            {isOutOfStock ? (
              <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md text-white text-[9px] px-2 py-0.5 z-20 font-bold uppercase rounded-md shadow">
                Out of Stock
              </div>
            ) : discountPercentage > 0 ? (
              <div className="absolute top-2 right-2 bg-accent-red text-white text-[10px] px-2 py-0.5 z-20 font-black rounded-md shadow">
                {discountPercentage}%
              </div>
            ) : null}

            <img 
              src={getOptimizedImageUrl(product.images[0], { width: 250, height: 250 })} 
              alt={`${product.name} - ${product.category}`} 
              loading="lazy"
              className={`w-full h-full object-contain relative z-10 transition-all duration-500 ease-out ${
                product.images && product.images.length > 1
                  ? 'group-hover:opacity-0 group-hover:scale-95'
                  : 'group-hover:scale-105'
              }`}
            />

            {product.images && product.images.length > 1 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 p-2">
                <img 
                  src={getOptimizedImageUrl(product.images[1], { width: 250, height: 250 })} 
                  alt={`${product.name} - 2`} 
                  loading="lazy"
                  className="w-full h-full object-contain opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-105 transition-all duration-500 ease-out"
                />
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex flex-col flex-grow justify-between py-1 text-right min-w-0">
            <div>
              <div className="text-[11px] text-text-muted/70 font-semibold tracking-wider uppercase mb-1 text-left" dir="ltr">
                <span>{categoryName}</span>
              </div>
              <h3 className="font-product-title text-white text-sm sm:text-base font-bold leading-snug group-hover:text-accent-red transition-colors truncate text-left" dir="ltr">
                {product.name}
              </h3>
              {flavorDisplay && (
                <div className="text-[11px] text-zinc-400 font-product-title font-bold uppercase tracking-wider mt-0.5 text-left truncate" dir="ltr">
                  {flavorDisplay}
                </div>
              )}
              {(product.weight || product.servings) && (
                <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1 font-medium text-left" dir="ltr">
                  {product.weight && <span>{product.weight}</span>}
                  {product.weight && product.servings && <span className="text-white/20">•</span>}
                  {product.servings && <span>{product.servings} srv</span>}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
              <div className="flex items-baseline gap-2" dir="ltr">
                <span className="text-white font-product-title font-black text-base sm:text-lg tracking-wider">
                  {product.price} <span className="text-xs font-bold text-accent-red ml-1">EGP</span>
                </span>
                {product.oldPrice && product.oldPrice > product.price && (
                  <span className="text-text-muted/50 line-through text-xs font-product-title font-bold tracking-wider">
                    {product.oldPrice} EGP
                  </span>
                )}
              </div>

              {!hideAddToCart && (
                <button 
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`h-9 px-4 rounded-xl flex items-center justify-center font-product-title font-bold text-xs transition-all duration-200 gap-1.5 select-none active:scale-95 ${
                    isOutOfStock 
                      ? 'bg-white/5 text-text-muted/40 cursor-not-allowed border border-white/5' 
                      : 'bg-accent-red hover:bg-accent-red-hover text-white shadow-sm shadow-accent-red/20 hover:shadow-md hover:shadow-accent-red/30'
                  }`}
                >
                  {isOutOfStock ? (
                    <span>Out of Stock</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                      <span>أضف للسلة</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  // Grid View (Standard Showcase Card)
  return (
    <Link 
      href={`/products/${product.slug}`}
      className="block h-full outline-none group"
    >
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="bg-[#0c0c0c] hover:bg-[#111111] flex flex-col justify-between h-full rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 border border-white/[0.08] hover:border-accent-red/40 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_30px_rgba(227,30,36,0.12)] relative"
        dir="rtl"
      >
        {/* Top: Framed Product Image Container */}
        <div className="bg-[#f8f9fa] w-full aspect-square rounded-xl sm:rounded-2xl relative flex items-center justify-center overflow-hidden p-3 sm:p-4 shrink-0">
          
          {/* Stock or Sale Badge */}
          <div className="absolute top-2.5 right-2.5 z-20 flex flex-col gap-1 items-start">
            {isOutOfStock ? (
              <span className="bg-black/85 backdrop-blur-md text-white font-product-title text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md shadow uppercase tracking-wider">
                Out of Stock
              </span>
            ) : discountPercentage > 0 ? (
              <span className="bg-accent-red text-white font-product-title text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-md">
                {discountPercentage}%
              </span>
            ) : null}
            {isLowStock && !isOutOfStock && (
              <span className="bg-amber-500/90 text-black font-bold text-[9px] px-2 py-0.5 rounded-md shadow uppercase tracking-wider">
                Limited
              </span>
            )}
          </div>

          {/* Primary Product Image */}
          <img 
            src={getOptimizedImageUrl(product.images[currentImageIndex] || product.images[0], { width: 400, height: 400 })} 
            alt={`${product.name} - ${product.category}`} 
            loading="lazy"
            className={`w-full h-full object-contain relative z-10 transition-all duration-500 ease-out drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)] ${
              product.images && product.images.length > 1
                ? 'group-hover:opacity-0 group-hover:scale-95'
                : 'group-hover:scale-105'
            }`}
          />

          {/* Secondary Image Crossfade on Hover (Desktop) */}
          {product.images && product.images.length > 1 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 p-3 sm:p-4">
              <img 
                src={getOptimizedImageUrl(product.images[1], { width: 400, height: 400 })} 
                alt={`${product.name} - 2`} 
                loading="lazy"
                className="w-full h-full object-contain opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-105 transition-all duration-500 ease-out drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)]"
              />
            </div>
          )}

          {/* Mobile Image Switcher Pill (Only mobile if multiple images) */}
          {product.images && product.images.length > 1 && (
            <button
              onClick={handleToggleImage}
              className="md:hidden absolute bottom-2 left-2 bg-black/70 backdrop-blur-md border border-white/20 text-white p-1.5 rounded-lg z-20 shadow flex items-center justify-center active:scale-90"
              title="Next image"
            >
              <span className="material-symbols-outlined text-[14px]">collections</span>
            </button>
          )}
        </div>

        {/* Bottom Details Section */}
        <div className="flex flex-col flex-grow justify-between pt-2.5 sm:pt-3 px-1 text-right">
          
          <div className="space-y-1">
            {/* Category Subtitle */}
            <div className="text-[11px] text-text-muted/70 font-semibold tracking-wider uppercase text-left" dir="ltr">
              <span>{categoryName}</span>
            </div>

            {/* Product Title */}
            <h3 className="font-product-title text-white text-sm sm:text-base font-bold leading-snug group-hover:text-accent-red transition-colors line-clamp-1 text-left" dir="ltr">
              {product.name}
            </h3>

            {/* Flavor Text (Simple & Clean) */}
            {flavorDisplay && (
              <div className="text-[12px] text-zinc-400 font-product-title font-bold uppercase tracking-wider text-left truncate -mt-0.5" dir="ltr">
                {flavorDisplay}
              </div>
            )}

            {/* Spec Row: Weight & Servings */}
            {(product.weight || product.servings) && (
              <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium" dir="ltr">
                {product.weight && <span>{product.weight}</span>}
                {product.weight && product.servings && <span className="text-white/20">•</span>}
                {product.servings && <span>{product.servings} srv</span>}
              </div>
            )}

            {/* Clean Star Rating */}
            {product.reviewCount && product.reviewCount > 0 ? (
              <div className="flex items-center gap-1.5 pt-0.5" dir="ltr">
                <div className="flex text-amber-400 text-xs">
                  {'★'.repeat(Math.round(product.avgRating || 5))}
                </div>
                <span className="text-text-muted text-[11px] font-medium">({product.reviewCount})</span>
              </div>
            ) : null}
          </div>

          {/* Pricing & Add to Cart Container */}
          <div className="pt-2 sm:pt-2.5 mt-auto border-t border-white/[0.06] space-y-2 sm:space-y-2.5">
            
            {/* Price Line */}
            <div className="flex items-baseline gap-2" dir="ltr">
              <span className="text-white font-product-title font-black text-lg sm:text-xl tracking-wider">
                {product.price} <span className="text-xs font-bold text-accent-red ml-1">EGP</span>
              </span>
              {product.oldPrice && product.oldPrice > product.price && (
                <span className="text-text-muted/50 line-through text-xs font-product-title font-bold tracking-wider">
                  {product.oldPrice} EGP
                </span>
              )}
            </div>

            {/* Add to Cart Button (Clean Athletic Design) */}
            {!hideAddToCart && (
              <button 
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`w-full h-10 sm:h-11 rounded-xl font-product-title font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 select-none active:scale-[0.97] ${
                  isOutOfStock
                    ? 'bg-white/5 text-text-muted/40 cursor-not-allowed border border-white/5'
                    : 'bg-accent-red hover:bg-accent-red-hover text-white shadow-md shadow-accent-red/25 hover:shadow-lg hover:shadow-accent-red/40'
                }`}
                title={isOutOfStock ? "Out of Stock" : "أضف للسلة"}
              >
                {isOutOfStock ? (
                  <span className="tracking-wider uppercase text-[11px]">Out of Stock</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[17px] sm:text-[18px]">shopping_bag</span>
                    <span>أضف للسلة</span>
                  </>
                )}
              </button>
            )}

          </div>

        </div>

      </motion.div>
    </Link>
  );
}
