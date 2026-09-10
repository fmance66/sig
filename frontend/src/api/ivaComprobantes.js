import client from './client';

// PK compuesta modulo+tipo+comprobante(numero)+persona+empresa.
export const getComprobantes = (params)                     => client.get('/iva/comprobantes', { params });
export const getComprobante  = (modulo, tipo, comprobante, persona, empresa) =>
  client.get(`/iva/comprobantes/${modulo}/${tipo}/${comprobante}/${persona}/${empresa}`);
export const createComprobante = (data)                     => client.post('/iva/comprobantes', data);
export const updateComprobante = (modulo, tipo, comprobante, persona, empresa, data) =>
  client.put(`/iva/comprobantes/${modulo}/${tipo}/${comprobante}/${persona}/${empresa}`, data);
export const deleteComprobante = (modulo, tipo, comprobante, persona, empresa) =>
  client.delete(`/iva/comprobantes/${modulo}/${tipo}/${comprobante}/${persona}/${empresa}`);

// Reemplaza todas las líneas de impuesto y devuelve el header con los totales
// (neto/exento/nogravado/iva/impuesto_1..9/subtotal/total) ya recalculados por el backend.
export const setImpuestosComprobante = (modulo, tipo, comprobante, persona, empresa, items) =>
  client.put(`/iva/comprobantes/${modulo}/${tipo}/${comprobante}/${persona}/${empresa}/impuestos`, { items });

export const setItemsComprobante = (modulo, tipo, comprobante, persona, empresa, items) =>
  client.put(`/iva/comprobantes/${modulo}/${tipo}/${comprobante}/${persona}/${empresa}/items`, { items });
