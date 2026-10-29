'use client';

import React, { useState, useEffect } from 'react';
import { getCategories, addCategory, updateCategory, deleteCategory } from '@/lib/firebase/admin-actions';
import { Category } from '@/lib/types';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import Spinner from '@/components/ui/Spinner';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states (Add/Edit)
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [orderIndex, setOrderIndex] = useState(0);
  const [isActive, setIsActive] = useState(true);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const loadCategories = async () => {
    try {
      const fetched = await getCategories();
      setCategories(fetched);
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Auto-fill slug on name change (only when adding a new category)
  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingId) {
      const generatedSlug = val
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setSlug(generatedSlug);
    }
  };

  const handleEditClick = (cat: Category) => {
    setEditingId(cat.id!);
    setName(cat.name);
    setSlug(cat.slug);
    setOrderIndex(cat.order);
    setIsActive(cat.isActive);
    setErrorMsg('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setOrderIndex(0);
    setIsActive(true);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        order: Number(orderIndex),
        isActive: isActive
      };

      if (editingId) {
        await updateCategory(editingId, payload);
      } else {
        await addCategory(payload);
      }

      // Reset & Reload
      handleCancelEdit();
      await loadCategories();
    } catch (err: any) {
      console.error('Error saving category:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ القسم.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setSelectedCatId(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCatId) return;

    try {
      await deleteCategory(selectedCatId);
      await loadCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedCatId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Spinner className="inline-block w-10 h-10 text-accent-red animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-right" dir="rtl">
      
      {/* Header */}
      <div className="border-b border-text-muted/10 pb-4">
        <h1 className="font-display text-2xl md:text-3xl font-black text-white">أقسام المتجر</h1>
        <p className="font-body text-sm text-text-muted mt-2">إدارة وتصنيف المنتجات المعروضة (بروتينات، كرياتين، إلخ) وترتيب ظهورها.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Category Add/Edit Form (5 cols) */}
        <div className="lg:col-span-5 bg-bg-elevated border border-text-muted/10 p-6 flex flex-col gap-6">
          <h2 className="font-display text-lg font-bold text-white border-b border-text-muted/10 pb-3">
            {editingId ? 'تعديل القسم الحالي' : 'إضافة قسم جديد'}
          </h2>

          {errorMsg && (
            <div className="bg-accent-red/10 border-r-4 border-accent-red p-3 text-accent-red font-body text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs text-text-muted font-bold">اسم القسم بالعربية</label>
              <input 
                type="text" 
                placeholder="مثال: كرياتين مونوهيدرات"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none"
              />
            </div>

            {/* Slug */}
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs text-text-muted font-bold">الـ Slug (رابط التصفح)</label>
              <input 
                type="text" 
                placeholder="creatine-monohydrate"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none text-left"
                dir="ltr"
              />
            </div>

            {/* Order index */}
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs text-text-muted font-bold">ترتيب الظهور (الرقم الأصغر يظهر أولاً)</label>
              <input 
                type="number" 
                placeholder="0"
                value={orderIndex}
                onChange={(e) => setOrderIndex(Number(e.target.value))}
                min="0"
                required
                className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none text-left"
                dir="ltr"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3 py-2">
              <input 
                type="checkbox" 
                id="catIsActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-accent-red w-5 h-5 cursor-pointer bg-bg-primary border-text-muted/20"
              />
              <label htmlFor="catIsActive" className="font-body text-sm text-white cursor-pointer select-none">عرض وتفعيل القسم بالمتجر</label>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-4 border-t border-text-muted/10">
              <button 
                type="submit"
                disabled={submitting}
                className="flex-grow bg-accent-red hover:bg-accent-red/90 text-white font-product-title font-bold py-3 px-4 btn-diagonal hover:scale-103 transition-transform text-sm"
              >
                {submitting ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة القسم'}
              </button>
              {editingId && (
                <button 
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-3 border border-text-muted/20 text-white font-product-title text-sm"
                >
                  إلغاء
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Categories Listing (7 cols) */}
        <div className="lg:col-span-7 bg-bg-elevated border border-text-muted/10 p-6">
          <h2 className="font-display text-lg font-bold text-white border-b border-text-muted/10 pb-3 mb-4">الأقسام الحالية</h2>
          
          {categories.length === 0 ? (
            <p className="text-center py-6 text-text-muted font-body text-sm">لا توجد أقسام مسجلة بعد.</p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-right border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-text-muted/10 text-xs text-text-muted font-bold uppercase tracking-wider">
                    <th className="pb-3 text-right">الاسم</th>
                    <th className="pb-3 text-center">الـ Slug</th>
                    <th className="pb-3 text-center">الترتيب</th>
                    <th className="pb-3 text-center">الحالة</th>
                    <th className="pb-3 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-text-muted/5 font-body text-sm">
                  {categories.map((c) => (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 text-right text-white font-semibold">{c.name}</td>
                      <td className="py-4 text-center text-text-muted font-mono text-xs">{c.slug}</td>
                      <td className="py-4 text-center font-product-title">{c.order}</td>
                      <td className="py-4 text-center">
                        <span className={`inline-block border px-2.5 py-0.5 text-xs font-semibold ${
                          c.isActive 
                            ? 'bg-success/15 text-success border-success/30' 
                            : 'bg-text-muted/10 text-text-muted border-text-muted/20'
                        }`}>
                          {c.isActive ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="py-4 text-left font-product-title">
                        <div className="flex justify-end gap-3.5">
                          <button 
                            onClick={() => handleEditClick(c)}
                            className="text-text-muted hover:text-white flex items-center gap-1 text-xs"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            <span>تعديل</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(c.id!)}
                            className="text-text-muted hover:text-accent-red flex items-center gap-1 text-xs"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            <span>حذف</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="flex flex-col md:hidden divide-y divide-white/5">
              {categories.map((c) => (
                <div key={c.id} className="p-4 flex flex-col gap-3 relative">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col pr-2">
                      <h3 className="text-white font-bold text-base">{c.name}</h3>
                      <span className="text-text-muted font-mono text-xs mt-0.5">{c.slug}</span>
                    </div>
                    <span className={`inline-block border px-2 py-0.5 text-[10px] font-bold rounded-md shrink-0 ${
                      c.isActive 
                        ? 'bg-success/15 text-success border-success/30' 
                        : 'bg-text-muted/10 text-text-muted border-text-muted/20'
                    }`}>
                      {c.isActive ? 'نشط' : 'معطل'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-text-muted bg-white/5 px-2 py-1 rounded-md border border-white/5">الترتيب: {c.order}</span>
                  </div>

                  <div className="flex gap-2 mt-2 pt-3 border-t border-white/5">
                    <button 
                      onClick={() => handleEditClick(c)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1 py-2 rounded-lg text-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      تعديل
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(c.id!)}
                      className="flex-1 bg-accent-red/10 text-accent-red hover:bg-accent-red hover:text-white flex items-center justify-center gap-1 py-2 rounded-lg text-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
          )}
        </div>

      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        title="تأكيد حذف القسم"
        message="هل أنت متأكد من رغبتك في حذف هذا القسم؟ قد يؤثر ذلك على تصفية المنتجات المرتبطة به. لا يمكن التراجع عن هذا الإجراء."
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

    </div>
  );
}
