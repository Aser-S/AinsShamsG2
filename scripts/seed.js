/**
 * Seed script — uses Node.js built-in node:sqlite
 * Run: node scripts/seed.js
 */

require('dotenv').config();
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path   = require('path');
const fs     = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH  = path.join(DATA_DIR, 'app.db');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database not found. Run "npm run db:init" first.');
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON");

// ── Data ──────────────────────────────────────────────────────────────────────

const branches = [
  { name: 'Downtown HQ',   location: '123 Main Street, City Center' },
  { name: 'North Branch',  location: '45 Northern Ave, North District' },
  { name: 'South Branch',  location: '78 South Blvd, South Side' },
  { name: 'East Branch',   location: '22 East Road, East Quarter' },
  { name: 'West Branch',   location: '99 West Lane, West End' },
  { name: 'Airport Kiosk', location: 'Terminal 2, International Airport' },
];

const categories = [
  { name: 'Beverages',          description: 'Drinks, juices, water, sodas' },
  { name: 'Snacks',             description: 'Chips, crackers, nuts' },
  { name: 'Dairy',              description: 'Milk, cheese, yogurt' },
  { name: 'Bakery',             description: 'Bread, pastries, cakes' },
  { name: 'Frozen Foods',       description: 'Ice cream, frozen meals' },
  { name: 'Personal Care',      description: 'Soap, shampoo, toiletries' },
  { name: 'Household',          description: 'Cleaning supplies, detergents' },
  { name: 'Stationery',         description: 'Pens, notebooks, office supplies' },
  { name: 'Electronics',        description: 'Cables, batteries, accessories' },
  { name: 'Health & Pharmacy',  description: 'OTC medicine, vitamins, supplements' },
];

const productsByCategory = {
  'Beverages':         [
    { sku: 'BEV-001', name: 'Mineral Water 500ml',       unit_price: 1.50, unit_of_measure: 'bottle', reorder_level: 50 },
    { sku: 'BEV-002', name: 'Orange Juice 1L',           unit_price: 3.25, unit_of_measure: 'carton', reorder_level: 30 },
    { sku: 'BEV-003', name: 'Cola Soda 330ml Can',       unit_price: 1.00, unit_of_measure: 'can',    reorder_level: 60 },
  ],
  'Snacks':            [
    { sku: 'SNK-001', name: 'Potato Chips 150g',         unit_price: 2.00, unit_of_measure: 'pack',   reorder_level: 40 },
    { sku: 'SNK-002', name: 'Mixed Nuts 250g',           unit_price: 5.50, unit_of_measure: 'bag',    reorder_level: 20 },
    { sku: 'SNK-003', name: 'Crackers 200g',             unit_price: 1.75, unit_of_measure: 'pack',   reorder_level: 35 },
  ],
  'Dairy':             [
    { sku: 'DAI-001', name: 'Full Cream Milk 1L',        unit_price: 2.50, unit_of_measure: 'carton', reorder_level: 30 },
    { sku: 'DAI-002', name: 'Cheddar Cheese 200g',       unit_price: 4.75, unit_of_measure: 'block',  reorder_level: 15 },
    { sku: 'DAI-003', name: 'Greek Yogurt 400g',         unit_price: 3.00, unit_of_measure: 'tub',    reorder_level: 20 },
  ],
  'Bakery':            [
    { sku: 'BAK-001', name: 'White Sandwich Bread',      unit_price: 2.25, unit_of_measure: 'loaf',   reorder_level: 20 },
    { sku: 'BAK-002', name: 'Croissant 6-Pack',          unit_price: 4.50, unit_of_measure: 'pack',   reorder_level: 15 },
    { sku: 'BAK-003', name: 'Chocolate Muffin',          unit_price: 1.50, unit_of_measure: 'pcs',    reorder_level: 25 },
  ],
  'Frozen Foods':      [
    { sku: 'FRZ-001', name: 'Vanilla Ice Cream 1L',      unit_price: 5.00, unit_of_measure: 'tub',    reorder_level: 12 },
    { sku: 'FRZ-002', name: 'Frozen Pizza 400g',         unit_price: 6.50, unit_of_measure: 'pcs',    reorder_level: 10 },
    { sku: 'FRZ-003', name: 'Frozen French Fries 1kg',   unit_price: 3.75, unit_of_measure: 'bag',    reorder_level: 15 },
  ],
  'Personal Care':     [
    { sku: 'PRC-001', name: 'Hand Soap Bar 100g',        unit_price: 1.25, unit_of_measure: 'bar',    reorder_level: 40 },
    { sku: 'PRC-002', name: 'Shampoo 400ml',             unit_price: 4.00, unit_of_measure: 'bottle', reorder_level: 20 },
    { sku: 'PRC-003', name: 'Toothpaste 150g',           unit_price: 2.50, unit_of_measure: 'tube',   reorder_level: 25 },
  ],
  'Household':         [
    { sku: 'HOU-001', name: 'Dishwashing Liquid 500ml',  unit_price: 2.75, unit_of_measure: 'bottle', reorder_level: 20 },
    { sku: 'HOU-002', name: 'Laundry Detergent 1kg',     unit_price: 7.00, unit_of_measure: 'box',    reorder_level: 15 },
    { sku: 'HOU-003', name: 'All-Purpose Cleaner 750ml', unit_price: 3.50, unit_of_measure: 'bottle', reorder_level: 15 },
  ],
  'Stationery':        [
    { sku: 'STA-001', name: 'Ballpoint Pen Blue (10pk)', unit_price: 3.00, unit_of_measure: 'pack',   reorder_level: 20 },
    { sku: 'STA-002', name: 'A4 Notebook 200 pages',     unit_price: 4.25, unit_of_measure: 'pcs',    reorder_level: 15 },
    { sku: 'STA-003', name: 'Sticky Notes 100-pack',     unit_price: 2.00, unit_of_measure: 'pack',   reorder_level: 20 },
  ],
  'Electronics':       [
    { sku: 'ELE-001', name: 'USB-A to USB-C Cable 1m',   unit_price: 6.00, unit_of_measure: 'pcs',    reorder_level: 10 },
    { sku: 'ELE-002', name: 'AA Batteries 4-Pack',       unit_price: 3.50, unit_of_measure: 'pack',   reorder_level: 25 },
    { sku: 'ELE-003', name: 'Earbuds (Wired)',           unit_price: 9.99, unit_of_measure: 'pcs',    reorder_level:  8 },
  ],
  'Health & Pharmacy': [
    { sku: 'HLT-001', name: 'Paracetamol 500mg (20 tabs)', unit_price: 2.00, unit_of_measure: 'pack',   reorder_level: 30 },
    { sku: 'HLT-002', name: 'Vitamin C 1000mg (30 tabs)',  unit_price: 5.50, unit_of_measure: 'bottle', reorder_level: 20 },
    { sku: 'HLT-003', name: 'Hand Sanitizer 250ml',        unit_price: 3.00, unit_of_measure: 'bottle', reorder_level: 25 },
  ],
};

const suppliers = [
  { company_name: 'Global Foods Distributors', contact_person: 'Ahmed Hassan',  phone: '+1-555-0101', email: 'ahmed@globalfoods.com' },
  { company_name: 'QuickSupply Co.',           contact_person: 'Sara Johnson',  phone: '+1-555-0102', email: 'sara@quicksupply.com' },
  { company_name: 'Metro Wholesale',           contact_person: 'Carlos Rivera', phone: '+1-555-0103', email: 'carlos@metrowholesale.com' },
  { company_name: 'TechParts Ltd.',            contact_person: 'Linda Chen',    phone: '+1-555-0104', email: 'linda@techparts.com' },
  { company_name: 'HealthFirst Pharma',        contact_person: 'David Okafor',  phone: '+1-555-0105', email: 'david@healthfirst.com' },
];

// ── Seed ──────────────────────────────────────────────────────────────────────

console.log('🌱 Starting database seed…\n');

// Clear all data (child tables first)
db.exec(`
  DELETE FROM transfer_items;
  DELETE FROM stock_transfers;
  DELETE FROM sale_items;
  DELETE FROM sales;
  DELETE FROM po_items;
  DELETE FROM purchase_orders;
  DELETE FROM branch_inventory;
  DELETE FROM products;
  DELETE FROM categories;
  DELETE FROM suppliers;
  DELETE FROM users;
  DELETE FROM branches;
  DELETE FROM sqlite_sequence;
`);

// Wrap everything in one transaction for speed
db.exec('BEGIN');

try {
  // Branches
  const stmtBranch = db.prepare('INSERT INTO branches (name, location) VALUES (?, ?)');
  const branchIds  = {};
  for (const b of branches) {
    stmtBranch.run(b.name, b.location);
    branchIds[b.name] = db.prepare('SELECT last_insert_rowid() AS id').get().id;
  }
  console.log(`✅ ${branches.length} branches`);

  // Categories
  const stmtCat  = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
  const catIds   = {};
  for (const c of categories) {
    stmtCat.run(c.name, c.description);
    catIds[c.name] = db.prepare('SELECT last_insert_rowid() AS id').get().id;
  }
  console.log(`✅ ${categories.length} categories`);

  // Products + inventory
  const stmtProd = db.prepare(
    'INSERT INTO products (category_id, sku, name, unit_price, unit_of_measure, reorder_level) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const stmtInv  = db.prepare(
    'INSERT INTO branch_inventory (branch_id, product_id, quantity) VALUES (?, ?, ?)'
  );
  const allBranchIds = Object.values(branchIds);
  let   prodCount    = 0;

  for (const [catName, prods] of Object.entries(productsByCategory)) {
    const catId = catIds[catName];
    for (const p of prods) {
      stmtProd.run(catId, p.sku, p.name, p.unit_price, p.unit_of_measure, p.reorder_level);
      const productId = db.prepare('SELECT last_insert_rowid() AS id').get().id;
      prodCount++;
      for (const bId of allBranchIds) {
        const qty = Math.floor(Math.random() * 181) + 20;
        stmtInv.run(bId, productId, qty);
      }
    }
  }
  console.log(`✅ ${prodCount} products with inventory in all branches`);

  // Suppliers
  const stmtSup = db.prepare(
    'INSERT INTO suppliers (company_name, contact_person, phone, email) VALUES (?, ?, ?, ?)'
  );
  for (const s of suppliers) stmtSup.run(s.company_name, s.contact_person, s.phone, s.email);
  console.log(`✅ ${suppliers.length} suppliers`);

  // Users
  const stmtUser = db.prepare(
    'INSERT INTO users (name, username, password_hash, role, branch_id) VALUES (?, ?, ?, ?, ?)'
  );
  const testUsers = [
    { name: 'System Administrator', username: 'admin',   password: 'Admin@1234',   role: 'ADMIN',   branch_id: null },
    { name: 'Branch Manager',       username: 'manager', password: 'Manager@1234', role: 'MANAGER', branch_id: branchIds['Downtown HQ'] },
    { name: 'POS Cashier',          username: 'cashier', password: 'Cashier@1234', role: 'CASHIER', branch_id: branchIds['Downtown HQ'] },
  ];
  for (const u of testUsers) {
    const hash = bcrypt.hashSync(u.password, 10);
    stmtUser.run(u.name, u.username, hash, u.role, u.branch_id);
    console.log(`   👤  ${u.username.padEnd(10)} / ${u.password}  (${u.role})`);
  }
  console.log(`✅ ${testUsers.length} users`);

  db.exec('COMMIT');
  console.log('\n🎉 Seed complete! System is ready.\n');

} catch (err) {
  db.exec('ROLLBACK');
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
}

db.close();
