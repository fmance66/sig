import client from './client';

export const getJornadasLaboralesList = ()               => client.get('/jornada-laboral');
export const getJornadaLaboral        = (empleado)       => client.get(`/jornada-laboral/${empleado}`);
export const createJornadaLaboral     = (data)            => client.post('/jornada-laboral', data);
export const updateJornadaLaboral     = (empleado, data)  => client.put(`/jornada-laboral/${empleado}`, data);
export const deleteJornadaLaboral     = (empleado)         => client.delete(`/jornada-laboral/${empleado}`);
