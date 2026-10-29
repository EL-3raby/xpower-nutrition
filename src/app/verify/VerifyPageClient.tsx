'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase/client';
import { doc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import { SiteConfig } from '@/lib/types';

type VerifyState = 'idle' | 'loading' | 'not_found' | 'valid' | 'already_used';
interface VerifyResult { state: VerifyState; productName?: string; usedAt?: Date; }
function normalizeCode(code: string): string { return code.trim().toUpperCase(); }
function formatWhatsappNumber(num: string): string {
  let clean = num.replace(/\D/g, '');
  if (!clean) return '';
  if (clean.startsWith('0')) {
    clean = '20' + clean.slice(1);
  } else if (!clean.startsWith('20') && clean.length === 10) {
    clean = '20' + clean;
  }
  return clean;
}

interface Props { initialSettings: SiteConfig; }

export default function VerifyPageClient({ initialSettings }: Props) {
  const [codeInput, setCodeInput] = useState('');
  const [result, setResult] = useState<VerifyResult>({ state: 'idle' });
  const whatsapp = initialSettings.contactInfo?.whatsapp || '';

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = normalizeCode(codeInput);
    if (!cleanCode) return;
    setResult({ state: 'loading' });
    try {
      const codeRef = doc(db, 'authenticityCodes', cleanCode);
      const txResult = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(codeRef);
        if (!snap.exists()) return { state: 'not_found' as VerifyState };
        const data = snap.data();
        if (data.isUsed === true) {
          const usedAt = data.usedAt instanceof Timestamp ? data.usedAt.toDate() : data.usedAt ? new Date(data.usedAt) : undefined;
          return { state: 'already_used' as VerifyState, productName: data.productName, usedAt };
        }
        transaction.update(codeRef, { isUsed: true, usedAt: serverTimestamp() });
        return { state: 'valid' as VerifyState, productName: data.productName };
      });
      setResult(txResult);
    } catch (err: any) {
      console.error('Authenticity verification error:', err);
      setResult({ state: 'not_found' });
    }
  };

  const resetForm = () => { setCodeInput(''); setResult({ state: 'idle' }); };
  const isIdle = result.state === 'idle' || result.state === 'loading';

  return (
    <main className="min-h-screen bg-[#050505] flex flex-col" dir="rtl">

      {/* Back nav */}
      <div className="px-6 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/30 hover:text-white/70 text-sm font-body transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
          الرجوع للرئيسية
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-8 py-6 md:py-12">
        <div className="w-full max-w-5xl">

          {/* Top badge */}
          <div className="flex justify-center mb-6 md:mb-10">
            <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-accent-red via-red-600 to-[#b81419] border border-red-400/40 shadow-[0_4px_25px_rgba(227,30,36,0.45)] px-5 md:px-6 py-2.5 rounded-full text-center">
              <span className="material-symbols-outlined text-base text-white animate-pulse shrink-0">verified</span>
              <span className="text-white text-xs md:text-sm font-black font-body tracking-wide">
                نظام التحقق من المنتجات — Xpower Nutrition
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-x-14 md:gap-y-6 items-start">

            {/* 1. Header Info: Top on mobile, Col 1 Row 1 on desktop */}
            <div className="md:col-start-1 md:row-start-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-[2px] bg-accent-red" />
                <span className="text-accent-red font-body text-xs font-bold uppercase tracking-[0.2em]">ضمان الجودة</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.05] mb-5">
                منتجك أصلي؟<br />
                <span className="text-accent-red">تأكد دلوقتي</span>
              </h1>
              <p className="font-body text-white/45 text-base leading-relaxed max-w-sm">
                كل علبة Xpower عليها شريط تخربشه لإظهار كود التحقق — ادخله هنا وهنأكدلك في ثانية إن المنتج وصلك أصلي 100%.
              </p>
            </div>

            {/* 2. Right: interactive verification card: Second on mobile, Col 2 spanning rows on desktop */}
            <div className="relative md:col-start-2 md:row-start-1 md:row-span-2">
              <div className="absolute -inset-4 bg-accent-red/10 rounded-3xl blur-3xl pointer-events-none" />

              <div className="relative bg-[#0a0a0a] border border-accent-red/30 rounded-2xl overflow-hidden shadow-[0_15px_50px_rgba(0,0,0,0.8)]">

                {/* Card header stripe - Bold Red Header with Crisp White Text */}
                <div className="bg-gradient-to-r from-accent-red via-red-600 to-[#800000] px-6 py-5 flex items-center justify-between border-b border-red-500/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 shadow-sm backdrop-blur-sm">
                      <span className="material-symbols-outlined text-white text-xl">verified</span>
                    </div>
                    <div>
                      <p className="text-white font-black text-base md:text-lg font-display leading-tight">التحقق من المنتجات</p>
                      <p className="text-white/80 text-xs font-body mt-0.5">Xpower Nutrition — Official Verification</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 bg-black/20 border border-white/15 px-3 py-1 rounded-full text-[11px] text-white/90 font-body">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    مؤمّن 100%
                  </div>
                </div>

                <div className="p-6 md:p-8 flex flex-col gap-6">

                  {/* Form */}
                  {isIdle && (
                    <form onSubmit={handleVerify} className="flex flex-col gap-5">
                      <div>
                        <label className="block text-white font-bold text-xs font-body uppercase tracking-[0.15em] mb-2.5">
                          كود المنتج
                        </label>
                        <input
                          id="verify-page-code-input"
                          type="text"
                          placeholder="xpower213"
                          value={codeInput}
                          onChange={e => setCodeInput(e.target.value)}
                          disabled={result.state === 'loading'}
                          required
                          dir="ltr"
                          maxLength={50}
                          className="w-full bg-black/80 text-white border-2 border-accent-red/40 rounded-xl px-6 py-4.5 font-mono text-2xl font-black uppercase tracking-[0.25em] placeholder:text-white/25 placeholder:tracking-wider placeholder:font-mono focus:outline-none focus:border-accent-red focus:ring-4 focus:ring-accent-red/20 transition-all text-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]"
                        />
                        <p className="text-white/60 text-xs font-body mt-2.5 text-center flex items-center justify-center gap-1.5">
                          <span className="material-symbols-outlined text-accent-red text-sm">info</span>
                          الكود موجود تحت الطبقة الرمادية على العلبة
                        </p>
                      </div>

                      <button
                        id="verify-page-submit-btn"
                        type="submit"
                        disabled={result.state === 'loading' || !codeInput.trim()}
                        className="relative w-full flex items-center justify-center gap-3 bg-gradient-to-r from-accent-red via-red-600 to-[#b81419] hover:from-red-600 hover:to-accent-red text-white font-black py-4 rounded-xl text-base transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden group cursor-pointer shadow-[0_10px_35px_rgba(227,30,36,0.35)]"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                        {result.state === 'loading' ? (
                          <>
                            <svg className="w-5 h-5 animate-spin shrink-0 text-white" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-white font-bold">بنتحقق...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-xl text-white">shield</span>
                            <span className="text-white font-black">تحقق من الكود</span>
                          </>
                        )}
                      </button>

                      <p className="text-center text-white/50 text-xs font-body">
                        كل كود بيتحقق منه مرة واحدة بس ويتسجل تلقائياً
                      </p>
                    </form>
                  )}

                  {/* Result: Valid */}
                  {result.state === 'valid' && (
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col items-center text-center gap-4 py-6">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-emerald-400 text-4xl">check_circle</span>
                        </div>
                        <div>
                          <p className="font-display text-emerald-400 font-black text-2xl mb-1">المنتج أصلي 100%</p>
                          {result.productName && (
                            <p className="text-white/40 text-sm font-body">{result.productName}</p>
                          )}
                        </div>
                        <p className="font-body text-white/50 text-sm leading-relaxed max-w-xs">
                          مبروك! المنتج اللي في إيدك أصلي وتم تسجيل الكود ده باسمك دلوقتي. أهلاً بيك في عيلة Xpower 💪
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={resetForm}
                          id="verify-page-another-btn"
                          className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white font-body text-sm font-bold py-3 rounded-xl transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">refresh</span>
                          تحقق من كود تاني
                        </button>
                        <Link
                          href="/products"
                          className="flex-1 flex items-center justify-center gap-2 bg-accent-red hover:bg-red-500 text-white font-bold py-3 rounded-xl text-sm transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">shopping_bag</span>
                          تسوّق دلوقتي
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Result: Already Used */}
                  {result.state === 'already_used' && (
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col items-center text-center gap-4 py-6">
                        <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-amber-400 text-4xl">warning</span>
                        </div>
                        <div>
                          <p className="font-display text-amber-400 font-black text-2xl mb-1">الكود اتحقق منه قبل كده</p>
                          {result.usedAt && (
                            <p className="text-white/30 text-xs font-body mt-1">
                              {result.usedAt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                        <p className="font-body text-white/50 text-sm leading-relaxed max-w-xs">
                          لو إنت مش اللي اتحققت منه، ممكن المنتج ده يكون اتفتح قبل ما يوصلك — كلمنا على واتساب وهنساعدك.
                        </p>
                      </div>
                      <div className="flex flex-col gap-3">
                        {whatsapp && (
                          <a
                            href={`https://wa.me/${formatWhatsappNumber(whatsapp)}?text=${encodeURIComponent(`عايز أستفسر عن كود المنتج: ${normalizeCode(codeInput)}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            id="verify-page-whatsapp-btn"
                            className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1fb554] text-white font-bold py-3.5 rounded-xl text-sm transition-all hover:scale-[1.01] cursor-pointer shadow-[0_4px_20px_rgba(37,211,102,0.15)]"
                          >
                            <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            كلمنا على واتساب دلوقتي
                          </a>
                        )}
                        <button
                          onClick={resetForm}
                          id="verify-page-retry-btn-used"
                          className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/8 text-white/40 hover:text-white font-body text-sm py-3 rounded-xl transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">refresh</span>
                          تحقق من كود تاني
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Result: Not Found */}
                  {result.state === 'not_found' && (
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col items-center text-center gap-4 py-6">
                        <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-red-400 text-4xl">error</span>
                        </div>
                        <div>
                          <p className="font-display text-red-400 font-black text-2xl mb-1">الكود غلط أو مش موجود</p>
                          <p className="text-white/25 text-xs font-body mt-1">تأكد من الكود وحاول تاني</p>
                        </div>
                        <p className="font-body text-white/50 text-sm leading-relaxed max-w-xs">
                          مش لاقيين الكود ده عندنا — تأكد إنك كتبته صح. أحياناً بيكون في أماكن مختلفة على العلبة. لو محتاج مساعدة كلمنا.
                        </p>
                      </div>
                      <button
                        onClick={resetForm}
                        id="verify-page-retry-btn"
                        className="w-full flex items-center justify-center gap-2 bg-accent-red hover:bg-red-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">refresh</span>
                        جرب تاني
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* 3. Steps & Trust indicators: Third on mobile (under the card), Col 1 Row 2 on desktop */}
            <div className="flex flex-col gap-6 md:col-start-1 md:row-start-2">
              <div className="flex flex-col gap-6 border-t border-white/5 pt-8">
                <p className="text-white/25 text-xs font-body uppercase tracking-[0.15em]">خطوات التحقق</p>
                {[
                  { n: '1', title: 'خربش الشريط', text: 'خربش الطبقة الرمادية الموجودة على العلبة لإظهار الكود' },
                  { n: '2', title: 'أدخل الكود', text: 'اكتبه في الخانة المجاورة واضغط تحقق' },
                  { n: '3', title: 'النتيجة فورية', text: 'هتعرف على طول إذا كان المنتج أصلي أو لا' },
                ].map(step => (
                  <div key={step.n} className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-red via-red-600 to-red-800 border border-red-500/40 shadow-[0_0_15px_rgba(227,30,36,0.35)] flex items-center justify-center shrink-0 font-display font-black text-white text-sm tracking-wider mt-0.5 group-hover:scale-110 transition-transform duration-300">
                      {step.n}
                    </div>
                    <div className="pt-0.5">
                      <p className="text-white font-body text-sm font-bold mb-0.5">{step.title}</p>
                      <p className="text-white/40 font-body text-xs leading-relaxed">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap gap-3 pt-2">
                {[
                  { icon: 'security', label: 'مؤمّن' },
                  { icon: 'lock', label: 'كل كود يُستخدم مرة' },
                  { icon: 'speed', label: 'نتيجة فورية' },
                ].map(t => (
                  <div key={t.label} className="flex items-center gap-1.5 bg-white/[0.03] border border-white/5 px-3 py-1.5 rounded-full">
                    <span className="material-symbols-outlined text-white/20 text-sm">{t.icon}</span>
                    <span className="text-white/25 text-xs font-body">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

    </main>
  );
}

