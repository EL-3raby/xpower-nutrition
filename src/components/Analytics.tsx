'use client';

import { useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { recordVisit } from '@/lib/firebase/analytics-stats';

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastRecordedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    // 1. Trigger Meta Pixel PageView on client-side navigation
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView');
    }

    // 2. Record visit and page view in Firestore Daily Stats
    if (lastRecordedPath.current !== pathname) {
      lastRecordedPath.current = pathname;
      recordVisit(pathname).catch(() => {});
    }
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
