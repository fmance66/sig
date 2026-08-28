import client from './client';

export const getDashboard = (empresaId) => client.get('/dashboard', { params: { empresa: empresaId } });
export const getDashboardGlobal = () => client.get('/dashboard/global');
