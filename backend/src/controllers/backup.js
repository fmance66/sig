const { spawn } = require('child_process');

// La base corre en el contenedor Docker de db/docker-compose.yml, no en este
// proceso — por eso pg_dump/psql se ejecutan con "docker exec" en vez de
// invocarlos directo (el host no tiene por qué tener los binarios de Postgres).
const CONTAINER = process.env.DB_CONTAINER || 'sueldos_db';
const DB_USER   = process.env.DB_USER      || 'sueldos';
const DB_NAME   = process.env.DB_NAME      || 'sueldos';

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function generar(req, res) {
  const proc = spawn('docker', ['exec', CONTAINER, 'pg_dump', '-U', DB_USER, '-d', DB_NAME, '--clean', '--if-exists']);
  const chunks = [];
  let stderr = '';
  let respondido = false;

  proc.stdout.on('data', chunk => chunks.push(chunk));
  proc.stderr.on('data', chunk => { stderr += chunk; });

  proc.on('error', err => {
    console.error(err);
    if (respondido) return;
    respondido = true;
    res.status(500).json({ estado: 'error', mensaje: 'No se pudo ejecutar pg_dump (¿Docker está corriendo?)' });
  });

  proc.on('close', code => {
    if (respondido) return;
    respondido = true;
    if (code !== 0) {
      console.error(stderr);
      return res.status(500).json({ estado: 'error', mensaje: 'Error al generar la copia de seguridad' });
    }
    const buf = Buffer.concat(chunks);
    res.set('Content-Type', 'application/sql');
    res.set('Content-Disposition', `attachment; filename="sueldos_backup_${timestamp()}.sql"`);
    res.send(buf);
  });
}

async function restaurar(req, res) {
  const sql = req.body;
  if (typeof sql !== 'string' || !sql.trim()) {
    return res.status(400).json({ estado: 'error', mensaje: 'El archivo de copia de seguridad está vacío o no es válido' });
  }

  const proc = spawn('docker', ['exec', '-i', CONTAINER, 'psql', '-U', DB_USER, '-d', DB_NAME, '-v', 'ON_ERROR_STOP=1']);
  let stderr = '';
  let respondido = false;

  proc.stderr.on('data', chunk => { stderr += chunk; });

  proc.on('error', err => {
    console.error(err);
    if (respondido) return;
    respondido = true;
    res.status(500).json({ estado: 'error', mensaje: 'No se pudo ejecutar psql (¿Docker está corriendo?)' });
  });

  proc.on('close', code => {
    if (respondido) return;
    respondido = true;
    if (code !== 0) {
      console.error(stderr);
      return res.status(500).json({ estado: 'error', mensaje: stderr.trim().slice(-500) || 'Error al restaurar la copia de seguridad' });
    }
    res.json({ estado: 'ok', mensaje: 'Copia de seguridad restaurada correctamente' });
  });

  proc.stdin.write(sql);
  proc.stdin.end();
}

module.exports = { generar, restaurar };
