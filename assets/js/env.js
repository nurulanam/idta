(function () {
    window.ENV = {};

    function coerce(value) {
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value !== '' && !isNaN(Number(value))) return Number(value);
        return value;
    }

    function parseEnv(text) {
        text.split(/\r?\n/).forEach(function (line) {
            line = line.trim();
            if (!line || line.indexOf('#') === 0) return;
            var idx = line.indexOf('=');
            if (idx === -1) return;
            var key = line.slice(0, idx).trim();
            var value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
            window.ENV[key] = coerce(value);
        });
    }

    // async fetch instead of the old blocking XHR; loadScriptsAfterIncludes
    // awaits this promise before running the next script in the chain, so
    // window.ENV is always fully populated for every consumer. cache: no-store
    // keeps the fresh-config-per-load behaviour the old ?_=Date.now() gave.
    window.__pendingScriptReady = fetch('env.txt', { cache: 'no-store' })
        .then(function (res) {
            if (!res.ok) throw new Error('status ' + res.status);
            return res.text();
        })
        .then(parseEnv)
        .catch(function (e) {
            console.warn('env.js: could not load "env.txt" — window.ENV will be empty (defaults to production behaviour).', e);
        });
})();
