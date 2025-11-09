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

// ТАЙМЕРИ ГРИ
const GAME_DURATION = 30 * 60 * 1000; // 30 хвилин
const SPEECH_TIME = 2 * 60 * 1000; // 2 хвилини

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
    room.phase = 'roles-assigned';
    
    io.to(code).emit('roles-distributed');
    io.to(code).emit('game-phase-changed', 'roles-assigned');
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
    room.phase = 'game-started';
    room.gameStartTime = Date.now();
    room.timeRemaining = GAME_DURATION;
    
    // Запускаємо таймер гри
    room.gameTimer = setInterval(() => {
      room.timeRemaining -= 1000;
      
      // Надсилаємо оновлений час всім гравцям
      io.to(code).emit('game-time-update', {
        timeRemaining: room.timeRemaining,
        minutes: Math.floor(room.timeRemaining / 60000),
        seconds: Math.floor((room.timeRemaining % 60000) / 1000)
      });
      
      // Перевіряємо чи час вийшов
      if (room.timeRemaining <= 0) {
        clearInterval(room.gameTimer);
        endGame(code);
      }
    }, 1000);
    
    // Додаємо системне повідомлення про початок гри
    const systemMessage = {
      id: Date.now(),
      playerName: 'Система',
      message: `Гра розпочалася! У вас ${GAME_DURATION/60000} хвилин для обговорення. Представтесь та почніть обговорення.`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'system'
    };
    
    if (!room.messages) {
      room.messages = [];
    }
    room.messages.push(systemMessage);
    
    // Надсилаємо системне повідомлення всім
    io.to(code).emit('chat-message', systemMessage);
    
    io.to(code).emit('game-started');
    io.to(code).emit('game-phase-changed', 'game-started');
    io.to(code).emit('game-time-update', {
      timeRemaining: room.timeRemaining,
      minutes: Math.floor(room.timeRemaining / 60000),
      seconds: Math.floor((room.timeRemaining % 60000) / 1000)
    });
    
    console.log(`🚀 Гра розпочата в кімнаті ${code}`);
  });

  // === СИСТЕМА ЧЕРГИ ТА ВИСТУПІВ ===
  
  // Підняття руки
  socket.on('raise-hand', (code) => {
    const room = rooms.get(code);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    console.log(`✋ ${player.nickname} підняв(ла) руку в кімнаті ${code}`);
    
    // Надсилаємо всім про підняття руки
    io.to(code).emit('hand-raised', {
      id: player.id,
      nickname: player.nickname,
      role: player.role
    });
  });

  // Опускання руки
  socket.on('lower-hand', (code) => {
    const room = rooms.get(code);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    console.log(`👇 ${player.nickname} опустив(ла) руку в кімнаті ${code}`);
    
    io.to(code).emit('hand-lowered', {
      id: player.id,
      nickname: player.nickname,
      role: player.role
    });
  });

  // Вхід до черги
  socket.on('join-queue', (code) => {
    const room = rooms.get(code);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    // Ініціалізуємо чергу якщо її немає
    if (!room.queue) {
      room.queue = [];
    }

    // Перевіряємо чи гравець вже в черзі
    if (!room.queue.some(p => p.id === player.id)) {
      room.queue.push({
        id: player.id,
        nickname: player.nickname,
        role: player.role,
        socketId: socket.id
      });

      console.log(`📋 ${player.nickname} увійшов(ла) до черги в кімнаті ${code}`);
      
      // Оновлюємо чергу для всіх
      io.to(code).emit('queue-updated', {
        queue: room.queue,
        currentSpeaker: room.currentSpeaker
      });

      // Якщо це перший в черзі і ніхто не говорить - автоматично починаємо
      if (room.queue.length === 1 && !room.currentSpeaker) {
        startNextSpeaker(code);
      }
    }
  });

  // Вихід з черги
  socket.on('leave-queue', (code) => {
    const room = rooms.get(code);
    if (!room || !room.queue) return;

    const playerIndex = room.queue.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      const player = room.queue[playerIndex];
      room.queue.splice(playerIndex, 1);
      
      console.log(`🚪 ${player.nickname} вийшов(ла) з черги в кімнаті ${code}`);
      
      io.to(code).emit('queue-updated', {
        queue: room.queue,
        currentSpeaker: room.currentSpeaker
      });
    }
  });

  // Завершення виступу
  socket.on('finish-speaking', (code) => {
    finishCurrentSpeaker(code);
  });

  // Наступний промовець (для хоста)
  socket.on('next-speaker', (code) => {
    const room = rooms.get(code);
    if (!room) return;

    // Перевіряємо чи хост
    const player = room.players.get(socket.id);
    if (!player || !player.isHost) return;

    finishCurrentSpeaker(code);
  });

  // Видалення з черги (для хоста)
  socket.on('remove-from-queue', ({ code, playerId }) => {
    const room = rooms.get(code);
    if (!room || !room.queue) return;

    // Перевіряємо чи хост
    const player = room.players.get(socket.id);
    if (!player || !player.isHost) return;

    const playerIndex = room.queue.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      const removedPlayer = room.queue[playerIndex];
      room.queue.splice(playerIndex, 1);
      
      console.log(`🗑️ Хост видалив ${removedPlayer.nickname} з черги`);
      
      io.to(code).emit('queue-updated', {
        queue: room.queue,
        currentSpeaker: room.currentSpeaker
      });
    }
  });

  // === ОБРОБНИКИ ЧАТУ ===
  socket.on('send-message', ({ code, message }) => {
    console.log(`📤 Отримано повідомлення для кімнати ${code}:`, message);
    
    const room = rooms.get(code);
    if (!room) {
      console.log('❌ Кімнату не знайдено:', code);
      return;
    }

    if (!room.messages) {
      room.messages = [];
    }

    // Перевіряємо, чи таке повідомлення вже існує
    const isDuplicate = room.messages.some(msg => msg.id === message.id);
    if (isDuplicate) {
      console.log('⚠️ Пропускаємо дубль повідомлення');
      return;
    }

    // Додаємо ID якщо його немає
    if (!message.id) {
      message.id = Date.now() + Math.random();
    }

    // Зберігаємо повідомлення в кімнаті
    room.messages.push(message);
    console.log(`💬 Збережено повідомлення в кімнаті ${code}. Всього повідомлень: ${room.messages.length}`);
    
    // Надсилаємо всім в кімнаті (включаючи відправника)
    io.to(code).emit('chat-message', message);
    console.log(`📨 Надіслано повідомлення всім у кімнаті ${code}: ${message.playerName}: ${message.message}`);
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
      
      // Відправляємо історію чату (фільтруємо дублікати)
      const chatHistory = room.messages || [];
      const uniqueMessages = chatHistory.filter((msg, index, self) => 
        index === self.findIndex(m => m.id === msg.id)
      );
      
      console.log(`📜 Відправляємо історію чату для ${code}:`, uniqueMessages.length, 'повідомлень');
      socket.emit('chat-history', uniqueMessages);
      
      // Відправляємо стан черги
      socket.emit('queue-updated', {
        queue: room.queue || [],
        currentSpeaker: room.currentSpeaker
      });
      
      // Відправляємо час гри
      if (room.gameStarted) {
        socket.emit('game-time-update', {
          timeRemaining: room.timeRemaining,
          minutes: Math.floor(room.timeRemaining / 60000),
          seconds: Math.floor((room.timeRemaining % 60000) / 1000)
        });
      }
      
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
        
        // Видаляємо гравця з черги
        if (room.queue) {
          room.queue = room.queue.filter(p => p.id !== socket.id);
        }
        
        // Якщо гравець був поточним промовцем - завершуємо його виступ
        if (room.currentSpeaker && room.currentSpeaker.id === socket.id) {
          finishCurrentSpeaker(code);
        }
        
        room.players.delete(socket.id);
        
        if (room.players.size === 0) {
          // Очищаємо таймери
          if (room.gameTimer) clearInterval(room.gameTimer);
          if (room.speechTimer) clearTimeout(room.speechTimer);
          rooms.delete(code);
          console.log(`🗑️ Кімната ${code} видалена (немає гравців)`);
        } else {
          if (player.isHost) {
            const newHost = Array.from(room.players.values())[0];
            newHost.isHost = true;
            room.hostId = newHost.id;
          }
          
          updateRoomPlayers(code);
          // Оновлюємо чергу
          io.to(code).emit('queue-updated', {
            queue: room.queue,
            currentSpeaker: room.currentSpeaker
          });
        }
        break;
      }
    }
  });

  // === ДОПОМІЖНІ ФУНКЦІЇ ===
  
  function startNextSpeaker(code) {
    const room = rooms.get(code);
    if (!room || !room.queue || room.queue.length === 0) return;

    const nextSpeaker = room.queue[0];
    room.currentSpeaker = nextSpeaker;
    
    console.log(`🎤 ${nextSpeaker.nickname} почав(ла) виступ в кімнаті ${code}`);
    
    // Запускаємо таймер виступу (2 хвилини)
    room.speechTimer = setTimeout(() => {
      console.log(`⏰ Час виступу ${nextSpeaker.nickname} вийшов`);
      finishCurrentSpeaker(code);
    }, SPEECH_TIME);
    
    // Надсилаємо системне повідомлення
    const systemMessage = {
      id: Date.now(),
      playerName: 'Система',
      message: `${nextSpeaker.nickname} почав(ла) виступ. Час: 2 хвилини.`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'system'
    };
    
    room.messages.push(systemMessage);
    
    io.to(code).emit('speaker-started', nextSpeaker);
    io.to(code).emit('queue-updated', {
      queue: room.queue,
      currentSpeaker: room.currentSpeaker
    });
    io.to(code).emit('chat-message', systemMessage);
    io.to(code).emit('speech-time-started', { duration: SPEECH_TIME });
  }

  function finishCurrentSpeaker(code) {
    const room = rooms.get(code);
    if (!room || !room.currentSpeaker) return;

    const currentSpeaker = room.currentSpeaker;
    
    // Очищаємо таймер виступу
    if (room.speechTimer) {
      clearTimeout(room.speechTimer);
      room.speechTimer = null;
    }
    
    // Видаляємо поточного промовця з черги
    if (room.queue && room.queue.length > 0) {
      room.queue = room.queue.filter(p => p.id !== currentSpeaker.id);
    }
    
    room.currentSpeaker = null;
    
    console.log(`✅ ${currentSpeaker.nickname} завершив(ла) виступ в кімнаті ${code}`);
    
    // Надсилаємо системне повідомлення
    const systemMessage = {
      id: Date.now(),
      playerName: 'Система',
      message: `${currentSpeaker.nickname} завершив(ла) виступ.`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'system'
    };
    
    room.messages.push(systemMessage);
    
    io.to(code).emit('speaker-finished', currentSpeaker);
    io.to(code).emit('queue-updated', {
      queue: room.queue,
      currentSpeaker: room.currentSpeaker
    });
    io.to(code).emit('chat-message', systemMessage);
    io.to(code).emit('speech-time-ended');

    // Автоматично запускаємо наступного промовця
    if (room.queue && room.queue.length > 0) {
      setTimeout(() => {
        startNextSpeaker(code);
      }, 2000); // 2 секунди паузи між виступами
    }
  }

  function endGame(code) {
    const room = rooms.get(code);
    if (!room) return;

    console.log(`⏰ Гра завершена в кімнаті ${code}`);
    
    // Очищаємо всі таймери
    if (room.gameTimer) clearInterval(room.gameTimer);
    if (room.speechTimer) clearTimeout(room.speechTimer);
    
    // Надсилаємо повідомлення про завершення гри
    const systemMessage = {
      id: Date.now(),
      playerName: 'Система',
      message: '⏰ Час гри вийшов! Обговорення завершено.',
      timestamp: new Date().toLocaleTimeString(),
      type: 'system'
    };
    
    room.messages.push(systemMessage);
    io.to(code).emit('chat-message', systemMessage);
    io.to(code).emit('game-ended');
    
    // Скидаємо стан гри
    room.gameStarted = false;
    room.phase = 'lobby';
    room.currentSpeaker = null;
    room.queue = [];
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
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return rooms.has(code) ? generateRoomCode() : code;
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущено на порті ${PORT}`);
  console.log(`🎭 Доступно ролей: ${ROLES.length} основних + спостерігачі`);
  console.log(`⏰ Тривалість гри: ${GAME_DURATION/60000} хвилин`);
  console.log(`🎤 Час виступу: ${SPEECH_TIME/60000} хвилини`);
});