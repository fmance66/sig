const pool = require('../config/db');

function num(v) { return Number(v) || 0; }

// Detalle de movimientos por cuenta con saldo acumulado corriente. El acumulado
// se calcula acá (no con funciones de ventana SQL) — mismo criterio que
// buildTree en models/cuentas.js: la agregación se resuelve del lado de Node.
async function mayorCuentas(ejercicio, empresa, { cuenta, leyenda } = {}) {
  const params = [ejercicio, empresa];
  const filtros = [];
  if (cuenta) { params.push(`%${cuenta}%`); filtros.push(`m.cuenta ILIKE $${params.length}`); }
  if (leyenda) { params.push(`%${leyenda}%`); filtros.push(`(m.leyenda ILIKE $${params.length} OR a.leyenda ILIKE $${params.length})`); }
  const where = ['m.ejercicio = $1', 'm.empresa = $2', ...filtros].join(' AND ');
  const { rows } = await pool.query(
    `SELECT m.cuenta, c.descripcion AS cuenta_descripcion, a.fecha, a.numero, a.leyenda AS asiento_leyenda,
            m.debe, m.haber, m.leyenda
       FROM cnt_movimiento m
       JOIN cnt_asiento a ON a.ejercicio = m.ejercicio AND a.numero = m.numero AND a.empresa = m.empresa
       JOIN cnt_cuenta c  ON c.id = m.cuenta AND c.empresa = m.empresa
      WHERE ${where}
      ORDER BY m.cuenta, a.fecha, a.numero, m.linea`,
    params
  );

  const cuentasMap = new Map();
  for (const r of rows) {
    if (!cuentasMap.has(r.cuenta)) {
      cuentasMap.set(r.cuenta, { cuenta: r.cuenta, descripcion: r.cuenta_descripcion, debe: 0, haber: 0, movimientos: [] });
    }
    const grupo = cuentasMap.get(r.cuenta);
    grupo.debe += num(r.debe);
    grupo.haber += num(r.haber);
    grupo.movimientos.push({
      fecha: r.fecha, numero: r.numero, leyenda: r.leyenda ?? r.asiento_leyenda,
      debe: num(r.debe), haber: num(r.haber), saldoAcumulado: grupo.debe - grupo.haber,
    });
  }
  return [...cuentasMap.values()].map(g => ({ ...g, saldo: g.debe - g.haber }));
}

// Árbol del plan de cuentas (mismo buildTree por id_padre que models/cuentas.js)
// con Debe/Haber/Saldo acumulados de abajo hacia arriba: cada rubro suma el
// total de sus cuentas hijas, recursivamente.
async function balanceGeneral(ejercicio, empresa) {
  const { rows } = await pool.query(
    `SELECT c.id, c.descripcion, c.id_padre,
            COALESCE(SUM(m.debe), 0) AS debe, COALESCE(SUM(m.haber), 0) AS haber
       FROM cnt_cuenta c
       LEFT JOIN cnt_movimiento m ON m.cuenta = c.id AND m.empresa = c.empresa AND m.ejercicio = $1
      WHERE c.empresa = $2
      GROUP BY c.id, c.descripcion, c.id_padre, c.orden
      ORDER BY c.orden NULLS LAST, c.id`,
    [ejercicio, empresa]
  );

  const nodes = new Map(rows.map(r => [r.id, {
    key: r.id,
    label: `${r.id} - ${r.descripcion ?? ''}`,
    data: { id: r.id, descripcion: r.descripcion, debe: num(r.debe), haber: num(r.haber) },
    children: [],
  }]));
  const roots = [];
  for (const r of rows) {
    const node = nodes.get(r.id);
    const padre = r.id_padre && nodes.get(r.id_padre);
    if (padre) padre.children.push(node); else roots.push(node);
  }
  function acumular(node) {
    for (const child of node.children) acumular(child);
    for (const child of node.children) {
      node.data.debe += child.data.debe;
      node.data.haber += child.data.haber;
    }
    node.data.saldo = node.data.debe - node.data.haber;
  }
  roots.forEach(acumular);
  return roots;
}

// Listado plano de todas las cuentas IMPUTABLES de la empresa (incluso sin
// movimiento, en 0) con Debe/Haber/Saldo del ejercicio — el balance de
// comprobación clásico. No incluye rubros/sub-rubros (no imputables): esos se
// ven agregados en Balance General, acá listarlos en 0 sería solo ruido.
async function balanceSumasYSaldos(ejercicio, empresa) {
  const { rows } = await pool.query(
    `SELECT c.id, c.descripcion,
            COALESCE(SUM(m.debe), 0) AS debe, COALESCE(SUM(m.haber), 0) AS haber
       FROM cnt_cuenta c
       LEFT JOIN cnt_movimiento m ON m.cuenta = c.id AND m.empresa = c.empresa AND m.ejercicio = $1
      WHERE c.empresa = $2 AND c.imputable = true
      GROUP BY c.id, c.descripcion, c.orden
      ORDER BY c.orden NULLS LAST, c.id`,
    [ejercicio, empresa]
  );
  return rows.map(r => ({ id: r.id, descripcion: r.descripcion, debe: num(r.debe), haber: num(r.haber), saldo: num(r.debe) - num(r.haber) }));
}

function claveDePeriodo(fecha, periodo) {
  const d = new Date(fecha);
  const anio = d.getUTCFullYear();
  if (periodo === 'anual') return { clave: `${anio}`, etiqueta: `${anio}` };
  if (periodo === 'trimestral') {
    const t = Math.floor(d.getUTCMonth() / 3) + 1;
    const ORDINAL = { 1: '1er', 2: '2do', 3: '3er', 4: '4to' };
    return { clave: `${anio}-T${t}`, etiqueta: `${ORDINAL[t]} Trimestre ${anio}` };
  }
  const mes = d.getUTCMonth() + 1;
  return { clave: `${anio}-${String(mes).padStart(2, '0')}`, etiqueta: `${String(mes).padStart(2, '0')}/${anio}` };
}

// Asientos agrupados por período (mensual/trimestral/anual) con saldo del
// período y saldo acumulado entre períodos, y el detalle por cuenta dentro de
// cada período con su propio Debe/Haber acumulado corrido.
async function libroDiarioAcumulado(ejercicio, empresa, periodo = 'mensual') {
  const { rows } = await pool.query(
    `SELECT a.fecha, m.cuenta, c.descripcion AS cuenta_descripcion, m.debe, m.haber
       FROM cnt_movimiento m
       JOIN cnt_asiento a ON a.ejercicio = m.ejercicio AND a.numero = m.numero AND a.empresa = m.empresa
       JOIN cnt_cuenta c  ON c.id = m.cuenta AND c.empresa = m.empresa
      WHERE m.ejercicio = $1 AND m.empresa = $2
      ORDER BY a.fecha`,
    [ejercicio, empresa]
  );

  const periodos = new Map();
  for (const r of rows) {
    const { clave, etiqueta } = claveDePeriodo(r.fecha, periodo);
    if (!periodos.has(clave)) periodos.set(clave, { clave, etiqueta, cuentas: new Map() });
    const grupo = periodos.get(clave);
    if (!grupo.cuentas.has(r.cuenta)) grupo.cuentas.set(r.cuenta, { cuenta: r.cuenta, descripcion: r.cuenta_descripcion, debe: 0, haber: 0 });
    const cta = grupo.cuentas.get(r.cuenta);
    cta.debe += num(r.debe);
    cta.haber += num(r.haber);
  }

  const acumuladoPorCuenta = new Map();
  let saldoAcumulado = 0;
  return [...periodos.values()]
    .sort((a, b) => a.clave.localeCompare(b.clave))
    .map(grupo => {
      const cuentas = [...grupo.cuentas.values()].map(cta => {
        const prev = acumuladoPorCuenta.get(cta.cuenta) ?? { debe: 0, haber: 0 };
        const debeAcumulado = prev.debe + cta.debe;
        const haberAcumulado = prev.haber + cta.haber;
        acumuladoPorCuenta.set(cta.cuenta, { debe: debeAcumulado, haber: haberAcumulado });
        return { ...cta, debeAcumulado, haberAcumulado };
      });
      const saldo = cuentas.reduce((acc, c) => acc + c.debe, 0);
      saldoAcumulado += saldo;
      return { periodo: grupo.clave, etiqueta: grupo.etiqueta, saldo, saldoAcumulado, cuentas };
    });
}

// Trae los movimientos ponderados por el % de prorrateo de cada cuenta hacia
// cada centro de costo — base compartida por libroCentrosCosto y balanceCentrosCosto.
async function movimientosPorCentroCosto(ejercicio, empresa) {
  const { rows } = await pool.query(
    `SELECT p.centro_de_costo, cc.descripcion AS centro_descripcion, p.porcentaje,
            m.cuenta, c.descripcion AS cuenta_descripcion, a.fecha, a.numero, m.leyenda, m.debe, m.haber
       FROM cnt_prorrateo p
       JOIN cnt_centro_de_costo cc ON cc.id = p.centro_de_costo AND cc.empresa = p.empresa
       JOIN cnt_movimiento m ON m.cuenta = p.cuenta AND m.empresa = p.empresa
       JOIN cnt_asiento a    ON a.ejercicio = m.ejercicio AND a.numero = m.numero AND a.empresa = m.empresa
       JOIN cnt_cuenta c     ON c.id = m.cuenta AND c.empresa = m.empresa
      WHERE p.empresa = $2 AND m.ejercicio = $1
      ORDER BY p.centro_de_costo, a.fecha, a.numero`,
    [ejercicio, empresa]
  );
  return rows.map(r => {
    const factor = num(r.porcentaje) / 100;
    return { ...r, debe: num(r.debe) * factor, haber: num(r.haber) * factor };
  });
}

async function libroCentrosCosto(ejercicio, empresa) {
  const rows = await movimientosPorCentroCosto(ejercicio, empresa);
  const centrosMap = new Map();
  for (const r of rows) {
    if (!centrosMap.has(r.centro_de_costo)) {
      centrosMap.set(r.centro_de_costo, { centro_de_costo: r.centro_de_costo, descripcion: r.centro_descripcion, debe: 0, haber: 0, movimientos: [] });
    }
    const grupo = centrosMap.get(r.centro_de_costo);
    grupo.debe += r.debe;
    grupo.haber += r.haber;
    grupo.movimientos.push({
      fecha: r.fecha, numero: r.numero, cuenta: r.cuenta, cuenta_descripcion: r.cuenta_descripcion,
      leyenda: r.leyenda, debe: r.debe, haber: r.haber, saldoAcumulado: grupo.debe - grupo.haber,
    });
  }
  return [...centrosMap.values()].map(g => ({ ...g, saldo: g.debe - g.haber }));
}

// Incluye todos los centros de costo de la empresa, aunque no tengan prorrateo
// cargado (salen en 0) — mismo criterio que balanceSumasYSaldos con las cuentas.
async function balanceCentrosCosto(ejercicio, empresa) {
  const ponderados = await movimientosPorCentroCosto(ejercicio, empresa);
  const totales = new Map();
  for (const r of ponderados) {
    const prev = totales.get(r.centro_de_costo) ?? 0;
    totales.set(r.centro_de_costo, prev + r.debe - r.haber);
  }
  const { rows: centros } = await pool.query(
    'SELECT id, descripcion FROM cnt_centro_de_costo WHERE empresa = $1 ORDER BY orden NULLS LAST, id',
    [empresa]
  );
  return centros.map(c => ({ centro_de_costo: c.id, descripcion: c.descripcion, saldo: totales.get(c.id) ?? 0 }));
}

module.exports = { mayorCuentas, balanceGeneral, balanceSumasYSaldos, libroDiarioAcumulado, libroCentrosCosto, balanceCentrosCosto };
