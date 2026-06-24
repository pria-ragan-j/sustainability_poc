import React from 'react';
import ReactDOM from 'react-dom/client';
import { Chart, registerables } from 'chart.js';
import App from './App.jsx';
import './globals.css';

Chart.register(...registerables);
Chart.defaults.color = '#64748b';
Chart.defaults.borderColor = 'rgba(15,23,42,0.08)';
Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
Chart.defaults.font.size = 11;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
