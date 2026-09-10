import client from './client';

export const getProyectos = () => client.get('/proyectos');
