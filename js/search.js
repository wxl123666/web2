/* =====================================================================
 * search.js - logic for search.html
 *
 * Responsibilities
 *   1. fill the category <select> from GET /api/categories
 *   2. read the form, validate it, and build the query string
 *   3. call GET /api/events/search and render the results
 *   4. show readable error / empty messages using DOM manipulation
 *   5. "Clear Filters" resets every control and reloads the full list
 *   6. support deep links such as search.html?category=3
 * ===================================================================== */

(function () {
    'use strict';

    const UI = window.UI;
    const API = window.EventAPI;
    const Card = window.EventCard;

    const form      = document.getElementById('search-form');
    const results   = document.getElementById('results');
    const errorBox  = document.getElementById('error-box');
    const noticeBox = document.getElementById('notice-box');
    const countText = document.getElementById('result-count');

    /* ---------- messages ---------------------------------------------- */

    function showError(message) {
        if (!errorBox) return;
        errorBox.querySelector('.msg').textContent = message;
        errorBox.classList.add('show');
    }
    function hideError() { if (errorBox) errorBox.classList.remove('show'); }

    function showNotice(message) {
        if (!noticeBox) return;
        noticeBox.querySelector('.msg').textContent = message;
        noticeBox.classList.add('show');
    }
    function hideNotice() { if (noticeBox) noticeBox.classList.remove('show'); }

    function showEmpty(criteria) {
        results.innerHTML = '' +
            '<div class="empty">' + UI.mascot(120) +
                '<h3>No events match those filters</h3>' +
                '<p>' + (criteria || 'Try widening your date range, or clear the filters to see everything.') + '</p>' +
            '</div>';
    }

    /* ---------- 1. categories dropdown -------------------------------- */

    function loadCategories(preselect) {
        const select = document.getElementById('f-category');
        if (!select) return;

        API.getCategories()
            .then((res) => {
                res.data.forEach((cat) => {
                    const option = document.createElement('option');
                    option.value = cat.category_id;
                    option.textContent = cat.icon + ' ' + cat.name + ' (' + cat.event_count + ')';
                    select.appendChild(option);
                });
                if (preselect) select.value = preselect;
            })
            .catch((err) => {
                showNotice('Category list could not be loaded: ' + err.message);
            });
    }

    /* ---------- 2. read + validate the form --------------------------- */

    function readForm() {
        const date = document.getElementById('f-date').value.trim();
        const location = document.getElementById('f-location').value.trim();
        const category = document.getElementById('f-category').value.trim();
        const keyword = document.getElementById('f-keyword').value.trim();
        const maxPrice = document.getElementById('f-maxprice').value.trim();
        const freeOnly = document.getElementById('f-free').checked;
        const sort = document.getElementById('f-sort').value;

        // --- client-side validation (the API validates again) ---
        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            showError('Please enter the date in the format YYYY-MM-DD.');
            return null;
        }
        if (location && location.length > 80) {
            showError('Location must be 80 characters or fewer.');
            return null;
        }
        if (maxPrice !== '' && (isNaN(Number(maxPrice)) || Number(maxPrice) < 0)) {
            showError('Maximum price must be a positive number.');
            return null;
        }

        hideError();

        return {
            date: date || null,
            location: location || null,
            category: category || null,
            q: keyword || null,
            max_price: maxPrice || null,
            free: freeOnly ? '1' : null,
            sort: sort || null
        };
    }

    /* ---------- 3. run a search --------------------------------------- */

    function runSearch(criteria) {
        UI.showSkeleton(results, 3);
        hideNotice();

        API.searchEvents(criteria)
            .then((res) => {
                if (countText) {
                    countText.textContent = res.count + (res.count === 1 ? ' event found' : ' events found');
                }

                if (!res.data.length) {
                    const used = Object.keys(criteria || {}).filter((k) => criteria[k]);
                    showEmpty(used.length
                        ? 'You filtered on ' + used.length + ' criterion/criteria. Try removing one of them.'
                        : 'There are no published events in the database yet.');
                    return;
                }

                Card.renderGrid(results, res.data);
            })
            .catch((err) => {
                results.innerHTML = '';
                if (countText) countText.textContent = '';
                showError('Search failed: ' + err.message);
            });
    }

    /* ---------- 4. events --------------------------------------------- */

    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();              // never reload the page
            const criteria = readForm();
            if (criteria) runSearch(criteria);
        });

        // "Clear Filters" - plain DOM manipulation, no page reload.
        form.addEventListener('reset', () => {
            // let the browser reset first, then clean up and reload everything
            setTimeout(() => {
                hideError();
                hideNotice();
                document.getElementById('f-category').value = '';
                document.getElementById('f-sort').value = 'date';
                history.replaceState(null, '', 'search.html');
                if (countText) countText.textContent = '';
                runSearch({});
                UI.toast('Filters cleared - showing all upcoming events.', '&#10003;');
            }, 0);
        });
    }

    /* ---------- 5. start ---------------------------------------------- */

    document.addEventListener('DOMContentLoaded', () => {
        // cute mascot beside the heading
        const mascotHost = document.getElementById('search-mascot');
        if (mascotHost) mascotHost.innerHTML = UI.mascot(150);

        // deep link support: search.html?category=2
        const params = new URLSearchParams(location.search);
        const presetCategory = params.get('category');
        const presetLocation = params.get('location');

        loadCategories(presetCategory);
        if (presetLocation) document.getElementById('f-location').value = presetLocation;

        // Show every published event on first load so the page is never empty.
        runSearch({
            category: presetCategory || null,
            location: presetLocation || null
        });
    });
})();
