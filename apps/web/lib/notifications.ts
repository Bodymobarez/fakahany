export type AppNotification = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    ticketId?: string;
    orderId?: string;
    href?: string;
    type?: string;
    [key: string]: unknown;
  } | null;
};

export function notificationHref(n: AppNotification): string {
  return `/account/notifications/${n.id}`;
}

export function notificationRelatedHref(n: AppNotification): string | null {
  const data = n.data || {};
  if (typeof data.href === 'string' && data.href.startsWith('/')) return data.href;
  if (typeof data.ticketId === 'string' && data.ticketId) {
    return `/account/support?ticketId=${encodeURIComponent(data.ticketId)}`;
  }
  if (typeof data.orderId === 'string' && data.orderId) {
    return `/account/orders/${data.orderId}`;
  }
  return null;
}

export function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
