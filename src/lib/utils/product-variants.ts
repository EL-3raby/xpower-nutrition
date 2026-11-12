/**
 * Product Variant Helpers (Flavors vs Colors / Options)
 * Dynamically detects whether a product or bundle component is an accessory / gear
 * (shaker, serv holder, strap, etc.) and provides the authentic Arabic terminology
 * ('اللون / اختر اللون') instead of supplement terminology ('الطعم / اختر النكهة').
 */

export function isAccessoryProduct(productOrItem?: { category?: string; name?: string }): boolean {
  if (!productOrItem) return false;
  const cat = (productOrItem.category || '').toLowerCase().trim();
  const name = (productOrItem.name || '').toLowerCase().trim();

  // Check category
  if (
    cat === 'accessories' ||
    cat === 'accessory' ||
    cat === 'اكسسوارات' ||
    cat === 'إكسسوارات' ||
    cat.includes('access')
  ) {
    return true;
  }

  // Check name keywords
  const accessoryKeywords = [
    'shaker',
    'شيكر',
    'holder',
    'serv holder',
    'حامل',
    'strap',
    'straps',
    'ستراب',
    'سترابس',
    'belt',
    'حزام',
    'bottle',
    'زجاجة',
    'wrist',
    'معصم',
    't-shirt',
    'تيشيرت',
    'تي شيرت',
    'cap',
    'كاب',
    'towel',
    'فوطة'
  ];

  return accessoryKeywords.some((keyword) => name.includes(keyword));
}

export interface VariantTerminology {
  chooseTitle: string;      // e.g. "اختر اللون" vs "اختر النكهة"
  chooseItemPrefix: string; // e.g. "اختار لون" vs "اختار نكهة"
  specLabel: string;        // e.g. "اللون" vs "الطعم"
  pluralLabel: string;      // e.g. "الألوان" vs "النكهات"
}

export function getVariantTerminology(productOrItem?: { category?: string; name?: string }): VariantTerminology {
  const isAcc = isAccessoryProduct(productOrItem);
  return {
    chooseTitle: isAcc ? 'اختر اللون' : 'اختر النكهة',
    chooseItemPrefix: isAcc ? 'اختار لون' : 'اختار نكهة',
    specLabel: isAcc ? 'اللون' : 'الطعم',
    pluralLabel: isAcc ? 'الألوان' : 'النكهات'
  };
}

