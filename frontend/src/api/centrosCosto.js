import client from './client';

export const getCentrosCosto   = (empresa)          => client.get('/contabilidad/centros-costo', { params: { empresa } });
export const createCentroCosto = (data)             => client.post('/contabilidad/centros-costo', data);
export const updateCentroCosto = (id, empresa, data) => client.put(`/contabilidad/centros-costo/${id}/${empresa}`, data);
export const deleteCentroCosto = (id, empresa)      => client.delete(`/contabilidad/centros-costo/${id}/${empresa}`);
