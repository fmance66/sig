const express = require('express');
const router  = express.Router();
const pool = require('../config/db');

// Catálogo fijo de AFIP (global, sin empresa) — de referencia para el combo de
// "Tipo AFIP" en la pestaña Letras de Tipo de Comprobante. Sin CRUD en esta fase.
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, descripcion, orden FROM iva_tipo_afip ORDER BY orden NULLS LAST, id'
    );
    res.json({ estado: 'ok', registros: rows.length, resultado: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener tipos AFIP' });
  }
});

module.exports = router;
