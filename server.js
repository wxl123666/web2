/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 2 : Dynamic Website - Charity Events (Gold Coast)
 * Student      : Xinliang Wang  (24832805)
 *
 * server.js  -  Express application entry point
 * ---------------------------------------------------------------------
 * Starts the RESTful API on http://localhost:3000 and mounts:
 *
 *      /api/events         routes/events.js
 *      /api/categories     routes/categories.js
 *      /api/organisations  routes/organisations.js
 *      /api/stats          routes/stats.js
 *      /api/health         start-up self check (below)
 *
 * Run it with:   npm install  ->  npm start
 * ===================================================================== */

'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const { testConnection } = require('./event_db');
const eventsRoutes        = require('./routes/events');
const categoriesRoutes    = require('./routes/categories');
const organisationsRoutes = require('./routes/organisations');
const statsRoutes         = require('./routes/stats');

const app  = express();
const PORT = Number(process.env.API_PORT) || 3000;

/* ---------------------------------------------------------------------
 * 1. Middleware
 * ------------------------------------------------------------------ */

// CORS: the client-side site is opened from a different origin (VS Code
// Live Server on :5500, a simple static server, or even file://), so the
// browser would otherwise block the fetch() calls. The API only ever
// serves public, read-only data, so it is opened to any origin. This is
// what keeps the client and the API in two separate deliverable zips
// while still allowing them to talk to each other.
app.use(cors({ origin: '*', methods: ['GET', 'HEAD'] }));

app.use(express.json());

// Small request log - handy while demonstrating the data flow in the video.
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

/* ---------------------------------------------------------------------
 * 2. Security guard
 *    Assessment 2 is read-only. Anything other than GET/HEAD under /api
 *    is answered with 405 Method Not Allowed instead of silently doing
 *    nothing, which is both RESTful and honest about what is supported.
 * ------------------------------------------------------------------ */
app.use('/api', (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    res.status(405).json({
        success: false,
        message: `Method ${req.method} is not supported by this API. ` +
                 'Assessment 2 exposes read-only (GET) endpoints; write ' +
                 'endpoints are added in Assessment 3.'
    });
});

/* ---------------------------------------------------------------------
 * 3. Routes
 * ------------------------------------------------------------------ */
app.get('/api/health', async (req, res) => {
    try {
        const info = await testConnection();
        res.json({
            success: true,
            message: 'Charity Events API is running.',
            database: info.db,
            server_time: info.now
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'API is running but cannot reach MySQL: ' + err.message
        });
    }
});

// Handy index of every endpoint - open http://localhost:3000/api in a browser.
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Charity Events API (PROG2002 A2)',
        endpoints: [
            { method: 'GET', path: '/api/health',
              description: 'API + database health check' },
            { method: 'GET', path: '/api/events',
              description: 'Published events. ?time=upcoming|past|all, ?featured=1, ?limit=N' },
            { method: 'GET', path: '/api/events/search',
              description: 'Filter by ?date=YYYY-MM-DD, ?location=, ?category=id|slug, ?q=, ?max_price=' },
            { method: 'GET', path: '/api/events/:id',
              description: 'One event with its category, organisation, goal and recent donations' },
            { method: 'GET', path: '/api/events/:id/similar',
              description: 'Up to three other upcoming events in the same category' },
            { method: 'GET', path: '/api/categories',
              description: 'Categories for the search dropdown (with event counts)' },
            { method: 'GET', path: '/api/organisations',
              description: 'Charitable organisations hosting the events' },
            { method: 'GET', path: '/api/stats',
              description: 'Aggregate figures for the home page counters' }
        ]
    });
});

app.use('/api/events',        eventsRoutes);
app.use('/api/categories',    categoriesRoutes);
app.use('/api/organisations', organisationsRoutes);
app.use('/api/stats',         statsRoutes);

/* ---------------------------------------------------------------------
 * 4. 404 + error handling
 *    Both return JSON so the client can show a readable message instead
 *    of an HTML error page.
 * ------------------------------------------------------------------ */
app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Unknown endpoint ${req.method} ${req.originalUrl}`
    });
});

app.use((err, req, res, next) => {          // eslint-disable-line no-unused-vars
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Unexpected server error.',
        detail:  err.message
    });
});

/* ---------------------------------------------------------------------
 * 5. Start
 * ------------------------------------------------------------------ */
(async () => {
    try {
        const info = await testConnection();
        console.log('MySQL connected ->', info.db);
    } catch (err) {
        console.error('WARNING: could not connect to MySQL ->', err.message);
        console.error('Import charityevents_db.sql and check the .env file.');
    }

    app.listen(PORT, () => {
        console.log('-------------------------------------------------------------');
        console.log(' Charity Events API  (PROG2002 Assessment 2)');
        console.log(` listening on  http://localhost:${PORT}/api`);
        console.log('-------------------------------------------------------------');
    });
})();
