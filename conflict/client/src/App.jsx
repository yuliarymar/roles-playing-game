import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Lobby from './pages/Lobby';
import GameRoom from './pages/GameRoom';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/room/:code" element={<GameRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;