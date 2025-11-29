import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';

// Simple test app
const App: React.FC = () => {
  return (
    <HashRouter>
      <div style={{ padding: '20px' }}>
        <h1>Строй-Контроль</h1>
        <p>Приложение загружается успешно!</p>
        <Routes>
          <Route path="/" element={<div>Главная страница</div>} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
