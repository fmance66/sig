import client from './client';

// sld_concepto está escopado por empresa (catálogos independientes por empresa en el
// sistema legacy) — todas las operaciones de item necesitan id + empresa.
export const getConceptos   = (empresa)         => client.get('/conceptos', { params: { empresa } });
export const getConcepto    = (id, empresa)      => client.get(`/conceptos/${id}/${empresa}`);
export const createConcepto = (data)             => client.post('/conceptos', data);
export const updateConcepto = (id, empresa, data) => client.put(`/conceptos/${id}/${empresa}`, data);
export const deleteConcepto = (id, empresa)      => client.delete(`/conceptos/${id}/${empresa}`);

export const getConceptoLsd    = (id, empresa)       => client.get(`/conceptos/${id}/${empresa}/lsd`);
export const updateConceptoLsd = (id, empresa, data) => client.put(`/conceptos/${id}/${empresa}/lsd`, data);

// sld_empleado_concepto resuelve la empresa server-side vía el propio empleado.
export const getConceptosEmpleado    = (empleado) => client.get('/conceptos-empleado', { params: { empleado } });
export const createConceptoEmpleado  = (data)      => client.post('/conceptos-empleado', data);
export const deleteConceptoEmpleado  = (empleado, concepto, liquidacion, recibo) =>
  client.delete(`/conceptos-empleado/${empleado}/${concepto}/${liquidacion}/${recibo}`);

export const getConceptosGrupo   = (grupo, empresa) => client.get('/conceptos-grupo', { params: { grupo, empresa } });
export const createConceptoGrupo = (data)  => client.post('/conceptos-grupo', data);
export const deleteConceptoGrupo = (grupo, empresa, concepto, liquidacion, recibo) =>
  client.delete(`/conceptos-grupo/${grupo}/${empresa}/${concepto}/${liquidacion}/${recibo}`);

export const getConceptosGeneral   = (empresa) => client.get('/conceptos-general', { params: { empresa } });
export const createConceptoGeneral = (data)    => client.post('/conceptos-general', data);
export const deleteConceptoGeneral = (empresa, concepto, liquidacion, recibo) =>
  client.delete(`/conceptos-general/${empresa}/${concepto}/${liquidacion}/${recibo}`);
