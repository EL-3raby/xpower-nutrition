'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import { Order } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get('id') || '';

  const [orderId, setOrderId] = useState(initialOrderId);
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [orderData, setOrderData] = useState<Order | null>(null);

  const cleanPhone = (p: string) => p.replace(/\D/g, '');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !phone.trim()) {
      setErrorMsg('يرجى كتابة رقم الطلب ورقم الموبايل.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setOrderData(null);

    try {
      const cleanId = orderId.trim().replace(/^#/, '');
      const docRef = doc(db, 'orders', cleanId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setErrorMsg('لم نتمكن من العثور على هذا الطلب. يرجى التأكد من رقم الطلب.');
        setLoading(false);
        return;
      }

      const data = { id: docSnap.id, ...docSnap.data() } as Order;

      const inputPhoneClean = cleanPhone(phone);
      const orderPhoneClean = cleanPhone(data.phone);

      if (inputPhoneClean !== orderPhoneClean) {
        setErrorMsg('رقم الموبايل غير مطابق لرقم الهاتف المسجل في هذا الطلب.');
        setLoading(false);
        return;
      }

      setOrderData(data);
    } catch (err: any) {
      console.error('Error tracking order:', err);
      setErrorMsg('حدث خطأ أثناء البحث عن الطلب. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return { text: 'قيد المراجعة والانتظار', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', step: 1 };
      case 'confirmed':
        return { text: 'تم تأكيد الطلب وجاري التجهيز', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', step: 2 };
      case 'shipped':
        return { text: 'خرج للشحن مع المندوب', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', step: 3 };
      case 'delivered':
        return { text: 'تم التسليم بنجاح', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', step: 4 };
      case 'cancelled':
        return { text: 'تم إلغاء الطلب', color: 'bg-red-500/10 text-red-400 border-red-500/20', step: 0 };
      default:
        return { text: status, color: 'bg-white/10 text-white border-white/20', step: 1 };
    }
  };

  const currentStatusInfo = orderData ? getStatusBadge(orderData.status) : null;

  return (
    <div className="bg-[#050505] text-text-primary min-h-screen py-10 md:py-16 px-4 sm:px-6 relative overflow-hidden" dir="rtl">
      {/* Ambient Lighting */}
      <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-accent-red/5 via-transparent to-transparent pointer-events-none"></div>

      <div className="max-w-2xl mx-auto relative z-10 space-y-6 sm:space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-accent-red bg-accent-red/10 border border-accent-red/20 px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(227,30,36,0.15)]">
            <span className="material-symbols-outlined text-sm">local_shipping</span>
            <span>تتبع الشحنة المباشر</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-black italic uppercase tracking-wider text-white">
            تتبع حالة طلبك
          </h1>
          <p className="text-text-muted font-body text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            أدخل كود الطلب ورقم الموبايل المسجل لمتابعة مرحلة تحضير وشحن مكملاتك لحظة بلحظة.
          </p>
        </div>

        {/* Track Form Box */}
        <div className="bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 p-5 sm:p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden text-right">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent-red to-transparent opacity-40 rounded-t-3xl" />

          <form onSubmit={handleTrack} className="space-y-4 sm:space-y-5">
            <div>
              <label className="text-xs font-bold text-text-muted mb-2 block">رقم / كود الطلب *</label>
              <input
                id="orderId"
                name="orderId"
                type="text"
                placeholder="مثال: #a1b2c3d4"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full bg-[#050505] border border-white/10 text-white text-sm px-4 py-3.5 rounded-xl focus:border-accent-red focus:ring-2 focus:ring-accent-red/20 focus:outline-none transition-all font-mono"
              />
            </div>

            <div>
              <label htmlFor="phone" className="text-xs font-bold text-text-muted mb-2 block">رقم الموبايل المسجل بالطلب *</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="01012345678"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#050505] border border-white/10 text-white text-sm px-4 py-3.5 text-right rounded-xl focus:border-accent-red focus:ring-2 focus:ring-accent-red/20 focus:outline-none transition-all"
              />
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-accent-red to-red-600 hover:from-red-600 hover:to-accent-red text-white font-product-title font-bold text-base rounded-xl shadow-[0_0_25px_rgba(227,30,36,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              {loading ? (
                <>
                  <Spinner className="w-5 h-5 text-white animate-spin" />
                  <span>جاري البحث عن شحنتك...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">search</span>
                  <span>تتبع الشحنة الآن</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Order Result Card */}
        {orderData && currentStatusInfo && (
          <div className="bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 p-5 sm:p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-6 text-right animate-in fade-in duration-300 relative overflow-hidden">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="text-[11px] text-text-muted block">كود الشحنة:</span>
                <span className="font-mono text-base sm:text-lg font-black text-white select-all">#{orderData.id?.slice(0, 10)}</span>
              </div>
              <span className={`px-3.5 py-1.5 rounded-full border text-xs font-bold ${currentStatusInfo.color}`}>
                {currentStatusInfo.text}
              </span>
            </div>

            {/* Visual Timeline Stepper */}
            {orderData.status !== 'cancelled' ? (
              <div className="py-4 border-b border-white/10">
                <div className="text-xs font-bold text-text-muted mb-4 block">مراحل توصيل الشحنة:</div>
                <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center">
                  
                  {/* Step 1 */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border text-sm transition-all ${
                      currentStatusInfo.step >= 1 ? 'bg-accent-red text-white border-accent-red shadow-[0_0_15px_rgba(227,30,36,0.5)]' : 'bg-white/5 text-text-muted border-white/10'
                    }`}>
                      <span className="material-symbols-outlined text-lg">inventory_2</span>
                    </div>
                    <span className={`text-[10px] sm:text-xs font-bold ${currentStatusInfo.step >= 1 ? 'text-accent-red' : 'text-text-muted'}`}>
                      1. التجهيز
                    </span>
                  </div>

                  {/* Step 2 */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border text-sm transition-all ${
                      currentStatusInfo.step >= 2 ? 'bg-accent-red text-white border-accent-red shadow-[0_0_15px_rgba(227,30,36,0.5)]' : 'bg-white/5 text-text-muted border-white/10'
                    }`}>
                      <span className="material-symbols-outlined text-lg">verified</span>
                    </div>
                    <span className={`text-[10px] sm:text-xs font-bold ${currentStatusInfo.step >= 2 ? 'text-accent-red' : 'text-text-muted'}`}>
                      2. التفكير والـتأكيد
                    </span>
                  </div>

                  {/* Step 3 */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border text-sm transition-all ${
                      currentStatusInfo.step >= 3 ? 'bg-accent-red text-white border-accent-red shadow-[0_0_15px_rgba(227,30,36,0.5)]' : 'bg-white/5 text-text-muted border-white/10'
                    }`}>
                      <span className="material-symbols-outlined text-lg">local_shipping</span>
                    </div>
                    <span className={`text-[10px] sm:text-xs font-bold ${currentStatusInfo.step >= 3 ? 'text-accent-red' : 'text-text-muted'}`}>
                      3. مع المندوب
                    </span>
                  </div>

                  {/* Step 4 */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border text-sm transition-all ${
                      currentStatusInfo.step >= 4 ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-white/5 text-text-muted border-white/10'
                    }`}>
                      <span className="material-symbols-outlined text-lg">task_alt</span>
                    </div>
                    <span className={`text-[10px] sm:text-xs font-bold ${currentStatusInfo.step >= 4 ? 'text-emerald-400' : 'text-text-muted'}`}>
                      4. التسليم
                    </span>
                  </div>

                </div>
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center text-xs text-red-400 font-bold">
                تم إلغاء هذا الطلب. يسعدنا تواصلك معنا لإعادة تقديم الطلب بأي وقت!
              </div>
            )}

            {/* Order Items & Breakdown */}
            <div className="space-y-3.5">
              <h3 className="font-product-title font-bold text-white text-sm">محتويات الطلب:</h3>
              <div className="space-y-2">
                {orderData.items.map((item, idx) => (
                  <div key={`track-item-${idx}`} className="flex justify-between items-center text-xs text-text-muted bg-[#050505] p-3 rounded-xl border border-white/5">
                    <div className="font-bold text-white">
                      <span>{item.name}</span>
                      {item.flavor && <span className="text-[10px] text-text-muted block">الطعم: {item.flavor}</span>}
                    </div>
                    <div className="text-white font-mono font-bold" dir="ltr">
                      {item.quantity} × {item.price} EGP
                    </div>
                  </div>
                ))}
              </div>

              {/* Total & Shipping info */}
              <div className="bg-[#050505] p-4 rounded-xl border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between text-text-muted">
                  <span>اسم المستلم:</span>
                  <span className="text-white font-bold">{orderData.customerName}</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>عنوان الشحن:</span>
                  <span className="text-white font-bold">{orderData.address}، {orderData.city}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/10 text-white font-bold">
                  <span className="text-sm">المبلغ الإجمالي المطلق:</span>
                  <span className="text-accent-red font-mono text-lg font-black" dir="ltr">{orderData.totalPrice} EGP</span>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default function TrackOrderClientPage() {
  return (
    <Suspense fallback={<div className="bg-[#050505] min-h-screen flex items-center justify-center"><Spinner className="w-10 h-10 text-accent-red" /></div>}>
      <TrackOrderContent />
    </Suspense>
  );
}
