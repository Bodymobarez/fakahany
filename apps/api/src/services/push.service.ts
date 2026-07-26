import { prisma } from '../lib/prisma';

type ExpoTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

export async function registerDevicePushToken(input: {
  userId: string;
  token: string;
  platform?: string;
  app?: string;
}): Promise<void> {
  const token = input.token.trim();
  if (!token) return;

  await prisma.devicePushToken.upsert({
    where: { token },
    create: {
      userId: input.userId,
      token,
      platform: input.platform || 'unknown',
      app: input.app || 'mobile',
    },
    update: {
      userId: input.userId,
      platform: input.platform || 'unknown',
      app: input.app || 'mobile',
    },
  });
}

export async function sendExpoPush(input: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<{ sent: number; failed: number; tickets: ExpoTicket[] }> {
  const tokens = [...new Set(input.tokens.filter(Boolean))];
  if (!tokens.length) return { sent: 0, failed: 0, tickets: [] };

  const messages = tokens.map((to) => ({
    to,
    sound: 'default' as const,
    title: input.title,
    body: input.body,
    data: input.data || {},
  }));

  // Expo Push API accepts batches up to 100
  const tickets: ExpoTicket[] = [];
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
      const json = (await res.json()) as { data?: ExpoTicket[]; errors?: unknown };
      const chunkTickets = json.data || [];
      tickets.push(...chunkTickets);
      for (const t of chunkTickets) {
        if (t.status === 'ok') sent += 1;
        else failed += 1;
      }
      if (!res.ok && !chunkTickets.length) {
        failed += chunk.length;
        console.warn('[push] Expo API error', res.status, json.errors || json);
      }
    } catch (err) {
      failed += chunk.length;
      console.warn('[push] Expo send failed', err);
    }
  }

  console.info(`[push] expo sent=${sent} failed=${failed} tokens=${tokens.length}`);
  return { sent, failed, tickets };
}

export async function deliverPushToUsers(input: {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  app?: string;
}): Promise<{ tokens: number; sent: number; failed: number }> {
  const rows = await prisma.devicePushToken.findMany({
    where: {
      userId: { in: input.userIds },
      ...(input.app ? { app: input.app } : {}),
    },
    select: { token: true },
  });
  const result = await sendExpoPush({
    tokens: rows.map((r) => r.token),
    title: input.title,
    body: input.body,
    data: input.data,
  });
  return { tokens: rows.length, sent: result.sent, failed: result.failed };
}
