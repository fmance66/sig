import client from './client';

// GET directo (no JSON): el navegador recibe el .txt como attachment — mismo
// patrón que api/backup.js.
export const getConceptosUrl = (empresa) => `${client.defaults.baseURL}/lsd/conceptos?empresa=${empresa}`;

export const getLiquidacionUrl = (empresa, periodo) =>
  `${client.defaults.baseURL}/lsd/liquidacion?empresa=${empresa}&periodo=${encodeURIComponent(periodo)}`;

export const getTope = (periodo) => client.get(`/lsd/topes/${periodo}`);

export const guardarTope = (periodo, data) => client.put(`/lsd/topes/${periodo}`, data);
