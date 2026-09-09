import client from './client';

export const getEjercicios   = (empresa)          => client.get('/contabilidad/ejercicios', { params: { empresa } });
export const createEjercicio = (data)             => client.post('/contabilidad/ejercicios', data);
export const updateEjercicio = (id, empresa, data) => client.put(`/contabilidad/ejercicios/${id}/${empresa}`, data);
export const deleteEjercicio = (id, empresa)      => client.delete(`/contabilidad/ejercicios/${id}/${empresa}`);
