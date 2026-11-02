'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'xpower_cookie_consent';

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    try {
      const consent = localStorage.getItem(STORAGE_KEY);
      if (!consent) {
        // Polite delayed entrance so it doesn't jarringly pop up immediately upon initial load
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // In case localStorage is blocked by privacy mode
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {
      // Ignore storage errors
    }
    setIsVisible(false);
  };

  const handleDismiss = () => {
    try {
      // Also mark as dismissed for this session/visitor
      localStorage.setItem(STORAGE_KEY, 'dismissed');
    } catch {
      // Ignore
    }
    setIsVisible(false);
  };

  if (!hasMounted) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed z-[55] left-3 right-3 sm:left-6 sm:right-auto sm:max-w-md bottom-[calc(env(safe-area-inset-bottom,0px)+64px)] md:bottom-6"
          dir="rtl"
        >
          <div className="relative bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/10 hover:border-accent-red/30 rounded-2xl p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(227,30,36,0.08)] transition-all duration-300">
            {/* Ambient Red Glow Line at Top */}
            <div className="absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-accent-red to-transparent opacity-80" />

            {/* Header with Icon and Close Button */}
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-accent-red/10 border border-accent-red/25 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(227,30,36,0.15)]">
                  <span className="material-symbols-outlined text-accent-red text-lg">
                    shield
                  </span>
                </div>
                <div>
                  <h4 className="font-product-title font-bold text-white text-xs sm:text-sm tracking-wide">
                    نحترم خصوصيتك الرياضية
                  </h4>
                  <span className="text-[10px] text-text-muted font-mono font-medium block">
                    X-POWER PRIVACY & PERFORMANCE
                  </span>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                aria-label="إغلاق الإشعار"
                className="text-text-muted hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Content Text */}
            <p className="font-body text-zinc-300 text-xs sm:text-[13px] leading-relaxed mb-4">
              نستخدم ملفات تعريف الارتباط (Cookies) لتحسين سرعة وأداء تصفحك، وتخصيص أقوى العروض والخصومات لتناسب أهدافك الرياضية.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-2.5 pt-1 border-t border-white/5">
              <Link
                href="/terms"
                className="text-[11px] sm:text-xs text-text-muted hover:text-zinc-200 transition-colors underline underline-offset-4"
              >
                الشروط والخصوصية
              </Link>

              <button
                onClick={handleAccept}
                className="bg-accent-red hover:bg-red-600 active:scale-95 text-white font-product-title font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(227,30,36,0.3)] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>موافق وفهمت</span>
                <span className="material-symbols-outlined text-sm font-bold">check</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

