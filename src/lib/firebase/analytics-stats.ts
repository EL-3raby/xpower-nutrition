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
 * Detects the incoming traffic source using URL parameters and HTTP Referrer.
 * Persists attribution in sessionStorage and localStorage (30-day attribution window).
 */
export function detectTrafficSource(): { source: string; campaign?: string } {
  if (typeof window === 'undefined') return { source: 'direct' };

  try {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    const utmSource = params.get('utm_source')?.toLowerCase().trim();
    const utmCampaign = params.get('utm_campaign')?.trim() || undefined;
    const fbclid = params.get('fbclid');
    const ttclid = params.get('ttclid');
    const gclid = params.get('gclid');
    const igshid = params.get('igshid');

    let detectedSource = '';

    // 1. Check explicit UTM Source
    if (utmSource) {
      if (utmSource.includes('face') || utmSource === 'fb') detectedSource = 'facebook';
      else if (utmSource.includes('tik') || utmSource === 'tt') detectedSource = 'tiktok';
      else if (utmSource.includes('insta') || utmSource === 'ig') detectedSource = 'instagram';
      else if (utmSource.includes('goog') || utmSource === 'gads') detectedSource = 'google';
      else if (utmSource.includes('snap')) detectedSource = 'snapchat';
      else if (utmSource.includes('what') || utmSource === 'wa') detectedSource = 'whatsapp';
      else detectedSource = utmSource.replace(/[^a-z0-9_-]/gi, '').slice(0, 30) || 'referral';
    }
    // 2. Check Click IDs from Paid Ads
    else if (fbclid) {
      detectedSource = 'facebook';
    } else if (ttclid) {
      detectedSource = 'tiktok';
    } else if (gclid) {
      detectedSource = 'google';
    } else if (igshid) {
      detectedSource = 'instagram';
    }
    // 3. Check Document Referrer
    else if (document.referrer) {
      const ref = document.referrer.toLowerCase();
      const currentHost = window.location.hostname;
      if (!ref.includes(currentHost)) {
        if (ref.includes('facebook.com') || ref.includes('fb.me')) detectedSource = 'facebook';
        else if (ref.includes('instagram.com')) detectedSource = 'instagram';
        else if (ref.includes('tiktok.com')) detectedSource = 'tiktok';
        else if (ref.includes('google.com')) detectedSource = 'google';
        else if (ref.includes('youtube.com') || ref.includes('youtu.be')) detectedSource = 'youtube';
        else if (ref.includes('snapchat.com')) detectedSource = 'snapchat';
        else if (ref.includes('whatsapp') || ref.includes('wa.me')) detectedSource = 'whatsapp';
        else detectedSource = 'referral';
      }
    }

    // 4. If a new source was detected, persist it
    if (detectedSource) {
      try {
        sessionStorage.setItem('xpower_traffic_source', detectedSource);
        localStorage.setItem('xpower_traffic_source', detectedSource);
        if (utmCampaign) {
          sessionStorage.setItem('xpower_utm_campaign', utmCampaign);
          localStorage.setItem('xpower_utm_campaign', utmCampaign);
        }
      } catch {}
      return { source: detectedSource, campaign: utmCampaign };
    }

    // 5. Fallback to existing session or 30-day localStorage attribution
    const storedSource = sessionStorage.getItem('xpower_traffic_source') || localStorage.getItem('xpower_traffic_source');
    const storedCampaign = sessionStorage.getItem('xpower_utm_campaign') || localStorage.getItem('xpower_utm_campaign') || undefined;

    return {
      source: storedSource || 'direct',
      campaign: storedCampaign
    };
  } catch {
    return { source: 'direct' };
  }
}

/**
 * Returns the currently attributed traffic source for order placement.
 */
export function getAttributedTrafficSource(): { source: string; campaign?: string } {
  if (typeof window === 'undefined') return { source: 'direct' };
  try {
    const source = sessionStorage.getItem('xpower_traffic_source') || localStorage.getItem('xpower_traffic_source') || 'direct';
    const campaign = sessionStorage.getItem('xpower_utm_campaign') || localStorage.getItem('xpower_utm_campaign') || undefined;
    return { source, campaign };
  } catch {
    return { source: 'direct' };
  }
}

/**
 * Extracts and normalizes sources map, handling both nested maps and legacy flat keys.
 */
function extractSources(data: Record<string, any>): Record<string, number> {
  const result: Record<string, number> = {};

  if (data.sources && typeof data.sources === 'object') {
    Object.entries(data.sources).forEach(([k, v]) => {
      result[k] = (result[k] || 0) + Number(v || 0);
    });
  }

  Object.keys(data).forEach((key) => {
    if (key.startsWith('sources.')) {
      const srcKey = key.replace('sources.', '');
      result[srcKey] = (result[srcKey] || 0) + Number(data[key] || 0);
    }
  });

  return result;
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
      const traffic = detectTrafficSource();
      updatePayload.visitors = increment(1);
      if (isMobile) {
        updatePayload.mobileCount = increment(1);
      } else {
        updatePayload.desktopCount = increment(1);
      }
      updatePayload.sources = {
        [traffic.source]: increment(1)
      };
      localStorage.setItem('xpower_visit_date', todayStr);
    } else {
      // Ensure landing with new campaign link captures attribution
      detectTrafficSource();
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
        sources: extractSources(data),
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
          sources: extractSources(data),
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
    const fb = Math.floor(visitors * 0.45);
    const tt = Math.floor(visitors * 0.3);
    const ig = Math.floor(visitors * 0.15);
    const dir = Math.max(0, visitors - fb - tt - ig);
    list.push({
      id: dateStr,
      date: dateStr,
      visitors,
      pageViews,
      mobileCount,
      desktopCount,
      sources: {
        facebook: fb,
        tiktok: tt,
        instagram: ig,
        direct: dir
      },
      topPages: {
        home: Math.floor(pageViews * 0.4),
        products: Math.floor(pageViews * 0.3),
        cart: Math.floor(pageViews * 0.1)
      }
    });
  }
  return list;
}
