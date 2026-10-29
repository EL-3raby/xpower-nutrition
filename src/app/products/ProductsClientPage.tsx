'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/site/ProductCard';
import { Product, Category } from '@/lib/types';
import { getProducts } from '@/lib/firebase/products';
import { getCategories } from '@/lib/firebase/admin-actions';
import Spinner from '@/components/ui/Spinner';

function ProductsContent() {
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState('latest');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSortOpen, setIsSortOpen] = useState(false);

  const sortOptions = [
    { value: 'latest', label: 'الأحدث وصل حديثاً' },
    { value: 'popular', label: 'الأكثر مبيعاً' },
    { value: 'top-rated', label: 'الأكثر تقييماً' },
    { value: 'price-asc', label: 'السعر: من الأقل للأعلى' },
    { value: 'price-desc', label: 'السعر: من الأعلى للأقل' }
  ];

  // Sync category filter from URL search params if present
  useEffect(() => {
    const catQuery = searchParams.get('category');
    if (catQuery) {
      setSelectedCategory(catQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedProducts, fetchedCategories] = await Promise.all([
          getProducts(undefined, true),
          getCategories()
        ]);

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

// Comprehensive text normalizer for Arabic and English smart search
function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '') // remove Arabic tashkeel
    .replace(/(\d+)\s*(srv|servings|serving|g|gm|kg|lb|lbs|حصة|جرعة|جرام|كيلو)/gi, '$1 $2') // split 60srv -> 60 srv
    .replace(/[-_]/g, ' ')
    .replace(/[^a-z0-9\u0600-\u06FF\s]/gi, ' ')
    .trim();
}

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    const tokens = searchQuery.trim() ? normalizeSearchText(searchQuery).split(/\s+/).filter(Boolean) : [];

    return products.filter(p => {
      // Smart Multi-Field Search (Name, Category, Slug, Flavors, Weight, Size, Servings, SRV, Description)
      if (tokens.length > 0) {
        const catObj = categories.find(c => c.slug === p.category);
        const categoryArabic = catObj?.name || '';
        const categoryAliases = p.category === 'creatine' ? 'كرياتين كرياتين مونوهيدرات طاقة باور قوة' : 
                                p.category === 'protein' ? 'بروتين واي بروتين مصل اللبن عضلات استشفاء' :
                                p.category === 'mass-gainer' ? 'ضخامة عضلية جينر كربوهيدرات وزن زيادة' : '';

        const flavorsText = Array.isArray(p.flavors) ? p.flavors.join(' ') : '';
        
        // Comprehensive weight and size terms
        const rawWeightNum = p.weight ? p.weight.replace(/[^0-9.]/g, '') : '';
        const weightText = p.weight 
          ? `${p.weight} ${rawWeightNum} جرام غرام g gm kg كيلو حجم وزن size weight مقاس` 
          : '';

        // Comprehensive servings, SRV, dose, and scoop terms
        const servingsText = p.servings 
          ? `${p.servings} ${p.servings}srv ${p.servings} srv ${p.servings}servings ${p.servings} servings srv srvs servings serving حصة جرعة سكوب جرعات حصص سيرفنج سكوبات scoops scoop` 
          : '';

        const haystack = normalizeSearchText(`
          ${p.name} 
          ${p.slug || ''} 
          ${p.category || ''} 
          ${categoryArabic} 
          ${categoryAliases} 
          ${flavorsText} 
          ${weightText} 
          ${servingsText} 
          ${p.description || ''}
        `);

        // Check that EVERY search word/token matches the product's combined data
        const matchesAllTokens = tokens.every(token => haystack.includes(token));
        if (!matchesAllTokens) return false;
      }

      // Category
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // Price Range
      if (minPrice !== '' && p.price < minPrice) return false;
      if (maxPrice !== '' && p.price > maxPrice) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'popular') return (b.salesCount || 0) - (a.salesCount || 0);
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
  }, [products, categories, searchQuery, selectedCategory, minPrice, maxPrice, sortBy]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('latest');
  };

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
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl text-white px-5 py-3.5 pr-11 focus:border-accent-red focus:ring-1 focus:ring-accent-red focus:outline-none text-sm transition-all shadow-inner"
            />
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-text-muted">
              search
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">الترتيب:</span>
            
            {/* Custom Sort Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="bg-[#0a0a0a] border border-white/10 rounded-xl text-white px-4 py-3 text-sm flex items-center justify-between min-w-[200px] hover:border-accent-red/50 transition-colors"
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
                        className={`w-full text-right px-4 py-3 text-sm transition-colors ${sortBy === option.value ? 'bg-accent-red text-white font-bold' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
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

        {/* Mobile Search & Quick Filters Bar */}
        <div className="flex md:hidden gap-3 mb-6 relative z-30">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="ابحث بالاسم، القسم، النكهة، الحجم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 text-white rounded-2xl px-4 py-3.5 pr-11 focus:border-accent-red focus:ring-1 focus:ring-accent-red focus:outline-none text-sm transition-all shadow-inner"
            />
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-lg">
              search
            </span>
          </div>
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="bg-gradient-to-r from-accent-red to-red-600 text-white w-14 rounded-2xl shrink-0 flex items-center justify-center shadow-[0_0_15px_rgba(227,30,36,0.3)] active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-xl">tune</span>
          </button>
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
                <label className="text-[11px] text-text-muted mb-2 block font-bold">الترتيب حسب:</label>
                <div className="relative">
                  <button 
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl text-white px-4 py-3 text-sm flex items-center justify-between hover:border-accent-red/50 transition-colors"
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
                            className={`w-full text-right px-4 py-3 text-sm transition-colors ${sortBy === option.value ? 'bg-accent-red text-white font-bold' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
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

            {/* Categories Filter */}
            <div>
              <h3 className="font-product-title text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent-red rounded-full"></span>
                الأقسام
              </h3>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-right px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-between ${selectedCategory === 'all'
                      ? 'bg-accent-red text-white font-bold shadow-[0_0_15px_rgba(227,30,36,0.3)]'
                      : 'bg-white/5 text-text-muted hover:bg-white/10'
                    }`}
                >
                  <span>الكل</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedCategory === 'all' ? 'bg-white/20' : 'bg-black/50'}`}>
                    {products.length}
                  </span>
                </button>
                {categories.map((cat) => {
                  const count = products.filter(p => p.category === cat.slug).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`w-full text-right px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-between ${selectedCategory === cat.slug
                          ? 'bg-accent-red text-white font-bold shadow-[0_0_15px_rgba(227,30,36,0.3)]'
                          : 'bg-white/5 text-text-muted hover:bg-white/10'
                        }`}
                    >
                      <span>{cat.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedCategory === cat.slug ? 'bg-white/20' : 'bg-black/50'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Filter */}
            <div className="md:border-t md:border-white/5 md:pt-6 pt-2">
              <h3 className="font-product-title text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent-red rounded-full"></span>
                نطاق السعر (ج.م)
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-text-muted mb-1 block">من</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl text-white text-sm px-3 py-3 focus:border-accent-red focus:ring-1 focus:ring-accent-red focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-text-muted mb-1 block">إلى</label>
                  <input
                    type="number"
                    placeholder="10000"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl text-white text-sm px-3 py-3 focus:border-accent-red focus:ring-1 focus:ring-accent-red focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="md:border-t md:border-white/5 md:pt-6 pt-2 space-y-3 pb-6 md:pb-0">
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full md:hidden py-4 rounded-xl bg-gradient-to-r from-accent-red to-red-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(227,30,36,0.3)] active:scale-95 transition-transform"
              >
                عرض النتائج ({filteredProducts.length})
              </button>

              <button
                onClick={clearFilters}
                className="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-text-muted hover:text-white hover:bg-white/10 text-xs font-bold transition-colors flex items-center justify-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                إعادة ضبط              </button>
            </div>
          </div>

          {/* Product Grid */}
          <div className="md:col-span-3">
            {filteredProducts.length === 0 ? (
              <div className="bg-[#0a0a0a] border border-white/5 p-12 text-center my-8 rounded-3xl">
                <span className="material-symbols-outlined text-text-muted text-5xl mb-4 block">search_off</span>
                <h3 className="text-lg font-bold text-white mb-2">لا توجد منتجات تطابق خيارات البحث</h3>
                <p className="text-text-muted text-sm mb-6">جرب تغيير الفلاتر أو البحث عن منتج آخر.</p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-2.5 bg-accent-red text-white font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(227,30,36,0.2)] active:scale-95 transition-transform"
                >
                  إعادة ضبط البحث
                </button>
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
