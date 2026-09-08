import axios from 'axios';

const client = axios.create({
  // En dev, Vite proxea /api al backend local; en prod, Vercel no tiene backend
  // propio, así que necesita la URL completa del backend en Render.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// AuthContext se registra acá al montar — client.js no es un componente y no
// puede usar el context directamente, así que expone estos setters en vez de
// importar AuthContext (evitaría un ciclo de imports).
let onUnauthorized = null;
let onForbidden = null;
export function setAuthHandlers(handlers) {
  onUnauthorized = handlers.onUnauthorized ?? null;
  onForbidden = handlers.onForbidden ?? null;
}

client.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;
    const url = err.config?.url ?? '';
    if (status === 401 && !url.includes('/auth/login')) {
      onUnauthorized?.();
    } else if (status === 403) {
      onForbidden?.(err.response?.data?.mensaje);
    }
    return Promise.reject(err);
  }
);

export default client;
