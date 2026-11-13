/**
 * Security & Anti-Spam utilities for Xpower Nutrition
 */

/**
 * Strips HTML tags, script markers, and malicious control characters.
 * Ensures stored strings in Firestore, CSV exports, and emails are clean plain text.
 */
export function sanitizeText(input: string | undefined | null, maxLength = 500): string {
  if (!input || typeof input !== 'string') return '';
  
  // 1. Strip all HTML tags like <script>, <iframe>, <img>, etc.
  let cleaned = input.replace(/<[^>]*>?/gm, '');

  // 2. Remove null bytes and non-printable control characters
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 3. Trim whitespace
  cleaned = cleaned.trim();

  // 4. Enforce max length
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned;
}

/**
 * Detects whether user input contains suspicious injection patterns
 * (XSS, SQL injection, Command Injection, Prototype Pollution).
 */
export function detectMaliciousPayload(input: string | undefined | null): { isMalicious: boolean; pattern?: string } {
  if (!input || typeof input !== 'string') return { isMalicious: false };

  const attackPatterns: { name: string; regex: RegExp }[] = [
    { name: 'XSS Script Tag', regex: /<\s*script\b[^>]*>/i },
    { name: 'XSS Event Handler', regex: /\bon(error|load|click|mouse|hover|focus|blur|change|submit)\s*=/i },
    { name: 'JavaScript Protocol', regex: /javascript\s*:/i },
    { name: 'SQL Injection Union/Select', regex: /\b(union\s+select|select\s+.*\s+from|insert\s+into|drop\s+table|delete\s+from)\b/i },
    { name: 'SQL Injection Boolean', regex: /('\s*or\s+'1'\s*=\s*'1|'\s*or\s+1\s*=\s*1|--\s*$|\/\*.*\*\/)/i },
    { name: 'Path Traversal', regex: /(\.\.\/|\.\.\\)/ },
    { name: 'Template Injection', regex: /(\$\{[^}]+\}|\{\{[^}]+\}\})/ },
    { name: 'Prototype Pollution', regex: /(__proto__|constructor\.prototype)/ }
  ];

  for (const { name, regex } of attackPatterns) {
    if (regex.test(input)) {
      return { isMalicious: true, pattern: name };
    }
  }

  return { isMalicious: false };
}

const ORDER_COOLDOWN_SECONDS = 15;
const MAX_ORDERS_PER_WINDOW = 3;
const WINDOW_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Anti-Spam protection for checkout orders.
 * Prevents rapid double-clicks and automated bot flooding.
 */
export function checkOrderSpamLimit(): { allowed: boolean; waitSeconds?: number; reason?: string } {
  if (typeof window === 'undefined') return { allowed: true };

  try {
    const now = Date.now();
    const lastOrderTimeStr = localStorage.getItem('xpower_last_order_ts');
    
    // Check 1: Minimum cooldown between orders (15 seconds)
    if (lastOrderTimeStr) {
      const lastOrderTime = parseInt(lastOrderTimeStr, 10);
      const elapsedSeconds = Math.floor((now - lastOrderTime) / 1000);
      if (elapsedSeconds < ORDER_COOLDOWN_SECONDS) {
        return {
          allowed: false,
          waitSeconds: ORDER_COOLDOWN_SECONDS - elapsedSeconds,
          reason: `يرجى الانتظار ${ORDER_COOLDOWN_SECONDS - elapsedSeconds} ثانية قبل إرسال طلب آخر لمنع تكرار الطلبات.`
        };
      }
    }

    // Check 2: Max orders within 5 minutes
    const orderHistoryStr = localStorage.getItem('xpower_order_history_window');
    let orderTimestamps: number[] = orderHistoryStr ? JSON.parse(orderHistoryStr) : [];
    
    // Filter timestamps within the current 5-minute window
    orderTimestamps = orderTimestamps.filter((ts) => now - ts < WINDOW_DURATION_MS);

    if (orderTimestamps.length >= MAX_ORDERS_PER_WINDOW) {
      const oldestTs = orderTimestamps[0];
      const waitMinutes = Math.ceil((WINDOW_DURATION_MS - (now - oldestTs)) / 60000);
      return {
        allowed: false,
        waitSeconds: waitMinutes * 60,
        reason: `تم تجاوز الحد الأقصى للطلبات المتتالية (${MAX_ORDERS_PER_WINDOW} طلبات). يرجى الانتظار ${waitMinutes} دقيقة لحماية المتجر.`
      };
    }

    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

/**
 * Records a successful order timestamp to enforce the anti-spam window
 */
export function recordOrderSubmission(): void {
  if (typeof window === 'undefined') return;

  try {
    const now = Date.now();
    localStorage.setItem('xpower_last_order_ts', String(now));

    const orderHistoryStr = localStorage.getItem('xpower_order_history_window');
    let orderTimestamps: number[] = orderHistoryStr ? JSON.parse(orderHistoryStr) : [];
    orderTimestamps = orderTimestamps.filter((ts) => now - ts < WINDOW_DURATION_MS);
    orderTimestamps.push(now);
    localStorage.setItem('xpower_order_history_window', JSON.stringify(orderTimestamps));
  } catch {}
}
