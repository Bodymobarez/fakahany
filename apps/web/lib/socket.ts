import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from './session';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getCustomerSocket(): Socket {
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
  const token = getAccessToken();
  socket.auth = { token: token || undefined };
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectCustomerSocket() {
  if (socket?.connected) socket.disconnect();
}
