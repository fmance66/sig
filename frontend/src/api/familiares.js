import client from './client';

export const getFamiliares   = (empleado)              => client.get('/familiares', { params: { empleado } });
export const createFamiliar  = (data)                  => client.post('/familiares', data);
export const updateFamiliar  = (empleado, id, data)    => client.put(`/familiares/${empleado}/${id}`, data);
export const deleteFamiliar  = (empleado, id)          => client.delete(`/familiares/${empleado}/${id}`);
