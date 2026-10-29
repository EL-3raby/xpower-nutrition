'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { subscribeToAuth, adminLogout, checkIsAdmin } from '@/lib/firebase/auth';
import { db, isDummyFirebase } from '@/lib/firebase/client';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { User } from 'firebase/auth';
import Spinner from '@/components/ui/Spinner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadOrders, setUnreadOrders] = useState(0);
  const [uncontactedCheckouts, setUncontactedCheckouts] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isLoginPage = pathname === '/admin/login' || pathname === '/admin/login/';

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Auth check and listener
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (currentUser) => {
      if (currentUser) {
        // Double check they exist in admin collection
        try {
          const isAdmin = await checkIsAdmin(currentUser.uid);
          if (isAdmin) {
            setUser(currentUser);
            if (isLoginPage) {
              router.push('/admin');
            }
          } else {
            await adminLogout();
            setUser(null);
            if (!isLoginPage) router.push('/admin/login');
          }
        } catch (err) {
          console.error('Error validating admin credentials:', err);
          setUser(null);
          if (!isLoginPage) router.push('/admin/login');
        }
      } else {
        setUser(null);
        if (!isLoginPage) {
          router.push('/admin/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isLoginPage, router]);

  // Real-time unread orders listener
  useEffect(() => {
    if (!user || isLoginPage) return;

    if (isDummyFirebase) {
      setUnreadOrders(1); // Default mock value for offline demo
      return;
    }

    const colRef = collection(db, 'orders');
    const q = query(colRef, where('isReadByAdmin', '==', false));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadOrders(snapshot.size);
    }, (error) => {
      console.error('Error listening to unread orders snapshot:', error);
    });

    return () => unsubscribe();
  }, [user, isLoginPage]);

  // Real-time uncontacted abandoned checkouts listener
  useEffect(() => {
    if (!user || isLoginPage) return;

    if (isDummyFirebase) {
      setUncontactedCheckouts(1); // Default mock value for offline demo
      return;
    }

    const colRef = collection(db, 'abandonedCheckouts');
    const q = query(
      colRef,
      where('isConverted', '==', false),
      where('isContacted', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUncontactedCheckouts(snapshot.size);
    }, (error) => {
      console.error('Error listening to uncontacted checkouts snapshot:', error);
    });

    return () => unsubscribe();
  }, [user, isLoginPage]);

  const handleLogout = async () => {
    try {
      await adminLogout();
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // If loading user state, show loader
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary text-white flex items-center justify-center">
        <Spinner className="inline-block w-10 h-10 text-accent-red animate-spin" />
      </div>
    );
  }

  // If on login page, render child without layout panels
  if (isLoginPage) {
    return <>{children}</>;
  }

  // If not logged in and not on login page, don't render panel content (guarded redirecting)
  if (!user && !isLoginPage) {
    return null;
  }

  const navLinkClass = (path: string) => {
    const base = "flex items-center gap-3 px-6 py-3.5 font-body text-sm font-bold transition-all border-r-4 ";
    const active = "bg-accent-red/10 text-accent-red border-accent-red";
    const inactive = "border-transparent text-text-muted hover:text-white hover:bg-white/5";
    return base + (pathname === path ? active : inactive);
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col md:flex-row print:min-h-0 print:bg-white print:text-black print:block" dir="rtl">

      {/* Mobile Header (Visible only on small screens) */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 shrink-0 sticky top-0 z-40 print:hidden shadow-sm">
        <div className="flex flex-col text-right">
          <span className="font-product-title text-lg font-black text-white tracking-wider flex items-center gap-0.5 justify-end" dir="ltr">
            <span className="text-accent-red">X</span>POWER
          </span>
          <span className="text-[10px] text-text-muted uppercase">لوحة التحكم (آدمن)</span>
        </div>
        <div className="flex items-center gap-3">
          {(unreadOrders > 0 || uncontactedCheckouts > 0) && (
            <div className="bg-accent-red text-white text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse shadow-[0_0_10px_rgba(227,30,36,0.5)]">
              {unreadOrders + uncontactedCheckouts}
              <span className="material-symbols-outlined text-[14px]">notifications</span>
            </div>
          )}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white bg-white/5 p-2 rounded-xl border border-white/10 hover:bg-white/10 transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-2xl">{isMobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} 
        fixed md:sticky top-0 right-0 z-50 w-[280px] md:w-64 h-screen max-h-screen bg-[#0a0a0a] border-l border-white/5 flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out print:hidden shadow-2xl md:shadow-none
      `}>

        {/* Sidebar Header Brand (Desktop Only) */}
        <div className="hidden md:flex flex-col p-6 border-b border-text-muted/10 gap-3 shrink-0">
          <div className="flex flex-col text-right w-full">
            <span className="font-product-title text-xl font-black text-white tracking-wider flex items-center gap-0.5" dir="ltr">
              <span className="text-accent-red">X</span>POWER
            </span>
            <span className="text-[10px] text-text-muted uppercase mt-0.5">لوحة تحكم الآدمن</span>
          </div>
          {unreadOrders > 0 && (
            <Link href="/admin/orders" className="flex items-center gap-2 bg-accent-red/10 border border-accent-red/20 text-accent-red px-3 py-2 w-full justify-start transition-colors hover:bg-accent-red/20 rounded-xl">
              <span className="material-symbols-outlined text-[18px] animate-pulse">notifications_active</span>
              <span className="font-bold text-xs">{unreadOrders} أوردر جديد</span>
            </Link>
          )}
          {uncontactedCheckouts > 0 && (
            <Link href="/admin/abandoned-checkouts" className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 px-3 py-2 w-full justify-start transition-colors hover:bg-amber-500/20 rounded-xl">
              <span className="material-symbols-outlined text-[18px] animate-pulse">shopping_cart_off</span>
              <span className="font-bold text-xs">{uncontactedCheckouts} سلة متروكة في الانتظار</span>
            </Link>
          )}
        </div>

        {/* Navigation Options */}
        <nav className="flex-1 min-h-0 overflow-y-auto py-4 flex flex-col gap-1 custom-scrollbar">
          <Link href="/admin" className={navLinkClass('/admin')}>
            <span className="material-symbols-outlined text-xl">dashboard</span>
            <span>الرئيسية</span>
          </Link>

          <Link href="/admin/orders" className={navLinkClass('/admin/orders')}>
            <span className="material-symbols-outlined text-xl">shopping_cart</span>
            <span className="flex-grow text-right">الأوردرات</span>
            {unreadOrders > 0 && (
              <span className="bg-accent-red text-white text-[10px] rounded-full px-2 py-0.5 flex items-center justify-center font-bold">
                {unreadOrders} جديد
              </span>
            )}
          </Link>

          <Link href="/admin/products" className={navLinkClass('/admin/products')}>
            <span className="material-symbols-outlined text-xl">inventory_2</span>
            <span>المنتجات</span>
          </Link>

          <Link href="/admin/reviews" className={navLinkClass('/admin/reviews')}>
            <span className="material-symbols-outlined text-xl">star</span>
            <span>التقييمات</span>
          </Link>

          <Link href="/admin/categories" className={navLinkClass('/admin/categories')}>
            <span className="material-symbols-outlined text-xl">category</span>
            <span>الأقسام</span>
          </Link>

          <Link href="/admin/coupons" className={navLinkClass('/admin/coupons')}>
            <span className="material-symbols-outlined text-xl">sell</span>
            <span>كوبونات الخصم</span>
          </Link>

          <Link href="/admin/affiliates" className={navLinkClass('/admin/affiliates')}>
            <span className="material-symbols-outlined text-xl">groups</span>
            <span>تقرير المسوقين</span>
          </Link>

          <Link href="/admin/abandoned-checkouts" className={navLinkClass('/admin/abandoned-checkouts')}>
            <span className="material-symbols-outlined text-xl">shopping_cart_off</span>
            <span className="flex-grow text-right">سلات متروكة</span>
            {uncontactedCheckouts > 0 && (
              <span className="bg-accent-red text-white text-[10px] rounded-full px-2 py-0.5 flex items-center justify-center font-bold">
                {uncontactedCheckouts} جديد
              </span>
            )}
          </Link>

          <Link href="/admin/promo-popup" className={navLinkClass('/admin/promo-popup')}>
            <span className="material-symbols-outlined text-xl">campaign</span>
            <span>إعلان ثابت</span>
          </Link>

          <Link href="/admin/authenticity-codes" className={navLinkClass('/admin/authenticity-codes')}>
            <span className="material-symbols-outlined text-xl">verified</span>
            <span>أكواد الأصالة</span>
          </Link>

          <Link href="/admin/settings" className={navLinkClass('/admin/settings')}>
            <span className="material-symbols-outlined text-xl">settings</span>
            <span>تظبيط الموقع</span>
          </Link>

          <Link href="/admin/shipping" className={navLinkClass('/admin/shipping')}>
            <span className="material-symbols-outlined text-xl">local_shipping</span>
            <span>مصاريف الشحن</span>
          </Link>

          <Link href="/admin/activity-log" className={navLinkClass('/admin/activity-log')}>
            <span className="material-symbols-outlined text-xl">history</span>
            <span>سجل الحركات</span>
          </Link>
        </nav>

        {/* Sidebar Footer (Logout/User Email) */}
        <div className="p-4 border-t border-text-muted/10 bg-bg-primary/50 flex flex-col gap-3 mt-auto shrink-0">
          <div className="flex flex-col text-right truncate px-2">
            <span className="text-[10px] text-text-muted font-bold">الآدمن اللي فاتح</span>
            <span className="text-xs text-white font-semibold truncate mt-0.5" dir="ltr">{user?.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-accent-red/20 text-accent-red hover:bg-accent-red hover:text-white transition-colors text-sm font-bold font-product-title bg-bg-primary"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span>تسجيل خروج</span>
          </button>
        </div>

      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 h-[calc(100vh-73px)] md:h-screen overflow-y-auto p-4 md:p-10 print:p-0 print:overflow-visible print:w-full bg-[#050505]">
        {children}
      </main>

    </div>
  );
}
