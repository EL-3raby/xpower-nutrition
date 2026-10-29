'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getOrders } from '@/lib/firebase/orders';
import { getProducts } from '@/lib/firebase/products';
import { Order, Product } from '@/lib/types';
import { getSiteConfig, updateSiteConfig } from '@/lib/firebase/admin-actions';
import { getStartOfDayEgypt, getStartOfDaysAgoEgypt, getEgyptTime } from '@/lib/date-utils';
import SalesChart from '@/components/admin/SalesChart';
import Spinner from '@/components/ui/Spinner';

type DateRange = 'today' | '7d' | '30d' | 'all';

function AdminAnalyticsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentTab = searchParams.get('tab') || 'sales';
  const currentRange = (searchParams.get('range') as DateRange) || '30d';

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBestSellers, setSavingBestSellers] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedOrders, fetchedProducts] = await Promise.all([
          getOrders(),
          getProducts()
        ]);
        setOrders(fetchedOrders);
        setProducts(fetchedProducts);
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleTabChange = (tab: string) => {
    router.push(`/admin/analytics?tab=${tab}&range=${currentRange}`);
  };

  const handleRangeChange = (range: DateRange) => {
    router.push(`/admin/analytics?tab=${currentTab}&range=${range}`);
  };

  const { activeOrders, totalSalesCount, totalRevenue } = useMemo(() => {
    let result = orders.filter(
      (o) => o.status !== 'cancelled' && o.paymentStatus !== 'rejected'
    );

    let startDate = getStartOfDayEgypt();

    if (currentRange === 'today') {
      startDate = getStartOfDayEgypt();
    } else if (currentRange === '7d') {
      startDate = getStartOfDaysAgoEgypt(6); // 7 days including today
    } else if (currentRange === '30d') {
      startDate = getStartOfDaysAgoEgypt(29);
    } else {
      // all
      startDate = new Date(0); // very old
    }

    result = result.filter(o => {
      const d = o.createdAt instanceof Date ? o.createdAt : (o.createdAt as any)?.seconds ? new Date((o.createdAt as any).seconds * 1000) : new Date();
      return d >= startDate;
    });

    const revenue = result.reduce((sum, o) => sum + o.totalPrice, 0);

    return { activeOrders: result, totalSalesCount: result.length, totalRevenue: revenue };
  }, [orders, currentRange]);

  const topProducts = useMemo(() => {
    const counts: Record<string, { id: string; name: string; qty: number; revenue: number }> = {};
    
    activeOrders.forEach(o => {
      o.items.forEach(item => {
        if (!counts[item.productId]) {
          counts[item.productId] = { id: item.productId, name: item.name, qty: 0, revenue: 0 };
        }
        counts[item.productId].qty += item.quantity;
        counts[item.productId].revenue += item.price * item.quantity;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [activeOrders]);

  const handleSetBestSellers = async () => {
    if (topProducts.length === 0) {
      setSaveMsg('لا يوجد منتجات مبيعة لتعيينها');
      setTimeout(() => setSaveMsg(''), 3000);
      return;
    }
    setSavingBestSellers(true);
    setSaveMsg('');
    try {
      const config = await getSiteConfig();
      const productIds = topProducts.map(p => p.id);
      
      await updateSiteConfig({
        ...config,
        bestSellers: {
          ...config.bestSellers,
          isActive: config.bestSellers?.isActive ?? true,
          productIds
        }
      });
      setSaveMsg('تم تعيين هذه المنتجات في الصفحة الرئيسية بنجاح!');
    } catch (err) {
      console.error(err);
      setSaveMsg('حدث خطأ أثناء التحديث.');
    } finally {
      setSavingBestSellers(false);
      setTimeout(() => setSaveMsg(''), 4000);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="w-2 h-6 bg-accent-red rounded-full shrink-0"></span>
            <h1 className="font-product-title text-2xl md:text-3xl font-black text-white">التقارير والإحصائيات</h1>
          </div>
          <p className="font-body text-xs sm:text-sm text-text-muted">
            تحليل شامل ودقيق لحركة المبيعات، الإيرادات، وأداء المنتجات الأكثر طلباً.
          </p>
        </div>
        
        {/* Range Filter */}
        <div className="flex items-center gap-1.5 bg-[#0a0a0a] p-1.5 border border-white/10 rounded-2xl shadow-lg">
          {[
            { id: 'today', label: 'اليوم' },
            { id: '7d', label: '7 أيام' },
            { id: '30d', label: '30 يوم' },
            { id: 'all', label: 'الكل' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => handleRangeChange(r.id as DateRange)}
              className={`px-3.5 py-1.5 text-xs font-product-title font-bold rounded-xl transition-all cursor-pointer ${
                currentRange === r.id 
                  ? 'bg-accent-red text-white shadow-md shadow-accent-red/20' 
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2.5 border-b border-white/10 pb-3">
        <button
          onClick={() => handleTabChange('sales')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-product-title font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            currentTab === 'sales'
              ? 'bg-accent-red text-white shadow-lg shadow-accent-red/20'
              : 'bg-white/5 text-text-muted hover:text-white hover:bg-white/10 border border-white/10'
          }`}
        >
          <span className="material-symbols-outlined text-base">stacked_line_chart</span>
          <span>حركة المبيعات</span>
        </button>
        <button
          onClick={() => handleTabChange('top-products')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-product-title font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            currentTab === 'top-products'
              ? 'bg-accent-red text-white shadow-lg shadow-accent-red/20'
              : 'bg-white/5 text-text-muted hover:text-white hover:bg-white/10 border border-white/10'
          }`}
        >
          <span className="material-symbols-outlined text-base">military_tech</span>
          <span>المنتجات الأكثر مبيعاً</span>
        </button>
      </div>

      {/* Summary Cards for current range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col justify-between h-40 hover:border-emerald-500/30 transition-all shadow-xl group overflow-hidden">
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="flex flex-col">
              <span className="font-body text-xs sm:text-sm text-text-muted font-bold">إجمالي إيرادات الفترة</span>
              <span className="text-[10px] text-text-muted/60 mt-0.5">للطلبات المؤكدة والناجحة</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10 transition-all">
              <span className="material-symbols-outlined text-emerald-400 text-xl">account_balance_wallet</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="font-mono text-3xl sm:text-4xl font-black text-emerald-400 flex items-baseline gap-1.5">
              {totalRevenue.toLocaleString()} <span className="text-xs font-body text-text-muted font-bold">EGP</span>
            </div>
          </div>
        </div>

        <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col justify-between h-40 hover:border-accent-red/30 transition-all shadow-xl group overflow-hidden">
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-accent-red/10 rounded-full blur-2xl group-hover:bg-accent-red/20 transition-colors pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="flex flex-col">
              <span className="font-body text-xs sm:text-sm text-text-muted font-bold">إجمالي الطلبات الناجحة</span>
              <span className="text-[10px] text-text-muted/60 mt-0.5">خلال الفترة الزمنية المحددة</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-accent-red/40 group-hover:bg-accent-red/10 transition-all">
              <span className="material-symbols-outlined text-accent-red text-xl">shopping_bag</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="font-mono text-3xl sm:text-4xl font-black text-white flex items-baseline gap-1.5">
              {totalSalesCount.toLocaleString()} <span className="text-xs font-body text-text-muted font-bold">طلب ناجح</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl md:rounded-3xl p-5 sm:p-7 shadow-xl">
        {currentTab === 'sales' ? (
          <div className="space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h2 className="font-product-title text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-accent-red">stacked_line_chart</span>
                مؤشر أداء المبيعات
              </h2>
              <p className="text-xs text-text-muted font-body mt-1">تتبع الرسم البياني لتطور المبيعات اليومية</p>
            </div>
            <div className="min-h-[350px]">
              <SalesChart orders={orders} range={currentRange} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-4 gap-4">
              <div>
                <h2 className="font-product-title text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-accent-red">military_tech</span>
                  أفضل 10 منتجات مبيعاً
                </h2>
                <p className="text-xs text-text-muted font-body mt-1">ترتيب المنتجات بحسب إجمالي عدد القطع المباعة</p>
              </div>
              <div className="flex items-center gap-3">
                {saveMsg && (
                  <span className={`text-xs font-body font-bold ${saveMsg.includes('خطأ') || saveMsg.includes('لا يوجد') ? 'text-accent-red' : 'text-emerald-400'} animate-fade-in`}>
                    {saveMsg}
                  </span>
                )}
                <button 
                  onClick={handleSetBestSellers}
                  disabled={savingBestSellers || topProducts.length === 0}
                  className="flex items-center gap-2 bg-accent-red hover:bg-accent-red/90 text-white px-4 py-2.5 text-xs font-product-title font-bold transition-all rounded-xl shadow-lg shadow-accent-red/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingBestSellers ? (
                    <Spinner className="inline-block animate-spin w-4 h-4" />
                  ) : (
                    <span className="material-symbols-outlined text-sm">stars</span>
                  )}
                  <span>عرض كأكثر مبيعاً في الرئيسية</span>
                </button>
              </div>
            </div>
            {topProducts.length === 0 ? (
              <p className="text-center py-10 text-text-muted font-body text-sm">لا توجد مبيعات مسجلة في هذه الفترة.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-text-muted font-bold uppercase tracking-wider bg-white/[0.02]">
                      <th className="py-3.5 pr-4 text-right">المنتج</th>
                      <th className="py-3.5 text-center">الكمية المباعة</th>
                      <th className="py-3.5 pl-4 text-left">إجمالي الإيرادات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-body text-sm">
                    {topProducts.map((p, idx) => {
                      const productData = products.find(prod => prod.id === p.id);
                      return (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 pr-4 text-right flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-white/5 text-text-muted text-xs font-mono font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            {productData?.images?.[0] ? (
                              <img src={productData.images[0]} alt={p.name} className="w-11 h-11 rounded-xl object-contain bg-black/50 border border-white/10 p-1 shrink-0" />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-black/50 flex items-center justify-center border border-white/10 text-[10px] text-text-muted shrink-0">صورة</div>
                            )}
                            <span className="text-white font-product-title font-bold text-sm sm:text-base">{p.name}</span>
                          </td>
                          <td className="py-4 text-center font-mono font-bold text-white text-base">
                            {p.qty} <span className="text-xs font-body text-text-muted font-normal">قطعة</span>
                          </td>
                          <td className="py-4 pl-4 text-left font-mono font-bold text-accent-red text-base" dir="ltr">
                            {p.revenue.toLocaleString()} <span className="text-[10px] font-body text-text-muted font-normal">EGP</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="h-96 flex items-center justify-center">
        <Spinner className="inline-block w-10 h-10 text-accent-red animate-spin" />
      </div>
    }>
      <AdminAnalyticsContent />
    </Suspense>
  );
}
