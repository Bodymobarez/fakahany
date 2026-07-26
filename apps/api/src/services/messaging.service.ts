import { prisma } from '../lib/prisma';

type DeliveryResult = {
  userId: string;
  channel: 'EMAIL' | 'SMS';
  to: string | null;
  ok: boolean;
  mode: 'console' | 'webhook' | 'skipped';
  detail?: string;
};

type NormalizedIntegrations = {
  emailFrom: string;
  emailWebhookUrl: string | null;
  smsFrom: string;
  smsWebhookUrl: string | null;
};

type RawIntegrations = {
  emailProvider?: string | null;
  emailFrom?: string | null;
  emailWebhookUrl?: string | null;
  smsProvider?: string | null;
  smsSenderId?: string | null;
  smsWebhookUrl?: string | null;
  email?: { from?: string; webhookUrl?: string };
  sms?: { webhookUrl?: string; from?: string };
};

export async function getMessagingConfig(): Promise<NormalizedIntegrations> {
  const settings = await prisma.companySettings.findFirst();
  const raw = ((settings?.integrations || {}) as RawIntegrations) || {};
  return {
    emailFrom: raw.emailFrom || raw.email?.from || 'noreply@freshharvest.ae',
    emailWebhookUrl: raw.emailWebhookUrl || raw.email?.webhookUrl || null,
    smsFrom: raw.smsSenderId || raw.sms?.from || 'FreshHarvest',
    smsWebhookUrl: raw.smsWebhookUrl || raw.sms?.webhookUrl || null,
  };
}

async function postWebhook(url: string, payload: Record<string, unknown>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Webhook ${res.status}: ${text.slice(0, 200)}`);
  }
}

export async function sendTransactionalMessage(input: {
  channel: 'EMAIL' | 'SMS';
  to: string;
  title: string;
  body: string;
  userId?: string | null;
  kind?: string;
  /** Optional file attachments (e.g. invoice PDF) for email webhooks. */
  attachments?: Array<{
    filename: string;
    contentType: string;
    contentBase64: string;
  }>;
}): Promise<{ ok: boolean; mode: 'console' | 'webhook'; detail?: string }> {
  const cfg = await getMessagingConfig();
  const webhookUrl = input.channel === 'EMAIL' ? cfg.emailWebhookUrl : cfg.smsWebhookUrl;
  const from = input.channel === 'EMAIL' ? cfg.emailFrom : cfg.smsFrom;
  const payload = {
    kind: input.kind || 'transactional',
    channel: input.channel,
    to: input.to,
    subject: input.title,
    title: input.title,
    body: input.body,
    from,
    userId: input.userId || null,
    attachments: input.attachments || [],
  };

  console.info(
    `[${input.channel}:${input.kind || 'msg'}] to=${input.to} "${input.title}"` +
      (input.attachments?.length ? ` attachments=${input.attachments.length}` : ''),
  );

  if (webhookUrl) {
    await postWebhook(webhookUrl, payload);
    return { ok: true, mode: 'webhook' };
  }
  return { ok: true, mode: 'console', detail: 'Logged (no webhook configured)' };
}

/**
 * Deliver campaign EMAIL/SMS.
 * - Always logs to console (dev-friendly)
 * - Posts to emailWebhookUrl / smsWebhookUrl when configured
 */
export async function deliverCampaignMessages(input: {
  campaignId: string;
  channel: 'EMAIL' | 'SMS';
  title: string;
  body: string;
  users: Array<{ id: string; email?: string | null; phone?: string | null }>;
}): Promise<{ sent: number; skipped: number; results: DeliveryResult[] }> {
  const results: DeliveryResult[] = [];
  let sent = 0;
  let skipped = 0;

  for (const user of input.users) {
    const to = input.channel === 'EMAIL' ? user.email || null : user.phone || null;
    if (!to) {
      skipped += 1;
      results.push({
        userId: user.id,
        channel: input.channel,
        to: null,
        ok: false,
        mode: 'skipped',
        detail: input.channel === 'EMAIL' ? 'No email' : 'No phone',
      });
      continue;
    }

    try {
      const result = await sendTransactionalMessage({
        channel: input.channel,
        to,
        title: input.title,
        body: input.body,
        userId: user.id,
        kind: `campaign:${input.campaignId}`,
      });
      results.push({
        userId: user.id,
        channel: input.channel,
        to,
        ok: true,
        mode: result.mode,
        detail: result.detail,
      });
      sent += 1;
    } catch (err) {
      results.push({
        userId: user.id,
        channel: input.channel,
        to,
        ok: false,
        mode: 'webhook',
        detail: err instanceof Error ? err.message : 'Send failed',
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      action: 'CAMPAIGN_DELIVER',
      entity: 'MarketingCampaign',
      entityId: input.campaignId,
      meta: {
        channel: input.channel,
        sent,
        skipped,
        sample: results.slice(0, 20),
      },
    },
  });

  return { sent, skipped, results };
}
