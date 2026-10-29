'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getCoupons } from '@/lib/firebase/admin-actions';
import { getOrders } from '@/lib/firebase/orders';
import { Coupon, Order } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';
import Link from 'next/link';

function AffiliateReportContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();

  const [affiliate, setAffiliate] = useState<Coupon | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Statistics state
  const [stats, setStats] = useState({
    totalSales: 0,
    earnedCommission: 0,
    paidAmount: 0,
    pendingAmount: 0,
    validOrdersCount: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const allCoupons = await getCoupons();
        const foundAffiliate = allCoupons.find(c => c.id === id);

        if (!foundAffiliate) {
          console.error("Affiliate not found");
          setLoading(false);
          return;
        }

        setAffiliate(foundAffiliate);

        // Fetch all orders and filter by this affiliate's code
        const allOrders = await getOrders();
        // The coupon string might have different casing, so we compare safely
        const affiliateOrders = allOrders.filter(o => 
          o.couponCode && 
          o.couponCode.toLowerCase() === foundAffiliate.code.toLowerCase()
        );
        
        // Sort orders by date descending
        affiliateOrders.sort((a, b) => {
          const getTime = (dateObj: any) => {
            if (!dateObj) return 0;
            if (dateObj instanceof Date) return dateObj.getTime();
            if (typeof dateObj.toMillis === 'function') return dateObj.toMillis();
            if (dateObj.seconds) return dateObj.seconds * 1000;
            return 0;
          };
          return getTime(b.createdAt) - getTime(a.createdAt);
        });

        setOrders(affiliateOrders);

        // Calculate stats
        let totalSales = 0;
        let earnedCommission = 0;
        let validOrdersCount = 0;

        affiliateOrders.forEach(order => {
          // Exclude cancelled orders and rejected vodafone cash payments
          if (order.status !== 'cancelled' && order.paymentStatus !== 'rejected') {
            validOrdersCount++;
            totalSales += order.totalPrice;

            const commValue = foundAffiliate.commissionValue || 0;
            if (foundAffiliate.commissionType === 'percentage') {
              earnedCommission += (order.totalPrice * (commValue / 100));
            } else {
              earnedCommission += commValue;
            }
          }
        });

        const paidAmount = foundAffiliate.paidAmount || 0;
        const pendingAmount = Math.max(0, earnedCommission - paidAmount);

        setStats({
          totalSales,
          earnedCommission,
          paidAmount,
          pendingAmount,
          validOrdersCount
        });

      } catch (err) {
        console.error('Error loading detailed affiliate data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Spinner className="inline-block w-12 h-12 text-accent-red animate-spin" />
        <span className="text-text-muted font-body text-sm font-bold animate-pulse">جاري تحميل التقرير المفصل...</span>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-6xl text-text-muted/50">person_off</span>
        <span className="text-white font-display text-xl">المسوق غير موجود</span>
        <button onClick={() => router.push('/admin/affiliates')} className="text-accent-red underline font-body text-sm">العودة لقائمة المسوقين</button>
      </div>
    );
  }

  // Dashboard Stats Card Component
  const StatCard = ({ title, value, icon, colorClass, highlight }: { title: string, value: string | number, icon: string, colorClass: string, highlight?: boolean }) => (
    <div className={`bg-bg-elevated/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 flex items-center gap-4 hover:bg-bg-elevated hover:border-white/10 transition-all duration-300 ${highlight ? 'shadow-[0_10px_30px_rgba(227,30,36,0.15)] border-accent-red/30' : ''}`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <div>
        <h3 className="text-text-muted font-body text-xs font-bold uppercase tracking-wide mb-1">{title}</h3>
        <p className={`font-display text-2xl font-black ${highlight ? 'text-accent-red' : 'text-white'}`} dir="ltr">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-right pb-10" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <Link href="/admin/affiliates" className="inline-flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-4 font-body text-sm">
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
            رجوع للمسوقين
          </Link>
          <h1 className="font-display text-3xl md:text-4xl font-black text-white flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-accent-red">analytics</span>
            تقرير: {affiliate.affiliateName}
          </h1>
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm font-body text-white">
              <span className="material-symbols-outlined text-text-muted text-[18px]">sell</span>
              كود الخصم: <span className="font-mono font-bold text-accent-red ml-1">{affiliate.code}</span>
            </div>
            {affiliate.affiliateContact && (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm font-body text-white">
                <span className="material-symbols-outlined text-text-muted text-[18px]">call</span>
                تواصل: <span className="font-mono" dir="ltr">{affiliate.affiliateContact}</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm font-body text-white">
              <span className="material-symbols-outlined text-text-muted text-[18px]">payments</span>
              العمولة: 
              <span className="font-bold">
                {affiliate.commissionType === 'percentage' ? `${affiliate.commissionValue}%` : `${affiliate.commissionValue} ج`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="حجم المبيعات (الطلبات الناجحة)" 
          value={`EGP ${stats.totalSales.toLocaleString()}`} 
          icon="monitoring" 
          colorClass="bg-blue-500/10 text-blue-500 border border-blue-500/20"
        />
        <StatCard 
          title="إجمالي العمولات المستحقة" 
          value={`EGP ${stats.earnedCommission.toLocaleString()}`} 
          icon="account_balance" 
          colorClass="bg-purple-500/10 text-purple-500 border border-purple-500/20"
        />
        <StatCard 
          title="العمولات المدفوعة مسبقاً" 
          value={`EGP ${stats.paidAmount.toLocaleString()}`} 
          icon="price_check" 
          colorClass="bg-success/10 text-success border border-success/20"
        />
        <StatCard 
          title="المتبقي (رصيد حالي)" 
          value={`EGP ${stats.pendingAmount.toLocaleString()}`} 
          icon="pending_actions" 
          colorClass="bg-accent-red/10 text-accent-red border border-accent-red/20"
          highlight={true}
        />
      </div>

      {/* Orders Table */}
      <div className="bg-bg-elevated/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-accent-red">list_alt</span>
            سجل الطلبات
          </h2>
          <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-xs font-mono text-white">
            {orders.length} طلب
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-white/5 text-text-muted font-body border-b border-white/10">
              <tr>
                <th className="px-6 py-5 font-bold">رقم الطلب والتاريخ</th>
                <th className="px-6 py-5 font-bold">العميل والمحافظة</th>
                <th className="px-6 py-5 font-bold">ملخص المنتجات</th>
                <th className="px-6 py-5 font-bold text-center">الإجمالي</th>
                <th className="px-6 py-5 font-bold text-center text-accent-red">العمولة</th>
                <th className="px-6 py-5 font-bold text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                        <span className="material-symbols-outlined text-4xl text-text-muted/50">receipt_long</span>
                      </div>
                      <p className="text-white font-bold text-lg">لا توجد طلبات لهذا المسوق حتى الآن</p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map(order => {
                  // Format Date
                  const getTime = (d: any) => {
                    if (!d) return 0;
                    if (d instanceof Date) return d.getTime();
                    if (typeof d.toMillis === 'function') return d.toMillis();
                    if (d.seconds) return d.seconds * 1000;
                    return 0;
                  };
                  const orderDateObj = new Date(getTime(order.createdAt));
                  const orderDate = order.createdAt ? orderDateObj.toLocaleString('ar-EG', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'غير معروف';

                  // Format Status
                  let statusText = '';
                  let statusColor = '';
                  switch (order.status) {
                    case 'pending': statusText = 'قيد المراجعة'; statusColor = 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'; break;
                    case 'confirmed': statusText = 'مؤكد / جاري التجهيز'; statusColor = 'text-blue-500 bg-blue-500/10 border-blue-500/20'; break;
                    case 'shipped': statusText = 'تم الشحن'; statusColor = 'text-purple-500 bg-purple-500/10 border-purple-500/20'; break;
                    case 'delivered': statusText = 'مكتمل'; statusColor = 'text-success bg-success/10 border-success/20'; break;
                    case 'cancelled': statusText = 'ملغي'; statusColor = 'text-red-500 bg-red-500/10 border-red-500/20'; break;
                    default: statusText = order.status; statusColor = 'text-gray-400 bg-gray-500/10 border-gray-500/20';
                  }

                  // Calculate commission for this specific order
                  let orderCommission = 0;
                  if (order.status !== 'cancelled') {
                    const commVal = affiliate.commissionValue || 0;
                    if (affiliate.commissionType === 'percentage') {
                      orderCommission = order.totalPrice * (commVal / 100);
                    } else {
                      orderCommission = commVal;
                    }
                  }

                  return (
                    <tr key={order.id || Math.random().toString()} className={`hover:bg-white/5 transition-colors ${order.status === 'cancelled' ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-5">
                        <Link href={`/admin/orders/detail?id=${order.id || ''}`} className="font-mono font-bold text-white hover:text-accent-red transition-colors block mb-1">
                          #{(order.id || 'N/A').slice(0, 8)}
                        </Link>
                        <div className="text-xs text-text-muted" dir="ltr">{orderDate}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-white mb-1">{order.customerName}</div>
                        <div className="text-xs text-text-muted flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">location_on</span>
                          {order.city}
                        </div>
                      </td>
                      <td className="px-6 py-5 max-w-[250px]">
                        <ul className="text-xs text-text-muted space-y-1">
                          {order.items.slice(0, 3).map((item, idx) => (
                            <li key={idx} className="truncate">
                              <span className="font-bold text-white">{item.quantity}x</span> {item.name}
                            </li>
                          ))}
                          {order.items.length > 3 && (
                            <li className="text-accent-red font-bold text-[10px] mt-1">+ {order.items.length - 3} منتجات أخرى</li>
                          )}
                        </ul>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="font-bold text-white font-mono">{order.totalPrice.toLocaleString()} ج</div>
                        {(order.discountAmount || 0) > 0 && (
                          <div className="text-[10px] text-accent-red">بعد الخصم</div>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        {order.status === 'cancelled' ? (
                          <span className="text-text-muted text-xs line-through">ملغي</span>
                        ) : (
                          <span className="font-bold text-accent-red font-mono bg-accent-red/10 px-2 py-1 rounded border border-accent-red/20">
                            +{orderCommission.toLocaleString()} ج
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full border text-xs font-bold ${statusColor}`}>
                          {statusText}
                        </span>
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

export default function AffiliateDetailedReport() {
  return (
    <Suspense fallback={
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Spinner className="inline-block w-12 h-12 text-accent-red animate-spin" />
        <span className="text-text-muted font-body text-sm font-bold animate-pulse">جاري تحميل التقرير المفصل...</span>
      </div>
    }>
      <AffiliateReportContent />
    </Suspense>
  );
}
