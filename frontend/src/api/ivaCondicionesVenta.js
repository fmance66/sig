import client from './client';

export const getCondicionesVenta   = (empresa)          => client.get('/iva/condiciones-venta', { params: { empresa } });
export const createCondicionVenta  = (data)             => client.post('/iva/condiciones-venta', data);
export const updateCondicionVenta  = (id, empresa, data) => client.put(`/iva/condiciones-venta/${id}/${empresa}`, data);
export const deleteCondicionVenta  = (id, empresa)      => client.delete(`/iva/condiciones-venta/${id}/${empresa}`);
