import client from './client';

export const getLeyendas   = (empresa)          => client.get('/contabilidad/leyendas', { params: { empresa } });
export const createLeyenda = (data)             => client.post('/contabilidad/leyendas', data);
export const updateLeyenda = (id, empresa, data) => client.put(`/contabilidad/leyendas/${id}/${empresa}`, data);
export const deleteLeyenda = (id, empresa)      => client.delete(`/contabilidad/leyendas/${id}/${empresa}`);
