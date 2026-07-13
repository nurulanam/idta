(function () {
    var MAX_BYTES = 2 * 1024 * 1024;
    var MIN_ZOOM = 1;
    var MAX_ZOOM = 3;
    var MIN_CROP_SIZE = 60;

    var overlay, viewport, imgEl, zoomSlider, zoomWrap, rotateLeftBtn, rotateRightBtn, resetBtn, cancelBtn, applyBtn, titleEl;
    var fineRotationSlider, fineRotationLabel;
    var moveTab, cropTab, cropBoxEl, cropHandleEl;

    var mode = 'move'; // 'move' | 'crop'
    var baseRotation = 0, fineRotation = 0;
    var naturalWidth = 0, naturalHeight = 0;
    var viewportW = 0, viewportH = 0;
    var aspect = 1;
    var currentUrl = null;
    var currentFileName = '';
    var finish = null;
    var activeToken = 0;
    var exporting = false;
    var pointers = {};
    var lastPinchDist = null;
    var dragTarget = null;

    // move-mode state
    var panX = 0, panY = 0, userZoom = 1;

    // crop-mode state (all in viewport-local px, center-relative)
    var cropW = 0, cropH = 0, cropCX = 0, cropCY = 0;

    function buildModal() {
        overlay = document.createElement('div');
        overlay.className = 'image-editor-overlay';
        overlay.hidden = true;
        overlay.innerHTML =
            '<div class="image-editor-modal">' +
            '<h3 class="image-editor-title">Edit Photo</h3>' +
            '<div class="image-editor-mode-tabs">' +
            '<button type="button" class="image-editor-mode-tab active" data-mode="move">Move &amp; Zoom</button>' +
            '<button type="button" class="image-editor-mode-tab" data-mode="crop">Direct Crop</button>' +
            '</div>' +
            '<div class="image-editor-viewport">' +
            '<img class="image-editor-img" draggable="false" alt="">' +
            '<div class="image-editor-cropbox" hidden><span class="image-editor-cropbox-handle"></span></div>' +
            '</div>' +
            '<div class="image-editor-controls">' +
            '<button type="button" class="image-editor-btn" data-action="rotate-left" aria-label="Rotate left">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 4v5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.6 15A8 8 0 1 0 8 6.3L4 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</button>' +
            '<span class="image-editor-zoom-wrap">' +
            '<input type="range" class="image-editor-zoom" min="' + MIN_ZOOM + '" max="' + MAX_ZOOM + '" step="0.01" value="1" aria-label="Zoom">' +
            '</span>' +
            '<button type="button" class="image-editor-btn" data-action="rotate-right" aria-label="Rotate right">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 4v5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.4 15A8 8 0 1 1 16 6.3L20 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</button>' +
            '<button type="button" class="image-editor-btn image-editor-reset" data-action="reset">Reset</button>' +
            '</div>' +
            '<div class="image-editor-fine-row">' +
            '<label class="image-editor-fine-label">Straighten <span class="image-editor-fine-value">0°</span></label>' +
            '<input type="range" class="image-editor-fine-rotation" min="-45" max="45" step="0.5" value="0" aria-label="Fine rotation">' +
            '</div>' +
            '<p class="image-editor-hint">Drag to reposition. Pinch, scroll, or use the slider to zoom.</p>' +
            '<div class="image-editor-actions">' +
            '<button type="button" class="btn-outline" data-action="cancel">Cancel</button>' +
            '<button type="button" class="btn" data-action="apply">Use Photo</button>' +
            '</div>' +
            '</div>';
        document.body.appendChild(overlay);

        titleEl = overlay.querySelector('.image-editor-title');
        moveTab = overlay.querySelector('[data-mode="move"]');
        cropTab = overlay.querySelector('[data-mode="crop"]');
        viewport = overlay.querySelector('.image-editor-viewport');
        imgEl = overlay.querySelector('.image-editor-img');
        cropBoxEl = overlay.querySelector('.image-editor-cropbox');
        cropHandleEl = overlay.querySelector('.image-editor-cropbox-handle');
        zoomWrap = overlay.querySelector('.image-editor-zoom-wrap');
        zoomSlider = overlay.querySelector('.image-editor-zoom');
        rotateLeftBtn = overlay.querySelector('[data-action="rotate-left"]');
        rotateRightBtn = overlay.querySelector('[data-action="rotate-right"]');
        resetBtn = overlay.querySelector('[data-action="reset"]');
        cancelBtn = overlay.querySelector('[data-action="cancel"]');
        applyBtn = overlay.querySelector('[data-action="apply"]');
        fineRotationSlider = overlay.querySelector('.image-editor-fine-rotation');
        fineRotationLabel = overlay.querySelector('.image-editor-fine-value');

        moveTab.addEventListener('click', function () { setMode('move'); });
        cropTab.addEventListener('click', function () { setMode('crop'); });
        rotateLeftBtn.addEventListener('click', function () { rotate90(-90); });
        rotateRightBtn.addEventListener('click', function () { rotate90(90); });
        resetBtn.addEventListener('click', resetTransform);
        cancelBtn.addEventListener('click', function () { close(null); });
        applyBtn.addEventListener('click', exportImage);

        zoomSlider.addEventListener('input', function () {
            userZoom = parseFloat(zoomSlider.value);
            applyTransform();
        });

        fineRotationSlider.addEventListener('input', function () {
            fineRotation = parseFloat(fineRotationSlider.value);
            fineRotationLabel.textContent = Math.round(fineRotation) + '°';
            if (mode === 'crop') clampCropBox();
            applyTransform();
        });

        viewport.addEventListener('wheel', function (e) {
            if (mode !== 'move') return;
            e.preventDefault();
            userZoom = clamp(userZoom * (e.deltaY < 0 ? 1.06 : 0.94), MIN_ZOOM, MAX_ZOOM);
            zoomSlider.value = userZoom;
            applyTransform();
        }, { passive: false });

        viewport.addEventListener('pointerdown', function (e) {
            try { viewport.setPointerCapture(e.pointerId); } catch (err) { /* not an active pointer; ignore */ }
            pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
            if (mode === 'crop') {
                dragTarget = (e.target === cropHandleEl) ? 'handle' : 'box';
            } else {
                dragTarget = 'image';
                viewport.classList.add('dragging');
            }
        });

        viewport.addEventListener('pointermove', function (e) {
            if (!pointers[e.pointerId]) return;
            var ids = Object.keys(pointers);

            if (mode === 'crop') {
                var prev = pointers[e.pointerId];
                var dx = e.clientX - prev.x;
                var dy = e.clientY - prev.y;
                pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
                if (dragTarget === 'handle') {
                    cropW = clamp(cropW + dx, MIN_CROP_SIZE, viewportW);
                    cropH = cropW / aspect;
                } else if (dragTarget === 'box') {
                    cropCX += dx;
                    cropCY += dy;
                }
                clampCropBox();
                positionCropBox();
                return;
            }

            if (ids.length === 1) {
                var p = pointers[e.pointerId];
                panX += e.clientX - p.x;
                panY += e.clientY - p.y;
                pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
                applyTransform();
            } else if (ids.length >= 2) {
                pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
                var p1 = pointers[ids[0]], p2 = pointers[ids[1]];
                var dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                if (lastPinchDist) {
                    userZoom = clamp(userZoom * (dist / lastPinchDist), MIN_ZOOM, MAX_ZOOM);
                    zoomSlider.value = userZoom;
                    applyTransform();
                }
                lastPinchDist = dist;
            }
        });

        function endPointer(e) {
            delete pointers[e.pointerId];
            if (Object.keys(pointers).length < 2) lastPinchDist = null;
            if (Object.keys(pointers).length === 0) {
                viewport.classList.remove('dragging');
                dragTarget = null;
            }
        }
        viewport.addEventListener('pointerup', endPointer);
        viewport.addEventListener('pointercancel', endPointer);
        viewport.addEventListener('pointerleave', endPointer);
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function totalRotation() { return baseRotation + fineRotation; }

    // minimum uniform scale so the rotated image fully covers the viewport (move mode)
    function computeCoverScale() {
        var rad = totalRotation() * Math.PI / 180;
        var cos = Math.abs(Math.cos(rad));
        var sin = Math.abs(Math.sin(rad));
        var sw = (viewportW * cos + viewportH * sin) / naturalWidth;
        var sh = (viewportW * sin + viewportH * cos) / naturalHeight;
        return Math.max(sw, sh);
    }

    // uniform scale so the whole rotated image fits within the viewport (crop mode)
    function computeContainScale() {
        var rad = totalRotation() * Math.PI / 180;
        var cos = Math.abs(Math.cos(rad));
        var sin = Math.abs(Math.sin(rad));
        var boundW = naturalWidth * cos + naturalHeight * sin;
        var boundH = naturalWidth * sin + naturalHeight * cos;
        return Math.min(viewportW / boundW, viewportH / boundH);
    }

    function applyTransform() {
        if (mode === 'crop') {
            var cScale = computeContainScale();
            imgEl.style.width = naturalWidth + 'px';
            imgEl.style.height = naturalHeight + 'px';
            imgEl.style.transform = 'translate(-50%, -50%) rotate(' + totalRotation() + 'deg) scale(' + cScale + ')';
            positionCropBox();
        } else {
            var scale = computeCoverScale() * userZoom;
            imgEl.style.width = naturalWidth + 'px';
            imgEl.style.height = naturalHeight + 'px';
            imgEl.style.transform =
                'translate(-50%, -50%) translate(' + panX + 'px, ' + panY + 'px) rotate(' + totalRotation() + 'deg) scale(' + scale + ')';
        }
    }

    function boundsForCrop() {
        var cScale = computeContainScale();
        var rad = totalRotation() * Math.PI / 180;
        var cos = Math.abs(Math.cos(rad));
        var sin = Math.abs(Math.sin(rad));
        return {
            w: (naturalWidth * cos + naturalHeight * sin) * cScale,
            h: (naturalWidth * sin + naturalHeight * cos) * cScale
        };
    }

    function clampCropBox() {
        var b = boundsForCrop();
        cropW = clamp(cropW, MIN_CROP_SIZE, Math.max(MIN_CROP_SIZE, Math.min(b.w, b.h * aspect)));
        cropH = cropW / aspect;
        var maxCX = Math.max(0, (b.w - cropW) / 2);
        var maxCY = Math.max(0, (b.h - cropH) / 2);
        cropCX = clamp(cropCX, -maxCX, maxCX);
        cropCY = clamp(cropCY, -maxCY, maxCY);
    }

    function positionCropBox() {
        cropBoxEl.style.width = cropW + 'px';
        cropBoxEl.style.height = cropH + 'px';
        cropBoxEl.style.left = (viewportW / 2 + cropCX - cropW / 2) + 'px';
        cropBoxEl.style.top = (viewportH / 2 + cropCY - cropH / 2) + 'px';
    }

    function initCropBoxDefault() {
        var b = boundsForCrop();
        var w = b.w * 0.9;
        var h = w / aspect;
        if (h > b.h * 0.9) {
            h = b.h * 0.9;
            w = h * aspect;
        }
        cropW = w;
        cropH = h;
        cropCX = 0;
        cropCY = 0;
    }

    function setMode(newMode) {
        mode = newMode;
        moveTab.classList.toggle('active', mode === 'move');
        cropTab.classList.toggle('active', mode === 'crop');
        zoomWrap.hidden = mode !== 'move';
        cropBoxEl.hidden = mode !== 'crop';
        if (mode === 'crop') initCropBoxDefault();
        applyTransform();
    }

    function rotate90(delta) {
        baseRotation += delta;
        fineRotation = 0;
        fineRotationSlider.value = 0;
        fineRotationLabel.textContent = '0°';
        if (mode === 'crop') {
            initCropBoxDefault();
        } else {
            panX = 0;
            panY = 0;
            userZoom = 1;
            zoomSlider.value = 1;
        }
        applyTransform();
    }

    function resetTransform() {
        baseRotation = 0;
        fineRotation = 0;
        fineRotationSlider.value = 0;
        fineRotationLabel.textContent = '0°';
        panX = 0;
        panY = 0;
        userZoom = 1;
        zoomSlider.value = 1;
        if (mode === 'crop') initCropBoxDefault();
        applyTransform();
    }

    function measureViewport() {
        var rect = viewport.getBoundingClientRect();
        viewportW = rect.width;
        viewportH = rect.height;
    }

    function outputFilename(name) {
        var base = name.replace(/\.[^./\\]+$/, '');
        return (base || 'photo') + '.jpg';
    }

    function compressToLimit(canvas, cb) {
        var quality = 0.9;
        var attempts = 0;

        function tryExport(targetCanvas) {
            targetCanvas.toBlob(function (blob) {
                attempts++;
                if (!blob || blob.size <= MAX_BYTES || attempts >= 8) {
                    cb(blob);
                    return;
                }
                if (quality > 0.5) {
                    quality -= 0.1;
                    tryExport(targetCanvas);
                } else {
                    var scaled = document.createElement('canvas');
                    scaled.width = Math.max(1, Math.round(targetCanvas.width * 0.8));
                    scaled.height = Math.max(1, Math.round(targetCanvas.height * 0.8));
                    scaled.getContext('2d').drawImage(targetCanvas, 0, 0, scaled.width, scaled.height);
                    quality = 0.7;
                    tryExport(scaled);
                }
            }, 'image/jpeg', quality);
        }
        tryExport(canvas);
    }

    function exportImage() {
        var outW = 900;
        var outH = Math.round(outW / aspect);
        var canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outW, outH);

        ctx.translate(outW / 2, outH / 2);

        if (mode === 'crop') {
            var ratio = outW / cropW;
            var cScale = computeContainScale();
            ctx.translate(-cropCX * ratio, -cropCY * ratio);
            ctx.rotate(totalRotation() * Math.PI / 180);
            ctx.scale(cScale * ratio, cScale * ratio);
        } else {
            var ratio2 = outW / viewportW;
            var scale = computeCoverScale() * userZoom;
            ctx.translate(panX * ratio2, panY * ratio2);
            ctx.rotate(totalRotation() * Math.PI / 180);
            ctx.scale(scale * ratio2, scale * ratio2);
        }

        ctx.drawImage(imgEl, -naturalWidth / 2, -naturalHeight / 2);

        // snapshot synchronously so a later session (which reassigns the shared
        // `finish`/exporting state) can never hijack or delay this resolution
        var myFinish = finish;
        var fileName = outputFilename(currentFileName);
        exporting = true;
        compressToLimit(canvas, function (blob) {
            exporting = false;
            var file = blob ? new File([blob], fileName, { type: 'image/jpeg' }) : null;
            overlay.hidden = true;
            if (currentUrl) { URL.revokeObjectURL(currentUrl); currentUrl = null; }
            if (myFinish) myFinish(file);
        });
    }

    function close(result) {
        overlay.hidden = true;
        if (currentUrl) { URL.revokeObjectURL(currentUrl); currentUrl = null; }
        var cb = finish;
        finish = null;
        if (cb) cb(result);
    }

    window.openImageEditor = function (file, options, callback) {
        if (!overlay) buildModal();
        if (exporting) {
            // a previous session's export is still resolving; refuse to start a new one
            // rather than risk cross-talk on the shared editor state (never happens via
            // real interaction, since the modal blocks everything else while open)
            console.warn('openImageEditor: a previous export is still in progress — ignoring this call.');
            callback(null);
            return;
        }
        options = options || {};
        aspect = options.aspect || 1;
        titleEl.textContent = options.title || 'Edit Photo';
        currentFileName = file.name || 'photo.jpg';

        // guards against a stale/superseded session's async export (e.g. compression)
        // resolving after a newer session has already taken over the shared editor state
        activeToken++;
        var myToken = activeToken;
        finish = function (result) {
            if (myToken !== activeToken) return;
            callback(result);
        };

        mode = 'move';
        moveTab.classList.add('active');
        cropTab.classList.remove('active');
        zoomWrap.hidden = false;
        cropBoxEl.hidden = true;

        baseRotation = 0;
        fineRotation = 0;
        panX = 0;
        panY = 0;
        userZoom = 1;
        zoomSlider.value = 1;
        fineRotationSlider.value = 0;
        fineRotationLabel.textContent = '0°';

        viewport.style.aspectRatio = String(aspect);
        overlay.hidden = false;

        currentUrl = URL.createObjectURL(file);
        imgEl.onload = function () {
            naturalWidth = imgEl.naturalWidth;
            naturalHeight = imgEl.naturalHeight;
            measureViewport();
            applyTransform();
        };
        imgEl.src = currentUrl;
    };
})();
