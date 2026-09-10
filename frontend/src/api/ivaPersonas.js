import client from './client';

// Compartido Proveedor (modulo COMPRA) / Cliente (modulo VENTA). PK modulo+id+empresa.
export const getPersonas   = (modulo, empresa)          => client.get('/iva/personas', { params: { modulo, empresa } });
export const getPersona    = (modulo, id, empresa)      => client.get(`/iva/personas/${modulo}/${id}/${empresa}`);
export const createPersona = (data)                     => client.post('/iva/personas', data);
export const updatePersona = (modulo, id, empresa, data) => client.put(`/iva/personas/${modulo}/${id}/${empresa}`, data);
export const deletePersona = (modulo, id, empresa)      => client.delete(`/iva/personas/${modulo}/${id}/${empresa}`);
