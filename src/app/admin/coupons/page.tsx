'use client';

import React, { useState, useEffect } from 'react';
import { getCoupons, addCoupon, updateCoupon, deleteCoupon } from '@/lib/firebase/admin-actions';
import { getOrders } from '@/lib/firebase/orders';
import { Coupon, Order } from '@/lib/types';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import { Timestamp } from 'firebase/firestore';
import Spinner from '@/components/ui/Spinner';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states (Add/Edit)
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [minOrderValue, setMinOrderValue] = useState<number | ''>('');
  const [expiryDateString, setExpiryDateString] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Affiliate states
  const [isAffiliateCode, setIsAffiliateCode] = useState(false);
  const [affiliateName, setAffiliateName] = useState('');
  const [affiliateContact, setAffiliateContact] = useState('');
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed_per_order'>('percentage');
  const [commissionValue, setCommissionValue] = useState(0);

  const [isCodeLocked, setIsCodeLocked] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [fetchedCoupons, fetchedOrders] = await Promise.all([
        getCoupons(),
        getOrders()
      ]);
      setCoupons(fetchedCoupons);
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

  const handleEditClick = (coupon: Coupon) => {
    setEditingId(coupon.id!);
    setCode(coupon.code);
    setDiscountType(coupon.discountType);
    setDiscountValue(coupon.discountValue);
    setMinOrderValue(coupon.minOrderValue || '');
    
    // Format expiry date to YYYY-MM-DD for input field
    if (coupon.expiryDate) {
      const expDate = coupon.expiryDate instanceof Date 
        ? coupon.expiryDate 
        : (coupon.expiryDate as any).toDate();
      const formatted = expDate.toISOString().split('T')[0];
      setExpiryDateString(formatted);
    } else {
      setExpiryDateString('');
    }

    setIsActive(coupon.isActive);
    setIsAffiliateCode(coupon.isAffiliateCode || false);
    setAffiliateName(coupon.affiliateName || '');
    setAffiliateContact(coupon.affiliateContact || '');
    setCommissionType(coupon.commissionType || 'percentage');
    setCommissionValue(coupon.commissionValue || 0);
    setErrorMsg('');

    // Lock code if used in any order
    const isUsed = orders.some(o => o.couponCode === coupon.code);
    setIsCodeLocked(isUsed);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCode('');
    setDiscountType('percentage');
    setDiscountValue(0);
    setMinOrderValue('');
    setExpiryDateString('');
    setIsActive(true);
    setIsAffiliateCode(false);
    setAffiliateName('');
    setAffiliateContact('');
    setCommissionType('percentage');
    setCommissionValue(0);
    setIsCodeLocked(false);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || discountValue <= 0) {
      setErrorMsg('يجب إدخال كود خصم وقيمة أكبر من صفر.');
      return;
    }

    if (isAffiliateCode) {
      if (!/^(010|011|012|015)[0-9]{8}$/.test(affiliateContact)) {
        setErrorMsg('يجب إدخال رقم هاتف مصري صحيح للمسوق (مثال: 01012345678).');
        return;
      }
      if (Number(commissionValue) <= 0) {
        setErrorMsg('يجب أن تكون قيمة عمولة المسوق أكبر من صفر.');
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const expiryDate = expiryDateString ? new Date(expiryDateString) : undefined;

      const payload: Partial<Coupon> = {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: Number(discountValue),
        minOrderValue: minOrderValue === '' ? undefined : Number(minOrderValue),
        isActive,
        expiryDate: expiryDate ? Timestamp.fromDate(expiryDate) : undefined,
        isAffiliateCode,
      };

      if (isAffiliateCode) {
        payload.affiliateName = affiliateName;
        payload.affiliateContact = affiliateContact;
        payload.commissionType = commissionType;
        payload.commissionValue = Number(commissionValue);
        // Only initialize paidAmount if it's a new coupon, preserve existing otherwise
        if (!editingId) {
          payload.paidAmount = 0;
        }
      }

      // Firestore doesn't accept undefined values, so we must clean the object
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([_, v]) => v !== undefined)
      );

      if (editingId) {
        await updateCoupon(editingId, cleanPayload);
      } else {
        await addCoupon(cleanPayload as any);
      }

      handleCancelEdit();
      await loadData();
    } catch (err: any) {
      console.error('Error saving coupon:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ الكوبون.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (coupon: Coupon) => {
    if (coupon.isAffiliateCode) {
      const isUsed = orders.some(o => o.couponCode === coupon.code);
      if (isUsed) {
        alert('لا يمكن حذف هذا الكود لأنه مرتبط بمبيعات فعلية، يمكنك تعطيله (Deactivate) بدلاً من حذفه');
        return;
      }
    }
    setSelectedCouponId(coupon.id!);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCouponId) return;

    try {
      await deleteCoupon(selectedCouponId);
      await loadData();
    } catch (err) {
      console.error('Error deleting coupon:', err);
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedCouponId(null);
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
    <div className="space-y-8 text-right" dir="rtl">
      
      {/* Header */}
      <div className="border-b border-text-muted/10 pb-4">
        <h1 className="font-display text-2xl md:text-3xl font-black text-white">كوبونات الخصم</h1>
        <p className="font-body text-sm text-text-muted mt-2">إنشاء وإدارة أكواد الخصم وتحديد قيم الخصم وتاريخ الصلاحية.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Coupon Add/Edit Form (5 cols) */}
        <div className="lg:col-span-5 bg-bg-elevated border border-text-muted/10 p-6 flex flex-col gap-6">
          <h2 className="font-display text-lg font-bold text-white border-b border-text-muted/10 pb-3">
            {editingId ? 'تعديل الكوبون الحالي' : 'إنشاء كوبون جديد'}
          </h2>

          {errorMsg && (
            <div className="bg-accent-red/10 border-r-4 border-accent-red p-3 text-accent-red font-body text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Code */}
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs text-text-muted font-bold flex justify-between">
                كود الخصم (رمز كابيتال)
                {isCodeLocked && <span className="text-warning text-[10px]">مغلق: الكود مستخدم في طلبات</span>}
              </label>
              <input 
                type="text" 
                placeholder="مثال: XPOWER20"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={isCodeLocked}
                className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none uppercase text-left font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                dir="ltr"
              />
            </div>

            {/* Discount Type */}
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs text-text-muted font-bold">نوع الخصم</label>
              <select 
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none cursor-pointer"
              >
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت (EGP)</option>
              </select>
            </div>

            {/* Discount Value */}
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs text-text-muted font-bold">قيمة الخصم (نسبة مئوية أو مبلغ)</label>
              <input 
                type="number" 
                placeholder="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                min="1"
                required
                className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none text-left"
                dir="ltr"
              />
            </div>

            {/* Min order value */}
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs text-text-muted font-bold">الحد الأدنى لقيمة الأوردر لتطبيق الكود (اختياري)</label>
              <input 
                type="number" 
                placeholder="لا يوجد حد أدنى"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value === '' ? '' : Number(e.target.value))}
                min="0"
                className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none text-left"
                dir="ltr"
              />
            </div>

            {/* Expiry Date */}
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs text-text-muted font-bold">تاريخ انتهاء الصلاحية (اختياري)</label>
              <input 
                type="date" 
                value={expiryDateString}
                onChange={(e) => setExpiryDateString(e.target.value)}
                className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none text-left"
                dir="ltr"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3 py-2 border-t border-text-muted/10 pt-4">
              <input 
                type="checkbox" 
                id="couponIsActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-accent-red w-5 h-5 cursor-pointer bg-bg-primary border-text-muted/20"
              />
              <label htmlFor="couponIsActive" className="font-body text-sm text-white cursor-pointer select-none">عرض وتفعيل كوبون الخصم</label>
            </div>

            {/* Affiliate Toggle */}
            <div className="flex items-center gap-3 py-2 border-t border-text-muted/10 pt-4">
              <input 
                type="checkbox" 
                id="isAffiliateCode"
                checked={isAffiliateCode}
                onChange={(e) => setIsAffiliateCode(e.target.checked)}
                className="accent-accent-red w-5 h-5 cursor-pointer bg-bg-primary border-text-muted/20"
              />
              <label htmlFor="isAffiliateCode" className="font-body text-sm text-white cursor-pointer select-none font-bold">هل هذا كود مسوّق (Affiliate)؟</label>
            </div>

            {isAffiliateCode && (
              <div className="p-4 bg-bg-primary border border-text-muted/10 space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="font-body text-xs text-text-muted font-bold">اسم المسوّق</label>
                  <input 
                    type="text" 
                    value={affiliateName}
                    onChange={(e) => setAffiliateName(e.target.value)}
                    required={isAffiliateCode}
                    className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2 font-body text-sm focus:border-accent-red focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-body text-xs text-text-muted font-bold">رقم التواصل</label>
                  <input 
                    type="text" 
                    value={affiliateContact}
                    onChange={(e) => setAffiliateContact(e.target.value)}
                    className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2 font-body text-sm focus:border-accent-red focus:outline-none"
                    dir="ltr"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-body text-xs text-text-muted font-bold">نوع العمولة</label>
                  <select 
                    value={commissionType}
                    onChange={(e) => setCommissionType(e.target.value as 'percentage' | 'fixed_per_order')}
                    className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2 font-body text-sm focus:border-accent-red focus:outline-none cursor-pointer"
                  >
                    <option value="percentage">نسبة مئوية (%)</option>
                    <option value="fixed_per_order">مبلغ ثابت لكل طلب (EGP)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-body text-xs text-text-muted font-bold">قيمة العمولة</label>
                  <input 
                    type="number" 
                    value={commissionValue}
                    onChange={(e) => setCommissionValue(Number(e.target.value))}
                    min="0"
                    required={isAffiliateCode}
                    className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2 font-body text-sm focus:border-accent-red focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-4 border-t border-text-muted/10">
              <button 
                type="submit"
                disabled={submitting}
                className="flex-grow bg-accent-red hover:bg-accent-red/90 text-white font-product-title font-bold py-3 px-4 btn-diagonal hover:scale-103 transition-transform text-sm"
              >
                {submitting ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة الكوبون'}
              </button>
              {editingId && (
                <button 
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-3 border border-text-muted/20 text-white font-product-title text-sm"
                >
                  إلغاء
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Coupon Listing (7 cols) */}
        <div className="lg:col-span-7 bg-bg-elevated border border-text-muted/10 p-6">
          <h2 className="font-display text-lg font-bold text-white border-b border-text-muted/10 pb-3 mb-4">الكوبونات الحالية</h2>
          
          {coupons.length === 0 ? (
            <p className="text-center py-6 text-text-muted font-body text-sm">لا توجد كوبونات خصم مسجلة بعد.</p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-right border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-text-muted/10 text-xs text-text-muted font-bold uppercase tracking-wider">
                    <th className="pb-3 text-right">رمز الكود</th>
                    <th className="pb-3 text-center">نوع الخصم</th>
                    <th className="pb-3 text-center">القيمة</th>
                    <th className="pb-3 text-center">صلاحية الكود</th>
                    <th className="pb-3 text-center">الحالة</th>
                    <th className="pb-3 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-text-muted/5 font-body text-sm">
                  {coupons.map((c) => (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 text-right text-white font-bold font-mono tracking-wider select-all">{c.code}</td>
                      <td className="py-4 text-center text-text-muted">
                        {c.discountType === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}
                      </td>
                      <td className="py-4 text-center font-product-title font-semibold text-white">
                        {c.discountValue}{c.discountType === 'percentage' ? '%' : ' EGP'}
                      </td>
                      <td className="py-4 text-center text-text-muted text-xs">
                        {c.expiryDate ? (
                          (c.expiryDate as Date).toLocaleDateString('ar-EG')
                        ) : (
                          'دائم الصلاحية'
                        )}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`inline-block border px-2.5 py-0.5 text-xs font-semibold ${
                          c.isActive 
                            ? 'bg-success/15 text-success border-success/30' 
                            : 'bg-text-muted/10 text-text-muted border-text-muted/20'
                        }`}>
                          {c.isActive ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="py-4 text-left font-product-title">
                        <div className="flex justify-end gap-3.5">
                          <button 
                            onClick={() => handleEditClick(c)}
                            className="text-text-muted hover:text-white flex items-center gap-1 text-xs"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            <span>تعديل</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(c)}
                            className="text-text-muted hover:text-accent-red flex items-center gap-1 text-xs"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            <span>حذف</span>
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
              {coupons.map((c) => (
                <div key={c.id} className="p-4 flex flex-col gap-3 relative">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1 pr-2">
                      <span className="text-white font-bold font-mono tracking-wider text-base">{c.code}</span>
                      <span className="text-xs text-text-muted font-body">
                        {c.discountType === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}
                      </span>
                    </div>
                    <span className={`inline-block border px-2 py-0.5 text-[10px] font-bold rounded-md shrink-0 ${
                      c.isActive 
                        ? 'bg-success/15 text-success border-success/30' 
                        : 'bg-text-muted/10 text-text-muted border-text-muted/20'
                    }`}>
                      {c.isActive ? 'نشط' : 'معطل'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg mt-1">
                    <div className="flex flex-col flex-1 border-l border-white/10 text-center">
                      <span className="text-[10px] text-text-muted mb-1">صلاحية الكود</span>
                      <span className="text-xs text-white">
                        {c.expiryDate ? (c.expiryDate as Date).toLocaleDateString('ar-EG') : 'دائم الصلاحية'}
                      </span>
                    </div>
                    <div className="flex flex-col flex-1 text-center">
                      <span className="text-[10px] text-text-muted mb-1">القيمة</span>
                      <span className="font-product-title text-sm font-bold text-accent-red" dir="ltr">
                        {c.discountValue} <span className="text-[9px]">{c.discountType === 'percentage' ? '%' : 'EGP'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => handleEditClick(c)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1 py-2 rounded-lg text-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      تعديل
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(c)}
                      className="flex-1 bg-accent-red/10 text-accent-red hover:bg-accent-red hover:text-white flex items-center justify-center gap-1 py-2 rounded-lg text-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
          )}
        </div>

      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        title="تأكيد حذف كوبون الخصم"
        message="هل أنت متأكد من رغبتك في حذف كوبون الخصم هذا نهائياً؟ لن يتمكن العملاء من استخدامه مجدداً."
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

    </div>
  );
}
