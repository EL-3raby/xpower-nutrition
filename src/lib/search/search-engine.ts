/**
 * X-Power Nutrition — World-Class Search Engine
 * Features:
 * 1. Deep Arabic normalization (Alef variations, Yaa/Alef Maksura, Taa Marbuta, Tashkeel removal, Al-prefix handling).
 * 2. Multi-field weighted scoring (Title > Category > Flavors > Servings/Weight > SKU/Tags > Description).
 * 3. Typo tolerance with Levenshtein distance for fuzzy matching.
 * 4. Recent searches management in localStorage.
 * 5. Popular & trending fitness queries.
 */

import { Product } from '@/lib/types';

// Arabic Tashkeel unicode range: \u064B to \u065F
const TASHKEEL_REGEX = /[\u064B-\u065F\u0670]/g;

/**
 * Normalizes text for comprehensive Arabic & Latin search matching
 */
export function normalizeSearchQuery(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(TASHKEEL_REGEX, '')
    // Split combined numbers & units: 60srv -> 60 srv, 300g -> 300 g, 5kg -> 5 kg
    .replace(/(\d+)\s*(srv|servings|serving|g|gm|kg|lb|lbs|حصة|جرعة|جرام|كيلو)/gi, '$1 $2')
    .replace(/[-_.,/\\|+&()[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips Arabic definite article 'ال' if word starts with it (for lenient root matching)
 */
export function stripArabicDefiniteArticle(word: string): string {
  if (word.startsWith('ال') && word.length > 3) {
    return word.slice(2);
  }
  return word;
}

/**
 * Calculates Levenshtein distance between two strings (for typo tolerance)
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Checks if a search token matches a target word with fuzzy typo tolerance
 */
function tokenMatchesWord(token: string, targetWord: string): boolean {
  if (targetWord.includes(token)) return true;

  // Check without 'ال'
  const tokenNoAl = stripArabicDefiniteArticle(token);
  const targetNoAl = stripArabicDefiniteArticle(targetWord);
  if (targetNoAl.includes(tokenNoAl)) return true;

  // Typo tolerance for words longer than 3 characters (allows 1 typo)
  if (token.length >= 4 && targetWord.length >= 4) {
    const dist = levenshteinDistance(token, targetWord);
    if (dist <= 1) return true;
    if (tokenNoAl.length >= 4 && targetNoAl.length >= 4) {
      if (levenshteinDistance(tokenNoAl, targetNoAl) <= 1) return true;
    }
  }

  return false;
}

export interface SearchScoreResult {
  product: Product;
  score: number;
  matchedFields: string[];
}

/**
 * Scored search against a collection of products
 */
export function searchProductsScored(
  products: Product[],
  rawQuery: string,
  categoriesMap?: Record<string, string>
): SearchScoreResult[] {
  const cleanQuery = normalizeSearchQuery(rawQuery);
  if (!cleanQuery) return [];

  const tokens = cleanQuery.split(' ').filter((t) => t.length > 0);
  if (tokens.length === 0) return [];

  const results: SearchScoreResult[] = [];

  for (const product of products) {
    if (!product.isActive) continue;

    let score = 0;
    const matchedFields: string[] = [];

    const normName = normalizeSearchQuery(product.name || '');
    const normCategorySlug = normalizeSearchQuery(product.category || '');
    const normCategoryName = categoriesMap && product.category
      ? normalizeSearchQuery(categoriesMap[product.category] || '')
      : '';
    const normFlavors = Array.isArray(product.flavors)
      ? normalizeSearchQuery(product.flavors.join(' '))
      : '';
    const normWeight = normalizeSearchQuery(product.weight || '');
    const normServings = product.servings ? `${product.servings} srv حصة جرعة` : '';
    const normDescription = normalizeSearchQuery(product.description || '');

    // Name words
    const nameWords = normName.split(' ');
    const categoryWords = `${normCategorySlug} ${normCategoryName}`.split(' ');
    const flavorWords = normFlavors.split(' ');

    // 1. Check exact full query match in title (Highest priority)
    if (normName === cleanQuery) {
      score += 150;
      matchedFields.push('name_exact');
    } else if (normName.startsWith(cleanQuery)) {
      score += 100;
      matchedFields.push('name_start');
    } else if (normName.includes(cleanQuery)) {
      score += 70;
      matchedFields.push('name_contain');
    }

    // 2. Token-level matching
    let allTokensMatched = true;

    for (const token of tokens) {
      let tokenMatched = false;

      // Match in Name
      if (nameWords.some((w) => tokenMatchesWord(token, w))) {
        score += 35;
        tokenMatched = true;
        if (!matchedFields.includes('name')) matchedFields.push('name');
      }

      // Match in Category
      if (categoryWords.some((w) => tokenMatchesWord(token, w))) {
        score += 25;
        tokenMatched = true;
        if (!matchedFields.includes('category')) matchedFields.push('category');
      }

      // Match in Flavors
      if (flavorWords.some((w) => tokenMatchesWord(token, w))) {
        score += 20;
        tokenMatched = true;
        if (!matchedFields.includes('flavors')) matchedFields.push('flavors');
      }

      // Match in Weight / Servings
      if (normWeight.includes(token) || normServings.includes(token)) {
        score += 15;
        tokenMatched = true;
        if (!matchedFields.includes('specs')) matchedFields.push('specs');
      }

      // Match in Description
      if (normDescription.includes(token)) {
        score += 10;
        tokenMatched = true;
        if (!matchedFields.includes('description')) matchedFields.push('description');
      }

      if (!tokenMatched) {
        allTokensMatched = false;
        break;
      }
    }

    // Boost in-stock products
    if (allTokensMatched && score > 0) {
      if (product.stock > 0) {
        score += 15;
      }
      // Boost discounted products slightly
      if (product.oldPrice && product.oldPrice > product.price) {
        score += 10;
      }
      // Boost best-sellers
      if (product.salesCount && product.salesCount > 0) {
        score += Math.min(10, Math.floor(product.salesCount / 5));
      }

      results.push({
        product,
        score,
        matchedFields,
      });
    }
  }

  // Sort by highest score first
  return results.sort((a, b) => b.score - a.score);
}

// ==========================================
// Recent Searches Management (LocalStorage)
// ==========================================
const RECENT_SEARCHES_KEY = 'xpower_recent_searches_v1';
const MAX_RECENT_SEARCHES = 6;

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): string[] {
  if (typeof window === 'undefined') return [];
  const clean = query.trim();
  if (!clean || clean.length < 2) return getRecentSearches();

  try {
    const current = getRecentSearches();
    const updated = [clean, ...current.filter((q) => q.toLowerCase() !== clean.toLowerCase())].slice(
      0,
      MAX_RECENT_SEARCHES
    );
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function removeRecentSearch(queryToRemove: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = getRecentSearches();
    const updated = current.filter((q) => q !== queryToRemove);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // ignore
  }
}

// Popular athletic search queries
export const POPULAR_SEARCH_TAGS = [
  'كرياتين',
  'واي بروتين',
  'بمب',
  'عروض وخصومات 🔥',
  'أحزمة ورست',
  'شيكر',
  'ماس جينر',
];

