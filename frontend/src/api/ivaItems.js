import client from './client';

// Compartido Ítem de Compra (modulo COMPRA) / Ítem de Venta (modulo VENTA). PK modulo+id+empresa.
export const getItems   = (modulo, empresa)          => client.get('/iva/items', { params: { modulo, empresa } });
export const getItem    = (modulo, id, empresa)      => client.get(`/iva/items/${modulo}/${id}/${empresa}`);
export const createItem = (data)                     => client.post('/iva/items', data);
export const updateItem = (modulo, id, empresa, data) => client.put(`/iva/items/${modulo}/${id}/${empresa}`, data);
export const deleteItem = (modulo, id, empresa)      => client.delete(`/iva/items/${modulo}/${id}/${empresa}`);
