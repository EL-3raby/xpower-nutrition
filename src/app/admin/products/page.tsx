'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getProducts, deleteProduct, revertBulkDiscount } from '@/lib/firebase/products';
import { getCategories, getSiteConfig } from '@/lib/firebase/admin-actions';
import { Product, SiteConfig, Category } from '@/lib/types';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import BulkDiscountModal from '@/components/admin/BulkDiscountModal';
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

  const loadData = async () => {
    try {
      const [fetchedProducts, fetchedCategories, fetchedConfig] = await Promise.all([
        getProducts(),
        getCategories(),
        getSiteConfig(),
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

          <Link
            href="/admin/products/new"
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
              <table className="w-full text-right border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-text-muted/10 text-xs text-text-muted font-bold uppercase tracking-wider">
                    <th className="pb-3 pr-4 text-right">المنتج</th>
                    <th className="pb-3 text-right">القسم</th>
                    <th className="pb-3 text-center">في المخزن</th>
                    <th className="pb-3 text-center">السعر</th>
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

                        {/* Stock */}
                        <td className="py-4 text-center font-product-title font-semibold">
                          {p.stock === 0 ? (
                            <span className="text-accent-red">نفذت (0)</span>
                          ) : p.stock <= 3 ? (
                            <span className="text-warning">محدود ({p.stock})</span>
                          ) : (
                            <span className="text-success">{p.stock}</span>
                          )}
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

                        {/* Active status toggle */}
                        <td className="py-4 text-center">
                          <span
                            className={`inline-block border px-2 py-0.5 text-xs font-semibold rounded-md ${
                              p.isActive
                                ? 'bg-success/15 text-success border-success/30'
                                : 'bg-text-muted/10 text-text-muted border-text-muted/20'
                            }`}
                          >
                            {p.isActive ? 'نشط' : 'معطل'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 pl-4 text-left font-product-title">
                          <div className="flex justify-end gap-3.5">
                            <Link
                              href={`/admin/products/edit?id=${p.id}`}
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
                      </div>
                      <span
                        className={`inline-block border px-2 py-0.5 text-[10px] font-bold rounded-md shrink-0 ${
                          p.isActive
                            ? 'bg-success/15 text-success border-success/30'
                            : 'bg-text-muted/10 text-text-muted border-text-muted/20'
                        }`}
                      >
                        {p.isActive ? 'نشط' : 'معطل'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl mt-1">
                      <div className="flex flex-col text-center flex-1 border-l border-white/10 last:border-0">
                        <span className="text-[10px] text-text-muted mb-0.5">المخزون</span>
                        <span className="font-product-title text-sm font-bold">
                          {p.stock === 0 ? (
                            <span className="text-accent-red">نفذت (0)</span>
                          ) : p.stock <= 3 ? (
                            <span className="text-warning">محدود ({p.stock})</span>
                          ) : (
                            <span className="text-success">{p.stock}</span>
                          )}
                        </span>
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
                        href={`/admin/products/edit?id=${p.id}`}
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
