import { prisma } from '../lib/prisma';
import { enqueueJob, registerJobHandler } from '../lib/queue';
import { runSubscriptionCycle } from '../services/subscription.service';

export function registerWorkers(): void {
  registerJobHandler('subscription-cycles', async () => {
    const result = await runSubscriptionCycle();
    if (result.created > 0) {
      console.log(
        `[worker] subscription-cycles: created ${result.created}/${result.processed} — ${result.orderNumbers.join(', ')}`,
      );
    }
  });

  registerJobHandler('expiry-alerts', async () => {
    const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const batches = await prisma.stockBatch.findMany({
      where: {
        qty: { gt: 0 },
        expiryDate: { lte: inSevenDays, gte: new Date() },
      },
      include: { product: true, warehouse: true },
      take: 100,
    });

    if (!batches.length) return;

    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'STAFF'] }, isActive: true },
      select: { id: true },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'Stock expiry alert',
          body: `${batches.length} batch(es) expire within 7 days`,
          data: {
            batchIds: batches.map((b) => b.id),
            type: 'EXPIRY_ALERT',
          },
        },
      });
    }

    console.log(`[worker] expiry-alerts: notified for ${batches.length} batches`);
  });
}

export async function scheduleRecurringJobs(): Promise<void> {
  // Run once shortly after boot, then every 6 hours (memory/bullmq delay re-queue)
  await enqueueJob('expiry-alerts', {}, { delayMs: 5_000 });
  await enqueueJob('subscription-cycles', {}, { delayMs: 15_000 });

  setInterval(() => {
    void enqueueJob('expiry-alerts', {});
  }, 6 * 60 * 60 * 1000).unref?.();

  // Check due subscriptions hourly
  setInterval(() => {
    void enqueueJob('subscription-cycles', {});
  }, 60 * 60 * 1000).unref?.();
}
