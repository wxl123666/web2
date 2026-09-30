/* =====================================================================
 * home.js - logic for index.html
 *
 * Endpoints used on this page:
 *   GET /api/stats          bento counters + sparkline
 *   GET /api/events         upcoming / featured / past listings + spotlight
 *   GET /api/categories     the category rail
 *   GET /api/organisations  partner charities
 * ===================================================================== */

(function () {
    'use strict';

    const UI = window.UI;
    const API = window.EventAPI;
    const Card = window.EventCard;

    /* ---------- the cute mascot next to the spotlight ----------------- */
    function placeMascot() {
        const host = document.getElementById('hero-mascot');
        if (host) host.innerHTML = UI.mascot(132);
    }

    /* ---------- rotating "next up" spotlight -------------------------- */
    let spotlightItems = [];
    let spotIndex = 0;
    let spotTimer = null;

    function renderSpotlight() {
        if (!spotlightItems.length) return;
        const e = spotlightItems[spotIndex];
        const img = document.getElementById('spot-img');
        if (img) {
            img.style.opacity = '0';
            setTimeout(() => {
                img.src = e.image_url || 'assets/img/fete.svg';
                img.alt = e.name;
                img.style.opacity = '1';
            }, 180);
        }
        document.getElementById('spot-title').textContent = e.name;
        document.getElementById('spot-meta').textContent =
            UI.longDate(e.event_date) + ' · ' + e.venue + ', ' + e.suburb +
            (e.is_free ? ' · Free' : ' · ' + UI.money(e.ticket_price));
        document.getElementById('spot-link').href = 'event.html?id=' + e.event_id;

        const dots = document.getElementById('spot-dots');
        if (dots) {
            dots.innerHTML = spotlightItems.map((_, i) =>
                '<span class="' + (i === spotIndex ? 'on' : '') + '"></span>').join('');
        }
    }

    function startSpotlight() {
        if (spotTimer) clearInterval(spotTimer);
        if (spotlightItems.length < 2) return;
        spotTimer = setInterval(() => {
            spotIndex = (spotIndex + 1) % spotlightItems.length;
            renderSpotlight();
        }, 4600);
    }

    /* ---------- bento statistics -------------------------------------- */
    function loadStats(sparkData) {
        const host = document.getElementById('bento');
        if (!host) return;

        API.getStats()
            .then((res) => {
                const s = res.data;
                const cells = [
                    { wide: true, label: 'Raised so far', value: s.total_raised, prefix: '$', suffix: '',
                      note: 'across every published event', spark: sparkData },
                    { label: 'Upcoming events', value: s.upcoming_events, suffix: '+', note: 'ready to join' },
                    { label: 'Participants', value: s.total_participants, suffix: '+', note: 'places taken' },
                    { label: 'Cities', value: 8, note: 'across Hebei' },
                    { label: 'Categories', value: s.categories, note: 'ways to give' },
                    { label: 'Partner charities', value: s.organisations, note: 'registered' },
                    { label: 'Events suspended', value: s.suspended_events, note: 'hidden by policy' }
                ];

                host.innerHTML = cells.map((c) => {
                    const spark = c.spark && c.spark.length
                        ? '<div class="sparkline">' + c.spark.slice(0, 12).map((v, i) =>
                            '<i style="height:' + Math.max(6, Math.min(100, v)) + '%;animation-delay:' + (i * 70) + 'ms"></i>'
                          ).join('') + '</div>'
                        : '';
                    return '<div class="bento-cell reveal' + (c.wide ? ' wide' : '') + '">' +
                        '<div class="b-label">' + c.label + '</div>' +
                        '<div class="b-value" data-count="' + c.value + '" data-prefix="' + (c.prefix || '') +
                            '" data-suffix="' + (c.suffix || '') + '">' + (c.prefix || '') + '0' + (c.suffix || '') + '</div>' +
                        '<div class="b-note">' + c.note + '</div>' + spark +
                    '</div>';
                }).join('');

                UI.observeReveals(host);

                // count up when the bento scrolls into view
                const values = host.querySelectorAll('[data-count]');
                if ('IntersectionObserver' in window) {
                    const io = new IntersectionObserver((entries) => {
                        entries.forEach((entry) => {
                            if (entry.isIntersecting) {
                                UI.animateCounter(entry.target);
                                io.unobserve(entry.target);
                            }
                        });
                    }, { threshold: 0.3 });
                    values.forEach((v) => io.observe(v));
                } else {
                    values.forEach((v) => UI.animateCounter(v));
                }
            })
            .catch(() => {
                host.innerHTML = '<div class="bento-cell wide"><div class="b-label">Statistics</div>' +
                    '<div class="b-value">—</div><div class="b-note">API unavailable</div></div>';
            });
    }

    /* ---------- category rail ------------------------------------------ */
    function loadCategories() {
        const rail = document.getElementById('cat-rail');
        if (!rail) return;

        API.getCategories()
            .then((res) => {
                rail.innerHTML = res.data.map((c) =>
                    '<a class="cat-chip" href="search.html?category=' + c.category_id + '">' +
                        '<span class="ci"><img src="' + (c.image || 'assets/img/fete.svg') +
                        '" alt="" onerror="this.style.display=\'none\'"></span>' +
                        '<span>' + UI.escapeHtml(c.name) + '</span>' +
                        '<b>' + c.event_count + '</b>' +
                    '</a>').join('');
            })
            .catch(() => { rail.innerHTML = '<span class="text-dim">Categories unavailable</span>'; });
    }

    /* ---------- a listing block ---------------------------------------- */
    function loadEvents(options, gridId, errorId, emptyText, onDone) {
        const grid = document.getElementById(gridId);
        const errorBox = document.getElementById(errorId);
        if (!grid) return;

        UI.showSkeleton(grid, 3);

        API.getEvents(options)
            .then((res) => {
                if (errorBox) errorBox.classList.remove('show');

                if (!res.data.length) {
                    grid.innerHTML =
                        '<div class="empty">' + UI.mascot(120) +
                        '<h3>Nothing here yet</h3><p>' + UI.escapeHtml(emptyText) + '</p></div>';
                    if (onDone) onDone([]);
                    return;
                }
                Card.renderGrid(grid, res.data);
                if (onDone) onDone(res.data);
            })
            .catch((err) => {
                grid.innerHTML = '';
                if (errorBox) {
                    errorBox.querySelector('.msg').textContent = 'Could not load events: ' + err.message;
                    errorBox.classList.add('show');
                }
            });
    }

    /* ---------- partner charities -------------------------------------- */
    function loadOrganisations() {
        const grid = document.getElementById('org-grid');
        if (!grid) return;

        API.getOrganisations()
            .then((res) => {
                grid.innerHTML = res.data.map((org) => '' +
                    '<article class="event-card reveal">' +
                        '<div class="card-media" style="height:110px;background:' +
                            'linear-gradient(135deg,rgba(255,77,94,.35),rgba(255,201,77,.25))">' +
                            '<span class="emoji-fallback" style="font-size:3rem">' + (org.logo || '🤝') + '</span>' +
                            '<div class="card-badges"><span class="badge">' + org.event_count + ' events</span></div>' +
                        '</div>' +
                        '<div class="card-body">' +
                            '<h3>' + UI.escapeHtml(org.name) + '</h3>' +
                            '<p class="card-summary">' + UI.escapeHtml(org.mission) + '</p>' +
                            '<ul class="meta-list">' +
                                '<li><span class="mi">&#9993;</span>' + UI.escapeHtml(org.contact_email) + '</li>' +
                                '<li><span class="mi">&#9742;</span>' + UI.escapeHtml(org.phone || '—') + '</li>' +
                                '<li><span class="mi">&#128279;</span>' + UI.escapeHtml(org.website || '—') + '</li>' +
                                '<li><span class="mi">&#128176;</span>' + UI.escapeHtml(org.abn || '—') + '</li>' +
                            '</ul>' +
                        '</div>' +
                    '</article>').join('');
                UI.observeReveals(grid);
            })
            .catch((err) => {
                grid.innerHTML = '<div class="empty">' + UI.mascot(120) +
                    '<h3>Partners unavailable</h3><p>' + UI.escapeHtml(err.message) + '</p></div>';
            });
    }

    /* ---------- footer cities ------------------------------------------- */
    function loadCities() {
        const list = document.getElementById('footer-cities');
        if (!list) return;
        API.getEvents({ time: 'all' })
            .then((res) => {
                const cities = [...new Set(res.data.map((e) => e.suburb))].sort();
                list.innerHTML = cities.map((c) =>
                    '<li><a href="search.html?location=' + encodeURIComponent(c) + '">&#128205; ' +
                    UI.escapeHtml(c) + '</a></li>').join('');
            })
            .catch(() => { list.innerHTML = '<li class="text-dim">Unavailable</li>'; });
    }

    /* ---------- register buttons ---------------------------------------- */
    function initRegisterButtons() {
        document.querySelectorAll('[data-register]').forEach((btn) => {
            btn.addEventListener('click', () => {
                UI.openModal('Registration is on its way',
                    'This feature is currently under construction.',
                    UI.mascot(96));
                UI.confetti(22);
            });
        });
    }

    /* ---------- start ------------------------------------------------------ */
    document.addEventListener('DOMContentLoaded', () => {
        placeMascot();
        loadCategories();
        loadOrganisations();
        loadCities();
        initRegisterButtons();

        // upcoming events feed both the grid and the rotating spotlight
        loadEvents({ time: 'upcoming' }, 'upcoming-grid', 'upcoming-error',
            'There are no upcoming events right now - please check back soon.',
            (events) => {
                spotlightItems = events.slice(0, 4);
                renderSpotlight();
                startSpotlight();
                loadStats(events.map((e) => e.goal.percent));
            });

        loadEvents({ time: 'upcoming', featured: 1 }, 'featured-grid', null,
            'No featured events at the moment.');
        loadEvents({ time: 'past' }, 'past-grid', null, 'No completed events yet.');

        API.health().catch(() =>
            UI.toast('API not reachable - start it with "npm start" in the api folder.', '&#9888;'));
    });
})();
