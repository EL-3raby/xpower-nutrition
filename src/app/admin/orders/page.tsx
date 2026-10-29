'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getOrders } from '@/lib/firebase/orders';
import { Order } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';

function AdminOrdersContent() {
  const searchParams = useSearchParams();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(searchParams.get('paymentStatus') || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadOrders = async () => {
    try {
      const fetched = await getOrders();
      setOrders(fetched);
    } catch (err) {
      console.error('Error loading orders for admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Filter orders
  const filteredOrders = React.useMemo(() => {
    let result = [...orders];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }

    // Payment Status filter
    if (paymentStatusFilter !== 'all') {
      result = result.filter(o => o.paymentStatus === paymentStatusFilter);
    }

    // Search query (customerName or phone)
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) => 
          o.customerName.toLowerCase().includes(queryLower) ||
          o.phone.includes(queryLower) ||
          o.id?.toLowerCase().includes(queryLower)
      );
    }

    return result;
  }, [orders, statusFilter, paymentStatusFilter, searchQuery]);

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'confirmed':
        return 'bg-success/10 text-success border-success/20';
      case 'shipped':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'delivered':
        return 'bg-success/20 text-success border-success/30';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-text-muted/10 text-text-muted';
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'لسه مأكدناش';
      case 'confirmed': return 'اتأكد';
      case 'shipped': return 'في الطريق (اتشحن)';
      case 'delivered': return 'وصل بالسلامة';
      case 'cancelled': return 'اتلغى';
      default: return status;
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
    <div className="space-y-8 text-right max-w-7xl mx-auto" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="w-2 h-6 bg-accent-red rounded-full shrink-0"></span>
            <h1 className="font-product-title text-2xl md:text-3xl font-black text-white flex items-center gap-2">
              إدارة الأوردرات
            </h1>
            <span className="bg-white/5 border border-white/10 text-text-muted font-mono text-xs px-2.5 py-0.5 rounded-full font-bold">
              {filteredOrders.length} طلب
            </span>
          </div>
          <p className="font-body text-xs sm:text-sm text-text-muted">
            تابع طلبات العملاء، حالات الشحن، وأكّد تحويلات فودافون كاش وانستاباي وديبوزيت التوصيل.
          </p>
        </div>
      </div>

      {/* Toolbar filters */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xl">
        
        {/* Search */}
        <div className="w-full md:w-96 relative">
          <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted text-lg pointer-events-none">search</span>
          <input 
            type="text" 
            placeholder="ابحث باسم العميل أو رقم التليفون أو الـ ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/60 text-white border border-white/10 rounded-xl pr-10 pl-4 py-2.5 font-body text-xs placeholder:text-text-muted/60 focus:border-accent-red focus:outline-none transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted font-bold whitespace-nowrap hidden sm:inline">الحالة:</span>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-black/60 text-white border border-white/10 rounded-xl px-3.5 py-2.5 font-body text-xs focus:border-accent-red focus:outline-none cursor-pointer transition-all"
            >
              <option value="all">كل الحالات</option>
              <option value="pending">لسه مأكدناش</option>
              <option value="confirmed">اتأكد</option>
              <option value="shipped">في الطريق</option>
              <option value="delivered">وصل بالسلامة</option>
              <option value="cancelled">اتلغى</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted font-bold whitespace-nowrap hidden sm:inline">الدفع:</span>
            <select 
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="bg-black/60 text-white border border-white/10 rounded-xl px-3.5 py-2.5 font-body text-xs focus:border-accent-red focus:outline-none cursor-pointer transition-all"
            >
              <option value="all">كل حالات الدفع</option>
              <option value="pending_review">مستني مراجعة الإيصال</option>
              <option value="confirmed">دفع متأكد</option>
              <option value="rejected">دفع مرفوض</option>
            </select>
          </div>

        </div>
      </div>

      {/* Orders View */}
      {filteredOrders.length === 0 ? (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl md:rounded-3xl p-12 text-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-text-muted">inbox</span>
          </div>
          <h3 className="font-product-title font-bold text-lg text-white">مفيش أوردرات مطابقة</h3>
          <p className="font-body text-xs text-text-muted mt-1 max-w-sm mx-auto">
            جرب تغير شروط البحث أو الفلاتر المعروضة فوق للوصول للأوردرات المطلوبة.
          </p>
        </div>
      ) : (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl md:rounded-3xl overflow-hidden shadow-xl">
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-text-muted font-body text-xs uppercase bg-white/[0.02]">
                  <th className="py-4 pr-6 text-right font-bold">رقم الطلب</th>
                  <th className="py-4 text-right font-bold">العميل</th>
                  <th className="py-4 text-right font-bold">المدينة</th>
                  <th className="py-4 text-right font-bold">طريقة الدفع</th>
                  <th className="py-4 text-center font-bold">حالة الطلب</th>
                  <th className="py-4 text-center font-bold">التاريخ</th>
                  <th className="py-4 pl-6 text-left font-bold">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-body text-sm">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/[0.02] transition-colors group">
                    
                    <td className="py-4 pr-6 text-right font-mono font-bold text-white select-all">
                      <Link href={`/admin/orders/detail?id=${o.id}`} className="hover:text-accent-red flex items-center gap-2">
                        {!o.isReadByAdmin && (
                          <span className="w-2 h-2 rounded-full bg-accent-red inline-block animate-pulse" title="أوردر غير مقروء" />
                        )}
                        <span>#{o.id}</span>
                      </Link>
                    </td>

                    <td className="py-4 text-right text-white font-semibold">{o.customerName}</td>
                    <td className="py-4 text-right text-text-muted text-xs">{o.city}</td>
                    
                    <td className="py-4 text-right text-text-muted">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                          {o.paymentMethod === 'vodafone_cash' ? (
                            <div className="w-4 h-4 inline-flex items-center justify-center shrink-0">
                              <img src="/images/vodafone.png" alt="Vodafone" className="w-full h-full object-contain" />
                            </div>
                          ) : o.paymentMethod === 'instapay' ? (
                            <div className="w-4 h-4 inline-flex items-center justify-center shrink-0">
                              <img src="/images/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <span className="material-symbols-outlined text-[16px] text-accent-red">payments</span>
                          )}
                          <span>
                            {o.paymentMethod === 'vodafone_cash'
                              ? 'فودافون كاش'
                              : o.paymentMethod === 'instapay'
                              ? 'انستاباي'
                              : Boolean(o.depositAmount && o.depositAmount > 0)
                              ? 'كاش + ديبوزيت'
                              : 'كاش'}
                          </span>
                        </span>
                        {o.paymentStatus === 'pending_review' && (
                          <span className="bg-warning/15 text-warning border border-warning/30 px-2 py-0.5 text-[10px] font-bold rounded-md animate-pulse">
                            مراجعة الإيصال
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 text-center">
                      <span className={`inline-flex items-center justify-center border px-3 py-1 rounded-xl text-[11px] font-bold ${getStatusBadge(o.status)}`}>
                        {getStatusText(o.status)}
                      </span>
                    </td>

                    <td className="py-4 text-center text-text-muted text-xs font-mono">
                      {o.createdAt ? (o.createdAt as Date).toLocaleDateString('ar-EG') : 'N/A'}
                    </td>

                    <td className="py-4 pl-6 text-left">
                      <div className="flex justify-end items-center gap-3">
                        <span className="font-mono font-bold text-accent-red text-sm" dir="ltr">
                          {o.totalPrice.toLocaleString()} <span className="text-[10px] font-body text-text-muted font-normal">EGP</span>
                        </span>
                        <Link 
                          href={`/admin/orders/detail?id=${o.id}`} 
                          className="opacity-0 group-hover:opacity-100 transition-all text-text-muted hover:text-white bg-white/5 hover:bg-accent-red/20 p-2 rounded-xl border border-white/10 hover:border-accent-red/30"
                        >
                          <span className="material-symbols-outlined text-[18px] align-middle">chevron_left</span>
                        </Link>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="flex flex-col md:hidden p-4 gap-3">
            {filteredOrders.map((o) => (
              <Link 
                href={`/admin/orders/detail?id=${o.id}`} 
                key={o.id} 
                className="bg-black/50 border border-white/5 hover:border-accent-red/30 rounded-2xl p-4 flex flex-col gap-3 active:scale-[0.99] transition-all relative"
              >
                {!o.isReadByAdmin && (
                  <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-accent-red animate-pulse" />
                )}
                
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono font-bold text-white text-base">#{o.id}</span>
                    <span className="text-white/90 font-body text-sm font-bold">{o.customerName}</span>
                  </div>
                  <span className={`inline-flex items-center justify-center border px-2.5 py-1 rounded-xl text-[10px] font-bold ${getStatusBadge(o.status)}`}>
                    {getStatusText(o.status)}
                  </span>
                </div>

                <div className="flex justify-between items-end pt-2 border-t border-white/5">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      {o.city}
                    </span>
                    <span className="text-xs text-text-muted flex items-center gap-1.5">
                      {o.paymentMethod === 'vodafone_cash' ? (
                        <div className="w-3.5 h-3.5 inline-flex items-center justify-center shrink-0">
                          <img src="/images/vodafone.png" alt="Vodafone" className="w-full h-full object-contain" />
                        </div>
                      ) : o.paymentMethod === 'instapay' ? (
                        <div className="w-3.5 h-3.5 inline-flex items-center justify-center shrink-0">
                          <img src="/images/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <span className="material-symbols-outlined text-sm text-accent-red">payments</span>
                      )}
                      <span>
                        {o.paymentMethod === 'vodafone_cash'
                          ? 'فودافون كاش'
                          : o.paymentMethod === 'instapay'
                          ? 'انستاباي'
                          : Boolean(o.depositAmount && o.depositAmount > 0)
                          ? 'كاش + ديبوزيت'
                          : 'كاش'}
                      </span>
                      {o.paymentStatus === 'pending_review' && (
                        <span className="text-warning text-[10px] font-bold mr-1">مراجعة الإيصال</span>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-text-muted font-mono mb-0.5">
                      {o.createdAt ? (o.createdAt as Date).toLocaleDateString('ar-EG') : 'N/A'}
                    </span>
                    <span className="font-mono font-bold text-accent-red text-base" dir="ltr">
                      {o.totalPrice.toLocaleString()} <span className="text-[10px] font-body text-text-muted">EGP</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={
      <div className="h-96 flex items-center justify-center">
        <Spinner className="inline-block w-10 h-10 text-accent-red animate-spin" />
      </div>
    }>
      <AdminOrdersContent />
    </Suspense>
  );
}
