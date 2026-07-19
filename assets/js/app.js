// sticky header: only show its shadow once the page has actually scrolled,
// so it looks like the original flat bar while at the very top
var siteHeaderBar = document.querySelector('.site-header-bar');
if (siteHeaderBar) {
    var updateStickyHeaderShadow = function () {
        siteHeaderBar.classList.toggle('is-stuck', window.scrollY > 0);
    };
    window.addEventListener('scroll', updateStickyHeaderShadow, { passive: true });
    updateStickyHeaderShadow();
}

function applyPlanDuration(duration) {
    document.querySelectorAll('.pricing-card').forEach(function (card) {
        var price = card.getAttribute('data-price-' + duration);
        if (!price) return;
        var priceEl = card.querySelector('.pricing-price');
        if (priceEl) priceEl.textContent = price;
        if (card.dataset.price) card.dataset.price = price;
    });
    document.dispatchEvent(new CustomEvent('plan-duration-changed', { detail: { duration: duration } }));
}

document.querySelectorAll('.plan-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.plan-tab').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        applyPlanDuration(btn.dataset.plan);
    });

    // "Expires <year>" is always (this year + validity years), so it never goes stale
    var subEl = btn.querySelector('.plan-sub');
    if (subEl) {
        var validityYears = Number(btn.dataset.plan) + 1;
        subEl.textContent = 'Expires ' + (new Date().getFullYear() + validityYears);
        subEl.classList.remove('plan-sub-skeleton');
    }
});

// sliding pill background behind the active plan tab (instead of each tab
// getting its own static background) — moves/resizes to match whichever
// tab is active, including when tabs stack into a column on mobile
document.querySelectorAll('.pricing-tabs').forEach(function (tabsEl) {
    var indicator = document.createElement('div');
    indicator.className = 'plan-tab-indicator';
    tabsEl.insertBefore(indicator, tabsEl.firstChild);

    function moveIndicator(btn, animate) {
        if (!btn) return;
        if (!animate) indicator.classList.add('no-transition');
        indicator.style.width = btn.offsetWidth + 'px';
        indicator.style.height = btn.offsetHeight + 'px';
        indicator.style.transform = 'translate(' + btn.offsetLeft + 'px, ' + btn.offsetTop + 'px)';
        if (!animate) {
            void indicator.offsetHeight; // force reflow so the transition-less move applies immediately
            indicator.classList.remove('no-transition');
        }
    }

    var tabButtons = tabsEl.querySelectorAll('.plan-tab');
    moveIndicator(tabsEl.querySelector('.plan-tab.active') || tabButtons[0], false);

    tabButtons.forEach(function (btn) {
        btn.addEventListener('click', function () { moveIndicator(btn, true); });
    });

    window.addEventListener('resize', function () {
        moveIndicator(tabsEl.querySelector('.plan-tab.active'), false);
    });
});

document.querySelectorAll('.js-start-application').forEach(function (link) {
    link.addEventListener('click', function (e) {
        var card = link.closest('.pricing-card');
        if (!card || !card.dataset.package) return;
        e.preventDefault();
        var activeTab = document.querySelector('.plan-tab.active');
        var params = new URLSearchParams();
        params.set('package', card.dataset.package);
        params.set('duration', activeTab ? activeTab.dataset.plan : '0');
        window.location.href = 'application.html?' + params.toString();
    });
});

document.querySelectorAll('.faq-item').forEach(function (item) {
    var toggle = item.querySelector('.faq-toggle');
    toggle.addEventListener('click', function () {
        var opening = !item.classList.contains('open');
        document.querySelectorAll('.faq-item.open').forEach(function (openItem) {
            openItem.classList.remove('open');
        });
        if (opening) {
            item.classList.add('open');
        }
    });
});

var navToggle = document.getElementById('navToggle');
var navLinks = document.getElementById('navLinks');
if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
        var isOpen = navLinks.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
}

// flattened once from the single source of truth in countries-data.js (loaded
// before this script on every page) — code, name, and dial code all live in one
// place there, instead of being duplicated across separate arrays here
var ALL_COUNTRIES = COUNTRIES_BY_CONTINENT.reduce(function (acc, group) {
    return acc.concat(group.countries);
}, []);

var COUNTRIES = ALL_COUNTRIES
    .map(function (c) { return { code: c.code, name: c.name }; })
    .sort(function (a, b) { return a.name.localeCompare(b.name); });

var DIAL_CODES = ALL_COUNTRIES.reduce(function (acc, c) {
    acc[c.code] = c.dial;
    return acc;
}, {});

var countryInfo = {
	'th': ['Thailand', 'Our International Driving Permit works in <span>Thailand</span>. The accepted format is 1 year valid Booklet along with a valid driver’s license. You can apply for Printed IDP with 1 year validity. A digital IDP copy is not recognized in Thailand.'],
	'ae': ['United Arab Emirates', 'Our International Driving Permit works in <span>UAE</span>. The accepted format is 1 year valid Booklet along with a valid driver’s license. You can apply for Printed IDP with 1 year validity. A digital IDP copy is not recognized in United Arab Emirates.'],
	'es': ['Spain', 'Our International Driving Permit works in <span>Spain</span>. The accepted format is 1 year valid Booklet along with a valid driver’s license. A digital IDP copy is not recognized in Spain.'],
	'id': ['Indonesia', 'Our International Driving Permit works in <span>Indonesia</span>. The accepted format is 1 year valid Booklet along with a valid driver’s license. A digital IDP copy is not recognized in Indonesia.'],
	'us': ['United States', 'Our International Driving Permit works in <span>USA</span>. The accepted formats include a Printed and Digital IDP valid for 1-3 years, or a Digital Only IDP along with a valid driver’s license.'],
	'cn': ['China', '<span>China</span> does not allow travelers to drive. You need a local Chinese driver’s license to drive legally in Mainland China.', 'blocked'],
	'jp': ['Japan', 'Our International Driving Permit is currently not accepted in <span>Japan</span>.', 'blocked'],
	'kr': ['Korea, Republic of Korea', 'Our International Driving Permit is currently not accepted in <span>South Korea</span>.', 'blocked'],
	'it': ['Italy', 'Our International Driving Permit works in Italy. The accepted format is a Printed IDP valid for 1-3 years, along with a valid driver\'s license.'],
	'ir': ['Iran', 'Our International Driving Permit is currently not accepted in Iran.', 'blocked'],
	'mm': ['Myanmar', 'Our International Driving Permit is currently not accepted in Myanmar.', 'blocked'],
	'sy': ['Syria Arab Republic', 'Our International Driving Permit is currently not accepted in Syria Arab Republic.', 'blocked'],
	'ye': ['Yemen', 'Our International Driving Permit is currently not accepted in Yemen.', 'blocked'],
	'vn': ['Viet Nam', 'Our International Driving Permit is currently not accepted in Vietnam.', 'blocked'],
	'my': ['Malaysia', 'Our International Driving Permit works in Malaysia. The accepted format is a Printed IDP valid for 1-3 years, along with a valid driver\'s license.'],
	'kp': ['Korea, Democratic People\'s Republic of', 'Our International Driving Permit is currently not accepted in Korea, Democratic People\'s Republic of.', 'blocked'],
	'gb': ['United Kingdom', 'Our International Driving Permit works in <span>United Kingdom</span>. The accepted format is a Printed IDP valid for 1 year, with a valid driver’s license.']
};

function flagEmoji(code) {
    return code.toUpperCase().replace(/./g, function (char) {
        return String.fromCodePoint(127397 + char.charCodeAt(0));
    });
}

// the same gray globe markup used as .form-select-icon's default content,
// restored on clear since selecting a country replaces it with a flag emoji
var GLOBE_ICON_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/>' +
    '<line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="1.8"/>' +
    '<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" stroke-width="1.8"/>' +
    '</svg>';

// resolves the visitor's country code from their IP — tries ipwho.is first,
// then falls back to get.geojs.io, since ad-blockers / privacy extensions
// commonly block one geo-IP provider but not the other
function lookupCountryByIP() {
    if (!window.fetch) return Promise.resolve(null);
    return fetch('https://ipwho.is/').then(function (r) { return r.json(); }).then(function (data) {
        if (data && data.success !== false && data.country_code) return data.country_code;
        throw new Error('ipwho.is lookup failed');
    }).catch(function () {
        return fetch('https://get.geojs.io/v1/ip/geo.json').then(function (r) { return r.json(); }).then(function (data) {
            return (data && data.country_code) || null;
        });
    }).catch(function () {
        return null;
    });
}

function buildMatchLabel(name, query) {
    var frag = document.createDocumentFragment();
    var idx = query ? name.toLowerCase().indexOf(query.toLowerCase()) : -1;
    if (idx === -1) {
        frag.appendChild(document.createTextNode(name));
        return frag;
    }
    frag.appendChild(document.createTextNode(name.slice(0, idx)));
    var mark = document.createElement('mark');
    mark.textContent = name.slice(idx, idx + query.length);
    frag.appendChild(mark);
    frag.appendChild(document.createTextNode(name.slice(idx + query.length)));
    return frag;
}

function initCountrySelect(root) {
    var trigger = root.querySelector('.country-select-trigger');
    var valueEl = root.querySelector('.country-select-value');
    var clearBtn = root.querySelector('.country-clear');
    var icon = root.querySelector('.form-select-icon');
    var dropdown = root.querySelector('.country-dropdown');
    var searchInput = root.querySelector('.country-search-input');
    var optionsEl = root.querySelector('.country-options');
    if (!trigger || !valueEl || !clearBtn || !icon || !dropdown || !searchInput || !optionsEl) {
        console.warn('initCountrySelect: markup incomplete on', root, '— skipping. Try a hard refresh (the include may have been served from a stale cache).');
        return;
    }
    var pairId = root.dataset.excludePair;
    var filtered = COUNTRIES;
    var activeIndex = -1;
    var query = '';

    function pairedCode() {
        if (!pairId) return null;
        var pairedRoot = document.getElementById(pairId);
        return pairedRoot ? pairedRoot.dataset.selectedCode : null;
    }

    function availableCountries() {
        var excludeCode = pairedCode();
        return excludeCode ? COUNTRIES.filter(function (c) { return c.code !== excludeCode; }) : COUNTRIES;
    }

    function renderOptions() {
        optionsEl.innerHTML = '';
        if (!filtered.length) {
            var empty = document.createElement('div');
            empty.className = 'country-empty';
            empty.textContent = 'No countries found';
            optionsEl.appendChild(empty);
            return;
        }
        filtered.forEach(function (c, i) {
            var opt = document.createElement('div');
            opt.className = 'country-option' + (i === activeIndex ? ' active' : '');
            opt.setAttribute('role', 'option');
            var flagSpan = document.createElement('span');
            flagSpan.textContent = flagEmoji(c.code);
            var nameSpan = document.createElement('span');
            nameSpan.appendChild(buildMatchLabel(c.name, query));
            opt.appendChild(flagSpan);
            opt.appendChild(nameSpan);
            opt.addEventListener('mousedown', function (e) {
                e.preventDefault();
                selectCountry(c);
            });
            optionsEl.appendChild(opt);
        });
    }

    function openDropdown() {
        dropdown.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        query = '';
        searchInput.value = '';
        filtered = availableCountries();
        activeIndex = -1;
        renderOptions();
        searchInput.focus();
    }

    function closeDropdown() {
        dropdown.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        activeIndex = -1;
    }

    function toggleDropdown() {
        if (dropdown.classList.contains('open')) closeDropdown();
        else openDropdown();
    }

    function filterList(q) {
        query = q.trim();
        var lower = query.toLowerCase();
        var base = availableCountries();
        filtered = lower ? base.filter(function (c) { return c.name.toLowerCase().indexOf(lower) !== -1; }) : base;
        activeIndex = -1;
        renderOptions();
    }

    function notifyChanged() {
        document.dispatchEvent(new CustomEvent('country-select-changed', { detail: { rootId: root.id } }));
    }

    function selectCountry(c, silent) {
        valueEl.textContent = c.name;
        valueEl.classList.add('has-value');
        icon.textContent = flagEmoji(c.code);
        clearBtn.hidden = false;
        root.dataset.selectedCode = c.code;
        if (!silent) {
            closeDropdown();
            trigger.focus();
        }
        notifyChanged();
    }

    function clearSelection() {
        valueEl.textContent = valueEl.dataset.placeholder;
        valueEl.classList.remove('has-value');
        icon.innerHTML = GLOBE_ICON_SVG;
        clearBtn.hidden = true;
        delete root.dataset.selectedCode;
        notifyChanged();
    }

    function scrollActiveIntoView() {
        var activeEl = optionsEl.querySelector('.country-option.active');
        if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
    }

    trigger.addEventListener('click', toggleDropdown);

    clearBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        clearSelection();
    });

    searchInput.addEventListener('input', function () {
        filterList(searchInput.value);
    });

    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
            renderOptions();
            scrollActiveIntoView();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
            renderOptions();
            scrollActiveIntoView();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && filtered[activeIndex]) selectCountry(filtered[activeIndex]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeDropdown();
            trigger.focus();
        }
    });

    document.addEventListener('click', function (e) {
        if (!root.contains(e.target)) closeDropdown();
    });

    if (pairId) {
        document.addEventListener('country-select-changed', function (e) {
            if (e.detail && e.detail.rootId === pairId) filterList(query);
        });
    }

    // opt-in (via data-preset-code, set by a page-specific inline script before this
    // runs) — used by check-permit.html to lock the destination to the country in the URL
    if (root.dataset.presetCode) {
        var presetCountry = COUNTRIES.filter(function (c) { return c.code === root.dataset.presetCode; })[0];
        if (presetCountry) selectCountry(presetCountry, true);
    }

    // opt-in (via data-auto-detect="true") auto-fill from the visitor's location —
    // used for "license issued in" fields, never for destination/birth/billing fields
    if (root.dataset.autoDetect === 'true') {
        var guessCode = detectBrowserCountryCode();
        var guessCountry = COUNTRIES.filter(function (c) { return c.code === guessCode; })[0];
        if (guessCountry) selectCountry(guessCountry, true);

        lookupCountryByIP().then(function (code) {
            // don't override a manual selection made while the lookup was in flight
            if (root.dataset.selectedCode && root.dataset.selectedCode !== guessCode) return;
            var match = code && COUNTRIES.filter(function (c) { return c.code === code; })[0];
            if (match) selectCountry(match, true);
            // else: offline, blocked, or the service is unavailable — keep the locale-based guess
        });
    }
}

document.querySelectorAll('[data-country-select]').forEach(initCountrySelect);

// looks up a destination country's acceptance note (see countryInfo above);
// falls back to a generic "works" message for the ~170+ countries we don't
// have specific notes for
function countryAcceptanceInfo(code, destName) {
    var entry = code ? countryInfo[code.toLowerCase()] : null;
    if (entry) {
        return { message: entry[1], blocked: entry[2] === 'blocked' };
    }
    return {
        message: 'Our International Driving Permit works in <span>' + destName +
            '</span>. The accepted formats include a Printed and Digital IDP valid for 1-3 years, ' +
            'or a Digital Only IDP along with a valid driver’s license.',
        blocked: false
    };
}

var COUNTRY_ALERT_OK_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="10" fill="currentColor"/>' +
    '<path d="m8 12.5 2.5 2.5 5.5-6" stroke="var(--white)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
var COUNTRY_ALERT_BLOCKED_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';

// shows an inline alert box under a destination-country select as soon as it
// changes, and disables the given "continue" buttons while the country is blocked
function initDestinationCountryAlert(destRootId, alertId, blockedSelectors) {
    var destRoot = document.getElementById(destRootId);
    var alertBox = document.getElementById(alertId);
    if (!destRoot || !alertBox) return;

    var iconEl = alertBox.querySelector('.country-alert-icon');
    var textEl = alertBox.querySelector('.country-alert-text');
    var blockedEls = (blockedSelectors || [])
        .map(function (sel) { return document.querySelector(sel); })
        .filter(Boolean);

    function setBlocked(isBlocked) {
        blockedEls.forEach(function (el) { el.disabled = isBlocked; });
    }

    function update() {
        var destCode = destRoot.dataset.selectedCode;
        if (!destCode) {
            alertBox.hidden = true;
            setBlocked(false);
            return;
        }

        var destValueEl = destRoot.querySelector('.country-select-value');
        var destName = destValueEl ? destValueEl.textContent.trim() : 'your destination';
        var info = countryAcceptanceInfo(destCode, destName);

        textEl.innerHTML = info.message;
        iconEl.innerHTML = info.blocked ? COUNTRY_ALERT_BLOCKED_ICON : COUNTRY_ALERT_OK_ICON;
        alertBox.classList.toggle('is-blocked', info.blocked);
        alertBox.classList.toggle('is-ok', !info.blocked);
        alertBox.hidden = false;
        setBlocked(info.blocked);
    }

    document.addEventListener('country-select-changed', function (e) {
        if (!e.detail || e.detail.rootId !== destRootId) return;
        update();
    });

    update(); // reflect a pre-filled value (e.g. redirected in with a URL param) immediately
}

initDestinationCountryAlert('heroDestinationCountrySelect', 'heroDestinationAlert', ['#heroCountryForm button[type="submit"]']);
initDestinationCountryAlert('appDestinationCountry', 'appDestinationAlert', ['.form-step[data-step-panel="1"] .step-next']);
initDestinationCountryAlert('countriesDestinationCountrySelect', 'countriesDestinationAlert', ['#countriesCountryForm button[type="submit"]']);
initDestinationCountryAlert('permitDestinationCountrySelect', 'permitDestinationAlert', ['#permitCountryForm button[type="submit"]']);

// wires a "where are you going" (+ optional "license issued in") form so submitting
// it forwards the selections to application.html as query params
function wireCountryForm(formId, destRootId, licenseRootId) {
    var form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var licenseRoot = licenseRootId ? document.getElementById(licenseRootId) : null;
        var destRoot = document.getElementById(destRootId);
        var params = new URLSearchParams();
        if (licenseRoot && licenseRoot.dataset.selectedCode) params.set('license_country', licenseRoot.dataset.selectedCode);
        if (destRoot && destRoot.dataset.selectedCode) params.set('destination_country', destRoot.dataset.selectedCode);
        var query = params.toString();
        window.location.href = 'application.html' + (query ? '?' + query : '');
    });
}

wireCountryForm('heroCountryForm', 'heroDestinationCountrySelect', 'heroLicenseCountrySelect');
wireCountryForm('countriesCountryForm', 'countriesDestinationCountrySelect', null);
wireCountryForm('permitCountryForm', 'permitDestinationCountrySelect', 'permitLicenseCountrySelect');

var CURRENCIES = [
    { code: 'GBP', name: 'British Pound', country: 'GB' },
    { code: 'USD', name: 'US Dollar', country: 'US' },
    { code: 'EUR', name: 'Euro', country: 'EU' },
    { code: 'AUD', name: 'Australian Dollar', country: 'AU' },
    { code: 'CAD', name: 'Canadian Dollar', country: 'CA' },
    { code: 'INR', name: 'Indian Rupee', country: 'IN' },
    { code: 'JPY', name: 'Japanese Yen', country: 'JP' }
];

function euFlagEmoji(code) {
    return code === 'EU' ? '🇪🇺' : flagEmoji(code);
}

function initCurrencySelect(root) {
    var trigger = root.querySelector('.currency-select-trigger');
    var flagEl = root.querySelector('.currency-flag');
    var codeEl = root.querySelector('.currency-code');
    var dropdown = root.querySelector('.currency-dropdown');
    var optionsEl = root.querySelector('.currency-options');
    if (!trigger || !flagEl || !codeEl || !dropdown || !optionsEl) {
        console.warn('initCurrencySelect: missing ->', {
            trigger: !!trigger, flagEl: !!flagEl, codeEl: !!codeEl, dropdown: !!dropdown, optionsEl: !!optionsEl
        });
        console.warn('initCurrencySelect: root.innerHTML was:', root.innerHTML);
        return;
    }
    var selected = CURRENCIES[0];

    function renderOptions() {
        optionsEl.innerHTML = '';
        CURRENCIES.forEach(function (c) {
            var opt = document.createElement('div');
            opt.className = 'currency-option' + (c.code === selected.code ? ' selected' : '');
            opt.setAttribute('role', 'option');
            opt.innerHTML =
                '<span class="currency-option-flag">' + euFlagEmoji(c.country) + '</span>' +
                '<span class="currency-option-code">' + c.code + '</span>';
            opt.addEventListener('mousedown', function (e) {
                e.preventDefault();
                selectCurrency(c);
            });
            optionsEl.appendChild(opt);
        });
    }

    function openDropdown() {
        dropdown.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        renderOptions();
    }

    function closeDropdown() {
        dropdown.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
    }

    function toggleDropdown() {
        if (dropdown.classList.contains('open')) closeDropdown();
        else openDropdown();
    }

    function selectCurrency(c) {
        selected = c;
        flagEl.textContent = euFlagEmoji(c.country);
        codeEl.textContent = c.code;
        closeDropdown();
        trigger.focus();
    }

    trigger.addEventListener('click', toggleDropdown);

    trigger.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeDropdown();
        }
    });

    document.addEventListener('click', function (e) {
        if (!root.contains(e.target)) closeDropdown();
    });
}

document.querySelectorAll('[data-currency-select]').forEach(initCurrencySelect);

var PHONE_COUNTRIES = COUNTRIES.filter(function (c) { return DIAL_CODES[c.code]; });

function detectBrowserCountryCode() {
    var lang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
    var region = lang.indexOf('-') !== -1 ? lang.split('-')[1].toUpperCase() : '';
    return DIAL_CODES[region] ? region : 'US';
}

function initPhoneCodeSelect(root) {
    var trigger = root.querySelector('.phone-code-trigger');
    var flagEl = root.querySelector('.phone-code-flag');
    var valueEl = root.querySelector('.phone-code-value');
    var dropdown = root.querySelector('.country-dropdown');
    var searchInput = root.querySelector('.country-search-input');
    var optionsEl = root.querySelector('.country-options');
    var hiddenInput = root.dataset.hiddenInput ? document.getElementById(root.dataset.hiddenInput) : null;
    if (!trigger || !flagEl || !valueEl || !dropdown || !searchInput || !optionsEl) {
        console.warn('initPhoneCodeSelect: markup incomplete on', root, '— skipping.');
        return;
    }

    var filtered = PHONE_COUNTRIES;
    var activeIndex = -1;
    var query = '';

    function renderOptions() {
        optionsEl.innerHTML = '';
        if (!filtered.length) {
            var empty = document.createElement('div');
            empty.className = 'country-empty';
            empty.textContent = 'No countries found';
            optionsEl.appendChild(empty);
            return;
        }
        filtered.forEach(function (c, i) {
            var opt = document.createElement('div');
            opt.className = 'country-option' + (i === activeIndex ? ' active' : '');
            opt.setAttribute('role', 'option');
            var flagSpan = document.createElement('span');
            flagSpan.textContent = flagEmoji(c.code);
            var codeSpan = document.createElement('span');
            codeSpan.className = 'country-option-dial';
            codeSpan.textContent = '+' + DIAL_CODES[c.code];
            var nameSpan = document.createElement('span');
            nameSpan.appendChild(buildMatchLabel(c.name, query));
            opt.appendChild(flagSpan);
            opt.appendChild(codeSpan);
            opt.appendChild(nameSpan);
            opt.addEventListener('mousedown', function (e) {
                e.preventDefault();
                selectCountry(c);
            });
            optionsEl.appendChild(opt);
        });
    }

    function openDropdown() {
        dropdown.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        query = '';
        searchInput.value = '';
        filtered = PHONE_COUNTRIES;
        activeIndex = -1;
        renderOptions();
        searchInput.focus();
    }

    function closeDropdown() {
        dropdown.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        activeIndex = -1;
    }

    function toggleDropdown() {
        if (dropdown.classList.contains('open')) closeDropdown();
        else openDropdown();
    }

    function filterList(q) {
        query = q.trim();
        var lower = query.toLowerCase();
        filtered = lower ? PHONE_COUNTRIES.filter(function (c) { return c.name.toLowerCase().indexOf(lower) !== -1 || DIAL_CODES[c.code].indexOf(lower.replace('+', '')) === 0; }) : PHONE_COUNTRIES;
        activeIndex = -1;
        renderOptions();
    }

    function selectCountry(c, silent) {
        flagEl.textContent = flagEmoji(c.code);
        valueEl.textContent = '+' + DIAL_CODES[c.code];
        if (hiddenInput) hiddenInput.value = DIAL_CODES[c.code];
        root.dataset.selectedCode = c.code;
        if (!silent) {
            closeDropdown();
            trigger.focus();
        }
        document.dispatchEvent(new CustomEvent('phone-country-changed', { detail: { rootId: root.id } }));
    }

    function scrollActiveIntoView() {
        var activeEl = optionsEl.querySelector('.country-option.active');
        if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
    }

    trigger.addEventListener('click', toggleDropdown);

    searchInput.addEventListener('input', function () {
        filterList(searchInput.value);
    });

    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
            renderOptions();
            scrollActiveIntoView();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
            renderOptions();
            scrollActiveIntoView();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && filtered[activeIndex]) selectCountry(filtered[activeIndex]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeDropdown();
            trigger.focus();
        }
    });

    document.addEventListener('click', function (e) {
        if (!root.contains(e.target)) closeDropdown();
    });

    // auto-detect: instant guess from browser locale, then refine with a best-effort IP lookup
    var guessCode = detectBrowserCountryCode();
    var guessCountry = PHONE_COUNTRIES.filter(function (c) { return c.code === guessCode; })[0];
    if (guessCountry) selectCountry(guessCountry, true);

    lookupCountryByIP().then(function (code) {
        var match = code && PHONE_COUNTRIES.filter(function (c) { return c.code === code; })[0];
        if (match) selectCountry(match, true);
        // else: offline, blocked, or the service is unavailable — keep the locale-based guess
    });
}

document.querySelectorAll('[data-phone-code-select]').forEach(initPhoneCodeSelect);

function initProductSlider(row) {
    var track = row.querySelector('.products-track');
    var prevBtn = row.querySelector('.arrow-btn[data-dir="-1"]');
    var nextBtn = row.querySelector('.arrow-btn[data-dir="1"]');
    if (!track.children.length) return;

    // queried live (not snapshotted) so cards swapped in later — e.g. once
    // featured products load from WooCommerce — are measured correctly
    function slideDistance() {
        var firstCard = track.children[0];
        if (!firstCard) return 0;
        var style = getComputedStyle(track);
        var gap = parseFloat(style.columnGap || style.gap || 0);
        return firstCard.getBoundingClientRect().width + gap;
    }

    function maxScroll() {
        return track.scrollWidth - track.clientWidth;
    }

    function updateState() {
        // infinite carousel: the arrows loop instead of disabling at the ends
        var hasOverflow = maxScroll() > 4;
        prevBtn.disabled = !hasOverflow;
        nextBtn.disabled = !hasOverflow;
    }

    prevBtn.addEventListener('click', function () {
        if (track.scrollLeft <= 4) {
            track.scrollTo({ left: maxScroll(), behavior: 'smooth' });
        } else {
            track.scrollBy({ left: -slideDistance(), behavior: 'smooth' });
        }
    });
    nextBtn.addEventListener('click', function () {
        if (track.scrollLeft >= maxScroll() - 4) {
            track.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            track.scrollBy({ left: slideDistance(), behavior: 'smooth' });
        }
    });

    var scrollTimeout;
    track.addEventListener('scroll', function () {
        window.clearTimeout(scrollTimeout);
        scrollTimeout = window.setTimeout(updateState, 80);
    });
    window.addEventListener('resize', updateState);
    updateState();
}

document.querySelectorAll('.products-row').forEach(initProductSlider);

var REVIEWS = [
    { stars: 5, text: 'Saved me hours of researching confusing foreign road rules before my trip to France!', name: 'Sarah M.', loc: 'United States' },
    { stars: 5, text: 'Saved me hours of researching confusing foreign road rules before my trip to France!', name: 'David L.', loc: 'Australia' },
    { stars: 5, text: 'Excellent guide to read before renting a car. The PDF formatting looks great on my phone.', name: 'David K.', loc: 'UK' },
    { stars: 5, text: 'Saved me hours of researching confusing foreign road rules before my trip to France!', name: 'Aisha R.', loc: 'Canada' },
    { stars: 5, text: 'Very professional formatting and extremely accurate translation layout. Highly recommended!', name: 'Carlos R.', loc: 'Brazil' },
    { stars: 5, text: 'Saved me hours of researching confusing foreign road rules before my trip to France!', name: 'Takeshi N.', loc: 'Japan' }
];

function reviewCardHTML(r) {
    return '' +
        '<div class="review-card">' +
        '<div class="review-header">' +
        '<span class="review-stars">' + '★'.repeat(r.stars) + '</span>' +
        '<span class="review-verified"><span class="check"><img src="assets/images/icons/blue-verified.svg" alt=""></span>Verified Customer</span>' +
        '</div>' +
        '<p class="review-text">' + r.text + '</p>' +
        '<div class="review-footer">' +
        '<div class="review-avatar">' + r.name.charAt(0) + '</div>' +
        '<div><div class="review-name">' + r.name + '</div><div class="review-loc">' + r.loc + '</div></div>' +
        '</div>' +
        '</div>';
}

var ARROW_ICON_LEFT = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M20 12H4m0 0 6-6m-6 6 6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>';
var ARROW_ICON_RIGHT = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M4 12h16m0 0-6-6m6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>';

function renderReviews() {
    var grid = document.getElementById('reviewsGrid');
    if (!grid) return;

    var isMobile = window.matchMedia('(max-width: 640px)').matches;
    var columnCount = isMobile ? 1 : window.matchMedia('(max-width: 1024px)').matches ? 2 : 3;
    var mode = isMobile ? 'carousel' : 'columns-' + columnCount;

    if (grid.dataset.mode === mode) return;
    grid.dataset.mode = mode;

    // on mobile there's no room for 3 auto-scrolling columns side by side, so
    // swap the passive ticker for a swipeable, arrow-navigable single-card carousel
    if (isMobile) {
        grid.innerHTML =
            '<div class="products-row reviews-carousel">' +
            '<button type="button" class="arrow-btn" data-dir="-1" aria-label="Previous review">' + ARROW_ICON_LEFT + '</button>' +
            '<div class="products-viewport"><div class="products-track">' +
            REVIEWS.map(reviewCardHTML).join('') +
            '</div></div>' +
            '<button type="button" class="arrow-btn" data-dir="1" aria-label="Next review">' + ARROW_ICON_RIGHT + '</button>' +
            '</div>';
        initProductSlider(grid.querySelector('.reviews-carousel'));
        return;
    }

    var columns = [];
    for (var i = 0; i < columnCount; i++) columns.push([]);
    REVIEWS.forEach(function (r, i) { columns[i % columnCount].push(r); });

    grid.innerHTML = columns.map(function (col) {
        var cardsHTML = col.map(reviewCardHTML).join('');
        return '<div class="reviews-col"><div class="reviews-track">' + cardsHTML + cardsHTML.replace(/<div class="review-card">/g, '<div class="review-card" aria-hidden="true">') + '</div></div>';
    }).join('');
}

renderReviews();
window.addEventListener('resize', renderReviews);
