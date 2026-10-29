'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Product } from '@/lib/types';
import { useCart } from '@/hooks/useCart';
import ProductReviews from './ProductReviews';
import BestSellersSlider from './BestSellersSlider';
import { getProducts, getProductById } from '@/lib/firebase/products';

import { getOptimizedImageUrl } from '@/lib/utils/image';
import { trackViewItem } from '@/lib/analytics';

interface ProductDetailsClientProps {
  product: Product;
}

export default function ProductDetailsClient({ product }: ProductDetailsClientProps) {
  const { addToCart } = useCart();
  const [selectedImage, setSelectedImage] = useState(product.images[0] || '/images/no-image.png');
  const [selectedFlavor, setSelectedFlavor] = useState(product.flavors?.[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'usage' | 'shipping'>('desc');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const mobileCarouselRef = useRef<HTMLDivElement>(null);

  // Reviews state for optimistic UI
  const [avgRating, setAvgRating] = useState(product.avgRating || 0);
  const [reviewCount, setReviewCount] = useState(product.reviewCount || 0);
  const [hasMounted, setHasMounted] = useState(false);

  // Related products
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  // Custom Toast Notification States
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Live Visitor Count Fake State
  const [visitorCount, setVisitorCount] = useState(0);

  useEffect(() => {
    // Generate base random count on mount between 45 and 180
    const baseCount = Math.floor(Math.random() * (180 - 45 + 1)) + 45;
    setVisitorCount(baseCount);

    const interval = setInterval(() => {
      setVisitorCount(prev => {
        const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
        let newCount = prev + change;
        if (newCount < 30) newCount = 30;
        if (newCount > 300) newCount = 300;
        return newCount;
      });
    }, 5000 + Math.random() * 5000); // update every 5-10s

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setHasMounted(true);
    // Track Product View Event
    trackViewItem(product);

    // Fetch related products
    async function loadRelated() {
      try {
        const categoryProducts = await getProducts(product.category, true);
        const filtered = categoryProducts.filter(p => p.id !== product.id).slice(0, 8);

        // Fallback removed per user request: only show same category
        setRelatedProducts(filtered);
      } catch (err) {
        console.error('Failed to load related products', err);
      }
    }
    loadRelated();

    // Fetch fresh product data for latest review count/rating
    async function loadFreshProduct() {
      if (!product.id) return;
      try {
        const freshProduct = await getProductById(product.id);
        if (freshProduct) {
          if (freshProduct.avgRating !== undefined) setAvgRating(freshProduct.avgRating || 0);
          if (freshProduct.reviewCount !== undefined) setReviewCount(freshProduct.reviewCount);
        }
      } catch (err) {
        console.error('Failed to load fresh product data', err);
      }
    }
    loadFreshProduct();

    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [product.category, product.id]);

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 3;

  const handleQuantityChange = (val: number) => {
    if (val < 1) return;
    if (val > product.stock) return;
    setQuantity(val);
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, quantity, selectedFlavor || undefined);

    setShowToast(true);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  return (
    <div className="bg-[#050505] text-text-primary min-h-screen py-8 md:py-16 px-4 md:px-6 relative overflow-hidden" dir="rtl">
      {/* Ambient lighting */}
      <div className="absolute top-0 right-0 w-full h-[600px] bg-gradient-to-b from-accent-red/5 to-transparent pointer-events-none"></div>

      <div className="max-w-7xl mx-auto flex flex-col gap-12 relative z-10">

        {/* Breadcrumbs */}
        <div className="text-sm text-text-muted flex gap-2 items-center flex-row-reverse justify-start">
          <Link href="/" className="hover:text-white transition-colors">الرئيسية</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-white transition-colors">المنتجات</Link>
          <span>/</span>
          <span className="text-white truncate font-bold">{product.name}</span>
        </div>

        {/* Hero split layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">

          {/* Gallery (Right side in RTL) */}
          <div className="flex flex-col gap-4 order-1 md:order-2">

            {/* Mobile Touch Carousel (Scroll / Swipeable on mobile) */}
            <div className="md:hidden flex flex-col gap-3">
              <div
                ref={mobileCarouselRef}
                dir="ltr"
                className="relative aspect-square w-full rounded-3xl overflow-hidden bg-white border border-white/5 shadow-2xl flex snap-x snap-mandatory overflow-x-auto scrollbar-none"
                onScroll={(e) => {
                  const target = e.currentTarget;
                  const index = Math.round(target.scrollLeft / target.clientWidth);
                  const total = product.images.length;
                  const normalizedIndex = Math.min(Math.max(0, index), total - 1);
                  if (product.images[normalizedIndex] && product.images[normalizedIndex] !== selectedImage) {
                    setSelectedImage(product.images[normalizedIndex]);
                  }
                }}
              >
                {/* Clean White Studio Background */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#ffffff_0%,_#f0f0f0_100%)] pointer-events-none"></div>

                {product.images.map((img, index) => (
                  <div
                    key={index}
                    className="w-full h-full shrink-0 snap-center flex items-center justify-center p-2 relative z-10"
                    onClick={() => setIsLightboxOpen(true)}
                  >
                    <img
                      src={getOptimizedImageUrl(img, { width: 800, height: 800 })}
                      alt={`${product.name} - صورة ${index + 1}`}
                      className="w-[98%] h-[98%] object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)] scale-[1.03]"
                    />
                  </div>
                ))}

                {/* Image Counter Badge */}
                {product.images.length > 1 && (
                  <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md text-white text-[11px] font-product-title font-bold px-3 py-1 rounded-full border border-white/10 z-20 shadow-md" dir="ltr">
                    {product.images.indexOf(selectedImage) + 1} / {product.images.length}
                  </div>
                )}
              </div>

              {/* Mobile Pagination Dots (Always LTR to match carousel direction) */}
              {product.images.length > 1 && (
                <div dir="ltr" className="flex items-center justify-center gap-2 py-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedImage(img);
                        if (mobileCarouselRef.current) {
                          mobileCarouselRef.current.scrollTo({
                            left: idx * mobileCarouselRef.current.clientWidth,
                            behavior: 'smooth'
                          });
                        }
                      }}
                      className={`h-2 rounded-full transition-all duration-300 ${selectedImage === img
                          ? 'w-6 bg-accent-red shadow-[0_0_10px_rgba(227,30,36,0.6)]'
                          : 'w-2 bg-white/20 hover:bg-white/40'
                        }`}
                      title={`صورة ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Gallery (Hidden on Mobile) */}
            <div className="hidden md:flex flex-col gap-4">
              <div
                className="relative aspect-square flex items-center justify-center overflow-hidden border border-white/5 hover:border-accent-red/30 transition-all duration-500 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] group cursor-zoom-in bg-white"
                onClick={() => setIsLightboxOpen(true)}
              >
                {/* Clean White Studio Background */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#ffffff_0%,_#f0f0f0_100%)] transition-opacity duration-500"></div>

                {/* Soft Floor / Pedestal effect */}
                <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-[#e0e0e0] to-transparent z-0 opacity-60"></div>
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[70%] h-6 bg-black/15 blur-[12px] rounded-[100%] z-0 group-hover:scale-105 transition-all duration-500"></div>

                {/* Image Counter Badge */}
                {product.images.length > 1 && (
                  <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md text-white text-[11px] font-product-title font-bold px-3 py-1 rounded-full border border-white/10 z-20 shadow-md">
                    {product.images.indexOf(selectedImage) + 1} / {product.images.length}
                  </div>
                )}

                {/* Product Image with smooth transition */}
                <motion.img
                  key={selectedImage}
                  src={getOptimizedImageUrl(selectedImage, { width: 800, height: 800 })}
                  alt={`${product.name} - ${product.category}`}
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                  className="w-[95%] h-[95%] object-contain transform group-hover:scale-105 group-hover:-translate-y-2 transition-all duration-500 drop-shadow-[0_20px_35px_rgba(0,0,0,0.45)] relative z-10"
                />

                {/* Enlarge Icon Hint */}
                <div className="absolute top-4 right-4 bg-black/5 text-black p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-md z-20 flex items-center justify-center border border-black/10">
                  <span className="material-symbols-outlined text-[20px]">zoom_in</span>
                </div>
              </div>

              {/* Thumbnails grid (Desktop) */}
              {product.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 flex-row-reverse custom-scrollbar snap-x justify-start items-center p-1">
                  {product.images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(img)}
                      className={`w-18 h-18 sm:w-20 sm:h-20 bg-white border transition-all duration-300 shrink-0 p-2 rounded-2xl snap-start relative overflow-hidden ${selectedImage === img
                          ? 'border-accent-red ring-2 ring-accent-red/50 shadow-[0_0_15px_rgba(227,30,36,0.35)] scale-105'
                          : 'border-white/10 opacity-70 hover:opacity-100 hover:border-accent-red/30'
                        }`}
                    >
                      <img
                        src={getOptimizedImageUrl(img, { width: 200, height: 200 })}
                        alt={`${product.name} - ${product.category} - صورة مصغرة ${index + 1}`}
                        loading="lazy"
                        className="w-full h-full object-contain drop-shadow-sm"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Details & Actions (Left side in RTL) */}
          <div className="flex flex-col gap-8 order-2 md:order-1 text-right">

            {/* Title, Stock & Price */}
            {/* Title, Stock & Price */}
            <div>
              <div className="flex items-center gap-2 justify-start flex-row-reverse mb-4">
                <span className="font-body text-[10px] sm:text-xs text-text-muted bg-white/5 px-3 py-1 rounded-full border border-white/5 shadow-sm">
                  {product.category === 'creatine' ? 'كرياتين' : product.category === 'protein' ? 'بروتين مصل اللبن' : product.category === 'mass-gainer' ? 'ضخامة عضلية' : product.category}
                </span>
                {isOutOfStock ? (
                  <span className="bg-accent-red text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-[0_0_15px_rgba(227,30,36,0.3)]">غيـر متـوفر</span>
                ) : isLowStock ? (
                  <span className="bg-warning/20 border border-warning/50 text-warning text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">كمية محدودة! ({product.stock})</span>
                ) : (
                  <span className="bg-success/10 border border-success/30 text-success text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    متوفر
                  </span>
                )}
              </div>

              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black italic uppercase tracking-wider text-white mb-2 leading-tight drop-shadow-md text-left" dir="ltr">
                {product.name}
              </h1>

              {/* Product Rating (Optimistic & Synced) */}
              {reviewCount > 0 && (
                <div className={`flex items-center justify-end gap-2 mb-4 transition-opacity duration-300 ${hasMounted ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="text-sm font-body text-text-muted bg-white/5 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                    <span className="font-bold">({reviewCount} تقييم)</span>
                    <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                    <span className="text-white font-bold tracking-widest">{avgRating >= 4 ? 5 : avgRating.toFixed(1)}</span>
                    <span className="text-yellow-500 text-xs mt-0.5">★</span>
                  </span>
                </div>
              )}

              <div className="flex items-baseline gap-4 justify-start border-b border-white/10 pb-6 mb-6" dir="ltr">
                <span className="font-product-title text-accent-red text-3xl sm:text-4xl font-black drop-shadow-[0_0_10px_rgba(227,30,36,0.3)] leading-none">
                  {product.price} <span className="text-xl font-bold">EGP</span>
                </span>
                {product.oldPrice && product.oldPrice > product.price && (
                  <span className="font-product-title text-text-muted/50 line-through text-lg sm:text-xl leading-none">
                    {product.oldPrice} EGP
                  </span>
                )}
              </div>
            </div>

            {/* Product Stats (Weight & Servings) */}
            {(product.weight || product.servings) && (
              <div className="bg-[#0b0b0b] border border-white/[0.08] rounded-2xl p-3 sm:p-4 grid grid-cols-2 gap-3" dir="rtl">
                {product.weight && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-accent-red text-xl">scale</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-text-muted font-medium">الوزن الصافي</span>
                      <span className="block font-product-title text-white font-bold text-sm sm:text-base tracking-wider" dir="ltr">{product.weight}</span>
                    </div>
                  </div>
                )}
                {product.servings && (
                  <div className="flex items-center gap-3 border-r border-white/[0.06] pr-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-accent-red text-xl">local_drink</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-text-muted font-medium">عدد الجرعات</span>
                      <span className="block font-product-title text-white font-bold text-sm sm:text-base tracking-wider" dir="ltr">{product.servings} srv</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Flavors Select */}
            {product.flavors && product.flavors.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-xs uppercase font-product-title font-bold text-text-muted tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-red"></span>
                  اختر النكهة
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {product.flavors.map((flavor) => (
                    <button
                      key={flavor}
                      onClick={() => setSelectedFlavor(flavor)}
                      className={`px-4 py-2.5 font-product-title text-xs sm:text-sm font-bold tracking-wide transition-all duration-200 rounded-xl border ${selectedFlavor === flavor
                          ? 'border-accent-red text-white bg-accent-red shadow-[0_0_15px_rgba(227,30,36,0.35)]'
                          : 'border-white/[0.08] text-white/70 bg-[#0e0e0e] hover:border-white/20 hover:text-white'
                        }`}
                    >
                      {flavor}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Bar: Quantity & Add to Cart */}
            <div className="flex gap-3 items-center w-full pt-1">
              {/* Stepper */}
              <div className="flex items-center bg-[#0d0d0d] border border-white/[0.08] px-1.5 justify-between w-28 sm:w-32 rounded-xl shrink-0 h-12 sm:h-13">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-white text-lg font-bold hover:bg-white/[0.06] transition-colors rounded-lg active:scale-95 disabled:opacity-30"
                  disabled={isOutOfStock || quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => handleQuantityChange(Number(e.target.value))}
                  disabled={isOutOfStock}
                  className="bg-transparent border-none text-center w-full text-white font-product-title font-black text-base sm:text-lg focus:ring-0 p-0"
                />
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-white text-lg font-bold hover:bg-white/[0.06] transition-colors rounded-lg active:scale-95 disabled:opacity-30"
                  disabled={isOutOfStock || quantity >= product.stock}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              {/* Add to Cart CTA */}
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex-1 h-12 sm:h-13 px-6 font-product-title font-black text-sm sm:text-base tracking-wider transition-all duration-200 flex items-center justify-center gap-2.5 rounded-xl select-none active:scale-[0.98] ${isOutOfStock
                    ? 'bg-white/[0.04] text-text-muted/40 cursor-not-allowed border border-white/[0.06]'
                    : 'bg-accent-red hover:bg-[#ff1a22] text-white shadow-[0_4px_25px_rgba(227,30,36,0.45)] hover:shadow-[0_6px_35px_rgba(227,30,36,0.65)] hover:-translate-y-0.5'
                  }`}
              >
                <span className="material-symbols-outlined text-[20px] sm:text-[22px]">
                  {isOutOfStock ? 'remove_shopping_cart' : 'shopping_bag'}
                </span>
                <span>{isOutOfStock ? 'غير متوفر بالمخزن' : 'أضف للسلة'}</span>
              </button>
            </div>

            {/* Athletic Brand Guarantees */}
            <div className="bg-[#0b0b0b] border border-white/[0.08] rounded-xl sm:rounded-2xl p-3 sm:p-3.5 grid grid-cols-3 divide-x divide-x-reverse divide-white/[0.06]">
              <div className="flex flex-col items-center justify-center text-center px-1">
                <span className="material-symbols-outlined text-accent-red text-2xl mb-1 drop-shadow-[0_0_8px_rgba(227,30,36,0.4)]">verified</span>
                <span className="font-product-title text-xs text-white font-bold tracking-wider">أصلي 100%</span>
                <span className="text-[10px] text-text-muted mt-0.5">ضمان المصنع</span>
              </div>
              <div className="flex flex-col items-center justify-center text-center px-1">
                <span className="material-symbols-outlined text-accent-red text-2xl mb-1 drop-shadow-[0_0_8px_rgba(227,30,36,0.4)]">biotech</span>
                <span className="font-product-title text-xs text-white font-bold tracking-wider">نقاء مضمون</span>
                <span className="text-[10px] text-text-muted mt-0.5">معايير رياضية</span>
              </div>
              <div className="flex flex-col items-center justify-center text-center px-1">
                <span className="material-symbols-outlined text-accent-red text-2xl mb-1 drop-shadow-[0_0_8px_rgba(227,30,36,0.4)]">local_shipping</span>
                <span className="font-product-title text-xs text-white font-bold tracking-wider">شحن ومعاينة</span>
                <span className="text-[10px] text-text-muted mt-0.5">فحص قبل الدفع</span>
              </div>
            </div>

            {/* Live Active Shoppers */}
            {hasMounted && visitorCount > 0 && (
              <div className="bg-[#0b0b0b] border border-white/[0.08] rounded-xl p-3 px-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-red opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-red"></span>
                  </span>
                  <span className="text-xs sm:text-sm font-product-title text-white/90">
                    يشاهد هذا المنتج الآن
                    <motion.span
                      key={visitorCount}
                      initial={{ opacity: 0, scale: 0.5, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="font-black text-accent-red mx-1.5 text-base md:text-lg"
                    >
                      {visitorCount}
                    </motion.span>
                    رياضي
                  </span>
                </div>
                <span className="text-[10px] font-product-title font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/20 shrink-0">
                  إقبال مرتفع
                </span>
              </div>
            )}

          </div>

        </div>

        {/* Tabbed Info details (Description, usage, returns) */}
        <section className="border-t border-white/10 pt-16 mt-8">
          <div className="flex border-b border-white/10 mb-8 overflow-x-auto flex-row-reverse custom-scrollbar">
            <button
              onClick={() => setActiveTab('desc')}
              className={`font-product-title text-lg pb-4 px-8 whitespace-nowrap transition-all duration-300 relative ${activeTab === 'desc'
                ? 'text-accent-red font-bold drop-shadow-[0_0_8px_rgba(227,30,36,0.5)]'
                : 'text-text-muted hover:text-white'
                }`}
            >
              الوصف
              {activeTab === 'desc' && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-accent-red shadow-[0_0_10px_rgba(227,30,36,0.8)]"></div>}
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`font-product-title text-lg pb-4 px-8 whitespace-nowrap transition-all duration-300 relative ${activeTab === 'usage'
                ? 'text-accent-red font-bold drop-shadow-[0_0_8px_rgba(227,30,36,0.5)]'
                : 'text-text-muted hover:text-white'
                }`}
            >
              طريقة الاستخدام
              {activeTab === 'usage' && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-accent-red shadow-[0_0_10px_rgba(227,30,36,0.8)]"></div>}
            </button>
            <button
              onClick={() => setActiveTab('shipping')}
              className={`font-product-title text-lg pb-4 px-8 whitespace-nowrap transition-all duration-300 relative ${activeTab === 'shipping'
                ? 'text-accent-red font-bold drop-shadow-[0_0_8px_rgba(227,30,36,0.5)]'
                : 'text-text-muted hover:text-white'
                }`}
            >
              الشحن والترجيع
              {activeTab === 'shipping' && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-accent-red shadow-[0_0_10px_rgba(227,30,36,0.8)]"></div>}
            </button>
          </div>

          <div className="text-text-muted font-body text-sm leading-relaxed max-w-3xl text-right">
            {activeTab === 'desc' && (
              <div className="space-y-4">
                <div className="text-white text-base font-semibold whitespace-pre-wrap leading-relaxed">
                  {product.description?.trim() || `${product.name} من إكس باور نيوترشن، خامات عالية الجودة ومصممة بأعلى معايير النقاء لدعم أسلوب حياتك وأهدافك الرياضية.`}
                </div>
                <p>
                  المنتج ده متصمم مخصوص للرياضيين اللي بيدوروا على الأفضل. مكمل غذائي نقي تم اختباره معمليًا عشان يضمن أداء عالي وسرعة استشفاء وبناء عضل صافي.
                </p>
                <ul className="list-disc list-inside space-y-2 text-text-muted/80 mt-4">
                  <li>منتج جودته عالية وسريع الامتصاص في العضلات.</li>
                  <li>بيمنع هدم العضلات وبيساعدك تزود قوة تحملك.</li>
                  <li>مفهوش أي منشطات أو مواد معدلة وراثياً.</li>
                </ul>
              </div>
            )}

            {activeTab === 'usage' && (
              <div className="space-y-4">
                <h4 className="text-white text-base font-semibold">الجرعة وطريقة الاستخدام المقترحة:</h4>
                <p>
                  اخلط سكوب واحد (أو الجرعة المكتوبة) مع 200 لـ 250 مللي مياه ساقعة أو لبن خالي الدسم في الشيكر.
                </p>
                <p>
                  يُفضل تاخده بعد التمرين على طول عشان تعوض العضلات وتسرع الاستشفاء، أو الصبح بدري في أيام الراحة.
                </p>
                <div className="p-3.5 bg-accent-red/5 border-r-3 border-accent-red mt-4 text-xs text-accent-red">
                  تحذير: متزودش عن الجرعة اليومية المكتوبة. ياريت تستشير دكتور لو عندك أي مشاكل صحية.
                </div>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="space-y-4">
                <h4 className="text-white text-base font-semibold">نظام التوصيل والترجيع:</h4>
                <p>
                  التوصيل متاح لكل المحافظات في مصر خلال 24 لـ 48 ساعة بالكتير.
                </p>
                <p className="font-bold text-white">
                  عاين الطرد وقت الاستلام: من حقك تفتح الطرد وتتأكد من المنتجات وتاريخ الصلاحية قبل ما تدفع للمندوب.
                </p>
                <p>
                  عندنا نظام استبدال وترجيع مرن خلال 14 يوم من تاريخ الشراء، بس بشرط تكون العلبة مقفولة وبحالتها الأصلية.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Product Reviews Section */}
        <ProductReviews
          product={product}
          onReviewsLoaded={(avg, count) => {
            setAvgRating(avg);
            setReviewCount(count);
          }}
          onReviewAdded={(newAvg, newCount) => {
            setAvgRating(newAvg);
            setReviewCount(newCount);
          }}
        />

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <section className="mt-8 mb-16 pt-16 border-t border-white/5">
            <h2 className="font-display text-2xl md:text-3xl font-black text-white uppercase tracking-wider mb-8 text-right flex items-center justify-start gap-3 flex-row-reverse" dir="ltr">
              <div className="w-8 h-8 rounded-full bg-accent-red/20 flex items-center justify-center border border-accent-red/30 shrink-0">
                <span className="material-symbols-outlined text-accent-red text-sm">view_carousel</span>
              </div>
              منتجات تهمك
            </h2>
            <BestSellersSlider products={relatedProducts} />
          </section>
        )}

      </div>

      {/* Premium Toast Notification */}
      <div
        className={`fixed bottom-6 left-6 z-50 bg-black/90 backdrop-blur-md border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.8)] p-4 flex items-center gap-4 max-w-sm rounded-sm transition-all duration-500 ease-out transform ${showToast ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'
          }`}
        dir="rtl"
      >
        <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center border border-success/30 flex-shrink-0 relative">
          <div className="absolute inset-0 rounded-full border border-success/40 animate-ping opacity-20"></div>
          <span className="material-symbols-outlined text-success text-2xl drop-shadow-[0_0_5px_rgba(37,211,102,0.5)]">shopping_cart_checkout</span>
        </div>
        <div className="flex-grow text-right min-w-[150px]">
          <h4 className="font-display font-bold text-white text-sm">اتضاف لعربية التسوق!</h4>
          <p className="font-body text-xs text-text-muted mt-1 truncate max-w-[150px]">{product.name}</p>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0 border-r border-white/10 pr-4">
          <Link
            href="/cart"
            className="text-accent-red hover:text-white text-xs font-product-title font-bold transition-colors text-center border border-accent-red hover:bg-accent-red px-3 py-1.5 rounded-sm"
          >
            شوف السلة
          </Link>
          <button
            onClick={() => setShowToast(false)}
            className="text-text-muted hover:text-white text-[10px] font-body font-bold py-1 px-2 transition-colors text-center"
          >
            اقفل
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 md:p-10"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-6 right-6 md:top-10 md:right-10 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full flex items-center justify-center z-[110]"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(false);
            }}
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>

          {/* Large Image */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getOptimizedImageUrl(selectedImage, { width: 1200, height: 1200 })}
              alt={product.name}
              className="max-w-full max-h-[85vh] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
            />
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Simple local Link component wrapper because Next Link needs standard routes
import Link from 'next/link';
