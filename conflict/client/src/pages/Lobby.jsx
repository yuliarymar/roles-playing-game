import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import './Lobby.css';

export default function Lobby() {
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [roleType, setRoleType] = useState('player');
  const navigate = useNavigate();

  useEffect(() => {
    const handleRoomCreated = (data) => {
      localStorage.setItem('nickname', nickname);
      localStorage.setItem('roleType', roleType);
      navigate(`/room/${data.code}`);
    };

    const handleRoomJoined = () => {
      localStorage.setItem('nickname', nickname);
      localStorage.setItem('roleType', roleType);
      navigate(`/room/${code}`);
    };

    const handleError = (message) => {
      alert(`Помилка: ${message}`);
    };

    socket.on('room-created', handleRoomCreated);
    socket.on('room-joined', handleRoomJoined);
    socket.on('error', handleError);

    return () => {
      socket.off('room-created', handleRoomCreated);
      socket.off('room-joined', handleRoomJoined);
      socket.off('error', handleError);
    };
  }, [navigate, nickname, code, roleType]);

  const createRoom = () => {
    if (!nickname.trim()) {
      alert('Будь ласка, введіть ваше імʼя');
      return;
    }
    socket.emit('create-room', { nickname, roleType });
  };

  const joinRoom = () => {
    if (!nickname.trim() || !code.trim()) {
      alert('Будь ласка, введіть імʼя та код кімнати');
      return;
    }
    socket.emit('join-room', { code: code.toUpperCase(), nickname, roleType });
  };

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <h1>🏛️ Місто Рішень</h1>
        <p className="subtitle">Гра "Місто Рішень" - Ситуаційна-рольова гра</p>

        <div className="input-group">
          <label> Ваше ім'я</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Введіть ваше ім'я"
            maxLength={20}
          />
        </div>

        <div className="role-selection">
          <h3>🎯 Оберіть свою роль у грі</h3>

          <div className={`role-option ${roleType === 'player' ? 'selected' : ''}`} onClick={() => setRoleType('player')}>
            <div className="role-header">
              <div className="role-icon">🎭</div>
              <div className="role-title">
                <span>Гравець</span>
                <span className="badge">Обмеження: 9 гравців</span>
              </div>
            </div>
            <div className="role-content">
              <p>Активний учасник з роллю. Будете втілювати конкретного персонажа та брати участь у прийнятті рішень.</p>
            </div>
          </div>

          <div className={`role-option ${roleType === 'observer' ? 'selected' : ''}`} onClick={() => setRoleType('observer')}>
            <div className="role-header">
              <div className="role-icon">👀</div>
              <div className="role-title">
                <span>Спостерігач</span>
              </div>
            </div>
            <div className="role-content">
              <p>Спостерігайте за грою, аналізуйте конфлікти та беріть участь у рефлексії. Без обмежень.</p>
            </div>
          </div>
        </div>

        <div className="buttons-section">
          <button onClick={createRoom} className="btn-create">
            🎮 Створити Кімнату
          </button>

          <div className="divider">
            <span>або</span>
          </div>

          <div className="join-section">
            <div className="input-group">
              <label>🔑 Код кімнати</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Введіть код кімнати"
                maxLength={6}
              />
            </div>
            <button onClick={joinRoom} className="btn-join">
              👥 Приєднатися до Кімнати
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}