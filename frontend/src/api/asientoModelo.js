import client from './client';

export const getModelos = (empresa) => client.get('/contabilidad/asientos-modelo', { params: { empresa } });
export const createModelo = (data) => client.post('/contabilidad/asientos-modelo', data);
export const updateModelo = (id, empresa, data) => client.put(`/contabilidad/asientos-modelo/${id}/${empresa}`, data);
export const deleteModelo = (id, empresa) => client.delete(`/contabilidad/asientos-modelo/${id}/${empresa}`);

export const getLineasModelo = (id, empresa) => client.get(`/contabilidad/asientos-modelo/${id}/${empresa}/lineas`);
export const setLineasModelo = (id, empresa, data) => client.put(`/contabilidad/asientos-modelo/${id}/${empresa}/lineas`, data);
