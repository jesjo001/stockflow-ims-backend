import { Router, Request, Response } from 'express';

const router = Router();

// Define African countries for pricing
const AFRICAN_COUNTRIES = new Set([
  'NG', 'KE', 'GH', 'UG', 'TZ', 'ZA', 'ET', 'RW', 'CM', 'SN',
  'MA', 'EG', 'ZW', 'ZM', 'BW', 'MW', 'MZ', 'NA', 'AO', 'CD',
  'CG', 'CI', 'BF', 'ML', 'NE',
]);

/**
 * GET /api/geolocation/detect
 * Detects user's location based on their IP address
 * Returns country code without CORS issues
 * 
 * Response: { countryCode: string, region: 'africa' | 'western' }
 */
router.get('/detect', async (req: Request, res: Response) => {
  try {
    // Get client IP from various sources
    const clientIp = 
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown';

    // Try multiple geolocation services with fallback
    let countryCode: string | null = null;
    let detectionMethod: string = 'none';

    // Primary: ip-api.com (no CORS from server, supports JSONP)
    try {
      const response = await fetch('https://ip-api.com/json/', {
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const data = await response.json();
        countryCode = data.countryCode?.toUpperCase();
        detectionMethod = 'ip-api.com';
      }
    } catch (error) {
      console.warn('ip-api.com detection failed:', error instanceof Error ? error.message : error);
    }

    // Fallback: geolocation-db.com
    if (!countryCode) {
      try {
        const response = await fetch('https://geolocation-db.com/json/', {
          signal: AbortSignal.timeout(3000),
        });

        if (response.ok) {
          const data = await response.json();
          countryCode = data.country_code?.toUpperCase();
          detectionMethod = 'geolocation-db.com';
        }
      } catch (error) {
        console.warn('geolocation-db.com detection failed:', error instanceof Error ? error.message : error);
      }
    }

    // Fallback: MaxMind or fallback to localhost detection
    if (!countryCode) {
      try {
        const response = await fetch(`https://geoip.maxmind.com/geoip/v2.1/country/${clientIp}`, {
          headers: {
            Authorization: `Basic ${Buffer.from(`account_id:license_key`).toString('base64')}`,
          },
          signal: AbortSignal.timeout(3000),
        });

        if (response.ok) {
          const data = await response.json();
          countryCode = data.country?.iso_code?.toUpperCase();
          detectionMethod = 'maxmind';
        }
      } catch (error) {
        console.warn('MaxMind detection failed:', error instanceof Error ? error.message : error);
      }
    }

    // If all detection fails, return unknown
    if (!countryCode) {
      return res.json({
        countryCode: null,
        region: 'unknown',
        detectionMethod: 'none',
        clientIp: process.env.NODE_ENV === 'development' ? clientIp : undefined,
      });
    }

    // Determine region based on country
    const region = AFRICAN_COUNTRIES.has(countryCode) ? 'africa' : 'western';

    res.json({
      countryCode,
      region,
      detectionMethod,
      clientIp: process.env.NODE_ENV === 'development' ? clientIp : undefined,
    });
  } catch (error) {
    console.error('Geolocation error:', error);
    res.status(500).json({
      error: 'Geolocation detection failed',
      countryCode: null,
      region: 'unknown',
    });
  }
});

export default router;
