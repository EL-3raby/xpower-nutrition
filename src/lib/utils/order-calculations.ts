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
  'رقم الأوردر',
  'تاريخ الطلب',
  'اسم العميل',
  'رقم الموبايل',
  'المحافظة',
  'العنوان بالتفصيل',
  'بيان الأصناف والكميات',
  'طريقة السداد',
  'حالة الأوردر',
  'قيمة البضاعة (ج.م)',
  'الخصم المطبق (ج.م)',
  'صافي المنتجات (ج.م)',
  'تكلفة الشحن (ج.م)',
  'إجمالي الفاتورة (ج.م)',
  'العربون المسدد (ج.م)',
  'المتبقي كاش للمندوب (ج.م)',
] as const;

export function formatOrderPaymentMethod(o: Order): string {
  if (o.paymentMethod === 'vodafone_cash') return 'فودافون كاش (كامل)';
  if (o.paymentMethod === 'instapay') return 'انستاباي (كامل)';
  if (o.depositAmount && o.depositAmount > 0) return 'دفع عند الاستلام + عربون';
  return 'دفع عند الاستلام (كاش)';
}

export function formatOrderStatus(status: Order['status']): string {
  switch (status) {
    case 'pending': return 'قيد المراجعة والتأكيد';
    case 'confirmed': return 'تم التأكيد وجاري التجهيز';
    case 'shipped': return 'تم التسليم للشحن (في الطريق)';
    case 'delivered': return 'تم التوصيل والتحصيل بنجاح';
    case 'cancelled': return 'طلب ملغي';
    default: return status;
  }
}

export function formatOrderItemsSummary(items: Order['items']): string {
  if (!items || items.length === 0) return '';
  return items.map(it => {
    const flavorStr = it.flavor ? ` (${it.flavor})` : '';
    return `${it.quantity}x ${it.name}${flavorStr}`;
  }).join(' ، ');
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
 * Generates a modern native .xlsx Excel workbook with:
 * - Professional spacious Arabic labels
 * - Custom wide column widths (no clipped or squished text)
 * - Row height breathing room
 * - Right-to-Left (RTL) worksheet view for Excel
 * - Formatted text cells for phone numbers (preserves leading zero 01...)
 * - Formatted item summary strings
 * - Branded title header block
 * - Comprehensive summary totals row at the bottom
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

    dataRows.push([
      String(o.id || ''),
      formatOrderDate(o.createdAt),
      o.customerName || '',
      String(o.phone || '').trim(), // Protected as text to preserve leading zero
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

  // Header Title Information Banner
  const titleRow = ['متجر X-Power Nutrition - كشف تسوية ومتابعة الشحن والمبيعات'];
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

  // Generous column widths (character count) ensuring no text or numbers are clipped
  ws['!cols'] = [
    { wch: 18 }, // رقم الأوردر
    { wch: 16 }, // تاريخ الطلب
    { wch: 26 }, // اسم العميل
    { wch: 18 }, // رقم الموبايل
    { wch: 16 }, // المحافظة
    { wch: 44 }, // العنوان بالتفصيل
    { wch: 40 }, // بيان الأصناف والكميات
    { wch: 26 }, // طريقة السداد
    { wch: 28 }, // حالة الأوردر
    { wch: 20 }, // قيمة البضاعة
    { wch: 18 }, // الخصم المطبق
    { wch: 24 }, // صافي المنتجات
    { wch: 18 }, // تكلفة الشحن
    { wch: 24 }, // إجمالي الفاتورة
    { wch: 20 }, // العربون المسدد
    { wch: 26 }, // المتبقي كاش للمندوب
  ];

  // Generous row heights
  ws['!rows'] = [
    { hpt: 30 }, // Title row
    { hpt: 22 }, // Meta row
    { hpt: 12 }, // Blank
    { hpt: 28 }, // Header labels row (comfortable padding)
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
