import { Request, Response, NextFunction } from 'express';

/**
 * SEO-Optimized Headers Middleware
 * Adds important headers for search engine optimization and social sharing
 */
export const seoHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add security headers for better SEO (CSP helps prevent XSS)
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('X-XSS-Protection', '1; mode=block');
  
  // Add cache control headers for static resources
  if (req.url.match(/\.(xml|txt|json)$/)) {
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  }

  next();
};

/**
 * Open Graph & Twitter Meta Tags Middleware
 * Ensures proper Open Graph and Twitter Card headers for social sharing
 * Note: For dynamic content, these should be set per-page in React
 */
export const socialMetaTagsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // These are mostly handled client-side in React
  // But we can add some default headers here
  res.set('Twitter-Site', '@stockit');
  next();
};

/**
 * Performance Headers for SEO
 * Includes headers that improve Core Web Vitals and PageSpeed scores
 */
export const performanceHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Enable compression hint for browsers
  res.set('Content-Encoding', 'gzip');
  
  // Connection settings
  res.set('Connection', 'keep-alive');
  
  // DNS prefetch for external resources
  res.set('X-DNS-Prefetch-Control', 'on');

  next();
};

export default seoHeadersMiddleware;
