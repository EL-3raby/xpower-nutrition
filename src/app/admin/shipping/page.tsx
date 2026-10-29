'use client';

import React, { useState, useEffect } from 'react';
import { getSiteConfig, updateSiteConfig, getShippingRates, addShippingRate, updateShippingRate, deleteShippingRate } from '@/lib/firebase/admin-actions';
import { SiteConfig, ShippingRate } from '@/lib/types';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import Spinner from '@/components/ui/Spinner';

export default function AdminShippingPage() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingConfig, setSubmittingConfig] = useState(false);
  const [submittingRate, setSubmittingRate] = useState(false);

  // Free shipping settings form states
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(false);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(0);
  const [freeShippingDepositAmount, setFreeShippingDepositAmount] = useState(100);

  // Rate CRUD form states
  const [cityName, setCityName] = useState('');
  const [rateVal, setRateVal] = useState<number | ''>('');
  const [rateActive, setRateActive] = useState(true);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const [fetchedConfig, fetchedRates] = await Promise.all([
        getSiteConfig(),
        getShippingRates()
      ]);
      
      setConfig(fetchedConfig);
      setRates(fetchedRates);

      setFreeShippingEnabled(fetchedConfig.freeShipping?.isEnabled ?? false);
      setFreeShippingThreshold(fetchedConfig.freeShipping?.thresholdAmount ?? 0);
      setFreeShippingDepositAmount(fetchedConfig.freeShipping?.depositAmountWhenFree ?? 100);
    } catch (err) {
      console.error('Error loading shipping data:', err);
      setErrorMsg('حدث خطأ أثناء تحميل إعدادات الشحن.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveFreeShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setSubmittingConfig(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const updatedConfig = {
        ...config,
        freeShipping: {
          isEnabled: freeShippingEnabled,
          thresholdAmount: Number(freeShippingThreshold),
          depositAmountWhenFree: Number(freeShippingDepositAmount) || 100
        }
      };

      await updateSiteConfig(updatedConfig);
      setConfig(updatedConfig);
      setSuccessMsg('تم حفظ وتحديث إعدادات الشحن المجاني بنجاح!');
    } catch (err: any) {
      console.error('Error saving free shipping settings:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ إعدادات الشحن المجاني.');
    } finally {
      setSubmittingConfig(false);
    }
  };

  const handleEditRateClick = (rate: ShippingRate) => {
    setEditingRateId(rate.id!);
    setCityName(rate.cityName);
    setRateVal(rate.rate);
    setRateActive(rate.isActive);
  };

  const handleCancelRateEdit = () => {
    setEditingRateId(null);
    setCityName('');
    setRateVal('');
    setRateActive(true);
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityName.trim() || rateVal === '') return;

    setSubmittingRate(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const payload = {
        cityName: cityName.trim(),
        rate: Number(rateVal),
        isActive: rateActive
      };

      if (editingRateId) {
        await updateShippingRate(editingRateId, payload);
      } else {
        await addShippingRate(payload);
      }

      handleCancelRateEdit();
      await loadData();
      setSuccessMsg('تم حفظ سعر شحن المدينة بنجاح!');
    } catch (err: any) {
      console.error('Error saving shipping rate:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ سعر شحن المدينة.');
    } finally {
      setSubmittingRate(false);
    }
  };

  const handleDeleteRateClick = (id: string) => {
    setSelectedRateId(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteRate = async () => {
    if (!selectedRateId) return;

    try {
      await deleteShippingRate(selectedRateId);
      await loadData();
      setSuccessMsg('تم حذف سعر شحن المدينة بنجاح!');
    } catch (err) {
      console.error('Error deleting shipping rate:', err);
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedRateId(null);
    }
  };

  const UPPER_EGYPT_LIST = [
    'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'الوادي الجديد'
  ];

  const handleApplyStandardRates = async () => {
    const GOVERNORATES = [
      'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر', 'البحيرة', 'الفيوم', 'الغربية', 'الإسماعيلية', 'المنوفية', 'المنيا', 'القليوبية', 'الوادي الجديد', 'السويس', 'أسوان', 'أسيوط', 'بني سويف', 'بورسعيد', 'دمياط', 'الشرقية', 'جنوب سيناء', 'كفر الشيخ', 'مطروح', 'الأقصر', 'قنا', 'شمال سيناء', 'سوهاج'
    ];

    setSubmittingRate(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const existingMap = new Map<string, ShippingRate>();
      rates.forEach(r => existingMap.set(r.cityName.trim(), r));

      for (const gov of GOVERNORATES) {
        const isUpper = UPPER_EGYPT_LIST.includes(gov);
        const targetRate = isUpper ? 120 : 100;
        const existing = existingMap.get(gov);

        if (existing && existing.id) {
          await updateShippingRate(existing.id, {
            cityName: gov,
            rate: targetRate,
            isActive: true
          });
        } else {
          await addShippingRate({
            cityName: gov,
            rate: targetRate,
            isActive: true
          });
        }
      }

      await loadData();
      setSuccessMsg('تم تحديث وتهيئة أسعار جميع المحافظات بنجاح! (وجه بحري: 100 ج | وجه قبلي: 120 ج)');
    } catch (err: any) {
      console.error('Error applying standard rates:', err);
      setErrorMsg('حدث خطأ أثناء تطبيق أسعار الشحن القياسية.');
    } finally {
      setSubmittingRate(false);
    }
  };

  const handleSeedGovernorates = async () => {
    const GOVERNORATES = [
      'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر', 'البحيرة', 'الفيوم', 'الغربية', 'الإسماعيلية', 'المنوفية', 'المنيا', 'القليوبية', 'الوادي الجديد', 'السويس', 'أسوان', 'أسيوط', 'بني سويف', 'بورسعيد', 'دمياط', 'الشرقية', 'جنوب سيناء', 'كفر الشيخ', 'مطروح', 'الأقصر', 'قنا', 'شمال سيناء', 'سوهاج'
    ];

    setSubmittingRate(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const existingNames = rates.map(r => r.cityName.trim());
      const missing = GOVERNORATES.filter(g => !existingNames.includes(g));

      if (missing.length === 0) {
        setSuccessMsg('جميع المحافظات مضافة بالفعل.');
        setSubmittingRate(false);
        return;
      }

      for (const gov of missing) {
        const isUpper = UPPER_EGYPT_LIST.includes(gov);
        await addShippingRate({
          cityName: gov,
          rate: isUpper ? 120 : 100,
          isActive: true
        });
      }

      await loadData();
      setSuccessMsg(`تم إضافة ${missing.length} محافظة بنجاح!`);
    } catch (err: any) {
      console.error('Error seeding governorates:', err);
      setErrorMsg('حدث خطأ أثناء إضافة المحافظات.');
    } finally {
      setSubmittingRate(false);
    }
  };

  const filteredRates = rates.filter(r => r.cityName.toLowerCase().includes(searchQuery.toLowerCase()));

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
        <h1 className="font-display text-2xl md:text-3xl font-black text-white">إعدادات الشحن والتوصيل</h1>
        <p className="font-body text-sm text-text-muted mt-2">ظبّط تكلفة شحن وتوصيل الطرود لكل مدينة ومحافظة، وفعّل ميزة الشحن المجاني.</p>
      </div>

      {successMsg && (
        <div className="bg-success/10 border-r-4 border-success p-4 text-success font-body text-sm">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-accent-red/10 border-r-4 border-accent-red p-4 text-accent-red font-body text-sm">
          {errorMsg}
        </div>
      )}

      {/* Row containing settings and rates controller */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left column (5 cols): Free Shipping settings & Rate form */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Free Shipping Settings Card */}
          <div className="bg-bg-elevated border border-text-muted/10 p-6 flex flex-col gap-5">
            <h2 className="font-display text-base font-bold text-white border-b border-text-muted/10 pb-2 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-accent-red text-lg">local_shipping</span>
              <span>ميزة الشحن المجاني (Free Shipping)</span>
            </h2>

            <form onSubmit={handleSaveFreeShipping} className="space-y-4">
              <div className="flex items-center gap-3 py-1">
                <input 
                  type="checkbox" 
                  id="freeShippingEnabled"
                  checked={freeShippingEnabled}
                  onChange={(e) => setFreeShippingEnabled(e.target.checked)}
                  className="accent-accent-red w-5 h-5 cursor-pointer bg-bg-primary border-text-muted/20"
                />
                <label htmlFor="freeShippingEnabled" className="font-body text-sm text-white cursor-pointer select-none">شغّل الشحن المجاني للأوردرات اللي معدية مبلغ معين</label>
              </div>

              {freeShippingEnabled && (
                <div className="flex flex-col gap-2 animate-fadeIn">
                  <label className="font-body text-xs text-text-muted font-bold">الحد الأدنى لقيمة الأوردر للشحن المجاني (EGP)</label>
                  <input 
                    type="number" 
                    placeholder="1000"
                    value={freeShippingThreshold}
                    onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
                    min="1"
                    required
                    className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none text-left"
                    dir="ltr"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2 border-t border-text-muted/10">
                <label className="font-body text-xs text-text-muted font-bold">قيمة الديبوزيت المطلوبة لو الشحن مجاني (جنيه)</label>
                <input 
                  type="number" 
                  placeholder="100"
                  value={freeShippingDepositAmount}
                  onChange={(e) => setFreeShippingDepositAmount(Number(e.target.value))}
                  min="0"
                  required
                  className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none text-left"
                  dir="ltr"
                />
                <span className="text-[11px] text-text-muted leading-relaxed">
                  مبلغ الديبوزيت التأميني الثابت عند اختيار الدفع عند الاستلام لو الشحن مجاني (افتراضياً 100 جنيه، ويُخصم من إجمالي الأوردر).
                </span>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={submittingConfig}
                  className="w-full bg-accent-red hover:bg-accent-red/90 text-white font-product-title font-bold py-3 px-4 btn-diagonal hover:scale-103 transition-transform text-sm"
                >
                  {submittingConfig ? 'جاري الحفظ...' : 'حفظ إعدادات الشحن المجاني'}
                </button>
              </div>
            </form>
          </div>

          {/* Shipping Rate Add/Edit Form */}
          <div className="bg-bg-elevated border border-text-muted/10 p-6 flex flex-col gap-5">
            <h2 className="font-display text-base font-bold text-white border-b border-text-muted/10 pb-2 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-accent-red text-lg">add_location</span>
              <span>{editingRateId ? 'تعديل سعر شحن مدينة' : 'إضافة سعر شحن لمدينة جديدة'}</span>
            </h2>

            <form onSubmit={handleSaveRate} className="space-y-4">
              {/* City Name */}
              <div className="flex flex-col gap-2">
                <label className="font-body text-xs text-text-muted font-bold">اسم المحافظة / المدينة</label>
                <input 
                  type="text" 
                  placeholder="مثال: القاهرة"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  required
                  className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none"
                />
              </div>

              {/* Rate */}
              <div className="flex flex-col gap-2">
                <label className="font-body text-xs text-text-muted font-bold">تكلفة الشحن (EGP)</label>
                <input 
                  type="number" 
                  placeholder="50"
                  value={rateVal}
                  onChange={(e) => setRateVal(e.target.value === '' ? '' : Number(e.target.value))}
                  min="0"
                  required
                  className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none text-left"
                  dir="ltr"
                />
              </div>

              {/* Active state */}
              <div className="flex items-center gap-3 py-1">
                <input 
                  type="checkbox" 
                  id="rateActive"
                  checked={rateActive}
                  onChange={(e) => setRateActive(e.target.checked)}
                  className="accent-accent-red w-5 h-5 cursor-pointer bg-bg-primary border-text-muted/20"
                />
                <label htmlFor="rateActive" className="font-body text-sm text-white cursor-pointer select-none">تفعيل سعر الشحن لهذه المدينة</label>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button 
                  type="submit"
                  disabled={submittingRate || !cityName.trim() || rateVal === ''}
                  className="flex-grow bg-accent-red hover:bg-accent-red/90 text-white font-product-title font-bold py-3 px-4 btn-diagonal hover:scale-103 transition-transform text-sm disabled:opacity-50"
                >
                  {submittingRate ? 'جاري الحفظ...' : editingRateId ? 'حفظ التعديلات' : 'إضافة المدينة'}
                </button>
                {editingRateId && (
                  <button 
                    type="button"
                    onClick={handleCancelRateEdit}
                    className="px-4 py-3 border border-text-muted/20 text-white font-product-title text-sm"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </form>
          </div>

        </div>

        {/* Right column (7 cols): Rates table */}
        <div className="lg:col-span-7 bg-bg-elevated border border-text-muted/10 p-6">
          <h2 className="font-display text-lg font-bold text-white border-b border-text-muted/10 pb-3 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent-red text-lg">location_on</span>
            <span>أسعار الشحن الحالية للمحافظات والمدن</span>
          </h2>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="relative w-full max-w-sm">
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">search</span>
              <input
                type="text"
                placeholder="ابحث عن مدينة أو محافظة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg-primary text-white border border-text-muted/20 pl-4 pr-10 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleApplyStandardRates}
                disabled={submittingRate}
                type="button"
                className="bg-accent-red/10 hover:bg-accent-red/20 border border-accent-red/40 text-accent-red hover:text-white font-product-title font-bold text-xs py-2.5 px-4 transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                title="تطبيق 100ج لوجه بحري والقاهرة والقناة وسينا ومطروح و 120ج لوجه قبلي"
              >
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                تطبيق أسعار (وجه بحري 100 | وجه قبلي 120)
              </button>

              {rates.length < 27 && (
                <button
                  onClick={handleSeedGovernorates}
                  disabled={submittingRate}
                  type="button"
                  className="bg-bg-primary hover:bg-bg-primary/80 border border-text-muted/20 hover:border-text-muted text-white font-body text-xs py-2.5 px-4 transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">magic_button</span>
                  إضافة كل المحافظات
                </button>
              )}
            </div>
          </div>

          {rates.length === 0 ? (
            <p className="text-center py-6 text-text-muted font-body text-sm">مفيش أسعار شحن متسجلة، الشحن هيكون مجاني لكل المناطق حالياً.</p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-right border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-text-muted/10 text-xs text-text-muted font-bold uppercase tracking-wider">
                    <th className="pb-3 text-right">المدينة / المحافظة</th>
                    <th className="pb-3 text-center">تكلفة الشحن</th>
                    <th className="pb-3 text-center">الحالة</th>
                    <th className="pb-3 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-text-muted/5 font-body text-sm">
                  {filteredRates.map((r) => (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 text-right text-white font-semibold">{r.cityName}</td>
                      <td className="py-4 text-center font-product-title text-accent-red font-bold">
                        {r.rate === 0 ? 'شحن مجاني' : `${r.rate} EGP`}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`inline-block border px-2.5 py-0.5 text-xs font-semibold ${
                          r.isActive 
                            ? 'bg-success/15 text-success border-success/30' 
                            : 'bg-text-muted/10 text-text-muted border-text-muted/20'
                        }`}>
                          {r.isActive ? 'مفعل' : 'معطل'}
                        </span>
                      </td>
                      <td className="py-4 text-left font-product-title">
                        <div className="flex justify-end gap-3.5">
                          <button 
                            onClick={() => handleEditRateClick(r)}
                            className="text-text-muted hover:text-white flex items-center gap-1 text-xs"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            <span>تعديل</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteRateClick(r.id!)}
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

            {/* Mobile Cards View */}
            <div className="flex flex-col md:hidden divide-y divide-white/5">
              {filteredRates.map((r) => (
                <div key={r.id} className="p-4 flex flex-col gap-3 relative">
                  <div className="flex justify-between items-start">
                    <span className="text-white font-bold text-base">{r.cityName}</span>
                    <span className={`inline-block border px-2 py-0.5 text-[10px] font-bold rounded-md shrink-0 ${
                      r.isActive 
                        ? 'bg-success/15 text-success border-success/30' 
                        : 'bg-text-muted/10 text-text-muted border-text-muted/20'
                    }`}>
                      {r.isActive ? 'مفعل' : 'معطل'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg mt-1">
                    <span className="text-[10px] text-text-muted">تكلفة الشحن</span>
                    <span className="font-product-title text-sm font-bold text-accent-red" dir="ltr">
                      {r.rate === 0 ? 'شحن مجاني' : `${r.rate} EGP`}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => handleEditRateClick(r)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1 py-2 rounded-lg text-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      تعديل
                    </button>
                    <button 
                      onClick={() => handleDeleteRateClick(r.id!)}
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
        title="تأكيد حذف تسعيرة الشحن"
        message="متأكد إنك عايز تمسح تسعيرة الشحن للمدينة دي؟ العملاء مش هيقدروا يحسبوا تكلفة الشحن ليها تلقائي تاني، والقرار ده ميتراجعش فيه."
        onConfirm={handleConfirmDeleteRate}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

    </div>
  );
}
