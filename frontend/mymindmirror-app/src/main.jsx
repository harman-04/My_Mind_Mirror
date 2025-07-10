// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';
// 👇 IMPORT BrowserRouter here!
import { BrowserRouter as Router } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      {/* 👇 WRAP your App component with Router here! */}
      <Router>
        <App />
      </Router>
    </ThemeProvider>
  </React.StrictMode>,
);