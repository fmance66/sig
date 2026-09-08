const pool = require('../config/db');

// "Interfaz Usuario / Liquidación de SyJ - DJ F931 (.TXT)" (LSDiseInterfazLiquidacion.pdf,
// ARCA) — registros '01' (cabecera del envío), '02' (referencial del trabajador) y '03'
// (detalle de conceptos liquidados). El registro '04' (bases imponibles topeadas para la
// DJ F931) queda para la Fase 3 — ver [[project_libro_sueldos_digital_derogado]] en memoria,
// requiere aplicar sld_tope_previsional a un cálculo previsional que todavía no existe acá.
//
// Supuestos documentados (a confirmar con el cliente/contador antes de subir un archivo real):
// - "Identificación del envío" siempre 'SJ' (liquidación + datos DJ F931, no rectificativa).
// - "Número de liquidación" fijo en '00001' — no hay en el sistema un contador de reenvíos/
//   rectificativas de una misma liquidación.
// - "Cantidad de días para proporcionar tope" siempre '000' (mes completo) — altas/bajas a
//   mitad de período no se proporcionan todavía.
// - "Fecha de rúbrica" siempre en blanco (la rúbrica del libro ya no aplica, Decreto 407/2026).
// - "Forma de pago" se infiere de si el empleado tiene CBU cargado (3=acreditación, si no 1=efectivo).
// - "Indicador Débito/Crédito" del registro 03 sale del signo de sld_recibo_concepto.importe.

const TIPO_LIQUIDACION = {
  MENSUAL: 'M', QUINCENA_1: 'Q', QUINCENA_2: 'Q',
  AGUINALDO: 'M', VACACIONES: 'M', RENUNCIA: 'M', DESPIDO: 'M', OTROS: 'M',
};

function soloDigitos(s) {
  return (s ?? '').toString().replace(/\D/g, '');
}

function padNum(valor, len) {
  return soloDigitos(valor).slice(-len).padStart(len, '0');
}

function padAlfa(valor, len) {
  return (valor ?? '').toString().slice(0, len).padEnd(len, ' ');
}

// El período de sld_liquidacion es texto libre y mezcla dos formatos ("MM/AAAA" y
// "1ra Quinc. MM/AAAA" / "2da Quinc. MM/AAAA" — ver PeriodoSelect.jsx / reciboIprofesional.js),
// no el AAAAMM que pide ARCA. Se extrae mes/año del texto para armar el período del registro '01'.
function periodoAAAAMM(periodo) {
  const m = (periodo ?? '').match(/(\d{1,2})\/(\d{4})/);
  if (!m) return '000000';
  return `${m[2]}${m[1].padStart(2, '0')}`;
}

function fechaAAAAMMDD(fecha) {
  if (!fecha) return ' '.repeat(8);
  const d = new Date(fecha);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function montoFijo(valor, len) {
  const entero = Math.round(Math.abs(Number(valor) || 0) * 100);
  return String(entero).padStart(len, '0').slice(-len);
}

// ARCA solo reconoce: (blanco) $ % A(año) M(mes) Q(quincena) S(semanal) D(días) H(horas).
// simbolo_unidad es texto libre cargado a mano en Conceptos ("Días","Dto.","cuota", etc.) —
// se mapea lo reconocible y el resto queda en blanco.
function unidadCodigo(simbolo) {
  const s = (simbolo ?? '').trim().toLowerCase();
  if (s === '$') return '$';
  if (s === '%') return '%';
  if (/^d[ií]as?$/.test(s)) return 'D';
  if (/^h(oras?|s)$/.test(s)) return 'H';
  if (/^a[ñn]os?$/.test(s)) return 'A';
  if (/^mes(es)?$/.test(s)) return 'M';
  if (/^quin/.test(s)) return 'Q';
  if (/^sem/.test(s)) return 'S';
  return ' ';
}

// El campo 8 es la cantidad de registros '04' informados (no la cantidad de
// empleados/registros '02') — como todavía no se genera el registro '04'
// (Fase 3, pendiente), siempre va en 0. Si se pone la cantidad de empleados
// acá, ARCA rechaza el archivo por no coincidir con los '04' encontrados.
function registro01({ cuit, periodo, tipo }) {
  return [
    '01',
    padNum(cuit, 11),
    'SJ',
    periodo,
    TIPO_LIQUIDACION[tipo] || 'M',
    '00001',
    '30',
    padNum(0, 6),
  ].join('');
}

function registro02(e) {
  return [
    '02',
    padNum(e.cuil, 11),
    padAlfa(e.legajo, 10),
    padAlfa('', 50), // dependencia de revista — no modelada
    padAlfa(e.cbu, 22),
    '000', // cantidad de días para proporcionar tope
    fechaAAAAMMDD(e.fecha_pago),
    ' '.repeat(8), // fecha de rúbrica — ya no aplica
    e.cbu ? '3' : '1',
  ].join('');
}

function registro03(cuil, c) {
  return [
    '03',
    padNum(cuil, 11),
    padAlfa(c.concepto, 10),
    montoFijo(c.unidad, 5),
    unidadCodigo(c.simbolo_unidad),
    montoFijo(c.importe, 15),
    Number(c.importe) < 0 ? 'D' : 'C',
    ' '.repeat(6), // período de ajuste retroactivo
  ].join('');
}

async function generar(empresa, periodo) {
  const liquidacion = (await pool.query(
    `SELECT tipo, fecha_pago FROM sld_liquidacion WHERE periodo = $1 AND empresa = $2`,
    [periodo, empresa]
  )).rows[0];
  if (!liquidacion) return null;

  const empresaRow = (await pool.query(`SELECT cuit FROM sys_empresa WHERE id = $1`, [empresa])).rows[0];

  const empleados = (await pool.query(
    `SELECT DISTINCT e.id, e.legajo, e.cuil, e.cbu
       FROM sld_empleado e
       JOIN sld_recibo r ON r.empleado = e.id AND r.periodo = $1 AND r.empresa = $2
      ORDER BY e.legajo`,
    [periodo, empresa]
  )).rows;

  const conceptos = (await pool.query(
    `SELECT r.empleado, rc.concepto, rc.unidad, rc.importe, c.simbolo_unidad
       FROM sld_recibo_concepto rc
       JOIN sld_recibo r ON r.periodo = rc.periodo AND r.empleado = rc.empleado
                         AND r.numero = rc.numero AND r.empresa = rc.empresa
       LEFT JOIN sld_concepto c ON c.id = rc.concepto AND c.empresa = rc.empresa
      WHERE rc.periodo = $1 AND rc.empresa = $2
      ORDER BY r.empleado, rc.orden`,
    [periodo, empresa]
  )).rows;

  const lineas = [
    registro01({ cuit: empresaRow?.cuit, periodo: periodoAAAAMM(periodo), tipo: liquidacion.tipo }),
  ];

  const conceptosPorEmpleado = new Map();
  for (const c of conceptos) {
    if (!conceptosPorEmpleado.has(c.empleado)) conceptosPorEmpleado.set(c.empleado, []);
    conceptosPorEmpleado.get(c.empleado).push(c);
  }

  for (const e of empleados) {
    lineas.push(registro02({ ...e, fecha_pago: liquidacion.fecha_pago }));
    for (const c of conceptosPorEmpleado.get(e.id) ?? []) {
      lineas.push(registro03(e.cuil, c));
    }
  }

  // Sin \r\n final: un trailing newline hace que muchos parsers de ancho fijo
  // (incluido el validador de ARCA) vean una línea vacía extra al final del
  // archivo y la rechacen por "tipo de Registro inválido".
  return lineas.join('\r\n');
}

module.exports = { generar, periodoAAAAMM };
