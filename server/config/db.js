/**
 * db.js
 * Sets up the SQLite DB with bridging table for many-to-many (admin_users).
 */

const sqlite3 = require("sqlite3").verbose();

const path = require("path");
const dbPath = path.join(__dirname, "../../data/qr_system.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("DB Connection Error:", err.message);
  else console.log("Connected to qr_system.db");
});

function setupDB() {
  // Users
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      displayName TEXT,
      contactNumber TEXT UNIQUE,
      deviceId TEXT
    )
  `);

  // Admins
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contactNumber TEXT UNIQUE,
      deviceId TEXT
    )
  `);

  // Bridging: admin_users
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      user_id INTEGER,
      status TEXT DEFAULT 'pending',  -- e.g. pending, approved, rejected, revoked
      banned_until TEXT,
      enable_timer BOOLEAN DEFAULT 1,
      enable_report BOOLEAN DEFAULT 1,
      FOREIGN KEY(admin_id) REFERENCES admins(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Locations: belongs to one admin
  db.run(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      latitude REAL,
      longitude REAL,
      admin_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(admin_id) REFERENCES admins(id)
    )
  `);

  // Sessions
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      location_id INTEGER,
      start_time TEXT,
      end_time TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(location_id) REFERENCES locations(id)
    )
  `);
}

setupDB();

module.exports = db;
