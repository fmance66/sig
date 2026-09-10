import client from './client';

// PK compuesta punto+empresa (no hay id propio, "punto" es el número de punto de venta).
export const getPuntosVenta   = (empresa)             => client.get('/iva/puntos-venta', { params: { empresa } });
export const createPuntoVenta = (data)                => client.post('/iva/puntos-venta', data);
export const updatePuntoVenta = (punto, empresa, data) => client.put(`/iva/puntos-venta/${punto}/${empresa}`, data);
export const deletePuntoVenta = (punto, empresa)      => client.delete(`/iva/puntos-venta/${punto}/${empresa}`);
