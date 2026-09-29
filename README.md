# Charity Events API — PROG2002 Assessment 2 (Part 1 + Part 2)

RESTful API that serves the Hebei charity events website.
Built with **Node.js**, **Express** and **MySQL**.

Student: Xinliang Wang · Student ID: 24832805

---

## 1. Files in this folder

| File | What it does |
| --- | --- |
| `charityevents_db.sql` | Complete database export. Creates `charityevents_db` with all tables, relationships and the sample data set (6 categories, 5 organisations, 14 events, 14 goals, 56 donations). |
| `event_db.js` | The database layer. Creates the MySQL connection pool and exports `query()`, `queryOne()` and `testConnection()`. Run `npm run db:test` to check the connection. |
| `server.js` | The Express application: CORS, logging, the GET-only security guard, route mounting, 404/500 handlers and start-up. |
| `routes/events.js` | `/api/events`, `/api/events/search`, `/api/events/:id`, `/api/events/:id/similar` |
| `routes/categories.js` | `/api/categories` |
| `routes/organisations.js` | `/api/organisations` |
| `routes/stats.js` | `/api/stats` |
| `.env` / `.env.example` | Database credentials and the API port. |

---

## 2. Set-up (first time only)

1. **Import the database**

   *MySQL Workbench*: `File → Open SQL Script… → charityevents_db.sql → ⚡ (Execute)`

   *Command line*:

   ```bash
   mysql -u root -p < charityevents_db.sql
   ```

2. **Install the dependencies**

   ```bash
   npm install
   ```

3. **Check the credentials** in `.env`

   ```ini
   DB_HOST=127.0.0.1
   DB_PORT=3307      # MySQL 9.7 on this machine (use 3306 for the MySQL 8.0 instance)
   DB_USER=root
   DB_PASSWORD=Boyuan2004@
   DB_NAME=charityevents_db
   API_PORT=3000
   ```

4. **Verify the connection**

   ```bash
   npm run db:test
   ```

---

## 3. Run the API

```bash
npm start          # or:  node server.js
```

You should see:

```
MySQL connected -> charityevents_db
Charity Events API (PROG2002 Assessment 2)
listening on  http://localhost:3000/api
```

Open <http://localhost:3000/api> in a browser for a live list of every endpoint.

---

## 4. Endpoints (all GET)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API + database health check |
| GET | `/api/events` | Published events — `?time=upcoming\|past\|all`, `?featured=1`, `?limit=N` |
| GET | `/api/events/search` | `?date=YYYY-MM-DD`, `?date_to=`, `?location=`, `?category=id\|slug`, `?q=`, `?max_price=`, `?free=1`, `?sort=` |
| GET | `/api/events/:id` | One event with category, organisation, goal and recent donations |
| GET | `/api/events/:id/similar` | Up to three related upcoming events |
| GET | `/api/categories` | Categories with published-event counts |
| GET | `/api/organisations` | The hosting charities |
| GET | `/api/stats` | Aggregate figures for the home-page counters |

Quick tests:

```bash
curl http://localhost:3000/api/events?time=upcoming
curl http://localhost:3000/api/events/search?category=2
curl "http://localhost:3000/api/events/search?location=Southport&date=2026-10-01"
curl http://localhost:3000/api/events/3
```

### Business rules enforced by the API

* **Suspended events are never returned.** `events.status = 'suspended'` is filtered out of every query, so the two policy-breaching sample events never appear on the website.
* **Past vs upcoming is computed**, not stored: `CASE WHEN event_date < CURDATE() THEN 'past' ELSE 'upcoming' END`.
* **Only GET is allowed.** Any other verb receives HTTP 405 with an explanatory message (write methods arrive in Assessment 3).
* **All input is parameterised** through `pool.execute()`, so SQL injection is not possible. Invalid input returns HTTP 400 with a readable message.

---

## 5. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Cannot reach the API` in the browser | The API is not running — start it with `npm start` in this folder. |
| `MySQL connected -> null` or `ECONNREFUSED` | Wrong `DB_PORT`. This machine has MySQL 9.7 on **3307** and MySQL 8.0 on **3306**; set the port that matches the server holding `charityevents_db`. |
| `Table 'charityevents_db.goals' doesn't exist` | The SQL file has not been imported, or it was imported into the *other* MySQL instance. |
| `EADDRINUSE :::3000` | Something else is already on port 3000 — change `API_PORT` in `.env` and in `clientside/js/config.js`. |
