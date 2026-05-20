/**
 * Sitemap generation utilities
 * Generates XML sitemaps for search engine crawling
 */

export interface SitemapUrl {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

/**
 * Generate XML sitemap content
 */
export const generateSitemap = (urls: SitemapUrl[]): string => {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
  const urlset = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  const urlEntries = urls
    .map((item) => {
      return `  <url>
    <loc>${escapeXml(item.url)}</loc>
    ${item.lastmod ? `<lastmod>${item.lastmod}</lastmod>` : ''}
    ${item.changefreq ? `<changefreq>${item.changefreq}</changefreq>` : ''}
    ${item.priority !== undefined ? `<priority>${item.priority}</priority>` : ''}
  </url>`;
    })
    .join('\n');

  return `${xmlHeader}\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
};

/**
 * Generate XML sitemap index (for multiple sitemaps)
 */
export const generateSitemapIndex = (sitemaps: { loc: string; lastmod?: string }[]): string => {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';

  const sitemapEntries = sitemaps
    .map((sitemap) => {
      return `  <sitemap>
    <loc>${escapeXml(sitemap.loc)}</loc>
    ${sitemap.lastmod ? `<lastmod>${sitemap.lastmod}</lastmod>` : ''}
  </sitemap>`;
    })
    .join('\n');

  return `${xmlHeader}\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</sitemapindex>`;
};

/**
 * Escape special XML characters
 */
const escapeXml = (str: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  };
  return str.replace(/[&<>"']/g, (char) => map[char]);
};

/**
 * Get current date in ISO format for lastmod
 */
export const getCurrentDateISO = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Static pages sitemap URLs
 */
export const getStaticPageUrls = (domain: string): SitemapUrl[] => {
  const today = getCurrentDateISO();
  return [
    { url: `${domain}/`, lastmod: today, changefreq: 'hourly', priority: 1.0 },
    { url: `${domain}/shop`, lastmod: today, changefreq: 'daily', priority: 0.9 },
    { url: `${domain}/products`, lastmod: today, changefreq: 'daily', priority: 0.9 },
    { url: `${domain}/categories`, lastmod: today, changefreq: 'weekly', priority: 0.8 },
    { url: `${domain}/about`, lastmod: today, changefreq: 'monthly', priority: 0.7 },
    { url: `${domain}/blog`, lastmod: today, changefreq: 'daily', priority: 0.8 },
    { url: `${domain}/pricing`, lastmod: today, changefreq: 'monthly', priority: 0.7 },
    { url: `${domain}/contact`, lastmod: today, changefreq: 'yearly', priority: 0.6 },
    { url: `${domain}/privacy`, lastmod: today, changefreq: 'yearly', priority: 0.5 },
    { url: `${domain}/terms`, lastmod: today, changefreq: 'yearly', priority: 0.5 },
    { url: `${domain}/help`, lastmod: today, changefreq: 'monthly', priority: 0.6 },
  ];
};

/**
 * Generate product category URLs for sitemap
 */
export const getProductCategoryUrls = (
  domain: string,
  categories: Array<{ id: string | number; slug?: string; name?: string; updatedAt?: string }>
): SitemapUrl[] => {
  return categories.map((category) => ({
    url: `${domain}/categories/${category.slug || category.id}`,
    lastmod: category.updatedAt ? category.updatedAt.split('T')[0] : getCurrentDateISO(),
    changefreq: 'weekly' as const,
    priority: 0.7,
  }));
};

/**
 * Generate product URLs for sitemap
 */
export const getProductUrls = (
  domain: string,
  products: Array<{ id: string | number; slug?: string; name?: string; updatedAt?: string }>
): SitemapUrl[] => {
  return products.map((product) => ({
    url: `${domain}/products/${product.slug || product.id}`,
    lastmod: product.updatedAt ? product.updatedAt.split('T')[0] : getCurrentDateISO(),
    changefreq: 'weekly' as const,
    priority: 0.8,
  }));
};

/**
 * Generate blog post URLs for sitemap
 */
export const getBlogUrls = (
  domain: string,
  posts: Array<{ id: string | number; slug?: string; title?: string; publishedAt?: string; updatedAt?: string }>
): SitemapUrl[] => {
  return posts.map((post) => ({
    url: `${domain}/blog/${post.slug || post.id}`,
    lastmod: post.updatedAt || post.publishedAt
      ? new Date(post.updatedAt || post.publishedAt || '').toISOString().split('T')[0]
      : getCurrentDateISO(),
    changefreq: 'monthly' as const,
    priority: 0.7,
  }));
};
