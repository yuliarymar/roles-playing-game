// conflict/client/src/socket.js
import { io } from 'socket.io-client';

// ТІЛЬКИ RENDER! ЖОДНОГО localhost!
const BACKEND_URL = 'https://roles-playing-game.onrender.com';

console.log('Підключаюся до сервера:', BACKEND_URL);

const socket = io(BACKEND_URL, {
  secure: true,
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 10,
  timeout: 20000
});

socket.on('connect', () => console.log('ПІДКЛЮЧЕНО!', socket.id));
socket.on('connect_error', (err) => console.error('ПОМИЛКА:', err.message));

export default socket;