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

    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'env.txt?_=' + Date.now(), false);
    try {
        xhr.send(null);
        if (xhr.status === 200 || xhr.status === 0) {
            parseEnv(xhr.responseText);
        } else {
            console.warn('env.js: "env.txt" returned status ' + xhr.status + ' — window.ENV will be empty (defaults to production behaviour).');
        }
    } catch (e) {
        console.warn('env.js: could not load "env.txt" (served over http/https?) — window.ENV will be empty.', e);
    }
})();
