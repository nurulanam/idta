// Async HTML partials. includeHTML() starts a fetch immediately (the parser is
// never blocked — the old synchronous XHR stalled first paint by a full network
// round-trip per include on slow connections) and records the injection promise.
// loadScriptsAfterIncludes() then loads the page's scripts only once every
// partial is in the DOM, so scripts can bind to header/footer elements exactly
// as they could under the old synchronous scheme.
var __pendingIncludes = [];

function includeHTML(placeholderId, url) {
    var el = document.getElementById(placeholderId);
    if (!el) return;
    // low priority: the partials are injected before scripts run either way,
    // and header height is CSS-reserved — keeping these off the high-priority
    // lane stops them competing with the stylesheet/fonts for first paint
    var p = fetch(url, { priority: 'low' })
        .then(function (res) {
            if (!res.ok) throw new Error('status ' + res.status);
            return res.text();
        })
        .then(function (html) {
            // Parse as a full document and take only <body>'s content: some dev
            // servers (e.g. Live Server) rewrite every HTML response to inject a
            // live-reload <script>, which can land mid-markup and corrupt a bare
            // fragment. Wrapping the partial in <html><body> gives that injection
            // a safe, predictable place to land, and stripping any <script> tags
            // here discards it either way.
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var injected = doc.body.querySelectorAll('script');
            for (var i = 0; i < injected.length; i++) injected[i].remove();
            el.outerHTML = doc.body.innerHTML;
        })
        .catch(function (e) {
            console.error('includeHTML: failed to load "' + url + '" — "#' + placeholderId + '" was left empty.', e);
        });
    __pendingIncludes.push(p);
}

function loadScriptsAfterIncludes(srcs) {
    Promise.all(__pendingIncludes).then(function () {
        // sequential, to preserve the same execution order the plain
        // <script src> tags had (countries-data before app, etc.); a function
        // entry runs inline at its position in the chain, standing in for the
        // inline <script> blocks that used to sit between the src tags
        return srcs.reduce(function (chain, src) {
            return chain.then(function () {
                if (typeof src === 'function') { src(); return; }
                return new Promise(function (resolve) {
                    var s = document.createElement('script');
                    s.src = src;
                    s.onload = resolve;
                    s.onerror = function () {
                        console.error('loadScriptsAfterIncludes: failed to load "' + src + '"');
                        resolve();
                    };
                    document.body.appendChild(s);
                }).then(function () {
                    // a script can hand back a promise (window.__pendingScriptReady)
                    // for async work the next script depends on — env.js does this
                    // so window.ENV is populated before its consumers run
                    var ready = window.__pendingScriptReady;
                    window.__pendingScriptReady = null;
                    return ready;
                });
            });
        }, Promise.resolve());
    });
}
