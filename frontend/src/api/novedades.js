import client from './client';

export const getNovedades   = (empleado)                        => client.get('/novedades', { params: { empleado } });
export const createNovedad  = (data)                            => client.post('/novedades', data);
export const deleteNovedad  = (empleado, tipoNovedad, fecha)    =>
  client.delete(`/novedades/${empleado}/${tipoNovedad}/${fecha}`);
