import client from './client';

export const getGruposDeConceptos = ()          => client.get('/grupos-de-conceptos');
export const getGrupoDeConceptos  = (id)         => client.get(`/grupos-de-conceptos/${id}`);
export const createGrupoDeConceptos = (data)     => client.post('/grupos-de-conceptos', data);
export const updateGrupoDeConceptos = (id, data) => client.put(`/grupos-de-conceptos/${id}`, data);
export const deleteGrupoDeConceptos = (id)       => client.delete(`/grupos-de-conceptos/${id}`);
