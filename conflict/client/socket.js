// conflict/client/src/socket.js
import { io } from 'socket.io-client';

// ВИДАЛИ import.meta.env.DEV — ВЕРЦЕЛЬ НЕ РОЗУМІЄ!
// ПІДКЛЮЧАЙСЯ ТІЛЬКИ ДО RENDER!

const BACKEND_URL = 'https://roles-playing-game.onrender.com'; // ← ТІЛЬКИ ЦЕ!

console.log('Connecting to:', BACKEND_URL);

const socket = io(BACKEND_URL, {
  secure: true,
  transports: ['websocket'], // ← ТІЛЬКИ WebSocket
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
  forceNew: true
});

socket.on('connect', () => console.log('SOCKET CONNECTED:', socket.id));
socket.on('connect_error', (err) => console.error('SOCKET ERROR:', err.message));

export default socket;