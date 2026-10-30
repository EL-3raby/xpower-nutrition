'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/lib/types';
import { getProducts } from '@/lib/firebase/products';
import { getCategories } from '@/lib/firebase/admin-actions';
import { getOptimizedImageUrl } from '@/lib/utils/image';
import {
  searchProductsScored,
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  POPULAR_SEARCH_TAGS,
} from '@/lib/search/search-engine';

export default function GlobalSearchModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // 1. Listen for global open events and keyboard shortcuts (Ctrl+K, Cmd+K, /)
  useEffect(() => {
    const handleOpen = (e?: any) => {
      setIsOpen(true);
      if (e?.detail?.query) {
        setQuery(e.detail.query);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('open-global-search', handleOpen);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-global-search', handleOpen);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // 2. Load recent searches & prefetch products on first open
  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getRecentSearches());
      setTimeout(() => inputRef.current?.focus(), 50);

      // Lock body scroll
      document.body.style.overflow = 'hidden';

      if (products.length === 0) {
        setLoading(true);
        Promise.all([getProducts(undefined, true), getCategories()])
          .then(([prods, cats]) => {
            setProducts(prods);
            const map: Record<string, string> = {};
            cats.forEach((c) => {
              if (c.slug) map[c.slug] = c.name;
            });
            setCategoriesMap(map);
          })
          .catch(console.error)
          .finally(() => setLoading(false));
      }
    } else {
      document.body.style.overflow = '';
      setSelectedIndex(-1);
    }
  }, [isOpen, products.length]);

  // 3. Search Results calculation
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchProductsScored(products, query, categoriesMap).slice(0, 8);
  }, [query, products, categoriesMap]);

  // 4. Handle navigation to full products page
  const handleExecuteSearch = (searchWord: string) => {
    const term = searchWord.trim();
    if (!term) return;

    if (term.includes('خصم') || term.includes('عروض')) {
      saveRecentSearch(term);
      setIsOpen(false);
      router.push('/products?sale=true');
      return;
    }

    saveRecentSearch(term);
    setRecentSearches(getRecentSearches());
    setIsOpen(false);
    router.push(`/products?search=${encodeURIComponent(term)}`);
  };

  const handleProductSelect = (product: Product) => {
    if (query.trim()) {
      saveRecentSearch(query.trim());
      setRecentSearches(getRecentSearches());
    }
    setIsOpen(false);
    router.push(`/products/${product.slug}`);
  };

  const handleRemoveRecent = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = removeRecentSearch(item);
    setRecentSearches(updated);
  };

  const handleClearAllRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  // Keyboard navigation through results
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        handleProductSelect(searchResults[selectedIndex].product);
      } else if (query.trim()) {
        handleExecuteSearch(query);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="البحث الذكي في منتجات المتجر"
        dir="rtl"
        className="fixed inset-0 z-[100] flex items-start justify-center pt-8 sm:pt-20 px-3 sm:px-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-[#0A0A0C] border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden z-10 flex flex-col max-h-[85vh]"
        >
          {/* Top Ambient Glow Hairline */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-accent-red to-transparent opacity-80" />

          {/* Search Header Bar */}
          <div className="p-3 sm:p-4 border-b border-white/[0.08] flex items-center gap-3 bg-[#0d0d10] relative">
            <span className="material-symbols-outlined text-accent-red text-2xl shrink-0">
              search
            </span>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(-1);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="ابحث باسم المكمل، القسم، النكهة، الوزن..."
              className="flex-1 bg-transparent text-white font-display font-bold text-sm sm:text-base placeholder:text-zinc-500 focus:outline-none"
            />

            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                aria-label="مسح نص البحث"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-product-title text-xs font-bold border border-white/5 transition-colors hidden sm:inline-flex items-center gap-1"
            >
              <span>ESC</span>
            </button>
          </div>

          {/* Modal Body / Results */}
          <div
            ref={resultsContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 drawer-scrollbar"
          >
            {/* 1. If Query is empty: Show Recent Searches & Popular Tags */}
            {!query.trim() && (
              <div className="space-y-5">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2.5 px-1">
                      <span className="text-xs font-display font-black text-zinc-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-accent-red">history</span>
                        <span>عمليات البحث الأخيرة</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleClearAllRecent}
                        className="text-[11px] font-body text-zinc-500 hover:text-accent-red transition-colors"
                      >
                        مسح السجل
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((item) => (
                        <div
                          key={item}
                          onClick={() => {
                            setQuery(item);
                            handleExecuteSearch(item);
                          }}
                          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-zinc-200 text-xs font-display font-bold cursor-pointer transition-all active:scale-95"
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveRecent(e, item)}
                            className="text-zinc-500 hover:text-white transition-colors"
                            aria-label={`حذف ${item} من السجل`}
                          >
                            <span className="material-symbols-outlined text-[13px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Trending Tags */}
                <div>
                  <div className="mb-2.5 px-1">
                    <span className="text-xs font-display font-black text-zinc-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-accent-red">trending_up</span>
                      <span>الأكثر بحثاً في إكس باور</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SEARCH_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setQuery(tag);
                          handleExecuteSearch(tag);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141418] hover:bg-accent-red hover:text-white border border-white/5 text-zinc-300 text-xs font-display font-bold transition-all active:scale-95 shadow-sm group"
                      >
                        <span>{tag}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Hint */}
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5 text-zinc-400 text-xs font-body">
                  <span className="material-symbols-outlined text-accent-red text-base shrink-0">
                    tips_and_updates
                  </span>
                  <span>
                    يمكنك البحث بأي كلمة: اسم المكمل، النكهة (فراولة، شوكولاتة)، الحجم (300g)، أو عدد الحصص (60 srv).
                  </span>
                </div>
              </div>
            )}

            {/* 2. Loading State */}
            {loading && (
              <div className="py-12 text-center text-zinc-400 font-body text-xs flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-accent-red border-t-transparent rounded-full animate-spin" />
                <span>جاري تحميل المنتجات...</span>
              </div>
            )}

            {/* 3. Live Results List */}
            {query.trim() && searchResults.length > 0 && (
              <div className="space-y-1.5">
                <div className="px-1 pb-1 text-[11px] font-product-title font-bold text-zinc-400">
                  النتائج المطابقة ({searchResults.length}):
                </div>

                {searchResults.map(({ product }, idx) => {
                  const isSelected = selectedIndex === idx;
                  const discountPct = product.oldPrice && product.oldPrice > product.price
                    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
                    : 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl cursor-pointer transition-all duration-150 border ${
                        isSelected
                          ? 'bg-white/[0.08] border-accent-red/50 shadow-md'
                          : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5'
                      }`}
                    >
                      {/* Product Thumbnail + Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-white p-1 shrink-0 overflow-hidden flex items-center justify-center">
                          <img
                            src={getOptimizedImageUrl(product.images?.[0] || '', { width: 100, height: 100 })}
                            alt={product.name}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-product-title font-bold text-zinc-400 uppercase">
                              {categoriesMap[product.category] || product.category}
                            </span>
                            {discountPct > 0 && (
                              <span className="bg-accent-red text-white text-[9px] font-display font-black px-1.5 py-0.2 rounded-full">
                                {discountPct}% خصم
                              </span>
                            )}
                          </div>

                          <h4 className="font-product-title font-bold text-white text-xs sm:text-sm truncate">
                            {product.name}
                          </h4>

                          {product.weight && (
                            <span className="text-[11px] font-body text-zinc-400">
                              {product.weight} {product.servings ? `• ${product.servings} srv` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price & Stock */}
                      <div className="text-left shrink-0 mr-3" dir="ltr">
                        <div className="font-product-title font-black text-white text-sm sm:text-base">
                          {product.price} <span className="text-[10px] text-accent-red font-bold">EGP</span>
                        </div>
                        {product.oldPrice && product.oldPrice > product.price && (
                          <div className="text-[11px] text-zinc-500 line-through font-product-title">
                            {product.oldPrice} EGP
                          </div>
                        )}
                        {product.stock === 0 && (
                          <span className="text-[9px] font-bold text-zinc-400 uppercase">
                            نفد المخزون
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. Empty State: No results */}
            {query.trim() && !loading && searchResults.length === 0 && (
              <div className="py-10 text-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-zinc-600 block">
                  search_off
                </span>
                <h3 className="font-display font-black text-white text-base">
                  لم نجد أي مكمل يطابق &ldquo;{query}&rdquo;
                </h3>
                <p className="font-body text-xs text-zinc-400 max-w-sm mx-auto">
                  تأكد من كتابة الاسم بشكل صحيح أو تصفح الأقسام الشائعة أدناه.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleExecuteSearch('كرياتين')}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-accent-red text-zinc-300 hover:text-white text-xs font-display font-bold transition-all"
                  >
                    كرياتين
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExecuteSearch('واي بروتين')}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-accent-red text-zinc-300 hover:text-white text-xs font-display font-bold transition-all"
                  >
                    واي بروتين
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExecuteSearch('عروض')}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-accent-red text-zinc-300 hover:text-white text-xs font-display font-bold transition-all"
                  >
                    العروض والخصومات 🔥
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer CTA: Show all in catalog */}
          {query.trim() && (
            <div className="p-3 border-t border-white/[0.08] bg-[#0c0c0f] flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-body hidden sm:inline">
                اضغط Enter للانتقال لصفحة النتائج
              </span>
              <button
                type="button"
                onClick={() => handleExecuteSearch(query)}
                className="w-full sm:w-auto mr-auto px-4 py-2 rounded-xl bg-accent-red hover:bg-red-600 text-white font-display font-black text-xs shadow-[0_0_15px_rgba(227,30,36,0.3)] active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <span>عرض جميع النتائج في المتجر</span>
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

