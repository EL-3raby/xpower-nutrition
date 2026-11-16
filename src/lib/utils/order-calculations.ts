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

// ── Shared Label Formatters for Excel & CSV ──────────────────────────────
export const EXCEL_ORDER_HEADERS = [
  'كود الطلب',
  'التاريخ',
  'العميل',
  'الموبايل',
  'المحافظة',
  'العنوان',
  'المنتجات',
  'الدفع',
  'الحالة',
  'البضاعة',
  'الخصم',
  'الصافي',
  'الشحن',
  'الإجمالي',
  'العربون',
  'المتبقي',
] as const;

export function formatOrderPaymentMethod(o: Order): string {
  if (o.paymentMethod === 'vodafone_cash') return 'فودافون كاش';
  if (o.paymentMethod === 'instapay') return 'انستاباي';
  if (o.depositAmount && o.depositAmount > 0) return 'كاش + عربون';
  return 'عند الاستلام (كاش)';
}

export function formatOrderStatus(status: Order['status']): string {
  switch (status) {
    case 'pending': return 'قيد المراجعة';
    case 'confirmed': return 'تم التأكيد';
    case 'shipped': return 'في الطريق';
    case 'delivered': return 'تم التوصيل';
    case 'cancelled': return 'ملغي';
    default: return status || '';
  }
}

export function formatOrderItemsSummary(items: Order['items']): string {
  if (!items || items.length === 0) return '';
  return items.map(it => {
    const qty = it.quantity || 1;
    let name = (it.name || '').trim();
    let flavor = (it.flavor || '').trim();

    const isBundle = name.toLowerCase().includes('bundle') || name.includes('باقة');

    // If it's a bundle or has long parenthetical description, extract clean short title
    if (name.includes('(') && (isBundle || name.length > 30)) {
      const short = name.split('(')[0].trim();
      if (short.length >= 3) {
        name = short;
      }
    }

    // For bundles, skip giant raw bundle configuration recipes in flavor
    if (isBundle && flavor.length > 25) {
      flavor = '';
    }

    // If flavor is already in name or redundant, skip it
    if (flavor && name.toLowerCase().includes(flavor.toLowerCase())) {
      flavor = '';
    }

    const flavorStr = flavor ? ` (${flavor})` : '';
    return `${qty}x ${name}${flavorStr}`;
  }).join(' + ');
}

export function formatOrderDate(dateVal: Date | Timestamp | { toDate?: () => Date; seconds?: number } | null | undefined): string {
  if (!dateVal) return '';
  if (dateVal instanceof Date) return dateVal.toLocaleDateString('ar-EG');
  if (dateVal instanceof Timestamp) return dateVal.toDate().toLocaleDateString('ar-EG');
  if (typeof dateVal?.toDate === 'function') return dateVal.toDate().toLocaleDateString('ar-EG');
  if (typeof dateVal?.seconds === 'number') return new Date(dateVal.seconds * 1000).toLocaleDateString('ar-EG');
  return '';
}

/**
 * Generates a modern, compact, native .xlsx Excel workbook:
 * - 100% native OpenXML format: Arabic letters connect naturally (no detached glyphs)
 * - Compact, concise column widths fitting standard screens without endless scrolling
 * - Concise, punchy headers and status labels
 * - Right-to-Left (RTL) worksheet view for Excel
 * - Text cells for phone numbers (preserves leading zero 01...)
 * - Direct summary totals row for immediate accounting verification
 */
export async function generateOrdersSettlementExcel(orders: Order[]): Promise<Blob> {
  const XLSX = await import('xlsx');

  const dataRows: (string | number)[][] = [];

  let sumSubtotal = 0;
  let sumDiscount = 0;
  let sumNet = 0;
  let sumShipping = 0;
  let sumTotal = 0;
  let sumDeposit = 0;
  let sumRemaining = 0;

  for (const o of orders) {
    const fin = getOrderFinancials(o);

    // Accumulate sums for active non-cancelled orders
    if (o.status !== 'cancelled' && o.paymentStatus !== 'rejected') {
      sumSubtotal += fin.subtotal;
      sumDiscount += fin.discountAmount;
      sumNet += fin.netProducts;
      sumShipping += fin.shippingCost;
      sumTotal += fin.totalPrice;
      sumDeposit += fin.depositAmount;
      sumRemaining += fin.remainingCash;
    }

    const shortId = o.id ? (o.id.startsWith('#') ? o.id : `#${o.id}`) : '';

    dataRows.push([
      shortId,
      formatOrderDate(o.createdAt),
      o.customerName || '',
      String(o.phone || '').trim(),
      o.city || '',
      o.address || '',
      formatOrderItemsSummary(o.items),
      formatOrderPaymentMethod(o),
      formatOrderStatus(o.status),
      fin.subtotal,
      fin.discountAmount,
      fin.netProducts,
      fin.shippingCost,
      fin.totalPrice,
      fin.depositAmount,
      fin.remainingCash,
    ]);
  }

  // Header Title Information Banner (Clean, no HTML black boxes)
  const titleRow = ['X-POWER NUTRITION • كشف تسوية الأوردرات والشحن'];
  const todayStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  const metaRow = [
    `تاريخ التصدير: ${todayStr}`,
    '',
    `عدد الطلبات: ${orders.length} طلب`,
    '',
    `صافي البضاعة: ${Math.round(sumNet).toLocaleString()} ج.م`,
    '',
    `إجمالي الشحن: ${Math.round(sumShipping).toLocaleString()} ج.م`,
    '',
    `إجمالي التحصيل: ${Math.round(sumTotal).toLocaleString()} ج.م`,
  ];
  const blankRow: string[] = [];

  // Summary totals row at the bottom
  const summaryRow = [
    `الإجمالي العام (${orders.length} طلب)`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    Math.round(sumSubtotal * 100) / 100,
    Math.round(sumDiscount * 100) / 100,
    Math.round(sumNet * 100) / 100,
    Math.round(sumShipping * 100) / 100,
    Math.round(sumTotal * 100) / 100,
    Math.round(sumDeposit * 100) / 100,
    Math.round(sumRemaining * 100) / 100,
  ];

  // Assemble all rows
  const allSheetRows = [
    titleRow,
    metaRow,
    blankRow,
    [...EXCEL_ORDER_HEADERS],
    ...dataRows,
    blankRow,
    summaryRow,
  ];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(allSheetRows);

  // Set Right-To-Left (RTL) mode for Excel
  ws['!views'] = [{ RTL: true }];

  // Compact, tailored column widths fitting smoothly on screen
  ws['!cols'] = [
    { wch: 13 }, // كود الطلب
    { wch: 11 }, // التاريخ
    { wch: 17 }, // العميل
    { wch: 13 }, // الموبايل
    { wch: 12 }, // المحافظة
    { wch: 24 }, // العنوان
    { wch: 26 }, // المنتجات
    { wch: 14 }, // الدفع
    { wch: 12 }, // الحالة
    { wch: 10 }, // البضاعة
    { wch: 9 },  // الخصم
    { wch: 10 }, // الصافي
    { wch: 9 },  // الشحن
    { wch: 11 }, // الإجمالي
    { wch: 9 },  // العربون
    { wch: 11 }, // المتبقي
  ];

  // Row heights
  ws['!rows'] = [
    { hpt: 24 }, // Title row
    { hpt: 18 }, // Meta row
    { hpt: 10 }, // Blank
    { hpt: 22 }, // Header labels row
  ];

  // Protect Phone numbers and Order IDs as explicit Text cells (type 's') to avoid numeric truncation
  const dataStartRowIndex = 4; // index 4 is first order row
  for (let r = 0; r < dataRows.length; r++) {
    const rowIdx = dataStartRowIndex + r;
    // Col 0: ID
    const idCellRef = XLSX.utils.encode_cell({ r: rowIdx, c: 0 });
    if (ws[idCellRef]) ws[idCellRef].t = 's';

    // Col 3: Phone
    const phoneCellRef = XLSX.utils.encode_cell({ r: rowIdx, c: 3 });
    if (ws[phoneCellRef]) {
      ws[phoneCellRef].t = 's';
      ws[phoneCellRef].z = '@';
    }
  }

  // Create workbook and append worksheet
  const wb = XLSX.utils.book_new();
  if (!wb.Workbook) wb.Workbook = {};
  if (!wb.Workbook.Views) wb.Workbook.Views = [];
  wb.Workbook.Views[0] = Object.assign(wb.Workbook.Views[0] || {}, { RTL: true });
  XLSX.utils.book_append_sheet(wb, ws, 'كشف تسوية الأوردرات');

  // Generate binary XLSX buffer
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Generates an Excel-ready CSV string for shipping settlements and financial accounting.
 * Includes UTF-8 Byte Order Mark (BOM) so Arabic renders cleanly in Microsoft Excel.
 */
export function generateOrdersSettlementCSV(orders: Order[]): string {
  const escapeCell = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  let sumSubtotal = 0;
  let sumDiscount = 0;
  let sumNet = 0;
  let sumShipping = 0;
  let sumTotal = 0;
  let sumDeposit = 0;
  let sumRemaining = 0;

  const rows = orders.map((o) => {
    const fin = getOrderFinancials(o);

    if (o.status !== 'cancelled' && o.paymentStatus !== 'rejected') {
      sumSubtotal += fin.subtotal;
      sumDiscount += fin.discountAmount;
      sumNet += fin.netProducts;
      sumShipping += fin.shippingCost;
      sumTotal += fin.totalPrice;
      sumDeposit += fin.depositAmount;
      sumRemaining += fin.remainingCash;
    }

    return [
      escapeCell(o.id || ''),
      escapeCell(formatOrderDate(o.createdAt)),
      escapeCell(o.customerName || ''),
      escapeCell(`=""${String(o.phone || '').trim()}""`), // Preserves leading zero in Excel CSV
      escapeCell(o.city || ''),
      escapeCell(o.address || ''),
      escapeCell(formatOrderItemsSummary(o.items)),
      escapeCell(formatOrderPaymentMethod(o)),
      escapeCell(formatOrderStatus(o.status)),
      escapeCell(fin.subtotal),
      escapeCell(fin.discountAmount),
      escapeCell(fin.netProducts),
      escapeCell(fin.shippingCost),
      escapeCell(fin.totalPrice),
      escapeCell(fin.depositAmount),
      escapeCell(fin.remainingCash),
    ].join(',');
  });

  // Summary row
  const summaryRow = [
    escapeCell(`الإجمالي العام (${orders.length} طلب)`),
    '""',
    '""',
    '""',
    '""',
    '""',
    '""',
    '""',
    '""',
    escapeCell(Math.round(sumSubtotal * 100) / 100),
    escapeCell(Math.round(sumDiscount * 100) / 100),
    escapeCell(Math.round(sumNet * 100) / 100),
    escapeCell(Math.round(sumShipping * 100) / 100),
    escapeCell(Math.round(sumTotal * 100) / 100),
    escapeCell(Math.round(sumDeposit * 100) / 100),
    escapeCell(Math.round(sumRemaining * 100) / 100),
  ].join(',');

  // UTF-8 BOM (\uFEFF) ensures Excel opens Arabic correctly
  return '\uFEFF' + [
    EXCEL_ORDER_HEADERS.map(escapeCell).join(','),
    ...rows,
    summaryRow
  ].join('\r\n');
}
