const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

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

  // === СТВОРЕННЯ КІМНАТИ ===
  socket.on('create-room', ({ nickname, roleType }) => {
    const code = generateRoomCode();
    
    rooms.set(code, {
      hostId: socket.id,
      players: new Map(),
      phase: 'lobby',
      gameStarted: false,
      rolesAssigned: false,
      maxPlayers: 20
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
    
    console.log(`🆕 Кімната створена: ${code} господарем ${nickname}`);
  });

  // === ПРИЄДНАННЯ ДО КІМНАТИ ===
  socket.on('join-room', ({ code, nickname, roleType }) => {
    const room = rooms.get(code);
    
    if (!room) {
      socket.emit('error', 'Кімнату не знайдено');
      return;
    }

    if (room.gameStarted) {
      socket.emit('error', 'Гра вже почалася');
      return;
    }

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
    
    console.log(`🎮 ${nickname} приєднався до кімнати ${code}`);
  });

  // === РОЗПОДІЛ РОЛЕЙ ===
  socket.on('assign-roles', (code) => {
    const room = rooms.get(code);
    
    if (!room || socket.id !== room.hostId) {
      socket.emit('error', 'Тільки господар може роздавати ролі');
      return;
    }

    const players = Array.from(room.players.values());
    const activePlayers = players.filter(p => p.roleType === 'player');
    
    if (activePlayers.length < 3) {
      socket.emit('error', 'Потрібно мінімум 3 гравці для розподілу ролей');
      return;
    }

    // Перемішуємо ролі
    const shuffledRoles = [...ROLES].sort(() => Math.random() - 0.5);
    
    // Роздаємо ролі гравцям
    activePlayers.forEach((player, index) => {
      if (index < shuffledRoles.length) {
        player.role = shuffledRoles[index].name;
        
        // Надсилаємо роль гравцю з усіма даними
        io.to(player.socketId).emit('role-assigned', {
          role: player.role,
          emoji: shuffledRoles[index].emoji,
          image: shuffledRoles[index].image,
          description: shuffledRoles[index].description,
          fullDescription: shuffledRoles[index].fullDescription
        });
      }
    });

    // Спостерігачам даємо роль спостерігача
    players.filter(p => p.roleType === 'observer').forEach(observer => {
      observer.role = OBSERVER_ROLE.name;
      io.to(observer.socketId).emit('role-assigned', {
        role: OBSERVER_ROLE.name,
        emoji: OBSERVER_ROLE.emoji,
        image: OBSERVER_ROLE.image,
        description: OBSERVER_ROLE.description,
        fullDescription: OBSERVER_ROLE.fullDescription
      });
    });

    room.rolesAssigned = true;
    room.phase = 'waiting-for-start';
    
    io.to(code).emit('roles-distributed');
    io.to(code).emit('game-phase-changed', 'waiting-for-start');
    updateRoomPlayers(code);
    
    console.log(`🎭 Ролі розподілені в кімнаті ${code}`);
  });

  // === ПОЧАТОК ГРИ ===
  socket.on('start-game', (code) => {
    const room = rooms.get(code);
    
    if (!room || socket.id !== room.hostId) {
      socket.emit('error', 'Тільки господар може почати гру');
      return;
    }

    room.gameStarted = true;
    room.phase = 'discussion';
    
    io.to(code).emit('game-started');
    io.to(code).emit('game-phase-changed', 'discussion');
    
    console.log(`🚀 Гра розпочата в кімнаті ${code}`);
  });

  // === ЗМІНА ТИПУ ГРАВЦЯ ===
  socket.on('switch-player-type', ({ code, newType }) => {
    const room = rooms.get(code);
    
    if (room && room.players.has(socket.id)) {
      const player = room.players.get(socket.id);
      player.roleType = newType;
      player.role = null;
      
      socket.emit('player-type-changed', { type: newType });
      updateRoomPlayers(code);
    }
  });

  // === ОТРИМАННЯ ДАНИХ КІМНАТИ ===
  socket.on('get-room-data', (code) => {
    const room = rooms.get(code);
    
    if (room) {
      updateRoomPlayers(code);
      
      const player = room.players.get(socket.id);
      if (player && player.role) {
        const roleData = [...ROLES, OBSERVER_ROLE].find(r => r.name === player.role);
        if (roleData) {
          socket.emit('role-assigned', {
            role: player.role,
            emoji: roleData.emoji,
            image: roleData.image,
            description: roleData.description,
            fullDescription: roleData.fullDescription
          });
        }
      }
      
      socket.emit('game-phase-changed', room.phase);
    }
  });

  // === ВИХІД З КІМНАТИ ===
  socket.on('disconnect', () => {
    console.log('🔌 Користувач відключився:', socket.id);
    
    for (const [code, room] of rooms) {
      if (room.players.has(socket.id)) {
        const player = room.players.get(socket.id);
        room.players.delete(socket.id);
        
        if (room.players.size === 0) {
          rooms.delete(code);
          console.log(`🗑️ Кімната ${code} видалена (немає гравців)`);
        } else {
          if (player.isHost) {
            const newHost = Array.from(room.players.values())[0];
            newHost.isHost = true;
            room.hostId = newHost.id;
          }
          
          updateRoomPlayers(code);
        }
        break;
      }
    }
  });

  // === ФУНКЦІЯ ОНОВЛЕННЯ ГРАВЦІВ ===
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

  // === ГЕНЕРАЦІЯ КОДУ КІМНАТИ ===
  function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return rooms.has(code) ? generateRoomCode() : code;
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущено на порті ${PORT}`);
  console.log(`🎭 Доступно ролей: ${ROLES.length} основних + спостерігачі`);
});