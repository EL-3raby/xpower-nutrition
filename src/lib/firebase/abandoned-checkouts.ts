import { db, isDummyFirebase } from './client';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { AbandonedCheckout } from '../types';

// Save/update an abandoned checkout — document ID = phone number
export async function saveAbandonedCheckout(data: Omit<AbandonedCheckout, 'lastUpdatedAt' | 'isContacted' | 'isConverted'>) {
  if (isDummyFirebase) {
    console.log('Mock Mode: saveAbandonedCheckout', data);
    return;
  }

  const docRef = doc(db, 'abandonedCheckouts', data.phone);
  const existing = await getDoc(docRef);
  const existingData = existing.exists() ? existing.data() : null;

  let shouldResetContacted = false;

  if (existingData) {
    if (existingData.isConverted === true) {
      shouldResetContacted = true;
    } else if (existingData.lastUpdatedAt) {
      let lastDate: Date;
      if (existingData.lastUpdatedAt instanceof Timestamp) {
        lastDate = existingData.lastUpdatedAt.toDate();
      } else if (typeof existingData.lastUpdatedAt?.toDate === 'function') {
        lastDate = existingData.lastUpdatedAt.toDate();
      } else if (existingData.lastUpdatedAt.seconds) {
        lastDate = new Date(existingData.lastUpdatedAt.seconds * 1000);
      } else {
        lastDate = new Date(existingData.lastUpdatedAt);
      }

      const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
      if (Date.now() - lastDate.getTime() > SIX_HOURS_MS) {
        shouldResetContacted = true;
      }
    }
  }

  const isContacted = shouldResetContacted ? false : (existingData?.isContacted || false);

  await setDoc(docRef, {
    customerName: data.customerName || '',
    phone: data.phone,
    items: data.items,
    totalPrice: data.totalPrice,
    lastUpdatedAt: serverTimestamp(),
    isContacted,
    isConverted: false,
  });
}

// Mark an abandoned checkout as converted (order was completed)
export async function markAbandonedCheckoutAsConverted(phone: string) {
  if (isDummyFirebase) {
    console.log('Mock Mode: markAbandonedCheckoutAsConverted', phone);
    return;
  }
  try {
    const docRef = doc(db, 'abandonedCheckouts', phone);
    await updateDoc(docRef, { isConverted: true });
  } catch (err) {
    // Non-critical: don't break the order flow if this fails
    console.error('Could not mark abandoned checkout as converted:', err);
  }
}

// Get all non-converted abandoned checkouts for admin
export async function getAbandonedCheckouts(): Promise<AbandonedCheckout[]> {
  if (isDummyFirebase) {
    return [
      {
        phone: '01012345678',
        customerName: 'أحمد تجريبي',
        items: [{ productId: 'prod1', name: 'Pure X Protein', price: 250, quantity: 1 }],
        totalPrice: 250,
        lastUpdatedAt: new Date(Date.now() - 30 * 60 * 1000) as any,
        isContacted: false,
        isConverted: false,
      },
      {
        phone: '01211112222',
        customerName: '',
        items: [{ productId: 'prod2', name: 'Creatine Mono', price: 120, quantity: 2 }],
        totalPrice: 240,
        lastUpdatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) as any,
        isContacted: true,
        isConverted: false,
      }
    ];
  }

  const colRef = collection(db, 'abandonedCheckouts');
  const q = query(colRef, where('isConverted', '==', false), orderBy('lastUpdatedAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    return {
      phone: docSnapshot.id,
      customerName: data.customerName || '',
      items: data.items || [],
      totalPrice: data.totalPrice || 0,
      lastUpdatedAt: data.lastUpdatedAt instanceof Timestamp ? data.lastUpdatedAt.toDate() : data.lastUpdatedAt,
      isContacted: data.isContacted || false,
      isConverted: data.isConverted || false,
    } as AbandonedCheckout;
  });
}

// Mark as contacted by admin
export async function markAbandonedCheckoutAsContacted(phone: string) {
  if (isDummyFirebase) {
    console.log('Mock Mode: markAbandonedCheckoutAsContacted', phone);
    return;
  }
  const docRef = doc(db, 'abandonedCheckouts', phone);
  await updateDoc(docRef, { isContacted: true });
}

// Delete old abandoned checkouts (older than N days)
export async function deleteOldAbandonedCheckouts(olderThanDays: number = 14) {
  if (isDummyFirebase) {
    console.log('Mock Mode: deleteOldAbandonedCheckouts');
    return 0;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

  const colRef = collection(db, 'abandonedCheckouts');
  const q = query(
    colRef,
    where('isConverted', '==', false),
    where('lastUpdatedAt', '<', cutoffTimestamp)
  );

  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletePromises);
  return snapshot.size;
}

// Automatically clean up converted abandoned checkouts older than N days (default 30 days)
export async function cleanupOldConvertedCheckouts(olderThanDays: number = 30): Promise<number> {
  if (isDummyFirebase) {
    console.log('Mock Mode: cleanupOldConvertedCheckouts');
    return 0;
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    const colRef = collection(db, 'abandonedCheckouts');
    const q = query(
      colRef,
      where('isConverted', '==', true),
      where('lastUpdatedAt', '<', cutoffTimestamp)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return 0;

    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    return snapshot.size;
  } catch (err) {
    console.error('Error cleaning up converted checkouts:', err);
    return 0;
  }
}
