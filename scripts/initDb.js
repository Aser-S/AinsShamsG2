/**
 * Database initialization script.
 * Uses Node.js built-in node:sqlite (Node 22+) — no native compilation needed.
 * Run with: node scripts/initDb.js
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH  = path.join(DATA_DIR, 'app.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  -- 1. Branches
  CREATE TABLE IF NOT EXISTS branches (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    location    TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- 2. Users
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK(role IN ('ADMIN','MANAGER','CASHIER')),
    branch_id     INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    is_active     INTEGER NOT NULL DEFAULT 1
  );

  -- 3. Categories
  CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    description TEXT
  );

  -- 4. Products
  CREATE TABLE IF NOT EXISTS products (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id     INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    sku             TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    unit_price      REAL NOT NULL CHECK(unit_price >= 0),
    unit_of_measure TEXT NOT NULL DEFAULT 'pcs',
    reorder_level   INTEGER NOT NULL DEFAULT 10
  );

  -- 5. Branch Inventory
  CREATE TABLE IF NOT EXISTS branch_inventory (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id   INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity    INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
    UNIQUE(branch_id, product_id)
  );

  -- 6. Suppliers
  CREATE TABLE IF NOT EXISTS suppliers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name    TEXT NOT NULL,
    contact_person  TEXT,
    phone           TEXT,
    email           TEXT
  );

  -- 7. Purchase Orders
  CREATE TABLE IF NOT EXISTS purchase_orders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id  INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    branch_id    INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    created_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status       TEXT NOT NULL DEFAULT 'ORDERED' CHECK(status IN ('DRAFT','ORDERED','RECEIVED','CANCELLED')),
    total_amount REAL NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- 8. PO Items
  CREATE TABLE IF NOT EXISTS po_items (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id   INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id          INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_ordered    INTEGER NOT NULL CHECK(quantity_ordered > 0),
    quantity_received   INTEGER NOT NULL DEFAULT 0,
    unit_cost           REAL NOT NULL CHECK(unit_cost >= 0)
  );

  -- 9. Sales
  CREATE TABLE IF NOT EXISTS sales (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id       INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    cashier_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    subtotal        REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    total_amount    REAL NOT NULL DEFAULT 0,
    customer_name   TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- 10. Sale Items
  CREATE TABLE IF NOT EXISTS sale_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id     INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity    INTEGER NOT NULL CHECK(quantity > 0),
    unit_price  REAL NOT NULL CHECK(unit_price >= 0),
    subtotal    REAL NOT NULL DEFAULT 0
  );

  -- 11. Stock Transfers
  CREATE TABLE IF NOT EXISTS stock_transfers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    from_branch_id  INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    to_branch_id    INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    initiated_by    INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status          TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','IN_TRANSIT','COMPLETED','CANCELLED')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- 12. Transfer Items
  CREATE TABLE IF NOT EXISTS transfer_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_id INTEGER NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity    INTEGER NOT NULL CHECK(quantity > 0)
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_users_branch      ON users(branch_id);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_branch  ON branch_inventory(branch_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_product ON branch_inventory(product_id);
  CREATE INDEX IF NOT EXISTS idx_sales_branch      ON sales(branch_id);
  CREATE INDEX IF NOT EXISTS idx_sales_cashier     ON sales(cashier_id);
  CREATE INDEX IF NOT EXISTS idx_sales_date        ON sales(created_at);
  CREATE INDEX IF NOT EXISTS idx_po_branch         ON purchase_orders(branch_id);
  CREATE INDEX IF NOT EXISTS idx_transfer_from     ON stock_transfers(from_branch_id);
  CREATE INDEX IF NOT EXISTS idx_transfer_to       ON stock_transfers(to_branch_id);
`);

console.log('✅ Database schema created at:', DB_PATH);
db.close();
