const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// === СТАТИЧНІ ФАЙЛИ ДЛЯ VERCEL ===
app.use(express.static(path.join(__dirname, 'dist')));

// === ОБОВ'ЯЗКОВО: обробка GET / (для Render та Vercel) ===
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Roles Playing Game Server</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
          .status { color: green; font-size: 24px; margin: 20px; }
        </style>
      </head>
      <body>
        <h1>🎮 Roles Playing Game Server</h1>
        <div class="status">✅ Сервер працює!</div>
        <p>Socket.IO сервер для ролевої гри "Конфлікт у школі"</p>
        <p>Порт: ${process.env.PORT || 3001}</p>
      </body>
    </html>
  `);
});

// === HEALTH CHECK ===
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    rooms: Array.from(rooms.keys()),
    activeConnections: io.engine.clientsCount
  });
});

// === SPA ROUTING FOR VERCEL ===
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path === '/health') {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Roles Playing Game</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
        </style>
      </head>
      <body>
        <h1>🎮 Roles Playing Game</h1>
        <p>Клієнтська частина повинна бути окремо розгорнута на Vercel</p>
        <p><a href="/">Перейти до сервера</a></p>
      </body>
    </html>
  `);
});

// HTTP сервер
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000", 
      "https://roles-playing-game.vercel.app",
      "https://roles-playing-game-git-main-yuliarymar.vercel.app",
      "https://roles-playing-game-*.vercel.app",
      "*" // Для тестування
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const rooms = new Map();

// ТАЙМЕРИ ГРИ
const GAME_DURATION = 30 * 60 * 1000; // 30 хвилин
const SPEECH_TIME = 2 * 60 * 1000;    // 2 хвилини

// === 10 ОСНОВНИХ РОЛЕЙ ===
const ROLES = [
  {
    name: 'Підліток-графітіст',
    emoji: '🎨',
    image: '🖌️',
    description: 'Ти — автор графіті. Малював із протесту проти "нудної школи". Творча, імпульсивна особистість.',
    fullDescription: 'Ти молодий художник, який через графіті хотів показати, що школа потребує змін. Ти креативний, емоційний, але іноді дієш необдумано. Твоє завдання — пояснити свої мотиви та знайти конструктивний вихід.'
  },
  {
    name: 'Друг підлітка',
    emoji: '👥',
    image: '🌟',
    description: 'Ти підтримував ідею, але не малював. Хочеш, щоб усі зрозуміли меседж молоді.',
    fullDescription: 'Ти розумієш, чому твій друг створив графіті, і підтримуєш його бажання змін. Але ти також розумієш, що є кращі способи висловити думку. Допоможи знайти баланс між творчістю та правилами.'
  },
  {
    name: 'Директор школи',
    emoji: '🏫',
    image: '👩‍🏫',
    description: 'Ти обурена - графіті псує репутацію школи. Хочеш дисципліни й відповідальності.',
    fullDescription: 'Ти відповідальна за школу та її репутацію. Графіті на фасаді — це порушення правил і неповага до спільноти. Але ти готова до компромісу, якщо будуть щирі вибачення та конструктивні пропозиції.'
  },
  {
    name: 'Вчитель мистецтв',
    emoji: '🎭',
    image: '🖼️',
    description: 'Ти підтримуєш самовираження учнів, але не схвалюєш вандалізм.',
    fullDescription: 'Як вчитель мистецтв, ти розумієш бажання учнів творити. Але мистецтво має бути легальним. Пропонуй створити "легальну стіну" для творчості та організувати майстер-класи.'
  },
  {
    name: 'Вчитель історії',
    emoji: '📚',
    image: '🏛️',
    description: 'Ти вважаєш, що історія вчить нас відповідальності за свої вчинки.',
    fullDescription: 'Історія показує, що протест може бути конструктивним. Допоможи знайти історичні приклади, коли мистецтво змінювало суспільство легальними шляхами.'
  },
  {
    name: 'Поліцейський',
    emoji: '👮',
    image: '🚔',
    description: 'Ти представляєш закон. Вимагаєш відповідальності за вчинок.',
    fullDescription: 'Закон чітко визначає, що пошкодження громадського майна — це правопорушення. Але ти готовий до співпраці, якщо сторона знайде мирне вирішення та відшкодує збитки.'
  },
  {
    name: 'Соціальний працівник',
    emoji: '💬',
    image: '🕊️',
    description: 'Ти модератор процесу. Допомагаєш знайти спільне рішення.',
    fullDescription: 'Твоє завдання — створити безпечний простір для діалогу. Допоможи всім сторонам почути одна одну. Нагадуй, що мета — не знайти винного, а знайти рішення, яке влаштує всіх.'
  },
  {
    name: 'Мер міста',
    emoji: '🏛️',
    image: '⭐',
    description: 'Ти відповідаєш за громадський порядок і розвиток молоді.',
    fullDescription: 'Ти маєш балансувати між збереженням порядку та підтримкою розвитку молоді. Шукай рішення, яке покаже, що місто слухає молодих, але також дотримується законів.'
  },
  {
    name: 'Батько підлітка',
    emoji: '👨‍👦',
    image: '🏠',
    description: 'Ти розчарований вчинком дитини, але хочеш їй допомогти.',
    fullDescription: 'Ти розумієш, що твоя дитина хотіла щось сказати, але обрала неправильний спосіб. Допоможи знайти конструктивний шлях для самовираження та відшкодувати шкоду.'
  },
  {
    name: 'Представник батьків',
    emoji: '👨‍👩‍👧',
    image: '💼',
    description: 'Ти представляєш інтереси батьківської спільноти.',
    fullDescription: 'Ти виступаєш від імені інших батьків, які стурбовані безпекою та вихованням дітей. Шукай рішення, яке задовольнить більшість батьків.'
  }
];

// === ЛИШЕ ОДИН OBSERVER_ROLE ===
const OBSERVER_ROLE = {
  name: 'Спостерігач',
  emoji: '👀',
  image: '📋',
  description: 'Ти спостерігаєш за процесом. Аналізуй аргументи та емоції.',
  fullDescription: 'Ти аналізуєш процес прийняття рішень, аргументи сторін, емоційні реакції. Можеш задавати питання та допомагати групі бачити процес збоку.'
};

io.on('connection', (socket) => {
  console.log('🔗 Користувач підключився:', socket.id);

  // === ПІНГ-ПОНГ ДЛЯ ПІДТРИМКИ З'ЄДНАННЯ ===
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  // === СТВОРЕННЯ КІМНАТИ ===
  socket.on('create-room', ({ nickname, roleType }) => {
    try {
      const code = generateRoomCode();
      
      rooms.set(code, {
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
        gameStartTime: null,
        timeRemaining: GAME_DURATION,
        createdAt: Date.now()
      });

      const room = rooms.get(code);
      room.players.set(socket.id, {
        id: socket.id,
        nickname: nickname || 'Гравець',
        roleType: roleType || 'player',
        role: null,
        isHost: true,
        socketId: socket.id,
        joinedAt: Date.now()
      });

      socket.join(code);
      socket.emit('room-created', { 
        code,
        message: 'Кімната успішно створена'
      });
      
      updateRoomPlayers(code);
      console.log(`🎮 Кімната створена: ${code} господарем ${nickname}`);
    } catch (error) {
      console.error('❌ Помилка створення кімнати:', error);
      socket.emit('error', 'Помилка створення кімнати');
    }
  });

  // === ПРИЄДНАННЯ ДО КІМНАТИ ===
  socket.on('join-room', ({ code, nickname, roleType }) => {
    try {
      const room = rooms.get(code);
      if (!room) {
        return socket.emit('error', 'Кімнату не знайдено');
      }
      
      if (room.gameStarted) {
        return socket.emit('error', 'Гра вже почалася');
      }

      if (room.players.size >= room.maxPlayers) {
        return socket.emit('error', 'Кімната заповнена');
      }

      // Перевірка унікальності нікнейма
      const existingNicknames = Array.from(room.players.values()).map(p => p.nickname);
      if (existingNicknames.includes(nickname)) {
        return socket.emit('error', 'Цей нікнейм вже використовується');
      }

      room.players.set(socket.id, {
        id: socket.id,
        nickname: nickname || 'Гравець',
        roleType: roleType || 'player',
        role: null,
        isHost: false,
        socketId: socket.id,
        joinedAt: Date.now()
      });

      socket.join(code);
      socket.emit('room-joined', { 
        code,
        isHost: false,
        players: Array.from(room.players.values()).map(p => ({
          id: p.id, nickname: p.nickname, roleType: p.roleType, role: p.role, isHost: p.isHost
        }))
      });

      // Сповістити всіх про нового гравця
      const joinMessage = {
        id: Date.now() + Math.random(),
        playerName: 'Система',
        message: `${nickname} приєднався до гри`,
        type: 'system',
        timestamp: new Date().toLocaleTimeString()
      };
      room.messages.push(joinMessage);
      io.to(code).emit('chat-message', joinMessage);

      updateRoomPlayers(code);
      console.log(`✅ ${nickname} приєднався до ${code}`);
    } catch (error) {
      console.error('❌ Помилка приєднання до кімнати:', error);
      socket.emit('error', 'Помилка приєднання до кімнати');
    }
  });

  // === ОТРИМАННЯ ІНФИ ПРО КІМНАТУ ===
  socket.on('get-room-info', (code) => {
    const room = rooms.get(code);
    if (!room) return socket.emit('error', 'Кімнату не знайдено');
    
    const player = room.players.get(socket.id);
    if (!player) return socket.emit('error', 'Ви не в цій кімнаті');

    socket.emit('room-info', {
      code,
      phase: room.phase,
      gameStarted: room.gameStarted,
      rolesAssigned: room.rolesAssigned,
      players: Array.from(room.players.values()).map(p => ({
        id: p.id, nickname: p.nickname, roleType: p.roleType, role: p.role, isHost: p.isHost
      })),
      messages: room.messages.slice(-50), // Останні 50 повідомлень
      queue: room.queue,
      currentSpeaker: room.currentSpeaker,
      timeRemaining: room.timeRemaining,
      isHost: player.isHost
    });
  });

  // === РОЗПОДІЛ РОЛЕЙ ===
  socket.on('assign-roles', (code) => {
    try {
      const room = rooms.get(code);
      if (!room || socket.id !== room.hostId) {
        return socket.emit('error', 'Тільки господар може розподіляти ролі');
      }

      if (room.rolesAssigned) {
        return socket.emit('error', 'Ролі вже розподілені');
      }

      const activePlayers = Array.from(room.players.values()).filter(p => p.roleType === 'player');
      if (activePlayers.length < 3) {
        return socket.emit('error', 'Мінімум 3 активних гравців для початку');
      }

      // Перемішуємо ролі
      const shuffledRoles = [...ROLES].sort(() => Math.random() - 0.5);
      
      // Розподіляємо ролі активним гравцям
      activePlayers.forEach((player, index) => {
        if (index < shuffledRoles.length) {
          const role = shuffledRoles[index];
          player.role = role.name;
          
          // Надсилаємо інформацію про роль гравцю
          io.to(player.socketId).emit('role-assigned', {
            role: role.name,
            emoji: role.emoji,
            image: role.image,
            description: role.description,
            fullDescription: role.fullDescription
          });
        }
      });

      // Спостерігачам даємо роль спостерігача
      room.players.forEach(player => {
        if (player.roleType === 'observer' && !player.role) {
          player.role = OBSERVER_ROLE.name;
          io.to(player.socketId).emit('role-assigned', OBSERVER_ROLE);
        }
      });

      room.rolesAssigned = true;
      room.phase = 'roles-assigned';

      // Сповіщаємо всіх
      io.to(code).emit('roles-distributed');
      io.to(code).emit('game-phase-changed', 'roles-assigned');
      
      const message = {
        id: Date.now() + Math.random(),
        playerName: 'Система',
        message: 'Ролі успішно розподілені!',
        type: 'system',
        timestamp: new Date().toLocaleTimeString()
      };
      room.messages.push(message);
      io.to(code).emit('chat-message', message);

      updateRoomPlayers(code);
      console.log(`🎭 Ролі розподілені в кімнаті ${code}`);
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
        return socket.emit('error', 'Тільки господар може почати гру');
      }

      if (!room.rolesAssigned) {
        return socket.emit('error', 'Спочатку розподіліть ролі');
      }

      if (room.gameStarted) {
        return socket.emit('error', 'Гра вже почалася');
      }

      room.gameStarted = true;
      room.phase = 'game-started';
      room.gameStartTime = Date.now();
      room.timeRemaining = GAME_DURATION;

      // Запускаємо таймер гри
      room.gameTimer = setInterval(() => {
        room.timeRemaining -= 1000;
        
        io.to(code).emit('game-time-update', {
          timeRemaining: room.timeRemaining,
          minutes: Math.floor(room.timeRemaining / 60000),
          seconds: Math.floor((room.timeRemaining % 60000) / 1000)
        });

        if (room.timeRemaining <= 0) {
          clearInterval(room.gameTimer);
          endGame(code);
        }
      }, 1000);

      // Сповіщаємо всіх про початок гри
      const startMessage = {
        id: Date.now() + Math.random(),
        playerName: 'Система',
        message: `Гра розпочалася! У вас ${GAME_DURATION/60000} хвилин.`,
        type: 'system',
        timestamp: new Date().toLocaleTimeString()
      };
      room.messages.push(startMessage);
      
      io.to(code).emit('game-started');
      io.to(code).emit('game-phase-changed', 'game-started');
      io.to(code).emit('chat-message', startMessage);
      
      console.log(`🎮 Гра розпочата в кімнаті ${code}`);
    } catch (error) {
      console.error('❌ Помилка запуску гри:', error);
      socket.emit('error', 'Помилка запуску гри');
    }
  });

  // === ЧЕРГА ТА ВИСТУПИ ===
  socket.on('join-queue', (code) => {
    try {
      const room = rooms.get(code);
      if (!room) return;
      
      const player = room.players.get(socket.id);
      if (!player) return;

      if (!room.queue) room.queue = [];
      
      // Перевіряємо, чи гравець вже в черзі
      if (!room.queue.some(p => p.id === player.id)) {
        room.queue.push({ 
          id: player.id, 
          nickname: player.nickname, 
          role: player.role, 
          socketId: socket.id 
        });
        
        io.to(code).emit('queue-updated', { 
          queue: room.queue, 
          currentSpeaker: room.currentSpeaker 
        });

        // Якщо це перший у черзі і ніхто не говорить - починаємо
        if (room.queue.length === 1 && !room.currentSpeaker) {
          startNextSpeaker(code);
        }

        const message = {
          id: Date.now() + Math.random(),
          playerName: 'Система',
          message: `${player.nickname} став(ла) в чергу на виступ`,
          type: 'system',
          timestamp: new Date().toLocaleTimeString()
        };
        room.messages.push(message);
        io.to(code).emit('chat-message', message);
      }
    } catch (error) {
      console.error('❌ Помилка додавання в чергу:', error);
    }
  });

  socket.on('leave-queue', (code) => {
    const room = rooms.get(code);
    if (!room || !room.queue) return;
    
    const player = room.players.get(socket.id);
    if (!player) return;

    room.queue = room.queue.filter(p => p.id !== socket.id);
    io.to(code).emit('queue-updated', { 
      queue: room.queue, 
      currentSpeaker: room.currentSpeaker 
    });

    if (player) {
      const message = {
        id: Date.now() + Math.random(),
        playerName: 'Система',
        message: `${player.nickname} покинув(ла) чергу`,
        type: 'system',
        timestamp: new Date().toLocaleTimeString()
      };
      room.messages.push(message);
      io.to(code).emit('chat-message', message);
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

  // === ЧАТ ===
  socket.on('send-message', ({ code, message }) => {
    try {
      const room = rooms.get(code);
      if (!room) return;
      
      if (!room.messages) room.messages = [];

      // Додаємо унікальний ID та timestamp
      if (!message.id) message.id = Date.now() + Math.random();
      if (!message.timestamp) message.timestamp = new Date().toLocaleTimeString();

      // Перевіряємо на дублікати
      if (room.messages.some(m => m.id === message.id)) return;

      room.messages.push(message);
      
      // Обмежуємо кількість повідомлень (останні 100)
      if (room.messages.length > 100) {
        room.messages = room.messages.slice(-100);
      }

      io.to(code).emit('chat-message', message);
    } catch (error) {
      console.error('❌ Помилка відправки повідомлення:', error);
    }
  });

  // === ВИХІД З КІМНАТИ ===
  socket.on('leave-room', (code) => {
    handleLeaveRoom(socket.id, code);
  });

  // === ВИХІД ===
  socket.on('disconnect', (reason) => {
    console.log('❌ Користувач відключився:', socket.id, reason);
    
    for (const [code, room] of rooms) {
      if (room.players.has(socket.id)) {
        handleLeaveRoom(socket.id, code);
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

    // Запускаємо таймер виступу
    room.speechTimer = setTimeout(() => {
      finishCurrentSpeaker(code);
    }, SPEECH_TIME);

    const message = {
      id: Date.now() + Math.random(),
      playerName: 'Система',
      message: `${speaker.nickname} почав(ла) виступ (2 хвилини)`,
      type: 'system',
      timestamp: new Date().toLocaleTimeString()
    };
    room.messages.push(message);
    
    io.to(code).emit('speaker-started', speaker);
    io.to(code).emit('queue-updated', { 
      queue: room.queue, 
      currentSpeaker: speaker 
    });
    io.to(code).emit('chat-message', message);
    io.to(code).emit('speech-time-started', { 
      duration: SPEECH_TIME,
      speaker: speaker.nickname
    });
    
    console.log(`🎤 ${speaker.nickname} почав виступ в ${code}`);
  }

  function finishCurrentSpeaker(code) {
    const room = rooms.get(code);
    if (!room || !room.currentSpeaker) return;

    const speaker = room.currentSpeaker;
    
    // Очищуємо таймер
    if (room.speechTimer) {
      clearTimeout(room.speechTimer);
      room.speechTimer = null;
    }

    // Видаляємо з черги
    if (room.queue) {
      room.queue = room.queue.filter(p => p.id !== speaker.id);
    }
    
    room.currentSpeaker = null;

    const message = {
      id: Date.now() + Math.random(),
      playerName: 'Система',
      message: `${speaker.nickname} завершив(ла) виступ`,
      type: 'system',
      timestamp: new Date().toLocaleTimeString()
    };
    room.messages.push(message);
    
    io.to(code).emit('speaker-finished', speaker);
    io.to(code).emit('queue-updated', { 
      queue: room.queue, 
      currentSpeaker: null 
    });
    io.to(code).emit('chat-message', message);
    io.to(code).emit('speech-time-ended');

    // Запускаємо наступного через 2 секунди
    if (room.queue?.length > 0) {
      setTimeout(() => startNextSpeaker(code), 2000);
    }
  }

  function endGame(code) {
    const room = rooms.get(code);
    if (!room) return;
    
    // Очищуємо всі таймери
    if (room.gameTimer) clearInterval(room.gameTimer);
    if (room.speechTimer) clearTimeout(room.speechTimer);

    const message = {
      id: Date.now() + Math.random(),
      playerName: 'Система',
      message: '⏰ Час гри вийшов! Гра завершена.',
      type: 'system',
      timestamp: new Date().toLocaleTimeString()
    };
    room.messages.push(message);
    
    io.to(code).emit('chat-message', message);
    io.to(code).emit('game-ended');
    
    // Скидаємо стан гри
    room.gameStarted = false;
    room.phase = 'lobby';
    room.queue = [];
    room.currentSpeaker = null;
    room.timeRemaining = GAME_DURATION;
    
    console.log(`🏁 Гра завершена в кімнаті ${code}`);
  }

  function handleLeaveRoom(socketId, code) {
    const room = rooms.get(code);
    if (!room) return;

    const player = room.players.get(socketId);
    if (!player) return;

    // Видаляємо з черги
    if (room.queue) {
      room.queue = room.queue.filter(p => p.id !== socketId);
    }
    
    // Якщо гравець був поточним спікером - завершуємо виступ
    if (room.currentSpeaker?.id === socketId) {
      finishCurrentSpeaker(code);
    }

    // Видаляємо гравця
    room.players.delete(socketId);

    const leaveMessage = {
      id: Date.now() + Math.random(),
      playerName: 'Система',
      message: `${player.nickname} покинув(ла) гру`,
      type: 'system',
      timestamp: new Date().toLocaleTimeString()
    };
    room.messages.push(leaveMessage);
    io.to(code).emit('chat-message', leaveMessage);

    // Якщо кімната порожня - видаляємо її
    if (room.players.size === 0) {
      if (room.gameTimer) clearInterval(room.gameTimer);
      if (room.speechTimer) clearTimeout(room.speechTimer);
      rooms.delete(code);
      console.log(`🗑️ Кімната ${code} видалена (порожня)`);
    } else {
      // Якщо вийшов господар - призначаємо нового
      if (player.isHost) {
        const newHost = Array.from(room.players.values())[0];
        newHost.isHost = true;
        room.hostId = newHost.id;
        
        const hostMessage = {
          id: Date.now() + Math.random(),
          playerName: 'Система',
          message: `${newHost.nickname} тепер господар кімнати`,
          type: 'system',
          timestamp: new Date().toLocaleTimeString()
        };
        room.messages.push(hostMessage);
        io.to(code).emit('chat-message', hostMessage);
      }
      
      updateRoomPlayers(code);
      io.to(code).emit('queue-updated', { 
        queue: room.queue || [], 
        currentSpeaker: room.currentSpeaker 
      });
    }
  }

  function updateRoomPlayers(code) {
    const room = rooms.get(code);
    if (!room) return;
    
    const playersData = Array.from(room.players.values()).map(p => ({
      id: p.id,
      nickname: p.nickname,
      roleType: p.roleType,
      role: p.role,
      isHost: p.isHost
    }));
    
    io.to(code).emit('players-updated', playersData);
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

// === ОЧИСТКА СТАРИХ КІМНАТ (ЩОГОДИНИ) ===
setInterval(() => {
  const now = Date.now();
  const HOUR = 60 * 60 * 1000;
  
  for (const [code, room] of rooms) {
    // Видаляємо кімнати, які неактивні більше 3 годин
    if (now - room.createdAt > 3 * HOUR) {
      if (room.gameTimer) clearInterval(room.gameTimer);
      if (room.speechTimer) clearTimeout(room.speechTimer);
      rooms.delete(code);
      console.log(`🧹 Очищено стару кімнату: ${code}`);
    }
  }
}, 60 * 60 * 1000); // Кожну годину

// === ЗАПУСК СЕРВЕРА ===
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 Сервер запущено на порті ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📍 https://roles-playing-game.onrender.com`);
  console.log(`✅ Готовий до роботи!`);
});

// === ОБРОБКА ПОМИЛОК ===
process.on('uncaughtException', (error) => {
  console.error('❌ Непередбачена помилка:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необроблена відмова:', reason);
});