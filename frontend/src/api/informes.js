import client from './client';

// Conceptos Agrupados
export const getConceptosPorGrupo    = (params) => client.get('/informes/conceptos-por-grupo', { params });
export const getConceptosAcumulados  = (params) => client.get('/informes/conceptos-acumulados', { params });
export const getConceptosPorEmpleado = (params) => client.get('/informes/conceptos-por-empleado', { params });
export const getConceptosPorRecibo   = (params) => client.get('/informes/conceptos-por-recibo', { params });

// Remuneración
export const getRemuneracionPorConceptos = (params) => client.get('/informes/remuneracion-por-conceptos', { params });
export const getRemuneracionPorEmpleados = (params) => client.get('/informes/remuneracion-por-empleados', { params });
export const getRemuneracionPorGrupos    = (params) => client.get('/informes/remuneracion-por-grupos', { params });

// Recibos de Sueldo / Libro de Sueldos
export const getRecibosSueldo = (params) => client.get('/informes/recibos-sueldo', { params });

// seleccion: recibos elegidos a mano en la grilla (checkbox) — si viene con elementos, el PDF
// se arma solo con esos en vez de re-correr el filtro de búsqueda.
function pdfParams(params, seleccion) {
  if (seleccion?.length) {
    return { recibos: JSON.stringify(seleccion.map(r => [r.periodo, r.empleado, r.numero])) };
  }
  return params;
}

export const getReciboSueldoPdfUrl = (params, seleccion) =>
  `/api/informes/recibos-sueldo/pdf?${new URLSearchParams(pdfParams(params, seleccion)).toString()}`;
export const getLibroSueldoPdfUrl = (params, seleccion) =>
  `/api/informes/libro-sueldos/pdf?${new URLSearchParams(pdfParams(params, seleccion)).toString()}`;

// Diseño de Recibos de Sueldo / Diseño de Libro de Sueldos
export const formulariosRecibo = {
  getAll:  (empresa)      => client.get('/informes/formularios-recibo', { params: { empresa } }),
  getOne:  (id)           => client.get(`/informes/formularios-recibo/${encodeURIComponent(id)}`),
  create:  (data)         => client.post('/informes/formularios-recibo', data),
  update:  (id, data)     => client.put(`/informes/formularios-recibo/${encodeURIComponent(id)}`, data),
  remove:  (id)           => client.delete(`/informes/formularios-recibo/${encodeURIComponent(id)}`),
  getParametros:   (id)       => client.get(`/informes/formularios-recibo/${encodeURIComponent(id)}/parametros`),
  addParametro:    (id, data) => client.post(`/informes/formularios-recibo/${encodeURIComponent(id)}/parametros`, data),
  updateParametro: (id, p, data) => client.put(`/informes/formularios-recibo/${encodeURIComponent(id)}/parametros/${encodeURIComponent(p)}`, data),
  removeParametro: (id, p)    => client.delete(`/informes/formularios-recibo/${encodeURIComponent(id)}/parametros/${encodeURIComponent(p)}`),
};

export const formulariosLibro = {
  getAll:  (empresa)      => client.get('/informes/formularios-libro', { params: { empresa } }),
  getOne:  (id)           => client.get(`/informes/formularios-libro/${encodeURIComponent(id)}`),
  create:  (data)         => client.post('/informes/formularios-libro', data),
  update:  (id, data)     => client.put(`/informes/formularios-libro/${encodeURIComponent(id)}`, data),
  remove:  (id)           => client.delete(`/informes/formularios-libro/${encodeURIComponent(id)}`),
  getParametros:   (id)       => client.get(`/informes/formularios-libro/${encodeURIComponent(id)}/parametros`),
  addParametro:    (id, data) => client.post(`/informes/formularios-libro/${encodeURIComponent(id)}/parametros`, data),
  updateParametro: (id, p, data) => client.put(`/informes/formularios-libro/${encodeURIComponent(id)}/parametros/${encodeURIComponent(p)}`, data),
  removeParametro: (id, p)    => client.delete(`/informes/formularios-libro/${encodeURIComponent(id)}/parametros/${encodeURIComponent(p)}`),
};

// Informes Personalizados
export const informesPersonalizados = {
  getAll:  ()             => client.get('/informes/personalizados'),
  getOne:  (id)           => client.get(`/informes/personalizados/${encodeURIComponent(id)}`),
  create:  (data)         => client.post('/informes/personalizados', data),
  update:  (id, data)     => client.put(`/informes/personalizados/${encodeURIComponent(id)}`, data),
  remove:  (id)           => client.delete(`/informes/personalizados/${encodeURIComponent(id)}`),
  getCampos:   (id)       => client.get(`/informes/personalizados/${encodeURIComponent(id)}/campos`),
  addCampo:    (id, data) => client.post(`/informes/personalizados/${encodeURIComponent(id)}/campos`, data),
  removeCampo: (id, c)    => client.delete(`/informes/personalizados/${encodeURIComponent(id)}/campos/${encodeURIComponent(c)}`),
};

export const getCamposDisponibles = (tabla) => client.get('/informes/personalizados-campos-disponibles', { params: { tabla } });
export const ejecutarInformePersonalizado = (id, params) =>
  client.get(`/informes/personalizados/${encodeURIComponent(id)}/ejecutar`, { params });
