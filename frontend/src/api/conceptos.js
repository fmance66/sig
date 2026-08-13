import client from './client';

export const getConceptos   = ()          => client.get('/conceptos');
export const getConcepto    = (id)         => client.get(`/conceptos/${id}`);
export const createConcepto = (data)       => client.post('/conceptos', data);
export const updateConcepto = (id, data)   => client.put(`/conceptos/${id}`, data);
export const deleteConcepto = (id)         => client.delete(`/conceptos/${id}`);

export const getConceptoLsd    = (id)       => client.get(`/conceptos/${id}/lsd`);
export const updateConceptoLsd = (id, data) => client.put(`/conceptos/${id}/lsd`, data);

export const getConceptosEmpleado    = (empleado) => client.get('/conceptos-empleado', { params: { empleado } });
export const createConceptoEmpleado  = (data)      => client.post('/conceptos-empleado', data);
export const deleteConceptoEmpleado  = (empleado, concepto, liquidacion, recibo) =>
  client.delete(`/conceptos-empleado/${empleado}/${concepto}/${liquidacion}/${recibo}`);

export const getConceptosGrupo   = (grupo) => client.get('/conceptos-grupo', { params: { grupo } });
export const createConceptoGrupo = (data)  => client.post('/conceptos-grupo', data);
export const deleteConceptoGrupo = (grupo, concepto, liquidacion, recibo) =>
  client.delete(`/conceptos-grupo/${grupo}/${concepto}/${liquidacion}/${recibo}`);

export const getConceptosGeneral   = ()     => client.get('/conceptos-general');
export const createConceptoGeneral = (data) => client.post('/conceptos-general', data);
export const deleteConceptoGeneral = (concepto, liquidacion, recibo) =>
  client.delete(`/conceptos-general/${concepto}/${liquidacion}/${recibo}`);
