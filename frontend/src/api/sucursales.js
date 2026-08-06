import client from './client';

export const getSucursales   = (empresa)      => client.get('/sucursales', { params: { empresa } });
export const createSucursal  = (data)         => client.post('/sucursales', data);
export const updateSucursal  = (id, data)     => client.put(`/sucursales/${id}`, data);
export const deleteSucursal  = (id)           => client.delete(`/sucursales/${id}`);
