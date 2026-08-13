import client from './client';

export const getTiposTabla   = ()          => client.get('/tipos-tabla');
export const getTipoTabla    = (id)         => client.get(`/tipos-tabla/${id}`);
export const createTipoTabla = (data)       => client.post('/tipos-tabla', data);
export const updateTipoTabla = (id, data)   => client.put(`/tipos-tabla/${id}`, data);
export const deleteTipoTabla = (id)         => client.delete(`/tipos-tabla/${id}`);

export const getFilas   = (tablaId)         => client.get(`/tipos-tabla/${tablaId}/filas`);
export const createFila = (tablaId, data)   => client.post(`/tipos-tabla/${tablaId}/filas`, data);
export const deleteFila = (tablaId, fila)   => client.delete(`/tipos-tabla/${tablaId}/filas/${fila}`);
