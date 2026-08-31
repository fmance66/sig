import client from './client';

export const getUsuarios  = ()         => client.get('/usuarios');
export const getUsuario   = (id)       => client.get(`/usuarios/${id}`);
export const createUsuario = (data)    => client.post('/usuarios', data);
export const updateUsuario = (id, data) => client.put(`/usuarios/${id}`, data);
export const deleteUsuario = (id)      => client.delete(`/usuarios/${id}`);
