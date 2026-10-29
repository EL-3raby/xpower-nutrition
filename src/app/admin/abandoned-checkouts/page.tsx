'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getAbandonedCheckouts,
  markAbandonedCheckoutAsContacted,
  deleteOldAbandonedCheckouts,
  cleanupOldConvertedCheckouts,
} from '@/lib/firebase/abandoned-checkouts';
import { AbandonedCheckout } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';
import { Timestamp } from 'firebase/firestore';

type FilterType = 'all' | 'uncontacted';

export default function AdminAbandonedCheckoutsPage() {
  const [checkouts, setCheckouts] = useState<AbandonedCheckout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('uncontacted');
  const [isDeletingOld, setIsDeletingOld] = useState(false);
  const [deletedCount, setDeletedCount] = useState<number | null>(null);

  const now = new Date();
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAbandonedCheckouts();
      setCheckouts(data);
    } catch (err) {
      console.error('Failed to load abandoned checkouts:', err);
    } finally {
      setLoading(false);
    }

    // Lazy background cleanup of converted records > 30 days old (non-blocking)
    cleanupOldConvertedCheckouts(30).catch(err => {
      console.error('Background cleanup of converted checkouts failed:', err);
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getLastUpdatedDate = (d: any): Date => {
    if (!d) return new Date(0);
    if (d instanceof Date) return d;
    if (typeof d.toMillis === 'function') return new Date(d.toMillis());
    if (d.seconds) return new Date(d.seconds * 1000);
    return new Date(d);
  };

  const formatTimeAgo = (d: any) => {
    const date = getLastUpdatedDate(d);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  };

  const isOld = (d: any) => {
    const date = getLastUpdatedDate(d);
    return now.getTime() - date.getTime() > FOURTEEN_DAYS_MS;
  };

  const handleContact = async (phone: string) => {
    try {
      await markAbandonedCheckoutAsContacted(phone);
      setCheckouts(prev => prev.map(c => c.phone === phone ? { ...c, isContacted: true } : c));
    } catch (err) {
      console.error('Failed to mark as contacted:', err);
    }
  };

  const buildWhatsAppUrl = (checkout: AbandonedCheckout) => {
    let phone = checkout.phone;
    if (phone.startsWith('0')) phone = '2' + phone;
    const name = checkout.customerName || 'عزيزي العميل';
    const msg = `مرحبًا ${name}، لاحظنا أنك لم تكمل طلبك في Xpower Nutrition، هل واجهتك أي مشكلة؟ نحن هنا لمساعدتك 💪`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const handleDeleteOld = async () => {
    if (!confirm('هل أنت متأكد من حذف جميع السجلات الأقدم من 14 يوم؟')) return;
    setIsDeletingOld(true);
    try {
      const count = await deleteOldAbandonedCheckouts(14);
      setDeletedCount(count);
      await loadData();
    } catch (err) {
      console.error('Failed to delete old checkouts:', err);
    } finally {
      setIsDeletingOld(false);
    }
  };

  const recent = checkouts.filter(c => !isOld(c.lastUpdatedAt));
  const old = checkouts.filter(c => isOld(c.lastUpdatedAt));

  const filtered = filter === 'uncontacted'
    ? recent.filter(c => !c.isContacted)
    : recent;

  const uncontactedCount = recent.filter(c => !c.isContacted).length;

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Spinner className="inline-block w-12 h-12 text-accent-red animate-spin" />
        <span className="text-text-muted font-body text-sm font-bold animate-pulse">جاري تحميل سجلات الـ Abandoned Checkout...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-black text-white flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-accent-red">shopping_cart_off</span>
            سلات متروكة
          </h1>
          <p className="font-body text-sm text-text-muted mt-2 max-w-2xl leading-relaxed">
            عملاء بدأوا يملأوا بيانات الشراء ولم يكملوا. تواصل معهم عبر واتساب لإتمام الطلب.
          </p>
        </div>

        {/* KPIs */}
        <div className="flex flex-wrap gap-3">
          <div className="bg-accent-red/10 border border-accent-red/20 px-4 py-3 rounded-2xl text-center min-w-[100px]">
            <p className="text-accent-red font-display text-2xl font-black">{uncontactedCount}</p>
            <p className="text-text-muted text-xs font-body">لم يُتواصل معه</p>
          </div>
          <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl text-center min-w-[100px]">
            <p className="text-white font-display text-2xl font-black">{recent.length}</p>
            <p className="text-text-muted text-xs font-body">إجمالي (14 يوم)</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('uncontacted')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${filter === 'uncontacted' ? 'bg-accent-red text-white shadow-[0_0_15px_rgba(227,30,36,0.3)]' : 'bg-white/5 text-text-muted hover:bg-white/10 border border-white/10'}`}
          >
            لم يتم التواصل ({uncontactedCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${filter === 'all' ? 'bg-white text-black' : 'bg-white/5 text-text-muted hover:bg-white/10 border border-white/10'}`}
          >
            الكل ({recent.length})
          </button>
        </div>
        <button
          onClick={handleDeleteOld}
          disabled={isDeletingOld || old.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-accent-red/10 text-text-muted hover:text-accent-red border border-white/10 hover:border-accent-red/30 text-xs font-bold transition-all disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
          {isDeletingOld ? 'جاري الحذف...' : `حذف القديمة (+14 يوم) (${old.length})`}
        </button>
      </div>

      {deletedCount !== null && (
        <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-3 text-success text-sm font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          تم حذف {deletedCount} سجل قديم بنجاح.
        </div>
      )}

      {/* Table */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden shadow-lg">
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-success">task_alt</span>
            </div>
            <p className="text-white font-bold text-lg">ممتاز! لا توجد سلات متروكة في انتظار التواصل.</p>
            <p className="text-text-muted text-sm font-body">سيظهر هنا أي عميل يبدأ الشراء ولا يكمله.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right border-collapse">
              <thead className="bg-white/5 text-text-muted font-body border-b border-white/10">
                <tr>
                  <th className="px-6 py-5 font-bold">العميل / الهاتف</th>
                  <th className="px-6 py-5 font-bold">المنتجات</th>
                  <th className="px-6 py-5 font-bold text-center">الإجمالي</th>
                  <th className="px-6 py-5 font-bold text-center">منذ</th>
                  <th className="px-6 py-5 font-bold text-center">الحالة</th>
                  <th className="px-6 py-5 font-bold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(checkout => (
                  <tr
                    key={checkout.phone}
                    className={`hover:bg-white/5 transition-colors ${checkout.isContacted ? 'opacity-60' : ''}`}
                  >
                    <td className="px-6 py-5">
                      <div className="font-bold text-white mb-1">
                        {checkout.customerName || <span className="text-text-muted italic text-xs">لم يُدخل اسمه</span>}
                      </div>
                      <div className="font-mono text-sm text-text-muted" dir="ltr">{checkout.phone}</div>
                    </td>
                    <td className="px-6 py-5 max-w-[250px]">
                      <ul className="space-y-1">
                        {checkout.items.slice(0, 3).map((item, idx) => (
                          <li key={idx} className="text-xs text-text-muted truncate">
                            <span className="font-bold text-white">{item.quantity}x</span> {item.name}
                          </li>
                        ))}
                        {checkout.items.length > 3 && (
                          <li className="text-accent-red text-[10px] font-bold">+ {checkout.items.length - 3} منتجات أخرى</li>
                        )}
                      </ul>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="font-bold text-white font-mono">{checkout.totalPrice.toLocaleString()} ج</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-text-muted text-xs">{formatTimeAgo(checkout.lastUpdatedAt)}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {checkout.isContacted ? (
                        <span className="inline-flex items-center gap-1 bg-success/10 border border-success/20 text-success text-xs font-bold px-3 py-1 rounded-full">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          تم التواصل
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                          <span className="material-symbols-outlined text-[14px]">pending</span>
                          في الانتظار
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        {/* WhatsApp — opens chat only, does NOT auto-mark as contacted */}
                        <a
                          href={buildWhatsAppUrl(checkout)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/20 hover:border-[#25D366] px-4 py-2 rounded-xl text-xs font-bold transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">chat</span>
                          واتساب
                        </a>
                        {/* Mark as contacted — independent manual action */}
                        {!checkout.isContacted ? (
                          <button
                            onClick={() => handleContact(checkout.phone)}
                            className="flex items-center gap-1.5 bg-white/5 hover:bg-success/10 text-text-muted hover:text-success border border-white/10 hover:border-success/30 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                          >
                            <span className="material-symbols-outlined text-[16px]">done</span>
                            تم التواصل
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-success text-xs font-bold opacity-60">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            تواصلنا
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Old Section */}
      {old.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-white/5"></div>
            <span className="text-text-muted text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">history</span>
              سجلات قديمة (أكثر من 14 يوم) — {old.length} سجل
            </span>
            <div className="h-px flex-1 bg-white/5"></div>
          </div>
          <div className="bg-[#0a0a0a]/60 border border-white/5 rounded-2xl overflow-hidden opacity-50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <tbody className="divide-y divide-white/5">
                  {old.map(checkout => (
                    <tr key={checkout.phone} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-white">{checkout.customerName || '—'}</span>
                        <div className="font-mono text-xs text-text-muted" dir="ltr">{checkout.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-text-muted text-xs">{checkout.items.length} منتج | {checkout.totalPrice.toLocaleString()} ج</span>
                      </td>
                      <td className="px-6 py-4 text-text-muted text-xs">{formatTimeAgo(checkout.lastUpdatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
