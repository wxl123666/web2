/* =====================================================================
 * ui.js - shared DOM helpers used by all three pages.
 *
 * Contains: navigation (with the sliding pill), scroll-reveal, animated
 * counters, toast messages, the "under construction" modal, skeleton
 * placeholders, the drifting lantern background, the cute mascot and the
 * heart confetti burst. Loaded before the page scripts.
 * ===================================================================== */

(function () {
    'use strict';

    /* ---------- formatting helpers ----------------------------------- */

    const money = (value) => '$' + Number(value || 0).toLocaleString('en-AU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    const longDate = (value) => {
        if (!value) return 'TBA';
        const d = new Date(String(value).replace(' ', 'T'));
        if (isNaN(d)) return value;
        return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };

    const shortTime = (value) => {
        if (!value) return '';
        const raw = String(value);
        const timePart = raw.length > 8 ? raw.slice(11, 16) : raw.slice(0, 5);
        const [h, m] = timePart.split(':').map(Number);
        if (isNaN(h)) return raw;
        const suffix = h < 12 ? 'AM' : 'PM';
        const hour = h % 12 === 0 ? 12 : h % 12;
        return hour + ':' + String(m).padStart(2, '0') + ' ' + suffix;
    };

    const countdownLabel = (daysUntil) => {
        if (daysUntil === null || daysUntil === undefined) return '';
        if (daysUntil < 0) return Math.abs(daysUntil) + ' days ago';
        if (daysUntil === 0) return 'Today';
        if (daysUntil === 1) return 'Tomorrow';
        return 'in ' + daysUntil + ' days';
    };

    const escapeHtml = (text) => String(text === null || text === undefined ? '' : text)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    /* ---------- the cute mascot -------------------------------------- */

    function mascot(size) {
        return '' +
        '<svg class="mascot" viewBox="0 0 200 200" style="width:' + (size || 190) + 'px" aria-hidden="true">' +
            '<defs>' +
                '<linearGradient id="mbody" x1="0" y1="0" x2="1" y2="1">' +
                    '<stop offset="0%" stop-color="#ff8a95"/>' +
                    '<stop offset="55%" stop-color="#ff4d5e"/>' +
                    '<stop offset="100%" stop-color="#c9184a"/>' +
                '</linearGradient>' +
            '</defs>' +
            '<ellipse cx="100" cy="182" rx="48" ry="9" fill="rgba(0,0,0,.45)"/>' +
            /* arms */
            '<rect class="arm-l" x="24" y="116" width="14" height="42" rx="7" fill="#ff6b7a"/>' +
            '<rect class="arm" x="162" y="116" width="14" height="42" rx="7" fill="#ff6b7a"/>' +
            /* heart-shaped body */
            '<path d="M100 168 C42 122 18 88 30 64 C42 40 78 40 100 66 C122 40 158 40 170 64 C182 88 158 122 100 168 Z" fill="url(#mbody)"/>' +
            /* shine */
            '<ellipse cx="66" cy="76" rx="16" ry="10" fill="#fff" opacity=".22" transform="rotate(-24 66 76)"/>' +
            /* eyes */
            '<g class="eye"><ellipse cx="78" cy="92" rx="13" ry="15" fill="#fff"/>' +
                '<circle cx="80" cy="94" r="7" fill="#2a0710"/>' +
                '<circle cx="83" cy="90" r="2.6" fill="#fff"/></g>' +
            '<g class="eye"><ellipse cx="122" cy="92" rx="13" ry="15" fill="#fff"/>' +
                '<circle cx="124" cy="94" r="7" fill="#2a0710"/>' +
                '<circle cx="127" cy="90" r="2.6" fill="#fff"/></g>' +
            /* blush */
            '<ellipse cx="60" cy="112" rx="9" ry="6" fill="#ff9db0" opacity=".8"/>' +
            '<ellipse cx="140" cy="112" rx="9" ry="6" fill="#ff9db0" opacity=".8"/>' +
            /* smile */
            '<path d="M90 116 q10 10 20 0" stroke="#2a0710" stroke-width="4" fill="none" stroke-linecap="round"/>' +
            /* sparkle */
            '<path class="mspark" d="M100 22 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" fill="#ffc94d"/>' +
        '</svg>';
    }

    /* ---------- drifting lanterns ------------------------------------ */

    const LANTERN_SVG =
        '<svg viewBox="0 0 40 64" aria-hidden="true">' +
        '<rect x="13" y="6" width="14" height="6" rx="2.5" fill="#ffc94d"/>' +
        '<ellipse cx="20" cy="32" rx="16" ry="19" fill="#ff4d5e"/>' +
        '<ellipse cx="20" cy="32" rx="7" ry="17" fill="#ffc94d" opacity=".45"/>' +
        '<rect x="13" y="49" width="14" height="6" rx="2.5" fill="#ffc94d"/>' +
        '<path d="M20 55 v9" stroke="#ffc94d" stroke-width="2"/>' +
        '</svg>';

    function initLanterns() {
        // respect the OS "reduce motion" setting when the browser exposes it
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let host = document.querySelector('.lanterns');
        if (!host) {
            host = document.createElement('div');
            host.className = 'lanterns';
            document.body.appendChild(host);
        }
        const colours = ['#ff4d5e', '#ffc94d', '#ff7a8a'];
        for (let i = 0; i < 7; i++) {
            const l = document.createElement('div');
            l.className = 'lantern';
            l.innerHTML = LANTERN_SVG;
            l.style.left = (6 + Math.random() * 88) + '%';
            l.style.animationDuration = (16 + Math.random() * 14) + 's';
            l.style.animationDelay = (-Math.random() * 22) + 's';
            const svg = l.querySelector('svg');
            svg.querySelector('ellipse').setAttribute('fill', colours[i % colours.length]);
            l.style.width = (22 + Math.random() * 22) + 'px';
            host.appendChild(l);
        }
    }

    /* ---------- heart confetti --------------------------------------- */

    function confetti(count) {
        const layer = document.createElement('div');
        layer.className = 'confetti-layer';
        document.body.appendChild(layer);

        const shapes = [
            '<svg viewBox="0 0 20 20"><path d="M10 17 C2 11 0 7 1 4 C2 1 6 1 10 5 C14 1 18 1 19 4 C20 7 18 11 10 17 Z" fill="#ff4d5e"/></svg>',
            '<svg viewBox="0 0 20 20"><path d="M10 1 l2.4 5.6 6 .6 -4.5 4 1.3 5.9 -5.2 -3.1 -5.2 3.1 1.3 -5.9 -4.5 -4 6 -.6 z" fill="#ffc94d"/></svg>',
            '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="#3ddc97"/></svg>',
            '<svg viewBox="0 0 20 20"><rect x="4" y="4" width="12" height="12" rx="3" fill="#4cc9f0"/></svg>'
        ];

        const n = count || 26;
        for (let i = 0; i < n; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti';
            piece.innerHTML = shapes[i % shapes.length];
            const startX = 20 + Math.random() * 60;
            piece.style.left = startX + 'vw';
            piece.style.top = '-5vh';
            layer.appendChild(piece);

            const dx = (Math.random() - 0.5) * 320;
            const dur = 2000 + Math.random() * 1500;
            piece.animate([
                { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
                { transform: 'translate(' + dx + 'px, 88vh) rotate(' + (Math.random() * 900 - 450) + 'deg)', opacity: 0 }
            ], { duration: dur, easing: 'cubic-bezier(.2,.6,.4,1)' });
        }
        setTimeout(() => layer.remove(), 4200);
    }

    /* ---------- navigation ------------------------------------------- */

    function initNav() {
        const page = document.body.dataset.page || 'home';
        const links = document.querySelectorAll('[data-nav]');
        links.forEach((link) => {
            if (link.dataset.nav === page) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }
        });

        // sliding pill behind the active link
        const list = document.querySelector('.nav-links');
        const pill = document.querySelector('.nav-pill');
        const active = document.querySelector('[data-nav].active');

        function movePill(el) {
            if (!pill || !el || !list) return;
            const lr = list.getBoundingClientRect();
            const er = el.getBoundingClientRect();
            pill.style.width = er.width + 'px';
            pill.style.transform = 'translateX(' + (er.left - lr.left) + 'px)';
            pill.style.opacity = '1';
        }

        if (active) {
            requestAnimationFrame(() => movePill(active));
            window.addEventListener('resize', () => movePill(active));
        }
        links.forEach((l) => l.addEventListener('mouseenter', () => movePill(l)));
        if (list && active) {
            list.addEventListener('mouseleave', () => movePill(active));
        }

        const navbar = document.querySelector('.navbar');
        const toggle = document.querySelector('.nav-toggle');
        if (toggle && list) {
            toggle.addEventListener('click', () => list.classList.toggle('open'));
        }
        window.addEventListener('scroll', () => {
            if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 16);
        }, { passive: true });
    }

    /* ---------- back to top ------------------------------------------- */

    function initBackToTop() {
        const btn = document.createElement('button');
        btn.className = 'to-top';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Back to top');
        btn.innerHTML = '&#8593;';
        btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        document.body.appendChild(btn);
        window.addEventListener('scroll', () => {
            btn.classList.toggle('show', window.scrollY > 600);
        }, { passive: true });
    }

    /* ---------- scroll reveal ----------------------------------------- */

    let observer = null;
    function initReveal() {
        if (!('IntersectionObserver' in window)) {
            document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
            return;
        }
        observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        observeReveals();
    }

    function observeReveals(root) {
        const scope = root || document;
        scope.querySelectorAll('.reveal:not(.in)').forEach((el, i) => {
            el.style.transitionDelay = Math.min(i * 55, 400) + 'ms';
            if (observer) observer.observe(el);
        });
    }

    /* ---------- animated counters ------------------------------------- */

    function animateCounter(el) {
        const target = Number(el.dataset.count || 0);
        const duration = 1500;
        const start = performance.now();
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';

        function step(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = Math.round(target * eased);
            el.textContent = prefix + value.toLocaleString('en-AU') + suffix;
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    /* ---------- toast -------------------------------------------------- */

    function toast(message, icon) {
        let host = document.querySelector('.toast');
        if (!host) {
            host = document.createElement('div');
            host.className = 'toast';
            document.body.appendChild(host);
        }
        const item = document.createElement('div');
        item.className = 'toast-item';
        item.innerHTML = '<span>' + (icon || '&#9432;') + '</span><span>' + escapeHtml(message) + '</span>';
        host.appendChild(item);
        setTimeout(() => {
            item.style.transition = 'opacity .4s, transform .4s';
            item.style.opacity = '0';
            item.style.transform = 'translateX(20px)';
            setTimeout(() => item.remove(), 420);
        }, 3600);
    }

    /* ---------- modal --------------------------------------------------- */

    function openModal(title, message, icon) {
        const modal = document.getElementById('modal');
        if (!modal) return;
        modal.querySelector('.modal-title').textContent = title;
        modal.querySelector('.modal-message').textContent = message;
        modal.querySelector('.mi').innerHTML = icon || '';
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
    }

    function initModal() {
        const modal = document.getElementById('modal');
        if (!modal) return;
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.closest('[data-close-modal]')) {
                modal.classList.remove('show');
                modal.setAttribute('aria-hidden', 'true');
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') modal.classList.remove('show');
        });
    }

    /* ---------- skeletons ---------------------------------------------- */

    function showSkeleton(container, count) {
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < (count || 3); i++) {
            const div = document.createElement('div');
            div.className = 'skeleton';
            container.appendChild(div);
        }
    }

    /* ---------- progress bars (with a little runner emoji) ------------- */

    function fillBar(barEl, percent, runner) {
        if (!barEl) return;
        const p = Math.max(0, Math.min(100, percent));
        requestAnimationFrame(() => {
            barEl.style.width = p + '%';
            if (runner) {
                const r = barEl.parentNode.querySelector('.runner');
                if (r) r.style.left = p + '%';
            }
        });
    }

    /* ---------- public API --------------------------------------------- */

    window.UI = {
        money, longDate, shortTime, countdownLabel, escapeHtml,
        mascot, initLanterns, confetti,
        initNav, initBackToTop, initReveal, observeReveals,
        animateCounter, toast, openModal, initModal,
        showSkeleton, fillBar
    };

    document.addEventListener('DOMContentLoaded', () => {
        initNav();
        initBackToTop();
        initReveal();
        initModal();
        initLanterns();
    });
})();
