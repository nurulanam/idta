// Simple localStorage-backed shopping cart shared across pages via a global `Cart` API.
// No backend/server cart exists, so "remove" just updates localStorage + re-renders the
// DOM instantly (no page reload) — the closest equivalent to an ajax remove for a static site.
var Cart = (function () {
    var STORAGE_KEY = 'idta_cart';

    function read() {
        try {
            var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            return Array.isArray(raw) ? raw : [];
        } catch (e) {
            return [];
        }
    }

    function write(items) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        render();
        document.dispatchEvent(new CustomEvent('cart:updated', {
            detail: { items: items, count: getCount(items), total: getTotal(items) }
        }));
    }

    function parsePrice(str) {
        return parseFloat(String(str || '').replace(/[^0-9.]/g, '')) || 0;
    }

    function currencySymbol(str) {
        var m = String(str || '').match(/^[^\d.]*/);
        return (m && m[0]) || '$';
    }

    function formatCurrency(amount, symbol) {
        return (symbol || '$') + amount.toFixed(2);
    }

    function getCount(items) {
        items = items || read();
        return items.reduce(function (sum, i) { return sum + (i.qty || 1); }, 0);
    }

    function getTotal(items) {
        items = items || read();
        return items.reduce(function (sum, i) { return sum + parsePrice(i.price) * (i.qty || 1); }, 0);
    }

    function addItem(product) {
        if (!product || !product.id) return;
        var items = read();
        var existing = items.filter(function (i) { return i.id === product.id; })[0];
        if (existing) {
            existing.qty = (existing.qty || 1) + 1;
        } else {
            items.push({
                id: product.id,
                name: product.name || 'Product',
                price: product.price || '0',
                image: product.image || 'https://placehold.net/400x400.png',
                qty: 1
            });
        }
        write(items);
    }

    function removeItem(id) {
        write(read().filter(function (i) { return i.id !== id; }));
    }

    function clear() {
        write([]);
    }

    function escapeHTML(str) {
        return String(str).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function renderItemsList(container, items) {
        if (!items.length) {
            container.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
            return;
        }
        container.innerHTML = items.map(function (i) {
            var symbol = currencySymbol(i.price);
            return '<div class="cart-item" data-cart-item="' + escapeHTML(i.id) + '">' +
                '<img class="cart-item-thumb" src="' + escapeHTML(i.image) + '" alt="">' +
                '<div class="cart-item-info">' +
                '<div class="cart-item-name">' + escapeHTML(i.name) + '</div>' +
                '<div class="cart-item-meta">' + i.qty + ' × ' + formatCurrency(parsePrice(i.price), symbol) + '</div>' +
                '</div>' +
                '<button type="button" class="cart-item-remove" data-cart-remove="' + escapeHTML(i.id) + '" aria-label="Remove ' + escapeHTML(i.name) + '">&times;</button>' +
                '</div>';
        }).join('');
    }

    function render() {
        var items = read();
        var count = getCount(items);
        var total = getTotal(items);
        var symbol = items.length ? currencySymbol(items[0].price) : '$';

        document.querySelectorAll('[data-cart-count]').forEach(function (el) {
            el.textContent = count;
            el.hidden = count === 0;
        });

        document.querySelectorAll('[data-cart-list]').forEach(function (el) {
            renderItemsList(el, items);
        });

        document.querySelectorAll('[data-cart-total]').forEach(function (el) {
            el.textContent = formatCurrency(total, symbol);
        });

        document.querySelectorAll('[data-cart-section]').forEach(function (el) {
            el.hidden = items.length === 0;
        });
    }

    // ---------- add / remove / toggle via event delegation (works for dynamically-added cards) ----------
    document.addEventListener('click', function (e) {
        var addBtn = e.target.closest('.add-to-cart-btn');
        if (addBtn) {
            addItem({
                id: addBtn.getAttribute('data-cart-id'),
                name: addBtn.getAttribute('data-cart-name'),
                price: addBtn.getAttribute('data-cart-price'),
                image: addBtn.getAttribute('data-cart-image')
            });
            var original = addBtn.textContent;
            addBtn.textContent = 'Added ✓';
            addBtn.disabled = true;
            window.setTimeout(function () {
                addBtn.textContent = original;
                addBtn.disabled = false;
            }, 1200);
            return;
        }

        var removeBtn = e.target.closest('[data-cart-remove]');
        if (removeBtn) {
            removeItem(removeBtn.getAttribute('data-cart-remove'));
            return;
        }

        var toggleBtn = e.target.closest('[data-cart-toggle]');
        var widget = document.querySelector('[data-cart-widget]');
        if (toggleBtn) {
            if (widget) widget.classList.toggle('is-open');
            return;
        }
        if (widget && !e.target.closest('[data-cart-widget]')) {
            widget.classList.remove('is-open');
        }
    });

    render();

    return {
        getItems: read,
        addItem: addItem,
        removeItem: removeItem,
        clear: clear,
        getCount: function () { return getCount(); },
        getTotal: function () { return getTotal(); },
        parsePrice: parsePrice,
        currencySymbol: currencySymbol,
        formatCurrency: formatCurrency,
        render: render
    };
})();
