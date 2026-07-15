// Scroll-triggered fade-up reveals + number count-ups, applied site-wide so
// pages feel less static without hand-wiring animations per section.
(function () {
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- fade-up reveal on scroll ----------
    // (skeleton cards are excluded — they're loading placeholders, not content to fade in)
    var REVEAL_SELECTORS = [
        '.product-card:not(.product-card-skeleton)', '.why-card', '.step-card', '.badge-card',
        '.review-card', '.pricing-card', '.destination-content > *',
        '.page-header .h2-lg', '.h2-md', '.h2-faq'
    ];
    var REVEAL_SELECTOR = REVEAL_SELECTORS.join(',');

    function setupReveal() {
        if (reduceMotion || !('IntersectionObserver' in window)) {
            document.querySelectorAll(REVEAL_SELECTOR).forEach(function (el) {
                el.classList.add('reveal', 'is-visible');
            });
            return;
        }

        var counters = new WeakMap();
        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

        function wire(el) {
            if (el.classList.contains('reveal')) return;
            el.classList.add('reveal');
            var parent = el.parentElement;
            var index = counters.get(parent) || 0;
            el.style.setProperty('--reveal-delay', Math.min(index * 0.05, 0.25) + 's');
            counters.set(parent, index + 1);
            observer.observe(el);
        }

        document.querySelectorAll(REVEAL_SELECTOR).forEach(wire);

        // product/premium grids render their cards asynchronously (fetched from
        // WooCommerce) well after this script runs, so keep watching for them
        var mutationObserver = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType !== 1) return;
                    if (node.matches && node.matches(REVEAL_SELECTOR)) wire(node);
                    if (node.querySelectorAll) node.querySelectorAll(REVEAL_SELECTOR).forEach(wire);
                });
            });
        });
        mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    // ---------- count-up numbers (hero trust count, review rating/count) ----------
    function animateCount(el) {
        var raw = el.textContent;
        var match = raw.match(/[\d,]+(\.\d+)?/);
        if (!match) return;

        var numStr = match[0];
        var hasComma = numStr.indexOf(',') !== -1;
        var decimals = match[1] ? match[1].length - 1 : 0;
        var target = parseFloat(numStr.replace(/,/g, ''));
        if (isNaN(target)) return;

        var prefix = raw.slice(0, match.index);
        var suffix = raw.slice(match.index + numStr.length);
        var duration = 1400;
        var startTime = null;

        function format(value) {
            var fixed = value.toFixed(decimals);
            if (hasComma) {
                var parts = fixed.split('.');
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                fixed = parts.join('.');
            }
            return prefix + fixed + suffix;
        }

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = format(target * eased);
            if (progress < 1) window.requestAnimationFrame(step);
        }
        window.requestAnimationFrame(step);
    }

    function setupCountUp() {
        var els = document.querySelectorAll('.hero-trust strong, .rating-number, .rating-count');
        if (!els.length || reduceMotion || !('IntersectionObserver' in window)) return;

        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animateCount(entry.target);
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        els.forEach(function (el) { observer.observe(el); });
    }

    setupReveal();
    setupCountUp();
})();
