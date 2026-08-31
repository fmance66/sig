import client from './client';

export const getGrupos   = ()          => client.get('/grupos');
export const getGrupo    = (id)        => client.get(`/grupos/${id}`);
export const createGrupo = (data)      => client.post('/grupos', data);
export const updateGrupo = (id, data)  => client.put(`/grupos/${id}`, data);
export const deleteGrupo = (id)        => client.delete(`/grupos/${id}`);

export const getGrupoUsuarios = (id)          => client.get(`/grupos/${id}/usuarios`);
export const setGrupoUsuarios = (id, usuarioIds) => client.put(`/grupos/${id}/usuarios`, { usuarioIds });

export const getGrupoPermisos = (id)          => client.get(`/grupos/${id}/permisos`);
export const setGrupoPermisos = (id, permisos) => client.put(`/grupos/${id}/permisos`, { permisos });
