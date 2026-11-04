import { db, isDummyFirebase } from './client';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  where,
  runTransaction, 
  Timestamp,
  serverTimestamp,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { Order, Product } from '../types';
import { logAdminActivity } from './admin-actions';
import { invalidateCache } from '../cache';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Recursively removes all `undefined` values from an object or array.
 * Preserves custom class instances (Firestore Timestamp, FieldValue, Date, etc.)
 */
export function removeUndefinedDeep<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => removeUndefinedDeep(item)) as unknown as T;
  }
  if (isPlainObject(data)) {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        clean[key] = removeUndefinedDeep(value);
      }
    }
    return clean as unknown as T;
  }
  return data;
}

// Place an order using Firestore Transaction for Stock Safeguard
// phone is passed separately to atomically mark any abandoned checkout as converted
export async function createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'status' | 'isReadByAdmin'>, customId?: string): Promise<string> {
  if (isDummyFirebase) {
    const finalId = customId || `mock_order_${orderData.paymentMethod}_${Date.now()}`;
    console.log('Mock Mode: Created order payload', orderData, 'with ID', finalId);
    
    const needsReview = orderData.paymentMethod === 'vodafone_cash' ||
      orderData.paymentMethod === 'instapay' ||
      (orderData.paymentMethod === 'cod' && (orderData.depositAmount ?? 0) > 0);

    const mockOrder: Order = {
      id: finalId,
      customerName: orderData.customerName,
      phone: orderData.phone,
      address: orderData.address,
      city: orderData.city,
      items: orderData.items,
      totalPrice: orderData.totalPrice,
      paymentMethod: orderData.paymentMethod,
      vodafoneCashNumber: orderData.vodafoneCashNumber,
      instapayHandle: orderData.instapayHandle,
      depositPaymentMethod: orderData.depositPaymentMethod,
      depositSenderInfo: orderData.depositSenderInfo,
      depositAmount: orderData.depositAmount,
      paymentProofUrl: orderData.paymentProofUrl,
      paymentStatus: needsReview ? 'pending_review' : undefined,
      status: 'pending',
      isReadByAdmin: false,
      createdAt: new Date()
    };
    DEFAULT_ORDERS.unshift(mockOrder);
    return finalId;
  }

  const ordersColRef = collection(db, 'orders');
  const newOrderDocRef = customId ? doc(db, 'orders', customId) : doc(ordersColRef);

  const createdOrderId = await runTransaction(db, async (transaction) => {
    const stockUpdates: { productRef: any; newStock: number; newSalesCount: number }[] = [];

    // === PHASE 1: ALL READS ===

    // 1a. First, read each order item's product document to check if it's a regular product or a bundle
    const itemProductSnaps = new Map<string, { ref: any; data: Product }>();
    for (const item of orderData.items) {
      if (!itemProductSnaps.has(item.productId)) {
        const productRef = doc(db, 'products', item.productId);
        const productSnapshot = await transaction.get(productRef);
        if (!productSnapshot.exists()) {
          throw new Error("المنتج " + item.name + " غير موجود في قاعدة البيانات.");
        }
        itemProductSnaps.set(item.productId, { ref: productRef, data: productSnapshot.data() as Product });
      }
    }

    // Calculate required stock deductions for every individual component/product
    const requiredQuantities = new Map<string, { ref: any; name: string; requiredQty: number }>();
    const bundleSalesUpdates: { productRef: any; salesIncrement: number }[] = [];

    for (const item of orderData.items) {
      const itemInfo = itemProductSnaps.get(item.productId)!;
      const productData = itemInfo.data;

      const isBundle = Boolean(productData.isBundle || item.isBundle);
      const bundleItems = (item.bundleItems && item.bundleItems.length > 0) ? item.bundleItems : productData.bundleItems;

      if (isBundle && bundleItems && bundleItems.length > 0) {
        // Record sales count increment for the bundle itself
        bundleSalesUpdates.push({ productRef: itemInfo.ref, salesIncrement: item.quantity });

        // For each component, read its product document if not already read
        for (const bItem of bundleItems) {
          if (!requiredQuantities.has(bItem.productId) && !itemProductSnaps.has(bItem.productId)) {
            const compRef = doc(db, 'products', bItem.productId);
            const compSnap = await transaction.get(compRef);
            if (!compSnap.exists()) {
              throw new Error("المنتج المكون [" + (bItem.name || bItem.productId) + "] داخل الباقة غير موجود.");
            }
            itemProductSnaps.set(bItem.productId, { ref: compRef, data: compSnap.data() as Product });
          }

          const compInfo = itemProductSnaps.get(bItem.productId)!;
          const compData = compInfo.data;
          const needed = bItem.quantity * item.quantity;

          const curr = requiredQuantities.get(bItem.productId);
          if (curr) {
            curr.requiredQty += needed;
          } else {
            requiredQuantities.set(bItem.productId, {
              ref: compInfo.ref,
              name: compData.name,
              requiredQty: needed
            });
          }
        }
      } else {
        // Regular product
        const needed = item.quantity;
        const curr = requiredQuantities.get(item.productId);
        if (curr) {
          curr.requiredQty += needed;
        } else {
          requiredQuantities.set(item.productId, {
            ref: itemInfo.ref,
            name: productData.name,
            requiredQty: needed
          });
        }
      }
    }

    // Verify stock availability for every required product
    for (const [prodId, req] of requiredQuantities.entries()) {
      const pData = itemProductSnaps.get(prodId)!.data;
      if (pData.stock < req.requiredQty) {
        throw new Error(
          "الكمية المطلوبة من [" + req.name + "] غير متوفرة حالياً. المتاح بالمخزون: " + pData.stock + " فقط."
        );
      }
      const newStock = pData.stock - req.requiredQty;
      const newSalesCount = (pData.salesCount || 0) + req.requiredQty;
      stockUpdates.push({ productRef: req.ref, newStock, newSalesCount });
    }

    // 1b. Read abandoned checkout doc (must be in Phase 1 before any writes)
    const abandonedRef = doc(db, 'abandonedCheckouts', orderData.phone);
    let abandonedExists = false;
    try {
      const abandonedSnap = await transaction.get(abandonedRef);
      abandonedExists = abandonedSnap.exists();
    } catch {
      // If read fails for any reason, skip — don't break the order
    }

    // === PHASE 2: ALL WRITES ===

    // 2a. Update product stock for components and regular products
    for (const update of stockUpdates) {
      transaction.update(update.productRef, { 
        stock: update.newStock,
        salesCount: update.newSalesCount
      });
    }

    // 2b. Update bundle sales counts (aggregated by product ID to handle duplicate bundles in cart)
    const bundleSalesAgg = new Map<string, { ref: any; inc: number }>();
    for (const bSale of bundleSalesUpdates) {
      const existing = bundleSalesAgg.get(bSale.productRef.id);
      if (existing) {
        existing.inc += bSale.salesIncrement;
      } else {
        bundleSalesAgg.set(bSale.productRef.id, { ref: bSale.productRef, inc: bSale.salesIncrement });
      }
    }
    for (const [bid, { ref, inc }] of bundleSalesAgg) {
      const bData = itemProductSnaps.get(bid)?.data;
      if (bData) {
        transaction.update(ref, {
          salesCount: (bData.salesCount || 0) + inc
        });
      }
    }

    // 2b. Create the order
    const orderPayload: any = {
      customerName: orderData.customerName,
      phone: orderData.phone,
      address: orderData.address,
      city: orderData.city,
      // Clean items — remove undefined fields like flavor
      items: orderData.items.map(item => {
        const cleanItem: any = {
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        };
        if (item.flavor !== undefined && item.flavor !== null) {
          cleanItem.flavor = item.flavor;
        }
        if (item.isBundle) {
          cleanItem.isBundle = true;
        }
        if (item.bundleItems && Array.isArray(item.bundleItems)) {
          cleanItem.bundleItems = item.bundleItems.map((b: any) => {
            const cleanB: any = {
              productId: b.productId,
              name: b.name,
              quantity: b.quantity
            };
            if (b.selectedFlavor) {
              cleanB.selectedFlavor = b.selectedFlavor;
            }
            return cleanB;
          });
        }
        return cleanItem;
      }),
      totalPrice: orderData.totalPrice,
      paymentMethod: orderData.paymentMethod,
      status: 'pending',
      isReadByAdmin: false,
      createdAt: serverTimestamp()
    };

    if (orderData.couponCode) {
      orderPayload.couponCode = orderData.couponCode;
    }
    if (orderData.discountAmount !== undefined) {
      orderPayload.discountAmount = orderData.discountAmount;
    }

    if (orderData.paymentMethod === 'vodafone_cash') {
      orderPayload.paymentStatus = 'pending_review';
      if (orderData.vodafoneCashNumber) {
        orderPayload.vodafoneCashNumber = orderData.vodafoneCashNumber;
      }
      if (orderData.paymentProofUrl) {
        orderPayload.paymentProofUrl = orderData.paymentProofUrl;
      }
    } else if (orderData.paymentMethod === 'instapay') {
      orderPayload.paymentStatus = 'pending_review';
      if (orderData.instapayHandle) {
        orderPayload.instapayHandle = orderData.instapayHandle;
      }
      if (orderData.paymentProofUrl) {
        orderPayload.paymentProofUrl = orderData.paymentProofUrl;
      }
    } else if (orderData.paymentMethod === 'cod') {
      if (orderData.depositAmount !== undefined && orderData.depositAmount > 0) {
        orderPayload.paymentStatus = 'pending_review';
        orderPayload.depositAmount = orderData.depositAmount;
        if (orderData.depositPaymentMethod) {
          orderPayload.depositPaymentMethod = orderData.depositPaymentMethod;
        }
        if (orderData.depositSenderInfo) {
          orderPayload.depositSenderInfo = orderData.depositSenderInfo;
        }
        if (orderData.paymentProofUrl) {
          orderPayload.paymentProofUrl = orderData.paymentProofUrl;
        }
      }
    }

    // Final safety: recursively strip any undefined values from all levels (nested objects & arrays)
    const sanitizedOrderPayload = removeUndefinedDeep(orderPayload);

    transaction.set(newOrderDocRef, sanitizedOrderPayload);

    // 2c. Atomically mark the abandoned checkout as converted (if it existed)
    if (abandonedExists) {
      transaction.update(abandonedRef, { isConverted: true });
    }

    return newOrderDocRef.id;
  });

  invalidateCache('product');
  return createdOrderId;
}

const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ord1',
    customerName: 'أحمد محمد',
    phone: '01012345678',
    address: 'شارع التحرير، وسط البلد',
    city: 'القاهرة',
    items: [
      { productId: 'prod1', name: 'Pure X Protein', price: 250, quantity: 1 }
    ],
    totalPrice: 300,
    paymentMethod: 'cod',
    status: 'pending',
    isReadByAdmin: false,
    createdAt: new Date()
  },
  {
    id: 'ord2',
    customerName: 'سارة علي',
    phone: '01211112222',
    address: 'سموحة، بجوار النادي',
    city: 'الإسكندرية',
    items: [
      { productId: 'prod2', name: 'Creatine Mono', price: 120, quantity: 2 }
    ],
    totalPrice: 300,
    paymentMethod: 'vodafone_cash',
    vodafoneCashNumber: '01211112222',
    status: 'confirmed',
    paymentStatus: 'pending_review',
    paymentProofUrl: '/images/no-image.png',
    isReadByAdmin: true,
    createdAt: new Date(Date.now() - 86400000)
  }
];

// Retrieve orders (with optional status filtering)
export async function getOrders(statusFilter?: string): Promise<Order[]> {
  if (isDummyFirebase) {
    if (statusFilter && statusFilter !== 'all') {
      return DEFAULT_ORDERS.filter(o => o.status === statusFilter);
    }
    return DEFAULT_ORDERS;
  }

  const colRef = collection(db, 'orders');
  let q = query(colRef, orderBy('createdAt', 'desc'));

  if (statusFilter && statusFilter !== 'all') {
    q = query(colRef, where('status', '==', statusFilter), orderBy('createdAt', 'desc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt
    } as Order;
  });
}

// Retrieve order details by ID
export async function getOrderById(id: string): Promise<Order | null> {
  if (isDummyFirebase) {
    const found = DEFAULT_ORDERS.find(o => o.id === id);
    if (found) return found;

    const isVodafone = id.includes('vodafone_cash');
    return {
      id: id,
      customerName: 'محمد أحمد (عميل تجريبي)',
      phone: '01012345678',
      address: 'شارع التسعين، التجمع الخامس',
      city: 'القاهرة',
      items: [
        { productId: 'prod1', name: 'Pure X Protein', price: 250, quantity: 1 }
      ],
      totalPrice: 250,
      paymentMethod: isVodafone ? 'vodafone_cash' : 'cod',
      vodafoneCashNumber: isVodafone ? '01098765432' : undefined,
      status: 'pending',
      paymentStatus: isVodafone ? 'pending_review' : undefined,
      paymentProofUrl: isVodafone ? '/images/no-image.png' : undefined,
      isReadByAdmin: false,
      createdAt: new Date()
    };
  }

  const docRef = doc(db, 'orders', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt
  } as Order;
}

// Update order status (strictly checks status movements if needed or simple update)
// Order Status state machine: pending -> confirmed -> shipped -> delivered, and cancelled
const VALID_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export async function updateOrderStatus(id: string, newStatus: Order['status']) {
  if (isDummyFirebase) {
    console.log(`Mock Mode: Updated order status of #${id} to ${newStatus}`);
    return;
  }

  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error('حالة طلب غير صالحة.');
  }

  const orderRef = doc(db, 'orders', id);

  if (newStatus === 'cancelled') {
    const restoredItems: { name: string; quantity: number }[] = [];
    const failedItems: { name: string }[] = [];
    
    await runTransaction(db, async (transaction) => {
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) throw new Error('الأوردر غير موجود.');

      const orderData = orderSnap.data() as Order;

      // Prevent double restoration
      if (orderData.stockRestored) {
        transaction.update(orderRef, { status: newStatus });
        return;
      }

      // 1. Gather all items to restore (accounting for bundles)
      const itemsToRestore: { productId: string; name: string; quantity: number }[] = [];
      for (const item of orderData.items) {
        if (item.isBundle && item.bundleItems && item.bundleItems.length > 0) {
          for (const bItem of item.bundleItems) {
            itemsToRestore.push({
              productId: bItem.productId,
              name: `${bItem.name} (من باقة: ${item.name})`,
              quantity: bItem.quantity * item.quantity
            });
          }
        } else {
          itemsToRestore.push({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity
          });
        }
      }

      // Group by productId to prevent duplicate reads/writes
      const restoreMap = new Map<string, { name: string; quantity: number }>();
      for (const it of itemsToRestore) {
        const existing = restoreMap.get(it.productId);
        if (existing) {
          existing.quantity += it.quantity;
        } else {
          restoreMap.set(it.productId, { name: it.name, quantity: it.quantity });
        }
      }

      const stockUpdates: { productRef: any; newStock: number; newSalesCount: number }[] = [];
      for (const [prodId, req] of restoreMap.entries()) {
        const productRef = doc(db, 'products', prodId);
        const productSnap = await transaction.get(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data() as Product;
          stockUpdates.push({
            productRef,
            newStock: productData.stock + req.quantity,
            newSalesCount: Math.max(0, (productData.salesCount || 0) - req.quantity)
          });
          restoredItems.push({ name: req.name, quantity: req.quantity });
        } else {
          failedItems.push({ name: req.name });
        }
      }

      // 2. Apply updates
      for (const update of stockUpdates) {
        transaction.update(update.productRef, {
          stock: update.newStock,
          salesCount: update.newSalesCount
        });
      }

      // 3. Mark order as cancelled and stockRestored
      transaction.update(orderRef, {
        status: newStatus,
        stockRestored: true
      });
    });

    // Log the restoration activity outside the transaction
    for (const item of restoredItems) {
      await logAdminActivity(`تم إرجاع ${item.quantity} قطعة من [${item.name}] بسبب إلغاء الطلب #${id}`, id);
    }
    for (const item of failedItems) {
      await logAdminActivity(`تعذر استرجاع المخزون لمنتج محذوف: [${item.name}] من الأوردر #${id}`, id);
    }
    invalidateCache('product');
  } else {
    const updatePayload: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'delivered') {
      updatePayload.deliveredAt = serverTimestamp();
    }
    await updateDoc(orderRef, updatePayload);
  }

  await logAdminActivity(`changed order status to ${newStatus}`, id);
}

// Mark order as read by admin
export async function markOrderAsRead(id: string) {
  if (isDummyFirebase) {
    console.log(`Mock Mode: Marked order #${id} as read`);
    return;
  }

  const docRef = doc(db, 'orders', id);
  await updateDoc(docRef, { isReadByAdmin: true });
}

// Update order payment status (Vodafone Cash / InstaPay review) and optionally update order status
export async function updateOrderPaymentStatus(
  id: string, 
  paymentStatus: Order['paymentStatus'],
  orderStatus?: Order['status']
) {
  if (isDummyFirebase) {
    console.log(`Mock Mode: Updated order payment status of #${id} to ${paymentStatus}`);
    const ord = DEFAULT_ORDERS.find(o => o.id === id);
    if (ord) {
      ord.paymentStatus = paymentStatus;
      if (orderStatus) {
        ord.status = orderStatus;
      }
    }
    return;
  }
  const docRef = doc(db, 'orders', id);
  const updatePayload: Record<string, any> = { paymentStatus };
  if (orderStatus) {
    updatePayload.status = orderStatus;
    if (orderStatus === 'delivered') {
      updatePayload.deliveredAt = serverTimestamp();
    }
  }
  await updateDoc(docRef, updatePayload);
  await logAdminActivity(
    orderStatus
      ? `changed order payment status to ${paymentStatus} and order status to ${orderStatus}`
      : `changed order payment status to ${paymentStatus}`,
    id
  );
}

// Delete an order
export async function deleteOrder(id: string) {
  if (isDummyFirebase) {
    console.log(`Mock Mode: Deleted order #${id}`);
    return;
  }

  const docRef = doc(db, 'orders', id);
  await deleteDoc(docRef);
  await logAdminActivity('deleted order', id);
}
