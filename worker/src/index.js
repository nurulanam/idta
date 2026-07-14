// Cloudflare Worker: accepts application uploads and stores them in the
// "idta-html" R2 bucket, organized as {YYYY}/{MM}/{DD}/sub_{timestamp}_{randomId}/...
//
// Routes:
//   POST /upload      multipart/form-data -> stores files + data.json, returns file URLs
//   GET  /files/*key  streams a stored object back out (used as <img src>)

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
        return new Response('Not found', { status: 404, headers: cors });
    }
};
