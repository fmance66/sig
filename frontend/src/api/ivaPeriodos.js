import client from './client';

// PK compuesta periodo+empresa.
export const getPeriodos   = (empresa)               => client.get('/iva/periodos', { params: { empresa } });
export const createPeriodo = (data)                  => client.post('/iva/periodos', data);
export const updatePeriodo = (periodo, empresa, data) => client.put(`/iva/periodos/${periodo}/${empresa}`, data);
export const deletePeriodo = (periodo, empresa)      => client.delete(`/iva/periodos/${periodo}/${empresa}`);
