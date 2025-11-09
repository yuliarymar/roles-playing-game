// conflict/client/src/socket.js
import { io } from 'socket.io-client';

// АВТОМАТИЧНИЙ ВИБІР URL
const isDev = import.meta.env.DEV;
const BACKEND_URL = isDev 
  ? 'http://localhost:3001' 
  : 'https://roles-playing-game.onrender.com';

console.log('Connecting to:', BACKEND_URL); // ← ДЛЯ ДЕБАГУ

const socket = io(BACKEND_URL, {
  secure: !isDev,           // ← HTTPS тільки в продакшені
  transports: ['websocket'], // ← ТІЛЬКИ WebSocket (полінг ламає телефони)
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
  forceNew: true
});

// ДЕБАГ
socket.on('connect', () => {
  console.log('SOCKET CONNECTED:', socket.id);
});
socket.on('connect_error', (err) => {
  console.error('SOCKET ERROR:', err.message);
});
socket.on('disconnect', () => {
  console.log('SOCKET DISCONNECTED');
});

export default socket;