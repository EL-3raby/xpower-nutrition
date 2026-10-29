'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getProducts, deleteProduct } from '@/lib/firebase/products';
import { Product } from '@/lib/types';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import Spinner from '@/components/ui/Spinner';

function AdminProductsContent() {
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter') || 'all';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Deletion state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const loadProducts = async () => {
    try {
      const fetched = await getProducts();
      setProducts(fetched);
    } catch (err) {
      console.error('Error loading products for admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const displayedProducts = React.useMemo(() => {
    if (filter === 'active') {
      return products.filter(p => p.isActive);
    }
    return products;
  }, [products, filter]);

  const handleDeleteClick = (id: string) => {
    setSelectedProductId(id);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProductId) return;

    try {
      await deleteProduct(selectedProductId);
      // Reload products
      await loadProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
    } finally {
      setIsModalOpen(false);
      setSelectedProductId(null);
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
      <div className="flex justify-between items-center border-b border-text-muted/10 pb-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black text-white">إدارة المنتجات</h1>
          <p className="font-body text-sm text-text-muted mt-2">ضيف، عدل، أو امسح المنتجات اللي بتتعرض في المتجر.</p>
        </div>
        
        <Link 
          href="/admin/products/new"
          className="bg-accent-red hover:bg-accent-red/90 text-white font-product-title font-bold px-5 py-3 btn-diagonal hover:scale-103 transition-transform text-sm"
        >
          + ضيف منتج جديد
        </Link>
      </div>

      {/* Products Table / Cards */}
      <div className="bg-[#0a0a0a] border border-white/5 md:p-6 overflow-hidden md:rounded-3xl shadow-lg mt-6">
        {displayedProducts.length === 0 ? (
          <p className="text-center py-6 text-text-muted font-body text-sm">مفيش منتجات متسجلة هنا، ضيف أول منتج دلوقتي!</p>
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
                  {displayedProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      {/* Image & name */}
                      <td className="py-4 pr-4 text-right flex items-center gap-3">
                        <img 
                          src={p.images[0] || '/images/no-image.png'} 
                          alt={p.name} 
                          className="w-10 h-10 object-contain bg-bg-primary p-0.5 border border-text-muted/10 rounded-md"
                        />
                        <span className="text-white font-semibold uppercase font-product-title tracking-wide">{p.name}</span>
                      </td>
                      
                      {/* Category */}
                      <td className="py-4 text-right text-text-muted font-body">
                        {p.category === 'creatine' ? 'كرياتين' : p.category === 'protein' ? 'بروتين مصل اللبن' : p.category === 'mass-gainer' ? 'ضخامة عضلية' : p.category}
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

                      {/* Price */}
                      <td className="py-4 text-center font-product-title font-semibold text-white">
                        {p.price.toLocaleString()} EGP
                      </td>

                      {/* Active status toggle */}
                      <td className="py-4 text-center">
                        <span className={`inline-block border px-2 py-0.5 text-xs font-semibold rounded-md ${
                          p.isActive 
                            ? 'bg-success/15 text-success border-success/30' 
                            : 'bg-text-muted/10 text-text-muted border-text-muted/20'
                        }`}>
                          {p.isActive ? 'نشط' : 'معطل'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 pl-4 text-left font-product-title">
                        <div className="flex justify-end gap-3.5">
                          <Link 
                            href={`/admin/products/edit?id=${p.id}`}
                            className="text-text-muted hover:text-white flex items-center gap-1 text-xs bg-white/5 px-2 py-1.5 rounded-md"
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
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="flex flex-col md:hidden divide-y divide-white/5">
              {displayedProducts.map((p) => (
                <div key={p.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={p.images[0] || '/images/no-image.png'} 
                      alt={p.name} 
                      className="w-14 h-14 object-contain bg-bg-primary p-1 border border-white/5 rounded-lg shrink-0"
                    />
                    <div className="flex flex-col flex-1">
                      <h3 className="text-white font-bold uppercase font-product-title tracking-wide text-sm">{p.name}</h3>
                      <span className="text-xs text-text-muted font-body mt-0.5">
                        {p.category === 'creatine' ? 'كرياتين' : p.category === 'protein' ? 'بروتين مصل اللبن' : p.category === 'mass-gainer' ? 'ضخامة عضلية' : p.category}
                      </span>
                    </div>
                    <span className={`inline-block border px-2 py-0.5 text-[10px] font-bold rounded-md shrink-0 ${
                      p.isActive 
                        ? 'bg-success/15 text-success border-success/30' 
                        : 'bg-text-muted/10 text-text-muted border-text-muted/20'
                    }`}>
                      {p.isActive ? 'نشط' : 'معطل'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg mt-1">
                    <div className="flex flex-col text-center flex-1 border-l border-white/10 last:border-0">
                      <span className="text-[10px] text-text-muted mb-1">المخزون</span>
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
                      <span className="text-[10px] text-text-muted mb-1">السعر</span>
                      <span className="font-product-title text-sm font-bold text-white tracking-widest" dir="ltr">
                        {p.price.toLocaleString()} <span className="text-[9px] text-accent-red">EGP</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <Link 
                      href={`/admin/products/edit?id=${p.id}`}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1 py-2 rounded-lg text-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      تعديل
                    </Link>
                    <button 
                      onClick={() => handleDeleteClick(p.id!)}
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

      {/* Confirmation Modal */}
      <ConfirmationModal 
        isOpen={isModalOpen}
        title="تأكيد حذف المنتج"
        message="هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء."
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsModalOpen(false)}
      />

    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={
      <div className="h-96 flex items-center justify-center">
        <Spinner className="inline-block w-10 h-10 text-accent-red animate-spin" />
      </div>
    }>
      <AdminProductsContent />
    </Suspense>
  );
}
