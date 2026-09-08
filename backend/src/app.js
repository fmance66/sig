require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSessionFactory = require('connect-pg-simple');
const pool = require('./config/db');

const app = express();
const PgSession = pgSessionFactory(session);
const isProd = process.env.NODE_ENV === 'production';

// Render está detrás de un proxy TLS; sin esto express-session no marca la cookie "secure".
if (isProd) app.set('trust proxy', 1);

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(session({
  store: new PgSession({ pool, tableName: 'sys_sesion', createTableIfMissing: false }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // Frontend (Vercel) y backend (Render) son dominios distintos: la cookie de sesión
    // necesita SameSite=None + Secure para viajar cross-site; en local http no aplica.
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: 8 * 60 * 60 * 1000,
  },
}));

app.use('/api', require('./routes'));

// Solo aplica al modo "todo en un proceso" (instalación local, ver DESPLIEGUE.md).
// En Render el frontend se despliega aparte (Vercel) y este build no existe.
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

module.exports = app;
