// config/db.js
// MySQL (XAMPP) for local dev, SQLite on Render persistent disk for production

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_DRIVER = process.env.DB_DRIVER || 'mysql';
const DB_NAME = process.env.DB_NAME || 'meetspace_db';
const DB_DISK_PATH = process.env.DB_DISK_PATH || '/var/data';

let db;

if (DB_DRIVER === 'sqlite') {
    // ── SQLite driver (Render persistent disk) ──────────────────────
    const sqlite3 = require('sqlite3').verbose();
    const { open } = require('sqlite');

    const dbDir = DB_DISK_PATH;
    const dbFile = path.join(dbDir, `${DB_NAME}.sqlite`);

    // Ensure the persistent-disk directory exists
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`📁 Created data directory: ${dbDir}`);
    }

    const sqliteDb = open({
        filename: dbFile,
        driver: sqlite3.Database
    });

    // ── MySQL → SQLite dialect helpers ──────────────────────────────
    function adaptQuery(sql) {
        return sql
            // NOW() → datetime('now')
            .replace(/\bNOW\(\)/gi, "datetime('now')")
            // CURRENT_TIMESTAMP stays the same (SQLite supports it)
            // CURDATE() → date('now')
            .replace(/\bCURDATE\(\)/gi, "date('now')")
            // DATE_FORMAT(col, '%Y-%m') → strftime('%Y-%m', col)
            .replace(/DATE_FORMAT\(([^,]+),\s*'([^']+)'\)/gi, "strftime('$2', $1)")
            // IF(cond, a, b) → CASE WHEN cond THEN a ELSE b END
            .replace(/\bIF\(([^,]+),\s*([^,]+),\s*([^)]+)\)/gi,
                'CASE WHEN $1 THEN $2 ELSE $3 END')
            // SHOW TABLES → sqlite_master query
            .replace(/SHOW\s+TABLES/gi,
                "SELECT name AS 'Tables_in_meetspace' FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    }

    // ── Unified API ─────────────────────────────────────────────────
    db = {
        query: async function (sql, params = []) {
            const adapted = adaptQuery(sql);
            const connection = await sqliteDb;
            const trimmed = adapted.trim().toUpperCase();

            if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') ||
                adapted.includes('sqlite_master')) {
                const rows = await connection.all(adapted, params);
                return [rows, undefined];
            }
            // INSERT
            if (trimmed.startsWith('INSERT')) {
                const result = await connection.run(adapted, params);
                return [{ insertId: result.lastID, affectedRows: result.changes }, undefined];
            }
            // UPDATE / DELETE / CREATE / ALTER
            const result = await connection.run(adapted, params);
            return [{ affectedRows: result.changes, insertId: result.lastID }, undefined];
        },

        execute: async function (sql, params = []) {
            return db.query(sql, params);
        },

        end: async function () {
            const connection = await sqliteDb;
            await connection.close();
        }
    };

    // Initialize database
    (async () => {
        try {
            const connection = await sqliteDb;
            console.log(`✅ SQLite connected: ${dbFile}`);

            // Check if tables exist
            const row = await connection.get(
                "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            );
            const count = row ? row.count : 0;

            if (count === 0) {
                console.log('⚙️  No tables found – running schema-sqlite.sql ...');
                const schemaPath = path.join(__dirname, '..', 'schema-sqlite.sql');
                const schema = fs.readFileSync(schemaPath, 'utf8');
                await connection.exec(schema);
                console.log('✅ Schema initialized successfully');
            } else {
                console.log(`✅ Database has ${count} table(s) – skipping schema`);
            }
        } catch (err) {
            console.error('❌ SQLite initialization failed:', err.message);
        }
    })();

} else {
    // ── MySQL driver (XAMPP local dev) ──────────────────────────────
    const mysql = require('mysql2');

    const poolConfig = {
        host:               process.env.DB_HOST     || '127.0.0.1',
        port:               process.env.DB_PORT     || 3306,
        user:               process.env.DB_USER     || 'root',
        password:           process.env.DB_PASSWORD || '',
        waitForConnections: true,
        connectionLimit:    10,
        queueLimit:         0
    };

    function initMySQL() {
        return new Promise((resolve, reject) => {
            const tempConn = mysql.createConnection(poolConfig);
            tempConn.connect((err) => {
                if (err) {
                    console.error('');
                    console.error('❌ MySQL Connection Failed!');
                    console.error('   Error:', err.message);
                    console.error('   Fix: Make sure MySQL is running in XAMPP Control Panel');
                    console.error('');
                    return reject(err);
                }

                tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, (err) => {
                    if (err) { tempConn.end(); return reject(err); }
                    console.log(`✅ Database '${DB_NAME}' ready`);

                    tempConn.changeUser({ database: DB_NAME }, (err) => {
                        if (err) { tempConn.end(); return reject(err); }

                        tempConn.query("SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = ?", [DB_NAME], (err, rows) => {
                            if (err) { tempConn.end(); return reject(err); }

                            if (rows[0].cnt === 0) {
                                console.log('⚙️  No tables found – running schema.sql ...');
                                const schemaPath = path.join(__dirname, '..', 'schema.sql');
                                const schema = fs.readFileSync(schemaPath, 'utf8');
                                const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
                                let completed = 0;
                                statements.forEach((stmt) => {
                                    tempConn.query(stmt, (err) => {
                                        if (err) console.error('⚠️  Schema warning:', err.message);
                                        completed++;
                                        if (completed === statements.length) {
                                            console.log('✅ Schema initialized successfully');
                                            tempConn.end();
                                            resolve();
                                        }
                                    });
                                });
                            } else {
                                console.log(`✅ Database has ${rows[0].cnt} table(s) – skipping schema`);
                                tempConn.end();
                                resolve();
                            }
                        });
                    });
                });
            });
        });
    }

    let pool;

    initMySQL()
        .then(() => {
            pool = mysql.createPool({ ...poolConfig, database: DB_NAME });
            pool.getConnection((err, connection) => {
                if (err) {
                    console.error('❌ Pool connection failed:', err.message);
                } else {
                    console.log('✅ MySQL pool connected successfully via XAMPP');
                    connection.release();
                }
            });
        })
        .catch((err) => {
            console.error('❌ Initialization failed:', err.message);
            pool = mysql.createPool({ ...poolConfig, database: DB_NAME });
        });

    db = {
        query: (...args) => {
            if (!pool) return Promise.reject(new Error('Database not initialized'));
            return pool.promise().query(...args);
        },
        execute: (...args) => {
            if (!pool) return Promise.reject(new Error('Database not initialized'));
            return pool.promise().execute(...args);
        },
        end: () => {
            if (!pool) return Promise.resolve();
            return pool.promise().end();
        }
    };
}

module.exports = db;
