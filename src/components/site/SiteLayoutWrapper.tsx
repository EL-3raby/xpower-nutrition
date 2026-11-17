'use client';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Navbar from '@/components/site/Navbar';
import Footer from '@/components/site/Footer';
import BottomTabBar from '@/components/site/BottomTabBar';
import MaintenancePage from '@/components/site/MaintenancePage';
import DiscountTopBar from '@/components/site/DiscountTopBar';

const CartDrawer = dynamic(() => import('@/components/site/CartDrawer'), { ssr: false });
const PromoPopup = dynamic(() => import('@/components/site/PromoPopup'), { ssr: false });
const GlobalSearchModal = dynamic(() => import('@/components/site/GlobalSearchModal'), { ssr: false });
const CookieConsentBanner = dynamic(() => import('@/components/site/CookieConsentBanner'), { ssr: false });
import { getSiteConfig } from '@/lib/firebase/admin-actions';
import { subscribeToAuth, checkIsAdmin } from '@/lib/firebase/auth';
import { SiteConfig } from '@/lib/types';

export default function SiteLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('xpower_is_admin') === '1';
    } catch {
      return false;
    }
  });
  const [isLocalHost] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.local')
    );
  });

  // Synchronously initialize maintenance state from localStorage cache if available
  const [isMaintenanceCached, setIsMaintenanceCached] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const h = window.location.hostname;
      const p = window.location.pathname;
      const isLocal = h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local');
      const isAdminCached = localStorage.getItem('xpower_is_admin') === '1';
      if (isLocal || p.startsWith('/sec-89412') || p.startsWith('/links') || isAdminCached) return false;
      return localStorage.getItem('xpower_maintenance_active') === '1';
    } catch {
      return false;
    }
  });

  const [cachedConfig, setCachedConfig] = useState<SiteConfig | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('xpower_maintenance_cfg');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [isBanned, setIsBanned] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (localStorage.getItem('xpower_is_admin') === '1') return false;
      return sessionStorage.getItem('xpower_ip_banned') === '1';
    } catch {
      return false;
    }
  });

  // Admin routes and Links page do not have the site layout
  const isAdminOrLinks = pathname?.startsWith('/sec-89412') || pathname?.startsWith('/links');

  useEffect(() => {
    if (isAdminOrLinks) return;

    // Load site configuration for maintenance mode check
    getSiteConfig()
      .then((cfg) => {
        setSiteConfig(cfg);
        if (cfg?.maintenanceMode?.isActive) {
          localStorage.setItem('xpower_maintenance_active', '1');
          localStorage.setItem('xpower_maintenance_cfg', JSON.stringify(cfg));
          const isAdminCached = localStorage.getItem('xpower_is_admin') === '1';
          const hostname = window.location.hostname;
          const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
          if (!isAdminCached && !isLocal) {
            document.documentElement.classList.add('is-maintenance');
          } else {
            document.documentElement.classList.remove('is-maintenance');
          }
          setIsMaintenanceCached(true);
        } else {
          localStorage.removeItem('xpower_maintenance_active');
          localStorage.removeItem('xpower_maintenance_cfg');
          document.documentElement.classList.remove('is-maintenance');
          setIsMaintenanceCached(false);
        }
      })
      .catch((err) => console.error('Error checking maintenance mode:', err));

    // Listen for admin auth to allow admin bypass on live site
    const unsubscribe = subscribeToAuth(async (user) => {
      if (user) {
        try {
          const adminStatus = await checkIsAdmin(user.uid);
          setIsAdminUser(adminStatus);
          if (adminStatus) {
            localStorage.setItem('xpower_is_admin', '1');
            document.documentElement.classList.add('is-admin');
            document.documentElement.classList.remove('is-maintenance');
          } else {
            localStorage.removeItem('xpower_is_admin');
            document.documentElement.classList.remove('is-admin');
          }
        } catch {
          setIsAdminUser(false);
          localStorage.removeItem('xpower_is_admin');
          document.documentElement.classList.remove('is-admin');
        }
      } else {
        setIsAdminUser(false);
        localStorage.removeItem('xpower_is_admin');
        document.documentElement.classList.remove('is-admin');
      }
    });

    return () => unsubscribe();
  }, [isAdminOrLinks]);

  // Check client IP ban status in background (non-blocking)
  useEffect(() => {
    if (isAdminOrLinks || isLocalHost || isAdminUser) return;

    try {
      if (sessionStorage.getItem('xpower_ip_banned') === '0') return;
      if (sessionStorage.getItem('xpower_ip_banned') === '1') {
        setIsBanned(true);
        return;
      }
    } catch {}

    let isCancelled = false;
    import('@/lib/firebase/security').then(async ({ fetchClientGeoInfo, isClientIPBanned }) => {
      try {
        const geo = await fetchClientGeoInfo();
        if (isCancelled || !geo?.ip) return;
        const banned = await isClientIPBanned(geo.ip);
        if (banned) {
          try { sessionStorage.setItem('xpower_ip_banned', '1'); } catch {}
          if (!isCancelled) setIsBanned(true);
        } else {
          try { sessionStorage.setItem('xpower_ip_banned', '0'); } catch {}
        }
      } catch {
        // Fail-safe: never block users if geo check fails
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [isAdminOrLinks, isLocalHost, isAdminUser]);

  if (isAdminOrLinks) {
    return <>{children}</>;
  }

  // Determine if IP ban applies
  if (!isLocalHost && !isAdminUser && isBanned) {
    const rawWa = siteConfig?.contactInfo?.whatsapp || '';
    const supportWhatsApp = rawWa ? `https://wa.me/${rawWa.replace(/[^0-9]/g, '')}` : 'https://wa.me/201000000000';

    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 text-center font-body" dir="rtl">
        <div className="max-w-md w-full bg-[#0a0a0a] border border-red-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-48 h-48 bg-accent-red/10 rounded-full blur-3xl pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-accent-red/10 border border-accent-red/30 text-accent-red flex items-center justify-center mx-auto mb-5 shadow-lg shadow-accent-red/20">
            <span className="material-symbols-outlined text-4xl">gpp_bad</span>
          </div>
          <h1 className="font-product-title text-2xl font-black text-white mb-2">تم تقييد الوصول إلى المتجر</h1>
          <p className="text-xs text-text-muted leading-relaxed mb-6 font-body">
            تم حظر عنوان الـ IP الخاص بجهازك تلقائياً بواسطة منظومة رادار الأمان والحماية لحماية استقرار وأمان متجر X-Power Nutrition.
          </p>
          <div className="p-3.5 rounded-xl bg-black/60 border border-white/5 text-[11px] text-text-muted font-mono mb-6">
            Security Threat Protection • Access Restricted
          </div>
          <a
            href={supportWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 transition-colors"
          >
            <span>تواصل مع الدعم الفني عبر واتساب</span>
          </a>
        </div>
      </div>
    );
  }

  // Determine if maintenance mode applies:
  // If siteConfig is already fetched, use its live value; otherwise fallback immediately to cached state so there is zero flash on refresh!
  const isMaintenanceActive = siteConfig !== null 
    ? Boolean(siteConfig?.maintenanceMode?.isActive)
    : isMaintenanceCached;

  const shouldBlockVisitor = !isLocalHost && isMaintenanceActive && !isAdminUser;

  if (shouldBlockVisitor) {
    return <MaintenancePage config={siteConfig || cachedConfig} />;
  }

  const isVerifyPage = Boolean(pathname?.startsWith('/verify'));

  return (
    <div id="site-layout-container" suppressHydrationWarning className="min-h-screen flex flex-col relative">
      {/* Admin Maintenance Bypass Banner */}
      {isAdminUser && isMaintenanceActive && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-300 px-4 py-2 text-xs md:text-sm font-body font-medium flex items-center justify-between sticky top-0 z-[100] backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>وضع الصيانة مفعّل حالياً للزوار — أنت تتصفح الموقع بصفتك مسؤول (Admin Bypass).</span>
          </div>
          <Link href="/sec-89412/settings" className="underline font-bold hover:text-white transition-colors">
            إعدادات الصيانة
          </Link>
        </div>
      )}
      <DiscountTopBar initialConfig={siteConfig} />
      <PromoPopup />
      <GlobalSearchModal />
      <Navbar />
      <main className="flex-grow pb-16 md:pb-0">
        {children}
      </main>
      {!isVerifyPage && <Footer />}
      <CartDrawer />
      <BottomTabBar />
      <CookieConsentBanner />
    </div>
  );
}

