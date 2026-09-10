const pool = require('../config/db');
const asientosModel = require('./asientos');

// Método directo (RT 6/17), con granularidad mensual (la misma que trae
// cnt_coeficiente del legacy: un índice por mes calendario, no por fecha
// exacta del movimiento).
//
// Para cada cuenta no monetaria imputable con movimientos en el rango/tipos
// filtrados, se agrupa el neto (debe-haber) por mes del asiento y se reexpresa
// multiplicando por coeficiente(mes) = índice(mes de cierre) / índice(mes del
// movimiento). La diferencia contra el neto histórico es el ajuste de esa
// cuenta; la suma de todos los ajustes (con signo opuesto) es la contrapartida
// del resultado por exposición a la inflación (RECPAM) que balancea el asiento.
//
// cnt_coeficiente es una tabla global (sin `empresa`, ver migración 009): esta
// función solo LEE `indice` de ahí, nunca escribe indice_cierre/coeficiente,
// para no pisar la serie con la fecha de cierre de una empresa puntual.

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function primerDiaMes(fecha) {
  const d = new Date(fecha);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

async function movimientosPorCuentaYMes(empresa, ejercicio, { fechaDesde, fechaHasta, tiposExcluir, cuentas }) {
  const params = [ejercicio, empresa];
  const filtros = ['m.ejercicio = $1', 'm.empresa = $2'];
  if (fechaDesde) { params.push(fechaDesde); filtros.push(`a.fecha >= $${params.length}`); }
  if (fechaHasta) { params.push(fechaHasta); filtros.push(`a.fecha <= $${params.length}`); }
  if (Array.isArray(tiposExcluir) && tiposExcluir.length) {
    params.push(tiposExcluir);
    filtros.push(`(a.tipo IS NULL OR NOT (a.tipo = ANY($${params.length})))`);
  }
  if (Array.isArray(cuentas) && cuentas.length) {
    params.push(cuentas);
    filtros.push(`m.cuenta = ANY($${params.length})`);
  } else {
    filtros.push('c.monetaria = FALSE AND c.imputable = TRUE');
  }

  const { rows } = await pool.query(
    `SELECT m.cuenta, c.descripcion,
            date_trunc('month', a.fecha)::date AS periodo,
            SUM(COALESCE(m.debe, 0) - COALESCE(m.haber, 0)) AS neto
       FROM cnt_movimiento m
       JOIN cnt_asiento a ON a.ejercicio = m.ejercicio AND a.numero = m.numero AND a.empresa = m.empresa
       JOIN cnt_cuenta c ON c.id = m.cuenta AND c.empresa = m.empresa
      WHERE ${filtros.join(' AND ')}
      GROUP BY m.cuenta, c.descripcion, periodo
     HAVING SUM(COALESCE(m.debe, 0) - COALESCE(m.haber, 0)) <> 0
      ORDER BY m.cuenta, periodo`,
    params
  );
  return rows;
}

async function indicesPorPeriodo(periodos) {
  if (!periodos.length) return new Map();
  const { rows } = await pool.query(
    'SELECT periodo, indice FROM cnt_coeficiente WHERE periodo = ANY($1::date[])',
    [periodos]
  );
  return new Map(rows.map(r => [r.periodo.toISOString().slice(0, 10), r.indice === null ? null : Number(r.indice)]));
}

// Calcula la reexpresión sin generar nada: sirve tanto para la vista previa
// ("Filtros de Asiento" / "Filtros de Cuenta") como para validar antes de generar.
async function calcular(empresa, ejercicio, filtros) {
  const { fechaCierre } = filtros;
  if (!fechaCierre) { const e = new Error('fechaCierre es requerida'); e.status = 400; throw e; }

  const movimientos = await movimientosPorCuentaYMes(empresa, ejercicio, filtros);
  const periodoCierre = primerDiaMes(fechaCierre);
  const periodos = [...new Set([periodoCierre, ...movimientos.map(m => m.periodo.toISOString().slice(0, 10))])];
  const indices = await indicesPorPeriodo(periodos);

  const indiceCierre = indices.get(periodoCierre);
  const periodosFaltantes = new Set();
  if (indiceCierre === undefined || indiceCierre === null) periodosFaltantes.add(periodoCierre);

  const porCuenta = new Map();
  for (const mov of movimientos) {
    const periodo = mov.periodo.toISOString().slice(0, 10);
    const indice = indices.get(periodo);
    if (indice === undefined || indice === null) { periodosFaltantes.add(periodo); continue; }
    if (!porCuenta.has(mov.cuenta)) {
      porCuenta.set(mov.cuenta, { cuenta: mov.cuenta, descripcion: mov.descripcion, saldo_historico: 0, ajuste: 0 });
    }
    const acc = porCuenta.get(mov.cuenta);
    const neto = Number(mov.neto);
    acc.saldo_historico += neto;
    if (indiceCierre !== undefined && indiceCierre !== null) {
      const coeficiente = indiceCierre / indice;
      acc.ajuste += neto * (coeficiente - 1);
    }
  }

  const filas = [...porCuenta.values()]
    .map(f => ({
      cuenta: f.cuenta,
      descripcion: f.descripcion,
      saldo_historico: round2(f.saldo_historico),
      ajuste: round2(f.ajuste),
      saldo_ajustado: round2(f.saldo_historico + f.ajuste),
    }))
    .filter(f => f.ajuste !== 0)
    .sort((a, b) => a.cuenta.localeCompare(b.cuenta));

  const totalAjuste = round2(filas.reduce((acc, f) => acc + f.ajuste, 0));
  return { periodosFaltantes: [...periodosFaltantes].sort(), filas, totalAjuste };
}

async function generar(empresa, ejercicio, filtros, { cuentaContrapartida, fecha, leyenda }) {
  if (!cuentaContrapartida) { const e = new Error('cuentaContrapartida es requerida'); e.status = 400; throw e; }
  if (!fecha) { const e = new Error('fecha es requerida'); e.status = 400; throw e; }

  const resultado = await calcular(empresa, ejercicio, filtros);
  if (resultado.periodosFaltantes.length) {
    const e = new Error(`Faltan coeficientes cargados para: ${resultado.periodosFaltantes.join(', ')}`);
    e.status = 400;
    throw e;
  }
  if (!resultado.filas.length) {
    const e = new Error('No hay ajuste a generar: ningún saldo cambia con los filtros elegidos');
    e.status = 400;
    throw e;
  }

  const leyendaAsiento = leyenda || 'Ajuste por inflación';
  const movimientos = resultado.filas.map(f => ({
    cuenta: f.cuenta,
    debe: f.ajuste > 0 ? f.ajuste : 0,
    haber: f.ajuste < 0 ? -f.ajuste : 0,
    leyenda: leyendaAsiento,
  }));
  movimientos.push({
    cuenta: cuentaContrapartida,
    debe: resultado.totalAjuste < 0 ? -resultado.totalAjuste : 0,
    haber: resultado.totalAjuste > 0 ? resultado.totalAjuste : 0,
    leyenda: 'Resultado por exposición a la inflación (RECPAM)',
  });

  const asiento = await asientosModel.create({ ejercicio, empresa, fecha, leyenda: leyendaAsiento, tipo: 'AJUSTE', movimientos });
  return { asiento, filas: resultado.filas, totalAjuste: resultado.totalAjuste };
}

module.exports = { calcular, generar };
