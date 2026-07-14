// Cloudflare Worker: accepts application uploads and stores them in the
// "idta-html" R2 bucket, organized as {YYYY}/{MM}/{DD}/sub_{timestamp}_{randomId}/...
// Also proxies WooCommerce product reads so the storefront's consumer
// key/secret never has to reach the browser.
//
// Routes:
//   POST /upload      multipart/form-data -> stores files + data.json, returns file URLs
//   GET  /files/*key  streams a stored object back out (used as <img src>)
//   GET  /products    proxies WooCommerce's /wp-json/wc/v3/products, optionally
//                      filtered by ?category=slug-or-id / ?tag=slug-or-id

const FILE_FIELDS = {
    portrait: 'portrait.jpg',
    license_front: 'license-front.jpg',
    license_back: 'license-back.jpg',
    signature: 'signature.png'
};

function corsHeaders(env) {
    return {
        'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
}

function pad(n) {
    return String(n).padStart(2, '0');
}

function datePath() {
    var d = new Date();
    return d.getUTCFullYear() + '/' + pad(d.getUTCMonth() + 1) + '/' + pad(d.getUTCDate());
}

function genSubmissionId() {
    return 'sub_' + Date.now() + '_' + crypto.randomUUID().split('-')[0];
}

async function handleUpload(request, env, cors) {
    var form = await request.formData();
    var submissionId = (form.get('submissionId') || genSubmissionId()).toString();
    var basePrefix = datePath() + '/' + submissionId + '/';
    var fileKeys = {};

    for (var field in FILE_FIELDS) {
        var file = form.get(field);
        if (file && typeof file === 'object' && typeof file.arrayBuffer === 'function') {
            var key = basePrefix + FILE_FIELDS[field];
            await env.IDTA_BUCKET.put(key, await file.arrayBuffer(), {
                httpMetadata: { contentType: file.type || 'application/octet-stream' }
            });
            fileKeys[field] = key;
        }
    }

    var dataField = form.get('data');
    if (dataField) {
        await env.IDTA_BUCKET.put(basePrefix + 'data.json', dataField.toString(), {
            httpMetadata: { contentType: 'application/json' }
        });
    }

    var files = {};
    for (var f in fileKeys) {
        files[f] = '/files/' + fileKeys[f];
    }

    return new Response(JSON.stringify({ submissionId: submissionId, files: files }), {
        status: 200,
        headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
    });
}

var HTML_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', 39: "'", pound: '£', euro: '€', nbsp: ' ' };

function decodeEntities(str) {
    return String(str).replace(/&(#?\w+);/g, function (m, code) {
        if (code.charAt(0) === '#') {
            var num = code.charAt(1) === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
            return isNaN(num) ? m : String.fromCharCode(num);
        }
        return HTML_ENTITIES.hasOwnProperty(code) ? HTML_ENTITIES[code] : m;
    });
}

// price_html can contain a struck-through original price (on sale) followed by
// the current price — take only the LAST currency-symbol + amount pair, which
// is always the effective price the customer actually pays.
function extractDisplayPrice(priceHtml) {
    if (!priceHtml) return null;
    var re = /currencySymbol[^>]*>([^<]*)<\/span>\s*([\d.,]+)/g;
    var match, last = null;
    while ((match = re.exec(priceHtml)) !== null) last = match;
    if (!last) return null;
    return decodeEntities(last[1]) + last[2];
}

// the currency symbol is the same throughout price_html regardless of sale
// state — grab the first occurrence so it can be paired with any raw amount.
function extractCurrencySymbol(priceHtml) {
    if (!priceHtml) return '';
    var match = /currencySymbol[^>]*>([^<]*)</.exec(priceHtml);
    return match ? decodeEntities(match[1]) : '';
}

function simplifyProduct(p) {
    var symbol = extractCurrencySymbol(p.price_html);
    return {
        id: p.id,
        name: p.name,
        price: p.price,
        priceHtml: p.price_html,
        onSale: !!p.on_sale,
        regularPriceDisplay: p.regular_price ? symbol + p.regular_price : null,
        salePriceDisplay: p.on_sale && p.sale_price ? symbol + p.sale_price : null,
        priceDisplay: extractDisplayPrice(p.price_html) || (p.price ? p.price : null),
        shortDescription: p.short_description,
        image: (p.images && p.images[0] && p.images[0].src) || null,
        rating: p.average_rating,
        permalink: p.permalink,
        categories: (p.categories || []).map(function (c) { return c.name; }),
        tags: (p.tags || []).map(function (t) { return t.name; })
    };
}

function wcAuthHeader(env) {
    return 'Basic ' + btoa(env.WC_CONSUMER_KEY + ':' + env.WC_CONSUMER_SECRET);
}

// WooCommerce's /products endpoint only accepts numeric term IDs for
// ?category=/?tag=, not slugs — resolve a human-readable slug to its ID.
async function resolveTermId(env, termType, value) {
    if (/^\d+$/.test(value)) return value;

    var lookupUrl = new URL(env.WC_URL.replace(/\/$/, '') + '/wp-json/wc/v3/products/' + termType);
    lookupUrl.searchParams.set('slug', value);
    var res = await fetch(lookupUrl.toString(), { headers: { Authorization: wcAuthHeader(env) } });
    if (!res.ok) return null;
    var matches = await res.json();
    return Array.isArray(matches) && matches[0] ? matches[0].id : null;
}

async function handleProducts(url, env, cors) {
    if (!env.WC_URL || !env.WC_CONSUMER_KEY || !env.WC_CONSUMER_SECRET) {
        return new Response(JSON.stringify({ error: 'WooCommerce is not configured on this Worker.' }), {
            status: 500,
            headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
        });
    }

    var wcUrl = new URL(env.WC_URL.replace(/\/$/, '') + '/wp-json/wc/v3/products');
    wcUrl.searchParams.set('per_page', url.searchParams.get('per_page') || '15');
    if (url.searchParams.get('page')) wcUrl.searchParams.set('page', url.searchParams.get('page'));
    if (url.searchParams.get('search')) wcUrl.searchParams.set('search', url.searchParams.get('search'));
    if (url.searchParams.get('include')) wcUrl.searchParams.set('include', url.searchParams.get('include'));
    if (url.searchParams.get('featured')) wcUrl.searchParams.set('featured', url.searchParams.get('featured'));

    var categoryParam = url.searchParams.get('category');
    var tagParam = url.searchParams.get('tag');

    if (categoryParam) {
        var categoryId = await resolveTermId(env, 'categories', categoryParam);
        if (!categoryId) {
            return new Response(JSON.stringify({ products: [] }), {
                status: 200,
                headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
            });
        }
        wcUrl.searchParams.set('category', categoryId);
    }

    if (tagParam) {
        var tagId = await resolveTermId(env, 'tags', tagParam);
        if (!tagId) {
            return new Response(JSON.stringify({ products: [] }), {
                status: 200,
                headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
            });
        }
        wcUrl.searchParams.set('tag', tagId);
    }

    var wcRes = await fetch(wcUrl.toString(), {
        headers: { Authorization: wcAuthHeader(env) },
        cf: { cacheTtl: 300, cacheEverything: true }
    });

    if (!wcRes.ok) {
        return new Response(JSON.stringify({ error: 'WooCommerce request failed with status ' + wcRes.status }), {
            status: 502,
            headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
        });
    }

    var products = await wcRes.json();
    var simplified = Array.isArray(products) ? products.map(simplifyProduct) : [];

    return new Response(JSON.stringify({ products: simplified }), {
        status: 200,
        headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
    });
}

async function handleFileFetch(url, env, cors) {
    var key = decodeURIComponent(url.pathname.replace(/^\/files\//, ''));
    var object = await env.IDTA_BUCKET.get(key);
    if (!object) return new Response('Not found', { status: 404, headers: cors });

    var headers = new Headers(cors);
    headers.set('Content-Type', (object.httpMetadata && object.httpMetadata.contentType) || 'application/octet-stream');
    headers.set('Cache-Control', 'private, max-age=300');
    return new Response(object.body, { headers: headers });
}

export default {
    async fetch(request, env) {
        var url = new URL(request.url);
        var cors = corsHeaders(env);

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: cors });
        }
        if (request.method === 'POST' && url.pathname === '/upload') {
            return handleUpload(request, env, cors);
        }
        if (request.method === 'GET' && url.pathname.indexOf('/files/') === 0) {
            return handleFileFetch(url, env, cors);
        }
        if (request.method === 'GET' && url.pathname === '/products') {
            return handleProducts(url, env, cors);
        }
        return new Response('Not found', { status: 404, headers: cors });
    }
};
