require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSessionFactory = require('connect-pg-simple');
const pool = require('./config/db');

const app = express();
const PgSession = pgSessionFactory(session);

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(session({
  store: new PgSession({ pool, tableName: 'sys_sesion', createTableIfMissing: false }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 8 * 60 * 60 * 1000 },
}));

app.use('/api', require('./routes'));

const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

module.exports = app;
