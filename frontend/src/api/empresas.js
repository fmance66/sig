import client from './client';

export const getEmpresas   = ()           => client.get('/empresas');
export const getEmpresa    = (id)         => client.get(`/empresas/${id}`);
export const createEmpresa = (data)       => client.post('/empresas', data);
export const updateEmpresa = (id, data)   => client.put(`/empresas/${id}`, data);
export const deleteEmpresa = (id)         => client.delete(`/empresas/${id}`);

// El logo viaja aparte de los demás campos (BYTEA, no JSON) — se sube tal cual
// el archivo, con su content-type, y se sirve por GET como imagen directa.
export const getLogoUrl    = (id, version) => `${client.defaults.baseURL}/empresas/${id}/logo${version ? `?v=${version}` : ''}`;
export const uploadLogo    = (id, file)   => client.put(`/empresas/${id}/logo`, file, { headers: { 'Content-Type': file.type } });
export const deleteLogo    = (id)         => client.delete(`/empresas/${id}/logo`);

// Copiado de configuración (conceptos + diseño de recibo/libro) entre empresas —
// ver CopiarConfiguracionPage.jsx. `incluir`: { conceptos, formulariosRecibo, formulariosLibro }.
export const tieneConfiguracion   = (id)                        => client.get(`/empresas/${id}/tiene-configuracion`);
export const copiarConfiguracion  = (id, origen, modo, incluir) => client.post(`/empresas/${id}/copiar-configuracion`, { origen, modo, incluir });
