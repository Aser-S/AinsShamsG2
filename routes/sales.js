const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/db');
const { isAuthenticated, hasRole } = require('../middleware/auth');

const router = express.Router();

const MAX_DISCOUNT = { CASHIER: 10, MANAGER: 50, ADMIN: 100 };

// POST /api/sales
router.post(
  '/',
  isAuthenticated,
  [
    body('items').isArray({ min: 1 }),
    body('items.*.product_id').isInt({ min: 1 }),
    body('items.*.quantity').isInt({ min: 1 }),
    body('discount_percent').optional().isFloat({ min: 0, max: 100 }),
    body('customer_name').optional().trim(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDb();
    const { id: cashier_id, role, branch_id } = req.session.user;
    const { items, discount_percent = 0, customer_name = null } = req.body;

    const maxPct = MAX_DISCOUNT[role] || 0;
    if (discount_percent > maxPct) {
      return res.status(400).json({ error: `Your role (${role}) allows a maximum discount of ${maxPct}%.` });
    }

    try {
      db.exec('BEGIN');

      let subtotal = 0;
      const lineItems = [];

      for (const item of items) {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
        if (!product) throw Object.assign(new Error(`Product ${item.product_id} not found.`), { status: 404 });

        const inv = db.prepare(
          'SELECT * FROM branch_inventory WHERE branch_id = ? AND product_id = ?'
        ).get(branch_id, item.product_id);

        if (!inv || inv.quantity < item.quantity) {
          throw Object.assign(
            new Error(`Insufficient stock for "${product.name}". Available: ${inv ? inv.quantity : 0}.`),
            { status: 409 }
          );
        }

        const lineSubtotal = product.unit_price * item.quantity;
        subtotal += lineSubtotal;
        lineItems.push({ product, quantity: item.quantity, unit_price: product.unit_price, subtotal: lineSubtotal });
      }

      const discount_amount = parseFloat(((subtotal * discount_percent) / 100).toFixed(2));
      const total_amount    = parseFloat((subtotal - discount_amount).toFixed(2));

      db.prepare(`
        INSERT INTO sales (branch_id, cashier_id, subtotal, discount_amount, total_amount, customer_name)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(branch_id, cashier_id, subtotal, discount_amount, total_amount, customer_name);

      const saleId = db.prepare('SELECT last_insert_rowid() AS id').get().id;

      const insertItem  = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)');
      const deductStock = db.prepare('UPDATE branch_inventory SET quantity = quantity - ? WHERE branch_id = ? AND product_id = ?');

      for (const li of lineItems) {
        insertItem.run(saleId, li.product.id, li.quantity, li.unit_price, li.subtotal);
        deductStock.run(li.quantity, branch_id, li.product.id);
      }

      db.exec('COMMIT');

      const sale = db.prepare(`
        SELECT s.*, b.name AS branch_name
        FROM sales s JOIN branches b ON b.id = s.branch_id
        WHERE s.id = ?
      `).get(saleId);

      const saleItems = db.prepare(`
        SELECT si.*, p.name AS product_name, p.sku
        FROM sale_items si JOIN products p ON p.id = si.product_id
        WHERE si.sale_id = ?
      `).all(saleId);

      return res.status(201).json({ ...sale, items: saleItems });

    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (_) {}
      return res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// GET /api/sales/daily-summary
router.get('/daily-summary', isAuthenticated, hasRole(['ADMIN', 'MANAGER']), (req, res) => {
  const db = getDb();
  const { role, branch_id } = req.session.user;
  const { date, branch_id: queryBranch } = req.query;

  const targetDate = date || new Date().toISOString().slice(0, 10);

  let sql = `
    SELECT
      DATE(s.created_at) AS sale_date,
      b.name             AS branch_name,
      u.name             AS cashier_name,
      COUNT(s.id)        AS total_transactions,
      SUM(s.subtotal)    AS total_subtotal,
      SUM(s.discount_amount) AS total_discounts,
      SUM(s.total_amount)    AS total_revenue
    FROM sales s
    JOIN branches b ON b.id = s.branch_id
    JOIN users    u ON u.id = s.cashier_id
    WHERE DATE(s.created_at) = ?
  `;
  const params = [targetDate];

  if (role === 'MANAGER') {
    sql += ' AND s.branch_id = ?';
    params.push(branch_id);
  } else if (queryBranch) {
    sql += ' AND s.branch_id = ?';
    params.push(queryBranch);
  }
  sql += ' GROUP BY sale_date, b.name, u.name ORDER BY b.name, u.name';

  return res.json(db.prepare(sql).all(...params));
});

// GET /api/sales/:id
router.get('/:id', isAuthenticated, (req, res) => {
  const db = getDb();
  const { role, branch_id } = req.session.user;
  const sale = db.prepare(`
    SELECT s.*, b.name AS branch_name
    FROM sales s JOIN branches b ON b.id = s.branch_id WHERE s.id = ?
  `).get(req.params.id);

  if (!sale) return res.status(404).json({ error: 'Sale not found.' });
  if (role === 'CASHIER' && sale.branch_id !== branch_id) return res.status(403).json({ error: 'Forbidden.' });

  const items = db.prepare(`
    SELECT si.*, p.name AS product_name, p.sku
    FROM sale_items si JOIN products p ON p.id = si.product_id WHERE si.sale_id = ?
  `).all(req.params.id);

  return res.json({ ...sale, items });
});

module.exports = router;
