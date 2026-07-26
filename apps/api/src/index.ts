import path from 'path';
import http from 'http';
import dotenv from 'dotenv';

// Load monorepo root .env then local overrides
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { createApp } from './app';
import { connectRedis } from './lib/redis';
import { initQueue, closeQueue } from './lib/queue';
import { storage } from './lib/storage';
import { initSockets } from './sockets';
import { registerWorkers, scheduleRecurringJobs } from './workers';
import { prisma } from './lib/prisma';

async function main() {
  await storage.ensureReady();
  await connectRedis();
  const queueMode = await initQueue();
  registerWorkers();
  await scheduleRecurringJobs();

  const app = createApp();
  const server = http.createServer(app);
  initSockets(server);

  const port = Number(process.env.API_PORT || process.env.PORT || 4000);
  server.listen(port, () => {
    console.log(`@fv/api listening on :${port} (queue=${queueMode})`);
  });

  const shutdown = async (signal: string) => {
    console.log(`Shutting down (${signal})...`);
    server.close();
    await closeQueue();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
