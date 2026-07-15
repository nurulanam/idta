(function () {
    var steps = document.querySelectorAll('.form-step');
    var stepItems = document.querySelectorAll('.step-item');
    var connectors = document.querySelectorAll('.step-connector');
    var applicationSection = document.querySelector('.application-section');

    if (!steps.length) return;

    // ---------- test mode (driven by .env via assets/js/env.js) ----------
    var TEST_MODE = !!(window.ENV && window.ENV.TEST_MODE);

    var testModeBanner = document.getElementById('testModeBanner');
    if (TEST_MODE && testModeBanner) testModeBanner.hidden = false;

    // WooCommerce product IDs behind each validity-year tab / package combo —
    // kept in sync with assets/js/pricing-live.js's PRODUCT_IDS
    var PLAN_PRODUCT_IDS = {
        0: { printed: 15, digital: 14 },
        1: { printed: 17, digital: 16 },
        2: { printed: 19, digital: 18 }
    };

    // ---------- phone number validation (per selected country) ----------
    // national significant number digit-count ranges, excluding the dial code
    var PHONE_RULES = {
        US: { min: 10, max: 10 }, CA: { min: 10, max: 10 }, GB: { min: 9, max: 10 },
        AU: { min: 9, max: 9 }, FR: { min: 9, max: 9 }, DE: { min: 10, max: 11 },
        IN: { min: 10, max: 10 }, CN: { min: 11, max: 11 }, JP: { min: 9, max: 10 },
        BR: { min: 10, max: 11 }, MX: { min: 10, max: 10 }, ES: { min: 9, max: 9 },
        IT: { min: 9, max: 10 }, NL: { min: 9, max: 9 }, RU: { min: 10, max: 10 },
        ZA: { min: 9, max: 9 }, NG: { min: 10, max: 10 }, PK: { min: 10, max: 10 },
        BD: { min: 10, max: 10 }, PH: { min: 10, max: 10 }, SG: { min: 8, max: 8 },
        AE: { min: 9, max: 9 }, SA: { min: 9, max: 9 }, EG: { min: 10, max: 10 },
        KR: { min: 9, max: 10 }, ID: { min: 9, max: 12 }, MY: { min: 9, max: 10 },
        TH: { min: 9, max: 9 }, VN: { min: 9, max: 10 }, TR: { min: 10, max: 10 },
        PL: { min: 9, max: 9 }, SE: { min: 7, max: 9 }, NO: { min: 8, max: 8 },
        DK: { min: 8, max: 8 }, FI: { min: 9, max: 10 }, CH: { min: 9, max: 9 },
        AT: { min: 10, max: 11 }, BE: { min: 9, max: 9 }, IE: { min: 9, max: 9 },
        PT: { min: 9, max: 9 }, GR: { min: 10, max: 10 }, NZ: { min: 8, max: 9 }
    };
    var PHONE_RULE_DEFAULT = { min: 6, max: 14 };

    function selectedPhoneISO() {
        var root = document.querySelector('[data-phone-code-select]');
        return root ? root.dataset.selectedCode : null;
    }

    function isValidPhoneNumber(value, iso2) {
        var digits = value.replace(/\D/g, '');
        var rule = (iso2 && PHONE_RULES[iso2]) || PHONE_RULE_DEFAULT;
        return digits.length >= rule.min && digits.length <= rule.max;
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
            if (!input.checkValidity()) {
                var msg = 'This field is required.';
                if (input.validity.typeMismatch) msg = 'Please enter a valid email address.';
                fail(input, anchor, msg);
            } else if (input.type === 'tel' && !isValidPhoneNumber(input.value, selectedPhoneISO())) {
                fail(input, anchor, 'Please enter a valid phone number for the selected country.');
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
    var phoneCheckIcon = document.getElementById('phoneCheckIcon');
    function updatePhoneCheckmark(input) {
        if (phoneCheckIcon) phoneCheckIcon.hidden = !(input.value && isValidPhoneNumber(input.value, selectedPhoneISO()));
    }

    document.querySelectorAll('input[required]:not([type=file]):not([type=checkbox]), textarea[required]').forEach(function (input) {
        var anchor = input.closest('.phone-field') || input;
        input.addEventListener('input', function () {
            var telInvalid = input.type === 'tel' && !isValidPhoneNumber(input.value, selectedPhoneISO());
            if (input.type === 'tel') updatePhoneCheckmark(input);
            if (input.checkValidity() && !telInvalid) {
                clearFieldError(anchor);
                input.classList.remove('invalid');
            }
        });
        if (input.type === 'tel') updatePhoneCheckmark(input); // reflect any pre-filled value on load
    });

    // flag an invalid phone number as soon as the user leaves the field,
    // instead of only on next-step / country-change
    var phoneInputEl = document.getElementById('app-phone');
    if (phoneInputEl) {
        phoneInputEl.addEventListener('blur', function () {
            if (!phoneInputEl.value) return;
            var anchor = phoneInputEl.closest('.phone-field') || phoneInputEl;
            if (isValidPhoneNumber(phoneInputEl.value, selectedPhoneISO())) {
                clearFieldError(anchor);
                phoneInputEl.classList.remove('invalid');
            } else {
                showFieldError(anchor, 'Please enter a valid phone number for the selected country.');
                phoneInputEl.classList.add('invalid');
            }
        });
    }

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

    // re-validate the phone number + refresh its checkmark whenever the
    // calling-code country changes (its digit-length rule depends on it)
    document.addEventListener('phone-country-changed', function () {
        var phoneInput = document.getElementById('app-phone');
        if (!phoneInput) return;
        updatePhoneCheckmark(phoneInput);
        if (!phoneInput.value) return; // stay neutral on an empty field
        var anchor = phoneInput.closest('.phone-field') || phoneInput;
        if (isValidPhoneNumber(phoneInput.value, selectedPhoneISO())) {
            clearFieldError(anchor);
            phoneInput.classList.remove('invalid');
        } else {
            showFieldError(anchor, 'Please enter a valid phone number for the selected country.');
            phoneInput.classList.add('invalid');
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

    function selectedPackage() {
        var selected = document.querySelector('.plan-select-card.selected input');
        return selected ? selected.value : null;
    }

    function updateSummary() {
        var selected = document.querySelector('.plan-select-card.selected');
        var summaryPackage = document.getElementById('summaryPackage');
        var summaryTotal = document.getElementById('summaryTotal');

        if (selected && summaryPackage && summaryTotal) {
            summaryPackage.textContent = selected.dataset.title;
            if (window.Cart) {
                var planPrice = Cart.parsePrice(selected.dataset.price);
                var symbol = Cart.currencySymbol(selected.dataset.price);
                summaryTotal.textContent = Cart.formatCurrency(planPrice + Cart.getTotal(), symbol);
            } else {
                summaryTotal.textContent = selected.dataset.price;
            }
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

    document.addEventListener('cart:updated', updateSummary);

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

    function canvasToBlob(canvas, cb) {
        if (canvas.toBlob) { canvas.toBlob(cb, 'image/png'); return; }
        cb(null); // very old browsers without toBlob support simply skip the signature upload
    }

    // uploads the verification documents + signature to R2 (via the "idta-upload"
    // Worker) so show.html can display them straight from the bucket instead of
    // carrying base64 thumbnails around in sessionStorage
    function uploadToR2(payload, files, cb) {
        var workerUrl = window.ENV.R2_WORKER_URL.replace(/\/$/, '');

        canvasToBlob(files.sigCanvas, function (sigBlob) {
            var form = new FormData();
            if (files.portraitFile) form.append('portrait', files.portraitFile);
            if (files.frontFile) form.append('license_front', files.frontFile);
            if (files.backFile) form.append('license_back', files.backFile);
            if (sigBlob) form.append('signature', sigBlob, 'signature.png');
            form.append('data', JSON.stringify(payload));

            fetch(workerUrl + '/upload', { method: 'POST', body: form })
                .then(function (res) {
                    if (!res.ok) throw new Error('Upload failed with status ' + res.status);
                    return res.json();
                })
                .then(function (result) {
                    payload.submissionId = result.submissionId;
                    var f = result.files || {};
                    if (payload.verification.portraitPhoto && f.portrait) payload.verification.portraitPhoto.url = workerUrl + f.portrait;
                    if (payload.verification.licenseFront && f.license_front) payload.verification.licenseFront.url = workerUrl + f.license_front;
                    if (payload.verification.licenseBack && f.license_back) payload.verification.licenseBack.url = workerUrl + f.license_back;
                    payload.verification.signature = f.signature
                        ? { present: true, url: workerUrl + f.signature }
                        : { present: false };
                    if (f.portrait) payload.meta.passport_photo = workerUrl + f.portrait;
                    if (f.license_front) payload.meta.license_front = workerUrl + f.license_front;
                    if (f.license_back) payload.meta.license_back = workerUrl + f.license_back;
                    if (f.signature) payload.meta.signature = workerUrl + f.signature;
                    cb(payload);
                })
                .catch(function (err) {
                    console.warn('uploadToR2: falling back to local previews —', err);
                    buildLocalPreviews(payload, files, cb);
                });
        });
    }

    // fallback used when R2_WORKER_URL isn't configured, or the upload fails
    function buildLocalPreviews(payload, files, cb) {
        var pending = 3;
        function taskDone() {
            pending--;
            if (pending === 0) {
                payload.verification.signature = hasSignature(files.sigCanvas)
                    ? { present: true, thumbnail: files.sigCanvas.toDataURL('image/png') }
                    : { present: false };
                cb(payload);
            }
        }

        fileToDataURL(files.portraitFile, 240, function (url) {
            if (payload.verification.portraitPhoto) payload.verification.portraitPhoto.thumbnail = url;
            taskDone();
        });
        fileToDataURL(files.frontFile, 240, function (url) {
            if (payload.verification.licenseFront) payload.verification.licenseFront.thumbnail = url;
            taskDone();
        });
        fileToDataURL(files.backFile, 240, function (url) {
            if (payload.verification.licenseBack) payload.verification.licenseBack.thumbnail = url;
            taskDone();
        });
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
        var activeTabIndex = activeTab ? Number(activeTab.dataset.plan) : 0;
        var packageValue = selectedPackage();
        var isPrinted = packageValue === 'printed';

        var portraitFile = portraitInput && portraitInput.files[0];
        var frontFile = frontInput && frontInput.files[0];
        var backFile = backInput && backInput.files[0];

        var planProductIds = PLAN_PRODUCT_IDS[activeTabIndex] || PLAN_PRODUCT_IDS[0];

        var payload = {
            submittedAt: new Date().toISOString(),
            testMode: true,
            applicant: {
                email: val('app-email'),
                phone: { dialCode: '+' + val('app-phone-dial-code'), number: val('app-phone') },
                firstName: val('app-first-name'),
                middleName: val('app-middle-name'),
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
                validity: activeTabPrice ? activeTabPrice.textContent.trim() : null,
                validityYears: activeTabIndex + 1,
                format: isPrinted ? 'print_digital' : 'digital_only',
                productId: isPrinted ? planProductIds.printed : planProductIds.digital
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
                address2: val('billing-address-2'),
                city: val('billing-city'),
                state: val('billing-state'),
                zip: val('billing-zip'),
                country: countryInfo('appBillingCountry')
            },
            meta: {
                first_name: val('app-first-name'),
                middle_name: val('app-middle-name'),
                last_name: val('app-last-name'),
                date_of_birth: val('app-dob'),
                gender: val('genderValue'),
                country_of_birth: countryInfo('appBirthCountry').name,
                country_of_residence: countryInfo('appResidenceCountry').name,
                driver_license_number: val('app-license-no'),
                country_of_issuance: countryInfo('appLicenseCountry').name,
                license_category: licenseClasses.map(function (c) { return c.value; }).join(', '),
                validity_years: activeTabIndex + 1,
                format: isPrinted ? 'print_digital' : 'digital_only',
                passport_photo: null,
                license_front: null,
                license_back: null,
                signature: null
            },
            summary: {
                package: (document.getElementById('summaryPackage') || {}).textContent || null,
                validity: (document.getElementById('summaryValidity') || {}).textContent || null,
                route: (document.getElementById('summaryRoute') || {}).textContent || null,
                total: (document.getElementById('summaryTotal') || {}).textContent || null,
                cartItems: window.Cart ? Cart.getItems() : []
            }
        };

        var files = { portraitFile: portraitFile, frontFile: frontFile, backFile: backFile, sigCanvas: sigCanvas };

        if (window.ENV && window.ENV.R2_WORKER_URL) {
            uploadToR2(payload, files, cb);
        } else {
            buildLocalPreviews(payload, files, cb);
        }
    }

    // builds the /create-order request body from the submission payload and
    // posts it to the Worker, which creates a real (pending, unpaid) WooCommerce
    // order and hands back the order-pay URL where the customer actually pays
    function createOrderAndRedirect(payload, submitBtn) {
        var workerUrl = window.ENV.R2_WORKER_URL.replace(/\/$/, '');
        var billingName = (payload.billing.name || '').trim();
        var spaceIdx = billingName.indexOf(' ');
        var billingFirstName = spaceIdx === -1 ? billingName : billingName.slice(0, spaceIdx);
        var billingLastName = spaceIdx === -1 ? '' : billingName.slice(spaceIdx + 1);

        var orderRequest = {
            billing: {
                firstName: billingFirstName,
                lastName: billingLastName,
                email: payload.billing.email,
                phone: payload.applicant.phone.dialCode + payload.applicant.phone.number,
                address1: payload.billing.address,
                address2: payload.billing.address2,
                city: payload.billing.city,
                state: payload.billing.state,
                postcode: payload.billing.zip,
                country: payload.billing.country.code
            },
            planItem: { productId: payload.plan.productId, quantity: 1 },
            cartItems: payload.summary.cartItems,
            meta: payload.meta
        };

        fetch(workerUrl + '/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderRequest)
        })
            .then(function (res) {
                if (!res.ok) throw new Error('Order creation failed with status ' + res.status);
                return res.json();
            })
            .then(function (result) {
                if (!result.payUrl) throw new Error('Worker response did not include a payUrl');
                if (window.Cart) Cart.clear();
                window.location.href = result.payUrl;
            })
            .catch(function (err) {
                console.error('application.js: failed to create order —', err);
                alert('Sorry, we could not start checkout right now. Please try again in a moment.');
                if (submitBtn) submitBtn.disabled = false;
            });
    }

    // ---------- submit ----------
    var form = document.getElementById('applicationForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var panel = form.querySelector('.form-step[data-step-panel="3"]');
            if (!validateStep(panel)) return;

            var submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;

            if (TEST_MODE) {
                buildSubmissionPayload(function (payload) {
                    try {
                        sessionStorage.setItem('idta_last_submission', JSON.stringify(payload));
                    } catch (err) {
                        console.warn('Could not store submission in sessionStorage (data may be too large):', err);
                    }
                    if (window.Cart) Cart.clear();
                    window.location.href = 'show.html';
                });
                return;
            }

            if (!window.ENV || !window.ENV.R2_WORKER_URL) {
                alert('Checkout is not configured yet. Please try again later.');
                if (submitBtn) submitBtn.disabled = false;
                return;
            }

            buildSubmissionPayload(function (payload) {
                createOrderAndRedirect(payload, submitBtn);
            });
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
    } else {
        // no URL override — sync prices to whichever tab is active by default
        var defaultTab = document.querySelector('.plan-tab.active');
        if (defaultTab && window.applyPlanDuration) window.applyPlanDuration(defaultTab.dataset.plan);
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
