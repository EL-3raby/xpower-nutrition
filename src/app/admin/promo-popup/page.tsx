'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPromoPopup, updatePromoPopup } from '@/lib/firebase/admin-actions';
import { getProducts } from '@/lib/firebase/products';
import { PromoPopup, Product } from '@/lib/types';
import { isDummyFirebase } from '@/lib/firebase/client';
import { Timestamp } from 'firebase/firestore';
import Spinner from '@/components/ui/Spinner';

export default function AdminPromoPopupPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [isActive, setIsActive] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [ctaText, setCtaText] = useState('تسوق الآن');
  const [ctaLink, setCtaLink] = useState('/products');
  const [ctaMode, setCtaMode] = useState<'product' | 'custom'>('product');
  const [customLink, setCustomLink] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [showCountdown, setShowCountdown] = useState(true);

  // Products for dropdown
  const [products, setProducts] = useState<Product[]>([]);

  // Image upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const [config, prods] = await Promise.all([
          getPromoPopup(),
          getProducts(undefined, true)
        ]);

        setIsActive(config.isActive);
        setImageUrl(config.imageUrl || '');
        setCtaText(config.ctaText || 'تسوق الآن');
        setShowCountdown(config.showCountdown ?? true);
        setProducts(prods);

        // Parse endDateTime
        if (config.endDateTime) {
          const d = config.endDateTime instanceof Date
            ? config.endDateTime
            : (config.endDateTime as any).toDate?.()
              ? (config.endDateTime as any).toDate()
              : new Date(config.endDateTime as any);
          // Format for datetime-local input: YYYY-MM-DDTHH:mm
          const pad = (n: number) => n.toString().padStart(2, '0');
          const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          setEndDateTime(formatted);
        }

        // Determine CTA mode
        const link = config.ctaLink || '/products';
        const isProductLink = link.startsWith('/products/detail?slug=') || (link.startsWith('/products/') && link !== '/products');
        if (isProductLink) {
          setCtaMode('product');
          if (link.startsWith('/products/detail?slug=')) {
            const slug = link.split('/products/detail?slug=')[1];
            setCtaLink(`/products/${slug}`);
          } else {
            setCtaLink(link);
          }
        } else {
          setCtaMode('custom');
          setCustomLink(link);
          setCtaLink(link);
        }
      } catch (err) {
        console.error('Error loading promo popup config:', err);
        setErrorMsg('حدث خطأ أثناء تحميل إعدادات الإعلان المنبثق.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Cloudinary Image Upload (same pattern as products)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('نوع الملف غير مدعوم. يرجى اختيار صورة بصيغة JPG أو PNG أو WebP.');
      return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMsg('حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setErrorMsg('');

    if (isDummyFirebase) {
      // Mock upload
      let progress = 0;
      const interval = setInterval(() => {
        progress += 25;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setImageUrl(URL.createObjectURL(file));
          setUploading(false);
        }
      }, 150);
      return;
    }

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'emjbso8n';
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'xpower_products';

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, true);

      xhr.upload.addEventListener('progress', (ev) => {
        if (ev.lengthComputable) {
          setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            setImageUrl(response.secure_url);
          } else {
            setErrorMsg('فشل رفع الصورة. يرجى المحاولة مرة أخرى.');
          }
          setUploading(false);
        }
      };

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      xhr.send(formData);
    } catch (err) {
      console.error('Image upload error:', err);
      setErrorMsg('فشل رفع الصورة.');
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const finalLink = ctaMode === 'product' ? ctaLink : customLink;

      if (isActive && !imageUrl) {
        setErrorMsg('يرجى رفع صورة الإعلان قبل التفعيل.');
        setSubmitting(false);
        return;
      }

      if (!endDateTime) {
        setErrorMsg('يرجى تحديد تاريخ ووقت انتهاء العرض.');
        setSubmitting(false);
        return;
      }

      const endDate = new Date(endDateTime);

      await updatePromoPopup({
        isActive,
        imageUrl,
        ctaText,
        ctaLink: finalLink,
        endDateTime: Timestamp.fromDate(endDate),
        showCountdown
      });

      setSuccessMsg('تم حفظ إعدادات الإعلان المنبثق بنجاح!');
    } catch (err: any) {
      console.error('Error saving promo popup:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ الإعدادات.');
    } finally {
      setSubmitting(false);
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
        <h1 className="font-display text-2xl font-black text-white">إعلان  ثابت </h1>
        <p className="font-body text-sm text-text-muted mt-2">تحكم في الإعلان المنبثق الذي يظهر للزوار عند دخول الموقع لأول مرة.</p>
      </div>

      {successMsg && (
        <div className="bg-success/10 border-r-4 border-success p-3 text-success font-body text-sm">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-accent-red/10 border-r-4 border-accent-red p-3 text-accent-red font-body text-sm">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">

        {/* Toggle Active */}
        <div className="bg-bg-elevated border border-text-muted/10 p-6 flex flex-col gap-6">
          <h2 className="font-display text-base font-bold text-white border-b border-text-muted/10 pb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent-red text-lg">toggle_on</span>
            <span>حالة التفعيل</span>
          </h2>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="accent-accent-red w-5 h-5 cursor-pointer"
            />
            <label htmlFor="isActive" className="font-body text-sm text-white cursor-pointer select-none">
              تفعيل الإعلان المنبثق (يظهر للزوار عند الدخول)
            </label>
          </div>
        </div>

        {/* Image Upload */}
        <div className="bg-bg-elevated border border-text-muted/10 p-6 flex flex-col gap-6">
          <h2 className="font-display text-base font-bold text-white border-b border-text-muted/10 pb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent-red text-lg">image</span>
            <span>صورة الإعلان</span>
          </h2>

          <div className="flex flex-col gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2 font-body text-sm focus:border-accent-red focus:outline-none cursor-pointer disabled:opacity-50"
            />

            {/* Progress Bar */}
            {uploading && (
              <div className="text-xs font-body text-text-muted">
                <span className="block text-right mb-1">جاري الرفع... ({uploadProgress}%)</span>
                <div className="w-full bg-bg-primary h-1.5 overflow-hidden">
                  <div className="bg-accent-red h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}

            {/* Preview */}
            {imageUrl && (
              <div className="relative inline-block border border-text-muted/10 bg-bg-primary p-1 max-w-xs">
                <img src={imageUrl} alt="معاينة صورة الإعلان" className="w-full h-auto object-contain max-h-64" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-accent-red text-white flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <span className="material-symbols-outlined text-[14px] font-bold">close</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Timing */}
        <div className="bg-bg-elevated border border-text-muted/10 p-6 flex flex-col gap-6">
          <h2 className="font-display text-base font-bold text-white border-b border-text-muted/10 pb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent-red text-lg">schedule</span>
            <span>التوقيت</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-product-title text-white font-bold text-xs uppercase tracking-wide">تاريخ ووقت الانتهاء</label>
              <input
                type="datetime-local"
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
                className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none"
                dir="ltr"
              />
            </div>

            <div className="flex flex-col gap-2 justify-end">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="showCountdown"
                  checked={showCountdown}
                  onChange={(e) => setShowCountdown(e.target.checked)}
                  className="accent-accent-red w-5 h-5 cursor-pointer"
                />
                <label htmlFor="showCountdown" className="font-body text-sm text-white cursor-pointer select-none">
                  إظهار التايمر اللحظي (ساعات:دقايق:ثواني)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Configuration */}
        <div className="bg-bg-elevated border border-text-muted/10 p-6 flex flex-col gap-6">
          <h2 className="font-display text-base font-bold text-white border-b border-text-muted/10 pb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent-red text-lg">ads_click</span>
            <span>زرار الإجراء (CTA)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CTA Text */}
            <div className="flex flex-col gap-2">
              <label className="font-product-title text-white font-bold text-xs uppercase tracking-wide">نص الزرار</label>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="مثال: اطلب الآن"
                className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none"
              />
            </div>

            {/* CTA Link Mode */}
            <div className="flex flex-col gap-2">
              <label className="font-product-title text-white font-bold text-xs uppercase tracking-wide">نوع الرابط</label>
              <select
                value={ctaMode}
                onChange={(e) => setCtaMode(e.target.value as 'product' | 'custom')}
                className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none cursor-pointer"
              >
                <option value="product">اختيار منتج</option>
                <option value="custom">رابط يدوي</option>
              </select>
            </div>
          </div>

          {/* CTA Link Value */}
          {ctaMode === 'product' ? (
            <div className="flex flex-col gap-2">
              <label className="font-product-title text-white font-bold text-xs uppercase tracking-wide">اختر المنتج</label>
              <select
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
                className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none cursor-pointer"
              >
                <option value="/products">صفحة جميع المنتجات</option>
                {products.map((p) => (
                  <option key={p.id} value={`/products/${p.slug}`}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="font-product-title text-white font-bold text-xs uppercase tracking-wide">الرابط (مثال: /products أو /checkout)</label>
              <input
                type="text"
                value={customLink}
                onChange={(e) => setCustomLink(e.target.value)}
                placeholder="/products"
                className="bg-bg-primary text-white border border-text-muted/20 px-4 py-2.5 font-body text-sm focus:border-accent-red focus:outline-none text-left"
                dir="ltr"
              />
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end border-t border-text-muted/10 pt-6">
          <button
            type="submit"
            disabled={submitting || uploading}
            className="bg-accent-red hover:bg-accent-red/90 text-white font-product-title font-bold px-8 py-3.5 btn-diagonal hover:scale-103 transition-transform text-sm disabled:opacity-50"
          >
            {submitting ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>

      </form>
    </div>
  );
}
