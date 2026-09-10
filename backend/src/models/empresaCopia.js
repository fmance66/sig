const pool = require('../config/db');

// Copia la "configuración" de una empresa a otra: fórmulas de conceptos y diseño de
// recibo/libro (ver memoria project_multiempresa_filtro_faltante — origen del proyecto:
// cada empresa era una BBDD MySQL separada, así que una empresa nueva arranca sin nada
// de esto cargado). El resto de catálogos (convenio, categoría, grupo, grupo_de_conceptos,
// obra social, sindicato, etc.) ya son globales — no tienen columna `empresa`, así que una
// empresa nueva ya los ve sin necesidad de copiar nada.
//
// modo 'reemplazar': borra la configuración actual del destino antes de copiar (los FK
// ON DELETE CASCADE de sld_concepto/_lsd/_general/_grupo/_de_grupo y de
// sld_formulario_recibo/libro -> _parametro hacen que un solo DELETE alcance).
// modo 'combinar': inserta solo lo que no exista ya en el destino (ON CONFLICT DO NOTHING
// por id/nombre) y no toca lo que el destino ya tenía cargado.

// Devuelve el estado por categoría (no un solo booleano) para que el frontend pueda
// preguntar reemplazar/combinar solo sobre las categorías que el usuario efectivamente
// eligió copiar, no sobre las 3 siempre.
async function tieneConfiguracion(empresa) {
  const { rows } = await pool.query(
    `SELECT
       EXISTS(SELECT 1 FROM sld_concepto WHERE empresa = $1) AS conceptos,
       EXISTS(SELECT 1 FROM sld_formulario_recibo WHERE empresa = $1) AS formularios_recibo,
       EXISTS(SELECT 1 FROM sld_formulario_libro WHERE empresa = $1) AS formularios_libro,
       EXISTS(SELECT 1 FROM cnt_cuenta WHERE empresa = $1) AS contabilidad`,
    [empresa]
  );
  const r = rows[0];
  return {
    conceptos: r.conceptos, formulariosRecibo: r.formularios_recibo, formulariosLibro: r.formularios_libro,
    contabilidad: r.contabilidad,
  };
}

async function copiarConceptos(client, origen, destino) {
  await client.query(
    `INSERT INTO sld_concepto
       (id, empresa, id_afip, descripcion, columna, simbolo_unidad, decimales_unidad, unidad_visible,
        simbolo_unitario, decimales_unitario, unitario_visible, simbolo_afip, campo_unidad, leyenda_unidad,
        campo_importe, leyenda_importe, formula_unidad, formula_importe, formula_unitario, formula_condicion,
        activo, orden, clase)
     SELECT id, $2, id_afip, descripcion, columna, simbolo_unidad, decimales_unidad, unidad_visible,
        simbolo_unitario, decimales_unitario, unitario_visible, simbolo_afip, campo_unidad, leyenda_unidad,
        campo_importe, leyenda_importe, formula_unidad, formula_importe, formula_unitario, formula_condicion,
        activo, orden, clase
     FROM sld_concepto WHERE empresa = $1
     ON CONFLICT (id, empresa) DO NOTHING`,
    [origen, destino]
  );

  await client.query(
    `INSERT INTO sld_concepto_lsd
       (concepto, empresa, aporte_sipa, aporte_inssjyp, aporte_obrasocial, aporte_fsr, aporte_uatre,
        aporte_diferencial, aporte_regespecial, aporte_libre1, aporte_libre2, contribucion_sipa,
        contribucion_inssjyp, contribucion_obrasocial, contribucion_fsr, contribucion_renatre,
        contribucion_aaff, contribucion_fne, contribucion_lrt, contribucion_libre1, contribucion_libre2,
        repetible)
     SELECT concepto, $2, aporte_sipa, aporte_inssjyp, aporte_obrasocial, aporte_fsr, aporte_uatre,
        aporte_diferencial, aporte_regespecial, aporte_libre1, aporte_libre2, contribucion_sipa,
        contribucion_inssjyp, contribucion_obrasocial, contribucion_fsr, contribucion_renatre,
        contribucion_aaff, contribucion_fne, contribucion_lrt, contribucion_libre1, contribucion_libre2,
        repetible
     FROM sld_concepto_lsd WHERE empresa = $1
     ON CONFLICT (concepto, empresa) DO NOTHING`,
    [origen, destino]
  );

  await client.query(
    `INSERT INTO sld_concepto_general
       (concepto, empresa, liquidacion, recibo, descripcion, unidad_manual, importe_manual,
        vigencia_desde, vigencia_hasta, orden)
     SELECT concepto, $2, liquidacion, recibo, descripcion, unidad_manual, importe_manual,
        vigencia_desde, vigencia_hasta, orden
     FROM sld_concepto_general WHERE empresa = $1
     ON CONFLICT (concepto, liquidacion, recibo, empresa) DO NOTHING`,
    [origen, destino]
  );

  await client.query(
    `INSERT INTO sld_concepto_grupo (grupo, concepto, empresa)
     SELECT grupo, concepto, $2
     FROM sld_concepto_grupo WHERE empresa = $1
     ON CONFLICT (grupo, concepto, empresa) DO NOTHING`,
    [origen, destino]
  );

  await client.query(
    `INSERT INTO sld_concepto_de_grupo
       (grupo_de_conceptos, concepto, empresa, liquidacion, recibo, descripcion, unidad_manual,
        importe_manual, vigencia_desde, vigencia_hasta, orden)
     SELECT grupo_de_conceptos, concepto, $2, liquidacion, recibo, descripcion, unidad_manual,
        importe_manual, vigencia_desde, vigencia_hasta, orden
     FROM sld_concepto_de_grupo WHERE empresa = $1
     ON CONFLICT (grupo_de_conceptos, concepto, liquidacion, recibo, empresa) DO NOTHING`,
    [origen, destino]
  );
}

// sld_formulario_recibo/libro usan id SERIAL (compartido entre TODAS las empresas, no
// reiniciado por empresa) y nombre único por empresa — no se puede copiar el id tal cual,
// hay que insertar y remappear el id nuevo a sus parámetros. formulario_hermano (auto-
// referencia a otro diseño) no se usa desde el frontend (ver DisenoFormularioPage/
// formulario.js) así que deliberadamente no se copia, queda NULL en el destino.
async function copiarFormularios(client, origen, destino, tabla, parametroTabla, camposCopiar, forzarInactivo) {
  const { rows: origenRows } = await client.query(
    `SELECT id, ${camposCopiar.join(', ')} FROM ${tabla} WHERE empresa = $1`,
    [origen]
  );

  for (const row of origenRows) {
    const cols = ['empresa', ...camposCopiar];
    const vals = [destino, ...camposCopiar.map(c => (forzarInactivo && c === 'activo') ? false : row[c])];
    const ph = cols.map((_, i) => `$${i + 1}`);
    const { rows: inserted } = await client.query(
      `INSERT INTO ${tabla} (${cols.join(',')}) VALUES (${ph.join(',')})
       ON CONFLICT (empresa, nombre) DO NOTHING
       RETURNING id`,
      vals
    );
    if (!inserted.length) continue; // ya existía un formulario con ese nombre en destino (modo combinar)

    const nuevoId = inserted[0].id;
    const { rows: parametros } = await client.query(
      `SELECT parametro, descripcion, texto, x, y, ancho, alto, orden, alignment, font,
              border_color, background_color, auto_height, print, condicion
       FROM ${parametroTabla} WHERE formulario = $1`,
      [row.id]
    );
    for (const p of parametros) {
      await client.query(
        `INSERT INTO ${parametroTabla}
           (formulario, parametro, descripcion, texto, x, y, ancho, alto, orden,
            alignment, font, border_color, background_color, auto_height, print, condicion)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [nuevoId, p.parametro, p.descripcion, p.texto, p.x, p.y, p.ancho, p.alto, p.orden,
          p.alignment, p.font, p.border_color, p.background_color, p.auto_height, p.print, p.condicion]
      );
    }
  }
}

// Plan de Cuentas (Cuentas, Centros de Costo, Prorrateo, Asientos Modelo) —
// NO copia cnt_ejercicio/cnt_asiento/cnt_leyenda (dato transaccional, no
// configuración; mismo criterio que el propio legacy en "Exportación de
// Tablas", donde esas filas no tienen tilde de selección).
//
// cnt_cuenta se auto-referencia por id_padre: se inserta primero sin id_padre
// (para no depender del orden en que aparecen las filas) y en un segundo paso
// se completa id_padre ya con todas las filas presentes en el destino.
async function copiarContabilidad(client, origen, destino) {
  await client.query(
    `INSERT INTO cnt_cuenta
       (id, empresa, descripcion, saldo, naturaleza, imputable, monetaria, tipo, jerarquia, nivel, leyenda, orden, id_padre)
     SELECT id, $2, descripcion, saldo, naturaleza, imputable, monetaria, tipo, jerarquia, nivel, leyenda, orden, NULL
     FROM cnt_cuenta WHERE empresa = $1
     ON CONFLICT (id, empresa) DO NOTHING`,
    [origen, destino]
  );
  await client.query(
    `UPDATE cnt_cuenta AS dest SET id_padre = src.id_padre
       FROM cnt_cuenta AS src
      WHERE src.empresa = $1 AND dest.empresa = $2 AND dest.id = src.id AND src.id_padre IS NOT NULL`,
    [origen, destino]
  );

  await client.query(
    `INSERT INTO cnt_centro_de_costo (id, empresa, descripcion, orden)
     SELECT id, $2, descripcion, orden FROM cnt_centro_de_costo WHERE empresa = $1
     ON CONFLICT (id, empresa) DO NOTHING`,
    [origen, destino]
  );

  await client.query(
    `INSERT INTO cnt_prorrateo (cuenta, centro_de_costo, empresa, porcentaje)
     SELECT cuenta, centro_de_costo, $2, porcentaje FROM cnt_prorrateo WHERE empresa = $1
     ON CONFLICT (cuenta, centro_de_costo, empresa) DO NOTHING`,
    [origen, destino]
  );

  await client.query(
    `INSERT INTO cnt_asiento_modelo (id, empresa, descripcion, leyenda)
     SELECT id, $2, descripcion, leyenda FROM cnt_asiento_modelo WHERE empresa = $1
     ON CONFLICT (id, empresa) DO NOTHING`,
    [origen, destino]
  );

  await client.query(
    `INSERT INTO cnt_modelo_movimiento (modelo, linea, empresa, cuenta, saldo, leyenda)
     SELECT modelo, linea, $2, cuenta, saldo, leyenda FROM cnt_modelo_movimiento WHERE empresa = $1
     ON CONFLICT (modelo, linea, empresa) DO NOTHING`,
    [origen, destino]
  );
}

const CAMPOS_FORMULARIO_RECIBO = [
  'nombre', 'descripcion', 'orientacion', 'pagina', 'margen_superior', 'margen_inferior',
  'margen_izquierdo', 'margen_derecho', 'formula_archivo', 'columnas', 'filas', 'copias',
  'propiedad', 'etiquetas', 'orden', 'activo', 'modelo_fijo',
];
const CAMPOS_FORMULARIO_LIBRO = [
  'nombre', 'descripcion', 'orientacion', 'pagina', 'margen_superior', 'margen_inferior',
  'margen_izquierdo', 'margen_derecho', 'formula_archivo', 'columnas', 'filas', 'copias',
  'propiedad', 'etiquetas', 'orden',
];

async function copiarConfiguracion({ origen, destino, modo, incluir = {} }) {
  origen = Number(origen);
  destino = Number(destino);
  if (!origen || !destino) throw Object.assign(new Error('origen y destino son requeridos'), { status: 400 });
  if (origen === destino) throw Object.assign(new Error('La empresa origen y destino no pueden ser la misma'), { status: 400 });
  if (!['reemplazar', 'combinar'].includes(modo)) {
    throw Object.assign(new Error('modo debe ser "reemplazar" o "combinar"'), { status: 400 });
  }
  const incluirConceptos = incluir.conceptos !== false;
  const incluirFormulariosRecibo = incluir.formulariosRecibo !== false;
  const incluirFormulariosLibro = incluir.formulariosLibro !== false;
  const incluirContabilidad = incluir.contabilidad !== false;
  if (!incluirConceptos && !incluirFormulariosRecibo && !incluirFormulariosLibro && !incluirContabilidad) {
    throw Object.assign(new Error('Elegí al menos una categoría para copiar'), { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (modo === 'reemplazar') {
      if (incluirConceptos) await client.query('DELETE FROM sld_concepto WHERE empresa = $1', [destino]);
      if (incluirFormulariosRecibo) await client.query('DELETE FROM sld_formulario_recibo WHERE empresa = $1', [destino]);
      if (incluirFormulariosLibro) await client.query('DELETE FROM sld_formulario_libro WHERE empresa = $1', [destino]);
      if (incluirContabilidad) {
        // cnt_centro_de_costo/cnt_asiento_modelo cascadean a cnt_prorrateo/cnt_modelo_movimiento.
        await client.query('DELETE FROM cnt_asiento_modelo WHERE empresa = $1', [destino]);
        await client.query('DELETE FROM cnt_centro_de_costo WHERE empresa = $1', [destino]);
        await client.query('DELETE FROM cnt_cuenta WHERE empresa = $1', [destino]);
      }
    }

    if (incluirConceptos) await copiarConceptos(client, origen, destino);
    if (incluirContabilidad) await copiarContabilidad(client, origen, destino);

    // En modo combinar, si el destino ya tiene un formulario "activo" (el que arma el PDF
    // real), un formulario copiado también activo violaría el índice único parcial
    // sld_formulario_recibo_activo_uk — se copia inactivo y el usuario lo activa a mano si quiere.
    const forzarInactivo = modo === 'combinar';
    if (incluirFormulariosRecibo) {
      await copiarFormularios(client, origen, destino, 'sld_formulario_recibo', 'sld_formulario_recibo_parametro',
        CAMPOS_FORMULARIO_RECIBO, forzarInactivo);
    }
    if (incluirFormulariosLibro) {
      await copiarFormularios(client, origen, destino, 'sld_formulario_libro', 'sld_formulario_libro_parametro',
        CAMPOS_FORMULARIO_LIBRO, false);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { copiarConfiguracion, tieneConfiguracion };
