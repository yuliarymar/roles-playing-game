// conflict/client/src/socket.js
import { io } from 'socket.io-client';

// ТІЛЬКИ RENDER! ЛОКАЛХОСТ — ВБИВАЄ ГРУ!
const BACKEND_URL = 'https://roles-playing-game.onrender.com';

console.log('SOCKET: Connecting to Render →', BACKEND_URL);

const socket = io(BACKEND_URL, {
  secure: true,
  transports: ['websocket'], // ТІЛЬКИ WebSocket
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
  forceNew: true
});

// ДЕБАГ
socket.on('connect', () => {
  console.log('SOCKET CONNECTED! ID:', socket.id);
});
socket.on('connect_error', (err) => {
  console.error('SOCKET ERROR:', err.message);
});
socket.on('disconnect', () => {
  console.log('SOCKET DISCONNECTED');
});

export default socket;