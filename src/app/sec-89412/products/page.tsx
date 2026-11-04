'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  getProducts, 
  deleteProduct, 
  revertBulkDiscount, 
  toggleProductFreeShipping,
  updateProductStock,
  toggleProductActive
} from '@/lib/firebase/products';
import { getCategories, getSiteConfig } from '@/lib/firebase/admin-actions';
import { Product, SiteConfig, Category } from '@/lib/types';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import BulkDiscountModal from '@/components/admin/BulkDiscountModal';
import FreeShippingModal from '@/components/admin/FreeShippingModal';
import Spinner from '@/components/ui/Spinner';

function AdminProductsContent() {
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter') || 'all';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Deletion state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Bulk discount modals & state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Free Shipping modal & state
  const [isFreeShippingModalOpen, setIsFreeShippingModalOpen] = useState(false);
  const [togglingShippingId, setTogglingShippingId] = useState<string | null>(null);

  // Quick Stock & Active status states
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingStockVal, setEditingStockVal] = useState<string>('');
  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [fetchedProducts, fetchedCategories, fetchedConfig] = await Promise.all([
        getProducts(undefined, false, { forceRefresh: true }),
        getCategories({ forceRefresh: true }),
        getSiteConfig({ forceRefresh: true }),
      ]);
      setProducts(fetchedProducts);
      setCategories(fetchedCategories);
      setSiteConfig(fetchedConfig);
    } catch (err) {
      console.error('Error loading admin products data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const displayedProducts = useMemo(() => {
    if (filter === 'active') {
      return products.filter((p) => p.isActive);
    }
    return products;
  }, [products, filter]);

  // Count products currently having a discount
  const discountedCount = useMemo(() => {
    return products.filter((p) => p.oldPrice && p.oldPrice > p.price).length;
  }, [products]);

  // Count products currently having free shipping
  const freeShippingCount = useMemo(() => {
    return products.filter((p) => p.isFreeShipping).length;
  }, [products]);

  const handleDeleteClick = (id: string) => {
    setSelectedProductId(id);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProductId) return;

    try {
      await deleteProduct(selectedProductId);
      await loadData();
    } catch (err) {
      console.error('Error deleting product:', err);
    } finally {
      setIsModalOpen(false);
      setSelectedProductId(null);
    }
  };

  const handleConfirmRevert = async () => {
    setIsReverting(true);
    try {
      const result = await revertBulkDiscount();
      await loadData();
      setToastMessage(`تم إلغاء الخصم واستعادة الأسعار الأصلية بنجاح لـ ${result.revertedCount} منتج.`);
    } catch (err) {
      console.error('Error reverting bulk discount:', err);
      setToastMessage('حدث خطأ أثناء استعادة الأسعار الأصلية.');
    } finally {
      setIsReverting(false);
      setIsRevertModalOpen(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handleBulkSuccess = async () => {
    await loadData();
    setToastMessage('تم تطبيق الخصم الجماعي على المنتجات بنجاح وتحديث الأسعار!');
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleToggleSingleShipping = async (productId: string, currentVal: boolean) => {
    setTogglingShippingId(productId);
    try {
      await toggleProductFreeShipping(productId, !currentVal);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isFreeShipping: !currentVal } : p))
      );
      setToastMessage(
        !currentVal
          ? 'تم تفعيل الشحن المجاني للمنتج بنجاح!'
          : 'تم إلغاء الشحن المجاني عن المنتج بنجاح!'
      );
    } catch (err) {
      console.error('Error toggling free shipping:', err);
      setToastMessage('حدث خطأ أثناء تعديل حالة الشحن المجاني.');
    } finally {
      setTogglingShippingId(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleFreeShippingSuccess = async (msg: string) => {
    await loadData();
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleStockChange = async (productId: string, newStock: number, isBundle?: boolean) => {
    if (isBundle) {
      setToastMessage('مخزون باقات التوفير يُحسب تلقائياً حسب أقل مخزون متوفر من منتجاتها المكونة.');
      setTimeout(() => setToastMessage(null), 4500);
      return;
    }

    const clampedStock = Math.max(0, Math.floor(newStock));
    const previousProducts = [...products];

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: clampedStock } : p))
    );
    setUpdatingStockId(productId);

    try {
      await updateProductStock(productId, clampedStock);
      setToastMessage(`تم تعديل مخزون المنتج إلى (${clampedStock}) بنجاح!`);
    } catch (err) {
      console.error('Error updating stock:', err);
      setProducts(previousProducts);
      setToastMessage('حدث خطأ أثناء تعديل المخزون.');
    } finally {
      setUpdatingStockId(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleStartEditStock = (productId: string, currentStock: number, isBundle?: boolean) => {
    if (isBundle) {
      setToastMessage('مخزون باقات التوفير يُحسب تلقائياً حسب أقل مخزون متوفر من منتجاتها المكونة.');
      setTimeout(() => setToastMessage(null), 4500);
      return;
    }
    setEditingStockId(productId);
    setEditingStockVal(String(currentStock));
  };

  const handleSaveInlineStock = async (productId: string) => {
    const parsed = parseInt(editingStockVal, 10);
    setEditingStockId(null);
    if (isNaN(parsed)) return;
    await handleStockChange(productId, Math.max(0, parsed));
  };

  const handleToggleProductActive = async (productId: string, currentVal: boolean) => {
    setTogglingActiveId(productId);
    const previousProducts = [...products];

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isActive: !currentVal } : p))
    );

    try {
      await toggleProductActive(productId, !currentVal);
      setToastMessage(!currentVal ? 'تم تفعيل المنتج بنجاح!' : 'تم تعطيل المنتج بنجاح!');
    } catch (err) {
      console.error('Error toggling active status:', err);
      setProducts(previousProducts);
      setToastMessage('حدث خطأ أثناء تعديل حالة المنتج.');
    } finally {
      setTogglingActiveId(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Spinner className="inline-block w-10 h-10 text-accent-red animate-spin" />
      </div>
    );
  }

  const isBulkActive = Boolean(siteConfig?.bulkDiscount?.isActive);
  const bulkEndDate = siteConfig?.bulkDiscount?.endDate;
  const isBulkExpired = Boolean(bulkEndDate && new Date(bulkEndDate) < new Date());

  return (
    <div className="space-y-8 text-right relative" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#0d0d0d] border border-accent-red/40 text-white px-5 py-3.5 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <div className="w-8 h-8 rounded-full bg-accent-red/20 border border-accent-red/40 flex items-center justify-center text-accent-red shrink-0">
            <span className="material-symbols-outlined text-lg">check</span>
          </div>
          <span className="font-product-title font-bold text-xs sm:text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-text-muted/10 pb-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black text-white tracking-wide">إدارة المنتجات</h1>
          <p className="font-body text-sm text-text-muted mt-1.5">
            ضيف، عدل، أو امسح المنتجات، وتحكم في الأسعار والتخفيضات الجماعية للمتجر.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {discountedCount > 0 && (
            <button
              type="button"
              onClick={() => setIsRevertModalOpen(true)}
              className="flex-1 md:flex-initial bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-product-title font-bold px-4 py-2.5 rounded-xl hover:scale-102 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">history</span>
              <span>استعادة الأسعار ({discountedCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            className="flex-1 md:flex-initial bg-white/5 hover:bg-white/10 text-white border border-white/10 font-product-title font-bold px-4 py-2.5 rounded-xl hover:scale-102 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined text-accent-red text-[18px]">percent</span>
            <span>تطبيق خصم جماعي</span>
          </button>

          {/* Free Shipping Action Button */}
          <button
            type="button"
            onClick={() => setIsFreeShippingModalOpen(true)}
            className="flex-1 md:flex-initial bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-product-title font-bold px-4 py-2.5 rounded-xl hover:scale-102 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.08)]"
          >
            <span className="material-symbols-outlined text-[18px]">local_shipping</span>
            <span>شحن مجاني (Free Shipping)</span>
            {freeShippingCount > 0 && (
              <span className="bg-emerald-500/25 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                {freeShippingCount}
              </span>
            )}
          </button>

          <Link
            href="/sec-89412/products/new"
            className="flex-1 md:flex-initial bg-accent-red hover:bg-[#ff1a22] text-white font-product-title font-bold px-5 py-2.5 rounded-xl shadow-[0_2px_15px_rgba(227,30,36,0.35)] hover:scale-102 transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>+ ضيف منتج جديد</span>
          </Link>
        </div>
      </div>

      {/* Active Bulk Discount Notification Banner */}
      {(isBulkActive || discountedCount > 0) && (
        <div className="bg-gradient-to-r from-accent-red/15 via-[#140b0d] to-[#0a0a0a] border border-accent-red/30 rounded-2xl p-4 sm:p-5 shadow-[0_8px_30px_rgba(227,30,36,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-accent-red/20 border border-accent-red/40 flex items-center justify-center text-accent-red shrink-0">
              <span className="material-symbols-outlined text-2xl">loyalty</span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-product-title font-black text-sm sm:text-base text-white">
                  {isBulkActive && siteConfig?.bulkDiscount
                    ? `خصم جماعي مفعّل: ${siteConfig.bulkDiscount.value}${siteConfig.bulkDiscount.type === 'percentage' ? '%' : ' ج.م'}`
                    : `خصومات نشطة حالياً`}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-accent-red/20 text-accent-red border border-accent-red/30 text-[10px] font-product-title font-bold">
                  {discountedCount} منتج مخفض
                </span>
                {!isBulkExpired && <span className="w-2 h-2 rounded-full bg-accent-red animate-ping" />}
              </div>

              <div className="font-body text-xs text-text-muted mt-1">
                {bulkEndDate ? (
                  isBulkExpired ? (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      انتهى موعد العرض المحدد ({new Date(bulkEndDate).toLocaleString('ar-EG')}). يمكنك استعادة الأسعار الأصلية الآن.
                    </span>
                  ) : (
                    <span className="text-white/80 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-accent-red">schedule</span>
                      ينتهي العرض تلقائياً في: {new Date(bulkEndDate).toLocaleString('ar-EG')}
                    </span>
                  )
                ) : (
                  <span>العرض مستمر على المنتجات حتى تقوم بإلغائه يدوياً.</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-product-title text-xs font-bold transition-colors active:scale-95"
            >
              تعديل العرض
            </button>
            <button
              type="button"
              onClick={() => setIsRevertModalOpen(true)}
              className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-product-title text-xs font-bold transition-colors active:scale-95"
            >
              استعادة الأسعار الأصلية
            </button>
          </div>
        </div>
      )}

      {/* Products Table / Cards */}
      <div className="bg-[#0a0a0a] border border-white/5 md:p-6 overflow-hidden md:rounded-3xl shadow-lg mt-6">
        {displayedProducts.length === 0 ? (
          <p className="text-center py-8 text-text-muted font-body text-sm">
            مفيش منتجات متسجلة هنا، ضيف أول منتج دلوقتي!
          </p>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-right border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-text-muted/10 text-xs text-text-muted font-bold uppercase tracking-wider">
                    <th className="pb-3 pr-4 text-right">المنتج</th>
                    <th className="pb-3 text-right">القسم</th>
                    <th className="pb-3 text-center">السعر</th>
                    <th className="pb-3 text-center">الشحن</th>
                    <th className="pb-3 text-center">الكمية بالمخزن</th>
                    <th className="pb-3 text-center">الحالة</th>
                    <th className="pb-3 pl-4 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-text-muted/5 font-body text-sm">
                  {displayedProducts.map((p) => {
                    const hasDiscount = Boolean(p.oldPrice && p.oldPrice > p.price);
                    const discountPercent = hasDiscount
                      ? Math.round(((p.oldPrice! - p.price) / p.oldPrice!) * 100)
                      : 0;

                    return (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        {/* Image & name */}
                        <td className="py-4 pr-4 text-right flex items-center gap-3">
                          <img
                            src={p.images[0] || '/images/no-image.png'}
                            alt={p.name}
                            className="w-10 h-10 object-contain bg-bg-primary p-0.5 border border-text-muted/10 rounded-md shrink-0"
                          />
                          <div className="flex flex-col">
                            <span className="text-white font-semibold uppercase font-product-title tracking-wide">
                              {p.name}
                            </span>
                            {hasDiscount && (
                              <span className="text-[10px] text-accent-red font-product-title font-bold flex items-center gap-1 mt-0.5">
                                <span className="material-symbols-outlined text-[12px]">local_offer</span>
                                خصم {discountPercent}%
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-4 text-right text-text-muted font-body">
                          {p.category === 'creatine'
                            ? 'كرياتين'
                            : p.category === 'protein'
                            ? 'بروتين مصل اللبن'
                            : p.category === 'mass-gainer'
                            ? 'ضخامة عضلية'
                            : p.category}
                        </td>

                        {/* Price with Discount Indication */}
                        <td className="py-4 text-center font-product-title font-semibold">
                          <div className="flex flex-col items-center">
                            <span className="text-white text-sm sm:text-base font-black" dir="ltr">
                              {p.price.toLocaleString()} <span className="text-xs text-accent-red">EGP</span>
                            </span>
                            {hasDiscount && (
                              <div className="flex items-center gap-1.5 text-[11px] mt-0.5" dir="ltr">
                                <span className="text-text-muted/50 line-through">
                                  {p.oldPrice!.toLocaleString()} EGP
                                </span>
                                <span className="text-accent-red bg-accent-red/10 px-1 py-0.2 rounded text-[10px] font-bold">
                                  -{discountPercent}%
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Free Shipping Toggle */}
                        <td className="py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleSingleShipping(p.id!, Boolean(p.isFreeShipping))}
                              disabled={togglingShippingId === p.id}
                              title={p.isFreeShipping ? 'شحن مجاني مفعّل (اضغط للإلغاء)' : 'شحن قياسي (اضغط للتفعيل)'}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-product-title font-bold border transition-all active:scale-95 ${
                                p.isFreeShipping
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                                  : 'bg-white/5 border-white/10 text-text-muted hover:text-white hover:border-white/20'
                              }`}
                            >
                              {togglingShippingId === p.id ? (
                                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <span className="material-symbols-outlined text-[14px]">
                                  {p.isFreeShipping ? 'local_shipping' : 'block'}
                                </span>
                              )}
                              <span>{p.isFreeShipping ? 'مجاني' : 'عادي'}</span>
                            </button>

                            {p.isFreeShipping && p.freeShippingEndDate && (
                              <span className="text-[10px] text-amber-300/80 font-mono flex items-center gap-0.5" title={`ينتهي في: ${new Date(String(p.freeShippingEndDate)).toLocaleString('ar-EG')}`}>
                                <span className="material-symbols-outlined text-[11px] text-amber-400">schedule</span>
                                {new Date(String(p.freeShippingEndDate)).toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Quick Stock Controller */}
                        <td className="py-4 text-center">
                          {p.isBundle ? (
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setToastMessage('مخزون باقات التوفير يُحسب تلقائياً حسب أقل مخزون متوفر من منتجاتها المكونة.');
                                  setTimeout(() => setToastMessage(null), 4500);
                                }}
                                title="مخزون الباقة محسوب تلقائياً من المكونات (اضغط للتفاصيل)"
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 text-xs font-product-title font-bold transition-all active:scale-95 shadow-[0_0_10px_rgba(168,85,247,0.1)]"
                              >
                                <span className="material-symbols-outlined text-[15px]">inventory_2</span>
                                <span>باقة ({p.stock})</span>
                              </button>
                            </div>
                          ) : editingStockId === p.id ? (
                            <div className="flex items-center justify-center">
                              <div className="inline-flex items-center gap-1.5 bg-[#141414] border border-accent-red rounded-xl px-2 py-1 shadow-[0_0_15px_rgba(227,30,36,0.3)]">
                                <input
                                  type="number"
                                  min="0"
                                  autoFocus
                                  value={editingStockVal}
                                  onChange={(e) => setEditingStockVal(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveInlineStock(p.id!);
                                    if (e.key === 'Escape') setEditingStockId(null);
                                  }}
                                  onBlur={() => handleSaveInlineStock(p.id!)}
                                  className="w-14 bg-transparent text-white font-product-title font-black text-center text-xs outline-none"
                                  dir="ltr"
                                />
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSaveInlineStock(p.id!);
                                  }}
                                  title="حفظ الكمية"
                                  className="w-5 h-5 rounded-lg bg-accent-red hover:bg-[#ff1a22] text-white flex items-center justify-center transition-colors shadow-sm"
                                >
                                  <span className="material-symbols-outlined text-[13px]">check</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 shadow-sm hover:border-white/20 transition-all">
                                {/* Decrement Button */}
                                <button
                                  type="button"
                                  onClick={() => handleStockChange(p.id!, Math.max(0, p.stock - 1), p.isBundle)}
                                  disabled={p.stock <= 0 || updatingStockId === p.id}
                                  title="إنقاص المخزون (-1)"
                                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-25 disabled:hover:bg-white/5 text-text-muted hover:text-white flex items-center justify-center transition-all active:scale-90"
                                >
                                  <span className="material-symbols-outlined text-[14px]">remove</span>
                                </button>

                                {/* Stock Click-to-Edit Display */}
                                <button
                                  type="button"
                                  onClick={() => handleStartEditStock(p.id!, p.stock, p.isBundle)}
                                  disabled={updatingStockId === p.id}
                                  title="اضغط لتعديل الرقم مباشرة"
                                  className="min-w-[48px] px-2 py-1 rounded-lg hover:bg-white/10 transition-colors font-product-title font-black text-xs flex items-center justify-center gap-1 cursor-pointer group"
                                >
                                  {updatingStockId === p.id ? (
                                    <span className="w-3.5 h-3.5 border-2 border-accent-red border-t-transparent rounded-full animate-spin inline-block" />
                                  ) : (
                                    <>
                                      <span
                                        className={
                                          p.stock === 0
                                            ? 'text-accent-red font-bold'
                                            : p.stock <= 3
                                            ? 'text-amber-400 font-bold'
                                            : 'text-emerald-400 font-bold'
                                        }
                                      >
                                        {p.stock === 0 ? '0 (نفذ)' : p.stock}
                                      </span>
                                      <span className="material-symbols-outlined text-[11px] text-text-muted/30 group-hover:text-accent-red transition-colors">
                                        edit
                                      </span>
                                    </>
                                  )}
                                </button>

                                {/* Increment Button */}
                                <button
                                  type="button"
                                  onClick={() => handleStockChange(p.id!, p.stock + 1, p.isBundle)}
                                  disabled={updatingStockId === p.id}
                                  title="زيادة المخزون (+1)"
                                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-25 disabled:hover:bg-white/5 text-text-muted hover:text-white flex items-center justify-center transition-all active:scale-90"
                                >
                                  <span className="material-symbols-outlined text-[14px]">add</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Active status interactive toggle */}
                        <td className="py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleProductActive(p.id!, p.isActive)}
                            disabled={togglingActiveId === p.id}
                            title={p.isActive ? 'المنتج مفعّل ونشط بالمتجر (اضغط للتعطيل)' : 'المنتج معطل ومخفي عن العملاء (اضغط للتفعيل)'}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-product-title font-bold border transition-all active:scale-95 ${
                              p.isActive
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                : 'bg-white/5 text-text-muted border-white/10 hover:text-white hover:border-white/20'
                            }`}
                          >
                            {togglingActiveId === p.id ? (
                              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-emerald-400' : 'bg-text-muted/60'}`} />
                            )}
                            <span>{p.isActive ? 'نشط' : 'معطل'}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-4 pl-4 text-left font-product-title">
                          <div className="flex justify-end gap-3.5">
                            <Link
                              href={`/sec-89412/products/edit?id=${p.id}`}
                              className="text-text-muted hover:text-white flex items-center gap-1 text-xs bg-white/5 px-2 py-1.5 rounded-md hover:bg-white/10 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                              <span>تعديل</span>
                            </Link>
                            <button
                              onClick={() => handleDeleteClick(p.id!)}
                              className="text-text-muted hover:text-white flex items-center gap-1 text-xs bg-accent-red/10 text-accent-red px-2 py-1.5 rounded-md hover:bg-accent-red hover:text-white transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                              <span>حذف</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="flex flex-col md:hidden divide-y divide-white/5">
              {displayedProducts.map((p) => {
                const hasDiscount = Boolean(p.oldPrice && p.oldPrice > p.price);
                const discountPercent = hasDiscount
                  ? Math.round(((p.oldPrice! - p.price) / p.oldPrice!) * 100)
                  : 0;

                return (
                  <div key={p.id} className="p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.images[0] || '/images/no-image.png'}
                        alt={p.name}
                        className="w-14 h-14 object-contain bg-bg-primary p-1 border border-white/5 rounded-lg shrink-0"
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <h3 className="text-white font-bold uppercase font-product-title tracking-wide text-sm truncate">
                          {p.name}
                        </h3>
                        <span className="text-xs text-text-muted font-body mt-0.5">
                          {p.category === 'creatine'
                            ? 'كرياتين'
                            : p.category === 'protein'
                            ? 'بروتين مصل اللبن'
                            : p.category === 'mass-gainer'
                            ? 'ضخامة عضلية'
                            : p.category}
                        </span>
                        {hasDiscount && (
                          <span className="text-[10px] text-accent-red font-product-title font-bold mt-0.5">
                            خصم {discountPercent}% (وفر {p.oldPrice! - p.price} ج.م)
                          </span>
                        )}
                        {p.isFreeShipping && (
                          <span className="text-[10px] text-emerald-400 font-product-title font-bold flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[12px]">local_shipping</span>
                            شحن مجاني مفعّل
                            {p.freeShippingEndDate && (
                              <span className="text-amber-300 font-mono text-[9px] mr-1">
                                (حتى {new Date(String(p.freeShippingEndDate)).toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' })})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleProductActive(p.id!, p.isActive)}
                        disabled={togglingActiveId === p.id}
                        title={p.isActive ? 'المنتج مفعّل ونشط بالمتجر (اضغط للتعطيل)' : 'المنتج معطل ومخفي عن العملاء (اضغط للتفعيل)'}
                        className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-bold rounded-lg shrink-0 transition-all active:scale-95 ${
                          p.isActive
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-white/5 text-text-muted border-white/10'
                        }`}
                      >
                        {togglingActiveId === p.id ? (
                          <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-emerald-400' : 'bg-text-muted/60'}`} />
                        )}
                        <span>{p.isActive ? 'نشط' : 'معطل'}</span>
                      </button>
                    </div>

                    <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl mt-1">
                      <div className="flex flex-col text-center flex-1 border-l border-white/10 last:border-0 items-center justify-center">
                        <span className="text-[10px] text-text-muted mb-1">المخزون</span>
                        {p.isBundle ? (
                          <button
                            type="button"
                            onClick={() => {
                              setToastMessage('مخزون باقات التوفير يُحسب تلقائياً حسب أقل مخزون متوفر من منتجاتها المكونة.');
                              setTimeout(() => setToastMessage(null), 4500);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 font-product-title text-xs font-bold flex items-center gap-1 active:scale-95"
                          >
                            <span className="material-symbols-outlined text-[13px]">inventory_2</span>
                            <span>باقة ({p.stock})</span>
                          </button>
                        ) : editingStockId === p.id ? (
                          <div className="inline-flex items-center gap-1 bg-[#141414] border border-accent-red rounded-lg px-2 py-0.5 shadow-sm">
                            <input
                              type="number"
                              min="0"
                              autoFocus
                              value={editingStockVal}
                              onChange={(e) => setEditingStockVal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveInlineStock(p.id!);
                                if (e.key === 'Escape') setEditingStockId(null);
                              }}
                              onBlur={() => handleSaveInlineStock(p.id!)}
                              className="w-12 bg-transparent text-white font-product-title font-black text-center text-xs outline-none"
                              dir="ltr"
                            />
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSaveInlineStock(p.id!);
                              }}
                              className="w-4 h-4 rounded bg-accent-red text-white flex items-center justify-center shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[10px]">check</span>
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleStockChange(p.id!, Math.max(0, p.stock - 1), p.isBundle)}
                              disabled={p.stock <= 0 || updatingStockId === p.id}
                              className="w-6 h-6 rounded bg-white/5 text-text-muted hover:text-white flex items-center justify-center disabled:opacity-25 active:scale-90"
                            >
                              <span className="material-symbols-outlined text-[13px]">remove</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEditStock(p.id!, p.stock, p.isBundle)}
                              disabled={updatingStockId === p.id}
                              title="اضغط لتعديل الرقم"
                              className="px-2 py-0.5 font-product-title font-bold text-xs"
                            >
                              {updatingStockId === p.id ? (
                                <span className="w-3 h-3 border-2 border-accent-red border-t-transparent rounded-full animate-spin inline-block" />
                              ) : (
                                <span className={p.stock === 0 ? 'text-accent-red' : p.stock <= 3 ? 'text-amber-400' : 'text-emerald-400'}>
                                  {p.stock === 0 ? '0 (نفذ)' : p.stock}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStockChange(p.id!, p.stock + 1, p.isBundle)}
                              disabled={updatingStockId === p.id}
                              className="w-6 h-6 rounded bg-white/5 text-text-muted hover:text-white flex items-center justify-center disabled:opacity-25 active:scale-90"
                            >
                              <span className="material-symbols-outlined text-[13px]">add</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col text-center flex-1">
                        <span className="text-[10px] text-text-muted mb-0.5">السعر</span>
                        <div className="flex flex-col items-center" dir="ltr">
                          <span className="font-product-title text-sm font-black text-white">
                            {p.price.toLocaleString()} <span className="text-[10px] text-accent-red">EGP</span>
                          </span>
                          {hasDiscount && (
                            <span className="text-text-muted/50 line-through text-[10px]">
                              {p.oldPrice!.toLocaleString()} EGP
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <Link
                        href={`/sec-89412/products/edit?id=${p.id}`}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1 py-2 rounded-xl text-xs transition-colors font-product-title font-bold"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        تعديل
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(p.id!)}
                        className="flex-1 bg-accent-red/10 text-accent-red hover:bg-accent-red hover:text-white flex items-center justify-center gap-1 py-2 rounded-xl text-xs transition-colors font-product-title font-bold"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        حذف
                      </button>
                    </div>

                    {/* Mobile Free Shipping Quick Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleSingleShipping(p.id!, Boolean(p.isFreeShipping))}
                      disabled={togglingShippingId === p.id}
                      className={`w-full py-1.5 px-3 rounded-xl text-xs font-product-title font-bold border flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                        p.isFreeShipping
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'bg-white/5 border-white/10 text-text-muted hover:text-white'
                      }`}
                    >
                      {togglingShippingId === p.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-[14px]">
                          {p.isFreeShipping ? 'local_shipping' : 'block'}
                        </span>
                      )}
                      <span>
                        {p.isFreeShipping
                          ? 'شحن مجاني مفعّل (اضغط للإلغاء)'
                          : 'شحن قياسي (اضغط لتفعيل الشحن المجاني)'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isModalOpen}
        title="تأكيد حذف المنتج"
        message="هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء."
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsModalOpen(false)}
      />

      {/* Revert Bulk Discount Confirmation Modal */}
      <ConfirmationModal
        isOpen={isRevertModalOpen}
        title="استعادة الأسعار الأصلية وإلغاء الخصم"
        message={`هل أنت متأكد من رغبتك في إلغاء التخفيض واسترجاع الأسعار الأصلية لـ ${discountedCount} منتج؟ سيتم إرجاع السعر الأساسي لكل منتج كما كان فوراً.`}
        confirmText={isReverting ? 'جاري الاستعادة...' : 'استعادة الأسعار الآن'}
        cancelText="تراجع"
        onConfirm={handleConfirmRevert}
        onCancel={() => setIsRevertModalOpen(false)}
      />

      {/* Bulk Discount Modal */}
      <BulkDiscountModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={handleBulkSuccess}
        products={products}
        categories={categories}
        currentConfig={siteConfig}
      />

      {/* Free Shipping Modal */}
      <FreeShippingModal
        isOpen={isFreeShippingModalOpen}
        onClose={() => setIsFreeShippingModalOpen(false)}
        onSuccess={handleFreeShippingSuccess}
        products={products}
        categories={categories}
      />
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 flex items-center justify-center">
          <Spinner className="inline-block w-10 h-10 text-accent-red animate-spin" />
        </div>
      }
    >
      <AdminProductsContent />
    </Suspense>
  );
}
