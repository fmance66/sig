import client from './client';

// GET directo (no JSON): el navegador recibe el dump como attachment.
export const getGenerarUrl = () => `${client.defaults.baseURL}/backup/generar`;

export const restaurar = (contenidoSql) =>
  client.post('/backup/restaurar', contenidoSql, { headers: { 'Content-Type': 'text/plain' } });
