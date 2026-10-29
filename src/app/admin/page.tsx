'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getOrders } from '@/lib/firebase/orders';
import { getProducts } from '@/lib/firebase/products';
import { Order, Product } from '@/lib/types';
import { getStartOfDayEgypt, getStartOfDaysAgoEgypt } from '@/lib/date-utils';

import SalesChart from '@/components/admin/SalesChart';
import Spinner from '@/components/ui/Spinner';

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // DEBUG BUG: log to uncover "ث" issue. I will check the console log to find why it is "ث"
  useEffect(() => {
    if (products.length > 0) {
      const p = products.find(prod => prod.name === 'ث');
      if (p) {
        console.log('BUG DETECTED: Product found named "ث" with ID:', p.id);
      }
    }
  }, [products]);

  useEffect(() => {
    async function loadStats() {
      try {
        const [fetchedOrders, fetchedProducts] = await Promise.all([
          getOrders(),
          getProducts()
        ]);
        setOrders(fetchedOrders);
        setProducts(fetchedProducts);
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const paymentsPendingReview = orders.filter(o => o.paymentStatus === 'pending_review').length;
    
    // Filter active orders (not cancelled, not rejected payment)
    const activeOrders = orders.filter(o => o.status !== 'cancelled' && o.paymentStatus !== 'rejected');

    // Today's Date helpers using Egypt Time (UTC+2)
    const startOfToday = getStartOfDayEgypt();
    const startOf7DaysAgo = getStartOfDaysAgoEgypt(7);

    let todaySales = 0;
    let weeklySales = 0;
    let totalSales = 0;
    const productSalesCount: { [key: string]: { name: string; quantity: number } } = {};

    activeOrders.forEach(o => {
      const orderDate = o.createdAt instanceof Date ? o.createdAt : (o.createdAt as any)?.seconds ? new Date((o.createdAt as any).seconds * 1000) : new Date();

      totalSales += o.totalPrice;

      if (orderDate.getTime() >= startOfToday.getTime()) {
        todaySales += o.totalPrice;
      }
      if (orderDate.getTime() >= startOf7DaysAgo.getTime()) {
        weeklySales += o.totalPrice;
      }

      // Track item sales quantities
      o.items.forEach(item => {
        if (!productSalesCount[item.productId]) {
          productSalesCount[item.productId] = { name: item.name, quantity: 0 };
        }
        productSalesCount[item.productId].quantity += item.quantity;
      });
    });

    // Find top selling product
    let topProduct = 'مفيش مبيعات لسه';
    let topProductQty = 0;
    Object.keys(productSalesCount).forEach(pid => {
      const p = productSalesCount[pid];
      if (p.quantity > topProductQty) {
        topProduct = p.name;
        topProductQty = p.quantity;
      }
    });

    const activeProdCount = products.filter(p => p.isActive).length;

    return {
      pendingOrders,
      paymentsPendingReview,
      todaySales,
      weeklySales,
      totalSales,
      topProduct: topProductQty > 0 ? `${topProduct} (${topProductQty} حتة)` : topProduct,
      activeProdCount,
      totalOrdersCount: orders.length
    };
  }, [orders, products]);

  const recentOrders = orders.slice(0, 5);

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
              لوحة التحكم والإحصائيات
            </h1>
          </div>
          <p className="font-body text-xs sm:text-sm text-text-muted">
            نظرة شاملة على مبيعات المتجر، نشاط الأوردرات، والتحويلات بانتظار المراجعة.
          </p>
        </div>
        <div className="flex items-center gap-2.5 bg-[#0a0a0a] border border-white/10 px-3.5 py-2 rounded-xl text-xs text-text-muted shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>البيانات متصلة ومحدثة</span>
        </div>
      </div>

      {/* Grid of Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        
        {/* Stat: Total Sales */}
        <Link 
          href="/admin/analytics?range=all" 
          className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 flex flex-col justify-between h-44 hover:border-accent-red/40 hover:-translate-y-0.5 transition-all group overflow-hidden shadow-lg"
        >
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-accent-red/10 rounded-full blur-2xl group-hover:bg-accent-red/20 transition-colors pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <span className="font-body text-xs sm:text-sm text-text-muted font-bold group-hover:text-white transition-colors">إجمالي المبيعات</span>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-accent-red/40 group-hover:bg-accent-red/10 transition-all">
              <span className="material-symbols-outlined text-accent-red text-xl">account_balance_wallet</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="font-mono text-3xl sm:text-4xl font-black text-white group-hover:text-accent-red transition-colors flex items-baseline gap-1.5">
              {stats.totalSales.toLocaleString()} <span className="text-xs font-body text-text-muted font-bold">EGP</span>
            </div>
            <span className="text-[10px] text-text-muted/70 mt-1 block">كل الأوردرات المؤكدة</span>
          </div>
        </Link>

        {/* Stat: Today's sales */}
        <Link 
          href="/admin/analytics?range=today" 
          className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 flex flex-col justify-between h-44 hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all group overflow-hidden shadow-lg"
        >
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <span className="font-body text-xs sm:text-sm text-text-muted font-bold group-hover:text-white transition-colors">مبيعات اليوم</span>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10 transition-all">
              <span className="material-symbols-outlined text-emerald-400 text-xl">payments</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="font-mono text-3xl sm:text-4xl font-black text-emerald-400 flex items-baseline gap-1.5">
              {stats.todaySales.toLocaleString()} <span className="text-xs font-body text-text-muted font-bold">EGP</span>
            </div>
            <span className="text-[10px] text-text-muted/70 mt-1 block">مبيعات آخر 24 ساعة</span>
          </div>
        </Link>

        {/* Stat: Weekly sales */}
        <Link 
          href="/admin/analytics?range=7d" 
          className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 flex flex-col justify-between h-44 hover:border-white/30 hover:-translate-y-0.5 transition-all group overflow-hidden shadow-lg"
        >
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <span className="font-body text-xs sm:text-sm text-text-muted font-bold group-hover:text-white transition-colors">مبيعات الأسبوع</span>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/30 transition-all">
              <span className="material-symbols-outlined text-white text-xl">trending_up</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="font-mono text-3xl sm:text-4xl font-black text-white flex items-baseline gap-1.5">
              {stats.weeklySales.toLocaleString()} <span className="text-xs font-body text-text-muted font-bold">EGP</span>
            </div>
            <span className="text-[10px] text-text-muted/70 mt-1 block">خلال الـ 7 أيام الأخيرة</span>
          </div>
        </Link>

        {/* Stat: Pending Orders */}
        <Link 
          href="/admin/orders?status=pending" 
          className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 flex flex-col justify-between h-44 hover:border-amber-500/40 hover:-translate-y-0.5 transition-all group overflow-hidden shadow-lg"
        >
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <span className="font-body text-xs sm:text-sm text-text-muted font-bold group-hover:text-white transition-colors">أوردرات قيد الانتظار</span>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-amber-500/40 group-hover:bg-amber-500/10 transition-all">
              <span className="material-symbols-outlined text-amber-400 text-xl">pending_actions</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="font-mono text-3xl sm:text-4xl font-black text-white group-hover:text-amber-400 transition-colors flex items-baseline gap-1.5">
              {stats.pendingOrders} <span className="text-xs font-body text-text-muted font-bold">أوردر</span>
            </div>
            <span className="text-[10px] text-text-muted/70 mt-1 block">تحتاج مراجعة وتأكيد</span>
          </div>
        </Link>

        {/* Stat: Payments pending review */}
        <Link 
          href="/admin/orders?paymentStatus=pending_review" 
          className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 flex flex-col justify-between h-44 hover:border-blue-500/40 hover:-translate-y-0.5 transition-all group overflow-hidden shadow-lg sm:col-span-2"
        >
          <div className="absolute -left-6 -top-6 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="flex flex-col">
              <span className="font-body text-xs sm:text-sm text-text-muted font-bold group-hover:text-white transition-colors">مراجعة التحويلات والديبوزيت</span>
              <span className="text-xs text-text-muted/70 mt-0.5">إيصالات فودافون كاش وانستاباي بانتظار التأكيد</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-blue-500/40 group-hover:bg-blue-500/10 transition-all">
              <span className="material-symbols-outlined text-blue-400 text-xl">receipt_long</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="font-mono text-3xl sm:text-4xl font-black text-white group-hover:text-blue-400 transition-colors flex items-baseline gap-1.5">
              {stats.paymentsPendingReview} <span className="text-xs font-body text-text-muted font-bold">إيصال للمراجعة</span>
            </div>
            <span className="text-[10px] text-text-muted/70 mt-1 block">تأكيد الدفع يحدّث الأوردر تلقائياً</span>
          </div>
        </Link>

        {/* Stat: Active products */}
        <Link 
          href="/admin/products?filter=active" 
          className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 flex flex-col justify-between h-44 hover:border-white/30 hover:-translate-y-0.5 transition-all group overflow-hidden shadow-lg"
        >
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <span className="font-body text-xs sm:text-sm text-text-muted font-bold group-hover:text-white transition-colors">المنتجات النشطة</span>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/30 transition-all">
              <span className="material-symbols-outlined text-white text-xl">inventory_2</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="font-mono text-3xl sm:text-4xl font-black text-white group-hover:text-gray-300 transition-colors flex items-baseline gap-1.5">
              {stats.activeProdCount} <span className="text-xs font-body text-text-muted font-bold">منتج متاح</span>
            </div>
            <span className="text-[10px] text-text-muted/70 mt-1 block">معروض في المتجر للبيع</span>
          </div>
        </Link>

        {/* Stat: Top product */}
        <Link 
          href="/admin/analytics?tab=top-products" 
          className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 flex flex-col justify-between h-44 hover:border-accent-red/40 hover:-translate-y-0.5 transition-all group overflow-hidden shadow-lg"
        >
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-accent-red/10 rounded-full blur-2xl group-hover:bg-accent-red/20 transition-colors pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <span className="font-body text-xs sm:text-sm text-text-muted font-bold group-hover:text-white transition-colors">المنتج الأكثر طلباً</span>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-accent-red/40 group-hover:bg-accent-red/10 transition-all">
              <span className="material-symbols-outlined text-accent-red text-xl">military_tech</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="font-product-title text-base sm:text-lg font-bold text-white line-clamp-2 uppercase leading-snug group-hover:text-accent-red transition-colors" dir="ltr">
              {stats.topProduct}
            </div>
            <span className="text-[10px] text-text-muted/70 mt-1 block">بناءً على كميات البيع الفعلي</span>
          </div>
        </Link>

      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Main Chart (Last 30 Days) */}
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/10 rounded-2xl md:rounded-3xl p-5 sm:p-7 flex flex-col gap-6 shadow-xl">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <div>
              <h2 className="font-product-title text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-accent-red">stacked_line_chart</span>
                مؤشر أداء المبيعات
              </h2>
              <p className="text-xs text-text-muted font-body mt-1">تتبع حركة المبيعات اليومية على مدار آخر 30 يوم</p>
            </div>
            <Link 
              href="/admin/analytics?range=30d" 
              className="flex items-center gap-1.5 font-body font-bold text-xs text-accent-red hover:text-white transition-all bg-accent-red/10 hover:bg-accent-red border border-accent-red/20 hover:border-accent-red px-3.5 py-2 rounded-xl"
            >
              <span>التقارير المفصلة</span>
              <span className="material-symbols-outlined text-sm">arrow_outward</span>
            </Link>
          </div>
          <div className="min-h-[300px]">
            <SalesChart orders={orders} range="30d" />
          </div>
        </div>

        {/* Recent Orders Side Table */}
        <div className="lg:col-span-1 bg-[#0a0a0a] border border-white/10 rounded-2xl md:rounded-3xl p-5 sm:p-6 flex flex-col gap-5 shadow-xl">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <div>
              <h2 className="font-product-title text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-accent-red">list_alt</span>
                أحدث الطلبات
              </h2>
            </div>
            <Link 
              href="/admin/orders" 
              className="text-xs text-text-muted hover:text-white transition-colors bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl font-bold"
            >
              عرض الكل
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 opacity-50">
              <span className="material-symbols-outlined text-5xl mb-3 text-text-muted">inbox</span>
              <p className="font-body text-sm text-text-muted">مفيش أوردرات متسجلة لسه.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentOrders.map((o) => (
                <Link 
                  key={o.id} 
                  href={`/admin/orders/detail?id=${o.id}`}
                  className="block bg-black/40 border border-white/5 hover:border-accent-red/30 rounded-xl p-3.5 transition-all group hover:bg-white/[0.02]"
                >
                  <div className="flex justify-between items-start mb-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono font-bold text-white group-hover:text-accent-red transition-colors text-xs">#{o.id}</span>
                      <span className="font-body text-xs text-white/90 font-bold truncate max-w-[130px]">{o.customerName}</span>
                    </div>
                    <span className={`inline-block border px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${getStatusBadge(o.status)}`}>
                      {getStatusText(o.status)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2.5 border-t border-white/5">
                    <span className="text-[10px] text-text-muted bg-white/5 px-2 py-1 rounded-lg flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">
                        {o.paymentMethod === 'cod' ? 'local_shipping' : 'smartphone'}
                      </span>
                      {o.paymentMethod === 'cod' ? 'دفع عند الاستلام' : 'فودافون كاش'}
                    </span>
                    <span className="font-mono font-bold text-white text-xs" dir="ltr">
                      {o.totalPrice.toLocaleString()} <span className="text-[10px] text-accent-red font-body">EGP</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
