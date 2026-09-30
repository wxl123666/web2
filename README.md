# Hebei Charity Events — client-side website (PROG2002 Assessment 2, Part 3)

Three pages built with **HTML, CSS, JavaScript and the DOM**. No framework, no build step.
Every event shown anywhere comes from the REST API over `fetch()` — nothing is hard-coded.

Theme: **"Midnight Lantern"** — a dark ink base with vermilion (中国红) and glaze-gold accents,
set in Hebei province. Student: Xinliang Wang · Student ID: 24832805

---

## 1. Files

| File | Page / role |
| --- | --- |
| `index.html` | **Home** — hero, rotating spotlight, bento statistics, category rail, upcoming / featured / past events, partner charities |
| `search.html` | **Search** — filter form (date / city / category), results, Clear Filters |
| `event.html` | **Event detail** — illustration hero, full description, details, goal vs progress, tickets, availability, recent support, similar events |
| `css/style.css` | The whole "Midnight Lantern" theme |
| `assets/img/*.svg` | Six hand-drawn category illustrations (`fun-run`, `gala`, `auction`, `concert`, `fete`, `workshop`) — each animated inside the SVG |
| `js/config.js` | Where the API lives (`API_BASE_URL`) |
| `js/api.js` | Every `fetch()` call to the API, wrapped in Promises |
| `js/ui.js` | Shared helpers: capsule navigation with sliding pill, scroll reveal, animated counters, toasts, modal, skeletons, drifting lanterns, the mascot, heart confetti |
| `js/card.js` | Turns one event object into one card (real illustration banner) |
| `js/home.js` | Home page logic (spotlight rotator, bento, category rail) |
| `js/search.js` | Search page logic: validation, filtering, Clear Filters, error messages |
| `js/event.js` | Detail page logic: reads `?id=` from the URL and renders the event |

---

## 2. Running the site

The API **must be running first** (see `api/README.md`).

**Option A — VS Code Live Server (recommended)**
1. Install the *Live Server* extension.
2. Right-click `index.html` → **Open with Live Server**.
3. The site opens at `http://127.0.0.1:5500/index.html`.

**Option B — any static server**

```bash
# from this folder
npx serve .            # then open the printed URL
# or, with Python
python -m http.server 5500
```

---

## 3. How the pages talk to the API

```
DOM ready  →  fetch(GET /api/...)  →  Promise resolves
           →  validate response    →  build HTML string
           →  inject with innerHTML →  animate counters, bars and cards
```

| Page | Endpoints used |
| --- | --- |
| `index.html` | `/api/stats`, `/api/events?time=upcoming`, `?featured=1`, `?time=past`, `/api/categories`, `/api/organisations` |
| `search.html` | `/api/categories` (fills the dropdown), `/api/events/search` (every search) |
| `event.html` | `/api/events/:id`, `/api/events/:id/similar` |

The event id travels between pages as a **URL query string** — `event.html?id=3`.

---

## 4. Features worth pointing out in the demo

* **Real illustrations** instead of emoji — six hand-drawn SVG scenes that animate inside the file (runners jog, candles flicker, concert beams sweep, music notes float).
* **Rotating hero spotlight** cycling through the next four upcoming events, with dot indicators.
* **Bento statistics** with a sparkline built from the real fundraising percentages.
* **Category rail** with each category's illustration and live event count; clicking one deep-links into filtered search results.
* **Cute mascot** — a heart character that blinks and waves; it also appears in empty states and the Register modal.
* **Drifting lanterns** in the background of every page.
* **Heart confetti** when the Register button is pressed.
* **Progress bars** that grow with a small heart riding the fill.
* **Skeleton placeholders** while loading, inline errors, empty-state messages and toasts.
* **Register button** opens a modal reading *"This feature is currently under construction."*
* **Responsive** — collapsible menu below 880 px, and `prefers-reduced-motion` is respected.

---

## 5. Troubleshooting

| Symptom | Cause |
| --- | --- |
| "Cannot reach the API" toast / error box | The API is not running. Start it: `npm start` in the `api` folder. |
| Page loads but every grid is empty | MySQL is not reachable from the API — check `api/.env`, especially `DB_PORT` (this project uses 3307). |
| Illustrations do not appear | The SVG files are missing from `assets/img/`, or the page was opened with `file://` from a folder that blocks relative paths — use a local server. |
| Site works but the API is on another port | Edit `API_BASE_URL` in `js/config.js`. |
