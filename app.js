require('dotenv').config();

const express  = require('express');
const session     = require('express-session');
const helmet   = require('helmet');
const path     = require('path');
const fs       = require('fs');

const { apiLimiter }  = require('./middleware/rateLimiter');
const errorHandler    = require('./middleware/errorHandler');
const { isAuthenticated } = require('./middleware/auth');

// ── Route modules ─────────────────────────────────────────────────────────────
const authRoutes      = require('./routes/auth');
const productRoutes   = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes     = require('./routes/sales');
const transferRoutes  = require('./routes/transfers');
const purchasingRoutes = require('./routes/purchasing');
const userRoutes      = require('./routes/users');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", 'cdn.tailwindcss.com'],
      styleSrc:   ["'self'", "'unsafe-inline'", 'cdn.tailwindcss.com', 'fonts.googleapis.com'],
      fontSrc:    ["'self'", 'fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:'],
    },
  },
}));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Session store (file-backed, no native deps) ───────────────────────────────
const FileStore = require('session-file-store')(session);
const SESSION_STORE_DIR = path.join(__dirname, 'data', 'sessions');
if (!fs.existsSync(SESSION_STORE_DIR)) fs.mkdirSync(SESSION_STORE_DIR, { recursive: true });

app.use(session({
  store: new FileStore({
    path:       SESSION_STORE_DIR,
    ttl:        8 * 60 * 60,  // 8 hours in seconds
    retries:    1,
    logFn:      () => {},     // silence verbose file-store logs
  }),
  secret:            process.env.SESSION_SECRET || 'change-this-secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   8 * 60 * 60 * 1000, // 8 hours
  },
}));

// ── Static files ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API rate limiting ─────────────────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/products',       productRoutes);
app.use('/api/inventory',      inventoryRoutes);
app.use('/api/sales',          salesRoutes);
app.use('/api/transfers',      transferRoutes);
app.use('/api',                purchasingRoutes);   // /api/suppliers, /api/purchase-orders
app.use('/api/users',          userRoutes);

// ── HTML Page Routes ──────────────────────────────────────────────────────────
const VIEWS = path.join(__dirname, 'views');

// Public
app.get('/login', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/dashboard');
  res.sendFile(path.join(VIEWS, 'login.html'));
});

// Protected pages
app.get(['/', '/dashboard'],      isAuthenticated, (req, res) => res.sendFile(path.join(VIEWS, 'dashboard.html')));
app.get('/pos',                   isAuthenticated, (req, res) => res.sendFile(path.join(VIEWS, 'pos.html')));
app.get('/inventory',             isAuthenticated, (req, res) => res.sendFile(path.join(VIEWS, 'inventory.html')));
app.get('/transfers',             isAuthenticated, (req, res) => res.sendFile(path.join(VIEWS, 'transfers.html')));
app.get('/purchasing',            isAuthenticated, (req, res) => res.sendFile(path.join(VIEWS, 'purchasing.html')));
app.get('/reports',               isAuthenticated, (req, res) => res.sendFile(path.join(VIEWS, 'reports.html')));
app.get('/users',                 isAuthenticated, (req, res) => res.sendFile(path.join(VIEWS, 'users.html')));

// Catch-all → login
app.get('*', (req, res) => res.redirect('/login'));

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀  Sales & Inventory System running at http://localhost:${PORT}`);
  console.log(`    Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`    Login page  : http://localhost:${PORT}/login\n`);
});

module.exports = app;
