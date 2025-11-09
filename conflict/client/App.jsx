import { useState, useEffect } from 'react';
import socket from './socket';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.on('receive-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('receive-message');
    };
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('send-message', message);
      setMessage('');
    }
  };

  return (
    <div className="App">
      <h1>Neon Conflict</h1>
      <div className="chat">
        {messages.map((m, i) => (
          <p key={i}>{m}</p>
        ))}
      </div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        placeholder="Напиши повідомлення..."
      />
      <button onClick={sendMessage}>Надіслати</button>
    </div>
  );
}

export default App;