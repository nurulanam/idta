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

var COUNTRIES = [
    ['AF', "Afghanistan"], ['AL', "Albania"], ['DZ', "Algeria"],
    ['AS', "American Samoa"], ['AD', "Andorra"], ['AO', "Angola"],
    ['AI', "Anguilla"], ['AQ', "Antarctica"], ['AG', "Antigua and Barbuda"],
    ['AR', "Argentina"], ['AM', "Armenia"], ['AW', "Aruba"],
    ['AU', "Australia"], ['AT', "Austria"], ['AZ', "Azerbaijan"],
    ['BS', "Bahamas"], ['BH', "Bahrain"], ['BD', "Bangladesh"],
    ['BB', "Barbados"], ['BY', "Belarus"], ['BE', "Belgium"],
    ['BZ', "Belize"], ['BJ', "Benin"], ['BM', "Bermuda"],
    ['BT', "Bhutan"], ['BO', "Bolivia"], ['BQ', "Bonaire, Sint Eustatius and Saba"],
    ['BA', "Bosnia and Herzegovina"], ['BW', "Botswana"], ['BV', "Bouvet Island"],
    ['BR', "Brazil"], ['IO', "British Indian Ocean Territory"], ['BN', "Brunei Darussalam"],
    ['BG', "Bulgaria"], ['BF', "Burkina Faso"], ['BI', "Burundi"],
    ['CV', "Cabo Verde"], ['KH', "Cambodia"], ['CM', "Cameroon"],
    ['CA', "Canada"], ['KY', "Cayman Islands"], ['CF', "Central African Republic"],
    ['TD', "Chad"], ['CL', "Chile"], ['CN', "China"],
    ['CX', "Christmas Island"], ['CC', "Cocos (Keeling) Islands"], ['CO', "Colombia"],
    ['KM', "Comoros"], ['CG', "Congo"], ['CD', "Congo, Democratic Republic of the"],
    ['CK', "Cook Islands"], ['CR', "Costa Rica"], ['HR', "Croatia"],
    ['CU', "Cuba"], ['CW', "Cura\u00e7ao"], ['CY', "Cyprus"],
    ['CZ', "Czechia"], ['DK', "Denmark"], ['DJ', "Djibouti"],
    ['DM', "Dominica"], ['DO', "Dominican Republic"], ['EC', "Ecuador"],
    ['EG', "Egypt"], ['SV', "El Salvador"], ['GQ', "Equatorial Guinea"],
    ['ER', "Eritrea"], ['EE', "Estonia"], ['SZ', "Eswatini"],
    ['ET', "Ethiopia"], ['FK', "Falkland Islands (Malvinas)"], ['FO', "Faroe Islands"],
    ['FJ', "Fiji"], ['FI', "Finland"], ['FR', "France"],
    ['GF', "French Guiana"], ['PF', "French Polynesia"], ['TF', "French Southern Territories"],
    ['GA', "Gabon"], ['GM', "Gambia"], ['GE', "Georgia"],
    ['DE', "Germany"], ['GH', "Ghana"], ['GI', "Gibraltar"],
    ['GR', "Greece"], ['GL', "Greenland"], ['GD', "Grenada"],
    ['GP', "Guadeloupe"], ['GU', "Guam"], ['GT', "Guatemala"],
    ['GG', "Guernsey"], ['GN', "Guinea"], ['GW', "Guinea-Bissau"],
    ['GY', "Guyana"], ['HT', "Haiti"], ['HM', "Heard Island and McDonald Islands"],
    ['VA', "Holy See"], ['HN', "Honduras"], ['HK', "Hong Kong"],
    ['HU', "Hungary"], ['IS', "Iceland"], ['IN', "India"],
    ['ID', "Indonesia"], ['IR', "Iran"], ['IQ', "Iraq"],
    ['IE', "Ireland"], ['IM', "Isle of Man"], ['IL', "Israel"],
    ['IT', "Italy"], ['JM', "Jamaica"], ['JP', "Japan"],
    ['JE', "Jersey"], ['JO', "Jordan"], ['KZ', "Kazakhstan"],
    ['KE', "Kenya"], ['KI', "Kiribati"], ['KP', "Korea, Democratic People's Republic of"],
    ['KR', "Korea, Republic of Korea"], ['KW', "Kuwait"], ['KG', "Kyrgyzstan"],
    ['LA', "Lao People's Democratic Republic"], ['LV', "Latvia"], ['LB', "Lebanon"],
    ['LS', "Lesotho"], ['LR', "Liberia"], ['LY', "Libya"],
    ['LI', "Liechtenstein"], ['LT', "Lithuania"], ['LU', "Luxembourg"],
    ['MO', "Macao"], ['MG', "Madagascar"], ['MW', "Malawi"],
    ['MY', "Malaysia"], ['MV', "Maldives"], ['ML', "Mali"],
    ['MT', "Malta"], ['MH', "Marshall Islands"], ['MQ', "Martinique"],
    ['MR', "Mauritania"], ['MU', "Mauritius"], ['YT', "Mayotte"],
    ['MX', "Mexico"], ['FM', "Micronesia"], ['MD', "Moldova, Republic of"],
    ['MC', "Monaco"], ['MN', "Mongolia"], ['ME', "Montenegro"],
    ['MS', "Montserrat"], ['MA', "Morocco"], ['MZ', "Mozambique"],
    ['MM', "Myanmar"], ['NA', "Namibia"], ['NR', "Nauru"],
    ['NP', "Nepal"], ['NL', "Netherlands"], ['NC', "New Caledonia"],
    ['NZ', "New Zealand"], ['NI', "Nicaragua"], ['NE', "Niger"],
    ['NG', "Nigeria"], ['NU', "Niue"], ['NF', "Norfolk Island"],
    ['MP', "Northern Mariana Islands"], ['NO', "Norway"], ['OM', "Oman"],
    ['PK', "Pakistan"], ['PW', "Palau"], ['PS', "Palestine, State of"],
    ['PA', "Panama"], ['PG', "Papua New Guinea"], ['PY', "Paraguay"],
    ['PE', "Peru"], ['PH', "Philippines"], ['PN', "Pitcairn"],
    ['PL', "Poland"], ['PT', "Portugal"], ['PR', "Puerto Rico"],
    ['QA', "Qatar"], ['RO', "Romania"], ['RU', "Russian Federation"],
    ['RW', "Rwanda"], ['RE', "R\u00e9union"], ['BL', "Saint Barth\u00e9lemy"],
    ['KN', "Saint Kitts and Nevis"], ['LC', "Saint Lucia"], ['MF', "Saint Martin (French part)"],
    ['PM', "Saint Pierre and Miquelon"], ['VC', "Saint Vincent and the Grenadines"], ['WS', "Samoa"],
    ['SM', "San Marino"], ['ST', "Sao Tome and Principe"], ['SA', "Saudi Arabia"],
    ['SN', "Senegal"], ['RS', "Serbia"], ['SC', "Seychelles"],
    ['SL', "Sierra Leone"], ['SG', "Singapore"], ['SX', "Sint Maarten (Dutch part)"],
    ['SK', "Slovakia"], ['SI', "Slovenia"], ['SB', "Solomon Islands"],
    ['SO', "Somalia"], ['ZA', "South Africa"], ['GS', "South Georgia and the South Sandwich Islands"],
    ['SS', "South Sudan"], ['ES', "Spain"], ['LK', "Sri Lanka"],
    ['SD', "Sudan"], ['SR', "Suriname"], ['SJ', "Svalbard and Jan Mayen"],
    ['SE', "Sweden"], ['CH', "Switzerland"], ['SY', "Syrian Arab Republic"],
    ['TW', "Taiwan"], ['TJ', "Tajikistan"], ['TZ', "Tanzania, United Republic of"],
    ['TH', "Thailand"], ['TL', "Timor-Leste"], ['TG', "Togo"],
    ['TK', "Tokelau"], ['TO', "Tonga"], ['TT', "Trinidad and Tobago"],
    ['TN', "Tunisia"], ['TR', "Turkey"], ['TM', "Turkmenistan"],
    ['TC', "Turks and Caicos Islands"], ['TV', "Tuvalu"], ['UG', "Uganda"],
    ['UA', "Ukraine"], ['AE', "United Arab Emirates"], ['GB', "United Kingdom"],
    ['US', "United States"], ['UM', "United States Minor Outlying Islands"], ['VI', "United States Virgin Islands"],
    ['UY', "Uruguay"], ['UZ', "Uzbekistan"], ['VU', "Vanuatu"],
    ['VE', "Venezuela"], ['VN', "Viet Nam"], ['WF', "Wallis and Futuna"],
    ['EH', "Western Sahara"], ['YE', "Yemen"], ['ZM', "Zambia"],
    ['ZW', "Zimbabwe"]
].map(function (c) { return { code: c[0], name: c[1] }; }).sort(function (a, b) { return a.name.localeCompare(b.name); });

var DIAL_CODES = {
    'AF': '93', 'AL': '355', 'DZ': '213', 'AS': '1684', 'AD': '376', 'AO': '244',
    'AI': '1264', 'AQ': '672', 'AG': '1268', 'AR': '54', 'AM': '374', 'AW': '297',
    'AU': '61', 'AT': '43', 'AZ': '994', 'BS': '1242', 'BH': '973', 'BD': '880',
    'BB': '1246', 'BY': '375', 'BE': '32', 'BZ': '501', 'BJ': '229', 'BM': '1441',
    'BT': '975', 'BO': '591', 'BQ': '599', 'BA': '387', 'BW': '267', 'BV': '47',
    'BR': '55', 'IO': '246', 'BN': '673', 'BG': '359', 'BF': '226', 'BI': '257',
    'CV': '238', 'KH': '855', 'CM': '237', 'CA': '1', 'KY': '1345', 'CF': '236',
    'TD': '235', 'CL': '56', 'CN': '86', 'CX': '61', 'CC': '61', 'CO': '57',
    'KM': '269', 'CG': '242', 'CD': '243', 'CK': '682', 'CR': '506', 'HR': '385',
    'CU': '53', 'CW': '599', 'CY': '357', 'CZ': '420', 'DK': '45', 'DJ': '253',
    'DM': '1767', 'DO': '1809', 'EC': '593', 'EG': '20', 'SV': '503', 'GQ': '240',
    'ER': '291', 'EE': '372', 'SZ': '268', 'ET': '251', 'FK': '500', 'FO': '298',
    'FJ': '679', 'FI': '358', 'FR': '33', 'GF': '594', 'PF': '689', 'TF': '262',
    'GA': '241', 'GM': '220', 'GE': '995', 'DE': '49', 'GH': '233', 'GI': '350',
    'GR': '30', 'GL': '299', 'GD': '1473', 'GP': '590', 'GU': '1671', 'GT': '502',
    'GG': '44', 'GN': '224', 'GW': '245', 'GY': '592', 'HT': '509', 'HM': '672',
    'VA': '379', 'HN': '504', 'HK': '852', 'HU': '36', 'IS': '354', 'IN': '91',
    'ID': '62', 'IR': '98', 'IQ': '964', 'IE': '353', 'IM': '44', 'IL': '972',
    'IT': '39', 'JM': '1876', 'JP': '81', 'JE': '44', 'JO': '962', 'KZ': '7',
    'KE': '254', 'KI': '686', 'KP': '850', 'KR': '82', 'KW': '965', 'KG': '996',
    'LA': '856', 'LV': '371', 'LB': '961', 'LS': '266', 'LR': '231', 'LY': '218',
    'LI': '423', 'LT': '370', 'LU': '352', 'MO': '853', 'MG': '261', 'MW': '265',
    'MY': '60', 'MV': '960', 'ML': '223', 'MT': '356', 'MH': '692', 'MQ': '596',
    'MR': '222', 'MU': '230', 'YT': '262', 'MX': '52', 'FM': '691', 'MD': '373',
    'MC': '377', 'MN': '976', 'ME': '382', 'MS': '1664', 'MA': '212', 'MZ': '258',
    'MM': '95', 'NA': '264', 'NR': '674', 'NP': '977', 'NL': '31', 'NC': '687',
    'NZ': '64', 'NI': '505', 'NE': '227', 'NG': '234', 'NU': '683', 'NF': '672',
    'MP': '1670', 'NO': '47', 'OM': '968', 'PK': '92', 'PW': '680', 'PS': '970',
    'PA': '507', 'PG': '675', 'PY': '595', 'PE': '51', 'PH': '63', 'PN': '64',
    'PL': '48', 'PT': '351', 'PR': '1787', 'QA': '974', 'RO': '40', 'RU': '7',
    'RW': '250', 'RE': '262', 'BL': '590', 'KN': '1869', 'LC': '1758', 'MF': '590',
    'PM': '508', 'VC': '1784', 'WS': '685', 'SM': '378', 'ST': '239', 'SA': '966',
    'SN': '221', 'RS': '381', 'SC': '248', 'SL': '232', 'SG': '65', 'SX': '1721',
    'SK': '421', 'SI': '386', 'SB': '677', 'SO': '252', 'ZA': '27', 'GS': '500',
    'SS': '211', 'ES': '34', 'LK': '94', 'SD': '249', 'SR': '597', 'SJ': '47',
    'SE': '46', 'CH': '41', 'SY': '963', 'TW': '886', 'TJ': '992', 'TZ': '255',
    'TH': '66', 'TL': '670', 'TG': '228', 'TK': '690', 'TO': '676', 'TT': '1868',
    'TN': '216', 'TR': '90', 'TM': '993', 'TC': '1649', 'TV': '688', 'UG': '256',
    'UA': '380', 'AE': '971', 'GB': '44', 'US': '1', 'UM': '1', 'VI': '1340',
    'UY': '598', 'UZ': '998', 'VU': '678', 'VE': '58', 'VN': '84', 'WF': '681',
    'EH': '212', 'YE': '967', 'ZM': '260', 'ZW': '263'
};

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

    function selectCountry(c) {
        valueEl.textContent = c.name;
        valueEl.classList.add('has-value');
        icon.textContent = flagEmoji(c.code);
        clearBtn.hidden = false;
        root.dataset.selectedCode = c.code;
        closeDropdown();
        trigger.focus();
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
}

document.querySelectorAll('[data-country-select]').forEach(initCountrySelect);

var heroCountryForm = document.getElementById('heroCountryForm');
if (heroCountryForm) {
    heroCountryForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var licenseRoot = document.getElementById('heroLicenseCountrySelect');
        var destRoot = document.getElementById('heroDestinationCountrySelect');
        var params = new URLSearchParams();
        if (licenseRoot && licenseRoot.dataset.selectedCode) params.set('license_country', licenseRoot.dataset.selectedCode);
        if (destRoot && destRoot.dataset.selectedCode) params.set('destination_country', destRoot.dataset.selectedCode);
        var query = params.toString();
        window.location.href = 'application.html' + (query ? '?' + query : '');
    });
}

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

    if (window.fetch) {
        fetch('https://ipwho.is/').then(function (r) { return r.json(); }).then(function (data) {
            var code = data && data.country_code;
            var match = code && PHONE_COUNTRIES.filter(function (c) { return c.code === code; })[0];
            if (match) selectCountry(match, true);
        }).catch(function () {
            // offline, blocked, or the service is unavailable — keep the locale-based guess
        });
    }
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

function renderReviews() {
    var grid = document.getElementById('reviewsGrid');
    if (!grid) return;

    var columnCount = window.matchMedia('(max-width: 640px)').matches ? 1 :
        window.matchMedia('(max-width: 1024px)').matches ? 2 : 3;

    if (grid.dataset.columns === String(columnCount)) return;
    grid.dataset.columns = String(columnCount);

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
