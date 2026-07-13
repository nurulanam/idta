(function () {
    var container = document.getElementById('reviewContent');
    var empty = document.getElementById('reviewEmpty');
    if (!container) return;

    function escapeHTML(str) {
        return String(str).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function row(label, value) {
        var display = value === null || value === undefined || value === '' ? '—' : escapeHTML(value);
        return '<div class="review-row"><span class="review-label">' + escapeHTML(label) + '</span><span class="review-value">' + display + '</span></div>';
    }

    function section(title, rows) {
        return '<div class="application-card review-card"><h2 class="form-title">' + escapeHTML(title) + '</h2>' +
            '<div class="review-grid mt-22">' + rows.join('') + '</div></div>';
    }

    function thumb(label, meta) {
        if (!meta || !meta.thumbnail) return '';
        var sizeKB = Math.round(meta.size / 1024);
        return '<div class="review-thumb"><img src="' + meta.thumbnail + '" alt="' + escapeHTML(label) + '">' +
            '<span>' + escapeHTML(label) + '<br>' + escapeHTML(meta.name) + ' (' + sizeKB + ' KB)</span></div>';
    }

    function render(data) {
        var html = '';

        html += section('Applicant', [
            row('Email', data.applicant.email),
            row('Phone', (data.applicant.phone.dialCode || '') + ' ' + (data.applicant.phone.number || '')),
            row('First Name', data.applicant.firstName),
            row('Last Name', data.applicant.lastName),
            row('Country of Birth', data.applicant.countryOfBirth.name),
            row('Permanent Residence', data.applicant.residence.name),
            row('Birth Date', data.applicant.birthDate),
            row('Gender', data.applicant.gender)
        ]);

        html += section('License Classes', [
            row('Selected', data.licenseClasses.length
                ? data.licenseClasses.map(function (c) { return c.value + ' — ' + c.label; }).join(', ')
                : null)
        ]);

        html += section('Plan & Route', [
            row('Package', data.plan.package),
            row('Price', data.plan.price),
            row('Validity', data.plan.validity),
            row('License Issued In', data.route.licenseIssuedCountry.name),
            row('Destination', data.route.destinationCountry.name)
        ]);

        html += section('Verification', [
            row('License Number', data.verification.licenseNumber),
            row('Signature Provided', data.verification.signature && data.verification.signature.present ? 'Yes' : 'No')
        ]);

        var thumbs = [
            thumb('Portrait', data.verification.portraitPhoto),
            thumb('License Front', data.verification.licenseFront),
            thumb('License Back', data.verification.licenseBack)
        ];
        if (data.verification.signature && data.verification.signature.present) {
            thumbs.push(thumb('Signature', { thumbnail: data.verification.signature.thumbnail, name: 'signature.png', size: 0 }));
        }
        html += '<div class="application-card review-card"><h2 class="form-title">Uploaded Documents</h2>' +
            '<div class="review-thumbs mt-22">' + thumbs.join('') + '</div></div>';

        html += section('Billing', [
            row('Name', data.billing.name),
            row('Email', data.billing.email),
            row('Address', data.billing.address),
            row('City', data.billing.city),
            row('State / Province', data.billing.state),
            row('Postal Code', data.billing.zip),
            row('Country', data.billing.country.name)
        ]);

        html += section('Payment', [
            row('Name on Card', data.payment.cardName),
            row('Card', '•••• •••• •••• ' + (data.payment.cardLast4 || '----')),
            row('Expiry', data.payment.expiry)
        ]);

        html += section('Order Summary', [
            row('Package', data.summary.package),
            row('Validity', data.summary.validity),
            row('Route', data.summary.route),
            row('Total', data.summary.total)
        ]);

        html += '<div class="application-card review-card"><h2 class="form-title">Raw JSON</h2>' +
            '<pre class="review-json mt-22">' + escapeHTML(JSON.stringify(data, null, 2)) + '</pre></div>';

        container.innerHTML = html;
        container.hidden = false;
    }

    var raw = null;
    try {
        raw = sessionStorage.getItem('idta_last_submission');
    } catch (e) {
        // sessionStorage unavailable (e.g. private browsing restrictions)
    }

    if (!raw) {
        if (empty) empty.hidden = false;
        return;
    }

    try {
        render(JSON.parse(raw));
    } catch (e) {
        console.error('show.js: could not parse stored submission JSON.', e);
        if (empty) empty.hidden = false;
    }
})();
