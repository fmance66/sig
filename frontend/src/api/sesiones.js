import client from './client';

export const getSesiones    = ()    => client.get('/sesiones');
export const deleteSesion   = (sid) => client.delete(`/sesiones/${encodeURIComponent(sid)}`);
