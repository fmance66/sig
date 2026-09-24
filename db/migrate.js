// Aplica las migraciones pendientes de postgresql/migrations/*.sql contra
// DATABASE_URL (Neon en producción) o el Postgres local de Docker si no está
// seteada — mismo criterio que backend/src/config/db.js.
//
// Lleva registro de lo ya aplicado en la tabla schema_migrations, así no hay
// que comparar a mano qué migración le falta a cada base (lo que hubo que
// hacer manualmente la primera vez que se sincronizó Neon, ver memoria
// project_deploy_neon_sync).
//
// Uso:
//   node db/migrate.js                                    (contra el Docker local)
//   DATABASE_URL="postgresql://...neon..." node db/migrate.js   (contra producción)
const fs = require('fs');
const path = require('path');
const { Pool } = require('../backend/node_modules/pg');

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({ host: 'localhost', port: 5432, database: 'sueldos', user: 'sueldos', password: 'sueldos123' });

const MIGRATIONS_DIR = path.join(__dirname, 'postgresql', 'migrations');

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await pool.query('SELECT filename FROM schema_migrations');
  const aplicadas = new Set(rows.map(r => r.filename));

  const archivos = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  const pendientes = archivos.filter(f => !aplicadas.has(f));

  if (!pendientes.length) {
    console.log('No hay migraciones pendientes.');
    await pool.end();
    return;
  }

  console.log(`Migraciones pendientes: ${pendientes.join(', ')}`);
  for (const f of pendientes) {
    console.log(`=== Aplicando ${f} ===`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    try {
      // Cada archivo trae su propio BEGIN/COMMIT.
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [f]);
      console.log('OK');
    } catch (err) {
      console.error('ERROR:', err.message);
      console.error(`Se detuvo en ${f}. Las migraciones anteriores ya quedaron aplicadas y registradas.`);
      process.exit(1);
    }
  }
  console.log('=== TODAS LAS MIGRACIONES PENDIENTES QUEDARON APLICADAS ===');
  await pool.end();
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
