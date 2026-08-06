import client from './client';

export const getConceptosEmpleado    = (empleado) => client.get('/conceptos-empleado', { params: { empleado } });
export const createConceptoEmpleado  = (data)      => client.post('/conceptos-empleado', data);
export const deleteConceptoEmpleado  = (empleado, concepto, liquidacion, recibo) =>
  client.delete(`/conceptos-empleado/${empleado}/${concepto}/${liquidacion}/${recibo}`);

export const getConceptosGrupo = (grupo) => client.get('/conceptos-grupo', { params: { grupo } });
