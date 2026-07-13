function includeHTML(placeholderId, url) {
    var el = document.getElementById(placeholderId);
    if (!el) return;
    var bustedUrl = url + (url.indexOf('?') === -1 ? '?' : '&') + '_=' + Date.now();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', bustedUrl, false);
    try {
        xhr.send(null);
    } catch (e) {
        console.error('includeHTML: failed to load "' + url + '" (is the page being served over http/https, not opened as a local file?)', e);
        return;
    }
    var ok = xhr.status === 200 || xhr.status === 304 || xhr.status === 0;
    if (!ok || !xhr.responseText) {
        console.error('includeHTML: request for "' + url + '" returned status ' + xhr.status + ' with ' + (xhr.responseText ? 'a non-empty' : 'an empty') + ' body — "#' + placeholderId + '" was left empty.');
        return;
    }

    // Parse as a full document and take only <body>'s content: some dev servers (e.g. Live
    // Server) rewrite every HTML response to inject a live-reload <script>, which can land
    // mid-markup and corrupt a bare fragment. Wrapping the partial in <html><body> gives that
    // injection a safe, predictable place to land (right before </body>), and stripping any
    // <script> tags here discards it either way.
    var doc = new DOMParser().parseFromString(xhr.responseText, 'text/html');
    var injected = doc.body.querySelectorAll('script');
    for (var i = 0; i < injected.length; i++) injected[i].remove();
    el.outerHTML = doc.body.innerHTML;
}
