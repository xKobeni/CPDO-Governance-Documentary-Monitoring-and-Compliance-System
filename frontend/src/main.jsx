import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyTheme, resolveTheme } from './config/themes'

const savedTheme = resolveTheme(localStorage.getItem('cpdo-theme'));
applyTheme(savedTheme);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
