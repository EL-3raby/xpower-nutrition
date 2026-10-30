import { db, auth, isDummyFirebase } from './client';
import {
  collection,
  addDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
  getCountFromServer
} from 'firebase/firestore';
import { Category, Coupon, SiteConfig, ActivityLog, ShippingRate, PromoPopup, AuthenticityCode } from '../types';

// Helper function to log activities automatically
export async function logAdminActivity(action: string, targetId: string) {
  try {
    const adminEmail = auth.currentUser?.email || 'unknown@xpower.com';
    const logCol = collection(db, 'activityLog');
    await addDoc(logCol, {
      adminEmail,
      action,
      targetId,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging admin activity:', error);
  }
}

// ==========================================
// Category CRUD Actions
// ==========================================
export async function getCategories(): Promise<Category[]> {
  if (isDummyFirebase) {
    return DEFAULT_CATEGORIES;
  }
  try {
    const colRef = collection(db, 'categories');
    const q = query(colRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => ({
      id: docSnapshot.id,
      ...docSnapshot.data()
    } as Category));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export async function addCategory(category: Omit<Category, 'id'>) {
  const colRef = collection(db, 'categories');
  const docRef = await addDoc(colRef, category);
  await logAdminActivity('created category', docRef.id);
  return docRef.id;
}

export async function updateCategory(id: string, category: Partial<Category>) {
  const docRef = doc(db, 'categories', id);
  await updateDoc(docRef, category);
  await logAdminActivity('updated category', id);
}

export async function deleteCategory(id: string) {
  const docRef = doc(db, 'categories', id);
  await deleteDoc(docRef);
  await logAdminActivity('deleted category', id);
}

// ==========================================
// Coupon CRUD Actions
// ==========================================
export async function getCoupons(): Promise<Coupon[]> {
  if (isDummyFirebase) {
    return DEFAULT_COUPONS;
  }
  try {
    const colRef = collection(db, 'coupons');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        expiryDate: data.expiryDate instanceof Timestamp ? data.expiryDate.toDate() : data.expiryDate
      } as Coupon;
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return [];
  }
}

export async function addCoupon(coupon: Omit<Coupon, 'id'>) {
  const colRef = collection(db, 'coupons');
  const docRef = await addDoc(colRef, coupon);
  await logAdminActivity('created coupon', docRef.id);
  return docRef.id;
}

export async function updateCoupon(id: string, coupon: Partial<Coupon>) {
  const docRef = doc(db, 'coupons', id);
  await updateDoc(docRef, coupon);
  await logAdminActivity('updated coupon', id);
}

export async function deleteCoupon(id: string) {
  const docRef = doc(db, 'coupons', id);
  await deleteDoc(docRef);
  await logAdminActivity('deleted coupon', id);
}

// ==========================================
// Site Config Settings Actions
// ==========================================
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat1', name: 'بروتينات', slug: 'protein', order: 1, isActive: true },
  { id: 'cat2', name: 'كرياتين', slug: 'creatine', order: 2, isActive: true },
  { id: 'cat3', name: 'ضخامة عضلية', slug: 'mass-gainer', order: 3, isActive: true }
];

const DEFAULT_COUPONS: Coupon[] = [
  { id: 'coup1', code: 'XPOWER20', discountType: 'percentage', discountValue: 20, minOrderValue: 500, isActive: true },
  { id: 'coup2', code: 'WELCOME50', discountType: 'fixed', discountValue: 50, minOrderValue: 200, isActive: true }
];

export const DEFAULT_CONFIG: SiteConfig = {
  heroBanner: {
    imageUrl: '/images/no-image.png',
    title: 'القوة الحقيقية تبدأ من هنا',
    subtitle: 'اكتشف مجموعتنا من المكملات الغذائية المصممة للرياضيين.',
    ctaText: 'اطلب الآن',
    ctaLink: '/products'
  },
  promoBanner: {
    isActive: true,
    text: 'شحن مجاني لجميع محافظات مصر للأوردرات فوق 1000 ج.م! 🚚📦'
  },
  contactInfo: {
    phone: '01012345678',
    whatsapp: '01012345678',
    email: 'support@xpower.com'
  },
  socialLinks: {
    facebook: 'https://www.facebook.com/share/19JKVpTvHG/?mibextid=wwXIfr',
    instagram: 'https://www.instagram.com/xpower_nutrition?igsh=MWp2c3RydGp1dHNldg%3D%3D&utm_source=qr',
    tiktok: 'https://www.tiktok.com/@xpower.nutrition?_r=1&_t=ZS-98Cg9ZNUf4P'
  },
  trustBadges: ['منتجات أصلية 100%', 'شحن سريع خلال 24 ساعة', 'دفع عند الاستلام', 'معاينة الطرد قبل الدفع'],
  freeShipping: {
    isEnabled: true,
    thresholdAmount: 1000,
    depositAmountWhenFree: 100
  },
  flashSale: {
    isActive: false,
    productId: '',
    endDateTime: new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
  },
  bestSellers: {
    isActive: true
  },
  socialProof: {
    isActive: false,
    images: []
  },
  paymentReceivingInfo: {
    vodafoneCashNumber: '01012345678',
    instapayHandle: 'xpower@instapay'
  },
  paymentMethodsEnabled: {
    cod: false,
    vodafoneCash: true,
    instapay: true,
  },
  maintenanceMode: {
    isActive: false,
    title: 'الموقع تحت الصيانة والتطوير',
    message: 'نعمل حالياً على تحسين وتطوير تجربة التسوق لنقدم لكم أفضل خدمة مكملات غذائية. سنعود للعمل قريباً جداً.',
    estimatedEndTime: ''
  },
  bulkDiscount: {
    isActive: false,
    type: 'percentage',
    value: 0,
    scope: 'all',
    endDate: null
  }
};

export const UPPER_EGYPT_GOVERNORATES = [
  'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان'
];

export const FRONTIER_GOVERNORATES = [
  'مطروح', 'شمال سيناء', 'جنوب سيناء', 'الوادي الجديد'
];

export const DEFAULT_SHIPPING_RATES: ShippingRate[] = [
  // 1. الدلتا، القناة، القاهرة الكبرى، والبحر الأحمر (80 ج.م)
  { id: 'rate1', cityName: 'القاهرة', rate: 80, isActive: true },
  { id: 'rate2', cityName: 'الجيزة', rate: 80, isActive: true },
  { id: 'rate3', cityName: 'القليوبية', rate: 80, isActive: true },
  { id: 'rate4', cityName: 'الإسكندرية', rate: 80, isActive: true },
  { id: 'rate5', cityName: 'الدقهلية', rate: 80, isActive: true },
  { id: 'rate6', cityName: 'البحيرة', rate: 80, isActive: true },
  { id: 'rate7', cityName: 'الغربية', rate: 80, isActive: true },
  { id: 'rate8', cityName: 'المنوفية', rate: 80, isActive: true },
  { id: 'rate9', cityName: 'الشرقية', rate: 80, isActive: true },
  { id: 'rate10', cityName: 'كفر الشيخ', rate: 80, isActive: true },
  { id: 'rate11', cityName: 'دمياط', rate: 80, isActive: true },
  { id: 'rate12', cityName: 'بورسعيد', rate: 80, isActive: true },
  { id: 'rate13', cityName: 'الإسماعيلية', rate: 80, isActive: true },
  { id: 'rate14', cityName: 'السويس', rate: 80, isActive: true },
  { id: 'rate15', cityName: 'البحر الأحمر', rate: 80, isActive: true },

  // 2. خط الصعيد (100 ج.م)
  { id: 'rate16', cityName: 'الفيوم', rate: 100, isActive: true },
  { id: 'rate17', cityName: 'بني سويف', rate: 100, isActive: true },
  { id: 'rate18', cityName: 'المنيا', rate: 100, isActive: true },
  { id: 'rate19', cityName: 'أسيوط', rate: 100, isActive: true },
  { id: 'rate20', cityName: 'سوهاج', rate: 100, isActive: true },
  { id: 'rate21', cityName: 'قنا', rate: 100, isActive: true },
  { id: 'rate22', cityName: 'الأقصر', rate: 100, isActive: true },
  { id: 'rate23', cityName: 'أسوان', rate: 100, isActive: true },

  // 3. المحافظات الحدودية (120 ج.م)
  { id: 'rate24', cityName: 'مطروح', rate: 120, isActive: true },
  { id: 'rate25', cityName: 'شمال سيناء', rate: 120, isActive: true },
  { id: 'rate26', cityName: 'جنوب سيناء', rate: 120, isActive: true },
  { id: 'rate27', cityName: 'الوادي الجديد', rate: 120, isActive: true }
];

export async function getSiteConfig(): Promise<SiteConfig> {
  if (isDummyFirebase) {
    return DEFAULT_CONFIG;
  }
  try {
    const docRef = doc(db, 'settings', 'siteConfig');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...DEFAULT_CONFIG,
        ...data,
        freeShipping: {
          ...DEFAULT_CONFIG.freeShipping,
          ...(data.freeShipping || {})
        },
        paymentMethodsEnabled: {
          ...DEFAULT_CONFIG.paymentMethodsEnabled,
          ...(data.paymentMethodsEnabled || {})
        },
        maintenanceMode: {
          ...DEFAULT_CONFIG.maintenanceMode,
          ...(data.maintenanceMode || {})
        },
        bulkDiscount: {
          ...DEFAULT_CONFIG.bulkDiscount,
          ...(data.bulkDiscount || {})
        }
      } as SiteConfig;
    }
  } catch (error) {
    console.error('Error fetching site config:', error);
  }
  // If config does not exist or fetch fails, return default config
  return DEFAULT_CONFIG;
}

export async function updateSiteConfig(config: Partial<SiteConfig>) {
  const docRef = doc(db, 'settings', 'siteConfig');
  await setDoc(docRef, config, { merge: true });
  await logAdminActivity('updated site config', 'siteConfig');
}

// ==========================================
// Shipping Rates CRUD Actions
// ==========================================
export async function getShippingRates(): Promise<ShippingRate[]> {
  if (isDummyFirebase) {
    return DEFAULT_SHIPPING_RATES;
  }
  try {
    const colRef = collection(db, 'shippingRates');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        cityName: data.cityName,
        rate: Number(data.rate),
        isActive: !!data.isActive
      } as ShippingRate;
    });
  } catch (error) {
    console.error('Error fetching shipping rates:', error);
    return [];
  }
}

export async function addShippingRate(rate: Omit<ShippingRate, 'id'>) {
  if (isDummyFirebase) {
    console.log('Mock Mode: Added shipping rate payload', rate);
    return 'mock_shipping_rate_id';
  }
  const colRef = collection(db, 'shippingRates');
  const docRef = await addDoc(colRef, rate);
  await logAdminActivity('created shipping rate', docRef.id);
  return docRef.id;
}

export async function updateShippingRate(id: string, rate: Partial<ShippingRate>) {
  if (isDummyFirebase) {
    console.log(`Mock Mode: Updated shipping rate #${id} with payload`, rate);
    return;
  }
  const docRef = doc(db, 'shippingRates', id);
  await updateDoc(docRef, rate);
  await logAdminActivity('updated shipping rate', id);
}

export async function deleteShippingRate(id: string) {
  if (isDummyFirebase) {
    console.log(`Mock Mode: Deleted shipping rate #${id}`);
    return;
  }
  const docRef = doc(db, 'shippingRates', id);
  await deleteDoc(docRef);
  await logAdminActivity('deleted shipping rate', id);
}

// ==========================================
// Activity Log Retrieval
// ==========================================
export async function getActivityLogs(): Promise<ActivityLog[]> {
  const colRef = collection(db, 'activityLog');
  const q = query(colRef, orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      ...data,
      timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : data.timestamp
    } as ActivityLog;
  });
}

// ==========================================
// Promo Popup CRUD Actions
// ==========================================
const DEFAULT_PROMO_POPUP: PromoPopup = {
  isActive: false,
  imageUrl: '',
  ctaText: 'تسوق الآن',
  ctaLink: '/products',
  endDateTime: new Date(),
  showCountdown: true
};

export async function getPromoPopup(): Promise<PromoPopup> {
  if (isDummyFirebase) {
    return DEFAULT_PROMO_POPUP;
  }
  try {
    const docRef = doc(db, 'promoPopup', 'config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...DEFAULT_PROMO_POPUP,
        ...data,
        endDateTime: data.endDateTime instanceof Timestamp ? data.endDateTime.toDate() : data.endDateTime
      } as PromoPopup;
    }
  } catch (error) {
    console.error('Error fetching promo popup config:', error);
  }
  return DEFAULT_PROMO_POPUP;
}

export async function updatePromoPopup(data: Partial<PromoPopup>) {
  const docRef = doc(db, 'promoPopup', 'config');
  await setDoc(docRef, data, { merge: true });
  await logAdminActivity('updated promo popup', 'config');
}

// ==========================================
// Authenticity Codes Actions
// ==========================================

/** Normalizes any code input to uppercase trimmed string */
function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Add a single authenticity code (admin only) */
export async function addAuthenticityCode(code: string, productName?: string): Promise<void> {
  const cleanCode = normalizeCode(code);
  if (!cleanCode) throw new Error('الكود لا يمكن أن يكون فارغاً');

  const docRef = doc(db, 'authenticityCodes', cleanCode);
  const existing = await getDoc(docRef);
  if (existing.exists()) {
    throw new Error(`الكود "${cleanCode}" موجود بالفعل`);
  }

  const payload: Omit<AuthenticityCode, 'usedAt'> = {
    code: cleanCode,
    isUsed: false,
    createdAt: serverTimestamp() as any,
    ...(productName?.trim() ? { productName: productName.trim() } : {})
  };

  await setDoc(docRef, payload);
  await logAdminActivity('added authenticity code', cleanCode);
}

/** Bulk insert authenticity codes using Batched Writes (max 500 per batch) */
export async function addAuthenticityCodesBatch(
  codes: Array<{ code: string; productName?: string }>,
  onProgress?: (done: number, total: number) => void
): Promise<{ added: number; skipped: number }> {
  const BATCH_SIZE = 499; // 499 writes + 1 activityLog per batch = 500 max
  let added = 0;
  let skipped = 0;
  const total = codes.length;

  for (let i = 0; i < codes.length; i += BATCH_SIZE) {
    const chunk = codes.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    const batchCodes: string[] = [];

    for (const entry of chunk) {
      const cleanCode = normalizeCode(entry.code);
      if (!cleanCode) { skipped++; continue; }

      const docRef = doc(db, 'authenticityCodes', cleanCode);
      batch.set(docRef, {
        code: cleanCode,
        isUsed: false,
        createdAt: serverTimestamp(),
        ...(entry.productName?.trim() ? { productName: entry.productName.trim() } : {})
      }, { merge: false });

      batchCodes.push(cleanCode);
      added++;
    }

    await batch.commit();
    await logAdminActivity(
      `bulk added ${batchCodes.length} authenticity codes (batch ${Math.floor(i / BATCH_SIZE) + 1})`,
      batchCodes.slice(0, 3).join(', ') + (batchCodes.length > 3 ? '...' : '')
    );

    if (onProgress) onProgress(Math.min(i + BATCH_SIZE, total), total);
  }

  return { added, skipped };
}

/** Get stats: total, used, available */
export async function getAuthenticityCodeStats(): Promise<{ total: number; used: number; available: number }> {
  try {
    const colRef = collection(db, 'authenticityCodes');
    const [totalSnap, usedSnap] = await Promise.all([
      getCountFromServer(colRef),
      getCountFromServer(query(colRef, where('isUsed', '==', true)))
    ]);
    const total = totalSnap.data().count;
    const used = usedSnap.data().count;
    return { total, used, available: total - used };
  } catch (error) {
    console.error('Error fetching authenticity code stats:', error);
    return { total: 0, used: 0, available: 0 };
  }
}

/** Search/list authenticity codes with optional search term */
export async function getAuthenticityCodes(
  searchCode?: string,
  pageLimit = 50
): Promise<AuthenticityCode[]> {
  try {
    const colRef = collection(db, 'authenticityCodes');
    if (searchCode) {
      const clean = normalizeCode(searchCode);
      const docRef = doc(db, 'authenticityCodes', clean);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return [{ ...snap.data() } as AuthenticityCode];
      }
      return [];
    }
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(pageLimit));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data() } as AuthenticityCode));
  } catch (error) {
    console.error('Error fetching authenticity codes:', error);
    return [];
  }
}

/** Delete a single authenticity code */
export async function deleteAuthenticityCode(code: string): Promise<void> {
  const cleanCode = normalizeCode(code);
  const docRef = doc(db, 'authenticityCodes', cleanCode);
  await deleteDoc(docRef);
  await logAdminActivity('deleted authenticity code', cleanCode);
}

/**
 * Generate `count` unique 8-character alphanumeric codes (e.g. "X7P9K4M2").
 *
 * Fast approach:
 *   1. Fetch ALL existing code IDs in ONE getDocs call → build a Set in memory
 *   2. Generate `count` unique 8-character random alphanumeric codes (mix of letters & numbers)
 *   3. Write new codes in batches of 499
 */
export async function generateAndSaveAuthenticityCodes(
  count: number,
  productName?: string,
  onProgress?: (done: number, total: number) => void
): Promise<{ added: number; alreadyExisted: number }> {
  if (count < 1 || count > 10000) throw new Error('العدد يجب أن يكون بين 1 و 10000');

  // Step 1: Fetch all existing codes in ONE request → Set for O(1) lookup
  const colRef = collection(db, 'authenticityCodes');
  const existingSnap = await getDocs(colRef);
  const existingSet = new Set(existingSnap.docs.map(d => d.id));

  if (onProgress) onProgress(0, count);

  // Step 2: Generate `count` unique 8-char alphanumeric codes (mix of A-Z & 0-9)
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const newCodesSet = new Set<string>();

  let attempts = 0;
  const maxAttempts = count * 100;

  while (newCodesSet.size < count && attempts < maxAttempts) {
    attempts++;
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure code has both letters and numbers (like X7P9K4M2)
    if (!/[A-Z]/.test(code) || !/[0-9]/.test(code)) continue;

    if (!existingSet.has(code)) {
      newCodesSet.add(code);
    }
  }

  const newCodes = Array.from(newCodesSet);
  const alreadyExisted = existingSet.size;

  if (newCodes.length === 0) {
    return { added: 0, alreadyExisted };
  }

  // Step 3: Write new codes in batches of 499 (Firestore limit)
  const BATCH_SIZE = 499;
  let added = 0;

  for (let i = 0; i < newCodes.length; i += BATCH_SIZE) {
    const chunk = newCodes.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const code of chunk) {
      const docRef = doc(db, 'authenticityCodes', code);
      batch.set(docRef, {
        code,
        isUsed: false,
        createdAt: serverTimestamp(),
        ...(productName?.trim() ? { productName: productName.trim() } : {}),
      });
    }

    await batch.commit();
    added += chunk.length;
    await logAdminActivity(`auto-generated ${chunk.length} authenticity codes`, 'authenticityCodes');
    if (onProgress) onProgress(added, newCodes.length);
  }

  return { added, alreadyExisted };
}


/**
 * Fetch all UNUSED authenticity codes and return a CSV string.
 * Downloads in chunks of 500 using pagination.
 */
export async function getAvailableCodesCSV(productName?: string): Promise<string> {
  const colRef = collection(db, 'authenticityCodes');
  const q = query(
    colRef,
    where('isUsed', '==', false),
    orderBy('code', 'asc'),
    limit(5000)
  );
  const snap = await getDocs(q);

  const rows: string[] = ['Code,ProductName,CreatedAt'];
  for (const d of snap.docs) {
    const data = d.data();
    const createdAt = data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : '';
    const pn = (data.productName ?? productName ?? '').replace(/,/g, ' ');
    rows.push(`${data.code},${pn},${createdAt}`);
  }

  return rows.join('\n');
}


export async function syncStandardShippingRates(): Promise<{ count: number }> {
  if (isDummyFirebase) {
    return { count: DEFAULT_SHIPPING_RATES.length };
  }
  try {
    const colRef = collection(db, 'shippingRates');
    const snapshot = await getDocs(colRef);
    const existingMap = new Map<string, string>(); // cityName -> docId
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      if (d.cityName) {
        existingMap.set(d.cityName.trim(), docSnap.id);
      }
    });

    const batch = writeBatch(db);
    DEFAULT_SHIPPING_RATES.forEach(rate => {
      const existingId = existingMap.get(rate.cityName);
      if (existingId) {
        batch.update(doc(db, 'shippingRates', existingId), {
          rate: rate.rate,
          isActive: true
        });
      } else {
        batch.set(doc(colRef, rate.id), {
          cityName: rate.cityName,
          rate: rate.rate,
          isActive: true
        });
      }
    });

    await batch.commit();
    await logAdminActivity('تحديث أسعار الشحن للأسعار الرسمية المعتمدة (80 / 100 / 120)', 'shipping');
    return { count: DEFAULT_SHIPPING_RATES.length };
  } catch (error) {
    console.error('Error syncing standard shipping rates:', error);
    throw error;
  }
}
