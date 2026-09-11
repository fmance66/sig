import client from './client';

export const getModelos = (empresa, grupo) => client.get('/iva/formulas-asiento', { params: { empresa, grupo } });
export const createModelo = (data) => client.post('/iva/formulas-asiento', data);
export const updateModelo = (id, empresa, data) => client.put(`/iva/formulas-asiento/${id}/${empresa}`, data);
export const deleteModelo = (id, empresa) => client.delete(`/iva/formulas-asiento/${id}/${empresa}`);

export const getMovimientos = (id, empresa) => client.get(`/iva/formulas-asiento/${id}/${empresa}/movimientos`);
export const setMovimientos = (id, empresa, data) => client.put(`/iva/formulas-asiento/${id}/${empresa}/movimientos`, data);

export const getCentrosCosto = (id, empresa) => client.get(`/iva/formulas-asiento/${id}/${empresa}/centros-costo`);
export const setCentrosCosto = (id, empresa, data) => client.put(`/iva/formulas-asiento/${id}/${empresa}/centros-costo`, data);

export const getProyectosModelo = (id, empresa) => client.get(`/iva/formulas-asiento/${id}/${empresa}/proyectos`);
export const setProyectosModelo = (id, empresa, data) => client.put(`/iva/formulas-asiento/${id}/${empresa}/proyectos`, data);
