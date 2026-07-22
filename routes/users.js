const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/db');
const { isAuthenticated, hasRole } = require('../middleware/auth');

const router = express.Router();

const SAFE_FIELDS = 'id, name, username, role, branch_id, is_active';

// GET /api/users — ADMIN only
router.get('/', isAuthenticated, hasRole(['ADMIN']), (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT u.id, u.name, u.username, u.role, u.is_active, b.name AS branch_name
    FROM users u LEFT JOIN branches b ON b.id = u.branch_id
    ORDER BY u.name
  `).all();
  return res.json(users);
});

// POST /api/users — ADMIN only
router.post(
  '/',
  isAuthenticated,
  hasRole(['ADMIN']),
  [
    body('name').trim().notEmpty(),
    body('username').trim().notEmpty(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('role').isIn(['ADMIN', 'MANAGER', 'CASHIER']),
    body('branch_id').optional({ nullable: true }).isInt({ min: 1 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, username, password, role, branch_id = null } = req.body;
    const db = getDb();

    try {
      const hash = bcrypt.hashSync(password, 10);
      const result = db.prepare(`
        INSERT INTO users (name, username, password_hash, role, branch_id) VALUES (?, ?, ?, ?, ?)
      `).run(name, username, hash, role, branch_id);

      const user = db.prepare(`SELECT ${SAFE_FIELDS} FROM users WHERE id = ?`).get(result.lastInsertRowid);
      return res.status(201).json(user);
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Username already taken.' });
      }
      throw err;
    }
  }
);

// PATCH /api/users/:id — ADMIN only (toggle active, change role/branch)
router.patch(
  '/:id',
  isAuthenticated,
  hasRole(['ADMIN']),
  (req, res) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found.' });

    const { name, role, branch_id, is_active, password } = req.body;

    let passwordHash = existing.password_hash;
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password too short.' });
      passwordHash = bcrypt.hashSync(password, 10);
    }

    db.prepare(`
      UPDATE users SET
        name          = COALESCE(?, name),
        role          = COALESCE(?, role),
        branch_id     = COALESCE(?, branch_id),
        is_active     = COALESCE(?, is_active),
        password_hash = ?
      WHERE id = ?
    `).run(name, role, branch_id, is_active, passwordHash, req.params.id);

    const updated = db.prepare(`SELECT ${SAFE_FIELDS} FROM users WHERE id = ?`).get(req.params.id);
    return res.json(updated);
  }
);

// GET /api/branches — available to all authenticated users
router.get('/branches', isAuthenticated, (req, res) => {
  const db = getDb();
  return res.json(db.prepare('SELECT * FROM branches ORDER BY name').all());
});

module.exports = router;
