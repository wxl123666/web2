/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 2 : Dynamic Website - Charity Events
 * Student      : Xinliang Wang  (24832805)
 *
 * event_db.js  -  Database connection layer
 * ---------------------------------------------------------------------
 * Responsibility of this file (and ONLY this file) is talking to MySQL.
 * It exports a mysql2 connection *pool* plus two small helpers:
 *
 *      query(sql, params)  -> Promise<any[]>   run a SELECT
 *      queryOne(sql, params) -> Promise<object|null>
 *
 * Every caller in the API uses parameter placeholders ( ? ) so that user
 * supplied values are never concatenated into SQL - that is the standard
 * defence against SQL injection.
 *
 * The pool is preferred over a single connection because the website
 * fires several requests at once (home page = events + categories +
 * statistics) and a pool reuses connections instead of opening a new
 * TCP session for every query.
 * ===================================================================== */

'use strict';

require('dotenv').config();

const mysql = require('mysql2/promise');

/* ---------------------------------------------------------------------
 * 1. Configuration
 *    Values come from the .env file, with sensible defaults so that the
 *    project runs straight after `npm install` on a standard XAMPP /
 *    MySQL-on-3306 setup.
 * ------------------------------------------------------------------ */
const dbConfig = {
    host:               process.env.DB_HOST     || '127.0.0.1',
    // 3307 is the MySQL 9.7 instance this project was developed against.
    // Change DB_PORT in the .env file (or here) to 3306 if your MySQL 8.0
    // server is the one you want to use.
    port:               Number(process.env.DB_PORT) || 3307,
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD || '',
    database:           process.env.DB_NAME     || 'charityevents_db',

    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,

    // Keep DATE / DATETIME values as plain 'YYYY-MM-DD HH:mm:ss' strings
    // instead of JavaScript Date objects, so the JSON returned by the API
    // is stable and easy for the client to format.
    dateStrings:        true,

    // Named placeholders ( :name ) are nicer to read than ? for long
    // queries, and mysql2 supports both.
    namedPlaceholders:  false,
};

/* ---------------------------------------------------------------------
 * 2. Create the pool
 * ------------------------------------------------------------------ */
const pool = mysql.createPool(dbConfig);

/**
 * Low level helper: execute a parameterised SQL statement.
 * @param {string} sql    SQL text with ? placeholders
 * @param {Array}  params values bound to the placeholders
 * @returns {Promise<Array>} rows returned by MySQL
 */
async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

/**
 * Convenience helper for "give me the single row that matches this id".
 * @returns {Promise<object|null>}
 */
async function queryOne(sql, params = []) {
    const rows = await query(sql, params);
    return rows.length ? rows[0] : null;
}

/**
 * Opens one connection and closes it again - used once at start-up to
 * fail fast (and with a clear message) when MySQL is not reachable or
 * the database has not been imported yet.
 */
async function testConnection() {
    const conn = await pool.getConnection();
    try {
        const [rows] = await conn.execute('SELECT DATABASE() AS db, NOW() AS now');
        return rows[0];
    } finally {
        conn.release();
    }
}

module.exports = { pool, query, queryOne, testConnection, dbConfig };

/* ---------------------------------------------------------------------
 * 3. Allow this file to be run directly:  npm run db:test
 *    It prints the schema it can see, which is a quick way to prove that
 *    charityevents_db.sql has been imported correctly.
 * ------------------------------------------------------------------ */
if (require.main === module) {
    (async () => {
        try {
            const info = await testConnection();
            console.log('MySQL connection OK ->', info);

            const tables = await query(
                `SELECT TABLE_NAME, TABLE_ROWS
                   FROM information_schema.TABLES
                  WHERE TABLE_SCHEMA = ?
                  ORDER BY TABLE_NAME`,
                [dbConfig.database]
            );
            console.table(tables);

            const events = await query(
                `SELECT e.event_id,
                        e.event_name,
                        e.event_date,
                        c.category_name,
                        o.name AS organisation,
                        CASE WHEN e.event_date < CURDATE() THEN 'past' ELSE 'upcoming' END AS time_status
                   FROM events e
                   JOIN event_categories     c ON c.category_id     = e.category_id
                   JOIN charity_organisations o ON o.organisation_id = e.organisation_id
                  WHERE e.status = 'active'
                  ORDER BY e.event_date`
            );
            console.table(events);
            process.exit(0);
        } catch (err) {
            console.error('Database connection FAILED:', err.message);
            console.error('Check .env  (DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME)');
            console.error('and make sure charityevents_db.sql has been imported.');
            process.exit(1);
        }
    })();
}
