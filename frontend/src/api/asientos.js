import client from './client';

export const getAsientos = ({ empresa, ejercicio, cuenta, leyenda, tipo }) =>
  client.get('/contabilidad/asientos', { params: { empresa, ejercicio, cuenta, leyenda, tipo } });

export const getMovimientos = (ejercicio, numero, empresa) =>
  client.get(`/contabilidad/asientos/${ejercicio}/${numero}/${empresa}/movimientos`);

export const createAsiento = (data) => client.post('/contabilidad/asientos', data);

export const updateAsiento = (ejercicio, numero, empresa, data) =>
  client.put(`/contabilidad/asientos/${ejercicio}/${numero}/${empresa}`, data);

export const deleteAsiento = (ejercicio, numero, empresa) =>
  client.delete(`/contabilidad/asientos/${ejercicio}/${numero}/${empresa}`);

export const unirAsientos = (data) => client.put('/contabilidad/asientos/union', data);

export const getDesbalanceados = ({ empresa, ejercicio }) =>
  client.get('/contabilidad/asientos/desbalanceados', { params: { empresa, ejercicio } });

export const renumerarAsientos = (data) => client.put('/contabilidad/asientos/renumerar', data);
