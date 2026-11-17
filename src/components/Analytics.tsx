'use client';

import { useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { recordVisit, isAutomatedTraffic } from '@/lib/firebase/analytics-stats';

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastRecordedPath = useRef<string | null>(null);
  const isVerifiedHumanRef = useRef<boolean>(false);

  useEffect(() => {
    if (!pathname) return;

    // 1. Trigger Meta Pixel PageView on client-side navigation
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView');
    }

    // 2. Strict Pre-checks: Ignore bots, headless browsers, dev environments & admin
    if (typeof window === 'undefined' || isAutomatedTraffic()) return;

    const executeRecord = (targetPath: string) => {
      if (lastRecordedPath.current !== targetPath) {
        lastRecordedPath.current = targetPath;
        recordVisit(targetPath).catch(() => {});
      }
    };

    // 3. Check if human presence was already confirmed in this session
    try {
      if (sessionStorage.getItem('xpower_human_active') === '1') {
        isVerifiedHumanRef.current = true;
      }
    } catch {}

    // If already verified as genuine human in this tab session, record route changes immediately
    if (isVerifiedHumanRef.current) {
      executeRecord(pathname);
      return;
    }

    // 4. Strict Human Behavioral Gate:
    // Requires real physical human interaction (touch, intentional drag/scroll, or mouse displacement)
    // NEVER rely on passive timeouts or zero-displacement synthetic events which automated bots trigger.
    let startMouseX = -1;
    let startMouseY = -1;

    const confirmHumanAndRecord = () => {
      if (isVerifiedHumanRef.current) return;
      isVerifiedHumanRef.current = true;
      try {
        sessionStorage.setItem('xpower_human_active', '1');
      } catch {}
      cleanupListeners();
      executeRecord(pathname);
    };

    const handleTouch = (e: TouchEvent) => {
      if (e.isTrusted) {
        confirmHumanAndRecord();
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (e.isTrusted) {
        confirmHumanAndRecord();
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.isTrusted) {
        confirmHumanAndRecord();
      }
    };

    const handleScroll = () => {
      // Genuine scroll displacement on the page
      if (window.scrollY > 25 || window.scrollX > 25) {
        confirmHumanAndRecord();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.isTrusted && Math.abs(e.deltaY) > 5) {
        confirmHumanAndRecord();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Ignore synthetic non-trusted events
      if (!e.isTrusted) return;

      // Track Euclidean movement distance to ignore initial (0, 0) placement by headless scrapers
      if (startMouseX < 0 || startMouseY < 0) {
        startMouseX = e.clientX;
        startMouseY = e.clientY;
        return;
      }

      const delta = Math.hypot(e.clientX - startMouseX, e.clientY - startMouseY);
      if (delta >= 35) {
        confirmHumanAndRecord();
      }
    };

    const cleanupListeners = () => {
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleMouseMove);
    };

    window.addEventListener('touchstart', handleTouch, { once: true, passive: true });
    window.addEventListener('click', handleClick, { once: true, passive: true });
    window.addEventListener('keydown', handleKey, { once: true, passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      cleanupListeners();
    };
  }, [pathname, searchParams]);

  return null;
}

export default function Analytics() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTracker />
    </Suspense>
  );
}
