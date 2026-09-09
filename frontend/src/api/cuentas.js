import client from './client';

export const getCuentas   = (empresa)          => client.get('/contabilidad/cuentas', { params: { empresa } });
export const getArbolCuentas = (empresa)       => client.get('/contabilidad/cuentas/arbol', { params: { empresa } });
export const getCuenta    = (id, empresa)      => client.get(`/contabilidad/cuentas/${id}/${empresa}`);
export const createCuenta = (data)             => client.post('/contabilidad/cuentas', data);
export const updateCuenta = (id, empresa, data) => client.put(`/contabilidad/cuentas/${id}/${empresa}`, data);
export const deleteCuenta = (id, empresa)      => client.delete(`/contabilidad/cuentas/${id}/${empresa}`);

export const getCentrosCostoDeCuenta = (id, empresa)       => client.get(`/contabilidad/cuentas/${id}/${empresa}/centros-costo`);
export const setCentrosCostoDeCuenta = (id, empresa, data) => client.put(`/contabilidad/cuentas/${id}/${empresa}/centros-costo`, data);
