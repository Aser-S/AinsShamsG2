/**
 * Database connection using Node.js built-in node:sqlite (Node 22+).
 * API is synchronous and nearly identical to better-sqlite3.
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH  = path.join(DATA_DIR, 'app.db');

let db;

function getDb() {
  if (!db) {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new DatabaseSync(DB_PATH);
    // Enable WAL mode for better read concurrency
    db.exec("PRAGMA journal_mode = WAL");
    // Enforce foreign key constraints
    db.exec("PRAGMA foreign_keys = ON");
  }
  return db;
}

module.exports = { getDb };
