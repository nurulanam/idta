(function () {
    var track = document.querySelector('.products-track');
    if (!track) return;
    if (!window.ENV || !window.ENV.R2_WORKER_URL) return;

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
        var price = p.priceDisplay || (p.price ? escapeHTML(p.price) : '');
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

    var originalHTML = track.innerHTML;
    var skeletonCount = Math.max(track.children.length, 4);
    var skeletonHTML = '';
    for (var i = 0; i < skeletonCount; i++) skeletonHTML += SKELETON_CARD;
    track.innerHTML = skeletonHTML;

    var workerUrl = window.ENV.R2_WORKER_URL.replace(/\/$/, '');

    fetch(workerUrl + '/products?featured=true&per_page=10')
        .then(function (res) {
            if (!res.ok) throw new Error('Request failed with status ' + res.status);
            return res.json();
        })
        .then(function (data) {
            var products = (data && data.products) || [];
            track.innerHTML = products.length ? products.map(renderProduct).join('') : originalHTML;
            window.dispatchEvent(new Event('resize')); // refresh the carousel's arrow/overflow state
        })
        .catch(function (err) {
            console.error('home-products.js: failed to load featured products —', err);
            track.innerHTML = originalHTML;
            window.dispatchEvent(new Event('resize'));
        });
})();
