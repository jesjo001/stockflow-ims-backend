import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import hpp from 'hpp';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler.middleware';
import { apiLimiter } from './middleware/rateLimiter.middleware';
import { ApiError } from './utils/ApiError';
import { StatusCodes } from 'http-status-codes';
import { env } from './config/env';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Security Headers
app.use(helmet());

// Compression - Aggressive for cPanel/VPS
app.use(compression({ 
  threshold: 512, // Compress responses > 512 bytes
  level: 6, // Balance speed vs compression
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// CORS
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}));

// Body parsing - Production optimized
app.use(express.json({ 
  limit: '10kb',
  strict: true, // Only parse objects and arrays
}));
app.use(express.urlencoded({ 
  extended: false, // Use querystring instead of qs for performance
  limit: '10kb' 
}));

// Data Sanitization & Security
// Both express-mongo-sanitize and xss-clean try to assign to req.query which is
// read-only in Node.js v17+. Use their internal sanitize functions directly on
// req.body and req.params only.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mongoSanitizeFn = require('express-mongo-sanitize').sanitize;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { clean: xssClean } = require('xss-clean/lib/xss');
app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
  if (req.body) req.body = xssClean(mongoSanitizeFn(req.body));
  if (req.params) req.params = xssClean(mongoSanitizeFn(req.params));
  next();
});
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Rate Limiting
app.use('/api', apiLimiter);

// Health Check - No logging for uptime checks
app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store');
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1', routes);

// 404 handler
app.all('/{*any}', (req, res, next) => {
  next(new ApiError(StatusCodes.NOT_FOUND, `Can't find ${req.originalUrl} on this server!`));
});

// Global error handler
app.use(errorHandler);

export default app;
