// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Note the .jsx extension
import './index.css';
import './utils/localeOverrides.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
