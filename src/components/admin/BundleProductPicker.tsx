'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product } from '@/lib/types';

interface BundleProductPickerProps {
  allProducts: Product[];
  onAddProduct: (product: Product, quantity: number) => void;
}

// Arabic & English Gym / Fitness Synonyms for Bilingual Search
const FITNESS_SYNONYMS: Record<string, string[]> = {
  'كرياتين': ['creatine', 'pure x', 'purex', 'pure'],
  'بروتين': ['protein', 'whey', 'isolate'],
  'واي': ['whey', 'protein'],
  'شيكر': ['shaker', 'serv holder'],
  'شيكرات': ['shaker'],
  'كوب': ['shaker'],
  'حزام': ['strap', 'belt', 'figure 8', 'old school'],
  'احزمة': ['strap', 'belt'],
  'ستراب': ['strap', 'wrist'],
  'ريست': ['wrist', 'wrist wraps'],
  'كوع': ['elbow', 'elbow wraps'],
  'ركبة': ['knee', 'knee wraps'],
  'ركبه': ['knee', 'knee wraps'],
  'طاقة': ['pump', 'pre workout', 'energy'],
  'طاقه': ['pump', 'pre workout', 'energy'],
  'بامب': ['pump', 'pumpx', 'pump x'],
  'باور': ['pump', 'energy', 'pre'],
  'كاررب': ['carb', 'carbx', 'carb x'],
  'كارب': ['carb', 'carbx', 'carb x'],
  'تفاح': ['green apple', 'apple'],
  'بطيخ': ['watermelon'],
  'خوخ': ['peach'],
  'فراولة': ['strawberry'],
  'شوكولاتة': ['chocolate'],
  'شوكولاته': ['chocolate'],
  'فانيليا': ['vanilla'],
  'اسود': ['black'],
  'احمر': ['red'],
  'شفاف': ['transparent']
};

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .trim();
}

function matchesProductSearch(product: Product, query: string): boolean {
  if (!query || !query.trim()) return true;

  const normalizedQuery = normalizeText(query);
  const targetText = normalizeText(
    [
      product.name || '',
      product.category || '',
      product.slug || '',
      product.description || '',
      (product.flavors || []).join(' ')
    ].join(' ')
  );

  // 1. Direct substring match
  if (targetText.includes(normalizedQuery)) return true;

  // 2. Token-level match with synonym expansion
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const allTokensMatch = tokens.every((token) => {
    if (targetText.includes(token)) return true;

    // Check synonym dictionary
    for (const [arKey, enSynonyms] of Object.entries(FITNESS_SYNONYMS)) {
      const normKey = normalizeText(arKey);
      if (token.includes(normKey) || normKey.includes(token)) {
        if (enSynonyms.some((syn) => targetText.includes(syn))) return true;
      }
    }
    return false;
  });

  return allTokensMatch;
}

export default function BundleProductPicker({ allProducts, onAddProduct }: BundleProductPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => matchesProductSearch(p, searchQuery));
  }, [allProducts, searchQuery]);

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setSearchQuery('');
    setIsOpen(false);
    setQuantity(1);
  };

  const handleConfirmAdd = () => {
    if (!selectedProduct) return;
    onAddProduct(selectedProduct, quantity);
    setSelectedProduct(null);
    setQuantity(1);
    setSearchQuery('');
  };

  const handleClearSelection = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <div ref={containerRef} className="bg-bg-primary border border-white/10 p-4 sm:p-5 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-accent-red text-base">search</span>
          البحث الذكي عن منتجات لإضافتها للباقة
        </h3>
        <span className="text-[10px] text-text-muted">
          ابحث بالعربي أو بالإنجليزي (مثل: Pure X أو كرياتين أو شيكر)
        </span>
      </div>

      {/* CASE 1: No product selected yet -> Show Search Bar + Live Dropdown */}
      {!selectedProduct ? (
        <div className="relative">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute right-3.5 text-text-muted text-xl pointer-events-none">
              search
            </span>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="اكتب اسم المنتج بالعربي أو الإنجليزي (مثال: Pure X، شيكر، كوع، pump)..."
              className="w-full bg-[#050505] text-white border border-white/10 hover:border-white/20 focus:border-accent-red pl-10 pr-11 py-3 rounded-xl text-xs sm:text-sm focus:outline-none transition-all placeholder:text-text-muted/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-xs"
                title="مسح البحث"
              >
                ✕
              </button>
            )}
          </div>

          {/* Results Dropdown Menu */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0c0c0c] border border-white/15 rounded-2xl shadow-2xl shadow-black/80 max-h-80 overflow-y-auto custom-scrollbar z-50 p-2 space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-bold text-text-muted flex justify-between items-center border-b border-white/5 mb-1">
                <span>نتائج البحث ({filteredProducts.length} منتج)</span>
                <span className="text-[10px] text-accent-red">اضغط على أي منتج لاختياره</span>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="p-6 text-center text-text-muted text-xs">
                  <span className="material-symbols-outlined text-3xl mb-1 text-white/30 block">search_off</span>
                  لا توجد نتائج مطابقة لـ &quot;{searchQuery}&quot;.<br />
                  <span className="text-[11px] text-white/50 mt-1 block">
                    جرب كتابة جزء من الاسم بالإنجليزية أو العربية (مثال: Pure, Shaker, حزام, كرياتين).
                  </span>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const hasStock = p.stock > 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProduct(p)}
                      className="w-full text-right p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 flex items-center justify-between gap-3 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-contain" />
                          ) : (
                            <span className="material-symbols-outlined text-text-muted text-base">inventory_2</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-white font-bold text-xs sm:text-sm truncate group-hover:text-accent-red transition-colors">
                            {p.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-text-muted">
                            <span className="font-mono text-white font-bold">{p.price} EGP</span>
                            <span>•</span>
                            <span className={hasStock ? 'text-emerald-400 font-mono font-bold' : 'text-accent-red font-mono font-bold'}>
                              {hasStock ? `المخزون: ${p.stock} قطعة` : 'نفد من المخزون (0)'}
                            </span>
                            {p.flavors && p.flavors.length > 0 && (
                              <span className="text-amber-400/80 text-[10px]">
                                ({p.flavors.length} نكهات متاحة)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 group-hover:bg-accent-red group-hover:text-white text-text-muted text-xs font-bold transition-all flex items-center gap-1">
                          <span>اختيار</span>
                          <span className="material-symbols-outlined text-sm">arrow_left</span>
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      ) : (
        /* CASE 2: A product has been selected -> Show confirmation tile with quantity stepper */
        <div className="bg-[#0e0e0e] border border-accent-red/30 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 p-1 shrink-0 flex items-center justify-center overflow-hidden">
              {selectedProduct.images?.[0] ? (
                <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="w-full h-full object-contain" />
              ) : (
                <span className="material-symbols-outlined text-text-muted">inventory_2</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-accent-red text-white font-bold px-2 py-0.5 rounded font-product-title">
                  تم تحديد المنتج
                </span>
                <h4 className="text-white font-bold text-sm sm:text-base truncate">{selectedProduct.name}</h4>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-text-muted">
                <span className="font-mono text-white font-bold">{selectedProduct.price} EGP</span>
                <span>•</span>
                <span>
                  المخزون الحالي بالمخزن: <strong className={selectedProduct.stock > 0 ? 'text-emerald-400 font-mono' : 'text-accent-red font-mono'}>{selectedProduct.stock} قطعة</strong>
                </span>
                {selectedProduct.flavors && selectedProduct.flavors.length > 0 && (
                  <span className="text-amber-400 text-[11px] bg-amber-500/10 px-2 py-0.5 rounded">
                    نكهات يختارها العميل: {selectedProduct.flavors.join('، ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
            {/* Quantity Stepper */}
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-text-muted font-bold">الكمية بالباقة:</span>
              <div className="flex items-center bg-[#050505] border border-white/15 rounded-lg overflow-hidden h-9">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-2.5 text-text-muted hover:text-white hover:bg-white/10 transition-colors text-sm font-bold h-full"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 text-center text-xs font-mono font-bold bg-transparent text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-2.5 text-text-muted hover:text-white hover:bg-white/10 transition-colors text-sm font-bold h-full"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-3">
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-3 py-2 rounded-lg text-xs font-bold text-text-muted hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                تغيير
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                className="px-4 py-2 rounded-lg text-xs font-bold font-product-title bg-accent-red hover:bg-accent-red/90 text-white shadow-lg shadow-accent-red/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                <span>إضافة للباقة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

