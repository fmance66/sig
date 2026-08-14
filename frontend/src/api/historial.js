import client from './client';

export const getHistorialesList  = (filtros)                => client.get('/historial', { params: filtros });
export const createHistorial     = (data)                   => client.post('/historial', data);
export const updateHistorial     = (campo, fechaDesde, data) =>
  client.put(`/historial/${encodeURIComponent(campo)}/${fechaDesde}`, data);
export const deleteHistorial     = (campo, fechaDesde) =>
  client.delete(`/historial/${encodeURIComponent(campo)}/${fechaDesde}`);
export const deleteHistorialesMasivo = (filtros)             => client.delete('/historial', { data: filtros });
