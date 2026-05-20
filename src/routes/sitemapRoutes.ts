import { Router, Request, Response } from 'express';
import {
  generateSitemap,
  generateSitemapIndex,
  getStaticPageUrls,
  getProductCategoryUrls,
  getProductUrls,
  getBlogUrls,
} from '../utils/sitemapGenerator';
import { env } from '../config/env';

const router = Router();

const DOMAIN = env.CLIENT_URL || 'https://www.stocklt.xyz';

/**
 * Main sitemap index - references all other sitemaps
 * GET /sitemap.xml
 */
router.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemaps = [
      { loc: `${DOMAIN}/sitemap-pages.xml`, lastmod: new Date().toISOString().split('T')[0] },
      { loc: `${DOMAIN}/sitemap-products.xml`, lastmod: new Date().toISOString().split('T')[0] },
      { loc: `${DOMAIN}/sitemap-categories.xml`, lastmod: new Date().toISOString().split('T')[0] },
      { loc: `${DOMAIN}/sitemap-blog.xml`, lastmod: new Date().toISOString().split('T')[0] },
    ];

    const sitemapIndex = generateSitemapIndex(sitemaps);

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(sitemapIndex);
  } catch (error) {
    console.error('Error generating sitemap index:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * Static pages sitemap
 * GET /sitemap-pages.xml
 */
router.get('/sitemap-pages.xml', async (req: Request, res: Response) => {
  try {
    const urls = getStaticPageUrls(DOMAIN);
    const sitemap = generateSitemap(urls);

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=86400');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating pages sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * Products sitemap - dynamically generated from database
 * GET /sitemap-products.xml
 */
router.get('/sitemap-products.xml', async (req: Request, res: Response) => {
  try {
    // TODO: Fetch products from database
    // const products = await Product.find().select('id slug name updatedAt').lean();
    // For now, return empty sitemap structure
    const urls: any[] = [];
    // const urls = getProductUrls(DOMAIN, products);

    const sitemap = generateSitemap(urls);

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating products sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * Categories sitemap - dynamically generated from database
 * GET /sitemap-categories.xml
 */
router.get('/sitemap-categories.xml', async (req: Request, res: Response) => {
  try {
    // TODO: Fetch categories from database
    // const categories = await Category.find().select('id slug name updatedAt').lean();
    // For now, return empty sitemap structure
    const urls: any[] = [];
    // const urls = getProductCategoryUrls(DOMAIN, categories);

    const sitemap = generateSitemap(urls);

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=86400');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating categories sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * Blog sitemap - dynamically generated from database
 * GET /sitemap-blog.xml
 */
router.get('/sitemap-blog.xml', async (req: Request, res: Response) => {
  try {
    // TODO: Fetch blog posts from database
    // const posts = await BlogPost.find({ status: 'published' }).select('id slug title publishedAt updatedAt').lean();
    // For now, return empty sitemap structure
    const urls: any[] = [];
    // const urls = getBlogUrls(DOMAIN, posts);

    const sitemap = generateSitemap(urls);

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating blog sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

export default router;
