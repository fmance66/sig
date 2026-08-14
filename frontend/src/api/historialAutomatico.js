import client from './client';

export const getEmpleadosCandidatos = (filtro) => client.get('/historial-automatico/empleados', { params: filtro });
export const generarHistorialesAutomaticos = (data) => client.post('/historial-automatico', data);
