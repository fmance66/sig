import client from './client';

export const getAusentismosList = (filtros)                      => client.get('/ausentismos', { params: filtros });
export const createAusentismo    = (data)                        => client.post('/ausentismos', data);
export const updateAusentismo    = (empleado, motivo, fechaDesde, data) =>
  client.put(`/ausentismos/${empleado}/${encodeURIComponent(motivo)}/${fechaDesde}`, data);
export const deleteAusentismo    = (empleado, motivo, fechaDesde) =>
  client.delete(`/ausentismos/${empleado}/${encodeURIComponent(motivo)}/${fechaDesde}`);
