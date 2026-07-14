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

    function renderSkeletons(grid, count) {
        var html = '';
        for (var i = 0; i < count; i++) html += SKELETON_CARD;
        grid.innerHTML = html;
    }

    function loadProductGrid(gridId, statusId, tag) {
        var grid = document.getElementById(gridId);
        var status = document.getElementById(statusId);
        if (!grid) return;

        function setStatus(text, hidden) {
            if (!status) return;
            status.textContent = text || '';
            status.hidden = !!hidden;
        }

        setStatus('', true);
        renderSkeletons(grid, 6);

        if (!window.ENV || !window.ENV.R2_WORKER_URL) {
            grid.innerHTML = '';
            setStatus('Product catalog is not configured yet.');
            return;
        }

        var workerUrl = window.ENV.R2_WORKER_URL.replace(/\/$/, '');
        var query = '/products?per_page=15' + (tag ? '&tag=' + encodeURIComponent(tag) : '');

        fetch(workerUrl + query)
            .then(function (res) {
                if (!res.ok) throw new Error('Request failed with status ' + res.status);
                return res.json();
            })
            .then(function (data) {
                var products = (data && data.products) || [];
                if (!products.length) {
                    grid.innerHTML = '';
                    setStatus('No products found yet.');
                    return;
                }
                grid.innerHTML = products.map(renderProduct).join('');
            })
            .catch(function (err) {
                console.error('premium-products.js: failed to load products for #' + gridId + ' —', err);
                grid.innerHTML = '';
                setStatus('Could not load products right now. Please try again later.');
            });
    }

    loadProductGrid('premiumProductsGrid', 'premiumProductsStatus', 'international');
    loadProductGrid('countryKitsGrid', 'countryKitsStatus', 'driving-kit');
})();
