'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from '@/components/site/ProductCard';
import { Product, Category } from '@/lib/types';
import { getProducts } from '@/lib/firebase/products';
import { getCategories, getSiteConfig } from '@/lib/firebase/admin-actions';
import Spinner from '@/components/ui/Spinner';
import { searchProductsScored } from '@/lib/search/search-engine';

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [bestSellerIds, setBestSellerIds] = useState<Set<string>>(new Set());

  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSortOpen, setIsSortOpen] = useState(false);

  const sortOptions = [
    { value: 'latest', label: 'الأحدث وصل حديثاً' },
    { value: 'popular', label: 'الأكثر مبيعاً' },
    { value: 'top-rated', label: 'الأكثر تقييماً' },
    { value: 'discount-desc', label: 'الخصم الأكبر أولاً 🔥' },
    { value: 'price-asc', label: 'السعر: من الأقل للأعلى' },
    { value: 'price-desc', label: 'السعر: من الأعلى للأقل' }
  ];

  // 1. Sync filters from URL search params on mount & param changes
  useEffect(() => {
    const catQuery = searchParams.get('category');
    setSelectedCategory(catQuery || 'all');

    const searchVal = searchParams.get('search');
    setSearchQuery(searchVal || '');

    const saleVal = searchParams.get('sale') || searchParams.get('discount');
    setOnlyDiscounted(saleVal === 'true' || saleVal === '1');

    const inStockVal = searchParams.get('inStock');
    setOnlyInStock(inStockVal === 'true' || inStockVal === '1');

    const sortVal = searchParams.get('sort');
    if (sortVal) {
      setSortBy(sortVal);
    }
  }, [searchParams]);

  // 2. Fetch products and active categories
  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedProducts, fetchedCategories, fetchedConfig] = await Promise.all([
          getProducts(undefined, true),
          getCategories(),
          getSiteConfig()
        ]);

        if (fetchedConfig?.bestSellers?.productIds && Array.isArray(fetchedConfig.bestSellers.productIds)) {
          setBestSellerIds(new Set(fetchedConfig.bestSellers.productIds));
        }

        const isAccessory = (val?: string) => {
          if (!val) return false;
          const lower = val.toLowerCase().trim();
          return lower === 'اكسسوارات' || lower.includes('access') || lower === 'accessories';
        };

        const sortedCats = fetchedCategories
          .filter(c => c.isActive)
          .sort((a, b) => {
            const aAcc = isAccessory(a.slug) || isAccessory(a.name);
            const bAcc = isAccessory(b.slug) || isAccessory(b.name);
            if (aAcc && !bAcc) return 1;
            if (!aAcc && bAcc) return -1;
            return 0;
          });

        setProducts(fetchedProducts);
        setCategories(sortedCats);
      } catch (err) {
        console.error('Error loading products page data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Fast Category Map for Search Engine
  const categoriesMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(c => {
      if (c.slug) map[c.slug] = c.name;
    });
    return map;
  }, [categories]);

  // Helper: check if product has an active discount / offer
  const isProductOnSale = (p: Product) => {
    const price = Number(p.price) || 0;
    const oldPrice = Number(p.oldPrice) || 0;
    return oldPrice > price;
  };

  // Helper: check if product is a bestseller (has sales or flagged in siteConfig)
  const isProductPopular = (p: Product) => {
    return Boolean((p.salesCount && p.salesCount > 0) || (p.id && bestSellerIds.has(p.id)));
  };

  // Helper: check if product has customer reviews or rating
  const isProductTopRated = (p: Product) => {
    return Boolean((p.avgRating && p.avgRating > 0) || (p.reviewCount && p.reviewCount > 0));
  };

  // Counts for quick badges
  const discountedCount = useMemo(() => {
    return products.filter(isProductOnSale).length;
  }, [products]);

  const inStockCount = useMemo(() => {
    return products.filter(p => p.stock > 0).length;
  }, [products]);

  const popularCount = useMemo(() => {
    return products.filter(isProductPopular).length;
  }, [products, bestSellerIds]);

  const topRatedCount = useMemo(() => {
    return products.filter(isProductTopRated).length;
  }, [products]);

  // 3. Smart Search & Filter Engine Execution
  const filteredProducts = useMemo(() => {
    let pool = products;

    // A. Unified Arabic-Normalized & Scored Search
    if (searchQuery.trim()) {
      const scoredResults = searchProductsScored(pool, searchQuery, categoriesMap);
      pool = scoredResults.map(r => r.product);
    }

    // B. Category Filter (Resilient matching for slug, id, or Arabic name)
    if (selectedCategory !== 'all') {
      const targetCat = categories.find(c => 
        c.slug === selectedCategory || 
        c.id === selectedCategory || 
        c.name === selectedCategory
      );
      pool = pool.filter(p => {
        if (!p.category) return false;
        if (p.category === selectedCategory) return true;
        if (targetCat) {
          return p.category === targetCat.slug || 
                 p.category === targetCat.id || 
                 p.category === targetCat.name;
        }
        return false;
      });
    }

    // C. Discounted / Offers Only Filter
    // When onlyDiscounted is true OR when the user sorts by 'discount-desc', STRICTLY show only products with active offers!
    if (onlyDiscounted || sortBy === 'discount-desc') {
      pool = pool.filter(isProductOnSale);
    }

    // D. Popular / Best Sellers Filter (طلب المستخدم: فلترة المنتجات الأكثر مبيعاً فقط مش كل المنتجات)
    if (sortBy === 'popular') {
      pool = pool.filter(isProductPopular);
    }

    // E. Top-Rated Filter (فلترة المنتجات الحاصلة على تقييمات فقط)
    if (sortBy === 'top-rated') {
      pool = pool.filter(isProductTopRated);
    }

    // F. In-Stock Only Filter
    if (onlyInStock) {
      pool = pool.filter(p => p.stock > 0);
    }

    // G. Sorting
    return [...pool].sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'popular') {
        const aScore = (a.salesCount || 0) + (a.id && bestSellerIds.has(a.id) ? 100 : 0);
        const bScore = (b.salesCount || 0) + (b.id && bestSellerIds.has(b.id) ? 100 : 0);
        return bScore - aScore;
      }
      if (sortBy === 'discount-desc') {
        const getSavings = (p: Product) => (p.oldPrice && p.oldPrice > p.price ? p.oldPrice - p.price : 0);
        return getSavings(b) - getSavings(a);
      }
      if (sortBy === 'top-rated') {
        const ratingDiff = (b.avgRating || 0) - (a.avgRating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      }

      // 'latest' default: keep main supplements first, accessories at the end
      if (selectedCategory === 'all') {
        const isAcc = (cat?: string) => {
          if (!cat) return false;
          const lower = cat.toLowerCase().trim();
          return lower === 'اكسسوارات' || lower.includes('access') || lower === 'accessories';
        };
        const aAcc = isAcc(a.category);
        const bAcc = isAcc(b.category);
        if (aAcc && !bAcc) return 1;
        if (!aAcc && bAcc) return -1;
      }
      return 0;
    });
  }, [products, categoriesMap, searchQuery, selectedCategory, onlyDiscounted, onlyInStock, sortBy, bestSellerIds]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setOnlyDiscounted(false);
    setOnlyInStock(false);
    setSortBy('latest');
    router.replace('/products');
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedCategory !== 'all' ||
    onlyDiscounted ||
    onlyInStock ||
    sortBy !== 'latest'
  );

  if (loading) {
    return (
      <div className="bg-[#050505] text-text-primary min-h-screen py-16 px-6 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-accent-red/5 to-transparent pointer-events-none"></div>
        <Spinner className="inline-block w-12 h-12 text-accent-red animate-spin drop-shadow-[0_0_10px_rgba(227,30,36,0.5)]" />
      </div>
    );
  }

  return (
    <div className="bg-[#050505] text-text-primary min-h-screen py-8 md:py-16 px-4 md:px-8 relative overflow-hidden" dir="rtl">
      {/* Background Lighting */}
      <div className="absolute top-0 right-0 w-full h-[600px] bg-gradient-to-b from-accent-red/5 to-transparent pointer-events-none"></div>

      <div className="w-full max-w-[1400px] mx-auto relative z-10">

        {/* Modern Page Header */}
        <div className="mb-6 md:mb-10 text-center md:text-right bg-gradient-to-br from-[#0a0a0a] to-[#050505] p-6 md:p-10 rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-red/20 blur-[80px] rounded-full pointer-events-none"></div>
          <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-accent-red bg-accent-red/10 border border-accent-red/20 px-3 py-1.5 rounded-full mb-3 shadow-[0_0_15px_rgba(227,30,36,0.15)]">
            <span className="material-symbols-outlined text-sm">fitness_center</span>
            المتجر الرسمي
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black italic uppercase tracking-wider text-white mb-2 md:mb-3">
            جميع المنتجات
          </h1>
          <p className="text-text-muted font-body text-xs sm:text-sm md:text-base max-w-2xl mx-auto md:mx-0 leading-relaxed">
            اختر من بين تشكيلتنا المتكاملة من أفضل المكملات الغذائية الأصلية 100% المعتمدة رياضياً.
          </p>
        </div>

        {/* Desktop Search & Sort Bar (Hidden on Mobile) */}
        <div className="hidden md:flex gap-4 mb-8 items-center justify-between">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="ابحث بالاسم، القسم، النكهة، الحجم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl text-white px-5 py-3.5 pr-11 focus:border-accent-red focus:ring-1 focus:ring-accent-red focus:outline-none text-sm font-display font-medium transition-all shadow-inner"
            />
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-text-muted">
              search
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                aria-label="مسح البحث"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted font-display">الترتيب:</span>
            
            {/* Custom Sort Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="bg-[#0a0a0a] border border-white/10 rounded-xl text-white px-4 py-3 text-sm flex items-center justify-between min-w-[210px] hover:border-accent-red/50 transition-colors font-display font-bold"
              >
                <span>{sortOptions.find(o => o.value === sortBy)?.label || 'الترتيب'}</span>
                <span className="material-symbols-outlined text-sm">{isSortOpen ? 'expand_less' : 'expand_more'}</span>
              </button>
              
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)}></div>
                  <div className="absolute top-full left-0 mt-2 w-full bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {sortOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => { setSortBy(option.value); setIsSortOpen(false); }}
                        className={`w-full text-right px-4 py-3 text-sm transition-colors font-display ${sortBy === option.value ? 'bg-accent-red text-white font-bold' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl p-1 shrink-0">
              <button 
                onClick={() => setViewMode('grid')}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-accent-red text-white shadow-md' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
                title="عرض كشبكة"
              >
                <span className="material-symbols-outlined text-lg">grid_view</span>
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-accent-red text-white shadow-md' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
                title="عرض كقائمة"
              >
                <span className="material-symbols-outlined text-lg">view_list</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="flex md:hidden gap-3 mb-4 relative z-30">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="ابحث بالاسم، القسم، النكهة، الحجم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 text-white rounded-2xl px-4 py-3.5 pr-11 focus:border-accent-red focus:ring-1 focus:ring-accent-red focus:outline-none text-sm font-display font-medium transition-all shadow-inner"
            />
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-lg">
              search
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                aria-label="مسح البحث"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="bg-gradient-to-r from-accent-red to-red-600 text-white w-14 rounded-2xl shrink-0 flex items-center justify-center shadow-[0_0_15px_rgba(227,30,36,0.3)] active:scale-95 transition-transform relative"
            aria-label="فتح الفلاتر"
          >
            <span className="material-symbols-outlined text-xl">tune</span>
            {hasActiveFilters && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-white ring-2 ring-accent-red animate-ping" />
            )}
          </button>
        </div>

        {/* Quick Filter Horizontal Scroll Pills (Mobile & Desktop) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {/* Offers / Discount Filter Pill (طلب المستخدم الأساسي: يجيب المنتجات اللي عليها أوفر بس) */}
          <button
            type="button"
            onClick={() => {
              const next = !onlyDiscounted;
              setOnlyDiscounted(next);
              if (next && sortBy === 'latest') setSortBy('discount-desc');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-display font-black whitespace-nowrap shrink-0 transition-all border active:scale-95 ${
              onlyDiscounted || sortBy === 'discount-desc'
                ? 'bg-accent-red text-white border-accent-red shadow-[0_0_15px_rgba(227,30,36,0.4)]'
                : 'bg-[#0a0a0a] text-zinc-300 border-white/10 hover:border-accent-red/50 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm text-accent-red">local_fire_department</span>
            <span>عروض وخصومات فقط 🔥</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              onlyDiscounted || sortBy === 'discount-desc' ? 'bg-white/20 text-white' : 'bg-white/10 text-zinc-400'
            }`}>
              {discountedCount}
            </span>
          </button>

          {/* All Products Pill */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setOnlyDiscounted(false);
            }}
            className={`inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-display font-bold whitespace-nowrap shrink-0 transition-all border active:scale-95 ${
              selectedCategory === 'all' && !onlyDiscounted && sortBy !== 'discount-desc'
                ? 'bg-white/15 text-white border-white/30'
                : 'bg-[#0a0a0a] text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            <span>جميع المنتجات</span>
          </button>

          {/* Popular / Best Sellers Pill */}
          <button
            type="button"
            onClick={() => {
              setSortBy(prev => prev === 'popular' ? 'latest' : 'popular');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-display font-black whitespace-nowrap shrink-0 transition-all border active:scale-95 ${
              sortBy === 'popular'
                ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-[#0a0a0a] text-zinc-300 border-white/10 hover:border-amber-400/50 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">workspace_premium</span>
            <span>الأكثر مبيعاً 🏆</span>
            {popularCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                sortBy === 'popular' ? 'bg-black/20 text-black' : 'bg-white/10 text-zinc-400'
              }`}>
                {popularCount}
              </span>
            )}
          </button>

          {/* Top-Rated Pill */}
          <button
            type="button"
            onClick={() => {
              setSortBy(prev => prev === 'top-rated' ? 'latest' : 'top-rated');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-display font-black whitespace-nowrap shrink-0 transition-all border active:scale-95 ${
              sortBy === 'top-rated'
                ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                : 'bg-[#0a0a0a] text-zinc-300 border-white/10 hover:border-amber-400/50 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">star</span>
            <span>الأعلى تقييماً ⭐</span>
            {topRatedCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                sortBy === 'top-rated' ? 'bg-black/20 text-black' : 'bg-white/10 text-zinc-400'
              }`}>
                {topRatedCount}
              </span>
            )}
          </button>

          {/* In-Stock Pill */}
          <button
            type="button"
            onClick={() => setOnlyInStock(!onlyInStock)}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-display font-bold whitespace-nowrap shrink-0 transition-all border active:scale-95 ${
              onlyInStock
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-[#0a0a0a] text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-xs">check_circle</span>
            <span>متوفر فقط</span>
          </button>

          {/* Category Quick Pills */}
          {categories.slice(0, 6).map((cat) => (
            <button
              key={cat.id || cat.slug}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.slug);
              }}
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-display font-bold whitespace-nowrap shrink-0 transition-all border active:scale-95 ${
                selectedCategory === cat.slug
                  ? 'bg-accent-red/20 text-accent-red border-accent-red/40 font-black'
                  : 'bg-[#0a0a0a] text-zinc-400 border-white/10 hover:text-white'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Main Content Layout (Sidebar + Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-8 items-start">

          {/* Mobile Filter Backdrop */}
          {isMobileFilterOpen && (
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] md:hidden animate-in fade-in duration-300"
              onClick={() => setIsMobileFilterOpen(false)}
            />
          )}

          {/* Filters Sidebar (Desktop + Mobile Bottom Sheet) */}
          <div className={`
            md:block md:col-span-1 md:bg-[#0a0a0a] md:border md:border-white/5 md:p-6 md:rounded-3xl text-right md:space-y-8
            ${isMobileFilterOpen
              ? 'fixed bottom-0 left-0 right-0 z-[70] bg-[#0a0a0a] border-t border-white/10 p-6 rounded-t-[2rem] max-h-[85vh] overflow-y-auto shadow-[0_-20px_50px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-full duration-300 space-y-6'
              : 'hidden'}
          `}>

            {/* Mobile Sheet Handle */}
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto md:hidden mb-2"></div>

            {/* Mobile Header & Mobile Sort */}
            <div className="md:hidden border-b border-white/10 pb-4 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-display font-black text-white text-xl">تصفية المنتجات</h2>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="bg-white/5 w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {/* Mobile Sort */}
              <div>
                <label className="text-[11px] text-text-muted mb-2 block font-bold font-display">الترتيب حسب:</label>
                <div className="relative">
                  <button 
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl text-white px-4 py-3 text-sm flex items-center justify-between hover:border-accent-red/50 transition-colors font-display"
                  >
                    <span>{sortOptions.find(o => o.value === sortBy)?.label || 'الترتيب'}</span>
                    <span className="material-symbols-outlined text-sm">{isSortOpen ? 'expand_less' : 'expand_more'}</span>
                  </button>
                  
                  {isSortOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)}></div>
                      <div className="absolute top-full left-0 mt-2 w-full bg-[#050505] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                        {sortOptions.map(option => (
                          <button
                            key={option.value}
                            onClick={() => { setSortBy(option.value); setIsSortOpen(false); }}
                            className={`w-full text-right px-4 py-3 text-sm transition-colors font-display ${sortBy === option.value ? 'bg-accent-red text-white font-bold' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Status Filters: Discounted & In Stock */}
            <div className="space-y-2.5">
              <h3 className="font-display text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent-red rounded-full"></span>
                عروض وحالة التوفر
              </h3>

              {/* Discounted / On-Sale Filter (طلب المستخدم: إضافة المنتجات اللي عليها خصم) */}
              <button
                type="button"
                onClick={() => setOnlyDiscounted(!onlyDiscounted)}
                className={`w-full text-right px-4 py-3 rounded-2xl text-xs sm:text-sm font-display font-black transition-all flex items-center justify-between border active:scale-98 ${
                  onlyDiscounted
                    ? 'bg-accent-red text-white border-accent-red shadow-[0_0_15px_rgba(227,30,36,0.4)]'
                    : 'bg-white/[0.03] border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-base ${onlyDiscounted ? 'text-white' : 'text-accent-red'}`}>
                    local_fire_department
                  </span>
                  <span>عروض وخصومات فقط 🔥</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${onlyDiscounted ? 'bg-white/20' : 'bg-black/60 text-zinc-400'}`}>
                  {discountedCount}
                </span>
              </button>

              {/* Popular / Best Sellers Filter */}
              <button
                type="button"
                onClick={() => setSortBy(prev => prev === 'popular' ? 'latest' : 'popular')}
                className={`w-full text-right px-4 py-3 rounded-2xl text-xs sm:text-sm font-display font-black transition-all flex items-center justify-between border active:scale-98 ${
                  sortBy === 'popular'
                    ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : 'bg-white/[0.03] border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-base ${sortBy === 'popular' ? 'text-black' : 'text-amber-400'}`}>
                    workspace_premium
                  </span>
                  <span>الأكثر مبيعاً 🏆</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sortBy === 'popular' ? 'bg-black/20 text-black' : 'bg-black/60 text-zinc-400'}`}>
                  {popularCount}
                </span>
              </button>

              {/* Top-Rated Filter */}
              <button
                type="button"
                onClick={() => setSortBy(prev => prev === 'top-rated' ? 'latest' : 'top-rated')}
                className={`w-full text-right px-4 py-3 rounded-2xl text-xs sm:text-sm font-display font-black transition-all flex items-center justify-between border active:scale-98 ${
                  sortBy === 'top-rated'
                    ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                    : 'bg-white/[0.03] border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-base ${sortBy === 'top-rated' ? 'text-black' : 'text-amber-400'}`}>
                    star
                  </span>
                  <span>الأعلى تقييماً ⭐</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sortBy === 'top-rated' ? 'bg-black/20 text-black' : 'bg-black/60 text-zinc-400'}`}>
                  {topRatedCount}
                </span>
              </button>

              {/* In-Stock Only Filter */}
              <button
                type="button"
                onClick={() => setOnlyInStock(!onlyInStock)}
                className={`w-full text-right px-4 py-3 rounded-2xl text-xs sm:text-sm font-display font-black transition-all flex items-center justify-between border active:scale-98 ${
                  onlyInStock
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                    : 'bg-white/[0.03] border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-base ${onlyInStock ? 'text-white' : 'text-emerald-400'}`}>
                    check_circle
                  </span>
                  <span>المتوفر بالمخزون فقط</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${onlyInStock ? 'bg-white/20' : 'bg-black/60 text-zinc-400'}`}>
                  {inStockCount}
                </span>
              </button>
            </div>

            {/* Categories Filter */}
            <div className="md:border-t md:border-white/5 md:pt-6 pt-2">
              <h3 className="font-display text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent-red rounded-full"></span>
                الأقسام
              </h3>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-right px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-between font-display ${selectedCategory === 'all'
                      ? 'bg-accent-red text-white font-bold shadow-[0_0_15px_rgba(227,30,36,0.3)]'
                      : 'bg-white/5 text-text-muted hover:bg-white/10'
                    }`}
                >
                  <span>الكل</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selectedCategory === 'all' ? 'bg-white/20' : 'bg-black/50'}`}>
                    {products.length}
                  </span>
                </button>
                {categories.map((cat) => {
                  const count = products.filter(p => p.category === cat.slug).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`w-full text-right px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-between font-display ${selectedCategory === cat.slug
                          ? 'bg-accent-red text-white font-bold shadow-[0_0_15px_rgba(227,30,36,0.3)]'
                          : 'bg-white/5 text-text-muted hover:bg-white/10'
                        }`}
                    >
                      <span>{cat.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selectedCategory === cat.slug ? 'bg-white/20' : 'bg-black/50'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="md:border-t md:border-white/5 md:pt-6 pt-2 space-y-3 pb-6 md:pb-0">
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full md:hidden py-4 rounded-xl bg-gradient-to-r from-accent-red to-red-600 text-white font-display font-black text-sm shadow-[0_0_20px_rgba(227,30,36,0.3)] active:scale-95 transition-transform"
              >
                عرض النتائج ({filteredProducts.length})
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-text-muted hover:text-white hover:bg-white/10 text-xs font-display font-bold transition-colors flex items-center justify-center gap-2 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                  إعادة ضبط الفلاتر
                </button>
              )}
            </div>
          </div>

          {/* Product Grid & Active Filters Bar */}
          <div className="md:col-span-3">

            {/* Active Filter Chips & Live Count */}
            <div className="flex items-center justify-between gap-3 mb-5 flex-wrap bg-[#0a0a0c] border border-white/5 px-4 py-3 rounded-2xl">
              <div className="text-xs text-zinc-400 font-display font-medium">
                عرض <span className="text-white font-black">{filteredProducts.length}</span> من إجمالي <span className="text-white font-black">{products.length}</span> منتج
              </div>

              {hasActiveFilters && (
                <div className="flex items-center gap-2 flex-wrap">
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-display text-white">
                      <span>بحث: {searchQuery}</span>
                      <button onClick={() => setSearchQuery('')} className="text-zinc-400 hover:text-white" aria-label="حذف بحث">
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    </span>
                  )}
                  {selectedCategory !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-display text-white">
                      <span>القسم: {categories.find(c => c.slug === selectedCategory)?.name || selectedCategory}</span>
                      <button onClick={() => setSelectedCategory('all')} className="text-zinc-400 hover:text-white" aria-label="حذف قسم">
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    </span>
                  )}
                  {onlyDiscounted && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-red/20 border border-accent-red/40 text-xs font-display text-accent-red">
                      <span>عروض وخصومات</span>
                      <button onClick={() => setOnlyDiscounted(false)} className="text-accent-red hover:text-white" aria-label="إلغاء خصومات">
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    </span>
                  )}
                  {onlyInStock && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-xs font-display text-emerald-400">
                      <span>المتوفر بالمخزون</span>
                      <button onClick={() => setOnlyInStock(false)} className="text-emerald-400 hover:text-white" aria-label="إلغاء المتوفر">
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    </span>
                  )}
                  {sortBy === 'popular' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-xs font-display text-amber-400 font-bold">
                      <span>الأكثر مبيعاً 🏆</span>
                      <button onClick={() => setSortBy('latest')} className="text-amber-400 hover:text-white" aria-label="إلغاء الأكثر مبيعاً">
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    </span>
                  )}
                  {sortBy === 'top-rated' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-400/40 text-xs font-display text-amber-300 font-bold">
                      <span>الأعلى تقييماً ⭐</span>
                      <button onClick={() => setSortBy('latest')} className="text-amber-300 hover:text-white" aria-label="إلغاء الأعلى تقييماً">
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    </span>
                  )}
                  {sortBy === 'discount-desc' && !onlyDiscounted && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-red/20 border border-accent-red/40 text-xs font-display text-accent-red font-bold">
                      <span>الخصم الأكبر 🔥</span>
                      <button onClick={() => setSortBy('latest')} className="text-accent-red hover:text-white" aria-label="إلغاء الخصم الأكبر">
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    </span>
                  )}
                  <button
                    onClick={clearFilters}
                    className="text-[11px] font-body text-accent-red hover:underline mr-1 font-bold"
                  >
                    مسح الكل
                  </button>
                </div>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-[#0a0a0a] border border-white/5 p-12 text-center my-4 rounded-3xl space-y-4">
                <span className="material-symbols-outlined text-text-muted text-5xl block">search_off</span>
                <h3 className="text-lg font-display font-black text-white">لا توجد منتجات تطابق خيارات البحث</h3>
                <p className="text-text-muted text-xs sm:text-sm font-body max-w-md mx-auto">
                  جرب تغيير الفلاتر أو تصفح قسم آخر أو البحث عن مكمل باسم مختلف.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={clearFilters}
                    className="px-6 py-2.5 bg-accent-red text-white font-display font-black text-xs rounded-xl shadow-[0_0_15px_rgba(227,30,36,0.3)] active:scale-95 transition-transform"
                  >
                    إعادة ضبط الفلاتر
                  </button>
                </div>
              </div>
            ) : (
              <div dir="ltr" className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6" : "flex flex-col gap-4"}>
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} viewMode={viewMode} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ProductsClientPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#050505] text-text-primary min-h-screen py-16 px-6 flex items-center justify-center">
          <Spinner className="inline-block w-12 h-12 text-accent-red animate-spin" />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
