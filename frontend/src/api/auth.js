import client from './client';

export const login  = (usuario, password) => client.post('/auth/login', { usuario, password });
export const logout  = () => client.post('/auth/logout');
export const getMe   = () => client.get('/auth/me');
