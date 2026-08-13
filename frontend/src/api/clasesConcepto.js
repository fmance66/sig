import client from './client';

export const getClasesConcepto   = ()          => client.get('/clases-concepto');
export const getClaseConcepto    = (id)         => client.get(`/clases-concepto/${id}`);
export const createClaseConcepto = (data)       => client.post('/clases-concepto', data);
export const updateClaseConcepto = (id, data)   => client.put(`/clases-concepto/${id}`, data);
export const deleteClaseConcepto = (id)         => client.delete(`/clases-concepto/${id}`);

export const getGruposDeClase    = (claseId)         => client.get(`/clases-concepto/${claseId}/grupos`);
export const addGrupoAClase      = (claseId, data)   => client.post(`/clases-concepto/${claseId}/grupos`, data);
export const removeGrupoDeClase  = (claseId, grupo)  => client.delete(`/clases-concepto/${claseId}/grupos/${grupo}`);
