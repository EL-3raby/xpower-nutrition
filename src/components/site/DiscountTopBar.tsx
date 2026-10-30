'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, isDummyFirebase } from '@/lib/firebase/client';
import { getSiteConfig, getCategories } from '@/lib/firebase/admin-actions';
import { SiteConfig, Category } from '@/lib/types';
import { getEgyptTime } from '@/lib/date-utils';

interface DiscountTopBarProps {
  initialConfig?: SiteConfig | null;
}

type BarThemeKey = 'white' | 'gold' | 'cyan' | 'purple' | 'crimson';

interface ThemeStyles {
  containerBg: string;
  topAccent: string;
  textColor: string;
  discountBadge: string;
  actionPill: string;
  subtextColor: string;
  closeBtn: string;
}

const MARQUEE_THEMES: Record<BarThemeKey, ThemeStyles> = {
  // Minimalist Crisp White (Gymshark / Nike / Kith Editorial Standard - Default)
  white: {
    containerBg: 'bg-white border-b border-zinc-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.06)]',
    topAccent: 'bg-gradient-to-r from-transparent via-accent-red/70 to-transparent',
    textColor: 'text-black',
    discountBadge: 'bg-accent-red text-white font-display font-black shadow-sm',
    actionPill: 'bg-black hover:bg-zinc-800 text-white font-display font-black shadow-sm',
    subtextColor: 'text-zinc-600 font-body font-semibold',
    closeBtn: 'bg-white/95 hover:bg-zinc-100 text-zinc-500 hover:text-black border border-zinc-200 shadow-sm',
  },
  // Stealth Obsidian & Olympic Gold
  gold: {
    containerBg: 'bg-[#0A0C10] border-b border-amber-500/25 shadow-[0_2px_12px_rgba(245,158,11,0.1)]',
    topAccent: 'bg-gradient-to-r from-transparent via-amber-400 to-transparent',
    textColor: 'text-white',
    discountBadge: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-display font-black shadow-[0_0_12px_rgba(245,158,11,0.4)]',
    actionPill: 'bg-amber-400 hover:bg-amber-300 text-black font-display font-black shadow-sm',
    subtextColor: 'text-zinc-300 font-body font-semibold',
    closeBtn: 'bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white border border-white/10 shadow-sm',
  },
  // Midnight Sapphire & Cyber Cyan (MyProtein Pro / Gymshark Ice)
  cyan: {
    containerBg: 'bg-[#050C16] border-b border-cyan-500/25 shadow-[0_2px_12px_rgba(6,182,212,0.1)]',
    topAccent: 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent',
    textColor: 'text-white',
    discountBadge: 'bg-gradient-to-r from-cyan-400 to-sky-400 text-black font-display font-black shadow-[0_0_12px_rgba(6,182,212,0.4)]',
    actionPill: 'bg-cyan-400 hover:bg-cyan-300 text-black font-display font-black shadow-sm',
    subtextColor: 'text-zinc-300 font-body font-semibold',
    closeBtn: 'bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white border border-white/10 shadow-sm',
  },
  // Neon Amethyst (Ghost Lifestyle / Limited Edition Drops)
  purple: {
    containerBg: 'bg-[#0B0614] border-b border-purple-500/25 shadow-[0_2px_12px_rgba(168,85,247,0.1)]',
    topAccent: 'bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent',
    textColor: 'text-white',
    discountBadge: 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-display font-black shadow-[0_0_12px_rgba(168,85,247,0.4)]',
    actionPill: 'bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-display font-black shadow-sm',
    subtextColor: 'text-zinc-300 font-body font-semibold',
    closeBtn: 'bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white border border-white/10 shadow-sm',
  },
  // Molten Crimson (X-Power Red Core)
  crimson: {
    containerBg: 'bg-[#0D0404] border-b border-red-500/30 shadow-[0_2px_12px_rgba(227,30,36,0.12)]',
    topAccent: 'bg-gradient-to-r from-transparent via-accent-red to-transparent',
    textColor: 'text-white',
    discountBadge: 'bg-accent-red text-white font-display font-black shadow-[0_0_12px_rgba(227,30,36,0.4)]',
    actionPill: 'bg-accent-red hover:bg-red-500 text-white font-display font-black shadow-sm',
    subtextColor: 'text-zinc-300 font-body font-semibold',
    closeBtn: 'bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white border border-white/10 shadow-sm',
  },
};

export default function DiscountTopBar({ initialConfig }: DiscountTopBarProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [config, setConfig] = useState<SiteConfig | null>(initialConfig || null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // 1. Initial configuration & categories fetch
  useEffect(() => {
    let isMounted = true;

    if (!initialConfig) {
      getSiteConfig()
        .then((cfg) => {
          if (isMounted) setConfig(cfg);
        })
        .catch(console.error);
    }

    getCategories()
      .then((cats) => {
        if (isMounted) setCategories(cats);
      })
      .catch(console.error);

    if (!isDummyFirebase) {
      try {
        const configDocRef = doc(db, 'settings', 'siteConfig');
        const unsubscribe = onSnapshot(
          configDocRef,
          (snapshot) => {
            if (snapshot.exists() && isMounted) {
              setConfig(snapshot.data() as SiteConfig);
            }
          },
          (err) => {
            console.error('Error in DiscountTopBar Firestore subscription:', err);
          }
        );
        return () => {
          isMounted = false;
          unsubscribe();
        };
      } catch (err) {
        console.error('Failed to setup snapshot listener for DiscountTopBar:', err);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [initialConfig]);

  const bulkDiscount = config?.bulkDiscount;

  // 2. Session dismissal check: reset if appliedAt changed
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!bulkDiscount?.isActive) {
      setIsDismissed(true);
      return;
    }

    try {
      const dismissKey = `xpower_discount_dismissed_${bulkDiscount.appliedAt || 'active'}`;
      const dismissed = sessionStorage.getItem(dismissKey) === 'true';
      setIsDismissed(dismissed);
    } catch {
      setIsDismissed(false);
    }
  }, [bulkDiscount?.isActive, bulkDiscount?.appliedAt]);

  // 3. Countdown timer logic
  useEffect(() => {
    if (!bulkDiscount?.isActive || !bulkDiscount?.endDate) {
      setTimeLeft(null);
      return;
    }

    const calculateTime = () => {
      try {
        const end = new Date(bulkDiscount.endDate!).getTime();
        const now = getEgyptTime().getTime();
        const diff = end - now;

        if (diff <= 0) {
          return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return { days, hours, minutes, seconds, isExpired: false };
      } catch {
        return null;
      }
    };

    const initial = calculateTime();
    setTimeLeft(initial);

    if (initial?.isExpired) return;

    const interval = setInterval(() => {
      const updated = calculateTime();
      setTimeLeft(updated);
      if (updated?.isExpired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [bulkDiscount?.isActive, bulkDiscount?.endDate]);

  // Dismiss handler
  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDismissed(true);
    if (typeof window !== 'undefined' && bulkDiscount) {
      try {
        const dismissKey = `xpower_discount_dismissed_${bulkDiscount.appliedAt || 'active'}`;
        sessionStorage.setItem(dismissKey, 'true');
      } catch (err) {
        console.error('Error saving dismissal to sessionStorage:', err);
      }
    }
  };

  // Scope label resolution
  const scopeLabel = useMemo(() => {
    if (!bulkDiscount?.scope || bulkDiscount.scope === 'all') {
      return 'جميع المنتجات';
    }
    const cat = categories.find((c) => c.slug === bulkDiscount.scope || c.name === bulkDiscount.scope);
    return cat ? `قسم ${cat.name}` : `قسم ${bulkDiscount.scope}`;
  }, [bulkDiscount?.scope, categories]);

  // Target link
  const targetLink = useMemo(() => {
    if (!bulkDiscount?.scope || bulkDiscount.scope === 'all') {
      return '/products';
    }
    return `/products?category=${encodeURIComponent(bulkDiscount.scope)}`;
  }, [bulkDiscount?.scope]);

  // Dynamic Marquee Items (clean athletic phrases paired exclusively with the Red Flame Icon)
  const tickerItems = useMemo(() => {
    if (!bulkDiscount) return [];

    const discountFormatted = bulkDiscount.type === 'percentage'
      ? `${bulkDiscount.value}%`
      : `${bulkDiscount.value} ج.م`;

    const items: Array<{
      title: string;
      badge?: string;
      highlight?: string;
      cta?: string;
    }> = [
      {
        title: 'عرض حصري لفترة محدودة',
        badge: `خصم ${discountFormatted}`,
        highlight: `على ${scopeLabel}`,
      },
      {
        title: 'عروض إكس باور الكبرى مستمرة',
        cta: 'تسوق الآن ←',
      },
    ];

    if (timeLeft && !timeLeft.isExpired) {
      const timeStr = `${timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}${String(timeLeft.hours).padStart(2, '0')}:${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`;
      items.push({
        title: 'ينتهي الخصم خلال:',
        badge: timeStr,
        highlight: 'سارع قبل نفاد الكمية',
      });
    }

    items.push(
      {
        title: 'ضمان أصالة 100% لجميع المكملات',
        highlight: 'معاينة الطرد قبل الدفع',
      },
      {
        title: `خصم ${discountFormatted} يطبق تلقائياً عند الشيك أوت`,
        cta: 'استفد من العرض',
      }
    );

    return items;
  }, [bulkDiscount, scopeLabel, timeLeft]);

  // Visibility conditions
  if (!hasMounted || !bulkDiscount?.isActive || isDismissed) {
    return null;
  }

  // If discount has an end date and it's already expired, do not show
  if (timeLeft && timeLeft.isExpired) {
    return null;
  }

  // Active theme (defaulting to 'white' as requested)
  const themeKey: BarThemeKey = (bulkDiscount.theme && bulkDiscount.theme in MARQUEE_THEMES)
    ? (bulkDiscount.theme as BarThemeKey)
    : 'white';

  const theme = MARQUEE_THEMES[themeKey];

  return (
    <aside
      role="region"
      aria-label="شريط العروض والخصومات الحصرية المتحرك"
      dir="rtl"
      className={`relative z-40 w-full overflow-hidden ${theme.containerBg} select-none transition-colors duration-500`}
    >
      {/* Top luminous hairline edge */}
      <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${theme.topAccent} pointer-events-none opacity-80`} />

      {/* Infinite Seamless Moving Marquee */}
      <Link
        href={targetLink}
        title="اضغط لتصفح منتجات العرض والخصومات"
        className="block relative w-full overflow-hidden py-2 sm:py-2.5 group cursor-pointer"
        dir="ltr"
      >
        <div className="animate-promo-ticker flex items-center group-hover:[animation-play-state:paused]">
          {[0, 1].map((trackIdx) => (
            <div
              key={`discount-track-${trackIdx}`}
              className="flex items-center shrink-0 gap-8 sm:gap-14 px-4 sm:px-8"
              dir="rtl"
            >
              {tickerItems.map((item, itemIdx) => (
                <div
                  key={`item-${trackIdx}-${itemIdx}`}
                  className={`flex items-center gap-2 sm:gap-2.5 ${theme.textColor} font-display font-black text-xs sm:text-[13px] tracking-normal whitespace-nowrap`}
                >
                  {/* World-Class Red Athletic Flame Icon (Google Material Symbols with Optical Fill) */}
                  <span
                    className="material-symbols-outlined text-accent-red text-base sm:text-lg shrink-0 select-none group-hover:scale-125 transition-transform duration-200 drop-shadow-[0_0_8px_rgba(227,30,36,0.4)]"
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 24" }}
                    aria-hidden="true"
                  >
                    local_fire_department
                  </span>

                  {/* Main Title */}
                  <span>{item.title}</span>

                  {/* High-Impact Badge (e.g. خصم 10%) */}
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${theme.discountBadge}`}>
                      {item.badge}
                    </span>
                  )}

                  {/* Scope or description */}
                  {item.highlight && (
                    <span className={theme.subtextColor}>
                      {item.highlight}
                    </span>
                  )}

                  {/* Action CTA Pill */}
                  {item.cta && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] ${theme.actionPill} group-hover:scale-105 transition-transform`}>
                      <span>{item.cta}</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Link>

      {/* Minimal Dismiss (Close) Button on the far left corner */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="إغلاق شريط الخصم"
        className={`absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-6 h-6 sm:w-7 sm:h-7 rounded-full ${theme.closeBtn} flex items-center justify-center active:scale-90 transition-all`}
      >
        <span className="material-symbols-outlined text-xs sm:text-sm">close</span>
      </button>
    </aside>
  );
}
