// client/src/socket.js
import { io } from 'socket.io-client';

const socket = io('https://roles-playing-game.onrender.com', {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

export default socket;