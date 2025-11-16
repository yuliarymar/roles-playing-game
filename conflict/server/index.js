import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

// === ГЛАВНА СТОРІНКА ===
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Roles Playing Game Server</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            width: 100%;
            margin: 0 auto; 
            background: white; 
            padding: 40px 30px;
            border-radius: 20px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
          }
          h1 { 
            color: #2c3e50; 
            margin-bottom: 20px;
            font-size: 2.5rem;
          }
          .status { 
            color: #27ae60; 
            font-weight: bold; 
            font-size: 1.5rem; 
            margin: 20px 0;
            padding: 10px;
            background: #f8fff9;
            border-radius: 10px;
            border: 2px solid #27ae60;
          }
          .emoji { 
            font-size: 80px; 
            margin: 20px 0; 
          }
          .info { 
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: left;
          }
          .links {
            margin-top: 30px;
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
          }
          a { 
            color: white;
            background: #3498db;
            padding: 12px 25px;
            border-radius: 25px;
            text-decoration: none; 
            font-weight: 600;
            transition: all 0.3s ease;
            display: inline-block;
          }
          a:hover { 
            background: #2980b9;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
          }
          .stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
          }
          .stat-item {
            background: #e8f4fc;
            padding: 15px;
            border-radius: 10px;
            font-weight: 600;
          }
          @media (max-width: 480px) {
            .container { padding: 25px 20px; }
            h1 { font-size: 2rem; }
            .stats { grid-template-columns: 1fr; }
            .links { flex-direction: column; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="emoji">🎮</div>
          <h1>Roles Playing Game</h1>
          <div class="status">🚀 Сервер працює!</div>
          
          <div class="info">
            <p><strong>Socket.IO сервер для гри "Конфлікт у школі"</strong></p>
            <p>Мультиплеєрна рольова гра з системою черг, чатом та таймерами</p>
          </div>

          <div class="stats">
            <div class="stat-item">🌐 Порт: <strong>${process.env.PORT || 3001}</strong></div>
            <div class="stat-item">👥 Активні кімнати: <strong>${Array.from(rooms.keys()).length}</strong></div>
            <div class="stat-item">⚡ Версія: <strong>1.0.0</strong></div>
            <div class="stat-item">🔧 Статус: <strong>Online</strong></div>
          </div>

          <div class="links">
            <a href="/health" target="_blank">Health Check</a>
            <a href="https://roles-playing-game.vercel.app" target="_blank">🎮 Грати зараз</a>
            <a href="/api/rooms" target="_blank">📊 Статистика</a>
          </div>
        </div>
      </body>
    </html>
  `);
});

// === API МАРШРУТИ ===
app.get('/health', (req, res) => {
  const roomStats = Array.from(rooms.entries()).map(([code, room]) => ({
    code,
    players: room.players.size,
    gameStarted: room.gameStarted,
    phase: room.phase,
    createdAt: new Date(room.createdAt).toISOString()
  }));

  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    server: 'Roles Game Server',
    version: '1.0.0',
    uptime: process.uptime(),
    rooms: roomStats,
    totalRooms: rooms.size,
    totalPlayers: Array.from(rooms.values()).reduce((sum, room) => sum + room.players.size, 0),
    memory: process.memoryUsage()
  });
});

app.get('/api/rooms', (req, res) => {
  const roomsData = Array.from(rooms.entries()).map(([code, room]) => ({
    code,
    host: room.players.get(room.hostId)?.nickname || 'Unknown',
    players: Array.from(room.players.values()).map(p => ({
      nickname: p.nickname,
      role: p.role,
      roleType: p.roleType,
      isHost: p.isHost
    })),
    playerCount: room.players.size,
    gameStarted: room.gameStarted,
    phase: room.phase,
    queueLength: room.queue?.length || 0,
    currentSpeaker: room.currentSpeaker?.nickname,
    createdAt: new Date(room.createdAt).toLocaleString()
  }));

  res.json({
    success: true,
    data: roomsData,
    total: roomsData.length
  });
});

// === HTTP + SOCKET.IO СЕРВЕР ===
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 хвилини
    skipMiddlewares: true
  }
});

const rooms = new Map();

// === КОНФІГУРАЦІЯ ===
const GAME_DURATION = 30 * 60 * 1000; // 30 хвилин
const SPEECH_TIME = 2 * 60 * 1000;    // 2 хвилини
const HOUR = 60 * 60 * 1000;

// === СИСТЕМА РОЛЕЙ ===
const ROLES = [
  { 
    name: 'Підліток-графітіст', 
    emoji: '🎨', 
    image: '🖌️', 
    description: 'Ти — автор графіті. Малював із протесту проти "нудної школи".', 
    fullDescription: 'Ти молодий художник, який через графіті хотів показати, що школа потребує змін. Ти креативний, емоційний, але іноді дієш необдумано. Твоє завдання — пояснити свої мотиви та знайти конструктивний вихід.',
    color: '#e74c3c'
  },
  { 
    name: 'Друг підлітка', 
    emoji: '👥', 
    image: '🌟', 
    description: 'Ти підтримував ідею, але не малював. Хочеш, щоб усі зрозуміли меседж молоді.', 
    fullDescription: 'Ти розумієш, чому твій друг створив графіті, і підтримуєш його бажання змін. Але ти також розумієш, що є кращі способи висловити думку. Допоможи знайти баланс між творчістю та правилами.',
    color: '#3498db'
  },
  { 
    name: 'Директор школи', 
    emoji: '🏫', 
    image: '👩‍🏫', 
    description: 'Ти обурена - графіті псує репутацію школи. Хочеш дисципліни й відповідальності.', 
    fullDescription: 'Ти відповідальна за школу та її репутацію. Графіті на фасаді — це порушення правил і неповага до спільноти. Але ти готова до компромісу, якщо будуть щирі вибачення та конструктивні пропозиції.',
    color: '#9b59b6'
  },
  { 
    name: 'Вчитель мистецтв', 
    emoji: '🎭', 
    image: '🖼️', 
    description: 'Ти підтримуєш самовираження учнів, але не схвалюєш вандалізм.', 
    fullDescription: 'Як вчитель мистецтв, ти розумієш бажання учнів творити. Але мистецтво має бути легальним. Пропонуй створити "легальну стіну" для творчості та організувати майстер-класи.',
    color: '#e67e22'
  },
  { 
    name: 'Вчитель історії', 
    emoji: '📚', 
    image: '🏛️', 
    description: 'Ти вважаєш, що історія вчить нас відповідальності за свої вчинки.', 
    fullDescription: 'Історія показує, що протест може бути конструктивним. Допоможи знайти історичні приклади, коли мистецтво змінювало суспільство легальними шляхами.',
    color: '#34495e'
  },
  { 
    name: 'Поліцейський', 
    emoji: '👮', 
    image: '🚔', 
    description: 'Ти представляєш закон. Вимагаєш відповідальності за вчинок.', 
    fullDescription: 'Закон чітко визначає, що пошкодження громадського майна — це правопорушення. Але ти готовий до співпраці, якщо сторона знайде мирне вирішення та відшкодує збитки.',
    color: '#2c3e50'
  },
  { 
    name: 'Соціальний працівник', 
    emoji: '💬', 
    image: '🕊️', 
    description: 'Ти модератор процесу. Допомагаєш знайти спільне рішення.', 
    fullDescription: 'Твоє завдання — створити безпечний простір для діалогу. Допоможи всім сторонам почути одна одну. Нагадуй, що мета — не знайти винного, а знайти рішення, яке влаштує всіх.',
    color: '#1abc9c'
  },
  { 
    name: 'Мер міста', 
    emoji: '🏙️', 
    image: '⭐', 
    description: 'Ти відповідаєш за громадський порядок і розвиток молоді.', 
    fullDescription: 'Ти маєш балансувати між збереженням порядку та підтримкою розвитку молоді. Шукай рішення, яке покаже, що місто слухає молодих, але також дотримується законів.',
    color: '#f39c12'
  },
  { 
    name: 'Батько підлітка', 
    emoji: '👨‍👦', 
    image: '🏠', 
    description: 'Ти розчарований вчинком дитини, але хочеш їй допомогти.', 
    fullDescription: 'Ти розумієш, що твоя дитина хотіла щось сказати, але обрала неправильний спосіб. Допоможи знайти конструктивний шлях для самовираження та відшкодувати шкоду.',
    color: '#27ae60'
  },
  { 
    name: 'Представник батьків', 
    emoji: '👨‍👩‍👧', 
    image: '💼', 
    description: 'Ти представляєш інтереси батьківської спільноти.', 
    fullDescription: 'Ти виступаєш від імені інших батьків, які стурбовані безпекою та вихованням дітей. Шукай рішення, яке задовольнить більшість батьків.',
    color: '#8e44ad'
  }
];

const OBSERVER_ROLE = {
  name: 'Спостерігач',
  emoji: '👀',
  image: '📋',
  description: 'Ти спостерігаєш за процесом. Аналізуй аргументи та емоції.',
  fullDescription: 'Ти аналізуєш процес прийняття рішень, аргументи сторін, емоційні реакції. Можеш задавати питання та допомагати групі бачити процес збоку.',
  color: '#95a5a6'
};

// === SOCKET.IO ПІДКЛЮЧЕННЯ ===
io.on('connection', (socket) => {
  console.log('🔗 Користувач підключився:', socket.id);

  // === СТВОРЕННЯ КІМНАТИ ===
  socket.on('create-room', ({ nickname, roleType = 'player' }) => {
    try {
      const code = generateRoomCode();
      const roomData = {
        hostId: socket.id,
        players: new Map(),
        phase: 'lobby',
        gameStarted: false,
        rolesAssigned: false,
        maxPlayers: 20,
        messages: [],
        queue: [],
        currentSpeaker: null,
        speechTimer: null,
        gameTimer: null,
        timeRemaining: GAME_DURATION,
        createdAt: Date.now(),
        settings: {
          speechTime: SPEECH_TIME,
          gameTime: GAME_DURATION,
          allowObservers: true
        }
      };

      rooms.set(code, roomData);
      const room = rooms.get(code);

      room.players.set(socket.id, {
        id: socket.id,
        nickname: (nickname || 'Гравець').trim().substring(0, 20),
        roleType: roleType,
        role: null,
        isHost: true,
        socketId: socket.id,
        joinedAt: Date.now()
      });

      socket.join(code);
      socket.emit('room-created', { 
        code, 
        message: 'Кімната успішно створена!',
        isHost: true
      });

      const systemMsg = createSystemMessage(`${nickname} створив кімнату`);
      room.messages.push(systemMsg);
      io.to(code).emit('chat-message', systemMsg);
      
      updateRoomPlayers(code);
      console.log(`🆕 Створено кімнату ${code} гравцем ${nickname}`);
    } catch (error) {
      console.error('❌ Помилка створення кімнати:', error);
      socket.emit('error', 'Помилка створення кімнати');
    }
  });

  // === ПРИЄДНАННЯ ДО КІМНАТИ ===
  socket.on('join-room', ({ code, nickname, roleType = 'player' }) => {
    try {
      const room = rooms.get(code);
      if (!room) {
        return socket.emit('error', 'Кімнату не знайдено. Перевірте код.');
      }
      if (room.gameStarted) {
        return socket.emit('error', 'Гра вже почалася. Ви не можете приєднатися.');
      }
      if (room.players.size >= room.maxPlayers) {
        return socket.emit('error', 'Кімната заповнена. Максимум 20 гравців.');
      }

      const cleanNickname = (nickname || 'Гравець').trim().substring(0, 20);
      if (Array.from(room.players.values()).some(p => p.nickname === cleanNickname)) {
        return socket.emit('error', 'Цей нікнейм вже використовується в кімнаті.');
      }

      // Перевірка для спостерігачів
      if (roleType === 'observer' && !room.settings.allowObservers) {
        return socket.emit('error', 'Спостерігачі не дозволені в цій кімнаті.');
      }

      room.players.set(socket.id, {
        id: socket.id,
        nickname: cleanNickname,
        roleType: roleType,
        role: null,
        isHost: false,
        socketId: socket.id,
        joinedAt: Date.now()
      });

      socket.join(code);
      socket.emit('room-joined', { 
        code, 
        message: 'Ви успішно приєднались до кімнати!',
        isHost: false,
        hostName: room.players.get(room.hostId)?.nickname
      });

      const systemMsg = createSystemMessage(`${cleanNickname} приєднався до кімнати`);
      room.messages.push(systemMsg);
      io.to(code).emit('chat-message', systemMsg);
      
      updateRoomPlayers(code);
      console.log(`👤 ${cleanNickname} приєднався до кімнати ${code}`);
    } catch (error) {
      console.error('❌ Помилка приєднання до кімнати:', error);
      socket.emit('error', 'Помилка приєднання до кімнати');
    }
  });

  // === РОЗПОДІЛ РОЛЕЙ ===
  socket.on('assign-roles', (code) => {
    try {
      const room = rooms.get(code);
      if (!room || socket.id !== room.hostId) {
        return socket.emit('error', 'Тільки господар кімнати може розподіляти ролі.');
      }
      if (room.rolesAssigned) {
        return socket.emit('error', 'Ролі вже розподілені.');
      }

      const players = Array.from(room.players.values()).filter(p => p.roleType === 'player');
      if (players.length < 3) {
        return socket.emit('error', 'Для початку гри потрібно мінімум 3 гравці.');
      }

      // Перемішуємо ролі
      const shuffledRoles = [...ROLES].sort(() => Math.random() - 0.5);
      
      // Роздаємо ролі гравцям
      players.forEach((player, index) => {
        if (index < shuffledRoles.length) {
          player.role = shuffledRoles[index].name;
          const roleData = shuffledRoles[index];
          io.to(player.socketId).emit('role-assigned', roleData);
          console.log(`🎭 Гравець ${player.nickname} отримав роль: ${roleData.name}`);
        }
      });

      // Ролі для спостерігачів
      room.players.forEach(player => {
        if (player.roleType === 'observer' && !player.role) {
          player.role = OBSERVER_ROLE.name;
          io.to(player.socketId).emit('role-assigned', OBSERVER_ROLE);
        }
      });

      room.rolesAssigned = true;
      room.phase = 'roles-assigned';

      const systemMsg = createSystemMessage('Ролі успішно розподілені!');
      room.messages.push(systemMsg);
      io.to(code).emit('chat-message', systemMsg);
      
      io.to(code).emit('roles-distributed');
      io.to(code).emit('game-phase-changed', 'roles-assigned');
      updateRoomPlayers(code);

      console.log(`✅ Ролі розподілені в кімнаті ${code}`);
    } catch (error) {
      console.error('❌ Помилка розподілу ролей:', error);
      socket.emit('error', 'Помилка розподілу ролей');
    }
  });

  // === ПОЧАТОК ГРИ ===
  socket.on('start-game', (code) => {
    try {
      const room = rooms.get(code);
      if (!room || socket.id !== room.hostId) {
        return socket.emit('error', 'Тільки господар кімнати може почати гру.');
      }
      if (!room.rolesAssigned) {
        return socket.emit('error', 'Спочатку розподіліть ролі.');
      }

      room.gameStarted = true;
      room.phase = 'game-started';
      room.timeRemaining = GAME_DURATION;

      // Запускаємо таймер гри
      room.gameTimer = setInterval(() => {
        room.timeRemaining -= 1000;
        const timeData = {
          timeRemaining: room.timeRemaining,
          minutes: Math.floor(room.timeRemaining / 60000),
          seconds: Math.floor((room.timeRemaining % 60000) / 1000),
          percentage: (room.timeRemaining / GAME_DURATION) * 100
        };
        
        io.to(code).emit('game-time-update', timeData);
        
        if (room.timeRemaining <= 0) {
          endGame(code);
        }
      }, 1000);

      const systemMsg = createSystemMessage('🎮 Гра розпочалася! У вас 30 хвилин.');
      room.messages.push(systemMsg);
      io.to(code).emit('chat-message', systemMsg);
      
      io.to(code).emit('game-started', {
        duration: GAME_DURATION,
        speechTime: SPEECH_TIME
      });

      console.log(`🎮 Гра розпочата в кімнаті ${code}`);
    } catch (error) {
      console.error('❌ Помилка запуску гри:', error);
      socket.emit('error', 'Помилка запуску гри');
    }
  });

  // === СИСТЕМА ЧЕРГИ ===
  socket.on('join-queue', (code) => {
    try {
      const room = rooms.get(code);
      if (!room || !room.players.has(socket.id)) return;
      
      if (!room.queue) room.queue = [];
      const player = room.players.get(socket.id);
      
      // Перевіряємо, чи гравець вже в черзі
      if (room.queue.some(p => p.id === socket.id)) {
        return socket.emit('error', 'Ви вже в черзі на говоріння.');
      }

      room.queue.push({ 
        id: socket.id, 
        nickname: player.nickname, 
        role: player.role,
        socketId: socket.id,
        joinedAt: Date.now()
      });

      const systemMsg = createSystemMessage(`${player.nickname} став в чергу на говоріння`);
      room.messages.push(systemMsg);
      io.to(code).emit('chat-message', systemMsg);

      io.to(code).emit('queue-updated', { 
        queue: room.queue, 
        currentSpeaker: room.currentSpeaker 
      });

      // Якщо черга була пуста, запускаємо наступного промовця
      if (room.queue.length === 1 && !room.currentSpeaker) {
        startNextSpeaker(code);
      }

      console.log(`📢 ${player.nickname} став в чергу в кімнаті ${code}`);
    } catch (error) {
      console.error('❌ Помилка додавання в чергу:', error);
      socket.emit('error', 'Помилка додавання в чергу');
    }
  });

  socket.on('leave-queue', (code) => {
    try {
      const room = rooms.get(code);
      if (!room || !room.queue) return;
      
      const player = room.players.get(socket.id);
      room.queue = room.queue.filter(p => p.id !== socket.id);

      if (player) {
        const systemMsg = createSystemMessage(`${player.nickname} покинув чергу`);
        room.messages.push(systemMsg);
        io.to(code).emit('chat-message', systemMsg);
      }

      io.to(code).emit('queue-updated', { 
        queue: room.queue, 
        currentSpeaker: room.currentSpeaker 
      });

      console.log(`📢 Гравець покинув чергу в кімнаті ${code}`);
    } catch (error) {
      console.error('❌ Помилка виходу з черги:', error);
    }
  });

  socket.on('finish-speaking', (code) => {
    finishCurrentSpeaker(code);
  });

  socket.on('next-speaker', (code) => {
    const room = rooms.get(code);
    if (room && room.players.get(socket.id)?.isHost) {
      finishCurrentSpeaker(code);
    }
  });

  // === СИСТЕМА ЧАТУ ===
  socket.on('send-message', ({ code, message }) => {
    try {
      const room = rooms.get(code);
      if (!room || !room.messages) return;

      // Валідація повідомлення
      if (!message.id) message.id = Date.now() + Math.random();
      if (room.messages.some(m => m.id === message.id)) return;

      // Обмеження довжини повідомлення
      if (message.message && message.message.length > 500) {
        message.message = message.message.substring(0, 500) + '...';
      }

      room.messages.push(message);
      
      // Обмеження кількості повідомлень в історії
      if (room.messages.length > 200) {
        room.messages = room.messages.slice(-100);
      }

      io.to(code).emit('chat-message', message);
    } catch (error) {
      console.error('❌ Помилка відправки повідомлення:', error);
    }
  });

  // === ОНОВЛЕННЯ НАЛАШТУВАНЬ ===
  socket.on('update-settings', ({ code, settings }) => {
    try {
      const room = rooms.get(code);
      if (!room || socket.id !== room.hostId) {
        return socket.emit('error', 'Тільки господар може змінювати налаштування.');
      }

      Object.assign(room.settings, settings);
      io.to(code).emit('settings-updated', room.settings);
      
      const systemMsg = createSystemMessage('Налаштування кімнати оновлені');
      room.messages.push(systemMsg);
      io.to(code).emit('chat-message', systemMsg);
    } catch (error) {
      console.error('❌ Помилка оновлення налаштувань:', error);
      socket.emit('error', 'Помилка оновлення налаштувань');
    }
  });

  // === ВИХІД З КІМНАТИ ===
  socket.on('leave-room', (code) => {
    handlePlayerLeave(socket.id, code);
  });

  // === ВІД'ЄДНАННЯ ===
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Користувач від'єднався: ${socket.id}, причина: ${reason}`);
    
    for (const [code, room] of rooms) {
      if (room.players.has(socket.id)) {
        handlePlayerLeave(socket.id, code);
        break;
      }
    }
  });

  // === ДОПОМІЖНІ ФУНКЦІЇ ===
  function startNextSpeaker(code) {
    const room = rooms.get(code);
    if (!room || !room.queue?.length) return;

    const speaker = room.queue[0];
    room.currentSpeaker = speaker;

    // Запускаємо таймер промовця
    room.speechTimer = setTimeout(() => {
      finishCurrentSpeaker(code);
    }, room.settings.speechTime);

    const systemMsg = createSystemMessage(
      `${speaker.nickname} починає говорити (${room.settings.speechTime / 60000} хв)`
    );
    room.messages.push(systemMsg);
    
    io.to(code).emit('speaker-started', speaker);
    io.to(code).emit('queue-updated', { 
      queue: room.queue, 
      currentSpeaker: speaker 
    });
    io.to(code).emit('chat-message', systemMsg);
    io.to(code).emit('speech-time-started', { 
      duration: room.settings.speechTime,
      speaker: speaker.nickname
    });

    console.log(`🎤 ${speaker.nickname} почав говорити в кімнаті ${code}`);
  }

  function finishCurrentSpeaker(code) {
    const room = rooms.get(code);
    if (!room || !room.currentSpeaker) return;

    const speaker = room.currentSpeaker;
    clearTimeout(room.speechTimer);
    room.queue = room.queue.filter(p => p.id !== speaker.id);
    room.currentSpeaker = null;

    const systemMsg = createSystemMessage(`${speaker.nickname} закінчив виступ`);
    room.messages.push(systemMsg);
    
    io.to(code).emit('speaker-finished', speaker);
    io.to(code).emit('queue-updated', { 
      queue: room.queue, 
      currentSpeaker: null 
    });
    io.to(code).emit('chat-message', systemMsg);
    io.to(code).emit('speech-time-ended');

    // Запускаємо наступного промовця через 2 секунди
    if (room.queue.length > 0) {
      setTimeout(() => startNextSpeaker(code), 2000);
    }

    console.log(`🎤 ${speaker.nickname} закінчив говорити в кімнаті ${code}`);
  }

  function endGame(code) {
    const room = rooms.get(code);
    if (!room) return;

    clearInterval(room.gameTimer);
    clearTimeout(room.speechTimer);

    const systemMsg = createSystemMessage('⏰ Час вийшов! Гра завершена.');
    room.messages.push(systemMsg);
    io.to(code).emit('chat-message', systemMsg);
    io.to(code).emit('game-ended');

    // Скидаємо стан гри
    room.gameStarted = false;
    room.phase = 'lobby';
    room.queue = [];
    room.currentSpeaker = null;
    room.rolesAssigned = false;

    console.log(`🏁 Гра завершена в кімнаті ${code}`);
  }

  function handlePlayerLeave(socketId, code) {
    const room = rooms.get(code);
    if (!room || !room.players.has(socketId)) return;

    const player = room.players.get(socketId);
    
    // Видаляємо з черги
    if (room.queue) {
      room.queue = room.queue.filter(p => p.id !== socketId);
    }
    
    // Якщо гравець був поточним промовцем, завершуємо його виступ
    if (room.currentSpeaker?.id === socketId) {
      finishCurrentSpeaker(code);
    }

    room.players.delete(socketId);

    const systemMsg = createSystemMessage(`${player.nickname} покинув кімнату`);
    room.messages.push(systemMsg);
    io.to(code).emit('chat-message', systemMsg);

    // Якщо кімната порожня, видаляємо її
    if (room.players.size === 0) {
      clearInterval(room.gameTimer);
      clearTimeout(room.speechTimer);
      rooms.delete(code);
      console.log(`🗑️ Кімната ${code} видалена (немає гравців)`);
    } else {
      // Якщо вийшов господар, призначаємо нового
      if (player.isHost) {
        const newHost = Array.from(room.players.values())[0];
        newHost.isHost = true;
        room.hostId = newHost.id;
        
        const hostMsg = createSystemMessage(`${newHost.nickname} тепер господар кімнати`);
        room.messages.push(hostMsg);
        io.to(code).emit('chat-message', hostMsg);
      }
      
      updateRoomPlayers(code);
      io.to(code).emit('queue-updated', { 
        queue: room.queue || [], 
        currentSpeaker: room.currentSpeaker 
      });
    }

    console.log(`👋 ${player.nickname} покинув кімнату ${code}`);
  }

  function updateRoomPlayers(code) {
    const room = rooms.get(code);
    if (!room) return;
    
    const playersData = Array.from(room.players.values()).map(p => ({
      id: p.id,
      nickname: p.nickname,
      roleType: p.roleType,
      role: p.role,
      isHost: p.isHost,
      joinedAt: p.joinedAt
    }));
    
    io.to(code).emit('players-updated', playersData);
  }

  function createSystemMessage(message) {
    return {
      id: Date.now() + Math.random(),
      playerName: 'Система',
      message: message,
      type: 'system',
      timestamp: new Date().toLocaleTimeString(),
      system: true
    };
  }

  function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return rooms.has(code) ? generateRoomCode() : code;
  }
});

// === ОЧИЩЕННЯ СТАРИХ КІМНАТ ===
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [code, room] of rooms) {
    // Видаляємо кімнати, які існують більше 6 годин
    if (now - room.createdAt > 6 * HOUR) {
      clearInterval(room.gameTimer);
      clearTimeout(room.speechTimer);
      rooms.delete(code);
      cleanedCount++;
      console.log(`🧹 Очищено стару кімнату: ${code}`);
    }
  }

  if (cleanedCount > 0) {
    console.log(`🧹 Очищено ${cleanedCount} старих кімнат`);
  }
}, HOUR);

// === ОБРОБКА ПОМИЛОК ПРОЦЕСУ ===
process.on('uncaughtException', (error) => {
  console.error('💥 Неперехоплена помилка:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Неперехоплена відмова:', reason);
});

// === ЗАПУСК СЕРВЕРА ===
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🎮 ROLES PLAYING GAME SERVER');
  console.log('='.repeat(50));
  console.log(`📍 Сервер запущено на порті: ${PORT}`);
  console.log(`🌐 Локальний URL: http://localhost:${PORT}`);
  console.log(`🔧 Режим: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ Версія: 1.0.0`);
  console.log('='.repeat(50) + '\n');
});

export default server;