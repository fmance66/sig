const pool = require('../config/db');

function validar(req, res) {
  const { empresa, periodo } = req.query;
  if (!empresa) { res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' }); return false; }
  if (!periodo) { res.status(400).json({ estado: 'error', mensaje: 'periodo es requerido' }); return false; }
  return true;
}

// Comprobantes del período con neto/iva/exento/total y razón social/CUIT de la persona
// (mismo criterio de JOIN que el listado de comprobantes: si iva_comprobante.razon_social
// quedó vacío, se usa el de iva_persona).
async function libro(req, res) {
  try {
    if (!validar(req, res)) return;
    const { modulo, empresa, periodo } = req.query;
    const { rows } = await pool.query(
      `SELECT c.modulo, c.tipo, c.comprobante, c.fecha, c.periodo,
              COALESCE(p.razon_social, c.razon_social) AS razon_social,
              COALESCE(p.numero_documento, c.numero_documento) AS numero_documento,
              c.neto, c.exento, c.nogravado, c.iva, c.total, c.anulado,
              tc.descripcion AS tipo_descripcion
       FROM iva_comprobante c
       LEFT JOIN iva_persona p ON p.modulo = c.modulo AND p.id = c.persona AND p.empresa = c.empresa
       LEFT JOIN iva_tipo_comprobante tc ON tc.id = c.tipo AND tc.empresa = c.empresa
       WHERE c.empresa = $1 AND c.periodo = $2
         AND ($3::text IS NULL OR c.modulo = $3)
       ORDER BY c.fecha, c.comprobante`,
      [empresa, periodo, modulo || null]
    );
    res.json({ estado: 'ok', registros: rows.length, resultado: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener el libro I.V.A.' });
  }
}

// Agrupado por condición de I.V.A. de la persona, sumando neto/iva/exento/nogravado.
async function resumen(req, res) {
  try {
    if (!validar(req, res)) return;
    const { modulo, empresa, periodo } = req.query;
    const { rows } = await pool.query(
      `SELECT p.condicion_iva, COALESCE(bci.descripcion, 'Sin condición') AS condicion_iva_descripcion,
              COALESCE(SUM(c.neto), 0) AS neto, COALESCE(SUM(c.iva), 0) AS iva,
              COALESCE(SUM(c.exento), 0) AS exento, COALESCE(SUM(c.nogravado), 0) AS nogravado,
              COUNT(*) AS comprobantes
       FROM iva_comprobante c
       LEFT JOIN iva_persona p ON p.modulo = c.modulo AND p.id = c.persona AND p.empresa = c.empresa
       LEFT JOIN bas_condicion_iva bci ON bci.id = p.condicion_iva
       WHERE c.empresa = $1 AND c.periodo = $2
         AND ($3::text IS NULL OR c.modulo = $3)
       GROUP BY p.condicion_iva, bci.descripcion
       ORDER BY bci.descripcion NULLS LAST`,
      [empresa, periodo, modulo || null]
    );
    res.json({ estado: 'ok', resultado: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener el resumen por condición de I.V.A.' });
  }
}

// Aproximación de la Declaración Jurada de I.V.A.: Débito Fiscal (Ventas) y Crédito
// Fiscal (Compras) del período. No incluye Retenciones/Percepciones/Saldo de Libre
// Disponibilidad (fuera de esta fase, ver plan).
async function ddjj(req, res) {
  try {
    const { empresa, periodo } = req.query;
    if (!empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    if (!periodo) return res.status(400).json({ estado: 'error', mensaje: 'periodo es requerido' });

    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(neto) FILTER (WHERE modulo = 'VENTA'), 0)   AS total_neto_ventas,
         COALESCE(SUM(exento) FILTER (WHERE modulo = 'VENTA'), 0) AS total_exento_ventas,
         COALESCE(SUM(iva) FILTER (WHERE modulo = 'VENTA'), 0)    AS total_debito_fiscal,
         COALESCE(SUM(neto) FILTER (WHERE modulo = 'COMPRA'), 0)   AS total_neto_compras,
         COALESCE(SUM(exento) FILTER (WHERE modulo = 'COMPRA'), 0) AS total_exento_compras,
         COALESCE(SUM(iva) FILTER (WHERE modulo = 'COMPRA'), 0)    AS total_credito_fiscal
       FROM iva_comprobante
       WHERE empresa = $1 AND periodo = $2`,
      [empresa, periodo]
    );
    const r = rows[0];
    const totalDebitoFiscal = Number(r.total_debito_fiscal);
    const totalCreditoFiscal = Number(r.total_credito_fiscal);
    res.json({
      estado: 'ok',
      resultado: {
        totalNetoVentas: Number(r.total_neto_ventas),
        totalExentoVentas: Number(r.total_exento_ventas),
        totalDebitoFiscal,
        totalNetoCompras: Number(r.total_neto_compras),
        totalExentoCompras: Number(r.total_exento_compras),
        totalCreditoFiscal,
        saldoTecnico: totalDebitoFiscal - totalCreditoFiscal,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener la declaración jurada de I.V.A.' });
  }
}

module.exports = { libro, resumen, ddjj };
