'use client';

import React, { useState, useMemo } from 'react';
import { Product } from '@/lib/types';
import { applyBulkDiscount, BulkDiscountOptions } from '@/lib/firebase/products';

interface BulkDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  products: Product[];
  categories: { id?: string; name: string; slug: string }[];
}

export default function BulkDiscountModal({
  isOpen,
  onClose,
  onSuccess,
  products,
  categories,
}: BulkDiscountModalProps) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [scope, setScope] = useState<string>('all');
  const [theme, setTheme] = useState<'white' | 'gold' | 'cyan' | 'purple' | 'crimson'>('white');
  const [endDate, setEndDate] = useState<string>('');
  const [excludeDiscounted, setExcludeDiscounted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Quick date presets
  const handleSetQuickDate = (hours: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    // Format to YYYY-MM-DDTHH:mm
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setEndDate(formatted);
  };

  // Live preview calculations
  const previewProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.id) return false;
      if (scope !== 'all' && p.category !== scope) return false;
      if (excludeDiscounted && p.oldPrice && p.oldPrice > p.price) return false;
      return true;
    }).map((p) => {
      const basePrice = (p.oldPrice && p.oldPrice > p.price) ? p.oldPrice : p.price;
      let newPrice = basePrice;
      let savings = 0;

      if (discountType === 'percentage') {
        const val = Math.max(0, Math.min(99, Number(discountValue) || 0));
        savings = Math.round(basePrice * (val / 100));
        newPrice = Math.max(10, basePrice - savings);
      } else {
        const val = Math.max(0, Number(discountValue) || 0);
        savings = val;
        newPrice = Math.max(10, basePrice - val);
      }

      return {
        ...p,
        basePrice,
        newPrice,
        savings: basePrice - newPrice,
      };
    });
  }, [products, scope, discountType, discountValue, excludeDiscounted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numVal = Number(discountValue);
    if (isNaN(numVal) || numVal <= 0) {
      setError('يرجى إدخال قيمة خصم صحيحة أكبر من صفر.');
      return;
    }

    if (discountType === 'percentage' && numVal >= 100) {
      setError('النسبة المئوية للخصم يجب أن تكون أقل من 100%.');
      return;
    }

    if (previewProducts.length === 0) {
      setError('لا توجد منتجات متطابقة مع الشروط المحددة لتطبيق الخصم عليها.');
      return;
    }

    setIsSubmitting(true);
    try {
      const options: BulkDiscountOptions = {
        type: discountType,
        value: numVal,
        scope,
        theme,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        excludeDiscounted,
      };

      await applyBulkDiscount(options);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error applying bulk discount:', err);
      setError(err?.message || 'حدث خطأ أثناء تطبيق الخصم. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden my-auto relative animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Subtle Ambient Red Glow Bar at Top */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent-red to-transparent" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-b from-white/[0.03] to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-red/10 border border-accent-red/30 flex items-center justify-center text-accent-red">
              <span className="material-symbols-outlined text-2xl">percent</span>
            </div>
            <div>
              <h2 className="font-product-title font-black text-xl text-white tracking-wide">تطبيق خصم جماعي</h2>
              <p className="font-body text-xs text-text-muted mt-0.5">تعديل وتخفيض أسعار المنتجات في المتجر بضغطة زر واحدة.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-text-muted hover:text-white flex items-center justify-center transition-colors active:scale-95"
            aria-label="إغلاق النافذة"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-accent-red/10 border border-accent-red/30 rounded-xl flex items-center gap-2.5 text-accent-red text-xs sm:text-sm font-body">
              <span className="material-symbols-outlined text-lg shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* 1. Discount Type Selector */}
          <div>
            <label className="block text-xs font-bold text-text-muted mb-2 font-product-title">
              نوع الخصم:
            </label>
            <div className="grid grid-cols-2 gap-3 p-1 bg-[#121212] border border-white/5 rounded-xl">
              <button
                type="button"
                onClick={() => setDiscountType('percentage')}
                className={`py-2.5 px-4 rounded-lg font-product-title font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                  discountType === 'percentage'
                    ? 'bg-accent-red text-white shadow-[0_2px_12px_rgba(227,30,36,0.35)]'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">percent</span>
                <span>نسبة مئوية (%)</span>
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('fixed')}
                className={`py-2.5 px-4 rounded-lg font-product-title font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                  discountType === 'fixed'
                    ? 'bg-accent-red text-white shadow-[0_2px_12px_rgba(227,30,36,0.35)]'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                <span>مبلغ ثابت (ج.م)</span>
              </button>
            </div>
          </div>

          {/* 2. Value & Scope Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Discount Value */}
            <div>
              <label htmlFor="discount-value" className="block text-xs font-bold text-text-muted mb-2 font-product-title">
                قيمة الخصم ({discountType === 'percentage' ? '%' : 'ج.م'}):
              </label>
              <div className="relative">
                <input
                  id="discount-value"
                  type="number"
                  min="1"
                  max={discountType === 'percentage' ? '99' : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  required
                  placeholder={discountType === 'percentage' ? 'مثال: 15' : 'مثال: 100'}
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-white font-product-title font-black text-base focus:border-accent-red focus:outline-none transition-colors"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm font-product-title">
                  {discountType === 'percentage' ? '%' : 'EGP'}
                </span>
              </div>
            </div>

            {/* Scope / Category */}
            <div>
              <label htmlFor="discount-scope" className="block text-xs font-bold text-text-muted mb-2 font-product-title">
                نطاق التطبيق:
              </label>
              <select
                id="discount-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-white font-body text-sm focus:border-accent-red focus:outline-none transition-colors"
              >
                <option value="all">جميع المنتجات في المتجر</option>
                {categories.map((c) => (
                  <option key={c.id || c.slug} value={c.slug}>
                    قسم: {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Expiration Date Option */}
          <div className="bg-[#121212] border border-white/[0.08] p-4 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="discount-end-date" className="text-xs font-bold text-white flex items-center gap-1.5 font-product-title">
                <span className="material-symbols-outlined text-accent-red text-[16px]">schedule</span>
                <span>تاريخ ووقت انتهاء العرض (اختياري):</span>
              </label>
              {endDate && (
                <button
                  type="button"
                  onClick={() => setEndDate('')}
                  className="text-[11px] text-accent-red hover:underline font-body"
                >
                  إلغاء الموعد (عرض دائم)
                </button>
              )}
            </div>

            <input
              id="discount-end-date"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-white font-body text-xs sm:text-sm focus:border-accent-red focus:outline-none transition-colors"
            />

            {/* Quick Presets */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[11px] text-text-muted font-body">فترة سريعة:</span>
              <button
                type="button"
                onClick={() => handleSetQuickDate(24)}
                className="px-2.5 py-1 text-[11px] font-product-title font-bold bg-white/5 hover:bg-white/10 text-text-muted hover:text-white rounded-md border border-white/5 transition-colors"
              >
                +24 ساعة
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickDate(72)}
                className="px-2.5 py-1 text-[11px] font-product-title font-bold bg-white/5 hover:bg-white/10 text-text-muted hover:text-white rounded-md border border-white/5 transition-colors"
              >
                +3 أيام
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickDate(168)}
                className="px-2.5 py-1 text-[11px] font-product-title font-bold bg-white/5 hover:bg-white/10 text-text-muted hover:text-white rounded-md border border-white/5 transition-colors"
              >
                +أسبوع
              </button>
            </div>
            <p className="text-[11px] text-text-muted font-body">
              {endDate
                ? `ينتهي الخصم تلقائياً في: ${new Date(endDate).toLocaleString('ar-EG')}`
                : 'لو سيبته فاضي، العرض هيفضل شغال لحد ما تلغيه يدوي.'}
            </p>
          </div>

          {/* 4. Brand Theme Selector for Top Bar */}
          <div className="bg-[#121212] border border-white/[0.08] p-4 rounded-xl space-y-2.5">
            <label className="text-xs font-bold text-white flex items-center gap-1.5 font-product-title">
              <span className="material-symbols-outlined text-white text-[16px]">palette</span>
              <span>ستايل ولون شريط الخصم بالأعلى (Brand Theme):</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTheme('white')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-product-title font-bold transition-all ${
                  theme === 'white'
                    ? 'border-white bg-white/20 text-white shadow-[0_0_12px_rgba(255,255,255,0.3)]'
                    : 'border-white/10 bg-[#0a0a0a] text-text-muted hover:text-white'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]" />
                <span>أبيض سنبل ✨</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('gold')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-product-title font-bold transition-all ${
                  theme === 'gold'
                    ? 'border-amber-400 bg-amber-500/15 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'border-white/10 bg-[#0a0a0a] text-text-muted hover:text-white'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                <span>ذهب أولمبي</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('cyan')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-product-title font-bold transition-all ${
                  theme === 'cyan'
                    ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'border-white/10 bg-[#0a0a0a] text-text-muted hover:text-white'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                <span>سايبر آيس</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('crimson')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-product-title font-bold transition-all ${
                  theme === 'crimson'
                    ? 'border-red-500 bg-red-500/15 text-red-400 shadow-[0_0_12px_rgba(227,30,36,0.25)]'
                    : 'border-white/10 bg-[#0a0a0a] text-text-muted hover:text-white'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-accent-red shadow-[0_0_6px_rgba(227,30,36,0.8)]" />
                <span>أحمر ناري</span>
              </button>
            </div>
          </div>

          {/* 5. Toggles / Checkboxes */}
          <div className="space-y-2.5 pt-1">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={excludeDiscounted}
                onChange={(e) => setExcludeDiscounted(e.target.checked)}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-accent-red focus:ring-0 cursor-pointer"
              />
              <span className="text-xs sm:text-sm text-text-muted hover:text-white font-body">
                استثناء المنتجات اللي عليها خصم بالفعل (تخطي المنتجات المخفضة)
              </span>
            </label>

            {/* Dedicated Top Bar Notification Hint */}
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <span className="material-symbols-outlined text-lg shrink-0">campaign</span>
              <p className="text-xs font-body leading-relaxed">
                سيظهر شريط الخصم المخصص تلقائياً أعلى الهيدر بلون مميز لجميع الزوار طوال فترة العرض، مع بقاء الشريط الإعلاني الأول دون أي تغيير.
              </p>
            </div>
          </div>

          {/* 5. Live Preview Section */}
          <div className="bg-[#0f0f0f] border border-white/[0.08] rounded-xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-accent-red text-base">visibility</span>
                <span className="font-product-title font-bold text-xs sm:text-sm text-white">معاينة التغييرات الحية</span>
              </div>
              <span className="text-xs font-product-title font-bold px-2 py-0.5 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/20">
                {previewProducts.length} منتج مشمول
              </span>
            </div>

            {previewProducts.length === 0 ? (
              <p className="text-center py-4 text-xs text-text-muted font-body">
                لا توجد منتجات متوافقة مع هذا النطاق.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto divide-y divide-white/5 custom-scrollbar pl-1">
                {previewProducts.slice(0, 5).map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={p.images[0] || '/images/no-image.png'}
                        alt={p.name}
                        className="w-8 h-8 rounded-lg object-contain bg-black p-0.5 border border-white/10 shrink-0"
                      />
                      <span className="text-white font-medium truncate">{p.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-product-title font-bold" dir="ltr">
                      <span className="text-text-muted/60 line-through text-[11px]">{p.basePrice} EGP</span>
                      <span className="material-symbols-outlined text-[13px] text-text-muted">arrow_forward</span>
                      <span className="text-accent-red">{p.newPrice} EGP</span>
                    </div>
                  </div>
                ))}
                {previewProducts.length > 5 && (
                  <p className="text-center pt-2 text-[11px] text-text-muted font-body">
                    + {previewProducts.length - 5} منتجات أخرى سيتم تطبيق الخصم عليها.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-white/10 text-text-muted hover:text-white font-product-title font-bold text-xs sm:text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || previewProducts.length === 0}
              className="px-6 py-2.5 rounded-xl bg-accent-red hover:bg-[#ff1a22] text-white font-product-title font-bold text-xs sm:text-sm shadow-[0_4px_20px_rgba(227,30,36,0.4)] hover:shadow-[0_6px_30px_rgba(227,30,36,0.6)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري التطبيق...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>تأكيد وتطبيق الخصم</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

