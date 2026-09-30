/* =====================================================================
 * api.js - every call the website makes to the RESTful API.
 *
 * The brief requires the client-side to CONSUME the APIs built in Part 2.
 * Each function below:
 *      1. builds the URL
 *      2. calls fetch()  (a Promise)
 *      3. checks the HTTP status and throws a friendly Error when needed
 *      4. returns only the useful payload
 *
 * Nothing here touches the DOM - that is the job of home.js / search.js /
 * event.js, so the data layer and the view layer stay separate.
 * ===================================================================== */

(function () {
    'use strict';

    const BASE = window.APP_CONFIG.API_BASE_URL;
    const TIMEOUT = window.APP_CONFIG.REQUEST_TIMEOUT;

    /**
     * fetch() with a timeout, because a browser tab will otherwise wait
     * forever when the API has not been started.
     */
    function request(path) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT);

        return fetch(BASE + path, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: controller.signal
        })
            .then((response) => {
                clearTimeout(timer);
                return response.json().catch(() => ({})).then((body) => {
                    if (!response.ok) {
                        // The API always answers with { success:false, message }
                        const message = body.message || `Server responded with ${response.status}`;
                        const err = new Error(message);
                        err.status = response.status;
                        throw err;
                    }
                    return body;
                });
            })
            .catch((err) => {
                clearTimeout(timer);
                if (err.name === 'AbortError') {
                    throw new Error('The API did not respond. Make sure the API server is running (npm start in the api folder).');
                }
                if (err instanceof TypeError) {
                    throw new Error('Cannot reach the API at ' + BASE + '. Is the server running on port 3000?');
                }
                throw err;
            });
    }

    /** Builds "?a=1&b=2" from an object, skipping empty values. */
    function toQuery(params) {
        const parts = [];
        Object.keys(params || {}).forEach((key) => {
            const value = params[key];
            if (value !== null && value !== undefined && value !== '') {
                parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
            }
        });
        return parts.length ? '?' + parts.join('&') : '';
    }

    window.EventAPI = {
        /** GET /api/health */
        health: () => request('/health'),

        /** GET /api/events?time=upcoming|past|all */
        getEvents: (options) => request('/events' + toQuery(options || {})),

        /** GET /api/events/search?date=&location=&category= */
        searchEvents: (criteria) => request('/events/search' + toQuery(criteria || {})),

        /** GET /api/events/:id */
        getEvent: (id) => request('/events/' + encodeURIComponent(id)),

        /** GET /api/events/:id/similar */
        getSimilar: (id) => request('/events/' + encodeURIComponent(id) + '/similar'),

        /** GET /api/categories */
        getCategories: () => request('/categories'),

        /** GET /api/organisations */
        getOrganisations: () => request('/organisations'),

        /** GET /api/stats */
        getStats: () => request('/stats')
    };
})();
