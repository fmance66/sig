import client from './client';

export const getMayorCuentas = ({ empresa, ejercicio, cuenta, leyenda }) =>
  client.get('/contabilidad/informes/mayor-cuentas', { params: { empresa, ejercicio, cuenta, leyenda } });

export const getBalanceGeneral = ({ empresa, ejercicio }) =>
  client.get('/contabilidad/informes/balance-general', { params: { empresa, ejercicio } });

export const getBalanceSumasSaldos = ({ empresa, ejercicio }) =>
  client.get('/contabilidad/informes/balance-sumas-saldos', { params: { empresa, ejercicio } });

export const getLibroDiarioAcumulado = ({ empresa, ejercicio, periodo }) =>
  client.get('/contabilidad/informes/libro-diario-acumulado', { params: { empresa, ejercicio, periodo } });

export const getLibroCentrosCosto = ({ empresa, ejercicio }) =>
  client.get('/contabilidad/informes/libro-centros-costo', { params: { empresa, ejercicio } });

export const getBalanceCentrosCosto = ({ empresa, ejercicio }) =>
  client.get('/contabilidad/informes/balance-centros-costo', { params: { empresa, ejercicio } });
