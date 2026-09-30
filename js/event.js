/* =====================================================================
 * event.js - logic for event.html
 *
 * The event id is passed from the Home / Search page as a URL query
 * string:   event.html?id=3
 * (the brief suggests query strings or local storage - this project uses
 * the query string, and also remembers the last viewed event in
 * localStorage so the breadcrumb can offer "back to where you were").
 *
 * Two endpoints feed this page:
 *   GET /api/events/:id          the event itself
 *   GET /api/events/:id/similar  a few related upcoming events
 * ===================================================================== */

(function () {
    'use strict';

    const UI = window.UI;
    const API = window.EventAPI;
    const Card = window.EventCard;

    const errorBox = document.getElementById('error-box');

    function showError(message) {
        if (!errorBox) return;
        errorBox.querySelector('.msg').textContent = message;
        errorBox.classList.add('show');
    }

    /* ---------- read the id from the query string ---------------------- */

    function getEventId() {
        const params = new URLSearchParams(location.search);
        const raw = params.get('id');
        const id = Number(raw);

        if (!raw || !Number.isInteger(id) || id <= 0) return null;

        // remember it, so other pages can offer "continue where you left off"
        try { localStorage.setItem('lastEventId', String(id)); } catch (e) { /* ignore */ }
        return id;
    }

    /* ---------- render -------------------------------------------------- */

    function renderHero(event) {
        const hero = document.getElementById('event-hero');
        hero.style.display = '';
        const img = document.getElementById('dh-img');
        if (event.image_url) {
            img.src = event.image_url;
            img.onerror = () => { img.style.display = 'none'; };
        }

        document.getElementById('hero-title').textContent = event.name;
        document.getElementById('hero-summary').textContent = event.summary || '';

        const badges = [];
        badges.push('<span class="badge cat" style="background:' + event.category.colour + '">' +
                    event.category.icon + ' ' + UI.escapeHtml(event.category.name) + '</span>');
        if (event.is_free) badges.push('<span class="badge free">Free entry</span>');
        if (event.featured) badges.push('<span class="badge featured">&#9733; Featured</span>');
        if (event.time_status === 'past') badges.push('<span class="badge past">Completed</span>');
        else badges.push('<span class="badge soon">&#9201; ' + UI.countdownLabel(event.days_until) + '</span>');
        document.getElementById('hero-badges').innerHTML = badges.join('');

        document.title = event.name + ' | Hebei Charity Events';
        document.getElementById('crumb').textContent = event.name;
    }

    function renderDetails(event) {
        document.getElementById('detail-body').style.display = '';

        document.getElementById('event-description').textContent = event.description || event.summary || '';

        const rows = [
            ['Date', UI.longDate(event.event_date)],
            ['Start time', UI.shortTime(event.event_date)],
            ['Finishes', event.end_date ? UI.shortTime(event.end_date) : '—'],
            ['Venue', event.venue],
            ['Address', event.address + ', ' + event.suburb + ' ' + event.city],
            ['Category', event.category.icon + ' ' + event.category.name],
            ['Organisation', event.organisation.name],
            ['Ticket price', event.is_free ? 'Free' : UI.money(event.ticket_price)],
            ['Capacity', event.capacity ? event.capacity.toLocaleString('en-AU') + ' places' : 'Unlimited']
        ];

        document.getElementById('info-rows').innerHTML = rows.map((r) =>
            '<div class="info-row"><dt>' + r[0] + '</dt><dd>' + UI.escapeHtml(r[1]) + '</dd></div>'
        ).join('');

        // organisation block
        document.getElementById('org-logo').textContent = event.organisation.logo || '🤝';
        document.getElementById('org-name').textContent = event.organisation.name;
        document.getElementById('org-mission').textContent = event.organisation.mission || '';
        document.getElementById('org-email').innerHTML = '&#9993; ' + UI.escapeHtml(event.organisation.contact_email || '—');
        document.getElementById('org-phone').innerHTML = '&#9742; ' + UI.escapeHtml(event.organisation.phone || '—');
        document.getElementById('org-website').innerHTML = '&#128279; ' + UI.escapeHtml(event.organisation.website || '—');
    }

    function renderGoal(event) {
        const goal = event.goal || {};
        const target = Number(goal.target_amount || 0);
        const raised = Number(goal.raised_amount || 0);
        const percent = target > 0 ? Math.min(100, (raised / target) * 100) : 0;

        document.getElementById('goal-title').textContent = goal.title || 'Fundraising goal';
        document.getElementById('goal-raised').textContent = UI.money(raised);
        document.getElementById('goal-target').textContent = UI.money(target);
        document.getElementById('goal-percent').textContent = percent.toFixed(1) + '%';
        document.getElementById('goal-remaining').textContent =
            'still needed: ' + UI.money(Math.max(0, target - raised));
        document.getElementById('goal-unit').textContent =
            (goal.unit_label || 'dollars raised') + ' · ' + event.donation_count + ' gifts so far';

        UI.fillBar(document.getElementById('goal-bar'), percent, true);
    }

    function renderTickets(event) {
        document.getElementById('ticket-price').textContent =
            event.is_free ? 'Free' : UI.money(event.ticket_price);
        document.getElementById('ticket-note').textContent = event.is_free
            ? 'no ticket required, donations welcome'
            : 'per person · 100% of the price is a donation';

        const seatsBar = document.getElementById('seats-bar');
        const seatsText = document.getElementById('seats-text');
        if (event.capacity) {
            const taken = Math.min(100, (event.seats_taken / event.capacity) * 100);
            seatsBar.style.background = 'linear-gradient(90deg,#f59e0b,#fb7185)';
            UI.fillBar(seatsBar, taken);
            seatsText.innerHTML = '<b>' + event.seats_taken.toLocaleString('en-AU') + '</b> of ' +
                event.capacity.toLocaleString('en-AU') + ' places taken &middot; <b>' +
                Math.max(0, event.capacity - event.seats_taken).toLocaleString('en-AU') + '</b> left';
        } else {
            UI.fillBar(seatsBar, 100);
            seatsBar.style.background = 'linear-gradient(90deg,#34d399,#22d3ee)';
            seatsText.textContent = 'Open entry - no capacity limit.';
        }
    }

    function renderDonations(event) {
        const list = document.getElementById('donation-list');
        const gifts = event.recent_donations || [];

        if (!gifts.length) {
            list.innerHTML = '<li><span class="dm">No donations recorded yet - be the first!</span></li>';
            return;
        }

        list.innerHTML = gifts.map((g) => '' +
            '<li>' +
                '<span class="av">' + UI.escapeHtml(g.donor.charAt(0).toUpperCase()) + '</span>' +
                '<span>' +
                    '<span class="dn">' + UI.escapeHtml(g.donor) + '</span>' +
                    '<span class="dm">' + UI.escapeHtml(g.message || 'Thank you for the work you do.') + '</span>' +
                '</span>' +
                '<span class="da">' + UI.money(g.amount) + '</span>' +
            '</li>').join('');
    }

    function loadSimilar(id) {
        const section = document.getElementById('similar-section');
        const grid = document.getElementById('similar-grid');

        API.getSimilar(id)
            .then((res) => {
                if (!res.data.length) return;
                section.style.display = '';
                Card.renderGrid(grid, res.data);
            })
            .catch(() => { /* similar events are optional - fail silently */ });
    }

    /* ---------- Register button ---------------------------------------- */

    function initRegister(event) {
        const btn = document.getElementById('register-btn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            UI.openModal(
                'Registration is on its way',
                'This feature is currently under construction.',
                UI.mascot(96)
            );
            UI.confetti(30);
            UI.toast('Register: ' + event.name + ' — under construction.', '&#128295;');
        });
    }

    /* ---------- start --------------------------------------------------- */

    document.addEventListener('DOMContentLoaded', () => {
        const id = getEventId();

        if (!id) {
            showError('No event was selected. Please open an event from the Home or Search page ' +
                      '(the link should look like event.html?id=1).');
            return;
        }

        UI.showSkeleton(document.getElementById('similar-grid'), 3);

        API.getEvent(id)
            .then((res) => {
                const event = res.data;
                renderHero(event);
                renderDetails(event);
                renderGoal(event);
                renderTickets(event);
                renderDonations(event);
                initRegister(event);
                UI.observeReveals(document);
                loadSimilar(id);
            })
            .catch((err) => {
                showError('Could not load this event: ' + err.message);
            });
    });
})();
