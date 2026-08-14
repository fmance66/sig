import client from './client';

export const getNovedades      = (empleado)                     => client.get('/novedades', { params: { empleado } });
export const getNovedadesList  = (filtros)                      => client.get('/novedades', { params: filtros });
export const createNovedad     = (data)                         => client.post('/novedades', data);
export const updateNovedad     = (empleado, tipoNovedad, fecha, value) =>
  client.put(`/novedades/${empleado}/${encodeURIComponent(tipoNovedad)}/${fecha}`, { value });
export const deleteNovedad     = (empleado, tipoNovedad, fecha) =>
  client.delete(`/novedades/${empleado}/${encodeURIComponent(tipoNovedad)}/${fecha}`);
export const deleteNovedadesMasivo = (filtros)                  => client.delete('/novedades', { data: filtros });

export const getMatriz  = (params)         => client.get('/novedades/matriz', { params });
export const saveMatriz = (fecha, filas)   => client.post('/novedades/matriz', { fecha, filas });
