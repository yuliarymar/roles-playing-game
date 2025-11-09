import { io } from 'socket.io-client';

// Автоматичний вибір URL
const BACKEND_URL = import.meta.env.DEV 
  ? 'http://localhost:3001'
  : 'https://roles-playing-game.onrender.com';

const socket = io(BACKEND_URL, {
  autoConnect: true,
  secure: true,  // ← ОБОВ'ЯЗКОВО ДЛЯ МОБІЛЬНИХ!
  transports: ['websocket', 'polling'],  // ← Підтримка старих браузерів
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

export default socket;