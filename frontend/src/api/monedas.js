import client from './client';

export const getMonedas = () => client.get('/monedas');
