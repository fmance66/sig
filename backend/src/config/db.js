const { Pool } = require('pg');

// DATABASE_URL (Neon/Supabase) en producción; variables sueltas para el Postgres local de Docker.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     process.env.DB_PORT     || 5432,
      database: process.env.DB_NAME     || 'sueldos',
      user:     process.env.DB_USER     || 'sueldos',
      password: process.env.DB_PASSWORD || 'sueldos123',
    });

module.exports = pool;
