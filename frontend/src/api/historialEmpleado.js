import client from './client';

export const getHistorial            = (empleado)                    => client.get('/historial-empleado', { params: { empleado } });
export const getHistorialesEmpleadoList = (filtros)                  => client.get('/historial-empleado', { params: filtros });
export const createHistorialEmpleado = (data)                        => client.post('/historial-empleado', data);
export const updateHistorialEmpleado = (empleado, campo, fechaDesde, data) =>
  client.put(`/historial-empleado/${empleado}/${encodeURIComponent(campo)}/${fechaDesde}`, data);
export const deleteHistorial         = (empleado, campo, fechaDesde) =>
  client.delete(`/historial-empleado/${empleado}/${encodeURIComponent(campo)}/${fechaDesde}`);
export const deleteHistorialesEmpleadoMasivo = (filtros)              => client.delete('/historial-empleado', { data: filtros });
