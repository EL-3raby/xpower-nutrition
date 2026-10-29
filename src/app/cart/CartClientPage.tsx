'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/hooks/useCart';
import { db } from '@/lib/firebase/client';
import { getEgyptTime, toEgyptTime } from '@/lib/date-utils';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Coupon } from '@/lib/types';
import { getOptimizedImageUrl } from '@/lib/utils/image';

export default function CartClientPage() {
  const { cart, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const subtotal = getCartTotal();
  const shippingCost = subtotal >= 1000 || subtotal === 0 ? 0 : 100; // default shipping cost 100 EGP

  // Calculate discount
  const discountAmount = React.useMemo(() => {
    if (!appliedCoupon) return 0;
    
    if (appliedCoupon.discountType === 'percentage') {
      return (subtotal * appliedCoupon.discountValue) / 100;
    } else {
      return Math.min(subtotal, appliedCoupon.discountValue);
    }
  }, [subtotal, appliedCoupon]);

  const finalTotal = Math.max(0, subtotal - discountAmount + shippingCost);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setCheckingCoupon(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      const q = query(
        collection(db, 'coupons'),
        where('code', '==', couponCode.trim().toUpperCase()),
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setCouponError('كوبون الخصم غير صحيح أو منتهي الصلاحية');
        setAppliedCoupon(null);
        setCheckingCoupon(false);
        return;
      }

      const couponDoc = querySnapshot.docs[0];
      const couponData = { id: couponDoc.id, ...couponDoc.data() } as Coupon;

      // Validate expiration date
      if (couponData.expiryDate) {
        const now = getEgyptTime();
        const expiresAtDate = toEgyptTime(
          couponData.expiryDate instanceof Timestamp
            ? couponData.expiryDate.toDate()
            : new Date(couponData.expiryDate)
        );

        if (expiresAtDate < now) {
          setCouponError('هذا الكوبون انتهت فترة صلاحيته');
          setAppliedCoupon(null);
          setCheckingCoupon(false);
          return;
        }
      }

      // Validate min order amount
      if (couponData.minOrderValue && subtotal < couponData.minOrderValue) {
        setCouponError(`الحد الأدنى لاستخدام هذا الكوبون هو ${couponData.minOrderValue} ج.م`);
        setAppliedCoupon(null);
        setCheckingCoupon(false);
        return;
      }

      setAppliedCoupon(couponData);
      setCouponSuccess(`تم تطبيق الخصم بنجاح! (${couponData.discountType === 'percentage' ? `${couponData.discountValue}%` : `${couponData.discountValue} ج.م`})`);
    } catch (error) {
      console.error('Error applying coupon:', error);
      setCouponError('حدث خطأ أثناء التحقق من الكوبون');
    } finally {
      setCheckingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponSuccess('');
    setCouponError('');
  };

  if (cart.length === 0) {
    return (
      <div className="bg-[#050505] text-text-primary min-h-screen py-16 px-6 flex flex-col items-center justify-center text-center relative overflow-hidden" dir="rtl">
        {/* Background Ambient Lighting */}
        <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-accent-red/5 to-transparent pointer-events-none"></div>

        <div className="bg-black/60 border border-white/5 p-12 max-w-lg shadow-2xl relative">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-red to-transparent opacity-50"></div>
          
          <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6 text-accent-red shadow-inner">
            <span className="material-symbols-outlined text-5xl">shopping_cart</span>
          </div>

          <h1 className="font-display text-3xl font-black italic uppercase tracking-wider text-white mb-3">
            سلة التسوق فارغة
          </h1>
          <p className="text-text-muted font-body text-sm mb-8 leading-relaxed">
            لم تقم بإضافة أي مكملات غذائية إلى سلتك بعد. استكشف منتجاتنا الأصلية وابدأ رحلة الضخامة والقوة الآن!
          </p>

          <Link
            href="/products"
            className="inline-flex items-center justify-center px-8 py-4 bg-accent-red text-white font-product-title font-bold text-sm tracking-wide rounded-none hover:bg-accent-red-hover transition-colors gap-2 shadow-[0_0_20px_rgba(227,30,36,0.3)] hover:scale-105 active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">store</span>
            تصفح جميع المنتجات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#050505] text-text-primary min-h-screen py-8 md:py-12 px-4 md:px-8 pb-32 lg:pb-12 relative overflow-hidden" dir="rtl">
      {/* Background Ambient Lighting */}
      <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-accent-red/5 to-transparent pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Page Header */}
        <div className="mb-8 md:mb-10 text-right">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-accent-red bg-accent-red/10 border border-accent-red/20 px-3 py-1 mb-3 rounded-full">
            <span className="material-symbols-outlined text-sm">shopping_cart</span>
            سلة المشتريات
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-black italic uppercase tracking-wider text-white mb-2">
            سلة التسوق ({cart.reduce((acc, item) => acc + item.quantity, 0)})
          </h1>
          <p className="text-text-muted font-body text-xs md:text-sm">
            راجع المنتجات المختارة وقم بتأكيد الكميات قبل الانتقال لصفحة إتمام الطلب.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Cart Items List (7 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            {cart.map((item, idx) => (
              <div 
                key={`${item.productId}-${item.flavor || 'default'}-${idx}`}
                className="bg-[#0a0a0a] border border-white/5 p-4 md:p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-5 hover:border-white/10 hover:shadow-xl transition-all"
              >
                {/* Product Image & Info */}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-24 h-24 bg-white/5 border border-white/10 p-2 rounded-2xl shrink-0 flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-accent-red/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <img 
                      src={getOptimizedImageUrl(item.image, { width: 150, height: 150 })} 
                      alt={item.name} 
                      className="w-full h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>

                  <div className="text-right flex-grow">
                    <div className="font-product-title font-bold text-white text-base md:text-lg block mb-1">
                      {item.name}
                    </div>

                    {item.flavor && (
                      <div className="text-[11px] text-text-muted mb-3 flex items-center gap-1.5">
                        <span>الطعم:</span>
                        <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded-md border border-white/5">{item.flavor}</span>
                      </div>
                    )}

                    <div className="font-product-title text-accent-red font-black text-sm md:text-base">
                      {item.price} EGP
                    </div>
                  </div>
                </div>

                {/* Quantity Controls & Total */}
                <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-6 w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
                  
                  {/* Total for Item (Mobile only left side) */}
                  <div className="sm:hidden text-left font-product-title font-bold text-white text-base min-w-[80px]" dir="ltr">
                    {(item.price * item.quantity).toFixed(2)} EGP
                  </div>

                  {/* Quantity Counter */}
                  <div className="flex items-center border border-white/10 bg-black rounded-xl overflow-hidden shadow-inner">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1, item.flavor)}
                      className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">remove</span>
                    </button>
                    <span className="w-8 text-center font-bold text-white text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1, item.flavor)}
                      className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  </div>

                  {/* Total for Item (Desktop) */}
                  <div className="hidden sm:block text-left font-product-title font-bold text-white text-lg min-w-[100px]" dir="ltr">
                    {(item.price * item.quantity).toFixed(2)} EGP
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.productId, item.flavor)}
                    className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                    title="حذف من السلة"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Clear Cart & Continue Shopping */}
            <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-4">
              <button
                onClick={clearCart}
                className="w-full sm:w-auto py-3 px-5 rounded-xl border border-white/10 text-xs font-bold text-text-muted hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">remove_shopping_cart</span>
                محي كل السلة
              </button>

              <Link
                href="/products"
                className="w-full sm:w-auto py-3 px-5 rounded-xl bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2 font-bold"
              >
                متابعة التسوق
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </Link>
            </div>
          </div>

          {/* Order Summary Sidebar (5 Cols) */}
          <div className="lg:col-span-4">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 text-right lg:sticky lg:top-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-accent-red via-transparent to-transparent"></div>
              
              <h2 className="font-product-title font-bold text-xl text-white flex items-center gap-2 pb-2">
                <span className="material-symbols-outlined text-accent-red">receipt_long</span>
                ملخص الطلب
              </h2>

              {/* Coupon Code Section */}
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                <form onSubmit={handleApplyCoupon} className="space-y-3">
                  <label className="text-xs font-bold text-text-muted block">هل لديك كود خصم؟</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ادخل الكود هنا"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={!!appliedCoupon || checkingCoupon}
                      className="bg-black border border-white/10 text-white text-sm px-4 py-3 rounded-xl flex-grow focus:border-accent-red focus:outline-none uppercase font-mono transition-colors"
                    />
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="bg-red-500/20 text-red-500 border border-red-500/30 px-4 py-3 rounded-xl text-xs font-bold hover:bg-red-500/30 transition-colors shrink-0"
                      >
                        إلغاء
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={checkingCoupon || !couponCode.trim()}
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/5 px-5 py-3 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shrink-0"
                      >
                        {checkingCoupon ? 'جاري...' : 'تطبيق'}
                      </button>
                    )}
                  </div>
                </form>

                {couponError && (
                  <div className="text-red-500 text-xs mt-3 flex items-center gap-1.5 bg-red-500/10 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {couponError}
                  </div>
                )}

                {couponSuccess && (
                  <div className="text-emerald-500 text-xs mt-3 flex items-center gap-1.5 bg-emerald-500/10 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {couponSuccess}
                  </div>
                )}
              </div>

              {/* Calculation Breakdown */}
              <div className="space-y-3 text-sm border-t border-white/10 pt-5">
                <div className="flex justify-between text-text-muted">
                  <span>المجموع الفرعي:</span>
                  <span className="text-white font-mono" dir="ltr">{subtotal.toFixed(2)} EGP</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>الخصم ({appliedCoupon.code}):</span>
                    <span className="font-mono" dir="ltr">-{discountAmount.toFixed(2)} EGP</span>
                  </div>
                )}

                <div className="flex justify-between text-text-muted">
                  <span>مصاريف الشحن:</span>
                  {shippingCost === 0 ? (
                    <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded">شحن مجاني</span>
                  ) : (
                    <span className="text-white font-mono" dir="ltr">{shippingCost} EGP</span>
                  )}
                </div>

                {subtotal < 1000 && subtotal > 0 && (
                  <div className="text-[11px] text-text-muted bg-accent-red/5 p-3 rounded-xl border border-accent-red/10 mt-3 leading-relaxed">
                    💡 أضف منتجات بقيمة <span className="text-accent-red font-bold font-mono">{(1000 - subtotal).toFixed(2)} EGP</span> إضافية للحصول على <span className="text-white font-bold">شحن مجاني</span>!
                  </div>
                )}
              </div>

              {/* Final Total */}
              <div className="border-t border-white/10 pt-5 flex justify-between items-center">
                <span className="font-bold text-white text-base">الإجمالي النهائي:</span>
                <span className="font-product-title font-black text-accent-red text-3xl drop-shadow-[0_0_15px_rgba(227,30,36,0.3)]" dir="ltr">
                  {finalTotal.toFixed(2)} EGP
                </span>
              </div>

              {/* Desktop Checkout Button */}
              <div className="hidden lg:block pt-2">
                <Link
                  href={`/checkout${appliedCoupon ? `?coupon=${appliedCoupon.code}` : ''}`}
                  className="w-full py-4 bg-gradient-to-r from-accent-red to-red-600 text-white font-product-title font-bold text-lg tracking-wide rounded-xl flex items-center justify-center gap-2 hover:from-red-600 hover:to-accent-red transition-all shadow-[0_0_20px_rgba(227,30,36,0.4)] active:scale-95"
                >
                  <span>الانتقال لإتمام الطلب</span>
                  <span className="material-symbols-outlined text-lg rtl:rotate-180">arrow_back</span>
                </Link>
                <div className="text-[10px] text-text-muted text-center flex items-center justify-center gap-1.5 mt-3">
                  <span className="material-symbols-outlined text-xs text-emerald-400">verified_user</span>
                  دفع آمن ومضمون 100%
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* STICKY BOTTOM MOBILE CTA (Visible on mobile only: lg:hidden) */}
      <div className="lg:hidden fixed bottom-4 left-3 right-3 z-50 bg-[#0d0d0d]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-3 sm:p-4 shadow-[0_15px_40px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom-10 duration-300">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div className="text-right">
            <div className="text-[10px] text-text-muted font-bold">الإجمالي الكلي</div>
            <div className="font-product-title font-black text-accent-red text-xl" dir="ltr">
              {finalTotal.toFixed(2)} EGP
            </div>
          </div>

          <Link
            href={`/checkout${appliedCoupon ? `?coupon=${appliedCoupon.code}` : ''}`}
            className="flex-1 py-3.5 px-4 bg-gradient-to-r from-accent-red to-red-600 hover:from-red-600 hover:to-accent-red text-white font-product-title font-bold text-sm sm:text-base rounded-xl shadow-[0_0_20px_rgba(227,30,36,0.5)] flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <span>إتمام الشراء</span>
            <span className="material-symbols-outlined text-lg rtl:rotate-180">arrow_back</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
