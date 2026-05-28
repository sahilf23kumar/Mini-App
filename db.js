const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'flashcards.db');

/**
 * Wraps sql.js database with helper methods that mimic better-sqlite3's API
 * for cleaner route code. Also handles loading/saving the database to disk.
 */
class DatabaseWrapper {
  constructor(sqlDb) {
    this._db = sqlDb;
  }

  /**
   * Run a statement that modifies data (INSERT, UPDATE, DELETE).
   * Returns { lastInsertRowid, changes }.
   */
  run(sql, params = []) {
    this._db.run(sql, params);
    const lastId = this._db.exec('SELECT last_insert_rowid() AS id')[0]?.values[0][0] || 0;
    const changes = this._db.getRowsModified();
    this.save();
    return { lastInsertRowid: lastId, changes };
  }

  /**
   * Execute a query and return all matching rows as an array of objects.
   */
  all(sql, params = []) {
    const stmt = this._db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  /**
   * Execute a query and return the first matching row as an object, or undefined.
   */
  get(sql, params = []) {
    const stmt = this._db.prepare(sql);
    stmt.bind(params);
    let row;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();
    return row;
  }

  /**
   * Execute raw SQL (for schema creation, pragmas, etc).
   */
  exec(sql) {
    this._db.exec(sql);
    this.save();
  }

  /** Persist the database to disk. */
  save() {
    const data = this._db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  /** Close the database. */
  close() {
    this.save();
    this._db.close();
  }
}

/**
 * Initializes the SQLite database (async because sql.js loads WASM).
 * Loads existing DB file if present, otherwise creates a new one.
 * @returns {Promise<DatabaseWrapper>}
 */
async function initDatabase() {
  const SQL = await initSqlJs();

  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  const db = new DatabaseWrapper(sqlDb);

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');

  // ── Schema ─────────────────────────────────────────────────────────────────
  db._db.exec(`
    CREATE TABLE IF NOT EXISTS decks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      description TEXT    DEFAULT '',
      color       TEXT    DEFAULT '#6366f1',
      created_at  TEXT    DEFAULT (datetime('now')),
      updated_at  TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cards (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      deck_id        INTEGER NOT NULL,
      front          TEXT    NOT NULL,
      back           TEXT    NOT NULL,
      ease_factor    REAL    DEFAULT 2.5,
      interval_days  INTEGER DEFAULT 0,
      repetitions    INTEGER DEFAULT 0,
      next_review    TEXT    DEFAULT (datetime('now')),
      created_at     TEXT    DEFAULT (datetime('now')),
      updated_at     TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
    );
  `);
  db.save();

  return db;
}

module.exports = { initDatabase };
