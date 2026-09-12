import client from './client';

// PK compuesta periodo+empresa.
export const getPeriodos   = (empresa)               => client.get('/iva/periodos', { params: { empresa } });
export const createPeriodo = (data)                  => client.post('/iva/periodos', data);
export const updatePeriodo = (periodo, empresa, data) => client.put(`/iva/periodos/${periodo}/${empresa}`, data);
export const deletePeriodo = (periodo, empresa)      => client.delete(`/iva/periodos/${periodo}/${empresa}`);

// Generan asientos reales a partir de los comprobantes del período (ver
// backend/src/lib/contabilizarIva.js). Contabilizar solo toma comprobantes sin
// asiento todavía; Recalcular borra y regenera los ya contabilizados.
// encodeURIComponent: `periodo` tiene formato "MM/AAAA" en los datos reales (la
// barra rompería el path si no se codifica).
export const contabilizarPeriodo = (periodo, empresa) => client.post(`/iva/periodos/${encodeURIComponent(periodo)}/${empresa}/contabilizar`);
export const recalcularPeriodo   = (periodo, empresa) => client.post(`/iva/periodos/${encodeURIComponent(periodo)}/${empresa}/recalcular`);
