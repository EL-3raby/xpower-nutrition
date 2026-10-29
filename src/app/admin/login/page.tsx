'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '@/lib/firebase/auth';
import Spinner from '@/components/ui/Spinner';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Initialize lockout state from localStorage on mount
  useEffect(() => {
    try {
      const storedLockout = localStorage.getItem('xpower_admin_lockout_until');
      if (storedLockout) {
        const lockoutUntil = parseInt(storedLockout, 10);
        const diff = Math.ceil((lockoutUntil - Date.now()) / 1000);
        if (diff > 0) {
          setLockoutRemaining(diff);
        } else {
          localStorage.removeItem('xpower_admin_lockout_until');
          localStorage.removeItem('xpower_admin_failed_attempts');
        }
      }

      const storedAttempts = localStorage.getItem('xpower_admin_failed_attempts');
      if (storedAttempts) {
        setFailedAttempts(parseInt(storedAttempts, 10) || 0);
      }
    } catch {
      // Safe fallback if localStorage is blocked
    }
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (lockoutRemaining <= 0) return;

    const interval = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          try {
            localStorage.removeItem('xpower_admin_lockout_until');
            localStorage.removeItem('xpower_admin_failed_attempts');
          } catch {}
          setFailedAttempts(0);
          setErrorMsg('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  const isLockedOut = lockoutRemaining > 0;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || isLockedOut) return;

    setLoading(true);
    setErrorMsg('');

    try {
      await adminLogin(email, password);
      // Reset attempts on successful authentication
      try {
        localStorage.removeItem('xpower_admin_lockout_until');
        localStorage.removeItem('xpower_admin_failed_attempts');
      } catch {}
      setFailedAttempts(0);
      setLockoutRemaining(0);
      router.push('/admin');
    } catch (err: any) {
      console.error('Login error:', err);
      
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      try {
        localStorage.setItem('xpower_admin_failed_attempts', String(newAttempts));
      } catch {}

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
        try {
          localStorage.setItem('xpower_admin_lockout_until', String(lockoutUntil));
        } catch {}
        setLockoutRemaining(LOCKOUT_DURATION_MS / 1000);
        setErrorMsg('تم تجاوز الحد الأقصى لمحاولات الدخول الخاطئة (5 محاولات). تم إيقاف المحاولات مؤقتاً لحماية الحساب من هجمات التخمين.');
      } else {
        const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
        let friendlyError = `البريد الإلكتروني أو كلمة المرور غير صحيحة. (متبقي ${remaining} محاولات قبل الإيقاف المؤقت)`;
        
        if (err.message && err.message.includes('صلاحيات')) {
          friendlyError = err.message;
        } else if (err.message && err.message.includes('auth/too-many-requests')) {
          friendlyError = 'تم رصد محاولات كثيرة جداً من هذا الجهاز. يرجى الانتظار والمحاولة لاحقاً.';
        }
        
        setErrorMsg(friendlyError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-[#050505]" dir="rtl">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 -right-1/4 w-[500px] h-[500px] bg-accent-red/20 rounded-full blur-[120px] pointer-events-none opacity-50"></div>
        <div className="absolute bottom-1/4 -left-1/4 w-[400px] h-[400px] bg-accent-red/10 rounded-full blur-[100px] pointer-events-none opacity-40"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
      </div>

      <div className="w-full max-w-md bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 p-8 sm:p-10 rounded-3xl flex flex-col gap-8 relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] group overflow-hidden">
        {/* Glow effect on hover */}
        <div className="absolute -inset-0.5 bg-gradient-to-br from-accent-red/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-3xl blur-md"></div>
        
        <div className="relative z-10">
          <div className="text-center space-y-3 mb-8">
            <div className="w-16 h-16 bg-accent-red/10 rounded-2xl border border-accent-red/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(227,30,36,0.15)]">
              <span className="material-symbols-outlined text-accent-red text-3xl">admin_panel_settings</span>
            </div>
            <span className="font-product-title text-2xl font-black text-white uppercase tracking-widest drop-shadow-md">XPOWER</span>
            <h1 className="font-display text-lg text-text-muted">تسجيل دخول الإدارة</h1>
          </div>

          {/* Security Lockout Banner */}
          {isLockedOut ? (
            <div className="mb-6 bg-red-950/40 border border-accent-red/40 rounded-xl p-4 flex flex-col gap-2 text-white animate-in fade-in">
              <div className="flex items-center gap-2 text-accent-red font-bold text-sm">
                <span className="material-symbols-outlined text-xl">security</span>
                <span>الحساب محمي مؤقتاً</span>
              </div>
              <p className="font-body text-xs text-text-muted leading-relaxed">
                تم تجاوز عدد محاولات الدخول الخاطئة. لحماية لوحة التحكم من محاولات التخمين، يمكنك المحاولة مجدداً بعد:
              </p>
              <div className="flex items-center justify-center gap-2 bg-black/50 py-2 rounded-lg font-product-title text-accent-red text-xl font-bold tracking-wider" dir="ltr">
                <span className="material-symbols-outlined text-lg">timer</span>
                <span>00:{lockoutRemaining < 10 ? `0${lockoutRemaining}` : lockoutRemaining}</span>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="mb-6 bg-accent-red/10 border border-accent-red/20 rounded-xl p-4 flex items-center gap-3 text-accent-red animate-in fade-in slide-in-from-top-2">
              <span className="material-symbols-outlined shrink-0 text-xl">error</span>
              <p className="font-body text-sm font-bold leading-relaxed">{errorMsg}</p>
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-6 text-right">
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs font-bold text-white/70 px-1">البريد الإلكتروني</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-white/30">
                  <span className="material-symbols-outlined text-lg">mail</span>
                </div>
                <input 
                  type="email" 
                  placeholder="admin@xpower.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || isLockedOut}
                  required
                  className="w-full bg-[#111] text-white border border-white/10 rounded-xl pr-11 pl-4 py-3.5 font-body text-sm focus:border-accent-red focus:ring-1 focus:ring-accent-red/50 focus:outline-none transition-all placeholder:text-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs font-bold text-white/70 px-1">كلمة المرور</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-white/30">
                  <span className="material-symbols-outlined text-lg">lock</span>
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || isLockedOut}
                  required
                  className="w-full bg-[#111] text-white border border-white/10 rounded-xl pr-11 pl-11 py-3.5 font-body text-sm focus:border-accent-red focus:ring-1 focus:ring-accent-red/50 focus:outline-none transition-all text-right placeholder:text-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-white/40 hover:text-white transition-colors cursor-pointer"
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button 
              type="submit" 
              disabled={loading || isLockedOut}
              className={`w-full py-4 mt-2 rounded-xl bg-accent-red hover:bg-accent-red-hover text-white font-display font-black text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(227,30,36,0.2)] hover:shadow-[0_0_30px_rgba(227,30,36,0.4)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
                loading ? 'opacity-70 cursor-wait' : ''
              }`}
            >
              {loading ? (
                <>
                  <Spinner className="inline-block w-5 h-5 animate-spin" />
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : isLockedOut ? (
                <>
                  <span className="material-symbols-outlined text-sm">lock_clock</span>
                  <span>موقوف مؤقتاً ({lockoutRemaining} ث)</span>
                </>
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <span className="material-symbols-outlined text-sm">login</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
