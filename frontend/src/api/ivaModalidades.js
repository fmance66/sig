import client from './client';

export const getModalidades   = (empresa)          => client.get('/iva/modalidades', { params: { empresa } });
export const createModalidad  = (data)             => client.post('/iva/modalidades', data);
export const updateModalidad  = (id, empresa, data) => client.put(`/iva/modalidades/${id}/${empresa}`, data);
export const deleteModalidad  = (id, empresa)      => client.delete(`/iva/modalidades/${id}/${empresa}`);
