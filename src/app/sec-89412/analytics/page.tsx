'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getOrders } from '@/lib/firebase/orders';
import { getProducts } from '@/lib/firebase/products';
import { Order, Product, DailyStats } from '@/lib/types';
import { getSiteConfig, updateSiteConfig } from '@/lib/firebase/admin-actions';
import { getDailyStatsRange, subscribeToTodayStats, getCairoDateString } from '@/lib/firebase/analytics-stats';
import { getStartOfDayEgypt, getStartOfDaysAgoEgypt } from '@/lib/date-utils';
import SalesChart from '@/components/admin/SalesChart';
import VisitorsChart from '@/components/admin/VisitorsChart';
import Spinner from '@/components/ui/Spinner';

type DateRange = 'today' | '7d' | '30d' | 'all';

function formatPageName(pageKey: string): string {
  if (pageKey === 'home') return 'الصفحة الرئيسية';
  if (pageKey === 'products') return 'جميع المنتجات (المتجر)';
  if (pageKey === 'cart') return 'سلة المشتريات';
  if (pageKey === 'checkout') return 'صفحة إتمام الطلب';
  if (pageKey === 'order-success') return 'تأكيد الطلب الناجح';
  if (pageKey.startsWith('product_')) {
    const slug = pageKey.replace('product_', '').replace(/_/g, ' ');
    try {
      return `منتج: ${decodeURIComponent(slug)}`;
    } catch {
      return `منتج: ${slug}`;
    }
  }
  return pageKey.replace(/_/g, ' / ');
}

function AdminAnalyticsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentTab = searchParams.get('tab') || 'sales';
  const currentRange = (searchParams.get('range') as DateRange) || '30d';

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [todayLiveStats, setTodayLiveStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBestSellers, setSavingBestSellers] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Initial Data Fetch
  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedOrders, fetchedProducts, fetchedDailyStats] = await Promise.all([
          getOrders(),
          getProducts(),
          getDailyStatsRange(60)
        ]);
        setOrders(fetchedOrders);
        setProducts(fetchedProducts);
        setDailyStats(fetchedDailyStats);
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Real-time listener for today's visitors and pageviews
  useEffect(() => {
    const unsubscribe = subscribeToTodayStats((stats) => {
      if (stats) {
        setTodayLiveStats(stats);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleTabChange = (tab: string) => {
    router.push(`/sec-89412/analytics?tab=${tab}&range=${currentRange}`);
  };

  const handleRangeChange = (range: DateRange) => {
    router.push(`/sec-89412/analytics?tab=${currentTab}&range=${range}`);
  };

  // Merge historical stats with live today's stats
  const mergedDailyStats = useMemo(() => {
    const list = [...dailyStats];
    if (todayLiveStats) {
      const idx = list.findIndex((s) => s.date === todayLiveStats.date);
      if (idx >= 0) {
        list[idx] = todayLiveStats;
      } else {
        list.push(todayLiveStats);
      }
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyStats, todayLiveStats]);

  // Date constants (Cairo timezone)
  const todayStr = useMemo(() => getCairoDateString(), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getCairoDateString(d);
  }, []);

  // Today & Yesterday stats
  const todayStat = useMemo(() => {
    return todayLiveStats || mergedDailyStats.find((s) => s.date === todayStr) || null;
  }, [todayLiveStats, mergedDailyStats, todayStr]);

  const yesterdayStat = useMemo(() => {
    return mergedDailyStats.find((s) => s.date === yesterdayStr) || null;
  }, [mergedDailyStats, yesterdayStr]);

  const todayVisitors = todayStat?.visitors || 0;
  const todayPageViews = todayStat?.pageViews || 0;
  const yesterdayVisitors = yesterdayStat?.visitors || 0;

  const visitorsGrowth = useMemo(() => {
    if (yesterdayVisitors === 0) {
      return todayVisitors > 0 ? 100 : 0;
    }
    return Math.round(((todayVisitors - yesterdayVisitors) / yesterdayVisitors) * 100);
  }, [todayVisitors, yesterdayVisitors]);

  // Monthly Visitors (current month)
  const currentMonthPrefix = todayStr.slice(0, 7); // 'YYYY-MM'
  const monthVisitors = useMemo(() => {
    return mergedDailyStats
      .filter((s) => s.date.startsWith(currentMonthPrefix))
      .reduce((sum, s) => sum + (s.visitors || 0), 0);
  }, [mergedDailyStats, currentMonthPrefix]);

  // Active Orders & Revenue by current range
  const { activeOrders, totalSalesCount, totalRevenue } = useMemo(() => {
    let result = orders.filter(
      (o) => o.status !== 'cancelled' && o.paymentStatus !== 'rejected'
    );

    let startDate = getStartOfDayEgypt();

    if (currentRange === 'today') {
      startDate = getStartOfDayEgypt();
    } else if (currentRange === '7d') {
      startDate = getStartOfDaysAgoEgypt(6);
    } else if (currentRange === '30d') {
      startDate = getStartOfDaysAgoEgypt(29);
    } else {
      startDate = new Date(0);
    }

    result = result.filter((o) => {
      const d =
        o.createdAt instanceof Date
          ? o.createdAt
          : (o.createdAt as any)?.seconds
          ? new Date((o.createdAt as any).seconds * 1000)
          : new Date();
      return d >= startDate;
    });

    const revenue = result.reduce((sum, o) => sum + o.totalPrice, 0);

    return { activeOrders: result, totalSalesCount: result.length, totalRevenue: revenue };
  }, [orders, currentRange]);

  // Today's Conversion Rate
  const todayActiveOrdersCount = useMemo(() => {
    const startOfToday = getStartOfDayEgypt();
    return orders.filter((o) => {
      if (o.status === 'cancelled' || o.paymentStatus === 'rejected') return false;
      const d =
        o.createdAt instanceof Date
          ? o.createdAt
          : (o.createdAt as any)?.seconds
          ? new Date((o.createdAt as any).seconds * 1000)
          : new Date();
      return d >= startOfToday;
    }).length;
  }, [orders]);

  const todayConversionRate = useMemo(() => {
    if (todayVisitors <= 0) return '0.0%';
    const rate = (todayActiveOrdersCount / todayVisitors) * 100;
    return `${rate.toFixed(1)}%`;
  }, [todayActiveOrdersCount, todayVisitors]);

  // Device Breakdown
  const deviceStats = useMemo(() => {
    let mobile = 0;
    let desktop = 0;

    let filtered = [...mergedDailyStats];
    if (currentRange === 'today') {
      filtered = filtered.filter((s) => s.date === todayStr);
    } else if (currentRange === '7d') {
      filtered = filtered.slice(-7);
    } else if (currentRange === '30d') {
      filtered = filtered.slice(-30);
    }

    filtered.forEach((s) => {
      mobile += s.mobileCount || 0;
      desktop += s.desktopCount || 0;
    });

    const total = mobile + desktop;
    const mobilePercent = total > 0 ? Math.round((mobile / total) * 100) : 0;
    const desktopPercent = total > 0 ? 100 - mobilePercent : 0;

    return { mobile, desktop, total, mobilePercent, desktopPercent };
  }, [mergedDailyStats, currentRange, todayStr]);

  // Top Visited Pages
  const aggregatedTopPages = useMemo(() => {
    const pageMap: Record<string, number> = {};

    let filtered = [...mergedDailyStats];
    if (currentRange === 'today') {
      filtered = filtered.filter((s) => s.date === todayStr);
    } else if (currentRange === '7d') {
      filtered = filtered.slice(-7);
    } else if (currentRange === '30d') {
      filtered = filtered.slice(-30);
    }

    filtered.forEach((s) => {
      if (s.topPages) {
        Object.entries(s.topPages).forEach(([page, count]) => {
          pageMap[page] = (pageMap[page] || 0) + Number(count || 0);
        });
      }
    });

    const sorted = Object.entries(pageMap)
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const totalViews = sorted.reduce((sum, p) => sum + p.views, 0);

    return sorted.map((item) => ({
      ...item,
      percent: totalViews > 0 ? Math.round((item.views / totalViews) * 100) : 0,
      displayName: formatPageName(item.page)
    }));
  }, [mergedDailyStats, currentRange, todayStr]);

  // Top Products for sales tab
  const topProducts = useMemo(() => {
    const counts: Record<string, { id: string; name: string; qty: number; revenue: number }> = {};

    activeOrders.forEach((o) => {
      o.items.forEach((item) => {
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
      const productIds = topProducts.map((p) => p.id);

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
            <h1 className="font-product-title text-2xl md:text-3xl font-black text-white">
              التقارير والإحصائيات
            </h1>
          </div>
          <p className="font-body text-xs sm:text-sm text-text-muted">
            تحليل شامل ودقيق لحركة المبيعات، الإيرادات، وزوار المتجر اللحظي واليومي.
          </p>
        </div>

        {/* Range Filter */}
        <div className="flex items-center gap-1.5 bg-[#0a0a0a] p-1.5 border border-white/10 rounded-2xl shadow-lg">
          {[
            { id: 'today', label: 'اليوم' },
            { id: '7d', label: '7 أيام' },
            { id: '30d', label: '30 يوم' },
            { id: 'all', label: 'الكل' }
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
      <div className="flex flex-wrap gap-2.5 border-b border-white/10 pb-3">
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
          onClick={() => handleTabChange('visitors')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-product-title font-bold text-xs sm:text-sm transition-all cursor-pointer relative ${
            currentTab === 'visitors'
              ? 'bg-accent-red text-white shadow-lg shadow-accent-red/20'
              : 'bg-white/5 text-text-muted hover:text-white hover:bg-white/10 border border-white/10'
          }`}
        >
          <span className="material-symbols-outlined text-base">visibility</span>
          <span>حركة الزوار وتصفح المتجر</span>
          {todayVisitors > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-1 -right-1"></span>
          )}
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

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Revenue */}
        <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 flex flex-col justify-between h-36 hover:border-emerald-500/30 transition-all shadow-xl group overflow-hidden">
          <div className="absolute -left-6 -top-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="flex flex-col">
              <span className="font-body text-xs text-text-muted font-bold">إجمالي الإيرادات</span>
              <span className="text-[10px] text-text-muted/60 mt-0.5">للطلبات المؤكدة للفترة</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10 transition-all">
              <span className="material-symbols-outlined text-emerald-400 text-lg">account_balance_wallet</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="font-mono text-2xl sm:text-3xl font-black text-emerald-400 flex items-baseline gap-1.5">
              {totalRevenue.toLocaleString()}{' '}
              <span className="text-xs font-body text-text-muted font-bold">EGP</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 flex flex-col justify-between h-36 hover:border-accent-red/30 transition-all shadow-xl group overflow-hidden">
          <div className="absolute -left-6 -top-6 w-20 h-20 bg-accent-red/10 rounded-full blur-2xl group-hover:bg-accent-red/20 transition-colors pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="flex flex-col">
              <span className="font-body text-xs text-text-muted font-bold">الطلبات الناجحة</span>
              <span className="text-[10px] text-text-muted/60 mt-0.5">خلال الفترة المحددة</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-accent-red/40 group-hover:bg-accent-red/10 transition-all">
              <span className="material-symbols-outlined text-accent-red text-lg">shopping_bag</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="font-mono text-2xl sm:text-3xl font-black text-white flex items-baseline gap-1.5">
              {totalSalesCount.toLocaleString()}{' '}
              <span className="text-xs font-body text-text-muted font-bold">طلب ناجح</span>
            </div>
          </div>
        </div>

        {/* Card 3: Today's Visitors + Growth vs Yesterday */}
        <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 flex flex-col justify-between h-36 hover:border-cyan-500/30 transition-all shadow-xl group overflow-hidden">
          <div className="absolute -left-6 -top-6 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-colors pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-body text-xs text-text-muted font-bold">زوار اليوم (الفريدين)</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  لحظي
                </span>
              </div>
              <span className="text-[10px] text-text-muted/60 mt-0.5">
                أمس: {yesterdayVisitors.toLocaleString()} زائر
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-cyan-500/40 group-hover:bg-cyan-500/10 transition-all">
              <span className="material-symbols-outlined text-cyan-400 text-lg">group</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto flex items-baseline justify-between">
            <div className="font-mono text-2xl sm:text-3xl font-black text-cyan-400 flex items-baseline gap-1.5">
              {todayVisitors.toLocaleString()}{' '}
              <span className="text-xs font-body text-text-muted font-bold">زائر</span>
            </div>
            {yesterdayVisitors > 0 && (
              <div
                className={`flex items-center gap-0.5 text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                  visitorsGrowth >= 0
                    ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                    : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {visitorsGrowth >= 0 ? 'arrow_upward' : 'arrow_downward'}
                </span>
                <span>{Math.abs(visitorsGrowth)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Today's Pageviews */}
        <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 flex flex-col justify-between h-36 hover:border-amber-500/30 transition-all shadow-xl group overflow-hidden">
          <div className="absolute -left-6 -top-6 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="flex flex-col">
              <span className="font-body text-xs text-text-muted font-bold">مشاهدات الصفحات اليوم</span>
              <span className="text-[10px] text-text-muted/60 mt-0.5">
                معدل {todayVisitors > 0 ? (todayPageViews / todayVisitors).toFixed(1) : 0} صفحة/زائر
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-amber-500/40 group-hover:bg-amber-500/10 transition-all">
              <span className="material-symbols-outlined text-amber-400 text-lg">visibility</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="font-mono text-2xl sm:text-3xl font-black text-amber-400 flex items-baseline gap-1.5">
              {todayPageViews.toLocaleString()}{' '}
              <span className="text-xs font-body text-text-muted font-bold">مشاهدة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl md:rounded-3xl p-5 sm:p-7 shadow-xl">
        {currentTab === 'sales' && (
          <div className="space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h2 className="font-product-title text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-accent-red">stacked_line_chart</span>
                مؤشر أداء المبيعات
              </h2>
              <p className="text-xs text-text-muted font-body mt-1">
                تتبع الرسم البياني لتطور المبيعات اليومية
              </p>
            </div>
            <div className="min-h-[350px]">
              <SalesChart orders={orders} range={currentRange} />
            </div>
          </div>
        )}

        {currentTab === 'visitors' && (
          <div className="space-y-8">
            {/* Additional Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Monthly Visitors */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-text-muted font-body font-bold mb-1">
                    زوار الشهر الحالي بالكامل
                  </div>
                  <div className="font-mono text-2xl font-black text-white">
                    {monthVisitors.toLocaleString()}{' '}
                    <span className="text-xs font-body text-text-muted font-normal">زائر</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400">
                  <span className="material-symbols-outlined">calendar_month</span>
                </div>
              </div>

              {/* Conversion Rate */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-text-muted font-body font-bold mb-1">
                    معدل تحويل زوار اليوم لطلبات
                  </div>
                  <div className="font-mono text-2xl font-black text-emerald-400">
                    {todayConversionRate}{' '}
                    <span className="text-xs font-body text-text-muted font-normal">
                      ({todayActiveOrdersCount} طلب من {todayVisitors} زائر)
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                  <span className="material-symbols-outlined">bolt</span>
                </div>
              </div>

              {/* Device Split Progress */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex justify-between items-center text-xs text-text-muted font-body font-bold mb-2">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-cyan-400">smartphone</span>
                    موبايل: {deviceStats.mobilePercent}%
                  </span>
                  <span className="flex items-center gap-1">
                    كمبيوتر: {deviceStats.desktopPercent}%
                    <span className="material-symbols-outlined text-sm text-amber-400">desktop_windows</span>
                  </span>
                </div>
                <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${deviceStats.mobilePercent}%` }}
                    className="bg-cyan-500 h-full transition-all duration-500"
                    title={`موبايل: ${deviceStats.mobilePercent}%`}
                  ></div>
                  <div
                    style={{ width: `${deviceStats.desktopPercent}%` }}
                    className="bg-amber-500 h-full transition-all duration-500"
                    title={`كمبيوتر: ${deviceStats.desktopPercent}%`}
                  ></div>
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div className="space-y-4">
              <div className="border-b border-white/10 pb-4">
                <h2 className="font-product-title text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-cyan-400">query_stats</span>
                  رسم بياني لتصاعد الزوار ومشاهدات الصفحات
                </h2>
                <p className="text-xs text-text-muted font-body mt-1">
                  مقارنة يومية بين عدد الزوار الفريدين (Unique Visitors) وإجمالي مشاهدات الصفحات (PageViews)
                </p>
              </div>
              <div className="min-h-[350px]">
                <VisitorsChart stats={mergedDailyStats} range={currentRange} />
              </div>
            </div>

            {/* Top Visited Pages */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div>
                <h3 className="font-product-title text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400">local_fire_department</span>
                  أكثر الصفحات تصفحاً وزيارة في المتجر
                </h3>
                <p className="text-xs text-text-muted font-body mt-1">
                  ترتيب الصفحات حسب عدد مرات المشاهدة والزيارة خلال الفترة المحددة
                </p>
              </div>

              {aggregatedTopPages.length === 0 ? (
                <p className="text-center py-8 text-text-muted font-body text-sm">
                  لا توجد سجلات صفحات لهذه الفترة حتى الآن.
                </p>
              ) : (
                <div className="space-y-3">
                  {aggregatedTopPages.map((item, idx) => (
                    <div
                      key={item.page}
                      className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-white/5 text-text-muted text-xs font-mono font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-product-title font-bold text-white truncate">
                            {item.displayName}
                          </div>
                          <div className="text-[11px] font-mono text-text-muted/60 truncate" dir="ltr">
                            /{item.page.replace(/_/g, '/')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 sm:w-64">
                        <div className="flex-1 bg-white/10 h-2 rounded-full overflow-hidden hidden sm:block">
                          <div
                            style={{ width: `${item.percent}%` }}
                            className="bg-gradient-to-l from-accent-red to-amber-500 h-full rounded-full"
                          ></div>
                        </div>
                        <div className="font-mono text-sm font-bold text-white text-left shrink-0">
                          {item.views.toLocaleString()}{' '}
                          <span className="text-[11px] font-body text-text-muted font-normal">
                            مشاهدة ({item.percent}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'top-products' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-4 gap-4">
              <div>
                <h2 className="font-product-title text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-accent-red">military_tech</span>
                  أفضل 10 منتجات مبيعاً
                </h2>
                <p className="text-xs text-text-muted font-body mt-1">
                  ترتيب المنتجات بحسب إجمالي عدد القطع المباعة
                </p>
              </div>
              <div className="flex items-center gap-3">
                {saveMsg && (
                  <span
                    className={`text-xs font-body font-bold ${
                      saveMsg.includes('خطأ') || saveMsg.includes('لا يوجد')
                        ? 'text-accent-red'
                        : 'text-emerald-400'
                    } animate-fade-in`}
                  >
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
              <p className="text-center py-10 text-text-muted font-body text-sm">
                لا توجد مبيعات مسجلة في هذه الفترة.
              </p>
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
                      const productData = products.find((prod) => prod.id === p.id);
                      return (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 pr-4 text-right flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-white/5 text-text-muted text-xs font-mono font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            {productData?.images?.[0] ? (
                              <img
                                src={productData.images[0]}
                                alt={p.name}
                                className="w-11 h-11 rounded-xl object-contain bg-black/50 border border-white/10 p-1 shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-black/50 flex items-center justify-center border border-white/10 text-[10px] text-text-muted shrink-0">
                                صورة
                              </div>
                            )}
                            <span className="text-white font-product-title font-bold text-sm sm:text-base">
                              {p.name}
                            </span>
                          </td>
                          <td className="py-4 text-center font-mono font-bold text-white text-base">
                            {p.qty}{' '}
                            <span className="text-xs font-body text-text-muted font-normal">
                              قطعة
                            </span>
                          </td>
                          <td
                            className="py-4 pl-4 text-left font-mono font-bold text-accent-red text-base"
                            dir="ltr"
                          >
                            {p.revenue.toLocaleString()}{' '}
                            <span className="text-[10px] font-body text-text-muted font-normal">
                              EGP
                            </span>
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
    <Suspense
      fallback={
        <div className="h-96 flex items-center justify-center">
          <Spinner className="inline-block w-10 h-10 text-accent-red animate-spin" />
        </div>
      }
    >
      <AdminAnalyticsContent />
    </Suspense>
  );
}
