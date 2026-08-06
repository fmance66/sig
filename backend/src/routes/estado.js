const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ estado: 'ok', db: 'conectada' });
  } catch (err) {
    res.status(500).json({ estado: 'error', db: 'desconectada', detalle: err.message });
  }
});

module.exports = router;
