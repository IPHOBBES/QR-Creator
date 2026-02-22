(function () {
  'use strict';

  const urlInput = document.getElementById('url-input');
  const urlError = document.getElementById('url-error');
  const styleInputs = document.querySelectorAll('input[name="qr-style"]');
  const qrColorInput = document.getElementById('qr-color');
  const qrBgColorInput = document.getElementById('qr-bg-color');
  const qrColorHex = document.getElementById('qr-color-hex');
  const qrBgColorHex = document.getElementById('qr-bg-color-hex');
  const logoInput = document.getElementById('logo-input');
  const logoChooseBtn = document.getElementById('logo-choose-btn');
  const logoFilename = document.getElementById('logo-filename');
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

  function getDotsType(style) {
    const map = {
      dots: 'dots',      // circular dots
      square: 'square',  // square pixels
      classy: 'classy'   // horizontal lines + dots hybrid look
    };
    return map[style] || 'dots';
  }

  function getQrColors() {
    return {
      fg: qrColorInput.value || '#000000',
      bg: qrBgColorInput.value || '#ffffff'
    };
  }

  function buildOptions(data, dotsType, image, colors) {
    colors = colors || getQrColors();
    const options = {
      width: 280,
      height: 280,
      type: 'svg',
      data: data,
      margin: 8,
      qrOptions: { errorCorrectionLevel: 'H' },
      dotsOptions: {
        color: colors.fg,
        type: dotsType
      },
      cornersSquareOptions: {
        color: colors.fg,
        type: 'extra-rounded'
      },
      cornersDotOptions: {
        color: colors.fg,
        type: 'dot'
      },
      backgroundOptions: {
        color: colors.bg
      }
    };
    if (image) {
      options.imageOptions = {
        hideBackgroundDots: true,
        imageSize: 0.4,
        margin: 6
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
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'qr-code.png';
        a.click();
        URL.revokeObjectURL(a.href);
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
              var link = document.createElement('a');
              link.href = URL.createObjectURL(b);
              link.download = 'qr-code.png';
              link.click();
              URL.revokeObjectURL(link.href);
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
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'qr-code.jpg';
        a.click();
        URL.revokeObjectURL(a.href);
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
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'qr-code.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function onLogoChange() {
    const file = logoInput.files && logoInput.files[0];
    if (logoFilename) logoFilename.textContent = file ? file.name : 'No file chosen';
    logoDataUrl = null;
    if (!file || !file.type.startsWith('image/')) {
      if (qrCode && urlInput.value.trim()) generate();
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      logoDataUrl = e.target.result;
      if (qrCode && urlInput.value.trim()) generate();
    };
    reader.readAsDataURL(file);
  }

  function onStyleChange() {
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
})();
