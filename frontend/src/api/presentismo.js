import client from './client';

export const getPresentismosList = (filtros)                  => client.get('/presentismos', { params: filtros });
export const createPresentismo   = (data)                     => client.post('/presentismos', data);
export const updatePresentismo   = (empleado, fecha, hora, data) =>
  client.put(`/presentismos/${empleado}/${fecha}/${hora}`, data);
export const deletePresentismo   = (empleado, fecha, hora)     =>
  client.delete(`/presentismos/${empleado}/${fecha}/${hora}`);
