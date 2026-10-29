export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  crop?: 'limit' | 'fill' | 'fit' | 'scale' | 'pad';
  quality?: string;
}

/**
 * Transforms Cloudinary image URLs to automatically deliver optimal formats (WebP/AVIF),
 * dimensions, and quality (f_auto,q_auto,w_...,h_...,c_...).
 */
export function getOptimizedImageUrl(
  url: string | undefined | null,
  options?: ImageOptimizationOptions
): string {
  if (!url) return '/images/no-image.png';
  if (typeof url !== 'string') return '/images/no-image.png';

  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    const transforms: string[] = ['f_auto'];

    if (options?.quality) {
      transforms.push(`q_${options.quality}`);
    } else {
      transforms.push('q_auto');
    }

    if (options?.width) {
      transforms.push(`w_${options.width}`);
    }
    if (options?.height) {
      transforms.push(`h_${options.height}`);
    }
    if (options?.width || options?.height) {
      transforms.push(`c_${options?.crop || 'limit'}`);
    }

    const transformString = transforms.join(',');

    // If existing transformation present, replace it
    if (/\/upload\/[^/]+\//.test(url) && (url.includes('f_auto') || url.includes('q_auto') || url.includes('w_') || url.includes('h_'))) {
      return url.replace(/\/upload\/[^/]+\//, `/upload/${transformString}/`);
    }

    return url.replace('/upload/', `/upload/${transformString}/`);
  }

  return url;
}
