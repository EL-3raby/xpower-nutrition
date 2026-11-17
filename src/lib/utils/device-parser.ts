/**
 * Clean & lightweight User-Agent parser for security radar & analytics.
 * Zero external dependencies.
 */

export interface ParsedDeviceInfo {
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot';
  isBot: boolean;
  label: string;
}

export function parseUserAgent(ua?: string): ParsedDeviceInfo {
  if (!ua || ua === 'unknown') {
    return {
      browser: 'غير معروف',
      os: 'نظام غير معروف',
      deviceType: 'bot',
      isBot: true,
      label: 'أداة فحص غير معروفة'
    };
  }

  const lower = ua.toLowerCase();

  // 1. Detect Bots & Automated Scanners
  const isBot =
    lower.includes('bot') ||
    lower.includes('crawl') ||
    lower.includes('spider') ||
    lower.includes('headless') ||
    lower.includes('python') ||
    lower.includes('curl') ||
    lower.includes('wget') ||
    lower.includes('postman') ||
    lower.includes('go-http') ||
    lower.includes('scanner') ||
    lower.includes('probe') ||
    lower.includes('nmap') ||
    lower.includes('nikto') ||
    lower.includes('sqlmap') ||
    lower.includes('censys') ||
    lower.includes('shodan') ||
    lower.includes('zgrab') ||
    lower.includes('wappalyzer') ||
    lower.includes('puppeteer') ||
    lower.includes('playwright');

  // 2. Detect OS
  let os = 'نظام غير معروف';
  if (lower.includes('windows nt 10.0')) os = 'Windows 10/11';
  else if (lower.includes('windows nt 6.3')) os = 'Windows 8.1';
  else if (lower.includes('windows nt 6.2')) os = 'Windows 8';
  else if (lower.includes('windows nt 6.1')) os = 'Windows 7';
  else if (lower.includes('windows')) os = 'Windows';
  else if (lower.includes('android')) {
    const match = ua.match(/Android\s([0-9\.]+)/i);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (lower.includes('iphone')) {
    os = 'iPhone (iOS)';
  } else if (lower.includes('ipad')) {
    os = 'iPad (iPadOS)';
  } else if (lower.includes('mac os x') || lower.includes('macintosh')) {
    os = 'macOS';
  } else if (lower.includes('ubuntu')) {
    os = 'Ubuntu Linux';
  } else if (lower.includes('linux')) {
    os = 'Linux Server';
  }

  // 3. Detect Browser
  let browser = 'متصفح غير معروف';
  if (lower.includes('headlesschrome')) {
    browser = 'Headless Chrome (آلي)';
  } else if (lower.includes('edg/')) {
    const match = ua.match(/Edg\/([0-9\.]+)/);
    browser = match ? `Microsoft Edge ${match[1].split('.')[0]}` : 'Microsoft Edge';
  } else if (lower.includes('chrome/') && !lower.includes('chromium')) {
    const match = ua.match(/Chrome\/([0-9\.]+)/);
    browser = match ? `Chrome ${match[1].split('.')[0]}` : 'Chrome';
  } else if (lower.includes('firefox/')) {
    const match = ua.match(/Firefox\/([0-9\.]+)/);
    browser = match ? `Firefox ${match[1].split('.')[0]}` : 'Firefox';
  } else if (lower.includes('safari/') && !lower.includes('chrome/')) {
    browser = 'Apple Safari';
  } else if (lower.includes('opera') || lower.includes('opr/')) {
    browser = 'Opera';
  } else if (lower.includes('python')) {
    browser = 'Python Script / Bot';
  } else if (lower.includes('curl')) {
    browser = 'cURL CLI Tool';
  } else if (lower.includes('postman')) {
    browser = 'Postman API Client';
  }

  // 4. Device Type
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' = 'desktop';
  if (isBot) {
    deviceType = 'bot';
  } else if (lower.includes('ipad') || lower.includes('tablet')) {
    deviceType = 'tablet';
  } else if (
    lower.includes('mobile') ||
    lower.includes('android') ||
    lower.includes('iphone')
  ) {
    deviceType = 'mobile';
  }

  const label = isBot
    ? `${browser} (${os}) — روبوت فحص`
    : `${browser} • ${os}`;

  return {
    browser,
    os,
    deviceType,
    isBot,
    label
  };
}
