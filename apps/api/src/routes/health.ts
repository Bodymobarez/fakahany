import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { getRedis } from '../lib/redis';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  let db: 'ok' | 'error' = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'error';
  }

  const redisClient = getRedis();
  let redis: 'ok' | 'skipped' | 'error' = 'skipped';
  if (redisClient) {
    try {
      await redisClient.ping();
      redis = 'ok';
    } catch {
      redis = 'error';
    }
  }

  res.json({
    status: db === 'ok' ? 'healthy' : 'degraded',
    service: '@fv/api',
    db,
    redis,
    time: new Date().toISOString(),
  });
});
