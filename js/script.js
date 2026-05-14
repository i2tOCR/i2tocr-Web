'use strict';
/* ================================================================
   i2t OCR — app.js  v3
   
   FIXES vs previous versions:
   1. Engine tabs: simple direct classList toggle, no wrapper objects
   2. Tesseract: tested createWorker API for tesseract.js v5
   3. OCR Cloud: uses /ocr/sync endpoint with polling fallback
   4. Loading overlay: covers workspace-panels via CSS position:absolute
   5. File input: pointer-events fixed so click always reaches input
================================================================ */

// ─── Config ────────────────────────────────────────────────────────
var API_BASE = 'https://i2tocr.com';   // change to your server URL
var POLL_MS  = 800;                     // polling interval for async results

// ─── State ─────────────────────────────────────────────────────────
var currentEngine = 'tesseract';
var currentFile   = null;

// ─── Tiny DOM helper ────────────────────────────────────────────────
function g(id) { return document.getElementById(id); }

// ════════════════════════════════════════════════════════════════════
// ENGINE TABS
// Simple, direct — no wrappers that can go null
// ════════════════════════════════════════════════════════════════════
function activateTab(engine) {
  currentEngine = engine;

  var tTess  = g('tab-tesseract');
  var tCloud = g('tab-ocrcloud');
  var badge  = g('engine-badge');

  if (!tTess || !tCloud) return;

  // Remove active classes from both
  tTess.className  = 'engine-tab';
  tCloud.className = 'engine-tab';

  if (engine === 'tesseract') {
    tTess.className  = 'engine-tab active-teal';
    if (badge) {
      badge.textContent = 'Tesseract.js';
      badge.className   = 'ocr-engine-badge teal';
    }
  } else {
    tCloud.className = 'engine-tab active-purple';
    if (badge) {
      badge.textContent = 'OCR Cloud';
      badge.className   = 'ocr-engine-badge purple';
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// LOADING OVERLAY
// ════════════════════════════════════════════════════════════════════
function setLoading(on, msg) {
  var ov  = g('ocr-loading');
  var txt = g('loading-text');
  var btn = g('btn-run-ocr');
  if (!ov) return;
  if (on) {
    ov.classList.add('visible');
    if (txt && msg) txt.textContent = msg;
  } else {
    ov.classList.remove('visible');
    if (txt) txt.textContent = '';
  }
  if (btn) btn.disabled = on;
}

// ════════════════════════════════════════════════════════════════════
// CHAR COUNT
// ════════════════════════════════════════════════════════════════════
function updateCount() {
  var ta = g('text-output');
  var cc = g('char-count');
  if (!ta || !cc) return;
  var len   = ta.value.length;
  var words = len ? ta.value.trim().split(/\s+/).filter(Boolean).length : 0;
  cc.textContent = len ? len + ' chars · ' + words + ' words' : '';
}

// ════════════════════════════════════════════════════════════════════
// SHOW WORKSPACE after file selected
// ════════════════════════════════════════════════════════════════════
function showWorkspace(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var wrap = g('img-preview');
    if (wrap) wrap.innerHTML = '<img src="' + e.target.result + '" alt="preview">';
  };
  reader.readAsDataURL(file);

  var ua = g('upload-area');
  var ws = g('workspace');
  var ta = g('text-output');

  if (ua) ua.style.display = 'none';
  if (ws) ws.classList.add('visible');
  if (ta) { ta.value = ''; updateCount(); }
}

// ════════════════════════════════════════════════════════════════════
// TESSERACT.JS (browser-side)
// ════════════════════════════════════════════════════════════════════
async function runTesseract(file, lang) {
  if (typeof Tesseract === 'undefined') {
    throw new Error('Tesseract.js did not load — check your internet connection');
  }

  // tesseract.js v5: createWorker(lang, oem, options)
  var worker = await Tesseract.createWorker(lang, 1, {
    logger: function(m) {
      var txt = g('loading-text');
      if (!txt) return;
      switch (m.status) {
        case 'loading tesseract core':
          txt.textContent = 'Loading engine…'; break;
        case 'initializing tesseract':
          txt.textContent = 'Initializing…'; break;
        case 'loading language traineddata':
          txt.textContent = 'Loading language data…'; break;
        case 'initializing api':
          txt.textContent = 'Preparing…'; break;
        case 'recognizing text':
          txt.textContent = 'Recognizing… ' + Math.round((m.progress || 0) * 100) + '%';
          break;
      }
    },
  });

  var result = await worker.recognize(file);
  await worker.terminate();
  return result.data.text;
}

// ════════════════════════════════════════════════════════════════════
// OCR CLOUD (server-side Tesseract via FastAPI)
// Uses /ocr/sync — if it times out, polls /ocr/{task_id}
// ════════════════════════════════════════════════════════════════════
async function runOcrCloud(file, lang) {
  var form = new FormData();
  form.append('file', file);
  form.append('lang', lang);
  form.append('config', '--psm 4');

  setLoading(true, 'Sending to server…');

  var res  = await fetch(API_BASE + '/ocr/sync', { method: 'POST', body: form });
  var data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || 'HTTP ' + res.status);
  }

  // Success on first try
  if (data.status === 'success') {
    return data.data.text;
  }

  // Server is still processing — poll
  if (data.status === 'processing' && data.task_id) {
    return await pollTask(data.task_id);
  }

  throw new Error(data.detail || 'Unexpected response from server');
}

async function pollTask(taskId) {
  var maxAttempts = 60;   // 60 × 800 ms = 48 s max
  for (var i = 0; i < maxAttempts; i++) {
    setLoading(true, 'Processing… (' + (i + 1) + 's)');
    await sleep(POLL_MS);

    var res  = await fetch(API_BASE + '/ocr/' + taskId);
    var data = await res.json();

    if (data.status === 'success') return data.data.text;
    if (data.status === 'failure') throw new Error(data.detail || 'OCR failed on server');
    // still 'processing' → keep looping
  }
  throw new Error('OCR timed out — please try a smaller image');
}

function sleep(ms) {
  return new Promise(function(r) { setTimeout(r, ms); });
}

// ════════════════════════════════════════════════════════════════════
// MAIN OCR RUNNER
// ════════════════════════════════════════════════════════════════════
async function runOcr(lang) {
  if (!currentFile) return;

  setLoading(true, 'Starting…');
  var ta = g('text-output');
  if (ta) { ta.value = ''; updateCount(); }

  try {
    var text;
    if (currentEngine === 'tesseract') {
      text = await runTesseract(currentFile, lang);
    } else {
      text = await runOcrCloud(currentFile, lang);
    }
    if (ta) { ta.value = (text || '').trim(); updateCount(); }
  } catch (err) {
    console.error('[OCR error]', err);
    if (ta) { ta.value = '⚠ Error: ' + err.message; updateCount(); }
  } finally {
    setLoading(false);
  }
}

// ════════════════════════════════════════════════════════════════════
// LANGUAGE MODAL
// ════════════════════════════════════════════════════════════════════
function openModal() {
  var sel = g('lang-select');
  var ov  = g('modal-overlay');
  if (sel) sel.value = '';
  if (ov)  ov.classList.add('open');
  setTimeout(function() { if (sel) sel.focus(); }, 150);
}

function closeModal() {
  var ov = g('modal-overlay');
  if (ov) ov.classList.remove('open');
}

// ════════════════════════════════════════════════════════════════════
// FILE HANDLING
// ════════════════════════════════════════════════════════════════════
function handleFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file (JPG, PNG, WEBP, etc.)');
    return;
  }
  currentFile = file;
  showWorkspace(file);

  // Auto-run immediately:
  // Tesseract → English by default (user can re-run with different lang)
  // Cloud     → must pick language first
  if (currentEngine === 'tesseract') {
    setTimeout(function() { runOcr('eng'); }, 200);
  } else {
    openModal();
  }
}

// ════════════════════════════════════════════════════════════════════
// PARTICLES (background animation)
// ════════════════════════════════════════════════════════════════════
function initParticles() {
  var canvas = g('particles-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H, P = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function mkP() {
    return {
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      a: Math.random() * 0.4 + 0.1,
      c: Math.random() > 0.55 ? '#6c5ce7' : '#00cec9',
    };
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  for (var i = 0; i < 80; i++) P.push(mkP());

  (function draw() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < P.length; i++) {
      var a = P[i];
      for (var j = i + 1; j < P.length; j++) {
        var b = P[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 110) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(108,92,231,' + (0.06 * (1 - d / 110)) + ')';
          ctx.lineWidth = 0.5;
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    P.forEach(function(p) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.c; ctx.globalAlpha = p.a;
      ctx.fill(); ctx.globalAlpha = 1;
    });
    requestAnimationFrame(draw);
  }());
}

// ════════════════════════════════════════════════════════════════════
// SCROLL REVEAL
// ════════════════════════════════════════════════════════════════════
function initReveal() {
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.style.opacity   = '1';
        e.target.style.transform = 'translateY(0)';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.feature-card, .step-card, .orbit-card').forEach(function(el) {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity .5s ease, transform .5s ease';
    obs.observe(el);
  });
}

// ════════════════════════════════════════════════════════════════════
// SUPPORT FORM
// ════════════════════════════════════════════════════════════════════
function initSupportForm() {
  var form   = g('support-form');
  var banner = g('success-banner');
  if (!form || !banner) return;
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    banner.classList.add('visible');
    form.reset();
    setTimeout(function() { banner.classList.remove('visible'); }, 5000);
  });
}

// ════════════════════════════════════════════════════════════════════
// BOOT — runs after DOM is ready
// ════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {

  // Particles
  initParticles();

  // Header scroll shadow
  var header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', function() {
      header.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  // Footer year
  document.querySelectorAll('.year').forEach(function(el) {
    el.textContent = new Date().getFullYear();
  });

  // Scroll-reveal animations
  initReveal();

  // Support form
  initSupportForm();

  // iOS App nav button
  var navCta = g('nav-cta');
  if (navCta) {
    navCta.addEventListener('click', function(e) {
      e.preventDefault();
      var orig = navCta.textContent;
      navCta.textContent  = '🔜 Coming Soon';
      navCta.style.opacity = '.75';
      setTimeout(function() {
        navCta.textContent  = orig;
        navCta.style.opacity = '';
      }, 2500);
    });
  }

  // ── OCR Tool — only present on index.html ──────────────────────
  var uploadZone = g('upload-zone');
  if (!uploadZone) return;  // not on index page

  // Default engine
  activateTab('tesseract');

  // ── Engine tab clicks ─────────────────────────────────────────
  // Use mousedown instead of click to fire before any focus events
  var tTess  = g('tab-tesseract');
  var tCloud = g('tab-ocrcloud');

  if (tTess) {
    tTess.addEventListener('click', function(e) {
      e.stopPropagation();
      activateTab('tesseract');
    });
  }
  if (tCloud) {
    tCloud.addEventListener('click', function(e) {
      e.stopPropagation();
      activateTab('ocrcloud');
    });
  }

  // ── File input (zone is <label for="file-input"> — native picker + change handler) ──
  var fileInput = g('file-input');

  if (fileInput) {
    fileInput.addEventListener('change', function() {
      if (fileInput.files && fileInput.files[0]) {
        handleFile(fileInput.files[0]);
      }
    });
  }

  // Drag & drop
  uploadZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', function(e) {
    if (!uploadZone.contains(e.relatedTarget)) {
      uploadZone.classList.remove('drag-over');
    }
  });
  uploadZone.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  });

  // ── Language modal ────────────────────────────────────────────
  var confirmBtn = g('btn-confirm-lang');
  var cancelBtn  = g('btn-cancel-lang');
  var langSel    = g('lang-select');
  var modalOv    = g('modal-overlay');

  if (confirmBtn) {
    confirmBtn.addEventListener('click', function() {
      var lang = langSel ? langSel.value : '';
      if (!lang) {
        if (langSel) {
          langSel.style.borderColor = '#e84393';
          setTimeout(function() { langSel.style.borderColor = ''; }, 1400);
        }
        return;
      }
      closeModal();
      runOcr(lang);
    });
  }
  if (cancelBtn)  cancelBtn.addEventListener('click', closeModal);
  if (modalOv) {
    modalOv.addEventListener('click', function(e) {
      if (e.target === modalOv) closeModal();
    });
  }
  if (langSel) {
    langSel.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && confirmBtn) confirmBtn.click();
    });
  }

  // ── Copy button ───────────────────────────────────────────────
  var copyBtn = g('btn-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', async function() {
      var ta   = g('text-output');
      var text = ta ? ta.value.trim() : '';
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        if (ta) { ta.select(); document.execCommand('copy'); }
      }
      var orig = copyBtn.innerHTML;
      copyBtn.innerHTML   = '<i class="fas fa-check"></i>';
      copyBtn.style.color = 'var(--teal)';
      setTimeout(function() { copyBtn.innerHTML = orig; copyBtn.style.color = ''; }, 2000);
    });
  }

  // ── Reset / New Scan ──────────────────────────────────────────
  var resetBtn = g('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      currentFile = null;
      if (fileInput)       fileInput.value       = '';
      var ip = g('img-preview');
      var ta = g('text-output');
      var ws = g('workspace');
      var ua = g('upload-area');
      if (ip) ip.innerHTML  = '';
      if (ta) { ta.value    = ''; updateCount(); }
      if (ws) ws.classList.remove('visible');
      if (ua) ua.style.display = '';
      setLoading(false);
    });
  }

  // ── Run OCR Again button ──────────────────────────────────────
  var runBtn = g('btn-run-ocr');
  if (runBtn) {
    runBtn.addEventListener('click', function() {
      if (!currentFile) return;
      if (currentEngine === 'tesseract') {
        runOcr('eng');
      } else {
        openModal();
      }
    });
  }

  // Live char count
  var textOut = g('text-output');
  if (textOut) textOut.addEventListener('input', updateCount);

}); // DOMContentLoaded