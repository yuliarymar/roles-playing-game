import { io } from 'socket.io-client';

// Простий спосіб - використовуйте тільки Render URL
const BACKEND_URL = 'https://roles-playing-game.onrender.com';

// Або якщо потрібно локальне тестування, використовуйте умовну логіку:
// const BACKEND_URL = window.location.hostname === 'localhost' 
//   ? 'http://localhost:3001'
//   : 'https://roles-playing-game.onrender.com';

console.log('Підключаюся до сервера:', BACKEND_URL);

const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  timeout: 20000
});

socket.on('connect', () => {
  console.log('✅ ПІДКЛЮЧЕНО ДО СЕРВЕРА!', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ ВІД\'ЄДНАНО ВІД СЕРВЕРА');
});

socket.on('connect_error', (err) => {
  console.error('❌ ПОМИЛКА ПІДКЛЮЧЕННЯ:', err.message);
});

export default socket;