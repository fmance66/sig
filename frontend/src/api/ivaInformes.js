import client from './client';

export const getLibroIva   = (params) => client.get('/iva/informes/libro', { params });
export const getResumenIva = (params) => client.get('/iva/informes/resumen', { params });
export const getDdjjIva    = (params) => client.get('/iva/informes/ddjj', { params });
export const getComprobantesIva      = (params) => client.get('/iva/informes/comprobantes', { params });
export const getRubrosIva            = (params) => client.get('/iva/informes/rubros', { params });
export const getProvinciasIva        = (params) => client.get('/iva/informes/provincias', { params });
export const getItemsIva             = (params) => client.get('/iva/informes/items', { params });
export const getItemsPorComprobanteIva = (params) => client.get('/iva/informes/items-por-comprobante', { params });
