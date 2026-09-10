import client from './client';

export const previewAjusteInflacion = (data) => client.post('/contabilidad/ajuste-inflacion/preview', data);
export const generarAjusteInflacion = (data) => client.post('/contabilidad/ajuste-inflacion/generar', data);
