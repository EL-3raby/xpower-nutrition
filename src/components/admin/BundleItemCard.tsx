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

  const originalProd = useMemo(() => {
    return allProducts.find((p) => p.id === item.productId);
  }, [allProducts, item.productId]);

  // Ensure flavorOptions array exists
  const currentOptions: BundleVariantOption[] = useMemo(() => {
    if (item.flavorOptions && item.flavorOptions.length > 0) {
      return item.flavorOptions;
    }
    // Default initial option is the base product itself
    return [
      {
        productId: item.productId,
        name: item.name,
        flavorLabel: extractFlavorLabel(item.name),
        image: item.image,
        price: item.price,
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

  // Filter products for manual flavor addition search
  const searchableProducts = useMemo(() => {
    if (!flavorSearchQuery.trim()) return [];
    const q = flavorSearchQuery.trim().toLowerCase();
    const existingIds = new Set(currentOptions.map((opt) => opt.productId));

    return allProducts.filter((p) => {
      if (existingIds.has(p.id!)) return false;
      return p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q));
    }).slice(0, 8);
  }, [allProducts, flavorSearchQuery, currentOptions]);

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

  const handleAddFlavorOption = (prod: Product) => {
    const newOption: BundleVariantOption = {
      productId: prod.id!,
      name: prod.name,
      flavorLabel: extractFlavorLabel(prod.name),
      image: prod.images?.[0] || '',
      price: prod.price,
      stock: prod.stock
    };

    const updatedOptions = [...currentOptions, newOption];
    onUpdateItem({
      ...item,
      flavorOptions: updatedOptions
    });

    setIsAddingFlavor(false);
    setFlavorSearchQuery('');
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
              <span className="font-mono text-white font-bold">{item.price} EGP</span>
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
              onClick={() => handleAddFlavorOption(s)}
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
              onClick={() => setIsAddingFlavor(true)}
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

        {/* Manual Flavor Add Search Form */}
        {isAddingFlavor && (
          <div className="bg-[#101010] border border-accent-red/30 p-2.5 rounded-lg space-y-2 mt-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">اختر المنتج الذي يمثل الطعم البديل من المتجر:</span>
              <button
                type="button"
                onClick={() => {
                  setIsAddingFlavor(false);
                  setFlavorSearchQuery('');
                }}
                className="text-text-muted hover:text-white text-xs"
              >
                إلغاء
              </button>
            </div>

            <input
              type="text"
              autoFocus
              value={flavorSearchQuery}
              onChange={(e) => setFlavorSearchQuery(e.target.value)}
              placeholder="ابحث باسم المنتج البديل (مثال: watermelon أو بطيخ أو black)..."
              className="w-full bg-[#050505] text-white border border-white/10 focus:border-accent-red px-3 py-2 rounded-lg text-xs focus:outline-none"
            />

            {searchableProducts.length > 0 && (
              <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1 pt-1">
                {searchableProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddFlavorOption(p)}
                    className="w-full text-right p-2 rounded bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 flex items-center justify-between text-xs transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-white truncate">{p.name}</span>
                    <span className="text-[10px] text-text-muted font-mono shrink-0">المخزون: {p.stock}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

