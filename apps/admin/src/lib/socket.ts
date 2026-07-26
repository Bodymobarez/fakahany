import { io, type Socket } from 'socket.io-client';
import { getAuthToken } from './api';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getAdminSocket(): Socket {
  if (typeof window === 'undefined') {
    throw new Error('Socket is browser-only');
  }
  if (!socket) {
    socket = io(baseURL, {
      path: '/socket.io',
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
  }
  const token = getAuthToken();
  socket.auth = { token: token || undefined };
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectAdminSocket() {
  if (socket?.connected) socket.disconnect();
}
