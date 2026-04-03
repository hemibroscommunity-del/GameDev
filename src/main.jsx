import React from 'react';
import { createRoot } from 'react-dom/client';
import { GameApp } from './ui/GameApp.jsx';
import './styles/game.css';

createRoot(document.getElementById('root')).render(<GameApp />);
