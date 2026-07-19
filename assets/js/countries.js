// Browse Countries page: renders continent tabs/panels from COUNTRIES_BY_CONTINENT
// (assets/js/countries-data.js) and a simple search box that filters across all of them.
(function () {
    var panelsEl = document.getElementById('continentPanels');
    var tabsEl = document.getElementById('continentTabs');
    var browseEl = document.getElementById('continentBrowse');
    var searchInput = document.getElementById('countrySearchInput');
    var searchResultsEl = document.getElementById('countrySearchResults');
    var searchCountEl = document.getElementById('countrySearchCount');
    var searchGridEl = document.getElementById('countrySearchGrid');
    if (!panelsEl || !tabsEl || typeof COUNTRIES_BY_CONTINENT === 'undefined') return;

    function countryChipHTML(c) {
        return '<a class="country-chip" href="check-permit.html?countryName=' + encodeURIComponent(c.slug) + '">' +
            '<span class="country-chip-flag">' + flagEmoji(c.code) + '</span>' + c.name + '</a>';
    }

    COUNTRIES_BY_CONTINENT.forEach(function (group, i) {
        var panel = document.createElement('div');
        panel.className = 'continent-panel' + (i === 0 ? ' active' : '');
        panel.dataset.continentPanel = group.continent;
        panel.innerHTML = '<div class="country-grid">' + group.countries.map(countryChipHTML).join('') + '</div>';
        panelsEl.appendChild(panel);
    });

    tabsEl.querySelectorAll('.continent-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var target = btn.dataset.continent;
            panelsEl.querySelectorAll('.continent-panel').forEach(function (panel) {
                panel.classList.toggle('active', panel.dataset.continentPanel === target);
            });
            if (searchResultsEl) searchResultsEl.classList.remove('active');
            if (browseEl) browseEl.hidden = false;
        });
    });

    if (searchInput && searchResultsEl && searchGridEl && searchCountEl) {
        var ALL_COUNTRIES = COUNTRIES_BY_CONTINENT.reduce(function (acc, group) {
            return acc.concat(group.countries);
        }, []);

        searchInput.addEventListener('input', function () {
            var q = searchInput.value.trim().toLowerCase();
            if (!q) {
                searchResultsEl.classList.remove('active');
                if (browseEl) browseEl.hidden = false;
                return;
            }
            var matches = ALL_COUNTRIES.filter(function (c) { return c.name.toLowerCase().indexOf(q) !== -1; });
            searchCountEl.textContent = matches.length ? matches.length + ' countries found' : 'No countries found';
            searchGridEl.innerHTML = matches.length
                ? matches.map(countryChipHTML).join('')
                : '<p class="country-empty-state">Try a different search term.</p>';
            searchResultsEl.classList.add('active');
            if (browseEl) browseEl.hidden = true;
        });
    }
})();
