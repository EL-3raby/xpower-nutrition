'use client';

import React, { useState, useEffect } from 'react';
import { Review, Product } from '@/lib/types';
import { getAllReviews, deleteReview, syncAllProductsRatings } from '@/lib/firebase/reviews';
import { getProducts } from '@/lib/firebase/products';
import Spinner from '@/components/ui/Spinner';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshData = async () => {
    try {
      const [reviewsData, productsData] = await Promise.all([
        getAllReviews(),
        getProducts()
      ]);
      
      setReviews(reviewsData);
      
      const pMap: Record<string, Product> = {};
      productsData.forEach(p => {
        if (p.id) pMap[p.id] = p;
      });
      setProductsMap(pMap);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await syncAllProductsRatings();
      await refreshData();
      alert('تمت إعادة مزامنة جميع أعداد التقييمات مع كروت المنتجات بنجاح! 🎯');
    } catch (err) {
      console.error('Sync failed:', err);
      alert('حدث خطأ أثناء المزامنة.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (reviewId: string, productId: string, rating: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التقييم؟ سيتم تحديث كارت المنتج تلقائياً.')) {
      return;
    }
    setDeletingId(reviewId);
    try {
      await deleteReview(reviewId, productId, rating);
      await refreshData();
    } catch (err) {
      console.error('Failed to delete review:', err);
      alert('حدث خطأ أثناء الحذف.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredReviews = reviews.filter(r => {
    const prodName = productsMap[r.productId]?.name || '';
    return prodName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           r.customerName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
  };

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-display uppercase tracking-wider mb-1">
            إدارة التقييمات
          </h1>
          <p className="text-sm text-text-muted font-body">مراجعة وحذف آراء العملاء ومزامنتها مع كروت المنتجات.</p>
        </div>
        <button
          onClick={handleSyncAll}
          disabled={isSyncing}
          className="px-4 py-2 bg-accent-red/20 text-accent-red border border-accent-red/30 hover:bg-accent-red hover:text-white transition-all font-bold text-xs rounded-xl flex items-center gap-2 w-fit"
        >
          <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
          {isSyncing ? 'جاري المزامنة...' : 'مزامنة أعداد الكروت مع التقييمات'}
        </button>
      </div>

      <div className="bg-[#111] p-4 rounded-xl border border-white/5 flex items-center gap-3">
        <span className="material-symbols-outlined text-text-muted">search</span>
        <input 
          type="text" 
          placeholder="ابحث باسم المنتج أو اسم العميل..." 
          className="bg-transparent border-none outline-none text-white w-full text-sm font-body"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#111] text-text-muted font-product-title text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold border-b border-white/5">العميل والتاريخ</th>
                <th className="px-6 py-4 font-bold border-b border-white/5">المنتج</th>
                <th className="px-6 py-4 font-bold border-b border-white/5">التقييم والتعليق</th>
                <th className="px-6 py-4 font-bold border-b border-white/5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Spinner className="w-8 h-8 text-accent-red mx-auto animate-spin" />
                  </td>
                </tr>
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-text-muted font-body">
                    لا توجد تقييمات مطابقة لبحثك.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review) => {
                  const product = productsMap[review.productId];
                  return (
                    <tr key={review.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 align-top">
                        <div className="font-bold text-white text-sm mb-1">{review.customerName}</div>
                        <div className="text-[11px] text-text-muted">{formatDate(review.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        {product ? (
                          <div className="flex items-center gap-2">
                            <img src={product.images[0]} alt={product.name} className="w-8 h-8 object-contain bg-white/5 rounded" />
                            <span className="font-product-title font-bold text-white text-xs">{product.name}</span>
                          </div>
                        ) : (
                          <span className="text-text-muted text-xs italic">منتج محذوف</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top max-w-xs">
                        <div className="flex gap-0.5 text-yellow-500 text-xs mb-1">
                          {[...Array(5)].map((_, i) => (
                            <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                          ))}
                        </div>
                        <p className="text-text-muted text-xs line-clamp-3 group-hover:line-clamp-none transition-all">{review.comment}</p>
                      </td>
                      <td className="px-6 py-4 align-top text-center">
                        <button 
                          onClick={() => review.id && handleDelete(review.id, review.productId, review.rating)}
                          disabled={deletingId === review.id}
                          className="bg-accent-red/10 text-accent-red hover:bg-accent-red hover:text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                          title="حذف التقييم"
                        >
                          {deletingId === review.id ? (
                            <Spinner className="w-5 h-5 animate-spin" />
                          ) : (
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
