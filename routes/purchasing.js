const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/db');
const { isAuthenticated, hasRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/suppliers
router.get('/suppliers', isAuthenticated, (req, res) => {
  return res.json(getDb().prepare('SELECT * FROM suppliers ORDER BY company_name').all());
});

// POST /api/suppliers
router.post('/suppliers', isAuthenticated, hasRole(['ADMIN']),
  [body('company_name').trim().notEmpty()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDb();
    const { company_name, contact_person, phone, email } = req.body;
    db.prepare('INSERT INTO suppliers (company_name, contact_person, phone, email) VALUES (?, ?, ?, ?)').run(
      company_name, contact_person || null, phone || null, email || null
    );
    const id = db.prepare('SELECT last_insert_rowid() AS id').get().id;
    return res.status(201).json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id));
  }
);

// GET /api/purchase-orders
router.get('/purchase-orders', isAuthenticated, hasRole(['ADMIN', 'MANAGER']), (req, res) => {
  const db = getDb();
  const { role, branch_id } = req.session.user;

  let sql = `
    SELECT po.*, s.company_name AS supplier_name, b.name AS branch_name, u.name AS created_by_name
    FROM purchase_orders po
    JOIN suppliers s ON s.id = po.supplier_id
    JOIN branches  b ON b.id = po.branch_id
    JOIN users     u ON u.id = po.created_by
  `;
  const params = [];
  if (role === 'MANAGER') { sql += ' WHERE po.branch_id = ?'; params.push(branch_id); }
  sql += ' ORDER BY po.created_at DESC';

  const orders   = db.prepare(sql).all(...params);
  const getItems = db.prepare(`
    SELECT pi.*, p.name AS product_name, p.sku
    FROM po_items pi JOIN products p ON p.id = pi.product_id
    WHERE pi.purchase_order_id = ?
  `);
  return res.json(orders.map(o => ({ ...o, items: getItems.all(o.id) })));
});

// POST /api/purchase-orders
router.post('/purchase-orders', isAuthenticated, hasRole(['ADMIN', 'MANAGER']),
  [
    body('supplier_id').isInt({ min: 1 }),
    body('branch_id').isInt({ min: 1 }),
    body('items').isArray({ min: 1 }),
    body('items.*.product_id').isInt({ min: 1 }),
    body('items.*.quantity_ordered').isInt({ min: 1 }),
    body('items.*.unit_cost').isFloat({ min: 0 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDb();
    const { id: created_by, role, branch_id: userBranch } = req.session.user;
    const { supplier_id, branch_id, items } = req.body;

    if (role === 'MANAGER' && branch_id !== userBranch) {
      return res.status(403).json({ error: 'Managers can only create POs for their own branch.' });
    }

    try {
      db.exec('BEGIN');
      const total_amount = items.reduce((s, i) => s + i.unit_cost * i.quantity_ordered, 0);

      db.prepare(`
        INSERT INTO purchase_orders (supplier_id, branch_id, created_by, status, total_amount)
        VALUES (?, ?, ?, 'ORDERED', ?)
      `).run(supplier_id, branch_id, created_by, total_amount);

      const poId = db.prepare('SELECT last_insert_rowid() AS id').get().id;
      const insertItem = db.prepare(
        'INSERT INTO po_items (purchase_order_id, product_id, quantity_ordered, unit_cost) VALUES (?, ?, ?, ?)'
      );
      for (const item of items) insertItem.run(poId, item.product_id, item.quantity_ordered, item.unit_cost);

      db.exec('COMMIT');

      const po    = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(poId);
      const poItems = db.prepare(`
        SELECT pi.*, p.name AS product_name FROM po_items pi
        JOIN products p ON p.id = pi.product_id WHERE pi.purchase_order_id = ?
      `).all(poId);
      return res.status(201).json({ ...po, items: poItems });

    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (_) {}
      return res.status(500).json({ error: err.message });
    }
  }
);

// PATCH /api/purchase-orders/:id/receive
router.patch('/purchase-orders/:id/receive', isAuthenticated, hasRole(['ADMIN', 'MANAGER']), (req, res) => {
  const db = getDb();
  const { role, branch_id } = req.session.user;

  const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
  if (!po) return res.status(404).json({ error: 'Purchase order not found.' });
  if (po.status !== 'ORDERED') return res.status(400).json({ error: `PO is already ${po.status}.` });
  if (role === 'MANAGER' && po.branch_id !== branch_id) return res.status(403).json({ error: 'Forbidden.' });

  try {
    db.exec('BEGIN');
    db.prepare("UPDATE purchase_orders SET status = 'RECEIVED' WHERE id = ?").run(po.id);

    const poItems = db.prepare('SELECT * FROM po_items WHERE purchase_order_id = ?').all(po.id);
    const upsert  = db.prepare(`
      INSERT INTO branch_inventory (branch_id, product_id, quantity) VALUES (?, ?, ?)
      ON CONFLICT(branch_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity
    `);
    for (const item of poItems) upsert.run(po.branch_id, item.product_id, item.quantity_ordered);
    db.prepare('UPDATE po_items SET quantity_received = quantity_ordered WHERE purchase_order_id = ?').run(po.id);

    db.exec('COMMIT');
    return res.json(db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(po.id));

  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
