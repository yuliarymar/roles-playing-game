const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// === ГЛАВНАЯ СТРАНИЦА ===
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Roles Playing Game Server</title>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', sans-serif; margin: 40px; background: #f0f2f5; text-align: center; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          h1 { color: #2c3e50; }
          .status { color: #27ae60; font-weight: bold; font-size: 20px; margin: 15px 0; }
          .emoji { font-size: 60px; margin: 20px 0; }
          a { color: #3498db; text-decoration: none; font-weight: 500; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="emoji">Game Controller</div>
          <h1>Roles Playing Game Server</h1>
          <div class="status">Сервер працює!</div>
          <p>Socket.IO сервер для гри "Конфлікт у школі"</p>
          <p>Порт: <strong>${process.env.PORT || 3001}</strong></p>
          <p>
            <a href="/health">Health Check</a> • 
            <a href="https://roles-playing-game.vercel.app" target="_blank">Грати</a>
          </p>
        </div>
      </body>
    </html>
  `);
});

// === HEALTH CHECK (ВИПРАВЛЕНО!) ===
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    rooms: Array.from(rooms.keys()),
    activeConnections: io.sockets.sockets.size  // ВИПРАВЛЕНО!
  });
});

// === HTTP + SOCKET.IO ===
const server = http.createServer(app);
 const io = new Server(server, {
  cors: {
    origin: "*",           // ← ТІЛЬКИ *
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket'], // ← ТІЛЬКИ WebSocket
  pingTimeout: 60000,
  pingInterval: 25000
});

const rooms = new Map();

// === ТАЙМЕРИ ===
const GAME_DURATION = 30 * 60 * 1000;
const SPEECH_TIME = 2 * 60 * 1000;

// === РОЛІ З ЕМОДЖІ (як ти просив) ===
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
    emoji: '🏙️', 
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

// === СПОСТЕРЕГАЧ ===
const OBSERVER_ROLE = {
  name: 'Спостерігач',
  emoji: '👀',
  image: '📋',
  description: 'Ти спостерігаєш за процесом. Аналізуй аргументи та емоції.',
  fullDescription: 'Ти аналізуєш процес прийняття рішень, аргументи сторін, емоційні реакції. Можеш задавати питання та допомагати групі бачити процес збоку.'
};
io.on('connection', (socket) => {
  console.log('Користувач підключився:', socket.id);

  // === СТВОРЕННЯ КІМНАТИ ===
  socket.on('create-room', ({ nickname, roleType }) => {
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
      timeRemaining: GAME_DURATION,
      createdAt: Date.now()
    });

    const room = rooms.get(code);
    room.players.set(socket.id, {
      id: socket.id,
      nickname: (nickname || 'Гравець').trim(),
      roleType: roleType || 'player',
      role: null,
      isHost: true,
      socketId: socket.id
    });

    socket.join(code);
    socket.emit('room-created', { code });
    updateRoomPlayers(code);
  });

  // === ПРИЄДНАННЯ ===
  socket.on('join-room', ({ code, nickname, roleType }) => {
    const room = rooms.get(code);
    if (!room) return socket.emit('error', 'Кімнату не знайдено');
    if (room.gameStarted) return socket.emit('error', 'Гра вже почалася');
    if (room.players.size >= room.maxPlayers) return socket.emit('error', 'Кімната заповнена');

    const nick = (nickname || 'Гравець').trim();
    if (Array.from(room.players.values()).some(p => p.nickname === nick)) {
      return socket.emit('error', 'Нікнейм зайнятий');
    }

    room.players.set(socket.id, {
      id: socket.id,
      nickname: nick,
      roleType: roleType || 'player',
      role: null,
      isHost: false,
      socketId: socket.id
    });

    socket.join(code);
    socket.emit('room-joined', { code });

    const msg = { id: Date.now(), playerName: 'Система', message: `${nick} приєднався`, type: 'system', timestamp: new Date().toLocaleTimeString() };
    room.messages.push(msg);
    io.to(code).emit('chat-message', msg);
    updateRoomPlayers(code);
  });

  // === РОЗПОДІЛ РОЛЕЙ ===
  socket.on('assign-roles', (code) => {
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) return socket.emit('error', 'Тільки господар');
    if (room.rolesAssigned) return socket.emit('error', 'Ролі вже роздані');

    const players = Array.from(room.players.values()).filter(p => p.roleType === 'player');
    if (players.length < 3) return socket.emit('error', 'Мінімум 3 гравці');

    const shuffled = [...ROLES].sort(() => Math.random() - 0.5);
    players.forEach((p, i) => {
      if (i < shuffled.length) {
        p.role = shuffled[i].name;
        io.to(p.socketId).emit('role-assigned', shuffled[i]);
      }
    });

    room.players.forEach(p => {
      if (p.roleType === 'observer' && !p.role) {
        p.role = OBSERVER_ROLE.name;
        io.to(p.socketId).emit('role-assigned', OBSERVER_ROLE);
      }
    });

    room.rolesAssigned = true;
    room.phase = 'roles-assigned';
    io.to(code).emit('roles-distributed');
    io.to(code).emit('game-phase-changed', 'roles-assigned');
    updateRoomPlayers(code);
  });

  // === ПОЧАТОК ГРИ ===
  socket.on('start-game', (code) => {
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) return socket.emit('error', 'Тільки господар');
    if (!room.rolesAssigned) return socket.emit('error', 'Розподіліть ролі');

    room.gameStarted = true;
    room.phase = 'game-started';
    room.timeRemaining = GAME_DURATION;

    room.gameTimer = setInterval(() => {
      room.timeRemaining -= 1000;
      io.to(code).emit('game-time-update', {
        timeRemaining: room.timeRemaining,
        minutes: Math.floor(room.timeRemaining / 60000),
        seconds: Math.floor((room.timeRemaining % 60000) / 1000)
      });
      if (room.timeRemaining <= 0) endGame(code);
    }, 1000);

    const msg = { id: Date.now(), playerName: 'Система', message: 'Гра розпочалася!', type: 'system', timestamp: new Date().toLocaleTimeString() };
    room.messages.push(msg);
    io.to(code).emit('chat-message', msg);
    io.to(code).emit('game-started');
  });

  // === ЧЕРГА ===
  socket.on('join-queue', (code) => {
    const room = rooms.get(code);
    if (!room || !room.players.has(socket.id)) return;
    if (!room.queue) room.queue = [];
    const player = room.players.get(socket.id);
    if (room.queue.some(p => p.id === socket.id)) return;

    room.queue.push({ id: socket.id, nickname: player.nickname, role: player.role, socketId: socket.id });
    io.to(code).emit('queue-updated', { queue: room.queue, currentSpeaker: room.currentSpeaker });
    if (room.queue.length === 1 && !room.currentSpeaker) startNextSpeaker(code);
  });

  socket.on('leave-queue', (code) => {
    const room = rooms.get(code);
    if (!room || !room.queue) return;
    room.queue = room.queue.filter(p => p.id !== socket.id);
    io.to(code).emit('queue-updated', { queue: room.queue, currentSpeaker: room.currentSpeaker });
  });

  socket.on('finish-speaking', (code) => finishCurrentSpeaker(code));
  socket.on('next-speaker', (code) => {
    const room = rooms.get(code);
    if (room && room.players.get(socket.id)?.isHost) finishCurrentSpeaker(code);
  });

  // === ЧАТ ===
  socket.on('send-message', ({ code, message }) => {
    const room = rooms.get(code);
    if (!room || !room.messages) return;
    if (!message.id) message.id = Date.now() + Math.random();
    if (room.messages.some(m => m.id === message.id)) return;

    room.messages.push(message);
    if (room.messages.length > 100) room.messages = room.messages.slice(-100);
    io.to(code).emit('chat-message', message);
  });

  // === ВИХІД ===
  socket.on('disconnect', () => {
    for (const [code, room] of rooms) {
      if (room.players.has(socket.id)) {
        const player = room.players.get(socket.id);
        if (room.queue) room.queue = room.queue.filter(p => p.id !== socket.id);
        if (room.currentSpeaker?.id === socket.id) finishCurrentSpeaker(code);
        room.players.delete(socket.id);

        const msg = { id: Date.now(), playerName: 'Система', message: `${player.nickname} вийшов`, type: 'system', timestamp: new Date().toLocaleTimeString() };
        room.messages.push(msg);
        io.to(code).emit('chat-message', msg);

        if (room.players.size === 0) {
          clearInterval(room.gameTimer);
          clearTimeout(room.speechTimer);
          rooms.delete(code);
        } else {
          if (player.isHost) {
            const [newHost] = room.players.values();
            newHost.isHost = true;
            room.hostId = newHost.id;
          }
          updateRoomPlayers(code);
          io.to(code).emit('queue-updated', { queue: room.queue || [], currentSpeaker: room.currentSpeaker });
        }
        break;
      }
    }
  });

  // === ДОПОМІЖНІ ===
  function startNextSpeaker(code) {
    const room = rooms.get(code);
    if (!room || !room.queue?.length) return;
    const speaker = room.queue[0];
    room.currentSpeaker = speaker;
    room.speechTimer = setTimeout(() => finishCurrentSpeaker(code), SPEECH_TIME);

    const msg = { id: Date.now(), playerName: 'Система', message: `${speaker.nickname} говорить (2 хв)`, type: 'system', timestamp: new Date().toLocaleTimeString() };
    room.messages.push(msg);
    io.to(code).emit('speaker-started', speaker);
    io.to(code).emit('queue-updated', { queue: room.queue, currentSpeaker: speaker });
    io.to(code).emit('chat-message', msg);
    io.to(code).emit('speech-time-started', { duration: SPEECH_TIME });
  }

  function finishCurrentSpeaker(code) {
    const room = rooms.get(code);
    if (!room || !room.currentSpeaker) return;
    const speaker = room.currentSpeaker;
    clearTimeout(room.speechTimer);
    room.queue = room.queue.filter(p => p.id !== speaker.id);
    room.currentSpeaker = null;

    const msg = { id: Date.now(), playerName: 'Система', message: `${speaker.nickname} закінчив`, type: 'system', timestamp: new Date().toLocaleTimeString() };
    room.messages.push(msg);
    io.to(code).emit('speaker-finished', speaker);
    io.to(code).emit('queue-updated', { queue: room.queue, currentSpeaker: null });
    io.to(code).emit('chat-message', msg);
    io.to(code).emit('speech-time-ended');

    if (room.queue.length > 0) setTimeout(() => startNextSpeaker(code), 2000);
  }

  function endGame(code) {
    const room = rooms.get(code);
    if (!room) return;
    clearInterval(room.gameTimer);
    clearTimeout(room.speechTimer);

    const msg = { id: Date.now(), playerName: 'Система', message: 'Час вийшов!', type: 'system', timestamp: new Date().toLocaleTimeString() };
    room.messages.push(msg);
    io.to(code).emit('chat-message', msg);
    io.to(code).emit('game-ended');

    room.gameStarted = false;
    room.phase = 'lobby';
    room.queue = [];
    room.currentSpeaker = null;
  }

  function updateRoomPlayers(code) {
    const room = rooms.get(code);
    if (!room) return;
    const data = Array.from(room.players.values()).map(p => ({
      id: p.id, nickname: p.nickname, roleType: p.roleType, role: p.role, isHost: p.isHost
    }));
    io.to(code).emit('players-updated', data);
  }

  function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return rooms.has(code) ? generateRoomCode() : code;
  }
});

// === ОЧИЩЕННЯ СТАРИХ КІМНАТ ===
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > 3 * 60 * 60 * 1000) {
      clearInterval(room.gameTimer);
      clearTimeout(room.speechTimer);
      rooms.delete(code);
    }
  }
}, 60 * 60 * 1000);

// === ЗАПУСК (ВИПРАВЛЕНО!) ===
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {  // БЕЗ '0.0.0.0'!
  console.log(`Сервер запущено: https://roles-playing-game.onrender.com`);
  console.log(`Локально: http://localhost:${PORT}`);
});