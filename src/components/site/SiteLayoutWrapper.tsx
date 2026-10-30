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
      if (isLocal || p.startsWith('/admin') || p.startsWith('/links') || isAdminCached) return false;
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

  // Admin routes and Links page do not have the site layout
  const isAdminOrLinks = pathname?.startsWith('/admin') || pathname?.startsWith('/links');

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

  if (isAdminOrLinks) {
    return <>{children}</>;
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
    <div id="site-layout-container" className="min-h-screen flex flex-col relative">
      {/* Admin Maintenance Bypass Banner */}
      {isAdminUser && isMaintenanceActive && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-300 px-4 py-2 text-xs md:text-sm font-body font-medium flex items-center justify-between sticky top-0 z-[100] backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>وضع الصيانة مفعّل حالياً للزوار — أنت تتصفح الموقع بصفتك مسؤول (Admin Bypass).</span>
          </div>
          <Link href="/admin/settings" className="underline font-bold hover:text-white transition-colors">
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
    </div>
  );
}

