const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// === ОБОВ'ЯЗКОВО: обробка GET / (для Render) ===
app.get('/', (req, res) => {
  res.send('<h1>Roles Playing Game Server - OK!</h1>');
});

// HTTP сервер
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // Дозволяємо Vercel + localhost
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

// ТАЙМЕРИ ГРИ
const GAME_DURATION = 30 * 60 * 1000; // 30 хвилин
const SPEECH_TIME = 2 * 60 * 1000;    // 2 хвилини

// === 10 ОСНОВНИХ РОЛЕЙ ===
const ROLES = [
  {
    name: 'Підліток-графітіст',
    emoji: 'paintbrush',
    image: 'spray_can',
    description: 'Ти — автор графіті. Малював із протесту проти "нудної школи". Творча, імпульсивна особистість.',
    fullDescription: 'Ти молодий художник, який через графіті хотів показати, що школа потребує змін. Ти креативний, емоційний, але іноді дієш необдумано. Твоє завдання — пояснити свої мотиви та знайти конструктивний вихід.'
  },
  {
    name: 'Друг підлітка',
    emoji: 'two_people',
    image: 'glowing_star',
    description: 'Ти підтримував ідею, але не малював. Хочеш, щоб усі зрозуміли меседж молоді.',
    fullDescription: 'Ти розумієш, чому твій друг створив графіті, і підтримуєш його бажання змін. Але ти також розумієш, що є кращі способи висловити думку. Допоможи знайти баланс між творчістю та правилами.'
  },
  {
    name: 'Директор школи',
    emoji: 'school',
    image: 'female_teacher',
    description: 'Ти обурена - графіті псує репутацію школи. Хочеш дисципліни й відповідальності.',
    fullDescription: 'Ти відповідальна за школу та її репутацію. Графіті на фасаді — це порушення правил і неповага до спільноти. Але ти готова до компромісу, якщо будуть щирі вибачення та конструктивні пропозиції.'
  },
  {
    name: 'Вчитель мистецтв',
    emoji: 'performing_arts',
    image: 'framed_picture',
    description: 'Ти підтримуєш самовираження учнів, але не схвалюєш вандалізм.',
    fullDescription: 'Як вчитель мистецтв, ти розумієш бажання учнів творити. Але мистецтво має бути легальним. Пропонуй створити "легальну стіну" для творчості та організувати майстер-класи.'
  },
  {
    name: 'Вчитель історії',
    emoji: 'books',
    image: 'classical_building',
    description: 'Ти вважаєш, що історія вчить нас відповідальності за свої вчинки.',
    fullDescription: 'Історія показує, що протест може бути конструктивним. Допоможи знайти історичні приклади, коли мистецтво змінювало суспільство легальними шляхами.'
  },
  {
    name: 'Поліцейський',
    emoji: 'police_officer',
    image: 'police_car',
    description: 'Ти представляєш закон. Вимагаєш відповідальності за вчинок.',
    fullDescription: 'Закон чітко визначає, що пошкодження громадського майна — це правопорушення. Але ти готовий до співпраці, якщо сторона знайде мирне вирішення та відшкодує збитки.'
  },
  {
    name: 'Соціальний працівник',
    emoji: 'speech_balloon',
    image: 'dove',
    description: 'Ти модератор процесу. Допомагаєш знайти спільне рішення.',
    fullDescription: 'Твоє завдання — створити безпечний простір для діалогу. Допоможи всім сторонам почути одна одну. Нагадуй, що мета — не знайти винного, а знайти рішення, яке влаштує всіх.'
  },
  {
    name: 'Мер міста',
    emoji: 'cityscape',
    image: 'star',
    description: 'Ти відповідаєш за громадський порядок і розвиток молоді.',
    fullDescription: 'Ти маєш балансувати між збереженням порядку та підтримкою розвитку молоді. Шукай рішення, яке покаже, що місто слухає молодих, але також дотримується законів.'
  },
  {
    name: 'Батько підлітка',
    emoji: 'man_and_boy',
    image: 'house',
    description: 'Ти розчарований вчинком дитини, але хочеш їй допомогти.',
    fullDescription: 'Ти розумієш, що твоя дитина хотіла щось сказати, але обрала неправильний спосіб. Допоможи знайти конструктивний шлях для самовираження та відшкодувати шкоду.'
  },
  {
    name: 'Представник батьків',
    emoji: 'family',
    image: 'briefcase',
    description: 'Ти представляєш інтереси батьківської спільноти.',
    fullDescription: 'Ти виступаєш від імені інших батьків, які стурбовані безпекою та вихованням дітей. Шукай рішення, яке задовольнить більшість батьків.'
  }
];

const OBSERVER_ROLE = {
  name: 'Спостерігач',
  emoji: 'eyes',
  image: 'clipboard',
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
      gameStartTime: null,
      timeRemaining: GAME_DURATION
    });

    const room = rooms.get(code);
    room.players.set(socket.id, {
      id: socket.id,
      nickname,
      roleType,
      role: null,
      isHost: true,
      socketId: socket.id
    });

    socket.join(code);
    socket.emit('room-created', { code });
    console.log(`Кімната створена: ${code} господарем ${nickname}`);
  });

  // === ПРИЄДНАННЯ ДО КІМНАТИ ===
  socket.on('join-room', ({ code, nickname, roleType }) => {
    const room = rooms.get(code);
    if (!room) return socket.emit('error', 'Кімнату не знайдено');
    if (room.gameStarted) return socket.emit('error', 'Гра вже почалася');

    room.players.set(socket.id, {
      id: socket.id,
      nickname,
      roleType,
      role: null,
      isHost: false,
      socketId: socket.id
    });

    socket.join(code);
    socket.emit('room-joined', { code });
    updateRoomPlayers(code);
    console.log(`${nickname} приєднався до ${code}`);
  });

  // === РОЗПОДІЛ РОЛЕЙ ===
  socket.on('assign-roles', (code) => {
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) return socket.emit('error', 'Тільки господар');

    const activePlayers = Array.from(room.players.values()).filter(p => p.roleType === 'player');
    if (activePlayers.length < 3) return socket.emit('error', 'Мінімум 3 гравці');

    const shuffled = [...ROLES].sort(() => Math.random() - 0.5);
    activePlayers.forEach((p, i) => {
      if (i < shuffled.length) {
        p.role = shuffled[i].name;
        io.to(p.socketId).emit('role-assigned', {
          role: p.role,
          emoji: shuffled[i].emoji,
          image: shuffled[i].image,
          description: shuffled[i].description,
          fullDescription: shuffled[i].fullDescription
        });
      }
    });

    room.players.forEach(p => {
      if (p.roleType === 'observer') {
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

    room.gameStarted = true;
    room.phase = 'game-started';
    room.gameStartTime = Date.now();
    room.timeRemaining = GAME_DURATION;

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

    const msg = { id: Date.now(), playerName: 'Система', message: `Гра розпочалася!`, timestamp: new Date().toLocaleTimeString(), type: 'system' };
    room.messages.push(msg);
    io.to(code).emit('chat-message', msg);
    io.to(code).emit('game-started');
    io.to(code).emit('game-phase-changed', 'game-started');
  });

  // === ЧЕРГА ТА ВИСТУПИ ===
  socket.on('join-queue', (code) => {
    const room = rooms.get(code);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;

    if (!room.queue) room.queue = [];
    if (!room.queue.some(p => p.id === player.id)) {
      room.queue.push({ id: player.id, nickname: player.nickname, role: player.role, socketId: socket.id });
      io.to(code).emit('queue-updated', { queue: room.queue, currentSpeaker: room.currentSpeaker });
      if (room.queue.length === 1 && !room.currentSpeaker) startNextSpeaker(code);
    }
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
    if (!room) return;
    if (!room.messages) room.messages = [];

    if (!message.id) message.id = Date.now() + Math.random();
    if (room.messages.some(m => m.id === message.id)) return;

    room.messages.push(message);
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

        if (room.players.size === 0) {
          if (room.gameTimer) clearInterval(room.gameTimer);
          if (room.speechTimer) clearTimeout(room.speechTimer);
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

    const msg = { id: Date.now(), playerName: 'Система', message: `${speaker.nickname} почав(ла) виступ.`, type: 'system', timestamp: new Date().toLocaleTimeString() };
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
    if (room.speechTimer) { clearTimeout(room.speechTimer); room.speechTimer = null; }
    if (room.queue) room.queue = room.queue.filter(p => p.id !== speaker.id);
    room.currentSpeaker = null;

    const msg = { id: Date.now(), playerName: 'Система', message: `${speaker.nickname} завершив(ла) виступ.`, type: 'system', timestamp: new Date().toLocaleTimeString() };
    room.messages.push(msg);
    io.to(code).emit('speaker-finished', speaker);
    io.to(code).emit('queue-updated', { queue: room.queue, currentSpeaker: null });
    io.to(code).emit('chat-message', msg);
    io.to(code).emit('speech-time-ended');

    if (room.queue?.length > 0) setTimeout(() => startNextSpeaker(code), 2000);
  }

  function endGame(code) {
    const room = rooms.get(code);
    if (!room) return;
    if (room.gameTimer) clearInterval(room.gameTimer);
    if (room.speechTimer) clearTimeout(room.speechTimer);

    const msg = { id: Date.now(), playerName: 'Система', message: 'Час гри вийшов!', type: 'system', timestamp: new Date().toLocaleTimeString() };
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

// === ЗАПУСК НА RENDER (process.env.PORT) ===
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Сервер запущено на порті ${PORT}`);
  console.log(`https://roles-playing-game.onrender.com`);
});