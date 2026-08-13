import client from './client';

// Liquidación (período)
export const getLiquidaciones   = (params)      => client.get('/liquidaciones', { params });
export const getLiquidacion     = (periodo)      => client.get(`/liquidaciones/${encodeURIComponent(periodo)}`);
export const createLiquidacion  = (data)         => client.post('/liquidaciones', data);
export const updateLiquidacion  = (periodo, data) => client.put(`/liquidaciones/${encodeURIComponent(periodo)}`, data);
export const deleteLiquidacion  = (periodo)      => client.delete(`/liquidaciones/${encodeURIComponent(periodo)}`);

// Recibos (cabecera + conceptos)
export const getRecibos          = (params) => client.get('/recibos', { params });
export const getRecibo           = (periodo, empleado, numero) =>
  client.get(`/recibos/${encodeURIComponent(periodo)}/${empleado}/${numero}`);
export const createRecibo        = (data) => client.post('/recibos', data);
export const updateRecibo        = (periodo, empleado, numero, data) =>
  client.put(`/recibos/${encodeURIComponent(periodo)}/${empleado}/${numero}`, data);
export const deleteRecibo        = (periodo, empleado, numero) =>
  client.delete(`/recibos/${encodeURIComponent(periodo)}/${empleado}/${numero}`);
export const deleteRecibosMasivo = (filtro) => client.delete('/recibos', { data: filtro });
export const recalcularRecibo    = (periodo, empleado, numero) =>
  client.post(`/recibos/${encodeURIComponent(periodo)}/${empleado}/${numero}/recalcular`);

export const getConceptosRecibo   = (periodo, empleado, numero) =>
  client.get(`/recibos/${encodeURIComponent(periodo)}/${empleado}/${numero}/conceptos`);
export const addConceptoRecibo    = (periodo, empleado, numero, data) =>
  client.post(`/recibos/${encodeURIComponent(periodo)}/${empleado}/${numero}/conceptos`, data);
export const updateConceptoRecibo = (periodo, empleado, numero, concepto, data) =>
  client.put(`/recibos/${encodeURIComponent(periodo)}/${empleado}/${numero}/conceptos/${encodeURIComponent(concepto)}`, data);
export const deleteConceptoRecibo = (periodo, empleado, numero, concepto) =>
  client.delete(`/recibos/${encodeURIComponent(periodo)}/${empleado}/${numero}/conceptos/${encodeURIComponent(concepto)}`);

// Recibos automáticos
export const getEmpleadosCandidatos = (params) => client.get('/recibos-automaticos/empleados', { params });
export const generarRecibosAutomaticos = (data) => client.post('/recibos-automaticos', data);

// Recibos recalculados
export const getRecibosRecalculados = (params) => client.get('/recibos-recalculados', { params });
export const recalcularRecibosLote  = (filtro)  => client.post('/recibos-recalculados/recalcular', { filtro });
export const adicionarConceptoLote  = (data)    => client.post('/recibos-recalculados/adicionar-concepto', data);

// Listado de contribuciones / auxiliares
export const getListadoContribuciones = (params) => client.get('/listado-contribuciones', { params });
export const getDetalleContribuciones = (periodo, empleado, numero, columna) =>
  client.get(`/listado-contribuciones/${encodeURIComponent(periodo)}/${empleado}/${numero}/detalle`, { params: { columna } });
