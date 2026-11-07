import { db, isDummyFirebase } from './client';
import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  increment,
  serverTimestamp,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { DailyStats } from '../types';

/**
 * Formats Cairo date string as YYYY-MM-DD
 */
export function getCairoDateString(date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Extracts and normalizes topPages map, handling both nested maps and legacy flat keys.
 */
function extractTopPages(data: Record<string, any>): Record<string, number> {
  const result: Record<string, number> = {};

  if (data.topPages && typeof data.topPages === 'object') {
    Object.entries(data.topPages).forEach(([k, v]) => {
      result[k] = (result[k] || 0) + Number(v || 0);
    });
  }

  Object.keys(data).forEach((key) => {
    if (key.startsWith('topPages.')) {
      const pageKey = key.replace('topPages.', '');
      result[pageKey] = (result[pageKey] || 0) + Number(data[key] || 0);
    }
  });

  return result;
}

/**
 * Records a page view and checks if the visitor is a new unique visitor today.
 * Deduplicates using localStorage so 1 person = 1 visitor count per day.
 * Excludes admin sessions and admin routes (/sec-89412).
 */
export async function recordVisit(pathname: string): Promise<void> {
  if (typeof window === 'undefined' || isDummyFirebase) return;

  // 1. Exclude admin routes & authenticated admin visits
  if (
    pathname.startsWith('/sec-89412') ||
    pathname.startsWith('/api') ||
    localStorage.getItem('xpower_is_admin') === '1'
  ) {
    return;
  }

  try {
    const todayStr = getCairoDateString();
    const lastVisitDate = localStorage.getItem('xpower_visit_date');
    const isUniqueDaily = lastVisitDate !== todayStr;

    // Detect device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    // Sanitize pathname for Firestore map key safely
    let safePath = pathname;
    try {
      safePath = decodeURIComponent(pathname);
    } catch {}

    const cleanPath = (safePath.replace(/^\/+|\/+$/g, '') || 'home')
      .replace(/[\/\.\#\$\[\]\~\*]/g, '_')
      .slice(0, 60);

    const docRef = doc(db, 'dailyStats', todayStr);
    const updatePayload: Record<string, any> = {
      date: todayStr,
      pageViews: increment(1),
      updatedAt: serverTimestamp(),
      topPages: {
        [cleanPath]: increment(1)
      }
    };

    if (isUniqueDaily) {
      updatePayload.visitors = increment(1);
      if (isMobile) {
        updatePayload.mobileCount = increment(1);
      } else {
        updatePayload.desktopCount = increment(1);
      }
      localStorage.setItem('xpower_visit_date', todayStr);
    }

    await setDoc(docRef, updatePayload, { merge: true });
  } catch (error) {
    // Analytics failure should never block UI or interrupt user experience
    console.debug('Visit tracking skipped:', error);
  }
}

/**
 * Fetches daily stats for the given number of days (default 30).
 */
export async function getDailyStatsRange(days = 30): Promise<DailyStats[]> {
  if (isDummyFirebase) {
    return generateMockDailyStats(days);
  }

  try {
    const colRef = collection(db, 'dailyStats');
    const q = query(colRef, orderBy('date', 'desc'), limit(days));
    const snapshot = await getDocs(q);

    const results: DailyStats[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      results.push({
        id: docSnap.id,
        date: data.date || docSnap.id,
        visitors: Number(data.visitors) || 0,
        pageViews: Number(data.pageViews) || 0,
        mobileCount: Number(data.mobileCount) || 0,
        desktopCount: Number(data.desktopCount) || 0,
        topPages: extractTopPages(data),
        updatedAt:
          data.updatedAt instanceof Timestamp
            ? data.updatedAt.toDate()
            : data.updatedAt
      });
    });

    // Sort chronologically ascending for charts
    return results.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error fetching daily stats range:', error);
    return [];
  }
}

/**
 * Live subscription to today's stats document.
 */
export function subscribeToTodayStats(
  callback: (stats: DailyStats | null) => void
): () => void {
  if (typeof window === 'undefined' || isDummyFirebase) {
    return () => {};
  }

  try {
    const todayStr = getCairoDateString();
    const docRef = doc(db, 'dailyStats', todayStr);

    return onSnapshot(
      docRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          callback(null);
          return;
        }
        const data = docSnap.data();
        callback({
          id: docSnap.id,
          date: data.date || docSnap.id,
          visitors: Number(data.visitors) || 0,
          pageViews: Number(data.pageViews) || 0,
          mobileCount: Number(data.mobileCount) || 0,
          desktopCount: Number(data.desktopCount) || 0,
          topPages: extractTopPages(data),
          updatedAt:
            data.updatedAt instanceof Timestamp
              ? data.updatedAt.toDate()
              : data.updatedAt
        });
      },
      (error) => {
        console.error('Error in subscribeToTodayStats:', error);
      }
    );
  } catch {
    return () => {};
  }
}

function generateMockDailyStats(days: number): DailyStats[] {
  const list: DailyStats[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const visitors = Math.floor(Math.random() * 80) + 40;
    const pageViews = visitors * (Math.floor(Math.random() * 3) + 2);
    const mobileCount = Math.floor(visitors * 0.85);
    const desktopCount = visitors - mobileCount;
    list.push({
      id: dateStr,
      date: dateStr,
      visitors,
      pageViews,
      mobileCount,
      desktopCount,
      topPages: {
        home: Math.floor(pageViews * 0.4),
        products: Math.floor(pageViews * 0.3),
        cart: Math.floor(pageViews * 0.1)
      }
    });
  }
  return list;
}
