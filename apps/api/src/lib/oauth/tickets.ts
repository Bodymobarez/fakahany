import { randomBytes } from 'crypto';
import type { UserRole } from '@prisma/client';

type TicketPayload = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username?: string | null;
    email: string | null;
    phone: string | null;
    firstName: string;
    lastName: string;
    role: UserRole;
    locale: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    marketingOptIn: boolean;
  };
  isNew: boolean;
  needsAddress: boolean;
  provider: string;
  expiresAt: number;
};

const tickets = new Map<string, TicketPayload>();

const TTL_MS = 2 * 60 * 1000;

export function createOAuthTicket(payload: Omit<TicketPayload, 'expiresAt'>) {
  const id = randomBytes(24).toString('hex');
  tickets.set(id, { ...payload, expiresAt: Date.now() + TTL_MS });
  return id;
}

export function consumeOAuthTicket(id: string): TicketPayload | null {
  const ticket = tickets.get(id);
  if (!ticket) return null;
  tickets.delete(id);
  if (ticket.expiresAt < Date.now()) return null;
  return ticket;
}
