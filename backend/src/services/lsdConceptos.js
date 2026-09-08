const pool = require('../config/db');

// "Interfase de Usuario / Relación conceptos de sueldo Empleador - ARCA (.TXT)"
// (LSDiseInterfazConceptos.pdf, ARCA) — línea de ancho fijo, 195 caracteres.
// Los campos "Libre" (posiciones 15, 17, 19, 22 y el bloque final de 9) están
// reservados por ARCA sin significado definido y se dejan en blanco.
const LEN = { codigoArca: 6, codigoEmpleador: 10, descripcion: 150 };

function pad(valor, len) {
  return (valor ?? '').toString().slice(0, len).padEnd(len, ' ');
}

function flag(valor) {
  return valor ? '1' : '0';
}

function armarLinea(c) {
  return [
    pad(c.id_afip, LEN.codigoArca),
    pad(c.id, LEN.codigoEmpleador),
    pad(c.descripcion, LEN.descripcion),
    flag(c.repetible),
    flag(c.aporte_sipa), flag(c.contribucion_sipa),
    flag(c.aporte_inssjyp), flag(c.contribucion_inssjyp),
    flag(c.aporte_obrasocial), flag(c.contribucion_obrasocial),
    flag(c.aporte_fsr), flag(c.contribucion_fsr),
    flag(c.aporte_renatre), flag(c.contribucion_renatre),
    ' ', // Libre
    flag(c.contribucion_aaff),
    ' ', // Libre
    flag(c.contribucion_fne),
    ' ', // Libre
    flag(c.contribucion_lrt),
    flag(c.aporte_diferencial),
    ' ', // Libre
    flag(c.aporte_regespecial),
    ' '.repeat(9), // Libre
  ].join('');
}

async function generar(empresa) {
  const { rows } = await pool.query(
    `SELECT c.id, c.id_afip, c.descripcion,
            COALESCE(l.repetible, false)          repetible,
            COALESCE(l.aporte_sipa, false)         aporte_sipa,
            COALESCE(l.contribucion_sipa, false)   contribucion_sipa,
            COALESCE(l.aporte_inssjyp, false)      aporte_inssjyp,
            COALESCE(l.contribucion_inssjyp, false) contribucion_inssjyp,
            COALESCE(l.aporte_obrasocial, false)   aporte_obrasocial,
            COALESCE(l.contribucion_obrasocial, false) contribucion_obrasocial,
            COALESCE(l.aporte_fsr, false)          aporte_fsr,
            COALESCE(l.contribucion_fsr, false)    contribucion_fsr,
            COALESCE(l.aporte_renatre, false)      aporte_renatre,
            COALESCE(l.contribucion_renatre, false) contribucion_renatre,
            COALESCE(l.contribucion_aaff, false)   contribucion_aaff,
            COALESCE(l.contribucion_fne, false)    contribucion_fne,
            COALESCE(l.contribucion_lrt, false)    contribucion_lrt,
            COALESCE(l.aporte_diferencial, false)  aporte_diferencial,
            COALESCE(l.aporte_regespecial, false)  aporte_regespecial
       FROM sld_concepto c
       LEFT JOIN sld_concepto_lsd l ON l.concepto = c.id AND l.empresa = c.empresa
      WHERE c.empresa = $1 AND c.activo = true
      ORDER BY c.id`,
    [empresa]
  );
  // Sin \r\n final: un trailing newline hace que muchos parsers de ancho fijo
  // vean una línea vacía extra al final del archivo y la rechacen.
  return rows.map(armarLinea).join('\r\n');
}

module.exports = { generar };
