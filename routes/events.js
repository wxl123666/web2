/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 2 : Dynamic Website - Charity Events
 * Student      : Xinliang Wang  (24832805)
 *
 * routes/events.js  -  every /api/events/* endpoint
 * ---------------------------------------------------------------------
 * Assessment 2 only asks for data RETRIEVAL, so only GET (and HEAD,
 * which Express adds for free) is implemented here. Write operations
 * are deliberately rejected with HTTP 405 by the guard in server.js -
 * they are added in Assessment 3.
 *
 * Endpoints
 *   GET /api/events            list published events (home page)
 *   GET /api/events/search     filter by date / location / category
 *   GET /api/events/:id        one event + goal + organisation (detail)
 *   GET /api/events/:id/similar  a few other events in the same category
 * ===================================================================== */

'use strict';

const express = require('express');
const { query, queryOne } = require('../event_db');

const router = express.Router();

/* ---------------------------------------------------------------------
 * Shared SQL fragments
 * Keeping the SELECT in one place guarantees that the home page, the
 * search page and the detail page all receive EXACTLY the same shape of
 * event object - which keeps the client-side rendering code simple.
 * ------------------------------------------------------------------ */

const EVENT_FIELDS = `
    e.event_id,
    e.event_name,
    e.slug,
    e.summary,
    e.event_date,
    e.end_date,
    e.venue,
    e.address,
    e.suburb,
    e.city,
    e.ticket_price,
    e.is_free,
    e.goal_amount,
    e.capacity,
    e.seats_taken,
    e.image_url,
    e.cover_gradient,
    e.featured,
    e.status,
    c.category_id,
    c.category_name,
    c.slug            AS category_slug,
    c.icon            AS category_icon,
    c.colour_hex      AS category_colour,
    o.organisation_id,
    o.name            AS organisation_name,
    o.logo_emoji      AS organisation_logo,
    o.mission         AS organisation_mission,
    o.contact_email   AS organisation_email,
    o.phone           AS organisation_phone,
    o.website         AS organisation_website,
    -- Business rule required by the brief: classify against today's date
    CASE WHEN e.event_date < CURDATE() THEN 'past' ELSE 'upcoming' END  AS time_status,
    DATEDIFF(DATE(e.event_date), CURDATE())                             AS days_until,
    -- Goal vs Progress (displayed as a bar on the detail page)
    g.goal_id,
    g.title           AS goal_title,
    g.target_amount   AS goal_target,
    g.raised_amount   AS goal_raised,
    g.unit_label      AS goal_unit,
    ROUND(CASE WHEN g.target_amount > 0
               THEN LEAST(100, (g.raised_amount / g.target_amount) * 100)
               ELSE 0 END, 1)                                           AS goal_percent,
    -- Popularity figures shown on the cards
    (SELECT COUNT(*) FROM donations d WHERE d.event_id = e.event_id)    AS donation_count
`;

const EVENT_JOINS = `
      FROM events e
      JOIN event_categories      c ON c.category_id      = e.category_id
      JOIN charity_organisations o ON o.organisation_id  = e.organisation_id
      LEFT JOIN goals            g ON g.event_id         = e.event_id
`;

/**
 * Turns a raw MySQL row into a tidy nested JSON object.
 * The database is relational (flat); the website prefers nested objects
 * ("event.category.name"), so the reshape happens here, once, on the
 * server. The client never has to know about the join.
 */
function shapeEvent(row) {
    return {
        event_id:        row.event_id,
        name:            row.event_name,
        slug:            row.slug,
        summary:         row.summary,
        event_date:      row.event_date,
        end_date:        row.end_date,
        venue:           row.venue,
        address:         row.address,
        suburb:          row.suburb,
        city:            row.city,
        ticket_price:    Number(row.ticket_price),
        is_free:         Number(row.is_free) === 1,
        capacity:        row.capacity,
        seats_taken:     row.seats_taken,
        seats_left:      Math.max(0, row.capacity - row.seats_taken),
        image_url:       row.image_url,
        cover_gradient:  row.cover_gradient,
        featured:        Number(row.featured) === 1,
        time_status:     row.time_status,
        days_until:      row.days_until,
        donation_count:  row.donation_count,
        category: {
            category_id:   row.category_id,
            name:          row.category_name,
            slug:          row.category_slug,
            icon:          row.category_icon,
            colour:        row.category_colour
        },
        organisation: {
            organisation_id: row.organisation_id,
            name:            row.organisation_name,
            logo:            row.organisation_logo,
            mission:         row.organisation_mission,
            contact_email:   row.organisation_email,
            phone:           row.organisation_phone,
            website:         row.organisation_website
        },
        goal: {
            goal_id:       row.goal_id,
            title:         row.goal_title,
            target_amount: Number(row.goal_target || 0),
            raised_amount: Number(row.goal_raised || 0),
            unit_label:    row.goal_unit || 'dollars raised',
            percent:       Number(row.goal_percent || 0)
        }
    };
}

/* =====================================================================
 * GET /api/events
 * Home page listing.
 *   ?time=upcoming  (default) events from today onwards, soonest first
 *   ?time=past      events already held, most recent first
 *   ?time=all       both of the above
 *   ?featured=1     only the events flagged as featured
 *   ?limit=N        cap the number of rows (1..50)
 * Suspended events are ALWAYS excluded - see the WHERE clause.
 * =================================================================== */
router.get('/', async (req, res, next) => {
    try {
        const time    = (req.query.time || 'upcoming').toLowerCase();
        const where   = ["e.status = 'active'"];
        const params  = [];

        if (time === 'upcoming') where.push('e.event_date >= CURDATE()');
        else if (time === 'past') where.push('e.event_date <  CURDATE()');
        else if (time !== 'all') {
            return res.status(400).json({
                success: false,
                message: "Invalid value for 'time'. Use upcoming, past or all."
            });
        }

        if (req.query.featured === '1' || req.query.featured === 'true') {
            where.push('e.featured = 1');
        }

        // ORDER: upcoming events soonest-first, past events newest-first.
        const order = time === 'past'
            ? 'e.event_date DESC'
            : 'e.event_date ASC';

        let limitSql = '';
        const limit = Number(req.query.limit);
        if (Number.isInteger(limit) && limit > 0) {
            limitSql = ' LIMIT ' + Math.min(limit, 50);
        }

        const rows = await query(
            `SELECT ${EVENT_FIELDS} ${EVENT_JOINS}
              WHERE ${where.join(' AND ')}
              ORDER BY ${order}${limitSql}`,
            params
        );

        res.json({
            success: true,
            count:   rows.length,
            filter:  { time },
            data:    rows.map(shapeEvent)
        });
    } catch (err) {
        next(err);
    }
});

/* =====================================================================
 * GET /api/events/search
 * The search page. Any combination of the three required criteria can be
 * supplied; criteria that are omitted are simply not applied, so one
 * criterion alone works just as well as all three together.
 *
 *   ?date=YYYY-MM-DD   events on, or after, that day
 *   ?date_to=YYYY-MM-DD  optional upper bound for the date range
 *   ?location=main+beach  matched against suburb, city and venue
 *   ?category=3 | gala-dinner   category id or slug
 *   ?q=sunrise         optional keyword over the name and summary
 *   ?max_price=50      optional upper price limit
 *   ?sort=date|price   optional ordering (default: date)
 * =================================================================== */
router.get('/search', async (req, res, next) => {
    try {
        const where  = ["e.status = 'active'"];   // suspended never shown
        const params = [];

        // ---- 1. date -------------------------------------------------
        const date = req.query.date;
        if (date) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date format. Please use YYYY-MM-DD.'
                });
            }
            where.push('DATE(e.event_date) >= ?');
            params.push(date);
        }

        const dateTo = req.query.date_to;
        if (dateTo) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date_to format. Please use YYYY-MM-DD.'
                });
            }
            where.push('DATE(e.event_date) <= ?');
            params.push(dateTo);
        }

        // ---- 2. location ---------------------------------------------
        const location = (req.query.location || '').trim();
        if (location) {
            if (location.length > 80) {
                return res.status(400).json({
                    success: false,
                    message: 'Location is too long (maximum 80 characters).'
                });
            }
            // One placeholder reused three times - still fully parameterised.
            where.push('(e.suburb LIKE ? OR e.city LIKE ? OR e.venue LIKE ? OR e.address LIKE ?)');
            const like = `%${location}%`;
            params.push(like, like, like, like);
        }

        // ---- 3. category ----------------------------------------------
        const category = (req.query.category || '').trim();
        if (category) {
            // Accept either the numeric id or the human readable slug.
            if (/^\d+$/.test(category)) {
                where.push('e.category_id = ?');
                params.push(Number(category));
            } else {
                where.push('c.slug = ?');
                params.push(category);
            }
        }

        // ---- 4. optional extras ---------------------------------------
        const keyword = (req.query.q || '').trim();
        if (keyword) {
            where.push('(e.event_name LIKE ? OR e.summary LIKE ?)');
            const like = `%${keyword}%`;
            params.push(like, like);
        }

        const maxPrice = req.query.max_price;
        if (maxPrice !== undefined && maxPrice !== '') {
            const price = Number(maxPrice);
            if (Number.isNaN(price) || price < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'max_price must be a positive number.'
                });
            }
            where.push('e.ticket_price <= ?');
            params.push(price);
        }

        if (req.query.free === '1' || req.query.free === 'true') {
            where.push('e.is_free = 1');
        }

        // ---- 5. ordering ----------------------------------------------
        let order = 'e.event_date ASC';
        if (req.query.sort === 'price')      order = 'e.ticket_price ASC, e.event_date ASC';
        if (req.query.sort === 'price_desc') order = 'e.ticket_price DESC, e.event_date ASC';
        if (req.query.sort === 'name')       order = 'e.event_name ASC';

        const rows = await query(
            `SELECT ${EVENT_FIELDS} ${EVENT_JOINS}
              WHERE ${where.join(' AND ')}
              ORDER BY ${order}`,
            params
        );

        res.json({
            success: true,
            count:   rows.length,
            criteria: {
                date:      date      || null,
                date_to:   dateTo    || null,
                location:  location  || null,
                category:  category  || null,
                keyword:   keyword   || null,
                max_price: maxPrice  || null
            },
            data: rows.map(shapeEvent)
        });
    } catch (err) {
        next(err);
    }
});

/* =====================================================================
 * GET /api/events/:id
 * Everything the event detail page needs: the event itself, its category,
 * the hosting organisation, the fundraising goal, and the five most
 * recent donations.
 * =================================================================== */
router.get('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Event id must be a positive whole number.'
            });
        }

        const row = await queryOne(
            `SELECT ${EVENT_FIELDS}, e.full_description
             ${EVENT_JOINS}
             WHERE e.event_id = ? AND e.status = 'active'`,
            [id]
        );

        if (!row) {
            return res.status(404).json({
                success: false,
                message: `No published event found with id ${id}.`
            });
        }

        const event = shapeEvent(row);
        event.description = row.full_description;

        // Latest donations - gives the detail page a live "wall of support".
        const donations = await query(
            `SELECT donor_name, amount, message, donated_at, is_anonymous
               FROM donations
              WHERE event_id = ?
              ORDER BY donated_at DESC
              LIMIT 5`,
            [id]
        );

        event.recent_donations = donations.map((d) => ({
            donor:     Number(d.is_anonymous) === 1 ? 'Anonymous' : d.donor_name,
            amount:    Number(d.amount),
            message:   d.message,
            donated_at: d.donated_at
        }));

        res.json({ success: true, data: event });
    } catch (err) {
        next(err);
    }
});

/* =====================================================================
 * GET /api/events/:id/similar
 * Sugar for the detail page: up to three other upcoming events in the
 * same category, so the visitor always has somewhere to go next.
 * =================================================================== */
router.get('/:id/similar', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Event id must be a positive whole number.'
            });
        }

        // First choice: other upcoming events in the SAME category.
        let rows = await query(
            `SELECT ${EVENT_FIELDS} ${EVENT_JOINS}
              WHERE e.status = 'active'
                AND e.event_date >= CURDATE()
                AND e.category_id = (SELECT category_id FROM events WHERE event_id = ?)
                AND e.event_id <> ?
              ORDER BY e.event_date ASC
              LIMIT 3`,
            [id, id]
        );

        // Fallback: if the category has nothing else coming up, suggest the
        // three soonest events from any category so the section is never empty.
        if (!rows.length) {
            rows = await query(
                `SELECT ${EVENT_FIELDS} ${EVENT_JOINS}
                  WHERE e.status = 'active'
                    AND e.event_date >= CURDATE()
                    AND e.event_id <> ?
                  ORDER BY e.event_date ASC
                  LIMIT 3`,
                [id]
            );
        }

        res.json({ success: true, count: rows.length, data: rows.map(shapeEvent) });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
