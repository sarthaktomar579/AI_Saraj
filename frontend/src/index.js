import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Filter out harmless browser-level Cross-Origin-Opener-Policy popup warnings
const isCOOP = (arg) => {
  if (!arg) return false;
  const str = typeof arg === 'string' ? arg : (arg?.message || arg?.stack || (typeof arg?.toString === 'function' ? arg.toString() : '') || String(arg));
  return /Cross-Origin-Opener-Policy|window\.closed/i.test(str);
};

const origError = console.error;
console.error = (...args) => {
  if (args.some(isCOOP)) {
    return;
  }
  origError.apply(console, args);
};

const origWarn = console.warn;
console.warn = (...args) => {
  if (args.some(arg => isCOOP(arg) || (typeof arg === 'string' && arg.includes('React Router Future Flag Warning')))) {
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
