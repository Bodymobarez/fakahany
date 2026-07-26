import Redis from 'ioredis';

let client: Redis | null = null;
let attempted = false;

export function getRedis(): Redis | null {
  if (attempted) return client;
  attempted = true;

  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    client.on('error', () => {
      /* optional locally */
    });
  } catch {
    client = null;
  }

  return client;
}

export async function connectRedis(): Promise<Redis | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    if (redis.status === 'wait' || redis.status === 'end') {
      await redis.connect();
    }
    await redis.ping();
    return redis;
  } catch {
    try {
      redis.disconnect();
    } catch {
      /* ignore */
    }
    client = null;
    return null;
  }
}
