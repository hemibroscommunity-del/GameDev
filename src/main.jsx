import React from 'react';
import { createRoot } from 'react-dom/client';
import { GameApp } from './ui/GameApp.jsx';
import { debugBus } from './debug/debugBus.js';
import './styles/game.css';

debugBus.initFromUrl();

createRoot(document.getElementById('root')).render(<GameApp />);
