import client from './client';

export const getDashboard = (empresaId) => client.get('/dashboard', { params: { empresa: empresaId } });
export const getDashboardGlobal = () => client.get('/dashboard/global');
export const getDashboardContabilidad = (empresaId) => client.get('/dashboard/contabilidad', { params: { empresa: empresaId } });
export const getDashboardIva = (empresaId) => client.get('/dashboard/iva', { params: { empresa: empresaId } });
