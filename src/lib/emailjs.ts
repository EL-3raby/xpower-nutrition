import emailjs from '@emailjs/browser';
import { Order } from './types';
import { getSiteUrl } from './utils/seo';

export async function sendNewOrderEmail(order: Order) {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '';
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '';
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '';
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@xpower.com';
  const siteUrl = getSiteUrl();

  if (!serviceId || !templateId || !publicKey) {
    console.warn('EmailJS variables are not fully configured in environment. Skipping email notification.');
    return;
  }

  const itemsSummary = order.items
    .map((item) => {
      const flavorText = item.flavor ? ` - نكهة: ${item.flavor}` : '';
      return `${item.name}${flavorText} (عدد: ${item.quantity}) - بسعر ${item.price} EGP`;
    })
    .join('\n');

  const adminOrderLink = `${siteUrl}/admin/orders/detail?id=${order.id || 'N/A'}`;

  const isVodafone = order.paymentMethod === 'vodafone_cash';
  const isInstapay = order.paymentMethod === 'instapay';
  const isCodDeposit = order.paymentMethod === 'cod' && (order.depositAmount ?? 0) > 0;

  const paymentMethodLabel = isVodafone
    ? 'فودافون كاش (دفع كامل مسبقاً)'
    : isInstapay
    ? 'انستاباي — InstaPay (دفع كامل مسبقاً)'
    : isCodDeposit
    ? `دفع عند الاستلام (مع ديبوزيت شحن ${order.depositAmount} EGP مسدد عبر ${order.depositPaymentMethod === 'instapay' ? 'انستاباي' : 'فودافون كاش'}، والمتبقي كاش للمندوب: ${order.totalPrice - (order.depositAmount || 0)} EGP)`
    : 'الدفع كاش عند الاستلام (COD)';

  const senderInfo = isVodafone
    ? (order.vodafoneCashNumber || 'N/A')
    : isInstapay
    ? (order.instapayHandle || 'N/A')
    : isCodDeposit
    ? (order.depositSenderInfo || 'N/A')
    : 'N/A';

  const templateParams = {
    to_email: adminEmail,
    order_id: order.id || 'N/A',
    customer_name: order.customerName,
    customer_phone: order.phone,
    customer_address: `${order.address}, ${order.city}`,
    payment_method: paymentMethodLabel,
    wallet_number: senderInfo,
    items_summary: itemsSummary,
    total_price: `${order.totalPrice} EGP`,
    admin_order_link: adminOrderLink,
  };

  try {
    const result = await emailjs.send(serviceId, templateId, templateParams, publicKey);
    console.log('EmailJS notification dispatched successfully:', result.text);
    return result;
  } catch (error) {
    console.warn('EmailJS notification could not be sent (please verify your EmailJS credentials):', error);
  }
}
