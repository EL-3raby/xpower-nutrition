'use client';

import React, { useState, useEffect } from 'react';
import { getSiteConfig, updateSiteConfig } from '@/lib/firebase/admin-actions';
import { getProducts } from '@/lib/firebase/products';
import { SiteConfig, Product } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import Spinner from '@/components/ui/Spinner';

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Forms local states
  const [heroImg, setHeroImg] = useState('');
  const [heroMobileImg, setHeroMobileImg] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSub, setHeroSub] = useState('');
  const [heroCtaText, setHeroCtaText] = useState('');
  const [heroCtaLink, setHeroCtaLink] = useState('');

  const [promoIsActive, setPromoIsActive] = useState(true);
  const [promoText, setPromoText] = useState('');

  const [uploadingHero, setUploadingHero] = useState(false);
  const [heroUploadProgress, setHeroUploadProgress] = useState(0);

  const [uploadingMobileHero, setUploadingMobileHero] = useState(false);
  const [heroMobileUploadProgress, setHeroMobileUploadProgress] = useState(0);

  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  // Payment Receiving Info
  const [vodafoneCashReceiving, setVodafoneCashReceiving] = useState('');
  const [instapayReceiving, setInstapayReceiving] = useState('');
  const [instapayPaymentLink, setInstapayPaymentLink] = useState('');
  const [vodafoneCashPaymentLink, setVodafoneCashPaymentLink] = useState('');

  // Enabled Payment Methods Toggles
  const [codEnabled, setCodEnabled] = useState(false);
  const [vodafoneCashEnabled, setVodafoneCashEnabled] = useState(true);
  const [instapayEnabled, setInstapayEnabled] = useState(true);

  const [fb, setFb] = useState('');
  const [insta, setInsta] = useState('');
  const [tiktok, setTiktok] = useState('');

  const [trustBadgesRaw, setTrustBadgesRaw] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Flash Sale States
  const [flashSaleActive, setFlashSaleActive] = useState(false);
  const [flashSaleProductId, setFlashSaleProductId] = useState('');
  const [flashSaleEndDate, setFlashSaleEndDate] = useState('');

  // Best Sellers States
  const [bestSellersActive, setBestSellersActive] = useState(true);

  // Authenticity Check States
  const [authenticityCheckActive, setAuthenticityCheckActive] = useState(false);

  // Free Shipping & Deposit States
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(false);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(1000);
  const [freeShippingDepositAmount, setFreeShippingDepositAmount] = useState(100);

  // Maintenance Mode States
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [maintenanceTitle, setMaintenanceTitle] = useState('الموقع تحت الصيانة والتطوير');
  const [maintenanceMessage, setMaintenanceMessage] = useState('نعمل حالياً على تحسين وتطوير تجربة التسوق لنقدم لكم أفضل خدمة مكملات غذائية. سنعود للعمل قريباً جداً.');
  const [maintenanceEstimatedEndTime, setMaintenanceEstimatedEndTime] = useState('');

  useEffect(() => {
    async function loadConfig() {
      try {
        const [fetched, prods] = await Promise.all([
          getSiteConfig(),
          getProducts()
        ]);
        setConfig(fetched);
        setProducts(prods);

        // Prepopulate states
        setHeroImg(fetched.heroBanner?.imageUrl || '');
        setHeroMobileImg(fetched.heroBanner?.mobileImageUrl || '');
        setHeroTitle(fetched.heroBanner?.title || '');
        setHeroSub(fetched.heroBanner?.subtitle || '');
        setHeroCtaText(fetched.heroBanner?.ctaText || '');
        setHeroCtaLink(fetched.heroBanner?.ctaLink || '');

        setPromoIsActive(fetched.promoBanner?.isActive ?? true);
        setPromoText(fetched.promoBanner?.text || '');

        setPhone(fetched.contactInfo?.phone || '');
        setWhatsapp(fetched.contactInfo?.whatsapp || '');
        setEmail(fetched.contactInfo?.email || '');

        setVodafoneCashReceiving(fetched.paymentReceivingInfo?.vodafoneCashNumber || fetched.contactInfo?.whatsapp || '');
        setInstapayReceiving(fetched.paymentReceivingInfo?.instapayHandle || 'ahmeeedel3raby@instapay');
        setInstapayPaymentLink(fetched.paymentReceivingInfo?.instapayPaymentLink || 'https://ipn.eg/S/ahmeeedel3raby/instapay/8OMBs7');
        setVodafoneCashPaymentLink(fetched.paymentReceivingInfo?.vodafoneCashPaymentLink || '');

        setCodEnabled(fetched.paymentMethodsEnabled?.cod ?? false);
        setVodafoneCashEnabled(fetched.paymentMethodsEnabled?.vodafoneCash ?? true);
        setInstapayEnabled(fetched.paymentMethodsEnabled?.instapay ?? true);

        setFb(fetched.socialLinks?.facebook || '');
        setInsta(fetched.socialLinks?.instagram || '');
        setTiktok(fetched.socialLinks?.tiktok || '');

        setTrustBadgesRaw(fetched.trustBadges?.join(', ') || '');

        // Prepopulate Flash Sale
        setFlashSaleActive(fetched.flashSale?.isActive ?? false);
        setFlashSaleProductId(fetched.flashSale?.productId || '');
        if (fetched.flashSale?.endDateTime) {
          const dt = fetched.flashSale.endDateTime instanceof Timestamp
            ? fetched.flashSale.endDateTime.toDate()
            : new Date(fetched.flashSale.endDateTime as any);

          const year = dt.getFullYear();
          const month = String(dt.getMonth() + 1).padStart(2, '0');
          const day = String(dt.getDate()).padStart(2, '0');
          const hours = String(dt.getHours()).padStart(2, '0');
          const minutes = String(dt.getMinutes()).padStart(2, '0');
          setFlashSaleEndDate(`${year}-${month}-${day}T${hours}:${minutes}`);
        }

        // Prepopulate Best Sellers
        setBestSellersActive(fetched.bestSellers?.isActive ?? true);

        // Prepopulate Authenticity Check
        setAuthenticityCheckActive(fetched.authenticityCheck?.isActive ?? false);

        // Prepopulate Free Shipping & Deposit
        setFreeShippingEnabled(fetched.freeShipping?.isEnabled ?? false);
        setFreeShippingThreshold(fetched.freeShipping?.thresholdAmount ?? 1000);
        setFreeShippingDepositAmount(fetched.freeShipping?.depositAmountWhenFree ?? 100);

        // Prepopulate Maintenance Mode
        setMaintenanceActive(fetched.maintenanceMode?.isActive ?? false);
        setMaintenanceTitle(fetched.maintenanceMode?.title ?? 'الموقع تحت الصيانة والتطوير');
        setMaintenanceMessage(fetched.maintenanceMode?.message ?? 'نعمل حالياً على تحسين وتطوير تجربة التسوق لنقدم لكم أفضل خدمة مكملات غذائية. سنعود للعمل قريباً جداً.');
        setMaintenanceEstimatedEndTime(fetched.maintenanceMode?.estimatedEndTime ?? '');
      } catch (err) {
        console.error('Error fetching settings for admin:', err);
        setErrorMsg('حدث خطأ أثناء تحميل إعدادات الموقع.');
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const trustBadges = trustBadgesRaw
        ? trustBadgesRaw.split(',').map(b => b.trim()).filter(Boolean)
        : [];

      const updatedPayload: SiteConfig = {
        heroBanner: {
          imageUrl: heroImg,
          mobileImageUrl: heroMobileImg,
          title: heroTitle,
          subtitle: heroSub,
          ctaText: heroCtaText,
          ctaLink: heroCtaLink
        },
        promoBanner: {
          isActive: promoIsActive,
          text: promoText
        },
        contactInfo: {
          phone,
          whatsapp,
          email
        },
        socialLinks: {
          facebook: fb || '',
          instagram: insta || '',
          tiktok: tiktok || ''
        },
        trustBadges,
        flashSale: {
          isActive: flashSaleActive,
          productId: flashSaleProductId,
          endDateTime: flashSaleEndDate ? new Date(flashSaleEndDate) : new Date()
        },
        bestSellers: {
          isActive: bestSellersActive
        },
        authenticityCheck: {
          isActive: authenticityCheckActive
        },
        paymentReceivingInfo: {
          vodafoneCashNumber: vodafoneCashReceiving.trim(),
          instapayHandle: instapayReceiving.trim(),
          instapayPaymentLink: instapayPaymentLink.trim(),
          vodafoneCashPaymentLink: vodafoneCashPaymentLink.trim(),
        },
        paymentMethodsEnabled: {
          cod: codEnabled,
          vodafoneCash: vodafoneCashEnabled,
          instapay: instapayEnabled,
        },
        freeShipping: {
          isEnabled: freeShippingEnabled,
          thresholdAmount: Number(freeShippingThreshold) || 1000,
          depositAmountWhenFree: Number(freeShippingDepositAmount) || 100,
        },
        maintenanceMode: {
          isActive: maintenanceActive,
          title: maintenanceTitle.trim() || 'الموقع تحت الصيانة والتطوير',
          message: maintenanceMessage.trim() || 'نعمل حالياً على تحسين وتطوير تجربة التسوق لنقدم لكم أفضل خدمة مكملات غذائية. سنعود للعمل قريباً جداً.',
          estimatedEndTime: maintenanceEstimatedEndTime.trim(),
        }
      };

      await updateSiteConfig(updatedPayload);
      setSuccessMsg('الإعدادات اتحفظت واتحدثت بنجاح يا ريس!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Error updating site config:', err);
      setErrorMsg(err.message || 'حصل خطأ وإحنا بنحفظ التحديثات.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingHero(true);
    setErrorMsg('');

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'emjbso8n';
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'xpower_products';

      const uploadedUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, true);

        xhr.upload.addEventListener('progress', (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100);
            setHeroUploadProgress(pct);
          }
        });

        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              const response = JSON.parse(xhr.responseText);
              resolve(response.secure_url);
            } else {
              console.error('Cloudinary hero upload failed:', xhr.responseText);
              reject(new Error('فشل رفع الصورة. يرجى المحاولة مرة أخرى.'));
            }
          }
        };

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        xhr.send(formData);
      });

      setHeroImg(uploadedUrl);
      setSuccessMsg('تم رفع الصورة بنجاح!');
    } catch (err: any) {
      setErrorMsg(err.message || 'حصل مشكلة في رفع الصورة.');
    } finally {
      setUploadingHero(false);
      setHeroUploadProgress(0);
      e.target.value = ''; // Reset input
    }
  };

  const handleHeroMobileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMobileHero(true);
    setErrorMsg('');

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'emjbso8n';
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'xpower_products';

      const uploadedUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, true);

        xhr.upload.addEventListener('progress', (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100);
            setHeroMobileUploadProgress(pct);
          }
        });

        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              const response = JSON.parse(xhr.responseText);
              resolve(response.secure_url);
            } else {
              console.error('Cloudinary hero mobile upload failed:', xhr.responseText);
              reject(new Error('فشل رفع صورة الموبايل. يرجى المحاولة مرة أخرى.'));
            }
          }
        };

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        xhr.send(formData);
      });

      setHeroMobileImg(uploadedUrl);
      setSuccessMsg('تم رفع صورة الموبايل بنجاح!');
    } catch (err: any) {
      setErrorMsg(err.message || 'حصل مشكلة في رفع الصورة.');
    } finally {
      setUploadingMobileHero(false);
      setHeroMobileUploadProgress(0);
      e.target.value = ''; // Reset input
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Spinner className="inline-block w-12 h-12 text-accent-red animate-spin" />
        <span className="text-text-muted font-body text-sm font-bold animate-pulse">بنحمل الإعدادات...</span>
      </div>
    );
  }

  // Common UI components for consistency
  const inputClass = "w-full bg-bg-primary/50 text-white border border-white/10 rounded-xl px-4 py-3 font-body text-sm focus:border-accent-red focus:bg-bg-primary focus:ring-1 focus:ring-accent-red/50 transition-all outline-none";
  const labelClass = "block font-body text-xs text-text-muted font-bold mb-2 uppercase tracking-wide";
  const sectionClass = "bg-bg-elevated/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col gap-6 hover:bg-bg-elevated hover:border-accent-red/30 transition-all duration-300 hover:shadow-[0_10px_30px_rgba(227,30,36,0.05)]";
  const headerClass = "font-display text-lg font-bold text-white border-b border-white/5 pb-4 mb-2 flex items-center gap-3";

  // Toggle Switch Component
  const ToggleSwitch = ({ checked, onChange, label, id }: { checked: boolean, onChange: (c: boolean) => void, label: string, id: string }) => (
    <label htmlFor={id} className="flex items-center gap-4 cursor-pointer group w-fit">
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={`block w-12 h-6 rounded-full transition-colors duration-300 ${checked ? 'bg-accent-red' : 'bg-white/10 border border-white/20'}`}></div>
        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`}></div>
      </div>
      <span className="font-body text-sm text-text-muted group-hover:text-white transition-colors select-none font-bold">{label}</span>
    </label>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-right pb-10" dir="rtl">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-text-muted/10 pb-6">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-black text-white flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-accent-red">tune</span>
            تظبيط الموقع
          </h1>
          <p className="font-body text-sm text-text-muted mt-2 max-w-2xl">
            اتحكم في الواجهة الرئيسية، الإعلانات، وروابط السوشيال ميديا، وأقسام المنتجات بكل سهولة.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-success/10 border border-success/30 rounded-xl p-4 flex items-center gap-3 text-success font-body text-sm animate-fade-in">
          <span className="material-symbols-outlined text-xl">check_circle</span>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-accent-red/10 border border-accent-red/30 rounded-xl p-4 flex items-center gap-3 text-accent-red font-body text-sm animate-fade-in">
          <span className="material-symbols-outlined text-xl">error</span>
          {errorMsg}
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-8">

        {/* Section 1: Hero Banner details */}
        <div className={sectionClass}>
          <h2 className={headerClass}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-red/20 to-transparent flex items-center justify-center border border-accent-red/20">
              <span className="material-symbols-outlined text-accent-red">imagesmode</span>
            </div>
            البانر الرئيسي (Hero Banner)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>العنوان العريض (Head Title)</label>
              <input
                type="text"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                required
                placeholder="الكلمة الرئيسية"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>صورة اللاب توب (Desktop Image)</label>

              {/* File Upload Option */}
              <div className="flex items-center gap-3">
                <label className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-body text-sm py-3 px-4 rounded-xl cursor-pointer transition-colors w-full md:w-auto text-center shrink-0">
                  <span className="material-symbols-outlined text-accent-red">cloud_upload</span>
                  {uploadingHero ? `جاري الرفع ${heroUploadProgress}%...` : 'رفع من الجهاز'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleHeroImageUpload}
                    disabled={uploadingHero}
                  />
                </label>

                <span className="text-text-muted text-xs font-body">أو أدخل الرابط:</span>
              </div>

              {/* Manual URL Input */}
              <div className="relative">
                <input
                  type="text"
                  value={heroImg}
                  onChange={(e) => setHeroImg(e.target.value)}
                  required
                  placeholder="https://..."
                  className={`${inputClass} text-left pr-10`}
                  dir="ltr"
                />
                {heroImg && (
                  <a
                    href={heroImg}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    title="تحميل الصورة الحالية"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined">download</span>
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>صورة الموبايل (Mobile Image) <span className="text-text-muted text-[10px] font-normal">(اختياري - يفضل 1080x1350)</span></label>

              <div className="flex items-center gap-3">
                <label className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-body text-sm py-3 px-4 rounded-xl cursor-pointer transition-colors w-full md:w-auto text-center shrink-0">
                  <span className="material-symbols-outlined text-accent-red">cloud_upload</span>
                  {uploadingMobileHero ? `جاري الرفع ${heroMobileUploadProgress}%...` : 'رفع من الجهاز'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleHeroMobileImageUpload}
                    disabled={uploadingMobileHero}
                  />
                </label>
                <span className="text-text-muted text-xs font-body">أو أدخل الرابط:</span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={heroMobileImg}
                  onChange={(e) => setHeroMobileImg(e.target.value)}
                  placeholder="إذا تُركت فارغة ستُستخدم صورة اللاب توب"
                  className={`${inputClass} text-left pr-10`}
                  dir="ltr"
                />
                {heroMobileImg && (
                  <a
                    href={heroMobileImg}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    title="تحميل الصورة الحالية"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined">download</span>
                  </a>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>العنوان الفرعي (Sub description)</label>
              <input
                type="text"
                value={heroSub}
                onChange={(e) => setHeroSub(e.target.value)}
                required
                placeholder="وصف تحفيزي للبانر"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>نص زر الحركة (CTA Text)</label>
              <input
                type="text"
                value={heroCtaText}
                onChange={(e) => setHeroCtaText(e.target.value)}
                required
                placeholder="مثال: اطلب دلوقتي"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>رابط التوجيه لزر الحركة (CTA Redirect Link)</label>
              <input
                type="text"
                value={heroCtaLink}
                onChange={(e) => setHeroCtaLink(e.target.value)}
                required
                placeholder="/products"
                className={`${inputClass} text-left`}
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Promo Banner */}
        <div className={sectionClass}>
          <h2 className={headerClass}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-red/20 to-transparent flex items-center justify-center border border-accent-red/20">
              <span className="material-symbols-outlined text-accent-red">campaign</span>
            </div>
            بانر العروض العلوي (Promo Banner)
          </h2>

          <div className="bg-bg-primary/30 p-4 rounded-xl border border-white/5">
            <ToggleSwitch
              id="promoIsActive"
              checked={promoIsActive}
              onChange={setPromoIsActive}
              label="تفعيل وعرض البانر العلوي بالمتجر"
            />
          </div>

          <div>
            <label className={labelClass}>نص الإعلان أو الخصم المعروض</label>
            <input
              type="text"
              placeholder="مثال: خصم 20% احتفالاً بنهاية العام!"
              value={promoText}
              onChange={(e) => setPromoText(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Section 3: Contact coordinates */}
        <div className={sectionClass}>
          <h2 className={headerClass}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-red/20 to-transparent flex items-center justify-center border border-accent-red/20">
              <span className="material-symbols-outlined text-accent-red">support_agent</span>
            </div>
            بيانات التواصل وخدمة العملاء
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={labelClass}>رقم الهاتف المصري</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-muted">call</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+201xxxxxxxxx"
                  className={`${inputClass} text-left pl-12`}
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>رقم واتساب الرسمي للدعم</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-muted">chat</span>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  required
                  placeholder="+201xxxxxxxxx"
                  className={`${inputClass} text-left pl-12`}
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>البريد الإلكتروني للدعم</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-muted">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="support@xpower.com"
                  className={`${inputClass} text-left pl-12`}
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3.4b: Enabled Payment Methods (طرق الدفع المفعّلة) */}
        <div className={sectionClass}>
          <h2 className={headerClass}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-red/20 to-transparent flex items-center justify-center border border-accent-red/20">
              <span className="material-symbols-outlined text-accent-red">credit_card</span>
            </div>
            طرق الدفع المفعّلة
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-bg-primary/30 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
              <ToggleSwitch
                id="codEnabled"
                checked={codEnabled}
                onChange={setCodEnabled}
                label="الدفع عند الاستلام"
              />
              <p className="text-[11px] text-text-muted mt-2 mr-14">
                تفعيل أو تعطيل خيار الدفع عند الاستلام مع نظام الديبوزيت للعملاء في صفحة إتمام الطلب.
              </p>
            </div>

            <div className="bg-bg-primary/30 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
              <ToggleSwitch
                id="vodafoneCashEnabled"
                checked={vodafoneCashEnabled}
                onChange={setVodafoneCashEnabled}
                label="فودافون كاش"
              />
              <p className="text-[11px] text-text-muted mt-2 mr-14">
                تفعيل خيار الدفع والتحويل المباشر عبر محافظ فودافون كاش.
              </p>
            </div>

            <div className="bg-bg-primary/30 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
              <ToggleSwitch
                id="instapayEnabled"
                checked={instapayEnabled}
                onChange={setInstapayEnabled}
                label="انستاباي"
              />
              <p className="text-[11px] text-text-muted mt-2 mr-14">
                تفعيل خيار الدفع الفوري السريع عبر شبكة وتطبيق InstaPay.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3.5: Payment Receiving Info (Vodafone Cash & InstaPay) */}
        <div className={sectionClass}>
          <h2 className={headerClass}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-red/20 to-transparent flex items-center justify-center border border-accent-red/20">
              <span className="material-symbols-outlined text-accent-red">payments</span>
            </div>
            بيانات استقبال الدفع (فودافون كاش & انستاباي)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>رقم محفظة فودافون كاش لاستقبال الدفع</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-rose-500">account_balance_wallet</span>
                <input
                  type="tel"
                  value={vodafoneCashReceiving}
                  onChange={(e) => setVodafoneCashReceiving(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className={`${inputClass} text-left pl-12`}
                  dir="ltr"
                />
              </div>
              <p className="text-[11px] text-text-muted mt-1.5">الرقم الذي يظهر للعملاء لتحويل مبالغ فودافون كاش وديبوزيت الشحن عليه.</p>
            </div>

            <div>
              <label className={labelClass}>رقم / يوزرنيم انستاباي لاستقبال الدفع (InstaPay Handle/IPA)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-purple-400">send_to_mobile</span>
                <input
                  type="text"
                  value={instapayReceiving}
                  onChange={(e) => setInstapayReceiving(e.target.value)}
                  placeholder="username@instapay أو 01XXXXXXXXX"
                  className={`${inputClass} text-left pl-12`}
                  dir="ltr"
                />
              </div>
              <p className="text-[11px] text-text-muted mt-1.5">العنوان أو الرقم الذي يظهر للعملاء لتحويل مبالغ انستاباي وديبوزيت الشحن عليه.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-white/5">
            <div>
              <label className={labelClass}>رابط دفع فودافون كاش المخصص (اختياري)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-rose-500">link</span>
                <input
                  type="url"
                  value={vodafoneCashPaymentLink}
                  onChange={(e) => setVodafoneCashPaymentLink(e.target.value)}
                  placeholder="https://... (اتركه فارغاً للاعتماد على كود التحويل المباشر)"
                  className={`${inputClass} text-left pl-12`}
                  dir="ltr"
                />
              </div>
              <p className="text-[11px] text-text-muted mt-1.5">إذا تركته فارغاً، سيتم توجيه الهاتف لكود التحويل المباشر السريع (*9*7*الرقم*المبلغ#) تلقائياً بمبلغ الطلب ورقم المحفظة.</p>
            </div>

            <div>
              <label className={labelClass}>رابط الدفع المباشر من انستاباي (Share Link من التطبيق)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-purple-400">link</span>
                <input
                  type="url"
                  value={instapayPaymentLink}
                  onChange={(e) => setInstapayPaymentLink(e.target.value)}
                  placeholder="https://ipn.eg/S/xxxx"
                  className={`${inputClass} text-left pl-12`}
                  dir="ltr"
                />
              </div>
              <p className="text-[11px] text-text-muted mt-1.5">انسخ رابط المشاركة (Share Link) من داخل تطبيق انستاباي وضعه هنا، لفتح صفحة تحويل المبلغ المباشرة للعميل داخل التطبيق.</p>
            </div>
          </div>
        </div>

        {/* Section 3.6: Free Shipping & Deposit Settings */}
        <div className={sectionClass}>
          <h2 className={headerClass}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-red/20 to-transparent flex items-center justify-center border border-accent-red/20">
              <span className="material-symbols-outlined text-accent-red">local_shipping</span>
            </div>
            إعدادات الشحن المجاني وديبوزيت الكاش (Free Shipping & Deposit)
          </h2>

          <div className="bg-bg-primary/30 p-4 rounded-xl border border-white/5">
            <ToggleSwitch
              id="freeShippingEnabled"
              checked={freeShippingEnabled}
              onChange={setFreeShippingEnabled}
              label="تفعيل ميزة الشحن المجاني للأوردرات المؤهلة"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>الحد الأدنى لقيمة الأوردر للشحن المجاني (EGP)</label>
              <input
                type="number"
                min="0"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
                placeholder="1000"
                className={`${inputClass} text-left`}
                dir="ltr"
              />
              <p className="text-[11px] text-text-muted mt-1.5">إذا تجاوز إجمالي المشتريات هذا المبلغ، يصبح الشحن مجانياً تلقائياً.</p>
            </div>

            <div>
              <label className={labelClass}>قيمة الديبوزيت المطلوبة لو الشحن مجاني (جنيه)</label>
              <input
                type="number"
                min="0"
                value={freeShippingDepositAmount}
                onChange={(e) => setFreeShippingDepositAmount(Number(e.target.value))}
                placeholder="100"
                className={`${inputClass} text-left`}
                dir="ltr"
              />
              <p className="text-[11px] text-text-muted mt-1.5">مبلغ الديبوزيت التأميني الثابت المطلوب عند اختيار الدفع عند الاستلام لو الشحن مجاني (يُخصم تلقائياً من إجمالي الأوردر).</p>
            </div>
          </div>
        </div>

        {/* Section 3.7: Maintenance Mode (وضع الصيانة) */}
        <div className={sectionClass}>
          <h2 className={headerClass}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-red/20 to-transparent flex items-center justify-center border border-accent-red/20">
              <span className="material-symbols-outlined text-accent-red">construction</span>
            </div>
            وضع الصيانة والتطوير (Maintenance Mode)
          </h2>

          <div className="bg-bg-primary/30 p-4 rounded-xl border border-white/5 flex flex-col gap-2">
            <ToggleSwitch
              id="maintenanceActive"
              checked={maintenanceActive}
              onChange={setMaintenanceActive}
              label="تفعيل شاشة وضع الصيانة للزوار (Maintenance Mode)"
            />
            <p className="text-xs text-text-muted mr-14">
              عند التفعيل: تظهر للزوار على الموقع شاشة صيانة رسمية موحدة تعكس هوية البراند وتمنع إنشاء الطلبات مؤقتاً، مع زر مباشر لمحادثة الدعم على واتساب.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className={labelClass}>عنوان صفحة الصيانة الرئيسي</label>
              <input
                type="text"
                value={maintenanceTitle}
                onChange={(e) => setMaintenanceTitle(e.target.value)}
                placeholder="الموقع تحت الصيانة والتطوير"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>رسالة الصيانة التوضيحية للعملاء</label>
              <textarea
                rows={3}
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="نعمل حالياً على تحسين وتطوير تجربة التسوق لنقدم لكم أفضل خدمة مكملات غذائية. سنعود للعمل قريباً جداً."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>الوقت المتوقع للعودة أو الانتهاء (اختياري)</label>
              <input
                type="text"
                value={maintenanceEstimatedEndTime}
                onChange={(e) => setMaintenanceEstimatedEndTime(e.target.value)}
                placeholder="مثال: اليوم الساعة 10:00 مساءً أو خلال ساعتين"
                className={inputClass}
              />
              <p className="text-[11px] text-text-muted mt-1.5">إذا كُتبت، ستظهر داخل شارة مؤقت زمني أنيقة على شاشة الصيانة للزوار.</p>
            </div>
          </div>
        </div>

        {/* Section 4: Social Links & Trust Badges */}
        <div className={sectionClass}>
          <h2 className={headerClass}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-red/20 to-transparent flex items-center justify-center border border-accent-red/20">
              <span className="material-symbols-outlined text-accent-red">public</span>
            </div>
            روابط السوشيال وشريط رسائل الثقة
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-white/5 pb-8">
            <div>
              <label className={labelClass}>رابط فيسبوك (Facebook)</label>
              <input
                type="text"
                placeholder="https://facebook.com/..."
                value={fb}
                onChange={(e) => setFb(e.target.value)}
                className={`${inputClass} text-left`}
                dir="ltr"
              />
            </div>

            <div>
              <label className={labelClass}>رابط إنستجرام (Instagram)</label>
              <input
                type="text"
                placeholder="https://instagram.com/..."
                value={insta}
                onChange={(e) => setInsta(e.target.value)}
                className={`${inputClass} text-left`}
                dir="ltr"
              />
            </div>

            <div>
              <label className={labelClass}>رابط تيك توك (TikTok)</label>
              <input
                type="text"
                placeholder="https://tiktok.com/..."
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                className={`${inputClass} text-left`}
                dir="ltr"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className={labelClass}>شريط رسائل الثقة المتحرك (مفصولة بفاصلة)</label>
            <input
              type="text"
              placeholder="منتجات أصلية 100%, شحن سريع خلال 24 ساعة, دفع عند الاستلام"
              value={trustBadgesRaw}
              onChange={(e) => setTrustBadgesRaw(e.target.value)}
              className={inputClass}
            />
            <p className="text-xs text-text-muted mt-2 font-body">اكتب العبارات مفصولة بفاصلة ( , ) لتظهر في الشريط المتحرك.</p>
          </div>
        </div>

        {/* Section 5: Flash Sale */}
        <div className={sectionClass}>
          <h2 className={headerClass}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-red/20 to-transparent flex items-center justify-center border border-accent-red/20">
              <span className="material-symbols-outlined text-accent-red">bolt</span>
            </div>
            عروض لفترة محدودة (Flash Sale)
          </h2>

          <div className="bg-bg-primary/30 p-4 rounded-xl border border-white/5 mb-2">
            <ToggleSwitch
              id="flashSaleActive"
              checked={flashSaleActive}
              onChange={setFlashSaleActive}
              label="تفعيل قسم الـ Flash Sale في الصفحة الرئيسية"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>المنتج (Product)</label>
              <select
                value={flashSaleProductId}
                onChange={(e) => setFlashSaleProductId(e.target.value)}
                className={inputClass}
              >
                <option value="">-- اختر منتج --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>تاريخ ووقت انتهاء العرض (End Date)</label>
              <input
                type="datetime-local"
                value={flashSaleEndDate}
                onChange={(e) => setFlashSaleEndDate(e.target.value)}
                className={`${inputClass} text-left`}
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Section 6: Best Sellers */}
        <div className={sectionClass}>
          <h2 className={headerClass}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-red/20 to-transparent flex items-center justify-center border border-accent-red/20">
              <span className="material-symbols-outlined text-accent-red">star</span>
            </div>
            المنتجات الأكثر مبيعاً (Best Sellers)
          </h2>

          <div className="bg-bg-primary/30 p-4 rounded-xl border border-white/5">
            <ToggleSwitch
              id="bestSellersActive"
              checked={bestSellersActive}
              onChange={setBestSellersActive}
              label="تفعيل قسم الأكثر مبيعاً (يتم حساب المنتجات آلياً)"
            />
          </div>
        </div>

        {/* Section 7: Authenticity Check */}
        <div className={sectionClass}>
          <h2 className={headerClass}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-red/20 to-transparent flex items-center justify-center border border-accent-red/20">
              <span className="material-symbols-outlined text-accent-red">verified</span>
            </div>
            التحقق من المنتجات
          </h2>

          <div className="bg-bg-primary/30 p-4 rounded-xl border border-white/5">
            <ToggleSwitch
              id="authenticityCheckActive"
              checked={authenticityCheckActive}
              onChange={setAuthenticityCheckActive}
              label="إظهار قسم التحقق من المنتجات في الصفحة الرئيسية"
            />
            <p className="text-xs text-text-muted mt-3 font-body pr-16">
              عند التفعيل، يظهر قسم في أسفل الصفحة الرئيسية يتيح للعميل إدخال الكود الموجود على العلبة والتحقق من أصالة المنتج. يمكن إدارة الأكواد من صفحة <span className="text-accent-red font-bold">أكواد الأصالة</span>.
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="sticky bottom-4 z-10 flex justify-end gap-3.5 bg-bg-elevated/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl mt-8">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 bg-accent-red hover:bg-red-600 disabled:opacity-50 text-white font-product-title font-bold px-10 py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_5px_20px_rgba(227,30,36,0.3)] text-sm"
          >
            {submitting ? (
              <>
                <Spinner className="inline-block animate-spin w-5 h-5" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">save</span>
                <span>حفظ التعديلات</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
}
