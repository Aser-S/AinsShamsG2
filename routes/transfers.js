const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/db');
const { isAuthenticated, hasRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/transfers
router.post(
  '/',
  isAuthenticated,
  hasRole(['ADMIN', 'MANAGER']),
  [
    body('from_branch_id').isInt({ min: 1 }),
    body('to_branch_id').isInt({ min: 1 }),
    body('items').isArray({ min: 1 }),
    body('items.*.product_id').isInt({ min: 1 }),
    body('items.*.quantity').isInt({ min: 1 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDb();
    const { id: initiated_by, role, branch_id } = req.session.user;
    const { from_branch_id, to_branch_id, items } = req.body;

    if (from_branch_id === to_branch_id) {
      return res.status(400).json({ error: 'Source and destination branch must differ.' });
    }
    if (role === 'MANAGER' && from_branch_id !== branch_id) {
      return res.status(403).json({ error: 'Managers can only initiate transfers from their own branch.' });
    }

    try {
      db.exec('BEGIN');

      db.prepare(`
        INSERT INTO stock_transfers (from_branch_id, to_branch_id, initiated_by, status)
        VALUES (?, ?, ?, 'IN_TRANSIT')
      `).run(from_branch_id, to_branch_id, initiated_by);

      const transferId = db.prepare('SELECT last_insert_rowid() AS id').get().id;

      const insertItem  = db.prepare('INSERT INTO transfer_items (transfer_id, product_id, quantity) VALUES (?, ?, ?)');
      const deductStock = db.prepare('UPDATE branch_inventory SET quantity = quantity - ? WHERE branch_id = ? AND product_id = ?');

      for (const item of items) {
        const inv     = db.prepare('SELECT * FROM branch_inventory WHERE branch_id = ? AND product_id = ?').get(from_branch_id, item.product_id);
        const product = db.prepare('SELECT name FROM products WHERE id = ?').get(item.product_id);

        if (!inv || inv.quantity < item.quantity) {
          throw Object.assign(
            new Error(`Insufficient stock for "${product ? product.name : item.product_id}".`),
            { status: 409 }
          );
        }
        insertItem.run(transferId, item.product_id, item.quantity);
        deductStock.run(item.quantity, from_branch_id, item.product_id);
      }

      db.exec('COMMIT');
      return res.status(201).json(db.prepare('SELECT * FROM stock_transfers WHERE id = ?').get(transferId));

    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (_) {}
      return res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// GET /api/transfers
router.get('/', isAuthenticated, hasRole(['ADMIN', 'MANAGER']), (req, res) => {
  const db = getDb();
  const { role, branch_id } = req.session.user;

  let sql = `
    SELECT st.*,
      fb.name AS from_branch_name, tb.name AS to_branch_name,
      u.name  AS initiated_by_name
    FROM stock_transfers st
    JOIN branches fb ON fb.id = st.from_branch_id
    JOIN branches tb ON tb.id = st.to_branch_id
    JOIN users    u  ON u.id  = st.initiated_by
  `;
  const params = [];
  if (role === 'MANAGER') {
    sql += ' WHERE (st.from_branch_id = ? OR st.to_branch_id = ?)';
    params.push(branch_id, branch_id);
  }
  sql += ' ORDER BY st.created_at DESC';
  return res.json(db.prepare(sql).all(...params));
});

// PATCH /api/transfers/:id/status
router.patch(
  '/:id/status',
  isAuthenticated,
  hasRole(['ADMIN', 'MANAGER']),
  [body('status').isIn(['COMPLETED', 'CANCELLED'])],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDb();
    const { role, branch_id } = req.session.user;
    const { status } = req.body;

    const transfer = db.prepare('SELECT * FROM stock_transfers WHERE id = ?').get(req.params.id);
    if (!transfer) return res.status(404).json({ error: 'Transfer not found.' });
    if (transfer.status !== 'IN_TRANSIT') return res.status(400).json({ error: `Transfer is already ${transfer.status}.` });
    if (role === 'MANAGER' && transfer.to_branch_id !== branch_id) {
      return res.status(403).json({ error: 'You can only receive transfers to your own branch.' });
    }

    try {
      db.exec('BEGIN');
      db.prepare('UPDATE stock_transfers SET status = ? WHERE id = ?').run(status, transfer.id);

      const transferItems = db.prepare('SELECT * FROM transfer_items WHERE transfer_id = ?').all(transfer.id);

      if (status === 'COMPLETED') {
        const upsert = db.prepare(`
          INSERT INTO branch_inventory (branch_id, product_id, quantity) VALUES (?, ?, ?)
          ON CONFLICT(branch_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity
        `);
        for (const item of transferItems) upsert.run(transfer.to_branch_id, item.product_id, item.quantity);
      } else if (status === 'CANCELLED') {
        const restore = db.prepare('UPDATE branch_inventory SET quantity = quantity + ? WHERE branch_id = ? AND product_id = ?');
        for (const item of transferItems) restore.run(item.quantity, transfer.from_branch_id, item.product_id);
      }

      db.exec('COMMIT');
      return res.json(db.prepare('SELECT * FROM stock_transfers WHERE id = ?').get(transfer.id));

    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (_) {}
      return res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
