'use client';

import React, { useState } from 'react';
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

interface Props { settings: SiteConfig; }

export default function AuthenticitySection({ settings }: Props) {
  const [codeInput, setCodeInput] = useState('');
  const [result, setResult] = useState<VerifyResult>({ state: 'idle' });
  const whatsapp = settings.contactInfo?.whatsapp || '';

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
    <section className="relative overflow-hidden bg-[#050505] border-t border-white/5" id="authenticity-check" dir="rtl">
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '12px 12px' }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-x-16 md:gap-y-6 items-center">

          {/* 1. Header info: First on mobile, Col 1 Row 1 on desktop */}
          <div className="flex flex-col gap-4 md:col-start-1 md:row-start-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-[2px] bg-accent-red" />
              <span className="text-accent-red font-body text-xs font-bold uppercase tracking-[0.2em]">ضمان الجودة</span>
            </div>

            <div>
              <h2 className="font-display text-4xl md:text-5xl font-black text-white leading-[1.1] mb-4">
                منتجك أصلي؟<br />
                <span className="text-accent-red">تأكد دلوقتي</span>
              </h2>
              <p className="font-body text-white/50 text-[15px] leading-relaxed max-w-sm">
                كل علبة Xpower عليها شريط تخربشه لإظهار كود التحقق — ادخله في الخانة دي وهنأكدلك في ثانية إن المنتج وصلك أصلي 100%.
              </p>
            </div>
          </div>

          {/* 2. Right: card (appears second on mobile, Col 2 spanning rows on desktop) */}
          <div className="relative md:col-start-2 md:row-start-1 md:row-span-2">
            <div className="absolute -inset-4 bg-accent-red/10 rounded-3xl blur-3xl pointer-events-none" />
            <div className="relative bg-[#0a0a0a] border border-accent-red/30 rounded-2xl overflow-hidden shadow-[0_15px_50px_rgba(0,0,0,0.8)]">

              {/* Header stripe - Bold Red Header with Crisp White Text */}
              <div className="bg-gradient-to-r from-accent-red via-red-600 to-[#800000] px-6 py-4 flex items-center justify-between border-b border-red-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 shadow-sm backdrop-blur-sm">
                    <span className="material-symbols-outlined text-white text-lg">verified</span>
                  </div>
                  <div>
                    <p className="text-white font-black text-sm md:text-base font-display leading-tight">التحقق من المنتجات</p>
                    <p className="text-white/80 text-[11px] font-body mt-0.5">أدخل الكود الموجود تحت طبقة الخربشة</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 bg-black/20 border border-white/15 px-3 py-1 rounded-full text-[11px] text-white/90 font-body">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  مؤمّن 100%
                </div>
              </div>

              <div className="p-6 md:p-8 flex flex-col gap-6">

                {isIdle && (
                  <form onSubmit={handleVerify} className="flex flex-col gap-5">
                    <input
                      id="authenticity-code-input"
                      type="text"
                      placeholder="مثال: xpower213"
                      value={codeInput}
                      onChange={e => setCodeInput(e.target.value)}
                      disabled={result.state === 'loading'}
                      required
                      dir="ltr"
                      className="w-full bg-black/80 text-white border-2 border-accent-red/40 rounded-xl px-5 py-4 font-mono text-base uppercase tracking-[0.15em] placeholder:text-white/25 placeholder:normal-case placeholder:tracking-normal placeholder:font-body focus:outline-none focus:border-accent-red focus:ring-4 focus:ring-accent-red/20 transition-all text-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]"
                    />
                    <button
                      id="verify-code-btn"
                      type="submit"
                      disabled={result.state === 'loading' || !codeInput.trim()}
                      className="relative w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-accent-red via-red-600 to-[#b81419] hover:from-red-600 hover:to-accent-red text-white font-black py-4 rounded-xl text-sm transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden group cursor-pointer shadow-[0_8px_30px_rgba(227,30,36,0.35)]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                      {result.state === 'loading' ? (
                        <>
                          <svg className="w-4 h-4 animate-spin shrink-0 text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-white font-bold">بنتحقق...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base text-white">shield</span>
                          <span className="text-white font-black">تحقق من الكود</span>
                        </>
                      )}
                    </button>
                    <p className="text-center text-white/50 text-xs font-body">كل كود بيتحقق منه مرة واحدة بس</p>
                  </form>
                )}

              {result.state === 'valid' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4 p-4 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
                    <div className="w-11 h-11 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-emerald-400 text-xl">check_circle</span>
                    </div>
                    <div>
                      <p className="text-emerald-400 font-bold font-body text-sm">المنتج أصلي 100%</p>
                      {result.productName && <p className="text-white/40 text-xs font-body mt-0.5">{result.productName}</p>}
                    </div>
                  </div>
                  <p className="text-white/50 font-body text-sm leading-relaxed">
                    مبروك! المنتج اللي في إيدك أصلي وتم تسجيل الكود ده باسمك دلوقتي. أهلاً بيك في عيلة Xpower 💪
                  </p>
                  <button onClick={resetForm} id="verify-another-btn" className="self-start text-white/30 hover:text-white/60 text-xs font-body transition-colors cursor-pointer flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">refresh</span>تحقق من كود تاني
                  </button>
                </div>
              )}

              {result.state === 'already_used' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4 p-4 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                    <div className="w-11 h-11 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-amber-400 text-xl">warning</span>
                    </div>
                    <div>
                      <p className="text-amber-400 font-bold font-body text-sm">الكود ده اتحقق منه قبل كده</p>
                      {result.usedAt && <p className="text-white/30 text-xs font-body mt-0.5">{result.usedAt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
                    </div>
                  </div>
                  <p className="text-white/50 font-body text-sm leading-relaxed">
                    لو إنت مش اللي اتحققت منه، ممكن المنتج ده يكون اتفتح قبل ما يوصلك — كلمنا على واتساب وهنساعدك.
                  </p>
                  {whatsapp && (
                    <a
                      href={`https://wa.me/${formatWhatsappNumber(whatsapp)}?text=${encodeURIComponent('عايز أستفسر عن كود المنتج: ' + normalizeCode(codeInput))}`}
                      target="_blank" rel="noopener noreferrer" id="whatsapp-contact-btn"
                      className="flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1fb554] text-white font-bold py-3.5 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-[0_4px_20px_rgba(37,211,102,0.2)]"
                    >
                      <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                      كلمنا على واتساب دلوقتي
                    </a>
                  )}
                  <button onClick={resetForm} id="verify-another-btn-2" className="self-start text-white/30 hover:text-white/60 text-xs font-body transition-colors cursor-pointer flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">refresh</span>تحقق من كود تاني
                  </button>
                </div>
              )}

              {result.state === 'not_found' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4 p-4 bg-red-500/8 border border-red-500/20 rounded-xl">
                    <div className="w-11 h-11 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-red-400 text-xl">error</span>
                    </div>
                    <div>
                      <p className="text-red-400 font-bold font-body text-sm">الكود غلط أو مش موجود</p>
                      <p className="text-white/30 text-xs font-body mt-0.5">تأكد من الكود وحاول تاني</p>
                    </div>
                  </div>
                  <p className="text-white/50 font-body text-sm leading-relaxed">
                    مش لاقيين الكود ده عندنا — تأكد إنك كتبته صح. أحياناً بيكون في أماكن مختلفة على العلبة. لو محتاج مساعدة كلمنا.
                  </p>
                  <button onClick={resetForm} id="retry-verify-btn" className="self-start text-white/30 hover:text-white/60 text-xs font-body transition-colors cursor-pointer flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">refresh</span>جرب تاني
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* 3. Steps: Third on mobile (under the card), Col 1 Row 2 on desktop */}
          <div className="flex flex-col gap-5 md:col-start-1 md:row-start-2 pt-2 md:pt-0">
            {([
              { n: '1', title: 'خربش الشريط', text: 'خربش الطبقة الرمادية الموجودة على العلبة لإظهار الكود' },
              { n: '2', title: 'أدخل الكود', text: 'اكتب الكود في الخانة بجانبك واضغط تحقق' },
              { n: '3', title: 'النتيجة فورية', text: 'هتعرف على طول إذا كان المنتج أصلي أو لا' },
            ] as const).map(step => (
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

        </div>
      </div>
    </section>
  );
}