'use client';

import { useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { recordVisit, isAutomatedTraffic } from '@/lib/firebase/analytics-stats';

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastRecordedPath = useRef<string | null>(null);
  const hasInteractedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!pathname) return;

    // 1. Trigger Meta Pixel PageView on client-side navigation
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView');
    }

    // 2. Strict Human Verification: Ensure visitor is a real human before recording visit
    if (typeof window === 'undefined' || isAutomatedTraffic()) return;

    const executeRecord = (targetPath: string) => {
      if (lastRecordedPath.current !== targetPath) {
        lastRecordedPath.current = targetPath;
        recordVisit(targetPath).catch(() => {});
      }
    };

    // If human interaction already verified in this session, record immediately on route change
    if (hasInteractedRef.current) {
      executeRecord(pathname);
      return;
    }

    // Otherwise, wait for genuine human interaction (scroll, touch, click, keydown, mousemove)
    const onHumanInteraction = () => {
      hasInteractedRef.current = true;
      cleanupListeners();
      executeRecord(pathname);
    };

    const interactionEvents = ['scroll', 'touchstart', 'click', 'keydown', 'mousemove'];
    const cleanupListeners = () => {
      interactionEvents.forEach((ev) => {
        window.removeEventListener(ev, onHumanInteraction);
      });
    };

    interactionEvents.forEach((ev) => {
      window.addEventListener(ev, onHumanInteraction, { once: true, passive: true });
    });

    // Fallback: If user stays on page for 6 seconds without interacting, verify they are visible & human
    const timer = setTimeout(() => {
      if (!hasInteractedRef.current && document.visibilityState === 'visible' && !isAutomatedTraffic()) {
        hasInteractedRef.current = true;
        cleanupListeners();
        executeRecord(pathname);
      }
    }, 6000);

    return () => {
      clearTimeout(timer);
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
