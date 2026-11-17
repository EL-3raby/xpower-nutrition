'use client';

import React, { useState, useEffect } from 'react';
import { Product } from '@/lib/types';
import { updateSiteConfig } from '@/lib/firebase/admin-actions';
import Spinner from '@/components/ui/Spinner';

interface FeaturedProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentFeaturedIds?: string[];
  onSaved?: (newIds: string[]) => void;
}

export default function FeaturedProductsModal({
  isOpen,
  onClose,
  products,
  currentFeaturedIds = [],
  onSaved,
}: FeaturedProductsModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state whenever modal opens or currentFeaturedIds changes
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(currentFeaturedIds);
      setIsAdding(false);
      setSearchQuery('');
      setErrorMsg(null);
    }
  }, [isOpen, currentFeaturedIds]);

  if (!isOpen) return null;

  const handleAdd = (id: string) => {
    if (!id) return;
    if (selectedIds.includes(id)) return;
    if (selectedIds.length >= 10) {
      setErrorMsg('الحد الأقصى لسكشن أفضل المنتجات هو 10 منتجات فقط.');
      return;
    }
    setErrorMsg(null);
    setSelectedIds((prev) => [...prev, id]);
  };

  const handleRemove = (id: string) => {
    setErrorMsg(null);
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedIds.length) return;
    setSelectedIds((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const cleanIds = selectedIds.slice(0, 10);
      await updateSiteConfig({
        featuredProducts: {
          isActive: true,
          productIds: cleanIds,
        },
      });
      if (onSaved) {
        onSaved(cleanIds);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر حفظ التعديلات. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  // Available products for adding
  const availableProducts = products
    .filter((p): p is Product & { id: string } => Boolean(p.id) && !selectedIds.includes(p.id!))
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q));
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
      <div className="relative w-full max-w-2xl bg-[#0d0d0d] border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col font-body">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-2xl">workspace_premium</span>
            </div>
            <div>
              <h3 className="font-product-title font-bold text-white text-base sm:text-lg flex items-center gap-2">
                <span>تحديد أفضل 10 منتجات للرئيسية</span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                  selectedIds.length === 10
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {selectedIds.length} من 10
                </span>
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                تظهر هذه المنتجات حصرياً في سلايدر أفضل المنتجات بالترتيب المحدد.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{errorMsg}</span>
            </div>
            <button type="button" onClick={() => setErrorMsg(null)} className="text-white/60 hover:text-white">✕</button>
          </div>
        )}

        {/* Add Product Button / Quick Toggle */}
        <div className="flex items-center justify-between shrink-0">
          <span className="text-xs text-text-muted font-bold">
            {isAdding ? 'اختر المنتجات لإضافتها:' : 'قائمة المنتجات المختارة وترتيبها:'}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsAdding(!isAdding);
              setSearchQuery('');
              setErrorMsg(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
              isAdding
                ? 'bg-white/10 text-white hover:bg-white/15'
                : selectedIds.length >= 10
                ? 'bg-white/5 text-text-muted opacity-50 cursor-not-allowed'
                : 'bg-accent-red hover:bg-accent-red-hover text-white shadow-md shadow-accent-red/20'
            }`}
            disabled={!isAdding && selectedIds.length >= 10}
          >
            <span className="material-symbols-outlined text-sm">{isAdding ? 'arrow_back' : 'add'}</span>
            <span>{isAdding ? 'العودة للقائمة' : 'إضافة منتج +'}</span>
          </button>
        </div>

        {/* Main Body */}
        {isAdding ? (
          /* Product Search & Selection View */
          <div className="flex-1 overflow-hidden flex flex-col space-y-3 min-h-0">
            <div className="relative shrink-0">
              <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted text-lg pointer-events-none">
                search
              </span>
              <input
                type="text"
                placeholder="ابحث بالاسم أو القسم (مثال: بروتين، كرياتين...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-text-muted/60 focus:outline-none focus:border-accent-red"
                autoFocus
              />
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 space-y-2 -mx-1 px-1">
              {availableProducts.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-xs">
                  {searchQuery ? 'لم يتم العثور على منتجات مطابقة للبحث.' : 'جميع المنتجات مضافة بالفعل!'}
                </div>
              ) : (
                availableProducts.map((p) => {
                  const img = p.images?.[0];
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        handleAdd(p.id);
                        if (selectedIds.length + 1 >= 10) {
                          setIsAdding(false);
                        }
                      }}
                      className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-accent-red/40 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-black border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                          {img ? (
                            <img src={img} alt={p.name} className="w-full h-full object-contain p-1" />
                          ) : (
                            <span className="material-symbols-outlined text-white/30 text-sm">image</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-white group-hover:text-accent-red transition-colors truncate">
                            {p.name}
                          </h5>
                          <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                            <span className="text-accent-red font-mono font-bold">{p.price} ج.م</span>
                            {p.category && <span>• {p.category}</span>}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-accent-red/20 group-hover:bg-accent-red text-accent-red group-hover:text-white text-xs font-bold transition-all shrink-0 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span>إضافة</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Selected Products List with Reordering */
          <div className="flex-1 overflow-y-auto custom-scrollbar -mx-1 px-1 space-y-2.5 min-h-0">
            {selectedIds.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-white/[0.02] rounded-2xl border border-white/5 p-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 text-text-muted flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-2xl">star_outline</span>
                </div>
                <h4 className="text-white text-sm font-bold">لم يتم تحديد منتجات يدوياً بعد</h4>
                <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
                  يتم حالياً عرض أول 10 منتجات تلقائياً بالصفحة الرئيسية. اضغط على <strong>إضافة منتج +</strong> بالأعلى لتحديد الـ 10 منتجات المخصصة.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="px-4 py-2 rounded-xl bg-accent-red hover:bg-accent-red-hover text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  <span>اختر أول منتج الآن</span>
                </button>
              </div>
            ) : (
              selectedIds.map((pId, index) => {
                const prod = products.find((p) => p.id === pId);
                if (!prod) return null;
                const imgUrl = prod.images?.[0] || '';

                return (
                  <div
                    key={pId}
                    className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Index */}
                      <span className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 text-white font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                        #{index + 1}
                      </span>

                      {/* Thumbnail */}
                      <div className="w-11 h-11 rounded-xl bg-black border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                        {imgUrl ? (
                          <img src={imgUrl} alt={prod.name} className="w-full h-full object-contain p-1" />
                        ) : (
                          <span className="material-symbols-outlined text-white/30 text-sm">image</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
                          {prod.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted">
                          <span className="text-accent-red font-mono font-bold">{prod.price} ج.م</span>
                          {prod.category && <span>• {prod.category}</span>}
                          {prod.stock !== undefined && prod.stock <= 0 && (
                            <span className="text-[9px] bg-red-500/20 text-red-300 px-1 rounded font-bold">
                              نفد المخزون
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Up / Down / Remove */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors cursor-pointer"
                        title="تحريك لأعلى"
                      >
                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === selectedIds.length - 1}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors cursor-pointer"
                        title="تحريك لأسفل"
                      >
                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemove(pId)}
                        className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center justify-center transition-colors cursor-pointer ml-1"
                        title="إزالة"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="border-t border-white/10 pt-4 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-text-muted">
            💡 الترتيب هنا هو نفس ترتيب الظهور بالسلايدر.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-accent-red hover:bg-accent-red-hover text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-lg shadow-accent-red/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? <Spinner className="w-3.5 h-3.5 text-white" /> : <span className="material-symbols-outlined text-sm">check</span>}
              <span>حفظ وتطبيق فوراً</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
