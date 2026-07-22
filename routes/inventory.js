const express = require('express');
const { getDb } = require('../config/db');
const { isAuthenticated, hasRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/inventory — full inventory (ADMIN/MANAGER see all; CASHIER sees own branch)
router.get('/', isAuthenticated, (req, res) => {
  const db = getDb();
  const { role, branch_id } = req.session.user;

  let sql = `
    SELECT
      bi.id, bi.quantity,
      b.id   AS branch_id,   b.name AS branch_name,
      p.id   AS product_id,  p.name AS product_name, p.sku,
      p.unit_price, p.unit_of_measure, p.reorder_level,
      c.name AS category_name
    FROM branch_inventory bi
    JOIN branches b ON b.id = bi.branch_id
    JOIN products p ON p.id = bi.product_id
    JOIN categories c ON c.id = p.category_id
  `;
  const params = [];

  if (role === 'CASHIER') {
    sql += ' WHERE bi.branch_id = ?';
    params.push(branch_id);
  }

  sql += ' ORDER BY b.name, p.name';
  return res.json(db.prepare(sql).all(...params));
});

// GET /api/inventory/low-stock — ADMIN + MANAGER
router.get('/low-stock', isAuthenticated, hasRole(['ADMIN', 'MANAGER']), (req, res) => {
  const db = getDb();
  const { role, branch_id } = req.session.user;

  let sql = `
    SELECT
      bi.quantity,
      b.id AS branch_id, b.name AS branch_name,
      p.id AS product_id, p.name AS product_name, p.sku,
      p.reorder_level, p.unit_of_measure
    FROM branch_inventory bi
    JOIN branches b ON b.id = bi.branch_id
    JOIN products p ON p.id = bi.product_id
    WHERE bi.quantity <= p.reorder_level
  `;
  const params = [];

  if (role === 'MANAGER') {
    sql += ' AND bi.branch_id = ?';
    params.push(branch_id);
  }

  sql += ' ORDER BY (p.reorder_level - bi.quantity) DESC';
  return res.json(db.prepare(sql).all(...params));
});

// GET /api/inventory/branch/:branchId — all roles (CASHIER restricted to own branch by middleware)
router.get('/branch/:branchId', isAuthenticated, (req, res) => {
  const db = getDb();
  const { role, branch_id } = req.session.user;
  const requestedBranch = parseInt(req.params.branchId, 10);

  // CASHIER can only view their own branch
  if (role === 'CASHIER' && requestedBranch !== branch_id) {
    return res.status(403).json({ error: 'Forbidden. You can only view your own branch inventory.' });
  }

  const inventory = db.prepare(`
    SELECT
      bi.id, bi.quantity,
      p.id AS product_id, p.name AS product_name, p.sku,
      p.unit_price, p.unit_of_measure, p.reorder_level,
      c.name AS category_name
    FROM branch_inventory bi
    JOIN products p ON p.id = bi.product_id
    JOIN categories c ON c.id = p.category_id
    WHERE bi.branch_id = ?
    ORDER BY p.name
  `).all(requestedBranch);

  return res.json(inventory);
});

module.exports = router;
