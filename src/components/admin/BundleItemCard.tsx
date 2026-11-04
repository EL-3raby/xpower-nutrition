'use client';

import React, { useState, useMemo } from 'react';
import { BundleItem, BundleVariantOption, Product } from '@/lib/types';

interface BundleItemCardProps {
  item: BundleItem;
  allProducts: Product[];
  onUpdateQty: (delta: number) => void;
  onRemove: () => void;
  onUpdateItem: (updated: BundleItem) => void;
}

const BILINGUAL_SYNONYMS: Record<string, string[]> = {
  'شيكر': ['shaker', 'شيكرات', 'كوب'],
  'shaker': ['شيكر', 'شيكرات', 'كوب'],
  'كارب': ['carb', 'كربوهيدرات'],
  'carb': ['كارب', 'كربوهيدرات'],
  'بامب': ['pump', 'طاقة', 'pre-workout'],
  'pump': ['بامب', 'طاقة', 'pre-workout'],
  'كرياتين': ['creatine', 'كرياتين نقي'],
  'creatine': ['كرياتين'],
  'بروتين': ['protein', 'واي', 'whey'],
  'protein': ['بروتين', 'واي', 'whey'],
  'استراب': ['strap', 'احزمة', 'حزام'],
  'strap': ['استراب', 'احزمة', 'حزام'],
  'ركبة': ['knee', 'ركب'],
  'knee': ['ركبة', 'ركب'],
  'كوع': ['elbow', 'اكواع'],
  'elbow': ['كوع', 'اكواع'],
  'معصم': ['wrist', 'ريست'],
  'wrist': ['معصم', 'ريست']
};

function extractBaseName(name: string): string {
  if (!name) return '';
  if (name.includes('_')) return name.split('_')[0].trim().toLowerCase();
  if (name.includes(' - ')) return name.split(' - ')[0].trim().toLowerCase();
  return '';
}

function extractFlavorLabel(name: string): string {
  if (!name) return '';
  if (name.includes('_')) {
    const parts = name.split('_');
    return parts.slice(1).join(' ').trim();
  }
  if (name.includes(' - ')) {
    const parts = name.split(' - ');
    return parts.slice(1).join(' ').trim();
  }
  return name;
}

export default function BundleItemCard({
  item,
  allProducts,
  onUpdateQty,
  onRemove,
  onUpdateItem
}: BundleItemCardProps) {
  const [isAddingFlavor, setIsAddingFlavor] = useState(false);
  const [flavorSearchQuery, setFlavorSearchQuery] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const originalProd = useMemo(() => {
    return allProducts.find((p) => p.id === item.productId);
  }, [allProducts, item.productId]);

  // Ensure flavorOptions array exists
  const currentOptions: BundleVariantOption[] = useMemo(() => {
    if (item.flavorOptions && item.flavorOptions.length > 0) {
      return item.flavorOptions;
    }
    const origPrice = (originalProd?.oldPrice && originalProd.oldPrice > originalProd.price)
      ? originalProd.oldPrice
      : (item.price || originalProd?.price || 0);

    // Default initial option is the base product itself
    return [
      {
        productId: item.productId,
        name: item.name,
        flavorLabel: extractFlavorLabel(item.name),
        image: item.image,
        price: origPrice,
        stock: originalProd?.stock ?? 0
      }
    ];
  }, [item, originalProd]);

  // Find other products in store that share the base name prefix (e.g. CARB X_watermelon, CARB X_PEACH)
  const autoSuggestions = useMemo(() => {
    const base = extractBaseName(item.name);
    if (!base) return [];

    const existingIds = new Set(currentOptions.map((opt) => opt.productId));
    existingIds.add(item.productId);

    return allProducts.filter((p) => {
      if (existingIds.has(p.id!)) return false;
      const pBase = extractBaseName(p.name);
      return pBase && pBase === base;
    });
  }, [allProducts, item.name, item.productId, currentOptions]);

  // Filter products for manual flavor addition search (bilingual + default list)
  const searchableProducts = useMemo(() => {
    const existingIds = new Set(currentOptions.map((opt) => opt.productId));
    existingIds.add(item.productId);

    const available = allProducts.filter((p) => !existingIds.has(p.id!));

    if (!flavorSearchQuery.trim()) {
      return available.slice(0, 15);
    }

    const q = flavorSearchQuery.trim().toLowerCase();
    const queryTokens = q.split(/\s+/).filter(Boolean);

    // Expand search with synonyms
    const expandedTokens = new Set<string>();
    queryTokens.forEach((t) => {
      expandedTokens.add(t);
      if (BILINGUAL_SYNONYMS[t]) {
        BILINGUAL_SYNONYMS[t].forEach((syn) => expandedTokens.add(syn.toLowerCase()));
      }
    });

    return available.filter((p) => {
      const name = p.name.toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const targetStr = `${name} ${cat} ${desc}`;

      return Array.from(expandedTokens).some((token) => targetStr.includes(token));
    }).slice(0, 20);
  }, [allProducts, flavorSearchQuery, currentOptions, item.productId]);

  // Calculate combined virtual stock for this item
  const totalItemStock = useMemo(() => {
    if (currentOptions.length > 0) {
      return currentOptions.reduce((sum, opt) => {
        const live = allProducts.find((p) => p.id === opt.productId);
        return sum + (live?.stock ?? opt.stock ?? 0);
      }, 0);
    }
    return originalProd?.stock ?? 0;
  }, [currentOptions, allProducts, originalProd]);

  const handleToggleSelect = (prodId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(prodId) ? prev.filter((id) => id !== prodId) : [...prev, prodId]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = searchableProducts.map((p) => p.id!);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedProductIds.includes(id));
    if (allSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleAddSelectedOptions = () => {
    if (selectedProductIds.length === 0) return;
    const prodsToAdd = allProducts.filter((p) => selectedProductIds.includes(p.id!));

    const newOptions: BundleVariantOption[] = prodsToAdd.map((prod) => ({
      productId: prod.id!,
      name: prod.name,
      flavorLabel: extractFlavorLabel(prod.name),
      image: prod.images?.[0] || '',
      price: (typeof prod.oldPrice === 'number' && prod.oldPrice > prod.price) ? prod.oldPrice : prod.price,
      stock: prod.stock
    }));

    onUpdateItem({
      ...item,
      flavorOptions: [...currentOptions, ...newOptions]
    });

    setSelectedProductIds([]);
    setIsAddingFlavor(false);
    setFlavorSearchQuery('');
  };

  const handleAddSingleOption = (prod: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newOption: BundleVariantOption = {
      productId: prod.id!,
      name: prod.name,
      flavorLabel: extractFlavorLabel(prod.name),
      image: prod.images?.[0] || '',
      price: (typeof prod.oldPrice === 'number' && prod.oldPrice > prod.price) ? prod.oldPrice : prod.price,
      stock: prod.stock
    };

    onUpdateItem({
      ...item,
      flavorOptions: [...currentOptions, newOption]
    });

    setSelectedProductIds((prev) => prev.filter((id) => id !== prod.id));
  };

  const handleRemoveFlavorOption = (prodId: string) => {
    if (currentOptions.length <= 1) return;
    const updatedOptions = currentOptions.filter((opt) => opt.productId !== prodId);
    onUpdateItem({
      ...item,
      flavorOptions: updatedOptions
    });
  };

  const handleUpdateOptionLabel = (prodId: string, newLabel: string) => {
    const updatedOptions = currentOptions.map((opt) => {
      if (opt.productId === prodId) {
        return { ...opt, flavorLabel: newLabel };
      }
      return opt;
    });
    onUpdateItem({
      ...item,
      flavorOptions: updatedOptions
    });
  };

  return (
    <div className="bg-bg-primary border border-white/10 hover:border-white/20 p-3.5 sm:p-4 rounded-xl space-y-3 transition-colors">
      {/* Top Row: Main Product Info & Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 p-1 shrink-0 flex items-center justify-center overflow-hidden">
            {item.image ? (
              <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
            ) : (
              <span className="material-symbols-outlined text-text-muted">image</span>
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-white font-bold text-xs sm:text-sm truncate">{item.name}</h4>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-text-muted">
              {originalProd?.oldPrice && originalProd.oldPrice > originalProd.price ? (
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-emerald-400 font-bold">{originalProd.oldPrice} EGP</span>
                  <span className="text-[10px] text-emerald-500/80 font-bold">(السعر الأصلي)</span>
                  <span className="font-mono text-text-muted/50 line-through text-[10px]">{originalProd.price} EGP</span>
                </span>
              ) : (
                <span className="font-mono text-white font-bold">{item.price} EGP</span>
              )}
              <span>•</span>
              <span>
                إجمالي المخزون المتاح: <strong className={totalItemStock > 0 ? 'text-emerald-400 font-mono font-bold' : 'text-accent-red font-mono font-bold'}>{totalItemStock} قطعة</strong>
              </span>
              {currentOptions.length > 1 && (
                <span className="text-amber-400 text-[10px] bg-amber-500/10 px-2 py-0.5 rounded font-bold">
                  {currentOptions.length} أطعم بديلة مربوطة
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Quantity Stepper */}
          <div className="flex items-center bg-[#050505] border border-white/10 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => onUpdateQty(-1)}
              className="px-2.5 py-1 text-text-muted hover:text-white hover:bg-white/5 transition-colors text-xs font-bold"
              title="تقليل الكمية"
            >
              -
            </button>
            <span className="px-2 text-xs font-bold font-mono text-white">{item.quantity}</span>
            <button
              type="button"
              onClick={() => onUpdateQty(1)}
              className="px-2.5 py-1 text-text-muted hover:text-white hover:bg-white/5 transition-colors text-xs font-bold"
              title="زيادة الكمية"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={onRemove}
            className="w-8 h-8 rounded-lg bg-accent-red/10 hover:bg-accent-red/20 text-accent-red flex items-center justify-center transition-colors cursor-pointer"
            title="حذف هذا البند من الباقة"
          >
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      </div>

      {/* Auto-Suggestions for similar flavors in store (e.g. CARB X_watermelon) */}
      {autoSuggestions.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-xs flex flex-wrap items-center gap-2">
          <span className="text-amber-400 font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">lightbulb</span>
            اقتراح أطعم لنفس المنتج موجودة في المتجر:
          </span>
          {autoSuggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleAddSingleOption(s)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-bold transition-all border border-amber-500/30 flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <span>+ {s.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Flavor Options List / Manager */}
      <div className="bg-[#080808] border border-white/5 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-text-muted font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-red"></span>
            الأطعم والخيارات المتاحة لاختيار العميل ({currentOptions.length}):
          </span>
          {!isAddingFlavor && (
            <button
              type="button"
              onClick={() => {
                setIsAddingFlavor(true);
                setSelectedProductIds([]);
              }}
              className="text-accent-red hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>إضافة طعم آخر كبديل</span>
            </button>
          )}
        </div>

        {/* Existing Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {currentOptions.map((opt) => {
            const live = allProducts.find((p) => p.id === opt.productId);
            const liveStock = live?.stock ?? opt.stock ?? 0;
            return (
              <div
                key={opt.productId}
                className="bg-[#121212] border border-white/10 p-2 rounded-lg flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-bold truncate">{opt.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={opt.flavorLabel}
                      onChange={(e) => handleUpdateOptionLabel(opt.productId, e.target.value)}
                      placeholder="اسم النكهة المعروض..."
                      className="bg-black/60 border border-white/10 text-amber-400 font-bold text-[10px] px-2 py-0.5 rounded w-28 focus:border-accent-red focus:outline-none"
                      title="الاسم الذي يظهر للعميل في صفحة المنتج"
                    />
                    <span className={`text-[10px] font-mono ${liveStock > 0 ? 'text-emerald-400' : 'text-accent-red'}`}>
                      (مخزون: {liveStock})
                    </span>
                  </div>
                </div>

                {currentOptions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFlavorOption(opt.productId)}
                    className="w-5 h-5 rounded text-text-muted hover:text-accent-red hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="إزالة هذا الطعم البديل"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Manual Flavor Add Search Form with Multi-Select Checkboxes */}
        {isAddingFlavor && (
          <div className="bg-[#101010] border border-accent-red/40 p-3 sm:p-4 rounded-xl space-y-3 mt-2 animate-in fade-in duration-150 shadow-xl shadow-black/60">
            <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-accent-red text-base">checklist</span>
                <span className="font-bold text-white">اختر أو علّم (Select) على المنتجات البديلة:</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingFlavor(false);
                  setFlavorSearchQuery('');
                  setSelectedProductIds([]);
                }}
                className="text-text-muted hover:text-white text-xs px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-base pointer-events-none">
                search
              </span>
              <input
                type="text"
                autoFocus
                value={flavorSearchQuery}
                onChange={(e) => setFlavorSearchQuery(e.target.value)}
                placeholder="ابحث باسم المنتج أو النكهة (عربي أو إنجليزي)..."
                className="w-full bg-[#050505] text-white border border-white/10 focus:border-accent-red pr-9 pl-8 py-2 rounded-lg text-xs focus:outline-none transition-colors"
              />
              {flavorSearchQuery && (
                <button
                  type="button"
                  onClick={() => setFlavorSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Actions Bar: Select All / Count info */}
            {searchableProducts.length > 0 && (
              <div className="flex items-center justify-between text-[11px] text-text-muted px-1">
                <span>نتائج البحث المتاحة ({searchableProducts.length}):</span>
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="text-accent-red hover:underline font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">
                    {searchableProducts.every((p) => selectedProductIds.includes(p.id!)) ? 'deselect' : 'select_all'}
                  </span>
                  <span>
                    {searchableProducts.every((p) => selectedProductIds.includes(p.id!))
                      ? 'إلغاء تحديد الكل'
                      : 'تحديد كل النتائج الظاهرة'}
                  </span>
                </button>
              </div>
            )}

            {/* Searchable Products List with Checkboxes */}
            {searchableProducts.length > 0 ? (
              <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1.5 pt-1 pr-0.5">
                {searchableProducts.map((p) => {
                  const isChecked = selectedProductIds.includes(p.id!);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleToggleSelect(p.id!)}
                      className={`w-full p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                        isChecked
                          ? 'border-accent-red bg-accent-red/10 shadow-sm shadow-accent-red/20'
                          : 'border-white/10 bg-[#070707] hover:border-white/25 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Custom Athletic Checkbox */}
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-accent-red border-accent-red text-white'
                              : 'border-white/25 bg-black/60 hover:border-white/40'
                          }`}
                        >
                          {isChecked && (
                            <span className="material-symbols-outlined text-[13px] font-black leading-none text-white">
                              check
                            </span>
                          )}
                        </div>

                        {/* Thumbnail */}
                        <div className="w-8 h-8 rounded bg-white/5 border border-white/10 p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-contain" />
                          ) : (
                            <span className="material-symbols-outlined text-xs text-text-muted">image</span>
                          )}
                        </div>

                        {/* Name and Stock */}
                        <div className="min-w-0">
                          <span className={`block font-bold text-xs truncate ${isChecked ? 'text-white' : 'text-white/90'}`}>
                            {p.name}
                          </span>
                          <span className="text-[10px] text-text-muted font-mono block">
                            المخزون: <strong className={p.stock > 0 ? 'text-emerald-400' : 'text-accent-red'}>{p.stock} قطعة</strong>
                          </span>
                        </div>
                      </div>

                      {/* Direct + Button */}
                      <button
                        type="button"
                        onClick={(e) => handleAddSingleOption(p, e)}
                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-accent-red text-white text-[11px] font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                        title="إضافة فورية لهذا المنتج فقط"
                      >
                        <span className="material-symbols-outlined text-xs">add</span>
                        <span>إضافة</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-text-muted text-xs border border-dashed border-white/10 rounded-lg">
                لا توجد منتجات مطابقة للبحث أو تم إضافتها جميعاً بالفعل.
              </div>
            )}

            {/* Bulk Action Submit Button */}
            {selectedProductIds.length > 0 && (
              <div className="pt-2 border-t border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <button
                  type="button"
                  onClick={handleAddSelectedOptions}
                  className="w-full py-2.5 px-4 rounded-xl bg-accent-red hover:bg-accent-red-hover text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-accent-red/25 transition-all cursor-pointer active:scale-98"
                >
                  <span className="material-symbols-outlined text-base">done_all</span>
                  <span>إضافة المنتجات المحددة ({selectedProductIds.length}) دفعة واحدة إلى البند</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
