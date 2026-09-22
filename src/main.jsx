import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

try { localStorage.setItem('app_test', Date.now().toString()); } catch {}
window.__APP_STARTED__ = true;
document.body && (document.body.style.backgroundColor = '#ff0000');

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (e) {
  document.body.innerHTML = '<div style="color:white;padding:20px;background:black;font-size:18px;font-family:monospace;">ERROR: ' + e.message + '</div>'
}
