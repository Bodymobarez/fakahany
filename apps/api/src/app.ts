import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { errorHandler, notFound } from './middleware/error';
import { apiPublicOrigin, rewriteMediaInJson } from './lib/publicUrl';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { uploadRouter } from './routes/upload';
import { catalogRouter } from './routes/catalog';
import { cartRouter } from './routes/cart';
import { addressesRouter } from './routes/addresses';
import { wishlistRouter } from './routes/wishlist';
import { reviewsRouter } from './routes/reviews';
import { checkoutRouter } from './routes/checkout';
import { ordersRouter } from './routes/orders';
import { paymentsRouter } from './routes/payments';
import { deliveryRouter } from './routes/delivery';
import { driverRouter } from './routes/driver';
import { loyaltyRouter } from './routes/loyalty';
import { walletRouter } from './routes/wallet';
import { contentRouter } from './routes/content';
import { supportRouter } from './routes/support';
import { notificationsRouter } from './routes/notifications';
import { complianceRouter } from './routes/compliance';
import { expansionRouter } from './routes/expansion';
import { giftCardsRouter } from './routes/gift-cards';
import { openapiRouter } from './routes/openapi';
import { adminRouter } from './routes/admin';

export function createApp() {
  const app = express();

  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://nabtio.adsolutions-eg.com',
    'https://nabtio.ceo-691.workers.dev',
    'https://admin.nabtio.adsolutions-eg.com',
    'https://nabtio-admin.ceo-691.workers.dev',
  ];
  const fromEnv = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origins = [...new Set([...defaultOrigins, ...fromEnv])];

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: origins,
      credentials: true,
    }),
  );
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Rewrite localhost/relative upload URLs to the public API origin (tunnel or API_URL).
  app.use((req, res, next) => {
    const origin = apiPublicOrigin(req);
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => originalJson(rewriteMediaInJson(body, origin))) as typeof res.json;
    next();
  });

  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  app.use('/uploads', express.static(path.isAbsolute(uploadDir) ? uploadDir : path.resolve(process.cwd(), uploadDir)));

  app.use('/api/health', healthRouter);
  app.use('/api', openapiRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/addresses', addressesRouter);
  app.use('/api/wishlist', wishlistRouter);
  app.use('/api/reviews', reviewsRouter);
  app.use('/api/checkout', checkoutRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/delivery', deliveryRouter);
  app.use('/api/driver', driverRouter);
  app.use('/api/loyalty', loyaltyRouter);
  app.use('/api/wallet', walletRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/support', supportRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/compliance', complianceRouter);
  app.use('/api/expansion', expansionRouter);
  app.use('/api/gift-cards', giftCardsRouter);
  app.use('/api/admin', adminRouter);

  app.get('/', (_req, res) => {
    res.json({ name: '@fv/api', ok: true });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
