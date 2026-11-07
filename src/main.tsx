import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cal-sans';
import '@fontsource-variable/inter';
import './estilos.css';
import { App } from './App';

// Fuentes del prototipo Pinkies V2 (Cal Sans + Inter), empaquetadas localmente:
// la app no necesita internet para mostrarse.
createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
