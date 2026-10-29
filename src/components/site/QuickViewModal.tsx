'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { useCart } from '@/hooks/useCart';
import { getOptimizedImageUrl } from '@/lib/utils/image';

interface QuickViewModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const { addToCart } = useCart();
  const isOutOfStock = product.stock === 0;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, 1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div 
        className="bg-bg-elevated w-full max-w-4xl relative z-10 flex flex-col md:flex-row shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-text-muted/10"
        dir="rtl"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center bg-black/50 text-white rounded-full hover:bg-accent-red transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Product Image (Left side on Desktop, Top on Mobile) */}
        <div className="w-full md:w-1/2 h-64 md:h-auto relative bg-bg-primary p-6 flex items-center justify-center">
          <img 
            src={getOptimizedImageUrl(product.images[0])} 
            alt={`${product.name} - ${product.category}`} 
            className="w-full h-full object-contain max-h-[300px]"
          />
        </div>

        {/* Product Details (Right side on Desktop) */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="text-xs text-accent-red font-product-title mb-2 uppercase tracking-wider">
              {product.category}
            </div>
            
            <h2 className="font-product-title text-xl md:text-2xl font-bold text-white mb-1">
              {product.name}
            </h2>

            {product.flavors && product.flavors.length > 0 && (
              <div className="text-sm text-zinc-400 font-product-title font-bold uppercase tracking-wider mb-3 text-left" dir="ltr">
                {product.flavors.join(' • ')}
              </div>
            )}

            <div className="flex items-center gap-3 mb-4" dir="ltr">
              <span className="font-product-title text-2xl font-bold text-accent-red">
                {product.price} EGP
              </span>
              {product.oldPrice && product.oldPrice > product.price && (
                <span className="font-product-title text-text-muted line-through text-sm">
                  {product.oldPrice} EGP
                </span>
              )}
            </div>

            <p className="font-body text-text-muted text-sm line-clamp-3 mb-6 leading-relaxed whitespace-pre-wrap">
              {product.description?.trim() || `${product.name} من إكس باور نيوترشن، خامات عالية الجودة مصممة لدعم أسلوب حياتك الرياضي.`}
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button 
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex-1 py-3.5 font-product-title font-bold text-base tracking-wide btn-diagonal transition-all duration-200 flex items-center justify-center gap-2 ${
                isOutOfStock 
                  ? 'bg-text-muted/10 text-text-muted cursor-not-allowed border border-text-muted/10' 
                  : 'bg-accent-red text-white hover:bg-accent-red/90 hover:scale-105 active:scale-95'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isOutOfStock ? 'block' : 'add_shopping_cart'}
              </span>
              <span>{isOutOfStock ? 'غير متوفر' : 'أضف للسلة'}</span>
            </button>

            <Link 
              href={`/products/${product.slug}`}
              className="px-6 py-3.5 border border-text-muted/20 text-white font-product-title flex items-center justify-center hover:border-white transition-colors hover:bg-white/5 active:scale-95"
            >
              التفاصيل
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
