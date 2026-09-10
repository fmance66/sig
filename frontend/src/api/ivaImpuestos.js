import client from './client';

export const getImpuestos   = (empresa)          => client.get('/iva/impuestos', { params: { empresa } });
export const createImpuesto = (data)             => client.post('/iva/impuestos', data);
export const updateImpuesto = (id, empresa, data) => client.put(`/iva/impuestos/${id}/${empresa}`, data);
export const deleteImpuesto = (id, empresa)      => client.delete(`/iva/impuestos/${id}/${empresa}`);
