'use client';

import React, { useState, useMemo } from 'react';
import { Product } from '@/lib/types';
import { applyFreeShipping } from '@/lib/firebase/products';

interface FreeShippingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  products: Product[];
  categories: { id?: string; name: string; slug: string }[];
}

export default function FreeShippingModal({
  isOpen,
  onClose,
  onSuccess,
  products,
  categories,
}: FreeShippingModalProps) {
  const [action, setAction] = useState<'enable' | 'disable'>('enable');
  const [scope, setScope] = useState<'all' | 'category' | 'product'>('product');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() =>
    products[0]?.id ? [products[0].id] : []
  );
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<string[]>(() =>
    categories[0]?.slug ? [categories[0].slug] : []
  );
  const [searchProductQuery, setSearchProductQuery] = useState<string>('');
  
  // Expiration date state
  const [hasEndDate, setHasEndDate] = useState<boolean>(false);
  const [endDate, setEndDate] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Quick date presets helper
  const handleSetQuickDate = (hours: number) => {
    setHasEndDate(true);
    const d = new Date();
    d.setHours(d.getHours() + hours);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setEndDate(formatted);
  };

  // Filtered products for multi-product selection list
  const filteredProductsList = useMemo(() => {
    if (!searchProductQuery.trim()) return products;
    const q = searchProductQuery.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.slug && p.slug.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, searchProductQuery]);

  // Toggle single product in multi-selection
  const handleToggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  // Select all currently filtered products
  const handleSelectAllFiltered = () => {
    const ids = filteredProductsList.map((p) => p.id!).filter(Boolean);
    setSelectedProductIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedProductIds([]);
  };

  // Toggle single category in multi-selection
  const handleToggleCategory = (slug: string) => {
    setSelectedCategorySlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  // Select all categories
  const handleSelectAllCategories = () => {
    setSelectedCategorySlugs(categories.map((c) => c.slug));
  };

  // Deselect all categories
  const handleDeselectAllCategories = () => {
    setSelectedCategorySlugs([]);
  };

  // Products affected by the chosen scope & action
  const targetProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.id) return false;
      if (scope === 'product') {
        return selectedProductIds.includes(p.id);
      }
      if (scope === 'category') {
        return selectedCategorySlugs.includes(p.category);
      }
      // 'all'
      return true;
    });
  }, [products, scope, selectedProductIds, selectedCategorySlugs]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (scope === 'product' && selectedProductIds.length === 0) {
      setError('يرجى تحديد منتج واحد على الأقل لتطبيق العملية عليه.');
      return;
    }

    if (scope === 'category' && selectedCategorySlugs.length === 0) {
      setError('يرجى تحديد قسم واحد على الأقل لتطبيق العملية عليه.');
      return;
    }

    if (hasEndDate && endDate && new Date(endDate) <= new Date()) {
      setError('تاريخ انتهاء الشحن المجاني يجب أن يكون وقتاً مستقبلياً.');
      return;
    }

    if (targetProducts.length === 0) {
      setError('لا توجد منتجات مطابقة لتنفيذ العملية عليها.');
      return;
    }

    setIsSubmitting(true);
    try {
      const isEnable = action === 'enable';
      const resolvedEndDate = isEnable && hasEndDate && endDate ? new Date(endDate).toISOString() : null;

      await applyFreeShipping({
        scope,
        targetIds: scope === 'product' ? selectedProductIds : scope === 'category' ? selectedCategorySlugs : undefined,
        targetId: scope === 'category' && selectedCategorySlugs.length === 1 ? selectedCategorySlugs[0] : undefined,
        isFreeShipping: isEnable,
        endDate: resolvedEndDate,
      });

      let scopeLabel = 'كل المنتجات';
      if (scope === 'category') {
        if (selectedCategorySlugs.length === 1) {
          const cat = categories.find((c) => c.slug === selectedCategorySlugs[0]);
          scopeLabel = `قسم (${cat?.name || selectedCategorySlugs[0]})`;
        } else {
          scopeLabel = `(${selectedCategorySlugs.length}) أقسام محددة`;
        }
      } else if (scope === 'product') {
        if (selectedProductIds.length === 1) {
          const prod = products.find((p) => p.id === selectedProductIds[0]);
          scopeLabel = `المنتج (${prod?.name || selectedProductIds[0]})`;
        } else {
          scopeLabel = `(${selectedProductIds.length}) منتجات محددة`;
        }
      }

      const expiryNote = resolvedEndDate
        ? ` (ينتهي في: ${new Date(resolvedEndDate).toLocaleString('ar-EG')})`
        : '';

      const msg = isEnable
        ? `تم تفعيل الشحن المجاني بنجاح على ${scopeLabel}!${expiryNote}`
        : `تم إلغاء الشحن المجاني بنجاح عن ${scopeLabel}!`;

      onSuccess(msg);
      onClose();
    } catch (err: any) {
      console.error('Error applying free shipping:', err);
      setError(err?.message || 'حدث خطأ أثناء تحديث حالة الشحن المجاني. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in"
      dir="rtl"
    >
      <div className="bg-[#0e0e0e] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative overflow-hidden">
        {/* Top Glow Accent */}
        <div
          className={`absolute top-0 inset-x-0 h-1.5 ${
            action === 'enable'
              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500'
              : 'bg-gradient-to-r from-accent-red via-rose-500 to-accent-red'
          }`}
        />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                action === 'enable'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-accent-red/15 border-accent-red/30 text-accent-red'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">local_shipping</span>
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-black text-white tracking-wide">
                إدارة الشحن المجاني (Free Shipping)
              </h2>
              <p className="font-body text-xs text-text-muted mt-0.5">
                تفعيل أو إلغاء الشحن المجاني لمنتجات محددة، قسم كامل، أو كل المتجر مع تحديد مدة الصلاحية.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-text-muted hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {error && (
            <div className="p-3.5 rounded-2xl bg-accent-red/10 border border-accent-red/30 text-accent-red text-xs sm:text-sm font-product-title font-bold flex items-center gap-2.5">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* 1. Action Type: Enable or Disable */}
          <div>
            <label className="block text-xs font-product-title font-bold text-text-muted uppercase tracking-wider mb-2.5">
              1. نوع العملية
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAction('enable')}
                className={`p-3.5 rounded-2xl border text-right transition-all flex items-center gap-3 ${
                  action === 'enable'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                    : 'bg-white/5 border-white/10 text-text-muted hover:bg-white/10'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    action === 'enable'
                      ? 'bg-emerald-500 text-black font-black'
                      : 'bg-white/5 text-text-muted'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">local_shipping</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-product-title font-bold text-sm text-white">تفعيل الشحن المجاني</span>
                  <span className="font-body text-[11px] text-text-muted">إعفاء العميل من مصاريف الشحن</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAction('disable')}
                className={`p-3.5 rounded-2xl border text-right transition-all flex items-center gap-3 ${
                  action === 'disable'
                    ? 'bg-accent-red/15 border-accent-red/50 text-white shadow-[0_0_20px_rgba(227,30,36,0.15)] ring-1 ring-accent-red/40'
                    : 'bg-white/5 border-white/10 text-text-muted hover:bg-white/10'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    action === 'disable'
                      ? 'bg-accent-red text-white font-black'
                      : 'bg-white/5 text-text-muted'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-product-title font-bold text-sm text-white">إلغاء الشحن المجاني</span>
                  <span className="font-body text-[11px] text-text-muted">إرجاع مصاريف الشحن القياسية</span>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Scope: Product, Category, or All */}
          <div>
            <label className="block text-xs font-product-title font-bold text-text-muted uppercase tracking-wider mb-2.5">
              2. نطاق التطبيق
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setScope('product')}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                  scope === 'product'
                    ? 'bg-white/15 border-white/40 text-white ring-1 ring-white/30'
                    : 'bg-white/5 border-white/10 text-text-muted hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-lg">inventory_2</span>
                <span className="font-product-title font-bold text-xs sm:text-sm">منتجات محددة (خيارات)</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('category')}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                  scope === 'category'
                    ? 'bg-white/15 border-white/40 text-white ring-1 ring-white/30'
                    : 'bg-white/5 border-white/10 text-text-muted hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-lg">category</span>
                <span className="font-product-title font-bold text-xs sm:text-sm">قسم كامل</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                  scope === 'all'
                    ? 'bg-white/15 border-white/40 text-white ring-1 ring-white/30'
                    : 'bg-white/5 border-white/10 text-text-muted hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-lg">all_inclusive</span>
                <span className="font-product-title font-bold text-xs sm:text-sm">كل المنتجات</span>
              </button>
            </div>
          </div>

          {/* Conditional Sub-selectors */}
          {/* Scope = Product: Select Multiple Products with Search and Checkboxes */}
          {scope === 'product' && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <label className="text-xs font-product-title font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-accent-red">checklist</span>
                  حدد المنتجات المطلوبة (يمكنك اختيار أكثر من منتج)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-product-title text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    تم تحديد ({selectedProductIds.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-[10px] text-zinc-300 hover:text-white underline font-product-title"
                  >
                    تحديد المعروض
                  </button>
                  <span className="text-zinc-600">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[10px] text-zinc-400 hover:text-accent-red underline font-product-title"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              {/* Quick Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchProductQuery}
                  onChange={(e) => setSearchProductQuery(e.target.value)}
                  placeholder="ابحث باسم المنتج أو القسم..."
                  className="w-full bg-[#141414] border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-text-muted/60 focus:outline-none focus:border-accent-red"
                />
                {searchProductQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchProductQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>

              {/* Scrollable list of selectable products with checkboxes */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {filteredProductsList.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-4">لا توجد منتجات مطابقة للبحث.</p>
                ) : (
                  filteredProductsList.map((p) => {
                    const isSelected = selectedProductIds.includes(p.id!);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleToggleProduct(p.id!)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-white ring-1 ring-emerald-500/30'
                            : 'bg-white/5 border-white/5 text-text-muted hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Checkbox */}
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-emerald-500 border-emerald-500 text-black'
                                : 'border-white/20 bg-black/40'
                            }`}
                          >
                            {isSelected && (
                              <span className="material-symbols-outlined text-sm font-black">check</span>
                            )}
                          </div>

                          <img
                            src={p.images[0] || '/images/no-image.png'}
                            alt={p.name}
                            className="w-8 h-8 rounded-lg object-contain bg-black p-0.5 border border-white/10 shrink-0"
                          />
                          <div className="truncate">
                            <span className="font-product-title font-bold text-xs block text-white truncate">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-text-muted">
                              {p.price} EGP • {p.category}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {p.isFreeShipping ? (
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-product-title font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="material-symbols-outlined text-[11px]">local_shipping</span>
                              شحن مجاني
                            </span>
                          ) : (
                            <span className="text-[10px] text-text-muted font-product-title">شحن عادي</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Scope = Category: Select Multiple Categories */}
          {scope === 'category' && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-product-title font-bold text-white">
                  اختر الأقسام المستهدفة
                  <span className="mr-2 text-[11px] text-accent-red font-mono font-normal">
                    (تم تحديد {selectedCategorySlugs.length} من {categories.length})
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllCategories}
                    className="text-[11px] font-product-title text-accent-red hover:underline"
                  >
                    تحديد كل الأقسام
                  </button>
                  <span className="text-white/20 text-xs">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllCategories}
                    className="text-[11px] font-product-title text-text-muted hover:text-white"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.map((cat) => {
                  const isSelected = selectedCategorySlugs.includes(cat.slug);
                  const catProductsCount = products.filter((p) => p.category === cat.slug).length;
                  const catFreeCount = products.filter((p) => p.category === cat.slug && p.isFreeShipping).length;

                  return (
                    <div
                      key={cat.slug}
                      onClick={() => handleToggleCategory(cat.slug)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-accent-red/10 border-accent-red/40 text-white ring-1 ring-accent-red/30'
                          : 'bg-white/5 border-white/5 text-text-muted hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div>
                        <span className="font-product-title font-bold text-xs sm:text-sm text-white block">
                          {cat.name}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {catProductsCount} منتج ({catFreeCount} بشحن مجاني)
                        </span>
                      </div>

                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-accent-red bg-accent-red text-white shadow-sm'
                            : 'border-white/20 bg-white/5 hover:border-white/40'
                        }`}
                      >
                        {isSelected && (
                          <span className="material-symbols-outlined text-[15px] font-bold">
                            check
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Expiration Date & Time (فترة انتهاء الشحن المجاني) */}
          {action === 'enable' && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-accent-red">schedule</span>
                  <label htmlFor="toggle-end-date" className="text-xs font-product-title font-bold text-white cursor-pointer select-none">
                    تحديد موعد لانتهاء الشحن المجاني (عرض لفترة محدودة)
                  </label>
                </div>
                <input
                  type="checkbox"
                  id="toggle-end-date"
                  checked={hasEndDate}
                  onChange={(e) => {
                    setHasEndDate(e.target.checked);
                    if (e.target.checked && !endDate) {
                      handleSetQuickDate(72); // Default to 3 days
                    }
                  }}
                  className="accent-accent-red w-4 h-4 cursor-pointer"
                />
              </div>

              {hasEndDate && (
                <div className="pt-2 border-t border-white/5 space-y-3 animate-in fade-in">
                  {/* Quick Presets */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-text-muted font-body">فترات سريعة:</span>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate(24)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-product-title font-bold text-white transition-colors"
                    >
                      +24 ساعة
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate(72)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-product-title font-bold text-white transition-colors"
                    >
                      +3 أيام
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate(168)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-product-title font-bold text-white transition-colors"
                    >
                      +7 أيام
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate(336)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-product-title font-bold text-white transition-colors"
                    >
                      +14 يوم
                    </button>
                  </div>

                  {/* Datetime Input */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-[#141414] border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-accent-red flex-1"
                    />
                    {endDate && (
                      <span className="text-[11px] font-product-title text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl text-center">
                        ينتهي في: {new Date(endDate).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Preview Summary Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0a0a0a] border border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-accent-red">visibility</span>
                <span className="font-product-title font-bold text-xs sm:text-sm text-white">
                  معاينة التأثير
                </span>
              </div>
              <span
                className={`text-[10px] font-product-title font-bold px-2 py-0.5 rounded-full border ${
                  action === 'enable'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-accent-red/15 border-accent-red/30 text-accent-red'
                }`}
              >
                {action === 'enable' ? 'سيتم تفعيل الشحن المجاني' : 'سيتم إلغاء الشحن المجاني'}
              </span>
            </div>

            <p className="font-body text-xs text-text-muted">
              {action === 'enable'
                ? `سيتم تفعيل الشحن المجاني لـ (${targetProducts.length}) منتج.${
                    hasEndDate && endDate
                      ? ` وسينتهي العرض تلقائياً في ${new Date(endDate).toLocaleString('ar-EG')}.`
                      : ' ويستمر بدون موعد انتهاء محدد حتى تقوم بإلغائه يدوياً.'
                  }`
                : `سيتم إزالة الشحن المجاني عن (${targetProducts.length}) منتج، وستُطبق عليهم رسوم الشحن القياسية للمحافظات.`}
            </p>

            {/* Targeted products thumbnail strip */}
            {targetProducts.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 custom-scrollbar">
                {targetProducts.slice(0, 10).map((p) => (
                  <div
                    key={p.id}
                    title={p.name}
                    className="w-9 h-9 rounded-xl bg-black border border-white/10 p-0.5 shrink-0 flex items-center justify-center relative overflow-hidden"
                  >
                    <img
                      src={p.images[0] || '/images/no-image.png'}
                      alt={p.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ))}
                {targetProducts.length > 10 && (
                  <span className="text-[10px] font-product-title text-text-muted font-bold px-2 py-1 bg-white/5 rounded-xl border border-white/10 shrink-0">
                    +{targetProducts.length - 10} آخرين
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-white/5">
            <button
              type="submit"
              disabled={isSubmitting || targetProducts.length === 0}
              className={`flex-1 py-3.5 rounded-2xl font-product-title font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
                action === 'enable'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                  : 'bg-accent-red hover:bg-[#ff1a22] text-white shadow-accent-red/25'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>جاري التطبيق...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">
                    {action === 'enable' ? 'local_shipping' : 'done_all'}
                  </span>
                  <span>
                    تأكيد وتطبيق ({targetProducts.length} منتج)
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-product-title font-bold text-sm transition-colors active:scale-95"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
