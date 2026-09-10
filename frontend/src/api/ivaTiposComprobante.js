import client from './client';

export const getTiposComprobante   = (empresa)          => client.get('/iva/tipos-comprobante', { params: { empresa } });
export const createTipoComprobante = (data)             => client.post('/iva/tipos-comprobante', data);
export const updateTipoComprobante = (id, empresa, data) => client.put(`/iva/tipos-comprobante/${id}/${empresa}`, data);
export const deleteTipoComprobante = (id, empresa)      => client.delete(`/iva/tipos-comprobante/${id}/${empresa}`);

// Sub-recurso Letras: reemplaza siempre la lista completa.
export const getLetras = (id, empresa)       => client.get(`/iva/tipos-comprobante/${id}/${empresa}/letras`);
export const setLetras = (id, empresa, items) => client.put(`/iva/tipos-comprobante/${id}/${empresa}/letras`, { items });

// Combo de solo lectura (~90 filas fijas tipo "001 Facturas A"), no depende de empresa.
export const getTiposAfip = () => client.get('/iva/tipos-afip');
