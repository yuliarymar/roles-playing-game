import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import socket from '../socket';
import './GameRoom.css';

const ROLE_IMAGES = {
  'Підліток-графітіст': '🖌️',
  'Друг підлітка': '🌟',
  'Директор школи': '👩‍🏫',
  'Вчитель мистецтв': '🖼️',
  'Вчитель історії': '🏛️',
  'Поліцейський': '🚔',
  'Соціальний працівник': '🕊️',
  'Мер міста': '⭐',
  'Батько підлітка': '🏠',
  'Представник батьків': '💼',
  'Спостерігач': '📋'
};

export default function GameRoom() {
  const { code } = useParams();
  const [players, setPlayers] = useState([]);
  const [role, setRole] = useState(null);
  const [nickname, setNickname] = useState('');
  const [playerType, setPlayerType] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [showRoleScreen, setShowRoleScreen] = useState(false);
  const [gamePhase, setGamePhase] = useState('lobby');
  
  // ДОДАЄМО СТЕЙТИ ДЛЯ ЧАТУ ТА ЧЕРГИ
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [queue, setQueue] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [isInQueue, setIsInQueue] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  useEffect(() => {
    console.log('🔍 GameRoom mounted, code:', code);
    
    const savedNickname = localStorage.getItem('nickname');
    const savedRoleType = localStorage.getItem('roleType');
    setNickname(savedNickname);
    setPlayerType(savedRoleType);

    socket.emit('get-room-data', code);

    socket.on('players-updated', (playersData) => {
      console.log('👥 Players updated:', playersData);
      setPlayers(playersData);
      const currentPlayer = playersData.find(p => p.nickname === savedNickname);
      if (currentPlayer) {
        setIsHost(currentPlayer.isHost);
        console.log('👑 Host status:', currentPlayer.isHost);
      }
    });

    socket.on('role-assigned', (roleData) => {
      console.log('🎭 Role assigned:', roleData);
      setRole({
        name: roleData.role,
        emoji: roleData.emoji,
        image: roleData.image,
        description: roleData.description,
        fullDescription: roleData.fullDescription
      });
      setShowRoleScreen(true);
    });

    socket.on('roles-distributed', () => {
      console.log('✅ Roles distributed event received');
      setGamePhase('roles-assigned');
      alert('🎭 Ролі успішно розподілені! Тепер можете почати гру.');
    });

    socket.on('game-started', () => {
      console.log('🚀 Game started event received');
      setGamePhase('game-started');
      setShowRoleScreen(false);
      alert('🚀 Гра розпочалася! Починаємо обговорення.');
    });

    socket.on('game-phase-changed', (phase) => {
      console.log('🔄 Game phase changed:', phase);
      setGamePhase(phase);
    });

    // ДОДАЄМО ОБРОБНИКИ ДЛЯ ЧАТУ
    socket.on('chat-message', (messageData) => {
      console.log('💬 New chat message:', messageData);
      setMessages(prev => {
        const isDuplicate = prev.some(msg => msg.id === messageData.id);
        if (isDuplicate) {
          console.log('⚠️ Duplicate message detected, skipping');
          return prev;
        }
        return [...prev, messageData];
      });
    });

    socket.on('chat-history', (history) => {
      console.log('📜 Chat history:', history);
      const uniqueHistory = history.filter((msg, index, self) => 
        index === self.findIndex(m => m.id === msg.id)
      );
      setMessages(uniqueHistory);
    });

    // ДОДАЄМО ОБРОБНИКИ ДЛЯ СИСТЕМИ ЧЕРГИ
    socket.on('queue-updated', (queueData) => {
      console.log('📋 Queue updated:', queueData);
      setQueue(queueData.queue);
      setCurrentSpeaker(queueData.currentSpeaker);
      
      // Оновлюємо наші статуси
      setIsInQueue(queueData.queue.some(player => player.id === socket.id));
      setIsSpeaking(queueData.currentSpeaker?.id === socket.id);
    });

    socket.on('hand-raised', (playerData) => {
      console.log('✋ Hand raised:', playerData);
      // Додаємо системне повідомлення
      const systemMessage = {
        id: Date.now() + Math.random(),
        playerName: 'Система',
        message: `${playerData.nickname} підняв(ла) руку`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
    });

    socket.on('hand-lowered', (playerData) => {
      console.log('👇 Hand lowered:', playerData);
    });

    socket.on('speaker-started', (speakerData) => {
      console.log('🎤 Speaker started:', speakerData);
      const systemMessage = {
        id: Date.now() + Math.random(),
        playerName: 'Система',
        message: `${speakerData.nickname} почав(ла) виступ`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
    });

    socket.on('speaker-finished', (speakerData) => {
      console.log('✅ Speaker finished:', speakerData);
      const systemMessage = {
        id: Date.now() + Math.random(),
        playerName: 'Система',
        message: `${speakerData.nickname} завершив(ла) виступ`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
    });

    socket.on('error', (message) => {
      console.error('❌ Socket error:', message);
      alert(`❌ Помилка: ${message}`);
    });

    return () => {
      console.log('🧹 Cleaning up GameRoom listeners');
      socket.off('players-updated');
      socket.off('role-assigned');
      socket.off('roles-distributed');
      socket.off('game-started');
      socket.off('game-phase-changed');
      socket.off('chat-message');
      socket.off('chat-history');
      socket.off('queue-updated');
      socket.off('hand-raised');
      socket.off('hand-lowered');
      socket.off('speaker-started');
      socket.off('speaker-finished');
      socket.off('error');
    };
  }, [code]);

  // Додатковий useEffect для відстеження змін стану
  useEffect(() => {
    console.log('📊 Current state:', {
      gamePhase,
      playersCount: players.length,
      isHost,
      role,
      showRoleScreen,
      queue,
      currentSpeaker
    });
  }, [gamePhase, players, isHost, role, showRoleScreen, queue, currentSpeaker]);

  // useEffect для автоматичного скролу до нових повідомлень
  useEffect(() => {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, [messages]);

  const assignRoles = () => {
    console.log('🎭 Assigning roles...');
    socket.emit('assign-roles', code);
  };

  const startGame = () => {
    console.log('🚀 Starting game...');
    socket.emit('start-game', code);
  };

  const switchPlayerType = (newType) => {
    console.log('🔄 Switching player type to:', newType);
    socket.emit('switch-player-type', { code, newType });
    setPlayerType(newType);
    setRole(null);
    setGamePhase('lobby');
  };

  const closeRoleScreen = () => {
    console.log('📱 Closing role screen');
    setShowRoleScreen(false);
  };

  // ФУНКЦІЇ ДЛЯ ЧАТУ
  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    const messageData = {
      id: Date.now() + Math.random(),
      playerName: nickname,
      playerRole: role?.name,
      message: newMessage,
      timestamp: new Date().toLocaleTimeString(),
      type: 'player'
    };
    
    console.log('📤 Sending message:', messageData);
    socket.emit('send-message', { code, message: messageData });
    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  // ФУНКЦІЇ ДЛЯ СИСТЕМИ ЧЕРГИ
  const raiseHand = () => {
    console.log('✋ Raising hand');
    socket.emit('raise-hand', code);
    setHandRaised(true);
  };

  const lowerHand = () => {
    console.log('👇 Lowering hand');
    socket.emit('lower-hand', code);
    setHandRaised(false);
  };

  const joinQueue = () => {
    console.log('📋 Joining queue');
    socket.emit('join-queue', code);
  };

  const leaveQueue = () => {
    console.log('🚪 Leaving queue');
    socket.emit('leave-queue', code);
  };

  const finishSpeaking = () => {
    console.log('✅ Finishing speaking');
    socket.emit('finish-speaking', code);
  };

  // ФУНКЦІЇ ДЛЯ ХОСТА
  const nextSpeaker = () => {
    console.log('⏭️ Next speaker');
    socket.emit('next-speaker', code);
  };

  const removeFromQueue = (playerId) => {
    console.log('🗑️ Removing from queue:', playerId);
    socket.emit('remove-from-queue', { code, playerId });
  };

  const playerCount = players.filter(p => p.roleType === 'player').length;
  const observerCount = players.filter(p => p.roleType === 'observer').length;

  // ЕКРАН РОЛІ
  if (showRoleScreen && role) {
    return (
      <div className="role-screen">
        <div className="role-card">
          <div className="role-image">{role.image || ROLE_IMAGES[role.name]}</div>
          <h1>{role.name}</h1>
          <div className="role-badge">{role.emoji}</div>
          
          <div className="role-section">
            <h3>🎯 Твоя роль</h3>
            <p className="role-description">{role.description}</p>
          </div>

          <div className="role-section">
            <h3>📖 Детальний опис</h3>
            <p className="role-full-description">{role.fullDescription}</p>
          </div>

          <div className="role-section">
            <h3>💡 Поради для гри</h3>
            <ul className="role-tips">
              <li>Відтворюй характер своєї ролі</li>
              <li>Використовуй емоції та жести</li>
              <li>Шукай компроміси з іншими</li>
              <li>Не здавайся, але вмій слухати</li>
            </ul>
          </div>

          <button onClick={closeRoleScreen} className="btn-continue">
            🎭 Зрозуміло, починаємо!
          </button>
        </div>
      </div>
    );
  }

  // ЕКРАН АКТИВНОЇ ГРИ (ОБГОВОРЕННЯ)
  if (gamePhase === 'game-started') {
    return (
      <div className="game-interface">
        <div className="game-header">
          <h1>🏛️ Місто Рішень - Гра триває!</h1>
          <h2>Кімната: <strong>{code}</strong></h2>
          <p>Ваша роль: <strong>{role?.name}</strong> {role?.emoji}</p>
        </div>

        <div className="discussion-area">
          <div className="scenario">
            <h3>📜 Сценарій гри:</h3>
            <div className="scenario-content">
              <p><strong>"Графіті на стіні школи"</strong></p>
              <p>Підліток намалював графіті на фасаді школи з протестом проти "нудної школи".</p>
              <p>Тепер різні сторони мають знайти спільне рішення цієї ситуації.</p>
              <div className="scenario-tips">
                <p>💬 <strong>Початок обговорення:</strong> Представтесь своєю роллю та висловіть свою позицію.</p>
                <p>🎤 <strong>Правила:</strong> Піднімайте руку, щоб взяти слово. Говоріть по черзі!</p>
              </div>
            </div>

            {/* СИСТЕМА ЧЕРГИ */}
            <div className="queue-system">
              <h3>🎤 Система черги</h3>
              
              {/* ПОТОЧНИЙ ПРОМОВЦЯ */}
              {currentSpeaker && (
                <div className="current-speaker">
                  <h4>🟢 Зараз говорить:</h4>
                  <div className="speaker-card">
                    <span className="player-emoji">{ROLE_IMAGES[currentSpeaker.role] || '🎭'}</span>
                    <div className="speaker-info">
                      <strong>{currentSpeaker.nickname}</strong>
                      <span>{currentSpeaker.role}</span>
                    </div>
                    {isHost && (
                      <button 
                        className="btn-next" 
                        onClick={nextSpeaker}
                        title="Наступний промовець"
                      >
                        ⏭️
                      </button>
                    )}
                    {currentSpeaker.id === socket.id && (
                      <button 
                        className="btn-finish" 
                        onClick={finishSpeaking}
                      >
                        ✅ Завершити
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ЧЕРГА */}
              <div className="queue-list">
                <h4>📋 Черга ({queue.length}):</h4>
                {queue.length > 0 ? (
                  <div className="queue-items">
                    {queue.map((player, index) => (
                      <div key={player.id} className="queue-item">
                        <span className="queue-number">{index + 1}.</span>
                        <span className="player-emoji">{ROLE_IMAGES[player.role] || '🎭'}</span>
                        <span className="queue-player">{player.nickname}</span>
                        <span className="queue-role">{player.role}</span>
                        {isHost && (
                          <button 
                            className="btn-remove" 
                            onClick={() => removeFromQueue(player.id)}
                            title="Видалити з черги"
                          >
                            ❌
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-queue">Черга порожня</p>
                )}
              </div>

              {/* КНОПКИ КЕРУВАННЯ */}
              <div className="queue-controls">
                {!isSpeaking && !isInQueue && (
                  <button 
                    className="btn-raise-hand"
                    onClick={raiseHand}
                    disabled={handRaised}
                  >
                    {handRaised ? '✋ Рука піднята' : '✋ Підняти руку'}
                  </button>
                )}
                
                {handRaised && !isInQueue && (
                  <button 
                    className="btn-join-queue"
                    onClick={joinQueue}
                  >
                    📋 Увійти в чергу
                  </button>
                )}
                
                {isInQueue && (
                  <button 
                    className="btn-leave-queue"
                    onClick={leaveQueue}
                  >
                    🚪 Вийти з черги
                  </button>
                )}
                
                {handRaised && (
                  <button 
                    className="btn-lower-hand"
                    onClick={lowerHand}
                  >
                    👇 Опустити руку
                  </button>
                )}

                {isSpeaking && (
                  <button 
                    className="btn-speaking"
                    onClick={finishSpeaking}
                  >
                    🎤 Я говорю...
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="chat-interface">
            <h3>💬 Обговорення</h3>
            <div className="messages-container">
              <div className="message system">
                <strong>Система:</strong> Гра розпочалася! Представтесь та почніть обговорення.
              </div>
              <div className="message system">
                <strong>Система:</strong> Мета: знайти компромісне рішення для ситуації з графіті.
              </div>
              <div className="message system">
                <strong>Система:</strong> Використовуйте систему черги для організованого обговорення.
              </div>
              
              {/* ПОВІДОМЛЕННЯ КОРИСТУВАЧІВ */}
              {messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.type === 'system' ? 'system' : 'player'}`}>
                  <strong>{msg.playerName}</strong> 
                  {msg.playerRole && ` (${msg.playerRole})`}: {msg.message}
                  <span className="message-time"> {msg.timestamp}</span>
                </div>
              ))}
            </div>
            
            <div className="message-input">
              <input 
                type="text" 
                placeholder="Напишіть ваше повідомлення..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSpeaking}
              />
              <button 
                className="btn-send" 
                onClick={sendMessage}
                disabled={isSpeaking}
              >
                Надіслати
              </button>
            </div>
          </div>

          <div className="players-sidebar">
            <h3>👥 Учасники ({players.length})</h3>
            <div className="players-list-game">
              {players.map(player => (
                <div key={player.id} className={`game-player ${player.roleType} ${
                  currentSpeaker?.id === player.id ? 'speaking' : ''
                } ${queue.some(p => p.id === player.id) ? 'in-queue' : ''}`}>
                  <span className="player-emoji">{ROLE_IMAGES[player.role] || '🎭'}</span>
                  <div className="player-info-game">
                    <span className="player-name">{player.nickname}</span>
                    <span className="player-role-badge">{player.role}</span>
                    {currentSpeaker?.id === player.id && <span className="speaking-badge">🎤 ГОВОРИТЬ</span>}
                    {queue.some(p => p.id === player.id) && <span className="queue-badge">📋 В ЧЕРЗІ</span>}
                    {player.isHost && <span className="host-badge">👑</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="game-controls">
          <button className="btn-exit" onClick={() => window.location.href = '/'}>
            🏃 Вийти з гри
          </button>
        </div>
      </div>
    );
  }

  // ОСНОВНИЙ ЕКРАН ЛОБІ (залишається без змін)
  return (
    <div className="game-room">
      <div className="room-header">
        <h1>🏛️ Місто Рішень</h1>
        <h2>Кімната: <strong>{code}</strong></h2>
        <div className="player-info">
          <p>Ви: <strong>{nickname}</strong> {isHost && '👑 (Хост)'}</p>
          {role && <p>Ваша роль: <strong>{role.name}</strong> {role.emoji}</p>}
        </div>
      </div>

      {/* КНОПКИ ДЛЯ ХОСТА */}
      {isHost && (
        <div className="game-controls-host">
          <h3>🎮 Керування грою</h3>
          
          <div className="host-buttons">
            <button 
              onClick={assignRoles} 
              className="btn-assign-roles"
              disabled={playerCount < 3 || gamePhase === 'roles-assigned'}
            >
              🎭 Роздати ролі ({playerCount}/3+)
              {gamePhase === 'roles-assigned' && ' ✅'}
            </button>

            {gamePhase === 'roles-assigned' && (
              <button 
                onClick={startGame}
                className="btn-start-game"
              >
                🚀 ПОЧАТИ ГРУ
              </button>
            )}
          </div>

          <div className="game-status">
            {gamePhase === 'lobby' && (
              playerCount >= 3 
                ? `✅ Готово до розподілу ролей! Гравців: ${playerCount}` 
                : `⏳ Очікуємо гравців... (${playerCount}/3)`
            )}
            {gamePhase === 'roles-assigned' && (
              <div className="roles-ready-status">
                <p>🎭 Ролі розподілені! Готові до старту гри</p>
                <p className="status-note">Натисніть "ПОЧАТИ ГРУ" щоб розпочати обговорення</p>
              </div>
            )}
          </div>

          <div className="roles-info">
            <h4>🎭 Доступні ролі (10):</h4>
            <div className="roles-preview">
              <span className="role-preview">🖌️ Підліток-графітіст</span>
              <span className="role-preview">🌟 Друг підлітка</span>
              <span className="role-preview">👩‍🏫 Директор школи</span>
              <span className="role-preview">🖼️ Вчитель мистецтв</span>
              <span className="role-preview">🏛️ Вчитель історії</span>
              <span className="role-preview">🚔 Поліцейський</span>
              <span className="role-preview">🕊️ Соціальний працівник</span>
              <span className="role-preview">⭐ Мер міста</span>
              <span className="role-preview">🏠 Батько підлітка</span>
              <span className="role-preview">💼 Представник батьків</span>
            </div>
          </div>
        </div>
      )}

      {/* ДЛЯ ГРАВЦІВ (НЕ ХОСТІВ) */}
      {!isHost && (
        <div className="waiting-for-host">
          <h3>
            {gamePhase === 'lobby' && '⏳ Очікуємо, коли хост розподілить ролі...'}
            {gamePhase === 'roles-assigned' && '🎭 Ролі розподілені! Очікуємо початку гри...'}
          </h3>
          <p>Гравців у кімнаті: {playerCount}/3</p>
          {role && (
            <div className="your-role-info">
              <p>Ваша роль: <strong>{role.name}</strong> {role.emoji}</p>
              <p className="role-hint">{role.description}</p>
            </div>
          )}
        </div>
      )}

      {/* СТАТИСТИКА ГРАВЦІВ */}
      <div className="players-stats">
        <div className="stat">
          <span className="stat-number">{players.length}</span>
          <span className="stat-label">всього</span>
        </div>
        <div className="stat">
          <span className="stat-number">{playerCount}</span>
          <span className="stat-label">гравців</span>
        </div>
        <div className="stat">
          <span className="stat-number">{observerCount}</span>
          <span className="stat-label">спостерігачів</span>
        </div>
      </div>

      {/* СПИСОК ГРАВЦІВ */}
      <div className="players-list">
        <h3>👥 Учасники ({players.length})</h3>
        <div className="players-grid">
          {players.map((player) => (
            <div key={player.id} className={`player-card ${player.roleType} ${player.role ? 'has-role' : ''}`}>
              <div className="player-emoji">
                {ROLE_IMAGES[player.role] || (player.roleType === 'player' ? '🎭' : '👀')}
              </div>
              <div className="player-info">
                <strong>{player.nickname}</strong>
                <span className="player-role">{player.role || 'Очікує роль...'}</span>
                <span className={`player-type ${player.roleType}`}>
                  {player.roleType === 'player' ? '🎭 Гравець' : '👀 Спостерігач'}
                  {player.isHost && ' 👑'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ПЕРЕМИКАЧ ТИПУ ГРАВЦЯ */}
      <div className="type-switcher">
        <h4>Змінити свою роль:</h4>
        <div className="switch-buttons">
          <button 
            onClick={() => switchPlayerType('player')}
            className={`switch-btn ${playerType === 'player' ? 'active' : ''}`}
            disabled={gamePhase !== 'lobby'}
          >
            🎭 Гравець
          </button>
          <button 
            onClick={() => switchPlayerType('observer')}
            className={`switch-btn ${playerType === 'observer' ? 'active' : ''}`}
            disabled={gamePhase !== 'lobby'}
          >
            👀 Спостерігач
          </button>
        </div>
        {gamePhase !== 'lobby' && (
          <p className="switch-note">⚠️ Не можна змінювати тип після розподілу ролей</p>
        )}
      </div>
    </div>
  );
}