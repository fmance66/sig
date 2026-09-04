const pool = require('../config/db');
const { calcularRecibo } = require('../services/reciboCalculo');

async function listEmpleadosCandidatos({ legajo, convenio, grupo, categoria, estado, provincia, ingresoDesde, ingresoHasta, empresa } = {}) {
  const { rows } = await pool.query(
    `SELECT e.id, e.legajo, e.apellido, e.nombre, e.grupo, e.tarea, e.lugar_trabajo, e.convenio, e.categoria, e.provincia
     FROM sld_empleado e
     WHERE ($1::text IS NULL OR e.legajo ILIKE '%'||$1||'%')
       AND ($2::text IS NULL OR e.convenio = $2)
       AND ($3::text IS NULL OR e.grupo ILIKE '%'||$3||'%')
       AND ($4::text IS NULL OR e.categoria = $4)
       AND ($5::text IS NULL OR e.estado = $5)
       AND ($6::text IS NULL OR e.provincia = $6)
       AND ($7::date IS NULL OR e.fecha_ingreso >= $7)
       AND ($8::date IS NULL OR e.fecha_ingreso <= $8)
       AND ($9::integer IS NULL OR e.empresa = $9)
     ORDER BY e.orden NULLS LAST, e.apellido, e.nombre`,
    [legajo || null, convenio || null, grupo || null, categoria || null, estado || null,
      provincia || null, ingresoDesde || null, ingresoHasta || null, empresa ? Number(empresa) : null]
  );
  return rows;
}

async function conceptosAplicables(empleado, tipoLiquidacion, numero) {
  const [generales, deGrupo, individuales] = await Promise.all([
    pool.query(
      `SELECT concepto, descripcion, unidad_manual, importe_manual, orden
       FROM sld_concepto_general WHERE empresa = $1 AND liquidacion = $2 AND (recibo = 0 OR recibo = $3)`,
      [empleado.empresa, tipoLiquidacion, numero]
    ),
    empleado.grupo_de_conceptos
      ? pool.query(
        `SELECT concepto, descripcion, unidad_manual, importe_manual, orden
         FROM sld_concepto_de_grupo WHERE grupo_de_conceptos = $1 AND empresa = $2 AND liquidacion = $3 AND (recibo = 0 OR recibo = $4)`,
        [empleado.grupo_de_conceptos, empleado.empresa, tipoLiquidacion, numero]
      )
      : Promise.resolve({ rows: [] }),
    pool.query(
      `SELECT concepto, descripcion, unidad_manual, importe_manual, orden
       FROM sld_empleado_concepto WHERE empleado = $1 AND liquidacion = $2 AND (recibo = 0 OR recibo = $3)`,
      [empleado.id, tipoLiquidacion, numero]
    ),
  ]);

  const map = new Map();
  for (const row of generales.rows) map.set(row.concepto, { ...row, origen: 'general' });
  for (const row of deGrupo.rows) map.set(row.concepto, { ...row, origen: 'grupo' });
  for (const row of individuales.rows) map.set(row.concepto, { ...row, origen: 'individual' });
  return [...map.values()];
}

async function snapshotReciboEmpleado(empleado, fecha) {
  await pool.query(
    `INSERT INTO sld_recibo_empleado
       (empleado, fecha, tarea, convenio, categoria, sueldo, adicional, auxiliar,
        dias, horas, porcentaje, jornada, liquidacion, obra_social, sindicato)
     SELECT id, $2, tarea, convenio, categoria, sueldo, adicional, auxiliar,
            dias, horas, porcentaje, jornada, liquidacion, obra_social, sindicato
     FROM sld_empleado WHERE id = $1
     ON CONFLICT (empleado, fecha) DO NOTHING`,
    [empleado, fecha]
  );
}

async function generar({ periodo, empleados, conceptosIndividuales, saldoCero }) {
  const liquidacionRes = await pool.query('SELECT * FROM sld_liquidacion WHERE periodo = $1', [periodo]);
  const liquidacion = liquidacionRes.rows[0];
  if (!liquidacion) throw Object.assign(new Error('La liquidación (período) no existe'), { status: 404 });

  const resumen = { creados: 0, actualizados: 0, omitidos: 0, errores: [] };

  for (const empleadoId of empleados) {
    try {
      const empRes = await pool.query('SELECT * FROM sld_empleado WHERE id = $1', [empleadoId]);
      const empleado = empRes.rows[0];
      if (!empleado) { resumen.errores.push({ empleado: empleadoId, mensaje: 'Empleado no encontrado' }); continue; }

      const existeRes = await pool.query(
        'SELECT numero FROM sld_recibo WHERE periodo = $1 AND empleado = $2 ORDER BY numero LIMIT 1',
        [periodo, empleadoId]
      );
      const yaExistia = existeRes.rows.length > 0;
      const numero = yaExistia ? existeRes.rows[0].numero : 1;

      if (!yaExistia) {
        await pool.query(
          `INSERT INTO sld_recibo (periodo, empleado, numero, periodo_recibo, fecha_recibo, fecha_pago)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [periodo, empleadoId, numero, liquidacion.descripcion || periodo, liquidacion.fecha, liquidacion.fecha_pago]
        );
      }

      const fechaSnapshot = liquidacion.fecha || new Date();
      await snapshotReciboEmpleado(empleadoId, fechaSnapshot);

      const conceptos = await conceptosAplicables(
        { ...empleado, id: empleadoId },
        liquidacion.tipo,
        numero
      );

      const conceptosFiltrados = conceptosIndividuales === false
        ? conceptos.filter(c => c.origen !== 'individual')
        : conceptos;

      for (const c of conceptosFiltrados) {
        await pool.query(
          `INSERT INTO sld_recibo_concepto
             (periodo, empleado, numero, concepto, descripcion, unidad_manual, importe_manual, unidad, importe, condicion, orden, empresa)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$6,$7,TRUE,$8,$9)
           ON CONFLICT (periodo, empleado, numero, concepto) DO UPDATE
             SET unidad_manual = EXCLUDED.unidad_manual, importe_manual = EXCLUDED.importe_manual`,
          [periodo, empleadoId, numero, c.concepto, c.descripcion, c.unidad_manual, c.importe_manual, c.orden, empleado.empresa]
        );
      }

      const resultado = await calcularRecibo(periodo, empleadoId, numero);

      if (saldoCero && resultado.recibo.sueldo_neto != 0) {
        await pool.query('DELETE FROM sld_recibo WHERE periodo = $1 AND empleado = $2 AND numero = $3', [periodo, empleadoId, numero]);
        resumen.omitidos++;
        continue;
      }

      if (yaExistia) resumen.actualizados++; else resumen.creados++;
    } catch (err) {
      console.error(err);
      resumen.errores.push({ empleado: empleadoId, mensaje: err.message });
    }
  }

  return resumen;
}

module.exports = { listEmpleadosCandidatos, generar };
