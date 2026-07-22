const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/db');
const { isAuthenticated, hasRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/products — all roles
router.get('/', isAuthenticated, (req, res) => {
  const db = getDb();
  const { search, category_id } = req.query;

  let sql = `
    SELECT p.*, c.name AS category_name
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    sql += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category_id) {
    sql += ' AND p.category_id = ?';
    params.push(category_id);
  }
  sql += ' ORDER BY p.name ASC';

  const products = db.prepare(sql).all(...params);
  return res.json(products);
});

// GET /api/products/categories
router.get('/categories', isAuthenticated, (req, res) => {
  const db = getDb();
  const cats = db.prepare('SELECT * FROM categories ORDER BY name').all();
  return res.json(cats);
});

// POST /api/products — ADMIN only
router.post(
  '/',
  isAuthenticated,
  hasRole(['ADMIN']),
  [
    body('category_id').isInt({ min: 1 }).withMessage('Valid category_id required.'),
    body('sku').trim().notEmpty().withMessage('SKU is required.'),
    body('name').trim().notEmpty().withMessage('Product name is required.'),
    body('unit_price').isFloat({ min: 0 }).withMessage('unit_price must be >= 0.'),
    body('unit_of_measure').trim().notEmpty().withMessage('Unit of measure is required.'),
    body('reorder_level').optional().isInt({ min: 0 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { category_id, sku, name, unit_price, unit_of_measure, reorder_level = 10 } = req.body;
    const db = getDb();

    try {
      const result = db.prepare(`
        INSERT INTO products (category_id, sku, name, unit_price, unit_of_measure, reorder_level)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(category_id, sku, name, unit_price, unit_of_measure, reorder_level);

      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
      return res.status(201).json(product);
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'SKU already exists.' });
      }
      throw err;
    }
  }
);

// PUT /api/products/:id — ADMIN only
router.put(
  '/:id',
  isAuthenticated,
  hasRole(['ADMIN']),
  [
    body('unit_price').optional().isFloat({ min: 0 }),
    body('reorder_level').optional().isInt({ min: 0 }),
    body('name').optional().trim().notEmpty(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDb();
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found.' });

    const { name, unit_price, unit_of_measure, reorder_level, category_id } = req.body;

    db.prepare(`
      UPDATE products SET
        name            = COALESCE(?, name),
        unit_price      = COALESCE(?, unit_price),
        unit_of_measure = COALESCE(?, unit_of_measure),
        reorder_level   = COALESCE(?, reorder_level),
        category_id     = COALESCE(?, category_id)
      WHERE id = ?
    `).run(name, unit_price, unit_of_measure, reorder_level, category_id, req.params.id);

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    return res.json(updated);
  }
);

module.exports = router;
