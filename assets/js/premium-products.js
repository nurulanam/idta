(function () {
    function stripHtml(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html || '';
        return (tmp.textContent || tmp.innerText || '').trim();
    }

    function starString(rating) {
        var n = Math.round(Number(rating) || 5);
        n = Math.min(5, Math.max(1, n));
        return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
    }

    function escapeHTML(str) {
        return String(str).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function renderProduct(p) {
        var name = escapeHTML(p.name || 'Product');
        var image = p.image || 'https://placehold.net/400x400.png';
        var desc = escapeHTML(stripHtml(p.shortDescription)) || 'Everything you need to drive confidently abroad.';
        var price = p.priceHtml || (p.price ? escapeHTML(p.price) : '');
        var cartPrice = escapeHTML(p.priceDisplay || p.price || '0');
        var id = escapeHTML(p.id != null ? p.id : name);

        return '<div class="product-card">' +
            '<div class="flex-1">' +
            '<h3 class="card-title">' + name + '</h3>' +
            '<div class="card-stars">' + starString(p.rating) + '</div>' +
            (price ? '<div class="card-price">' + price + '</div>' : '') +
            '<p class="card-desc">' + desc + '</p>' +
            '<button type="button" class="btn-outline add-to-cart-btn" data-cart-id="' + id +
            '" data-cart-name="' + name + '" data-cart-price="' + cartPrice +
            '" data-cart-image="' + escapeHTML(image) + '">Add to Cart</button>' +
            '</div>' +
            '<div class="card-thumb"><img src="' + escapeHTML(image) + '" alt="' + name + '"></div>' +
            '</div>';
    }

    var SKELETON_CARD = '<div class="product-card product-card-skeleton">' +
        '<div class="flex-1">' +
        '<div class="skeleton-line skeleton-title"></div>' +
        '<div class="skeleton-line skeleton-stars"></div>' +
        '<div class="skeleton-line skeleton-price"></div>' +
        '<div class="skeleton-line skeleton-desc"></div>' +
        '<div class="skeleton-line skeleton-desc short"></div>' +
        '<div class="skeleton-btn"></div>' +
        '</div>' +
        '<div class="card-thumb skeleton-thumb"></div>' +
        '</div>';

    // pinned to position 1 of the Guides & Checklists grid — not a WooCommerce
    // product, so it's prepended in every render path below (skeleton, loaded,
    // empty, and error states) instead of living inside the API response.
    // price is the real live 1-year-digital..3-year-printed range (product IDs
    // match pricing-live.js's PRODUCT_IDS[0].digital / PRODUCT_IDS[2].printed) —
    // "$39 – $109" is only the pre-fetch fallback, shown until that resolves
    var FEATURED_PRICE_IDS = { low: 14, high: 19 };
    var FEATURED_FALLBACK_PRICE = '$39 – $109';

    function featuredCardHTML(priceText) {
        return '<div class="product-card product-card-featured">' +
            '<div class="flex-1">' +
            '<h3 class="card-title">International Driving Permit</h3>' +
            '<div class="card-stars">' + starString(5) + '</div>' +
            '<div class="card-price">' + escapeHTML(priceText || FEATURED_FALLBACK_PRICE) + '</div>' +
            '<p class="card-desc">Digital or printed IDP, valid 1–3 years — accepted in 150+ countries. Start your application online in minutes.</p>' +
            '<a href="application.html" class="btn card-cta">Start Application</a>' +
            '</div>' +
            '<div class="card-thumb"><img loading="lazy" decoding="async" width="204" height="153" ' +
            'src="assets/images/print-digital-thumb.png" alt="International Driving Permit"></div>' +
            '</div>';
    }

    function fetchFeaturedPriceText(workerUrl) {
        return fetch(workerUrl + '/products?include=' + FEATURED_PRICE_IDS.low + ',' + FEATURED_PRICE_IDS.high)
            .then(function (res) {
                if (!res.ok) throw new Error('status ' + res.status);
                return res.json();
            })
            .then(function (data) {
                var byId = {};
                ((data && data.products) || []).forEach(function (p) { byId[p.id] = p; });
                var low = byId[FEATURED_PRICE_IDS.low];
                var high = byId[FEATURED_PRICE_IDS.high];
                return (low && low.priceDisplay && high && high.priceDisplay)
                    ? low.priceDisplay + ' – ' + high.priceDisplay
                    : null;
            })
            .catch(function (err) {
                console.error('premium-products.js: failed to load featured card price —', err);
                return null;
            });
    }

    function renderSkeletons(grid, count, pinnedHTML) {
        var html = pinnedHTML || '';
        for (var i = 0; i < count; i++) html += SKELETON_CARD;
        grid.innerHTML = html;
    }

    function loadProductGrid(gridId, statusId, tag, pinnedHTMLPromise) {
        var grid = document.getElementById(gridId);
        var status = document.getElementById(statusId);
        if (!grid) return;

        function setStatus(text, hidden) {
            if (!status) return;
            status.textContent = text || '';
            status.hidden = !!hidden;
        }

        // the pinned card (if any) starts on its fallback price — the live
        // price promise below only lands once it resolves, alongside the
        // real products, so the two update together instead of the price
        // flashing 1-2 values in quick succession
        setStatus('', true);
        renderSkeletons(grid, 6, pinnedHTMLPromise && featuredCardHTML());

        if (!window.ENV || !window.ENV.R2_WORKER_URL) {
            Promise.resolve(pinnedHTMLPromise).then(function (html) {
                grid.innerHTML = html || '';
                setStatus('Product catalog is not configured yet.');
            });
            return;
        }

        var workerUrl = window.ENV.R2_WORKER_URL.replace(/\/$/, '');
        var query = '/products?per_page=15' + (tag ? '&tag=' + encodeURIComponent(tag) : '');

        Promise.all([
            fetch(workerUrl + query).then(function (res) {
                if (!res.ok) throw new Error('Request failed with status ' + res.status);
                return res.json();
            }),
            pinnedHTMLPromise || ''
        ])
            .then(function (results) {
                var products = (results[0] && results[0].products) || [];
                var pinnedHTML = results[1];
                if (!products.length) {
                    grid.innerHTML = pinnedHTML || '';
                    setStatus('No products found yet.');
                    return;
                }
                grid.innerHTML = (pinnedHTML || '') + products.map(renderProduct).join('');
            })
            .catch(function (err) {
                console.error('premium-products.js: failed to load products for #' + gridId + ' —', err);
                Promise.resolve(pinnedHTMLPromise).then(function (html) {
                    grid.innerHTML = html || '';
                    setStatus('Could not load products right now. Please try again later.');
                });
            });
    }

    var featuredHTMLPromise = (window.ENV && window.ENV.R2_WORKER_URL)
        ? fetchFeaturedPriceText(window.ENV.R2_WORKER_URL.replace(/\/$/, '')).then(featuredCardHTML)
        : Promise.resolve(featuredCardHTML());

    loadProductGrid('premiumProductsGrid', 'premiumProductsStatus', 'international', featuredHTMLPromise);
    loadProductGrid('countryKitsGrid', 'countryKitsStatus', 'driving-kit');
})();
