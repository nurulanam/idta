(function () {
    // duration index (matches .plan-tab data-plan="0"/"1"/"2") -> WooCommerce product IDs
    var PRODUCT_IDS = {
        0: { printed: 15, digital: 14 },
        1: { printed: 17, digital: 16 },
        2: { printed: 19, digital: 18 }
    };

    var cards = document.querySelectorAll('.pricing-card');
    if (!cards.length) return;
    if (!window.ENV || !window.ENV.R2_WORKER_URL) return;

    var workerUrl = window.ENV.R2_WORKER_URL.replace(/\/$/, '');
    var allIds = [];
    Object.keys(PRODUCT_IDS).forEach(function (duration) {
        allIds.push(PRODUCT_IDS[duration].printed, PRODUCT_IDS[duration].digital);
    });

    function regularPriceEl(card) {
        var el = card.querySelector('.pricing-price-regular');
        if (!el) {
            el = document.createElement('span');
            el.className = 'pricing-price-regular';
            var priceEl = card.querySelector('.pricing-price');
            if (priceEl) priceEl.insertAdjacentElement('beforebegin', el);
        }
        return el;
    }

    function updateRegularPrice(card, duration) {
        var regular = card.getAttribute('data-regular-' + duration);
        var el = regularPriceEl(card);
        if (regular) {
            el.textContent = regular;
            el.hidden = false;
        } else {
            el.hidden = true;
        }
    }

    document.addEventListener('plan-duration-changed', function (e) {
        var duration = e.detail && e.detail.duration;
        if (duration === undefined) return;
        cards.forEach(function (card) { updateRegularPrice(card, duration); });
    });

    // show a shimmering skeleton in place of the price while the live values load,
    // remembering the original static text so it can be restored if the fetch fails
    cards.forEach(function (card) {
        var priceEl = card.querySelector('.pricing-price');
        if (!priceEl) return;
        card.dataset.staticPrice = priceEl.textContent;
        priceEl.classList.add('price-skeleton');
        priceEl.textContent = '';
    });

    function clearSkeleton(card) {
        var priceEl = card.querySelector('.pricing-price');
        if (priceEl) priceEl.classList.remove('price-skeleton');
    }

    fetch(workerUrl + '/products?include=' + allIds.join(','))
        .then(function (res) {
            if (!res.ok) throw new Error('Request failed with status ' + res.status);
            return res.json();
        })
        .then(function (data) {
            var products = (data && data.products) || [];
            var byId = {};
            products.forEach(function (p) { byId[p.id] = p; });

            cards.forEach(function (card) {
                var titleEl = card.querySelector('.pricing-title');
                var kind = titleEl && titleEl.textContent.trim().indexOf('Printed') === 0 ? 'printed' : 'digital';

                Object.keys(PRODUCT_IDS).forEach(function (duration) {
                    var product = byId[PRODUCT_IDS[duration][kind]];
                    if (!product) return;
                    if (product.priceDisplay) card.setAttribute('data-price-' + duration, product.priceDisplay);
                    if (product.onSale && product.regularPriceDisplay) {
                        card.setAttribute('data-regular-' + duration, product.regularPriceDisplay);
                    } else {
                        card.removeAttribute('data-regular-' + duration);
                    }
                });

                var activeTab = document.querySelector('.plan-tab.active');
                var activeDuration = activeTab ? activeTab.dataset.plan : '0';

                var currentPrice = card.getAttribute('data-price-' + activeDuration);
                var priceEl = card.querySelector('.pricing-price');
                clearSkeleton(card);
                if (currentPrice) {
                    if (priceEl) priceEl.textContent = currentPrice;
                    if (card.dataset.price !== undefined) card.dataset.price = currentPrice;
                } else if (priceEl) {
                    priceEl.textContent = card.dataset.staticPrice || '';
                }

                updateRegularPrice(card, activeDuration);
            });
        })
        .catch(function (err) {
            console.error('pricing-live.js: failed to load live prices —', err);
            cards.forEach(function (card) {
                clearSkeleton(card);
                var priceEl = card.querySelector('.pricing-price');
                if (priceEl) priceEl.textContent = card.dataset.staticPrice || '';
            });
        });
})();
