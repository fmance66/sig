import client from './client';

export const getHistorial   = (empleado)                    => client.get('/historial', { params: { empleado } });
export const createHistorial = (data)                       => client.post('/historial', data);
export const deleteHistorial = (empleado, campo, fechaDesde) =>
  client.delete(`/historial/${empleado}/${campo}/${fechaDesde}`);
