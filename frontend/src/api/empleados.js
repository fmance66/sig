import client from './client';

export const getEmpleados   = (empresa)      => client.get('/empleados', { params: { empresa } });
export const getEmpleado    = (id)           => client.get(`/empleados/${id}`);
export const createEmpleado = (data)         => client.post('/empleados', data);
export const updateEmpleado = (id, data)     => client.put(`/empleados/${id}`, data);
export const deleteEmpleado = (id)           => client.delete(`/empleados/${id}`);
