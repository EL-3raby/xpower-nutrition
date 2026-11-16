import { Order } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

export interface OrderFinancials {
  subtotal: number;       // إجمالي سعر المنتجات قبل الخصم
  discountAmount: number; // قيمة الخصم المطبق (كوبون)
  netProducts: number;    // صافي سعر المنتجات بعد الخصم (subtotal - discountAmount)
  shippingCost: number;   // مصاريف الشحن المحسوبة (0 إذا كان مجاني)
  totalPrice: number;     // الإجمالي الكلي للطلب المطلوب تحصيله
  depositAmount: number;  // العربون / الديبوزيت المدفوع مقدماً
  remainingCash: number;  // المبلغ المتبقي للتحصيل كاش من العميل
}

/**
 * Calculates complete financial breakdown for an individual order.
 * Works seamlessly for new orders (with explicit subtotal/shippingCost)
 * and legacy orders (deriving shippingCost and subtotal retroactively).
 */
export function getOrderFinancials(order: Partial<Order>): OrderFinancials {
  const discountAmount = Math.max(0, order.discountAmount || 0);

  // 1. Subtotal: use explicit field or sum item prices
  const subtotal = typeof order.subtotal === 'number' && !isNaN(order.subtotal) && order.subtotal >= 0
    ? order.subtotal
    : (order.items || []).reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);

  // 2. Net products value after discount
  const netProducts = Math.max(0, subtotal - discountAmount);

  // 3. Shipping cost: use explicit field or derive from (totalPrice - netProducts)
  let shippingCost = 0;
  if (typeof order.shippingCost === 'number' && !isNaN(order.shippingCost) && order.shippingCost >= 0) {
    shippingCost = order.shippingCost;
  } else if (typeof order.totalPrice === 'number' && !isNaN(order.totalPrice)) {
    shippingCost = Math.max(0, Math.round((order.totalPrice - netProducts) * 100) / 100);
  }

  // 4. Total Price: use explicit totalPrice or sum of netProducts + shippingCost
  const totalPrice = typeof order.totalPrice === 'number' && !isNaN(order.totalPrice)
    ? order.totalPrice
    : (netProducts + shippingCost);

  // 5. Deposit and remaining cash
  const depositAmount = Math.max(0, order.depositAmount || 0);
  const remainingCash = Math.max(0, totalPrice - depositAmount);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    netProducts: Math.round(netProducts * 100) / 100,
    shippingCost: Math.round(shippingCost * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    depositAmount: Math.round(depositAmount * 100) / 100,
    remainingCash: Math.round(remainingCash * 100) / 100,
  };
}

export interface AggregatedOrderFinancials {
  totalGrossRevenue: number;   // إجمالي الفواتير شاملة الشحن
  totalNetProducts: number;    // صافي مبيعات البضاعة (المنتجات بعد الخصم)
  totalShippingFees: number;   // إجمالي مصاريف الشحن المحصلة
  totalDiscounts: number;      // إجمالي الخصومات الممنوحة
  totalDeposits: number;       // إجمالي مبالغ العربون المحولة مسبقاً
  totalRemainingCash: number;  // إجمالي المتبقي كاش مع المناديب
  activeOrdersCount: number;   // عدد الأوردرات السارية
}

/**
 * Aggregates financial totals for a list of orders (skipping cancelled/rejected orders).
 */
export function aggregateOrdersFinancials(orders: Order[]): AggregatedOrderFinancials {
  let totalGrossRevenue = 0;
  let totalNetProducts = 0;
  let totalShippingFees = 0;
  let totalDiscounts = 0;
  let totalDeposits = 0;
  let totalRemainingCash = 0;
  let activeOrdersCount = 0;

  for (const o of orders) {
    if (o.status === 'cancelled' || o.paymentStatus === 'rejected') continue;

    activeOrdersCount++;
    const fin = getOrderFinancials(o);

    totalGrossRevenue += fin.totalPrice;
    totalNetProducts += fin.netProducts;
    totalShippingFees += fin.shippingCost;
    totalDiscounts += fin.discountAmount;
    totalDeposits += fin.depositAmount;
    totalRemainingCash += fin.remainingCash;
  }

  return {
    totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
    totalNetProducts: Math.round(totalNetProducts * 100) / 100,
    totalShippingFees: Math.round(totalShippingFees * 100) / 100,
    totalDiscounts: Math.round(totalDiscounts * 100) / 100,
    totalDeposits: Math.round(totalDeposits * 100) / 100,
    totalRemainingCash: Math.round(totalRemainingCash * 100) / 100,
    activeOrdersCount,
  };
}

/**
 * Generates an Excel-ready CSV string for shipping settlements and financial accounting.
 * Includes UTF-8 Byte Order Mark (BOM) so Arabic renders cleanly in Microsoft Excel.
 */
export function generateOrdersSettlementCSV(orders: Order[]): string {
  const headers = [
    'رقم الطلب',
    'تاريخ الطلب',
    'اسم العميل',
    'رقم الهاتف',
    'المحافظة',
    'العنوان',
    'طريقة الدفع',
    'حالة الطلب',
    'إجمالي المنتجات (ج.م)',
    'الخصم (ج.م)',
    'صافي المنتجات (ج.م)',
    'مصاريف الشحن (ج.م)',
    'إجمالي الفاتورة (ج.م)',
    'العربون المسدد (ج.م)',
    'المتبقي كاش للمندوب (ج.م)',
  ];

  const escapeCell = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const getPaymentMethodLabel = (o: Order) => {
    if (o.paymentMethod === 'vodafone_cash') return 'فودافون كاش';
    if (o.paymentMethod === 'instapay') return 'انستاباي';
    if (o.depositAmount && o.depositAmount > 0) return 'دفع عند الاستلام + عربون';
    return 'دفع عند الاستلام (كاش)';
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'confirmed': return 'مؤكد';
      case 'shipped': return 'تم الشحن (مع المندوب)';
      case 'delivered': return 'تم التوصيل';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const rows = orders.map((o) => {
    const fin = getOrderFinancials(o);
    let dateStr = '';
    if (o.createdAt instanceof Date) {
      dateStr = o.createdAt.toLocaleDateString('ar-EG');
    } else if (o.createdAt instanceof Timestamp) {
      dateStr = o.createdAt.toDate().toLocaleDateString('ar-EG');
    } else if (o.createdAt && typeof (o.createdAt as { toDate?: () => Date }).toDate === 'function') {
      dateStr = (o.createdAt as { toDate: () => Date }).toDate().toLocaleDateString('ar-EG');
    } else if (o.createdAt && typeof (o.createdAt as { seconds?: number }).seconds === 'number') {
      dateStr = new Date((o.createdAt as { seconds: number }).seconds * 1000).toLocaleDateString('ar-EG');
    }

    return [
      escapeCell(o.id || ''),
      escapeCell(dateStr),
      escapeCell(o.customerName),
      escapeCell(o.phone),
      escapeCell(o.city),
      escapeCell(o.address),
      escapeCell(getPaymentMethodLabel(o)),
      escapeCell(getStatusLabel(o.status)),
      escapeCell(fin.subtotal),
      escapeCell(fin.discountAmount),
      escapeCell(fin.netProducts),
      escapeCell(fin.shippingCost),
      escapeCell(fin.totalPrice),
      escapeCell(fin.depositAmount),
      escapeCell(fin.remainingCash),
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF) ensures Excel opens Arabic correctly
  return '\uFEFF' + [headers.map(escapeCell).join(','), ...rows].join('\r\n');
}
