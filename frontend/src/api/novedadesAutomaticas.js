import client from './client';

export const getEmpleadosCandidatos = (filtro) => client.get('/novedades-automaticas/empleados', { params: filtro });
export const generarNovedadesAutomaticas = (data) => client.post('/novedades-automaticas', data);
