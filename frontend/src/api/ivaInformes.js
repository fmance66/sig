import client from './client';

export const getLibroIva   = (params) => client.get('/iva/informes/libro', { params });
export const getResumenIva = (params) => client.get('/iva/informes/resumen', { params });
export const getDdjjIva    = (params) => client.get('/iva/informes/ddjj', { params });
