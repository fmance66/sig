import client from './client';

export const getEmpresas   = ()           => client.get('/empresas');
export const getEmpresa    = (id)         => client.get(`/empresas/${id}`);
export const createEmpresa = (data)       => client.post('/empresas', data);
export const updateEmpresa = (id, data)   => client.put(`/empresas/${id}`, data);
export const deleteEmpresa = (id)         => client.delete(`/empresas/${id}`);
