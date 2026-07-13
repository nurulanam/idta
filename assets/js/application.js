(function () {
    var steps = document.querySelectorAll('.form-step');
    var stepItems = document.querySelectorAll('.step-item');
    var connectors = document.querySelectorAll('.step-connector');
    var applicationSection = document.querySelector('.application-section');

    if (!steps.length) return;

    // ---------- test mode (driven by .env via assets/js/env.js) ----------
    var TEST_MODE = !!(window.ENV && window.ENV.TEST_MODE);

    var testModeBanner = document.getElementById('testModeBanner');
    var cardTestHint = document.getElementById('cardTestHint');
    if (TEST_MODE) {
        if (testModeBanner) testModeBanner.hidden = false;
        if (cardTestHint) cardTestHint.hidden = false;
    }

    // ---------- payment card validators ----------
    function luhnCheck(digits) {
        var sum = 0, alt = false;
        for (var i = digits.length - 1; i >= 0; i--) {
            var n = parseInt(digits.charAt(i), 10);
            if (alt) { n *= 2; if (n > 9) n -= 9; }
            sum += n;
            alt = !alt;
        }
        return sum % 10 === 0;
    }

    function isValidCardNumber(value) {
        var digits = value.replace(/\D/g, '');
        if (digits.length < 13 || digits.length > 19) return false;
        // test mode accepts any well-formed demo number without requiring a real Luhn checksum
        return TEST_MODE || luhnCheck(digits);
    }

    function isValidCardExpiry(value) {
        var m = value.match(/^(\d{2})\s*\/\s*(\d{2})$/);
        if (!m) return false;
        var month = parseInt(m[1], 10);
        var year = parseInt(m[2], 10) + 2000;
        if (month < 1 || month > 12) return false;
        var now = new Date();
        var currentYear = now.getFullYear();
        var currentMonth = now.getMonth() + 1;
        return year > currentYear || (year === currentYear && month >= currentMonth);
    }

    function isValidCardCVC(value) {
        return /^\d{3,4}$/.test(value.trim());
    }

    var CARD_VALIDATORS = {
        'card-number': { test: isValidCardNumber, message: 'Please enter a valid card number.' },
        'card-expiry': { test: isValidCardExpiry, message: 'Please enter a valid, non-expired date (MM/YY).' },
        'card-cvc': { test: isValidCardCVC, message: 'Please enter a valid CVC.' }
    };

    // auto-format card fields as the user types
    var cardNumberInput = document.getElementById('card-number');
    if (cardNumberInput) {
        cardNumberInput.setAttribute('maxlength', '23');
        cardNumberInput.addEventListener('input', function () {
            var digits = cardNumberInput.value.replace(/\D/g, '').slice(0, 19);
            cardNumberInput.value = digits.replace(/(.{4})/g, '$1 ').trim();
        });
    }

    var cardExpiryInput = document.getElementById('card-expiry');
    if (cardExpiryInput) {
        cardExpiryInput.setAttribute('maxlength', '5');
        cardExpiryInput.addEventListener('input', function () {
            var digits = cardExpiryInput.value.replace(/\D/g, '').slice(0, 4);
            if (digits.length > 2) digits = digits.slice(0, 2) + '/' + digits.slice(2);
            cardExpiryInput.value = digits;
        });
    }

    var cardCvcInput = document.getElementById('card-cvc');
    if (cardCvcInput) {
        cardCvcInput.setAttribute('maxlength', '4');
        cardCvcInput.addEventListener('input', function () {
            cardCvcInput.value = cardCvcInput.value.replace(/\D/g, '').slice(0, 4);
        });
    }

    function goToStep(n, skipScroll) {
        steps.forEach(function (s) {
            s.hidden = s.dataset.stepPanel !== String(n);
        });
        stepItems.forEach(function (item) {
            var s = Number(item.dataset.step);
            item.classList.toggle('active', s === n);
            item.classList.toggle('completed', s < n);
        });
        connectors.forEach(function (c) {
            c.classList.toggle('completed', Number(c.dataset.connector) < n);
        });
        if (n === 2) resizeCanvasIfNeeded();
        if (applicationSection && !skipScroll) {
            window.scrollTo({ top: applicationSection.offsetTop - 100, behavior: 'smooth' });
        }
    }

    // ---------- validation ----------
    function showFieldError(anchorEl, message) {
        var err = anchorEl.nextElementSibling;
        if (!err || !err.classList.contains('field-error')) {
            err = document.createElement('div');
            err.className = 'field-error';
            err.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
                '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>' +
                '<path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
                '<span class="field-error-text"></span>';
            anchorEl.insertAdjacentElement('afterend', err);
        }
        err.querySelector('.field-error-text').textContent = message;
        err.classList.add('show');
    }

    function clearFieldError(anchorEl) {
        var err = anchorEl.nextElementSibling;
        if (err && err.classList.contains('field-error')) err.classList.remove('show');
    }

    function hasSignature(canvasEl) {
        if (!canvasEl || !canvasEl.width || !canvasEl.height) return false;
        var ctx = canvasEl.getContext('2d');
        var data = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height).data;
        for (var i = 3; i < data.length; i += 4) {
            if (data[i] !== 0) return true;
        }
        return false;
    }

    function validateStep(panel) {
        var firstInvalid = null;
        var ok = true;

        function fail(el, anchor, message) {
            showFieldError(anchor, message);
            el.classList.add('invalid');
            ok = false;
            if (!firstInvalid) firstInvalid = el;
        }

        function pass(el, anchor) {
            clearFieldError(anchor);
            el.classList.remove('invalid');
        }

        panel.querySelectorAll('input[required]:not([type=file]):not([type=checkbox]), textarea[required]').forEach(function (input) {
            if (input.offsetParent === null) return;
            var anchor = input.closest('.phone-field') || input;
            var cardRule = CARD_VALIDATORS[input.id];
            if (!input.checkValidity()) {
                var msg = 'This field is required.';
                if (input.validity.typeMismatch) msg = 'Please enter a valid email address.';
                fail(input, anchor, msg);
            } else if (input.type === 'tel' && input.value.replace(/\D/g, '').length < 6) {
                fail(input, anchor, 'Please enter a valid phone number.');
            } else if (cardRule && !cardRule.test(input.value)) {
                fail(input, anchor, cardRule.message);
            } else {
                pass(input, anchor);
            }
        });

        panel.querySelectorAll('.country-select[data-required="true"]').forEach(function (root) {
            if (root.offsetParent === null) return;
            if (!root.dataset.selectedCode) fail(root, root, 'Please make a selection.');
            else pass(root, root);
        });

        var licenseGrid = panel.querySelector('.license-grid[data-required="true"]');
        if (licenseGrid) {
            var anyChecked = licenseGrid.querySelector('input[type=checkbox]:checked');
            if (!anyChecked) fail(licenseGrid, licenseGrid, 'Please select at least one license class.');
            else pass(licenseGrid, licenseGrid);
        }

        panel.querySelectorAll('.upload-field input[type=file][required]').forEach(function (input) {
            var field = input.closest('.upload-field');
            var box = field.querySelector('.upload-box');
            if (!input.files || !input.files.length) fail(field, box, 'Please upload a photo.');
            else pass(field, box);
        });

        var sigWrap = panel.querySelector('.signature-wrap[data-required="true"]');
        if (sigWrap) {
            var sigCanvas = sigWrap.querySelector('canvas');
            if (!hasSignature(sigCanvas)) fail(sigWrap, sigWrap, 'Please provide your signature.');
            else pass(sigWrap, sigWrap);
        }

        panel.querySelectorAll('input[type=checkbox][required]').forEach(function (chk) {
            var label = chk.closest('.checkbox-field') || chk;
            if (!chk.checked) fail(label, label, 'You must agree to continue.');
            else pass(label, label);
        });

        if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return ok;
    }

    // live-clear text/email/date/tel/card errors as the user fixes them
    document.querySelectorAll('input[required]:not([type=file]):not([type=checkbox]), textarea[required]').forEach(function (input) {
        var anchor = input.closest('.phone-field') || input;
        var cardRule = CARD_VALIDATORS[input.id];
        input.addEventListener('input', function () {
            var telInvalid = input.type === 'tel' && input.value.replace(/\D/g, '').length < 6;
            var cardInvalid = cardRule && !cardRule.test(input.value);
            if (input.checkValidity() && !telInvalid && !cardInvalid) {
                clearFieldError(anchor);
                input.classList.remove('invalid');
            }
        });
    });

    // live-clear required checkboxes (e.g. terms) as soon as they're checked
    document.querySelectorAll('input[type=checkbox][required]').forEach(function (chk) {
        chk.addEventListener('change', function () {
            var label = chk.closest('.checkbox-field') || chk;
            if (chk.checked) {
                clearFieldError(label);
                label.classList.remove('invalid');
            }
        });
    });

    // live-clear required country selects as soon as a selection is made
    document.addEventListener('country-select-changed', function (e) {
        var root = document.getElementById(e.detail && e.detail.rootId);
        if (root && root.dataset.required === 'true' && root.dataset.selectedCode) {
            clearFieldError(root);
            root.classList.remove('invalid');
        }
    });

    document.querySelectorAll('[data-next]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var panel = btn.closest('.form-step');
            if (!validateStep(panel)) return;
            goToStep(Number(btn.dataset.next));
        });
    });

    document.querySelectorAll('[data-back]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            goToStep(Number(btn.dataset.back));
        });
    });

    // ---------- gender tabs ----------
    var genderValue = document.getElementById('genderValue');
    document.querySelectorAll('.gender-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.gender-tab').forEach(function (t) { t.classList.remove('active'); });
            tab.classList.add('active');
            if (genderValue) genderValue.value = tab.dataset.gender;
        });
    });

    // ---------- license class multi-select ----------
    document.querySelectorAll('.license-card').forEach(function (card) {
        var input = card.querySelector('input');
        input.addEventListener('change', function () {
            card.classList.toggle('active', input.checked);
            var grid = card.closest('.license-grid');
            if (input.checked && grid) {
                clearFieldError(grid);
                grid.classList.remove('invalid');
            }
        });
    });

    // ---------- pricing validity tabs ----------
    document.querySelectorAll('.plan-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            var summaryValidity = document.getElementById('summaryValidity');
            if (summaryValidity) summaryValidity.textContent = tab.querySelector('.plan-price').textContent;
        });
    });

    // ---------- plan / package select cards ----------
    var planCards = document.querySelectorAll('.plan-select-card');

    function updateSummary() {
        var selected = document.querySelector('.plan-select-card.selected');
        var summaryPackage = document.getElementById('summaryPackage');
        var summaryTotal = document.getElementById('summaryTotal');
        if (selected && summaryPackage && summaryTotal) {
            summaryPackage.textContent = selected.dataset.title;
            summaryTotal.textContent = selected.dataset.price;
        }

        var issuedEl = document.querySelector('#appLicenseCountry .country-select-value');
        var destEl = document.querySelector('#appDestinationCountry .country-select-value');
        var routeEl = document.getElementById('summaryRoute');
        if (routeEl) {
            var issued = issuedEl && issuedEl.classList.contains('has-value') ? issuedEl.textContent : '—';
            var dest = destEl && destEl.classList.contains('has-value') ? destEl.textContent : '—';
            routeEl.textContent = issued + ' → ' + dest;
        }
    }

    planCards.forEach(function (card) {
        var input = card.querySelector('input');
        input.addEventListener('change', function () {
            planCards.forEach(function (c) { c.classList.toggle('selected', c === card); });
            updateSummary();
        });
    });

    document.addEventListener('click', function () {
        window.setTimeout(updateSummary, 0);
    });

    // ---------- file uploads ----------
    function truncateFilename(name, maxLength) {
        maxLength = maxLength || 22;
        if (name.length <= maxLength) return name;
        var dotIndex = name.lastIndexOf('.');
        var ext = dotIndex > -1 ? name.slice(dotIndex) : '';
        var base = dotIndex > -1 ? name.slice(0, dotIndex) : name;
        var keep = Math.max(maxLength - ext.length - 4, 6);
        return base.slice(0, keep) + '....' + ext;
    }

    document.querySelectorAll('[data-upload]').forEach(function (field) {
        var input = field.querySelector('input[type=file]');
        var box = field.querySelector('.upload-box');
        var titleEl = field.querySelector('.upload-title');
        var preview = field.querySelector('.upload-preview');
        var defaultTitle = titleEl.textContent;

        function applyFile(file) {
            field.classList.add('has-file');
            titleEl.textContent = truncateFilename(file.name);
            titleEl.title = file.name;
            clearFieldError(box);
            field.classList.remove('invalid');
            if (preview && file.type.indexOf('image/') === 0) {
                var reader = new FileReader();
                reader.onload = function (e) { preview.src = e.target.result; };
                reader.readAsDataURL(file);
            }
        }

        function resetField() {
            field.classList.remove('has-file');
            titleEl.textContent = defaultTitle;
            titleEl.removeAttribute('title');
        }

        box.addEventListener('click', function () { input.click(); });

        input.addEventListener('change', function () {
            var file = input.files && input.files[0];
            if (!file) {
                resetField();
                return;
            }

            if (!window.openImageEditor || file.type.indexOf('image/') !== 0) {
                applyFile(file);
                return;
            }

            window.openImageEditor(file, {
                aspect: parseFloat(field.dataset.cropAspect) || 1,
                title: field.dataset.cropTitle || 'Edit Photo'
            }, function (editedFile) {
                if (!editedFile) {
                    input.value = '';
                    resetField();
                    return;
                }
                var dt = new DataTransfer();
                dt.items.add(editedFile);
                input.files = dt.files;
                applyFile(editedFile);
            });
        });
    });

    // ---------- signature pad ----------
    var canvas = document.getElementById('signaturePad');
    var signatureSized = false;

    function resizeCanvasIfNeeded() {
        if (!canvas || signatureSized) return;
        var rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        var ratio = window.devicePixelRatio || 1;
        var ctx = canvas.getContext('2d');
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        ctx.scale(ratio, ratio);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#14140f';
        signatureSized = true;
    }

    if (canvas) {
        var ctx = canvas.getContext('2d');
        var drawing = false;
        resizeCanvasIfNeeded();

        function pointerPos(e) {
            var rect = canvas.getBoundingClientRect();
            var point = e.touches && e.touches.length ? e.touches[0] : e;
            return { x: point.clientX - rect.left, y: point.clientY - rect.top };
        }

        function start(e) {
            drawing = true;
            var p = pointerPos(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            e.preventDefault();
        }

        function move(e) {
            if (!drawing) return;
            var p = pointerPos(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            e.preventDefault();
        }

        function end() {
            if (!drawing) return;
            drawing = false;
            var sigWrap = canvas.closest('.signature-wrap');
            if (sigWrap && hasSignature(canvas)) {
                clearFieldError(sigWrap);
                sigWrap.classList.remove('invalid');
            }
        }

        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', move, { passive: false });
        canvas.addEventListener('touchend', end);

        var clearBtn = document.getElementById('clearSignature');
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            });
        }
    }

    // ---------- test-mode submission review (collects the whole form as JSON for show.html) ----------
    function val(id) {
        var el = document.getElementById(id);
        return el ? el.value : null;
    }

    function fileMeta(file) {
        if (!file) return null;
        return { name: file.name, size: file.size, type: file.type };
    }

    function fileToDataURL(file, maxDim, cb) {
        if (!file) { cb(null); return; }
        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
                var scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
                var w = Math.max(1, Math.round(img.naturalWidth * scale));
                var h = Math.max(1, Math.round(img.naturalHeight * scale));
                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                cb(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function countryInfo(rootId) {
        var root = document.getElementById(rootId);
        var valueEl = root && root.querySelector('.country-select-value');
        return {
            code: root ? root.dataset.selectedCode || null : null,
            name: valueEl && valueEl.classList.contains('has-value') ? valueEl.textContent.trim() : null
        };
    }

    function buildSubmissionPayload(cb) {
        var portraitInput = document.querySelector('input[name="portrait_photo"]');
        var frontInput = document.querySelector('input[name="license_front"]');
        var backInput = document.querySelector('input[name="license_back"]');
        var sigCanvas = document.getElementById('signaturePad');

        var licenseClasses = Array.prototype.map.call(
            document.querySelectorAll('input[name="license_class"]:checked'),
            function (el) {
                var card = el.closest('.license-card');
                var nameEl = card && card.querySelector('.license-name');
                return { value: el.value, label: nameEl ? nameEl.textContent.trim() : el.value };
            }
        );

        var selectedPlan = document.querySelector('.plan-select-card.selected');
        var activeTab = document.querySelector('.plan-tab.active');
        var activeTabPrice = activeTab ? activeTab.querySelector('.plan-price') : null;

        var portraitFile = portraitInput && portraitInput.files[0];
        var frontFile = frontInput && frontInput.files[0];
        var backFile = backInput && backInput.files[0];

        var payload = {
            submittedAt: new Date().toISOString(),
            testMode: true,
            applicant: {
                email: val('app-email'),
                phone: { dialCode: '+' + val('app-phone-dial-code'), number: val('app-phone') },
                firstName: val('app-first-name'),
                lastName: val('app-last-name'),
                countryOfBirth: countryInfo('appBirthCountry'),
                residence: countryInfo('appResidenceCountry'),
                birthDate: val('app-dob'),
                gender: val('genderValue')
            },
            licenseClasses: licenseClasses,
            plan: {
                package: selectedPlan ? selectedPlan.dataset.title : null,
                price: selectedPlan ? selectedPlan.dataset.price : null,
                validity: activeTabPrice ? activeTabPrice.textContent.trim() : null
            },
            route: {
                licenseIssuedCountry: countryInfo('appLicenseCountry'),
                destinationCountry: countryInfo('appDestinationCountry')
            },
            verification: {
                licenseNumber: val('app-license-no'),
                portraitPhoto: fileMeta(portraitFile),
                licenseFront: fileMeta(frontFile),
                licenseBack: fileMeta(backFile),
                signature: null
            },
            billing: {
                name: val('billing-name'),
                email: val('billing-email'),
                address: val('billing-address'),
                city: val('billing-city'),
                state: val('billing-state'),
                zip: val('billing-zip'),
                country: countryInfo('appBillingCountry')
            },
            payment: {
                cardName: val('card-name'),
                cardLast4: (val('card-number') || '').replace(/\D/g, '').slice(-4),
                expiry: val('card-expiry')
            },
            summary: {
                package: (document.getElementById('summaryPackage') || {}).textContent || null,
                validity: (document.getElementById('summaryValidity') || {}).textContent || null,
                route: (document.getElementById('summaryRoute') || {}).textContent || null,
                total: (document.getElementById('summaryTotal') || {}).textContent || null
            }
        };

        var pending = 3;
        function taskDone() {
            pending--;
            if (pending === 0) {
                payload.verification.signature = hasSignature(sigCanvas)
                    ? { present: true, thumbnail: sigCanvas.toDataURL('image/png') }
                    : { present: false };
                cb(payload);
            }
        }

        fileToDataURL(portraitFile, 240, function (url) {
            if (payload.verification.portraitPhoto) payload.verification.portraitPhoto.thumbnail = url;
            taskDone();
        });
        fileToDataURL(frontFile, 240, function (url) {
            if (payload.verification.licenseFront) payload.verification.licenseFront.thumbnail = url;
            taskDone();
        });
        fileToDataURL(backFile, 240, function (url) {
            if (payload.verification.licenseBack) payload.verification.licenseBack.thumbnail = url;
            taskDone();
        });
    }

    // ---------- submit ----------
    var form = document.getElementById('applicationForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var panel = form.querySelector('.form-step[data-step-panel="3"]');
            if (!validateStep(panel)) return;

            if (TEST_MODE) {
                buildSubmissionPayload(function (payload) {
                    try {
                        sessionStorage.setItem('idta_last_submission', JSON.stringify(payload));
                    } catch (err) {
                        console.warn('Could not store submission in sessionStorage (data may be too large):', err);
                    }
                    window.location.href = 'show.html';
                });
                return;
            }

            alert('Your application has been submitted! Our team will verify your documents and send your IDP shortly.');
        });
    }

    // ---------- pre-fill license / destination country from URL (redirected from the home page) ----------
    function applyCountryFromCode(rootId, code) {
        var root = document.getElementById(rootId);
        if (!root || !code || !window.COUNTRIES) return;
        var match = window.COUNTRIES.filter(function (c) { return c.code.toLowerCase() === code.toLowerCase(); })[0];
        if (!match) return;
        var valueEl = root.querySelector('.country-select-value');
        var icon = root.querySelector('.form-select-icon');
        var clearBtn = root.querySelector('.country-clear');
        valueEl.textContent = match.name;
        valueEl.classList.add('has-value');
        if (icon && window.flagEmoji) icon.textContent = window.flagEmoji(match.code);
        if (clearBtn) clearBtn.hidden = false;
        root.dataset.selectedCode = match.code;
        document.dispatchEvent(new CustomEvent('country-select-changed', { detail: { rootId: rootId } }));
    }

    var urlParams = new URLSearchParams(window.location.search);
    applyCountryFromCode('appLicenseCountry', urlParams.get('license_country'));
    applyCountryFromCode('appDestinationCountry', urlParams.get('destination_country'));

    // ---------- pre-fill package / duration from URL (redirected from a pricing tab) ----------
    var durationParam = urlParams.get('duration');
    if (durationParam) {
        var tab = document.querySelector('.plan-tab[data-plan="' + durationParam + '"]');
        if (tab) {
            document.querySelectorAll('.plan-tab').forEach(function (b) { b.classList.remove('active'); });
            tab.classList.add('active');
            if (window.applyPlanDuration) window.applyPlanDuration(durationParam);
        }
    }

    var packageParam = urlParams.get('package');
    if (packageParam) {
        var packageInput = document.querySelector('.plan-select-card input[value="' + packageParam + '"]');
        if (packageInput) {
            packageInput.checked = true;
            planCards.forEach(function (c) { c.classList.toggle('selected', c === packageInput.closest('.plan-select-card')); });
        }
    }

    updateSummary();
    goToStep(1, true);
})();
