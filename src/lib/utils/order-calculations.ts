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
 * Generates a fully designed, color-coded, branded HTML Excel spreadsheet (.xls)
 * featuring:
 * - High-contrast obsidian dark athletic header with fiery brand red accent
 * - Beautiful color-coded status badges (delivered, confirmed, shipped, pending, cancelled)
 * - Soft pastel color-highlighted financial columns (net products, shipping, total, remaining cash)
 * - Explicit mso-number-format preserving leading zero on phone numbers (01...)
 * - Zebra row striping for comfortable reading
 * - Right-to-Left (RTL) Arabic layout
 * - High-impact summary cards in the title banner
 * - Dark high-contrast summary totals row at the bottom with double-accounting underline
 */
export function generateOrdersSettlementStyledExcel(orders: Order[]): Blob {
  const finTotal = aggregateOrdersFinancials(orders);
  const todayStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'delivered':
        return `<span style="background-color:#DCFCE7;color:#15803D;font-weight:bold;padding:5px 10px;border-radius:6px;display:inline-block;white-space:nowrap;border:1px solid #BBF7D0;">تم التوصيل والتحصيل ✓</span>`;
      case 'confirmed':
        return `<span style="background-color:#DBEAFE;color:#1E40AF;font-weight:bold;padding:5px 10px;border-radius:6px;display:inline-block;white-space:nowrap;border:1px solid #BFDBFE;">تم التأكيد والتجهيز</span>`;
      case 'shipped':
        return `<span style="background-color:#EDE9FE;color:#6D28D9;font-weight:bold;padding:5px 10px;border-radius:6px;display:inline-block;white-space:nowrap;border:1px solid #DDD6FE;">مع المندوب (في الطريق)</span>`;
      case 'pending':
        return `<span style="background-color:#FEF3C7;color:#B45309;font-weight:bold;padding:5px 10px;border-radius:6px;display:inline-block;white-space:nowrap;border:1px solid #FDE68A;">قيد الانتظار والمراجعة</span>`;
      case 'cancelled':
        return `<span style="background-color:#FEE2E2;color:#B91C1C;font-weight:bold;padding:5px 10px;border-radius:6px;display:inline-block;white-space:nowrap;border:1px solid #FECACA;">طلب ملغي ✗</span>`;
      default:
        return `<span style="font-weight:bold;">${status}</span>`;
    }
  };

  const getPaymentBadge = (o: Order) => {
    if (o.paymentMethod === 'vodafone_cash') {
      return `<strong style="color:#DC2626;background-color:#FEF2F2;padding:4px 8px;border-radius:4px;border:1px solid #FECACA;white-space:nowrap;">فودافون كاش (كامل)</strong>`;
    }
    if (o.paymentMethod === 'instapay') {
      return `<strong style="color:#4F46E5;background-color:#EEF2FF;padding:4px 8px;border-radius:4px;border:1px solid #E0E7FF;white-space:nowrap;">انستاباي (كامل)</strong>`;
    }
    if (o.depositAmount && o.depositAmount > 0) {
      return `<span style="white-space:nowrap;">دفع عند الاستلام + <strong style="color:#D97706;">عربون</strong></span>`;
    }
    return `<span style="color:#374151;white-space:nowrap;">دفع عند الاستلام (كاش)</span>`;
  };

  let sumSubtotal = 0;
  let sumDiscount = 0;
  let sumNet = 0;
  let sumShipping = 0;
  let sumTotal = 0;
  let sumDeposit = 0;
  let sumRemaining = 0;

  const dataRowsHtml = orders.map((o, idx) => {
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

    const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';

    return `
      <tr style="background-color:${rowBg};">
        <td style="text-align:center;font-family:Consolas,monospace;font-weight:bold;color:#18181B;mso-number-format:'\\@';">#${o.id || ''}</td>
        <td style="text-align:center;mso-number-format:'\\@';color:#4B5563;white-space:nowrap;">${formatOrderDate(o.createdAt)}</td>
        <td style="font-weight:bold;color:#111827;white-space:nowrap;">${o.customerName || ''}</td>
        <td style="text-align:center;font-family:Consolas,monospace;font-weight:bold;color:#0284C7;mso-number-format:'\\@';white-space:nowrap;">${String(o.phone || '').trim()}</td>
        <td style="text-align:center;font-weight:bold;color:#374151;white-space:nowrap;">${o.city || ''}</td>
        <td style="color:#4B5563;font-size:9.5pt;max-width:280px;">${o.address || ''}</td>
        <td style="color:#1F2937;font-size:9.5pt;max-width:320px;">${formatOrderItemsSummary(o.items)}</td>
        <td style="text-align:center;">${getPaymentBadge(o)}</td>
        <td style="text-align:center;">${getStatusBadge(o.status)}</td>
        <td style="text-align:center;mso-number-format:'#,##0';color:#64748B;">${fin.subtotal.toLocaleString()}</td>
        <td style="text-align:center;mso-number-format:'#,##0';color:#DC2626;">${fin.discountAmount > 0 ? `-${fin.discountAmount.toLocaleString()}` : '-'}</td>
        <td style="text-align:center;mso-number-format:'#,##0';color:#15803D;font-weight:bold;background-color:#F0FDF4;">${fin.netProducts.toLocaleString()}</td>
        <td style="text-align:center;mso-number-format:'#,##0';color:#B45309;font-weight:bold;background-color:#FFFBEB;">${fin.shippingCost > 0 ? fin.shippingCost.toLocaleString() : 'مجاني'}</td>
        <td style="text-align:center;mso-number-format:'#,##0';color:#991B1B;font-weight:bold;font-size:11pt;background-color:#FEF2F2;">${fin.totalPrice.toLocaleString()}</td>
        <td style="text-align:center;mso-number-format:'#,##0';color:#6D28D9;background-color:#F5F3FF;">${fin.depositAmount > 0 ? fin.depositAmount.toLocaleString() : '-'}</td>
        <td style="text-align:center;mso-number-format:'#,##0';color:#047857;font-weight:bold;font-size:11pt;background-color:#ECFDF5;">${fin.remainingCash.toLocaleString()}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40"
          dir="rtl" lang="ar">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>كشف تسوية الأوردرات</x:Name>
              <x:WorksheetOptions>
                <x:DisplayRightToLeft/>
                <x:DoNotDisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body, table, td, th {
          font-family: 'Segoe UI', Tahoma, Cairo, Arial, sans-serif;
          font-size: 10.5pt;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          direction: rtl;
        }
        th {
          background-color: #0F0F11;
          color: #FFFFFF;
          font-weight: bold;
          text-align: center;
          padding: 14px 10px;
          border: 1px solid #27272A;
          border-bottom: 3px solid #E31E24;
          font-size: 10.5pt;
          white-space: nowrap;
        }
        td {
          padding: 10px 10px;
          border: 1px solid #E2E8F0;
          vertical-align: middle;
        }
      </style>
    </head>
    <body style="margin:0;padding:20px;background-color:#FFFFFF;">
      <table cellpadding="0" cellspacing="0">
        <!-- Title Banner -->
        <tr>
          <td colspan="16" style="background-color:#09090B;color:#FFFFFF;padding:20px 24px;border-bottom:4px solid #E31E24;">
            <div style="font-size:18pt;font-weight:900;color:#FFFFFF;margin-bottom:8px;letter-spacing:-0.5px;">
              X-POWER NUTRITION <span style="font-size:12pt;font-weight:normal;color:#A1A1AA;">&bull; كشف تسوية ومتابعة الشحن والمبيعات</span>
            </div>
            <div style="font-size:10pt;color:#D4D4D8;line-height:1.6;">
              تاريخ التصدير: <strong style="color:#FFFFFF;">${todayStr}</strong> &nbsp;|&nbsp; 
              عدد الطلبات: <strong style="color:#FFFFFF;">${orders.length} طلب</strong> &nbsp;|&nbsp; 
              صافي قيمة البضاعة: <strong style="color:#4ADE80;font-size:11pt;">${Math.round(finTotal.totalNetProducts).toLocaleString()} ج.م</strong> &nbsp;|&nbsp; 
              إجمالي مصاريف الشحن: <strong style="color:#FBBF24;font-size:11pt;">${Math.round(finTotal.totalShippingFees).toLocaleString()} ج.م</strong> &nbsp;|&nbsp; 
              إجمالي التحصيل الكلي: <strong style="color:#F87171;font-size:12pt;">${Math.round(finTotal.totalGrossRevenue).toLocaleString()} ج.م</strong>
            </div>
          </td>
        </tr>
        
        <!-- Spacing row -->
        <tr style="height:14px;"><td colspan="16" style="border:none;background-color:#FFFFFF;"></td></tr>

        <!-- Table Column Headers -->
        <tr>
          ${EXCEL_ORDER_HEADERS.map(h => `<th>${h}</th>`).join('')}
        </tr>

        <!-- Data Rows -->
        ${dataRowsHtml}

        <!-- Spacing row -->
        <tr style="height:10px;"><td colspan="16" style="border:none;background-color:#FFFFFF;"></td></tr>

        <!-- Summary Totals Row -->
        <tr style="background-color:#09090B;color:#FFFFFF;font-weight:bold;font-size:11pt;">
          <td colspan="9" style="background-color:#09090B;color:#FFFFFF;padding:16px 14px;border-top:3px solid #E31E24;border-bottom:3px double #3F3F46;border-left:1px solid #27272A;border-right:1px solid #27272A;text-align:right;">
            الإجمالي العام (${orders.length} طلب مسجل)
          </td>
          <td style="background-color:#09090B;color:#94A3B8;padding:16px 10px;border-top:3px solid #E31E24;border-bottom:3px double #3F3F46;border-left:1px solid #27272A;border-right:1px solid #27272A;text-align:center;mso-number-format:'#,##0';">
            ${Math.round(sumSubtotal).toLocaleString()}
          </td>
          <td style="background-color:#09090B;color:#F87171;padding:16px 10px;border-top:3px solid #E31E24;border-bottom:3px double #3F3F46;border-left:1px solid #27272A;border-right:1px solid #27272A;text-align:center;mso-number-format:'#,##0';">
            ${sumDiscount > 0 ? `-${Math.round(sumDiscount).toLocaleString()}` : '-'}
          </td>
          <td style="background-color:#09090B;color:#4ADE80;font-size:12pt;padding:16px 10px;border-top:3px solid #E31E24;border-bottom:3px double #3F3F46;border-left:1px solid #27272A;border-right:1px solid #27272A;text-align:center;mso-number-format:'#,##0';">
            ${Math.round(sumNet).toLocaleString()}
          </td>
          <td style="background-color:#09090B;color:#FBBF24;font-size:11pt;padding:16px 10px;border-top:3px solid #E31E24;border-bottom:3px double #3F3F46;border-left:1px solid #27272A;border-right:1px solid #27272A;text-align:center;mso-number-format:'#,##0';">
            ${Math.round(sumShipping).toLocaleString()}
          </td>
          <td style="background-color:#09090B;color:#EF4444;font-size:12pt;padding:16px 10px;border-top:3px solid #E31E24;border-bottom:3px double #3F3F46;border-left:1px solid #27272A;border-right:1px solid #27272A;text-align:center;mso-number-format:'#,##0';">
            ${Math.round(sumTotal).toLocaleString()}
          </td>
          <td style="background-color:#09090B;color:#C084FC;padding:16px 10px;border-top:3px solid #E31E24;border-bottom:3px double #3F3F46;border-left:1px solid #27272A;border-right:1px solid #27272A;text-align:center;mso-number-format:'#,##0';">
            ${sumDeposit > 0 ? Math.round(sumDeposit).toLocaleString() : '-'}
          </td>
          <td style="background-color:#09090B;color:#34D399;font-size:12pt;padding:16px 10px;border-top:3px solid #E31E24;border-bottom:3px double #3F3F46;border-left:1px solid #27272A;border-right:1px solid #27272A;text-align:center;mso-number-format:'#,##0';">
            ${Math.round(sumRemaining).toLocaleString()}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
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
