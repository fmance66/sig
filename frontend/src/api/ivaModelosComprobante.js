import client from './client';

export const getModelosComprobante   = (empresa)          => client.get('/iva/modelos-comprobante', { params: { empresa } });
export const createModeloComprobante = (data)             => client.post('/iva/modelos-comprobante', data);
export const updateModeloComprobante = (id, empresa, data) => client.put(`/iva/modelos-comprobante/${id}/${empresa}`, data);
export const deleteModeloComprobante = (id, empresa)      => client.delete(`/iva/modelos-comprobante/${id}/${empresa}`);

// Sub-recurso Impuestos: reemplaza siempre la lista completa, el id de cada línea se regenera.
export const getImpuestosModelo = (id, empresa)       => client.get(`/iva/modelos-comprobante/${id}/${empresa}/impuestos`);
export const setImpuestosModelo = (id, empresa, items) => client.put(`/iva/modelos-comprobante/${id}/${empresa}/impuestos`, { items });
