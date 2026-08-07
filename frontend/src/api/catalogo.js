import client from './client';

export function createCatalogoApi(basePath) {
  return {
    getAll: ()          => client.get(basePath),
    getOne: (id)         => client.get(`${basePath}/${id}`),
    create: (data)       => client.post(basePath, data),
    update: (id, data)   => client.put(`${basePath}/${id}`, data),
    remove: (id)         => client.delete(`${basePath}/${id}`),
  };
}
