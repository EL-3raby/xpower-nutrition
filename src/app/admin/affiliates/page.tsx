'use client';

import React, { useState, useEffect } from 'react';
import { getCoupons, updateCoupon } from '@/lib/firebase/admin-actions';
import { getOrders } from '@/lib/firebase/orders';
import { logAdminActivity } from '@/lib/firebase/admin-actions';
import { Coupon, Order } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';

export default function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Coupon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Coupon | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  // New features state
  const [searchQuery, setSearchQuery] = useState('');
  const [showOverpaymentWarning, setShowOverpaymentWarning] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [calculatedPending, setCalculatedPending] = useState(0);

  const loadData = async () => {
    try {
      const fetchedCoupons = await getCoupons();
      const fetchedOrders = await getOrders();
      
      // Filter to only affiliate coupons
      setAffiliates(fetchedCoupons.filter(c => c.isAffiliateCode));
      setOrders(fetchedOrders);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenPayment = (affiliate: Coupon, pendingAmount: number) => {
    setSelectedAffiliate(affiliate);
    setPaymentAmount('');
    setCalculatedPending(pendingAmount);
    setShowOverpaymentWarning(false);
    setIsConfirmingPayment(false);
    setIsPaymentModalOpen(true);
  };

  const validatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAffiliate || paymentAmount === '' || Number(paymentAmount) <= 0) return;

    if (Number(paymentAmount) > calculatedPending && !showOverpaymentWarning) {
      setShowOverpaymentWarning(true);
      return; // Stop here, require second click to confirm
    }

    // Proceed to confirmation
    setIsConfirmingPayment(true);
  };

  const executeRecordPayment = async () => {
    if (!selectedAffiliate || !selectedAffiliate.id || paymentAmount === '' || Number(paymentAmount) <= 0) return;

    setSubmitting(true);
    try {
      const amountToPay = Number(paymentAmount);
      const newPaidAmount = (selectedAffiliate.paidAmount || 0) + amountToPay;
      
      await updateCoupon(selectedAffiliate.id, {
        paidAmount: newPaidAmount,
        lastPaidAt: Timestamp.now()
      });

      // Log the activity
      await logAdminActivity(
        `سجل دفعة بقيمة ${amountToPay} للمسوق ${selectedAffiliate.affiliateName}`, 
        selectedAffiliate.id
      );

      // WhatsApp logic
      if (selectedAffiliate.affiliateContact && /^(010|011|012|015)[0-9]{8}$/.test(selectedAffiliate.affiliateContact)) {
        let phone = selectedAffiliate.affiliateContact;
        if (phone.startsWith('0')) phone = '2' + phone;
        const todayStr = new Intl.DateTimeFormat('ar-EG').format(new Date());
        const msg = `مرحبًا ${selectedAffiliate.affiliateName || 'شريكنا'}، تم تحويل عمولتك بقيمة ${amountToPay} جنيه بتاريخ ${todayStr}.\nإجمالي العمولة المدفوعة لك حتى الآن: ${newPaidAmount} جنيه.`;
        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
      } else {
        alert('تم تسجيل الدفعة بنجاح. ملاحظة: لا يوجد رقم تواصل صالح لفتح الواتساب.');
      }

      setIsPaymentModalOpen(false);
      setSelectedAffiliate(null);
      setIsConfirmingPayment(false);
      setShowOverpaymentWarning(false);
      await loadData();
    } catch (err) {
      console.error('Error recording payment:', err);
      alert('حدث خطأ أثناء تسجيل الدفعة.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAffiliates = affiliates.filter(a => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      (a.affiliateName?.toLowerCase() || '').includes(term) ||
      (a.code.toLowerCase() || '').includes(term)
    );
  });

  // Calculate overall stats for KPI Cards
  let totalOverallSales = 0;
  let totalOverallEarned = 0;
  let totalOverallPaid = 0;

  const processedAffiliates = filteredAffiliates.map(affiliate => {
    const validOrders = orders.filter(o => 
      o.couponCode && o.couponCode.toUpperCase() === affiliate.code.toUpperCase() && 
      o.status !== 'cancelled' && 
      o.paymentStatus !== 'rejected'
    );

    const totalSales = validOrders.reduce((sum, o) => {
      // Use order.totalPrice as the single source of truth (already has discount applied)
      return sum + o.totalPrice;
    }, 0);

    let earnedCommission = 0;
    if (affiliate.commissionType === 'percentage') {
      earnedCommission = totalSales * ((affiliate.commissionValue || 0) / 100);
    } else {
      earnedCommission = validOrders.length * (affiliate.commissionValue || 0);
    }

    const paidAmount = affiliate.paidAmount || 0;
    const pendingAmount = Math.max(0, earnedCommission - paidAmount);

    totalOverallSales += totalSales;
    totalOverallEarned += earnedCommission;
    totalOverallPaid += paidAmount;

    return {
      ...affiliate,
      validOrdersCount: validOrders.length,
      totalSales,
      earnedCommission,
      paidAmount,
      pendingAmount
    };
  });

  const totalOverallPending = Math.max(0, totalOverallEarned - totalOverallPaid);

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Spinner className="inline-block w-12 h-12 text-accent-red animate-spin" />
        <span className="text-text-muted font-body text-sm font-bold animate-pulse">جاري تحميل بيانات المسوقين...</span>
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
      
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-black text-white flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-accent-red">groups</span>
            تقرير المسوقين
          </h1>
          <p className="font-body text-sm text-text-muted mt-2 max-w-2xl leading-relaxed">
            تتبع أداء الأكواد الترويجية وحساب العمولات للمسوقين بشكل تلقائي واحترافي.
          </p>
        </div>
        <div className="w-full md:w-80 relative group">
          <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-muted group-focus-within:text-accent-red transition-colors">search</span>
          <input 
            type="text" 
            placeholder="ابحث باسم المسوق أو الكود..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-primary/50 text-white border border-white/10 rounded-xl px-4 py-3 pr-12 font-body text-sm focus:border-accent-red focus:bg-bg-primary focus:ring-1 focus:ring-accent-red/50 transition-all outline-none"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="إجمالي المسوقين النشطين" 
          value={filteredAffiliates.length} 
          icon="group" 
          colorClass="bg-blue-500/10 text-blue-500 border border-blue-500/20"
        />
        <StatCard 
          title="حجم مبيعات المسوقين" 
          value={`EGP ${totalOverallSales.toLocaleString()}`} 
          icon="monitoring" 
          colorClass="bg-purple-500/10 text-purple-500 border border-purple-500/20"
        />
        <StatCard 
          title="إجمالي العمولات المدفوعة" 
          value={`EGP ${totalOverallPaid.toLocaleString()}`} 
          icon="price_check" 
          colorClass="bg-success/10 text-success border border-success/20"
        />
        <StatCard 
          title="الرصيد المعلق (Pending)" 
          value={`EGP ${totalOverallPending.toLocaleString()}`} 
          icon="pending_actions" 
          colorClass="bg-accent-red/10 text-accent-red border border-accent-red/20"
          highlight={true}
        />
      </div>

      {/* Table Section */}
      <div className="bg-[#0a0a0a] border border-white/5 md:rounded-3xl overflow-hidden shadow-lg mt-6">
        {processedAffiliates.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-4xl text-text-muted/50">search_off</span>
            </div>
            <p className="text-white font-bold text-lg">لا يوجد مسوقين مطابقين للبحث</p>
            <p className="text-text-muted font-body text-sm text-center px-4">لم يتم العثور على أي بيانات حالياً. يمكنك إضافة أكواد تسويق جديدة من قسم الكوبونات.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-sm text-right border-collapse min-w-[900px]">
            <thead className="bg-white/5 text-text-muted font-body border-b border-white/10">
              <tr>
                <th className="px-6 py-5 font-bold">المسوّق / وسيلة التواصل</th>
                <th className="px-6 py-5 font-bold">كود الخصم</th>
                <th className="px-6 py-5 font-bold">العمولة المتفق عليها</th>
                <th className="px-6 py-5 font-bold text-center">عدد الطلبات</th>
                <th className="px-6 py-5 font-bold text-center">حجم المبيعات</th>
                <th className="px-6 py-5 font-bold text-center">العمولة المستحقة</th>
                <th className="px-6 py-5 font-bold text-success text-center">ما تم دفعه</th>
                <th className="px-6 py-5 font-bold text-accent-red text-center">المتبقي (رصيد)</th>
                <th className="px-6 py-5 font-bold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {processedAffiliates.map(affiliate => (
                <tr key={affiliate.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="font-bold text-white text-base mb-1 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/5 shrink-0">
                          <span className="material-symbols-outlined text-sm text-text-muted">person</span>
                        </div>
                        {affiliate.affiliateName}
                      </div>
                      {affiliate.affiliateContact && (
                        <div className="text-xs text-text-muted flex items-center justify-start gap-1.5 mr-10" dir="ltr">
                          <span className="material-symbols-outlined text-[14px]">call</span>
                          <span className="font-mono">{affiliate.affiliateContact}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-block bg-bg-primary px-3 py-1.5 rounded-lg border border-white/10 font-mono text-sm tracking-wider text-white shadow-inner">{affiliate.code}</span>
                    </td>
                    <td className="px-6 py-5 text-sm text-text-muted font-body">
                      {affiliate.commissionType === 'percentage' 
                        ? <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-blue-400">percent</span> <span className="font-bold text-white">{affiliate.commissionValue}%</span> من الطلب</span>
                        : <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-blue-400">payments</span> <span className="font-bold text-white font-mono">{affiliate.commissionValue}</span> ج / طلب</span>}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-white font-bold">{affiliate.validOrdersCount}</span>
                    </td>
                    <td className="px-6 py-5 text-center text-text-muted font-mono">{affiliate.totalSales.toLocaleString()}</td>
                    <td className="px-6 py-5 text-center font-bold text-white font-mono">{affiliate.earnedCommission.toLocaleString()}</td>
                    <td className="px-6 py-5 text-center font-bold text-success font-mono bg-success/5">{affiliate.paidAmount.toLocaleString()}</td>
                    <td className="px-6 py-5 text-center font-bold text-accent-red font-mono text-lg bg-accent-red/5">{affiliate.pendingAmount.toLocaleString()}</td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link 
                          href={`/admin/affiliates/detail?id=${affiliate.id}`}
                          className="bg-bg-primary hover:bg-bg-elevated text-white border border-white/10 hover:border-white/30 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                        >
                          <span className="material-symbols-outlined text-[16px]">analytics</span>
                          تقرير مفصل
                        </Link>
                        <button 
                          onClick={() => handleOpenPayment(affiliate, affiliate.pendingAmount)}
                          className="bg-white/5 hover:bg-accent-red text-white border border-white/10 hover:border-accent-red px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(227,30,36,0.3)]"
                        >
                          <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                          تسجيل دفعة
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
            {processedAffiliates.map(affiliate => (
              <div key={affiliate.id} className="p-4 flex flex-col gap-4">
                
                {/* Header: Name, Code & Phone */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/5 shrink-0">
                      <span className="material-symbols-outlined text-text-muted">person</span>
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-bold text-white text-base">{affiliate.affiliateName}</h3>
                      {affiliate.affiliateContact && (
                        <span className="text-[10px] text-text-muted flex items-center gap-1 font-mono mt-0.5" dir="ltr">
                          <span className="material-symbols-outlined text-[12px]">call</span>
                          {affiliate.affiliateContact}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="bg-white/5 border border-white/10 px-2 py-1 rounded-md text-xs font-mono font-bold text-white tracking-widest">{affiliate.code}</span>
                </div>

                {/* Commission Info & Stats */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="text-xs text-text-muted mb-3 flex items-center gap-1.5 justify-center border-b border-white/5 pb-3">
                    <span className="material-symbols-outlined text-[14px] text-blue-400">
                      {affiliate.commissionType === 'percentage' ? 'percent' : 'payments'}
                    </span>
                    العمولة: <strong className="text-white">
                      {affiliate.commissionValue} {affiliate.commissionType === 'percentage' ? '%' : 'EGP'}
                    </strong>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="flex flex-col bg-[#050505] p-2 rounded-lg">
                      <span className="text-[10px] text-text-muted mb-1">الطلبات</span>
                      <span className="font-bold text-white">{affiliate.validOrdersCount}</span>
                    </div>
                    <div className="flex flex-col bg-[#050505] p-2 rounded-lg">
                      <span className="text-[10px] text-text-muted mb-1">المبيعات</span>
                      <span className="font-bold text-white font-mono">{affiliate.totalSales.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="flex flex-col bg-bg-elevated p-2 rounded-lg border border-white/5">
                    <span className="text-[9px] text-text-muted mb-1">المستحقة</span>
                    <span className="font-bold text-white text-xs">{affiliate.earnedCommission.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col bg-success/5 p-2 rounded-lg border border-success/10">
                    <span className="text-[9px] text-success mb-1">المدفوعة</span>
                    <span className="font-bold text-success text-xs">{affiliate.paidAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col bg-accent-red/5 p-2 rounded-lg border border-accent-red/10">
                    <span className="text-[9px] text-accent-red mb-1">المتبقية</span>
                    <span className="font-bold text-accent-red text-xs">{affiliate.pendingAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-1">
                  <Link 
                    href={`/admin/affiliates/detail?id=${affiliate.id}`}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">analytics</span>
                    تقرير مفصل
                  </Link>
                  <button 
                    onClick={() => handleOpenPayment(affiliate, affiliate.pendingAmount)}
                    className="flex-1 bg-accent-red/10 text-accent-red hover:bg-accent-red hover:text-white flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                    تسجيل دفعة
                  </button>
                </div>

              </div>
            ))}
          </div>
        </>
        )}
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedAffiliate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-bg-elevated border border-white/10 w-full max-w-md p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative" dir="rtl">
            <button 
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute top-4 left-4 text-text-muted hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1 rounded-full"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-5">
              <div className="w-14 h-14 bg-accent-red/10 rounded-2xl flex items-center justify-center border border-accent-red/20 shadow-inner">
                <span className="material-symbols-outlined text-accent-red text-3xl">payments</span>
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-white">تسجيل دفعة جديدة</h3>
                <p className="text-sm text-text-muted mt-1 flex items-center gap-1">
                  للمسوق: <strong className="text-white text-base">{selectedAffiliate.affiliateName}</strong>
                </p>
              </div>
            </div>

            {isConfirmingPayment ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-accent-red/10 border border-accent-red/20 rounded-2xl p-6 text-center">
                  <span className="material-symbols-outlined text-accent-red text-5xl mb-3 drop-shadow-lg">help_center</span>
                  <p className="text-white text-xl font-black mb-2">تأكيد تحويل <span className="text-accent-red font-mono bg-accent-red/10 px-2 rounded mx-1">{paymentAmount}</span> EGP؟</p>
                  <p className="text-sm text-text-muted leading-relaxed">بعد التأكيد، سيتم تحديث الرصيد وتسجيل العملية، مع فتح الواتساب تلقائياً لإرسال رسالة التنبيه للمسوّق.</p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsConfirmingPayment(false)}
                    className="flex-1 py-3.5 text-sm text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all font-bold"
                    disabled={submitting}
                  >
                    تعديل المبلغ
                  </button>
                  <button 
                    onClick={executeRecordPayment}
                    disabled={submitting}
                    className="flex-1 bg-accent-red text-white py-3.5 rounded-xl text-sm font-bold hover:bg-accent-red/90 hover:shadow-[0_0_20px_rgba(227,30,36,0.4)] transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? <Spinner className="w-5 h-5" /> : 'تأكيد وحفظ'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={validatePayment} className="space-y-6">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end mb-1">
                    <label className="font-body text-xs text-text-muted font-bold uppercase tracking-widest">المبلغ المدفوع (EGP)</label>
                    <div className="flex items-center gap-1.5 text-[11px] text-accent-red bg-accent-red/10 px-2.5 py-1 rounded-md border border-accent-red/20 font-bold tracking-wide">
                      <span className="material-symbols-outlined text-[14px]">account_balance</span>
                      المستحق: {calculatedPending.toLocaleString()} EGP
                    </div>
                  </div>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-text-muted group-focus-within:text-white transition-colors">EGP</span>
                    <input 
                      type="number" 
                      value={paymentAmount}
                      onChange={(e) => {
                        setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value));
                        setShowOverpaymentWarning(false);
                      }}
                      min="1"
                      required
                      placeholder="0"
                      className="w-full bg-bg-primary/50 text-white border border-white/10 rounded-xl px-4 py-4 pl-14 font-black text-2xl font-mono focus:border-accent-red focus:bg-bg-primary focus:ring-1 focus:ring-accent-red/50 transition-all outline-none shadow-inner"
                      dir="ltr"
                    />
                  </div>
                  
                  {showOverpaymentWarning && (
                    <div className="mt-2 bg-warning/10 border border-warning/20 rounded-xl p-4 text-xs font-bold text-warning flex items-start gap-3 animate-fadeIn">
                      <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">warning</span>
                      </div>
                      <p className="leading-relaxed pt-1">المبلغ المدخل أكبر من الرصيد المستحق فعلياً ({calculatedPending} EGP). اضغط <strong className="bg-warning/20 px-1 rounded mx-0.5">متابعة الدفع</strong> مرة أخرى إذا كنت متعمداً دفع مبالغ إضافية مقدماً.</p>
                    </div>
                  )}
                </div>

                <div className="pt-3">
                  <button 
                    type="submit"
                    className={`w-full py-4 rounded-xl text-base font-black transition-all flex items-center justify-center gap-2 ${
                      showOverpaymentWarning 
                        ? 'bg-warning text-black hover:bg-warning/90 hover:shadow-[0_0_20px_rgba(251,191,36,0.3)]' 
                        : 'bg-white text-black hover:bg-gray-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                    }`}
                  >
                    <span>{showOverpaymentWarning ? 'تخطي التحذير واستمرار' : 'متابعة الدفع'}</span>
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
