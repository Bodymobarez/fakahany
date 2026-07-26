import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';

let io: Server | null = null;

export function initSockets(httpServer: HttpServer): Server {
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map((s) => s.trim());

  io = new Server(httpServer, {
    cors: { origin: origins, credentials: true },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.headers.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.slice(7)
        : undefined);
    if (!token) {
      next();
      return;
    }
    try {
      socket.data.user = verifyAccessToken(token);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as { sub?: string; role?: string } | undefined;
    if (user?.sub) {
      void socket.join(`user:${user.sub}`);
    }
    if (user?.role === 'ADMIN' || user?.role === 'STAFF') {
      void socket.join('admin');
    }
    if (user?.role === 'DRIVER') {
      void socket.join('drivers');
    }

    socket.on('driver:location', (payload: { lat: number; lng: number; orderId?: string }) => {
      if (payload.orderId) {
        io?.to(`order:${payload.orderId}`).emit('tracking:update', {
          ...payload,
          at: new Date().toISOString(),
        });
      }
      io?.to('admin').emit('driver:location', {
        driverId: user?.sub,
        ...payload,
        at: new Date().toISOString(),
      });
    });

    socket.on('order:subscribe', (orderId: string) => {
      void socket.join(`order:${orderId}`);
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

export function emitOrderUpdate(
  orderId: string,
  payload: { userId?: string; [key: string]: unknown },
): void {
  io?.to(`order:${orderId}`).emit('order:update', payload);
  io?.to('admin').emit('order:update', payload);
  // Customer account/orders pages join `user:{id}` on connect — keep them in sync
  // when admin or driver changes status without an order:subscribe.
  if (payload.userId) {
    io?.to(`user:${payload.userId}`).emit('order:update', payload);
  }
}
