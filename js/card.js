/* =====================================================================
 * card.js - one reusable "event card".
 *
 * The home page and the search page both show the same summary of an
 * event, so the markup is built here once and reused.
 *
 * The banner now shows the REAL hand-drawn SVG illustration stored in
 * events.image_url (assets/img/*.svg) instead of an emoji. The emoji is
 * kept behind the image as a fallback if a file is ever missing.
 * ===================================================================== */

(function () {
    'use strict';

    const UI = window.UI;

    function render(event) {
        const isPast = event.time_status === 'past';
        const colour = (event.category && event.category.colour) || '#ff4d5e';
        const icon = (event.category && event.category.icon) || '🎪';

        const badges = [];
        badges.push(
            '<span class="badge cat" style="background:' + colour + '">' +
            UI.escapeHtml(event.category ? event.category.name : 'Event') + '</span>'
        );
        if (event.featured) badges.push('<span class="badge featured">&#9733; Featured</span>');
        if (event.is_free)  badges.push('<span class="badge free">Free entry</span>');
        if (isPast) {
            badges.push('<span class="badge past">Completed</span>');
        } else if (event.days_until <= 7) {
            badges.push('<span class="badge soon">&#9201; ' + UI.countdownLabel(event.days_until) + '</span>');
        }

        const seatsLeft = event.capacity ? (event.capacity - event.seats_taken) : null;
        const seatsText = seatsLeft !== null
            ? (seatsLeft > 0 ? seatsLeft.toLocaleString('en-AU') + ' places left' : 'Fully booked')
            : 'Open entry';

        const media = event.image_url
            ? '<img src="' + UI.escapeHtml(event.image_url) + '" alt="' + UI.escapeHtml(event.name) +
              '" loading="lazy" onerror="this.style.display=\'none\'">'
            : '';

        return '' +
        '<article class="event-card reveal">' +
            '<a class="card-media" href="event.html?id=' + event.event_id + '" aria-label="' + UI.escapeHtml(event.name) + '">' +
                '<span class="emoji-fallback">' + icon + '</span>' +
                media +
                '<div class="card-badges">' + badges.join('') + '</div>' +
            '</a>' +
            '<div class="card-body">' +
                '<h3>' + UI.escapeHtml(event.name) + '</h3>' +
                '<p class="card-summary">' + UI.escapeHtml(event.summary) + '</p>' +
                '<ul class="meta-list">' +
                    '<li><span class="mi">&#128197;</span>' + UI.longDate(event.event_date) +
                        (isPast ? '' : ' <em class="text-dim">(' + UI.countdownLabel(event.days_until) + ')</em>') + '</li>' +
                    '<li><span class="mi">&#128339;</span>' + UI.shortTime(event.event_date) + '</li>' +
                    '<li><span class="mi">&#128205;</span>' + UI.escapeHtml(event.venue) + ', ' + UI.escapeHtml(event.suburb) + '</li>' +
                    '<li><span class="mi">&#127891;</span>' + UI.escapeHtml(event.organisation.name) + '</li>' +
                '</ul>' +
                '<div class="progress">' +
                    '<div class="progress-head">' +
                        '<span>' + UI.money(event.goal.raised_amount) + ' raised</span>' +
                        '<b>' + event.goal.percent + '%</b>' +
                    '</div>' +
                    '<div class="bar"><span data-bar="' + event.goal.percent + '"></span>' +
                        '<span class="runner" data-runner>&#10084;</span></div>' +
                '</div>' +
            '</div>' +
            '<div class="card-foot">' +
                '<span class="price' + (event.is_free ? ' free' : '') + '">' +
                    (event.is_free ? 'Free' : UI.money(event.ticket_price)) +
                '</span>' +
                '<span style="display:flex;align-items:center;gap:.9rem">' +
                    '<small class="text-dim">' + seatsText + '</small>' +
                    '<a class="card-link" href="event.html?id=' + event.event_id + '">Details &#8594;</a>' +
                '</span>' +
            '</div>' +
        '</article>';
    }

    /** Renders a list of cards into a container and animates the bars. */
    function renderGrid(container, events) {
        if (!container) return;
        container.innerHTML = events.map(render).join('');
        UI.observeReveals(container);
        // let the browser paint, then grow every progress bar
        requestAnimationFrame(() => {
            container.querySelectorAll('[data-bar]').forEach((bar) => {
                UI.fillBar(bar, Number(bar.dataset.bar), true);
            });
        });
    }

    window.EventCard = { render, renderGrid };
})();
