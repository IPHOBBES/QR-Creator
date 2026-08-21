(function () {
  'use strict';

  const urlInput = document.getElementById('url-input');
  const urlError = document.getElementById('url-error');
  const styleInputs = document.querySelectorAll('input[name="qr-style"]');
  const cornerInputs = document.querySelectorAll('input[name="qr-corners"]');
  const qrColorInput = document.getElementById('qr-color');
  const qrBgColorInput = document.getElementById('qr-bg-color');
  const qrColorHex = document.getElementById('qr-color-hex');
  const qrBgColorHex = document.getElementById('qr-bg-color-hex');
  const logoInput = document.getElementById('logo-input');
  const logoChooseBtn = document.getElementById('logo-choose-btn');
  const logoFilename = document.getElementById('logo-filename');
  const logoEditBtn = document.getElementById('logo-edit-btn');
  const logoThumbnailImage = document.getElementById('logo-thumbnail-image');
  const logoShapeFieldset = document.querySelector('.logo-shape-row');
  const logoShapeInputs = document.querySelectorAll('input[name="logo-shape"]');
  const logoSizeFieldset = document.querySelector('.logo-size-row');
  const logoSizeInputs = document.querySelectorAll('input[name="logo-size"]');
  const logoEditor = document.getElementById('logo-editor');
  const logoCropStage = document.getElementById('logo-crop-stage');
  const logoCropImage = document.getElementById('logo-crop-image');
  const logoZoomInput = document.getElementById('logo-zoom');
  const logoEditorClose = document.getElementById('logo-editor-close');
  const logoEditorCancel = document.getElementById('logo-editor-cancel');
  const logoEditorApply = document.getElementById('logo-editor-apply');
  const captionInput = document.getElementById('caption-input');
  const btnGenerate = document.getElementById('btn-generate');
  const qrContainer = document.getElementById('qr-container');
  const qrCaptionEl = document.getElementById('qr-caption');
  const btnDownload = document.getElementById('btn-download');
  const btnDownloadJpeg = document.getElementById('btn-download-jpeg');
  const btnDownloadSvg = document.getElementById('btn-download-svg');
  const btnCopyPng = document.getElementById('btn-copy-png');

  let qrCode = null;
  let logoDataUrl = null;
  let logoSourceDataUrl = null;
  let logoSourceImage = null;
  let logoCrop = { x: 0, y: 0, zoom: 1 };
  let logoCropDraft = { x: 0, y: 0, zoom: 1 };

  function slugify(text) {
    var s = (text || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return s.slice(0, 40) || 'qr-code';
  }

  function suggestFilename(ext) {
    var caption = (captionInput.value || '').trim();
    var url = (urlInput.value || '').trim();
    var base = slugify(caption || url);
    var now = new Date();
    var dd = String(now.getDate()).padStart(2, '0');
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var yyyy = now.getFullYear();
    var stamp = dd + '-' + mm + '-' + yyyy;
    return base + '-QR-' + stamp + '.' + ext;
  }

  function saveBlob(blob, filename, mimeType) {
    if (window.showSaveFilePicker) {
      var types = [];
      if (mimeType === 'image/png') {
        types = [{ description: 'PNG image', accept: { 'image/png': ['.png'] } }];
      } else if (mimeType === 'image/jpeg') {
        types = [{ description: 'JPEG image', accept: { 'image/jpeg': ['.jpg', '.jpeg'] } }];
      } else if (mimeType === 'image/svg+xml') {
        types = [{ description: 'SVG image', accept: { 'image/svg+xml': ['.svg'] } }];
      }
      return window.showSaveFilePicker({
        suggestedName: filename,
        types: types
      }).then(function (handle) {
        return handle.createWritable().then(function (writable) {
          return writable.write(blob).then(function () {
            return writable.close();
          });
        });
      }).catch(function (err) {
        if (err && err.name === 'AbortError') return;
        // Fallback if picker fails for any other reason
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    return Promise.resolve();
  }

  function showError(el, message) {
    el.textContent = message;
    el.hidden = false;
  }

  function clearError(el) {
    el.textContent = '';
    el.hidden = true;
  }

  function getSelectedStyle() {
    const checked = document.querySelector('input[name="qr-style"]:checked');
    return checked ? checked.value : 'dots';
  }

  function getSelectedCorners() {
    const checked = document.querySelector('input[name="qr-corners"]:checked');
    return checked ? checked.value : 'hybrid';
  }

  function getDotsType(style) {
    const map = {
      dots: 'dots',      // circular dots
      square: 'square',  // square pixels
      classy: 'classy'   // horizontal lines + dots hybrid look
    };
    return map[style] || 'dots';
  }

  function getCornerTypes(cornerStyle) {
    const map = {
      round: { square: 'dot', dot: 'dot' },
      square: { square: 'square', dot: 'square' },
      hybrid: { square: 'extra-rounded', dot: 'dot' }
    };
    return map[cornerStyle] || map.hybrid;
  }

  function getQrColors() {
    return {
      fg: qrColorInput.value || '#000000',
      bg: qrBgColorInput.value || '#ffffff'
    };
  }

  function buildOptions(data, dotsType, image, colors) {
    colors = colors || getQrColors();
    var corners = getCornerTypes(getSelectedCorners());
    const options = {
      width: 280,
      height: 280,
      type: 'svg',
      data: data,
      margin: 8,
      qrOptions: {
        // Logos obscure modules, so reserve maximum recovery for logo-based codes.
        errorCorrectionLevel: image ? 'H' : 'Q'
      },
      dotsOptions: {
        color: colors.fg,
        type: dotsType,
        // Prevent dense codes from shrinking to an integer module size and
        // gaining a much larger quiet zone than simple codes.
        roundSize: false
      },
      cornersSquareOptions: {
        color: colors.fg,
        type: corners.square
      },
      cornersDotOptions: {
        color: colors.fg,
        type: corners.dot
      },
      backgroundOptions: {
        color: colors.bg
      }
    };
    if (image) {
      options.imageOptions = {
        hideBackgroundDots: true,
        // Keep the logo compact so phone cameras retain plenty of readable modules.
        imageSize: getLogoSize() / 100,
        margin: 5
      };
      options.image = image;
    }
    return options;
  }

  function updateCaption(text) {
    qrCaptionEl.textContent = (text && text.trim()) ? text.trim() : '';
  }

  function clearPreview() {
    if (!qrCode) return;
    qrCode = null;
    var qrInner = qrContainer.querySelector('.qr-inner');
    if (qrInner) {
      qrInner.innerHTML = '<p class="qr-placeholder">Enter a link and click Generate</p>';
    } else {
      qrContainer.innerHTML = '<div class="qr-inner"><p class="qr-placeholder">Enter a link and click Generate</p></div>';
    }
    var frame = qrContainer.closest('.qr-frame');
    if (frame) {
      frame.classList.remove('has-qr');
      frame.style.removeProperty('--qr-frame-bg');
      frame.style.removeProperty('--qr-frame-fg');
    }
    updateCaption('');
    btnDownload.disabled = true;
    btnDownloadJpeg.disabled = true;
    btnDownloadSvg.disabled = true;
    btnCopyPng.disabled = true;
  }

  function generate() {
    clearError(urlError);
    const data = (urlInput.value || '').trim();
    if (!data) {
      showError(urlError, 'Enter a URL or text');
      return;
    }

    const dotsType = getDotsType(getSelectedStyle());
    const colors = getQrColors();
    const options = buildOptions(data, dotsType, logoDataUrl || undefined, colors);

    if (typeof QRCodeStyling === 'undefined') {
      showError(urlError, 'QR library not loaded. Refresh the page.');
      return;
    }

    qrCode = new QRCodeStyling(options);

    var qrInner = qrContainer.querySelector('.qr-inner');
    if (qrInner) {
      qrInner.innerHTML = '';
      qrCode.append(qrInner);
    } else {
      qrContainer.innerHTML = '';
      qrCode.append(qrContainer);
    }

    var style = getSelectedStyle();
    if (style === 'square' || style === 'classy') {
      qrContainer.dataset.qrStyle = style;
      qrContainer.style.setProperty('--qr-dot-border', colors.bg);
    } else {
      delete qrContainer.dataset.qrStyle;
      qrContainer.style.removeProperty('--qr-dot-border');
    }

    var frame = qrContainer.closest('.qr-frame');
    if (frame) {
      frame.classList.add('has-qr');
      frame.style.setProperty('--qr-frame-bg', colors.bg);
      frame.style.setProperty('--qr-frame-fg', colors.fg);
    }

    updateCaption(captionInput.value);
    btnDownload.disabled = false;
    btnDownloadJpeg.disabled = false;
    btnDownloadSvg.disabled = false;
    btnCopyPng.disabled = false;
  }

  var DOWNLOAD_QR_SIZE = 512;
  var EXPORT_PADDING = 2;   /* margin around QR and caption in final image */
  var CAPTION_HEIGHT = 24;   /* minimal strip; QR stays square above it */
  var CAPTION_FONT_SIZE = 10; /* preview (CSS); export uses larger for sharpness */
  var CAPTION_FONT_SIZE_EXPORT = 16; /* larger so text is sharp in PNG/JPEG/copy */
  var QR_CORNER_RADIUS = 12; /* rounded corners on QR in export (canvas pixels) */

  function download() {
    if (!qrCode) return;
    var captionText = (captionInput.value || '').trim();
    var hasCaption = captionText.length > 0;
    var colors = getQrColors();

    var svgEl = qrContainer.querySelector('svg');
    if (!svgEl) return;

    var svgClone = svgEl.cloneNode(true);
    var svgString = new XMLSerializer().serializeToString(svgClone);
    var blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    var svgUrl = URL.createObjectURL(blob);

    var img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(svgUrl);
      var outCanvas = document.createElement('canvas');
      outCanvas.width = DOWNLOAD_QR_SIZE;
      outCanvas.height = DOWNLOAD_QR_SIZE;
      var ctx = outCanvas.getContext('2d');

      var pad = EXPORT_PADDING;
      var qrSize = hasCaption
        ? DOWNLOAD_QR_SIZE - pad - CAPTION_HEIGHT - pad
        : DOWNLOAD_QR_SIZE - pad * 2;
      var qrX = (DOWNLOAD_QR_SIZE - qrSize) / 2;
      var qrY = pad;

      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, DOWNLOAD_QR_SIZE, DOWNLOAD_QR_SIZE);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(qrX, qrY, qrSize, qrSize, QR_CORNER_RADIUS);
      ctx.clip();
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      ctx.restore();

      if (hasCaption) {
        ctx.fillStyle = colors.fg;
        ctx.font = '400 ' + CAPTION_FONT_SIZE_EXPORT + 'px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var textY = qrY + qrSize + CAPTION_HEIGHT / 2;
        ctx.fillText(captionText, Math.round(DOWNLOAD_QR_SIZE / 2), Math.round(textY));
      }

      outCanvas.toBlob(function (blob) {
        if (!blob) return;
        saveBlob(blob, suggestFilename('png'), 'image/png');
      }, 'image/png');
    };
    img.onerror = function () {
      URL.revokeObjectURL(svgUrl);
      // Fallback: try canvas path with visible container
      var opts = buildOptions((urlInput.value || '').trim(), getDotsType(getSelectedStyle()), logoDataUrl || undefined, colors);
      opts.width = DOWNLOAD_QR_SIZE;
      opts.height = DOWNLOAD_QR_SIZE;
      opts.type = 'canvas';
      var fallbackQr = new QRCodeStyling(opts);
      var wrap = document.createElement('div');
      wrap.style.cssText = 'position:fixed;top:0;left:0;width:' + DOWNLOAD_QR_SIZE + 'px;height:' + DOWNLOAD_QR_SIZE + 'px;visibility:hidden;';
      document.body.appendChild(wrap);
      fallbackQr.append(wrap);
      setTimeout(function () {
        var c = wrap.querySelector('canvas');
        if (c && c.width > 0) {
          var pad = EXPORT_PADDING;
          var qrSize = hasCaption
            ? DOWNLOAD_QR_SIZE - pad - CAPTION_HEIGHT - pad
            : DOWNLOAD_QR_SIZE - pad * 2;
          var qrX = (DOWNLOAD_QR_SIZE - qrSize) / 2;
          var qrY = pad;
          var out = document.createElement('canvas');
          out.width = DOWNLOAD_QR_SIZE;
          out.height = DOWNLOAD_QR_SIZE;
          var ctx = out.getContext('2d');
          ctx.fillStyle = colors.bg;
          ctx.fillRect(0, 0, out.width, out.height);
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(qrX, qrY, qrSize, qrSize, QR_CORNER_RADIUS);
          ctx.clip();
          ctx.drawImage(c, qrX, qrY, qrSize, qrSize);
          ctx.restore();
          if (hasCaption) {
            ctx.fillStyle = colors.fg;
            ctx.font = '400 ' + CAPTION_FONT_SIZE_EXPORT + 'px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            var ty = qrY + qrSize + CAPTION_HEIGHT / 2;
            ctx.fillText(captionText, Math.round(DOWNLOAD_QR_SIZE / 2), Math.round(ty));
          }
          out.toBlob(function (b) {
            if (b) {
              saveBlob(b, suggestFilename('png'), 'image/png');
            }
            document.body.removeChild(wrap);
          }, 'image/png');
        } else {
          document.body.removeChild(wrap);
        }
      }, 300);
    };
    img.src = svgUrl;
  }

  function buildDownloadCanvas(callback) {
    if (!qrCode) return;
    var captionText = (captionInput.value || '').trim();
    var hasCaption = captionText.length > 0;
    var colors = getQrColors();
    var svgEl = qrContainer.querySelector('svg');
    if (!svgEl) return;
    var svgClone = svgEl.cloneNode(true);
    var svgString = new XMLSerializer().serializeToString(svgClone);
    var blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    var svgUrl = URL.createObjectURL(blob);
    var img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(svgUrl);
      var pad = EXPORT_PADDING;
      var qrSize = hasCaption
        ? DOWNLOAD_QR_SIZE - pad - CAPTION_HEIGHT - pad
        : DOWNLOAD_QR_SIZE - pad * 2;
      var qrX = (DOWNLOAD_QR_SIZE - qrSize) / 2;
      var qrY = pad;
      var out = document.createElement('canvas');
      out.width = DOWNLOAD_QR_SIZE;
      out.height = DOWNLOAD_QR_SIZE;
      var ctx = out.getContext('2d');
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, DOWNLOAD_QR_SIZE, DOWNLOAD_QR_SIZE);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(qrX, qrY, qrSize, qrSize, QR_CORNER_RADIUS);
      ctx.clip();
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      ctx.restore();
      if (hasCaption) {
        ctx.fillStyle = colors.fg;
        ctx.font = '400 ' + CAPTION_FONT_SIZE_EXPORT + 'px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var textY = qrY + qrSize + CAPTION_HEIGHT / 2;
        ctx.fillText(captionText, Math.round(DOWNLOAD_QR_SIZE / 2), Math.round(textY));
      }
      callback(out);
    };
    img.onerror = function () { URL.revokeObjectURL(svgUrl); };
    img.src = svgUrl;
  }

  function downloadJpeg() {
    buildDownloadCanvas(function (out) {
      out.toBlob(function (blob) {
        if (!blob) return;
        saveBlob(blob, suggestFilename('jpg'), 'image/jpeg');
      }, 'image/jpeg', 0.92);
    });
  }

  function copyPng() {
    buildDownloadCanvas(function (out) {
      out.toBlob(function (blob) {
        if (!blob) return;
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          .then(function () {
            var t = btnCopyPng.textContent;
            btnCopyPng.textContent = 'Copied';
            setTimeout(function () { btnCopyPng.textContent = t; }, 2000);
          })
          .catch(function () {
            btnCopyPng.textContent = 'Failed';
            setTimeout(function () { btnCopyPng.textContent = 'Copy PNG'; }, 2000);
          });
      }, 'image/png');
    });
  }

  function downloadSvg() {
    if (!qrCode) return;
    var svgEl = qrContainer.querySelector('svg');
    if (!svgEl) return;
    var svgString = new XMLSerializer().serializeToString(svgEl.cloneNode(true));
    var blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    saveBlob(blob, suggestFilename('svg'), 'image/svg+xml');
  }

  function onLogoChange() {
    const file = logoInput.files && logoInput.files[0];
    if (logoFilename) logoFilename.textContent = file ? file.name : 'No image selected';
    logoDataUrl = null;
    logoSourceDataUrl = null;
    logoSourceImage = null;
    if (!file || !file.type.startsWith('image/')) {
      setLogoControlsEnabled(false);
      if (qrCode && urlInput.value.trim()) generate();
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      logoSourceDataUrl = e.target.result;
      var image = new Image();
      image.onload = function () {
        logoSourceImage = image;
        logoCrop = { x: 0, y: 0, zoom: 1 };
        setLogoControlsEnabled(true);
        updateProcessedLogo();
      };
      image.src = logoSourceDataUrl;
    };
    reader.readAsDataURL(file);
  }

  function getLogoShape() {
    var checked = document.querySelector('input[name="logo-shape"]:checked');
    return checked ? checked.value : 'original';
  }

  function getLogoSize() {
    var checked = document.querySelector('input[name="logo-size"]:checked');
    return checked ? Number(checked.value) : 20;
  }

  function setLogoControlsEnabled(enabled) {
    logoShapeFieldset.disabled = !enabled;
    logoSizeFieldset.disabled = !enabled;
    logoEditBtn.hidden = !enabled;
  }

  function renderLogoCanvas(crop) {
    if (!logoSourceImage) return null;
    var size = 512;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    var shape = getLogoShape();
    var cover = shape !== 'original';
    var baseScale = cover
      ? Math.max(size / logoSourceImage.naturalWidth, size / logoSourceImage.naturalHeight)
      : Math.min(size / logoSourceImage.naturalWidth, size / logoSourceImage.naturalHeight);
    var scale = baseScale * crop.zoom;
    var width = logoSourceImage.naturalWidth * scale;
    var height = logoSourceImage.naturalHeight * scale;
    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.drawImage(logoSourceImage, (size - width) / 2 + crop.x * size / 240, (size - height) / 2 + crop.y * size / 240, width, height);
    return canvas;
  }

  function updateProcessedLogo() {
    var canvas = renderLogoCanvas(logoCrop);
    if (!canvas) return;
    logoDataUrl = canvas.toDataURL('image/png');
    logoThumbnailImage.src = logoDataUrl;
    logoCropStage.dataset.shape = getLogoShape();
    if (qrCode && urlInput.value.trim()) generate();
  }

  function updateCropPreview() {
    if (!logoSourceImage) return;
    var stageSize = logoCropStage.clientWidth || 240;
    var shape = getLogoShape();
    var cover = shape !== 'original';
    var baseScale = cover
      ? Math.max(stageSize / logoSourceImage.naturalWidth, stageSize / logoSourceImage.naturalHeight)
      : Math.min(stageSize / logoSourceImage.naturalWidth, stageSize / logoSourceImage.naturalHeight);
    logoCropImage.style.width = (logoSourceImage.naturalWidth * baseScale) + 'px';
    logoCropImage.style.height = (logoSourceImage.naturalHeight * baseScale) + 'px';
    logoCropImage.style.transform = 'translate(-50%, -50%) translate(' + logoCropDraft.x + 'px, ' + logoCropDraft.y + 'px) scale(' + logoCropDraft.zoom + ')';
    logoCropStage.dataset.shape = shape;
  }

  function openLogoEditor() {
    if (!logoSourceImage) return;
    logoCropDraft = { x: logoCrop.x, y: logoCrop.y, zoom: logoCrop.zoom };
    logoCropImage.src = logoSourceDataUrl;
    logoZoomInput.value = Math.round(logoCropDraft.zoom * 100);
    logoEditor.showModal();
    requestAnimationFrame(updateCropPreview);
  }

  function closeLogoEditor() {
    if (logoEditor.open) logoEditor.close();
  }

  function applyLogoEdit() {
    logoCrop = { x: logoCropDraft.x, y: logoCropDraft.y, zoom: logoCropDraft.zoom };
    updateProcessedLogo();
    closeLogoEditor();
  }

  var cropPointer = null;
  logoCropStage.addEventListener('pointerdown', function (event) {
    cropPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: logoCropDraft.x, startY: logoCropDraft.y };
    logoCropStage.setPointerCapture(event.pointerId);
  });
  logoCropStage.addEventListener('pointermove', function (event) {
    if (!cropPointer || cropPointer.id !== event.pointerId) return;
    logoCropDraft.x = cropPointer.startX + event.clientX - cropPointer.x;
    logoCropDraft.y = cropPointer.startY + event.clientY - cropPointer.y;
    updateCropPreview();
  });
  logoCropStage.addEventListener('pointerup', function (event) {
    if (cropPointer && cropPointer.id === event.pointerId) cropPointer = null;
  });

  logoZoomInput.addEventListener('input', function () {
    logoCropDraft.zoom = Number(logoZoomInput.value) / 100;
    updateCropPreview();
  });

  logoShapeInputs.forEach(function (radio) {
    radio.addEventListener('change', function () {
      logoCrop = { x: 0, y: 0, zoom: 1 };
      updateProcessedLogo();
      if (logoEditor.open) {
        logoCropDraft = { x: 0, y: 0, zoom: 1 };
        logoZoomInput.value = 100;
        updateCropPreview();
      }
    });
  });

  logoSizeInputs.forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (qrCode && urlInput.value.trim()) generate();
    });
  });

  function onStyleChange() {
    // Keep corners matched to style by default; user can still change corners after.
    var styleToCorners = {
      dots: 'round',
      square: 'square',
      classy: 'hybrid'
    };
    var style = getSelectedStyle();
    var cornerValue = styleToCorners[style] || 'round';
    var cornerRadio = document.querySelector('input[name="qr-corners"][value="' + cornerValue + '"]');
    if (cornerRadio) cornerRadio.checked = true;
    if (qrCode && urlInput.value.trim()) generate();
  }

  function onCornersChange() {
    if (qrCode && urlInput.value.trim()) generate();
  }

  var colorDebounceTimer = null;
  var COLOR_DEBOUNCE_MS = 120;

  function onColorInput() {
    qrColorHex.textContent = qrColorInput.value;
    qrBgColorHex.textContent = qrBgColorInput.value;
    if (!qrCode || !urlInput.value.trim()) return;
    if (colorDebounceTimer) clearTimeout(colorDebounceTimer);
    colorDebounceTimer = setTimeout(function () {
      colorDebounceTimer = null;
      generate();
    }, COLOR_DEBOUNCE_MS);
  }

  function onColorChange() {
    qrColorHex.textContent = qrColorInput.value;
    qrBgColorHex.textContent = qrBgColorInput.value;
    if (colorDebounceTimer) clearTimeout(colorDebounceTimer);
    colorDebounceTimer = null;
    if (qrCode && urlInput.value.trim()) generate();
  }

  function onCaptionInput() {
    updateCaption(captionInput.value);
  }

  function onUrlInput() {
    if ((urlInput.value || '').trim() === '' && qrCode) {
      clearError(urlError);
      clearPreview();
    }
  }

  btnGenerate.addEventListener('click', generate);
  btnDownload.addEventListener('click', download);
  btnDownloadJpeg.addEventListener('click', downloadJpeg);
  btnDownloadSvg.addEventListener('click', downloadSvg);
  btnCopyPng.addEventListener('click', copyPng);
  if (logoChooseBtn) logoChooseBtn.addEventListener('click', function () { logoInput.click(); });
  logoEditBtn.addEventListener('click', openLogoEditor);
  logoEditorClose.addEventListener('click', closeLogoEditor);
  logoEditorCancel.addEventListener('click', closeLogoEditor);
  logoEditorApply.addEventListener('click', applyLogoEdit);
  logoEditor.addEventListener('click', function (event) {
    if (event.target === logoEditor) closeLogoEditor();
  });
  urlInput.addEventListener('input', onUrlInput);
  urlInput.addEventListener('change', onUrlInput);
  logoInput.addEventListener('change', onLogoChange);
  captionInput.addEventListener('input', onCaptionInput);
  captionInput.addEventListener('change', onCaptionInput);
  qrColorInput.addEventListener('input', onColorInput);
  qrColorInput.addEventListener('change', onColorChange);
  qrBgColorInput.addEventListener('input', onColorInput);
  qrBgColorInput.addEventListener('change', onColorChange);
  styleInputs.forEach(function (radio) {
    radio.addEventListener('change', onStyleChange);
  });
  cornerInputs.forEach(function (radio) {
    radio.addEventListener('change', onCornersChange);
  });
})();
