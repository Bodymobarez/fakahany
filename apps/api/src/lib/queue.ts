import { Queue, Worker, type JobsOptions, type Processor } from 'bullmq';
import { getRedis } from './redis';

type JobHandler = (name: string, data: unknown) => Promise<void>;

const memoryJobs: Array<{ name: string; data: unknown; runAt: number }> = [];
const handlers = new Map<string, JobHandler>();
let memoryTimer: NodeJS.Timeout | null = null;
let bullQueue: Queue | null = null;
let bullWorker: Worker | null = null;
let useMemory = true;

function startMemoryLoop() {
  if (memoryTimer) return;
  memoryTimer = setInterval(() => {
    const now = Date.now();
    while (memoryJobs.length && (memoryJobs[0]?.runAt ?? Infinity) <= now) {
      const job = memoryJobs.shift();
      if (!job) break;
      const handler = handlers.get(job.name);
      if (handler) {
        void handler(job.name, job.data).catch(() => undefined);
      }
    }
  }, 1000);
  memoryTimer.unref?.();
}

export async function initQueue(): Promise<'bullmq' | 'memory'> {
  const redis = getRedis();
  if (!redis) {
    useMemory = true;
    startMemoryLoop();
    return 'memory';
  }

  try {
    bullQueue = new Queue('fv-jobs', { connection: redis.duplicate() });
    bullWorker = new Worker(
      'fv-jobs',
      async (job) => {
        const handler = handlers.get(job.name);
        if (handler) await handler(job.name, job.data);
      },
      { connection: redis.duplicate() },
    );
    bullWorker.on('failed', () => undefined);
    useMemory = false;
    return 'bullmq';
  } catch {
    useMemory = true;
    startMemoryLoop();
    return 'memory';
  }
}

export function registerJobHandler(name: string, handler: JobHandler): void {
  handlers.set(name, handler);
}

export async function enqueueJob(
  name: string,
  data: unknown,
  opts?: { delayMs?: number } & JobsOptions,
): Promise<void> {
  if (!useMemory && bullQueue) {
    await bullQueue.add(name, data, {
      delay: opts?.delayMs,
      removeOnComplete: true,
      removeOnFail: 50,
      ...opts,
    });
    return;
  }

  memoryJobs.push({
    name,
    data,
    runAt: Date.now() + (opts?.delayMs ?? 0),
  });
  memoryJobs.sort((a, b) => a.runAt - b.runAt);
  startMemoryLoop();
}

export async function closeQueue(): Promise<void> {
  if (memoryTimer) {
    clearInterval(memoryTimer);
    memoryTimer = null;
  }
  await bullWorker?.close();
  await bullQueue?.close();
}

// type-only import usage for Processor when wiring custom workers
export type { Processor };
