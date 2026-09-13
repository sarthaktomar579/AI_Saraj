import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Filter out harmless browser-level Cross-Origin-Opener-Policy popup warnings
const origError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && (args[0].includes('Cross-Origin-Opener-Policy') || args[0].includes('window.closed'))) {
    return;
  }
  origError.apply(console, args);
};

const origWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && (
    args[0].includes('Cross-Origin-Opener-Policy') || 
    args[0].includes('window.closed') ||
    args[0].includes('React Router Future Flag Warning')
  )) {
    return;
  }
  origWarn.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
