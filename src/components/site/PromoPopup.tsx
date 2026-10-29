'use client';

import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db, isDummyFirebase } from '@/lib/firebase/client';
import { PromoPopup as PromoPopupType } from '@/lib/types';
import { getEgyptTime, toEgyptTime } from '@/lib/date-utils';
import CountdownTimer from './CountdownTimer';

export default function PromoPopup() {
  const [config, setConfig] = useState<PromoPopupType | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('xpower_promo_popup_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          const endDateTime = new Date(parsed.endDateTime);
          const now = getEgyptTime();
          if (parsed.isActive && parsed.imageUrl && endDateTime > now) {
            return { ...parsed, endDateTime };
          }
        }
      } catch (err) {
        console.error('Error reading promo popup cache:', err);
      }
    }
    return null;
  });

  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('promoPopupShown')) {
        return false;
      }
      return Boolean(config && config.isActive && config.imageUrl);
    }
    return false;
  });

  useEffect(() => {
    async function loadConfig() {
      if (isDummyFirebase) return;

      try {
        const docRef = doc(db, 'promoPopup', 'config');
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          localStorage.removeItem('xpower_promo_popup_cache');
          setVisible(false);
          return;
        }

        const data = docSnap.data();
        const baseEndDate = data.endDateTime instanceof Timestamp
          ? data.endDateTime.toDate()
          : new Date(data.endDateTime);
          
        const endDateTime = toEgyptTime(baseEndDate);

        // Fix old product links from DB (backward compatibility)
        let parsedCtaLink = data.ctaLink || '/products';
        if (parsedCtaLink.includes('/products/detail?slug=')) {
          const slug = parsedCtaLink.split('/products/detail?slug=')[1];
          if (slug) {
            parsedCtaLink = `/products/${slug}`;
          }
        }

        const popupConfig: PromoPopupType = {
          isActive: data.isActive ?? false,
          imageUrl: data.imageUrl || '',
          ctaText: data.ctaText || 'اتسوق دلوقتي',
          ctaLink: parsedCtaLink,
          endDateTime,
          showCountdown: data.showCountdown ?? true
        };

        const now = getEgyptTime();

        // Check conditions: active + has image + end date in the future
        if (!popupConfig.isActive || !popupConfig.imageUrl || endDateTime <= now) {
          localStorage.removeItem('xpower_promo_popup_cache');
          setVisible(false);
          return;
        }

        // Cache valid popup config for instant loading next time
        localStorage.setItem('xpower_promo_popup_cache', JSON.stringify({
          ...popupConfig,
          endDateTime: endDateTime.toISOString()
        }));

        setConfig(popupConfig);

        // Session guard: show if not already dismissed in this session
        if (typeof window !== 'undefined' && !sessionStorage.getItem('promoPopupShown')) {
          setVisible(true);
          sessionStorage.setItem('promoPopupShown', 'true');
        }
      } catch (err) {
        console.error('Error loading promo popup:', err);
      }
    }

    loadConfig();
  }, []);

  const handleClose = () => {
    setVisible(false);
  };

  const handleCta = () => {
    if (config?.ctaLink) {
      window.location.href = config.ctaLink;
    }
    setVisible(false);
  };

  // Don't render anything if not visible or no config
  if (!visible || !config) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-500 animate-fadeIn"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
      onClick={handleClose}
    >
      <div
        className="relative bg-[#050505] border border-white/10 max-w-lg w-full max-h-[90vh] flex flex-col items-center shadow-[0_30px_60px_rgba(0,0,0,1)] overflow-hidden animate-slideUp transform transition-all duration-500 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Premium ambient light effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-accent-red/5 via-transparent to-transparent pointer-events-none"></div>
        {/* Glowing top line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent-red to-transparent opacity-80 shadow-[0_0_10px_rgba(227,30,36,0.8)]"></div>

        {/* Close Button (Glassmorphism) */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/40 backdrop-blur-md border border-white/10 hover:border-accent-red hover:bg-accent-red/20 text-white flex items-center justify-center transition-all duration-300 rounded-full hover:rotate-90 group"
          aria-label="اقفل"
        >
          <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform drop-shadow-md">close</span>
        </button>

        {/* Image */}
        <div className="w-full relative z-10 bg-black flex items-center justify-center overflow-hidden custom-scrollbar max-h-[60vh] md:max-h-[70vh]">
          <img
            src={config.imageUrl}
            alt="عرض خاص من Xpower Nutrition"
            loading="eager"
            className="w-full h-auto max-h-full object-contain hover:scale-105 transition-transform duration-700"
          />
        </div>

        {/* Bottom Section: Countdown + CTA */}
        <div className="w-full p-6 flex flex-col items-center gap-5 bg-[#0a0a0a] border-t border-white/5 relative z-10" dir="rtl">
          
          {/* subtle glow behind CTA */}
          <div className="absolute bottom-0 w-full h-1/2 bg-accent-red/5 blur-xl pointer-events-none"></div>

          {/* Countdown Timer */}
          {config.showCountdown && (
            <div className="w-full mb-1">
              <CountdownTimer 
                endDate={config.endDateTime} 
                onExpire={() => setVisible(false)}
              />
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={handleCta}
            className="w-full bg-accent-red hover:bg-white text-white hover:text-black font-product-title font-black py-4 transition-all duration-300 uppercase tracking-widest text-lg shadow-[0_0_20px_rgba(227,30,36,0.4)] hover:shadow-[0_0_25px_rgba(255,255,255,0.6)] border border-accent-red hover:border-white hover:scale-[1.02] flex items-center justify-center gap-2 group"
          >
            {config.ctaText}
            <span className="material-symbols-outlined transition-transform duration-300 group-hover:-translate-x-1 group-hover:scale-110">arrow_back</span>
          </button>
        </div>
      </div>
    </div>
  );
}
