/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 2 : Dynamic Website - Charity Events
 * Student      : Xinliang Wang  (24832805)
 *
 * routes/stats.js  -  GET /api/stats
 * ---------------------------------------------------------------------
 * One small aggregate request that powers the animated counters in the
 * hero section of the home page. Doing the maths in MySQL keeps a single
 * query on the wire instead of shipping every event to the browser.
 * ===================================================================== */

'use strict';

const express = require('express');
const { query } = require('../event_db');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const row = await query(
            `SELECT
                (SELECT COUNT(*) FROM events WHERE status='active' AND event_date >= CURDATE())
                    AS upcoming_events,
                (SELECT COUNT(*) FROM events WHERE status='active' AND event_date <  CURDATE())
                    AS past_events,
                (SELECT COUNT(*) FROM events WHERE status='suspended')
                    AS suspended_events,
                (SELECT COUNT(*) FROM event_categories) AS categories,
                (SELECT COUNT(*) FROM charity_organisations) AS organisations,
                (SELECT COALESCE(SUM(raised_amount),0) FROM goals) AS total_raised,
                (SELECT COALESCE(SUM(seats_taken),0) FROM events WHERE status='active')
                    AS total_participants`
        );

        const r = row[0];
        res.json({
            success: true,
            data: {
                upcoming_events:    Number(r.upcoming_events),
                past_events:        Number(r.past_events),
                suspended_events:   Number(r.suspended_events),
                categories:         Number(r.categories),
                organisations:      Number(r.organisations),
                total_raised:       Number(r.total_raised),
                total_participants: Number(r.total_participants)
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
