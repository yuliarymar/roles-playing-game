import { io } from 'socket.io-client';

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    if (this.socket) return this.socket;

    const BACKEND_URL = import.meta.env.PROD 
      ? 'https://your-render-app.onrender.com'
      : 'http://localhost:3001';

    console.log('🔗 Підключення до сервера:', BACKEND_URL);

    this.socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('✅ ПІДКЛЮЧЕНО ДО СЕРВЕРА!', this.socket.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ ВІД\'ЄДНАНО ВІД СЕРВЕРА:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ ПОМИЛКА ПІДКЛЮЧЕННЯ:', error.message);
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 ПЕРЕПІДКЛЮЧЕННЯ: Спроба', attemptNumber);
      this.isConnected = true;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getSocket() {
    return this.socket;
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

export default new SocketManager();