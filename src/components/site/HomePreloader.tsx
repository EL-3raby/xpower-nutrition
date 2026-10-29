'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HomePreloader() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait for fonts and DOM hydration to settle
    let timer: NodeJS.Timeout;

    if (typeof window !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        timer = setTimeout(() => {
          setIsLoading(false);
        }, 500);
      });
    } else {
      timer = setTimeout(() => {
        setIsLoading(false);
      }, 600);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="home-preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[99999] bg-[#050505] flex flex-col items-center justify-center pointer-events-auto select-none"
        >
          {/* Ambient Glowing Background Aura */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-accent-red/15 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>

          <div className="relative z-10 flex flex-col items-center gap-6">
            {/* Logo Image */}
            <motion.img
              src="/images/logo-transparent.png"
              alt="Xpower Nutrition"
              className="h-14 sm:h-16 md:h-20 object-contain drop-shadow-[0_0_25px_rgba(227,30,36,0.5)]"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />

            {/* Glowing Loading Bar */}
            <div className="w-40 sm:w-48 h-1 bg-white/10 rounded-full overflow-hidden relative border border-white/5">
              <motion.div
                className="h-full bg-gradient-to-r from-accent-red via-red-500 to-accent-red rounded-full shadow-[0_0_12px_rgba(227,30,36,0.8)]"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              />
            </div>

            {/* Brand Title */}
            <span className="font-display text-[10px] sm:text-xs text-text-muted/80 uppercase tracking-[0.35em] font-bold">
              Xpower Nutrition
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
