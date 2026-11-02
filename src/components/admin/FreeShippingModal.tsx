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
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]?.slug || '');
  const [searchProductQuery, setSearchProductQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filtered products for single product dropdown/search
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

  // Products affected by the chosen scope & action
  const targetProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.id) return false;
      if (scope === 'product') {
        return p.id === selectedProductId;
      }
      if (scope === 'category') {
        return p.category === selectedCategory;
      }
      // 'all'
      return true;
    });
  }, [products, scope, selectedProductId, selectedCategory]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (scope === 'product' && !selectedProductId) {
      setError('يرجى اختيار منتج أولاً.');
      return;
    }

    if (scope === 'category' && !selectedCategory) {
      setError('يرجى اختيار قسم أولاً.');
      return;
    }

    if (targetProducts.length === 0) {
      setError('لا توجد منتجات مطابقة لتنفيذ العملية عليها.');
      return;
    }

    setIsSubmitting(true);
    try {
      const isEnable = action === 'enable';
      await applyFreeShipping({
        scope,
        targetId: scope === 'product' ? selectedProductId : scope === 'category' ? selectedCategory : undefined,
        isFreeShipping: isEnable,
      });

      let scopeLabel = 'كل المنتجات';
      if (scope === 'category') {
        const cat = categories.find((c) => c.slug === selectedCategory);
        scopeLabel = `قسم (${cat?.name || selectedCategory})`;
      } else if (scope === 'product') {
        const prod = products.find((p) => p.id === selectedProductId);
        scopeLabel = `المنتج (${prod?.name || selectedProductId})`;
      }

      const msg = isEnable
        ? `تم تفعيل الشحن المجاني بنجاح على ${scopeLabel}!`
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
                تفعيل أو إلغاء الشحن المجاني لمنتج محدد، قسم بالكامل، أو كل منتجات المتجر.
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
                <span className="font-product-title font-bold text-xs sm:text-sm">منتج محدد</span>
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
          {/* Scope = Product: Select Single Product with Search */}
          {scope === 'product' && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-product-title font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-accent-red">search</span>
                  اختر المنتج المطلوب
                </label>
                <span className="text-[11px] font-product-title text-text-muted">
                  ({filteredProductsList.length} منتج متاح)
                </span>
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

              {/* Scrollable list of selectable products */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {filteredProductsList.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-4">لا توجد منتجات مطابقة للبحث.</p>
                ) : (
                  filteredProductsList.map((p) => {
                    const isSelected = p.id === selectedProductId;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProductId(p.id!)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-accent-red/10 border-accent-red/40 text-white ring-1 ring-accent-red/30'
                            : 'bg-white/5 border-white/5 text-text-muted hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
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
                              شحن مجاني حالياً
                            </span>
                          ) : (
                            <span className="text-[10px] text-text-muted font-product-title">شحن عادي</span>
                          )}

                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-accent-red bg-accent-red text-white'
                                : 'border-white/20'
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Scope = Category: Select Category */}
          {scope === 'category' && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <label className="block text-xs font-product-title font-bold text-white mb-1.5">
                اختر القسم المستهدف
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.map((cat) => {
                  const isSelected = cat.slug === selectedCategory;
                  const catProductsCount = products.filter((p) => p.category === cat.slug).length;
                  const catFreeCount = products.filter((p) => p.category === cat.slug && p.isFreeShipping).length;

                  return (
                    <div
                      key={cat.slug}
                      onClick={() => setSelectedCategory(cat.slug)}
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

                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-accent-red bg-accent-red text-white'
                            : 'border-white/20'
                        }`}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                ? `سيتم تفعيل الشحن المجاني لـ (${targetProducts.length}) منتج. أي طلب يحتوي على هذه المنتجات لن يتم احتساب أي مصاريف شحن عليه.`
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

