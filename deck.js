/* ==============================================================
   Deck controller v2 — Swiss / Aspire green
   Same step-based reveal model as v1, but compounding is now a
   line-vs-curve drawing animation with a counting label.
   ============================================================== */

// ---------- Stage scaling ----------
(function fit() {
  const canvas = document.getElementById('canvas');
  function apply() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    canvas.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  window.addEventListener('resize', apply);
  apply();
})();

// ---------- Slide controller ----------
const slides = [...document.querySelectorAll('.slide')];
let slideIdx = 0;
let stepIdx = 0;
let strikeTimer = null;

const foliationNum = document.getElementById('foliationNum');

function pad(n) { return String(n).padStart(2, '0'); }

function maybeRunStrike(slide, stepEl) {
  if (stepEl && stepEl.dataset.strike === 'true') {
    clearTimeout(strikeTimer);
    strikeTimer = setTimeout(() => stepEl.classList.add('struck'), 1200);
  }
}

function updateChrome(slide) {
  const num = parseInt(slide.dataset.slide, 10);
  if (foliationNum) foliationNum.textContent = pad(num);
}

function activateSlide(i, opts = {}) {
  const { revealAll = false } = opts;
  const prev = document.querySelector('.slide.is-active');
  const next = slides[i];
  if (prev && prev !== next) prev.classList.remove('is-active');
  next.classList.add('is-active');
  updateChrome(next);

  // Reset reveals
  next.querySelectorAll('.reveal').forEach(el => {
    el.classList.remove('is-in', 'struck');
  });

  // Reset compounding state if leaving or entering
  if (prev && prev.classList.contains('compounding')) resetCompounding();
  if (next.classList.contains('compounding')) resetCompounding();

  const totalSteps = parseInt(next.dataset.steps || '1', 10);
  if (revealAll) {
    stepIdx = totalSteps;
    next.querySelectorAll('.reveal').forEach((el, idx) => {
      setTimeout(() => {
        el.classList.add('is-in');
        maybeRunStrike(next, el);
      }, 120 + idx * 90);
    });
    // Run all step animations once
    for (let s = 1; s <= totalSteps; s++) {
      setTimeout(() => triggerStepAnimation(next, s), 200 + s * 200);
    }
  } else {
    stepIdx = 1;
    const firstReveals = next.querySelectorAll('.reveal[data-step="1"]');
    if (firstReveals.length) {
      const beat = (i === 0) ? 280 : 140;
      firstReveals.forEach((el, idx) => {
        setTimeout(() => {
          el.classList.add('is-in');
          maybeRunStrike(next, el);
        }, beat + idx * 60);
      });
      triggerStepAnimation(next, 1);
    }
  }

  slideIdx = i;
  try { window.parent.postMessage({ slideIndexChanged: i }, '*'); } catch (e) {}
}

function advance() {
  const slide = slides[slideIdx];
  const totalSteps = parseInt(slide.dataset.steps || '1', 10);
  if (stepIdx < totalSteps) {
    stepIdx += 1;
    const els = slide.querySelectorAll(`.reveal[data-step="${stepIdx}"]`);
    els.forEach((el, idx) => {
      setTimeout(() => {
        el.classList.add('is-in');
        maybeRunStrike(slide, el);
      }, idx * 80);
    });
    triggerStepAnimation(slide, stepIdx);
  } else if (slideIdx < slides.length - 1) {
    activateSlide(slideIdx + 1);
  }
}

function retreat() {
  const slide = slides[slideIdx];
  if (stepIdx > 1) {
    const els = slide.querySelectorAll(`.reveal[data-step="${stepIdx}"]`);
    els.forEach(el => el.classList.remove('is-in', 'struck'));
    stepIdx -= 1;
  } else if (slideIdx > 0) {
    activateSlide(slideIdx - 1, { revealAll: true });
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
    e.preventDefault(); advance();
  } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    e.preventDefault(); retreat();
  } else if (e.key === 'Home') {
    activateSlide(0);
  } else if (e.key === 'End') {
    activateSlide(slides.length - 1, { revealAll: true });
  }
});

document.addEventListener('click', (e) => {
  if (e.target.closest('a, button')) return;
  advance();
});
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  retreat();
});

// ==============================================================
// Slide-specific animations
// ==============================================================

function triggerStepAnimation(slide, step) {
  if (slide.classList.contains('compounding')) {
    if (step === 1) animateCompounding();
    if (step === 2) {} // legend already revealed
  }
}

// ---------- Compounding visual ----------
const cmpBuilderPath  = document.getElementById('cmpBuilderPath');
const cmpHarnessPath  = document.getElementById('cmpHarnessPath');
const cmpBuilderEnd   = document.getElementById('cmpBuilderEnd');
const cmpHarnessEnd   = document.getElementById('cmpHarnessEnd');
const cmpHarnessPulse = document.getElementById('cmpHarnessPulse');
const cmpBuilderLabel = document.getElementById('cmpBuilderLabel');
const cmpBuilderNum   = document.getElementById('cmpBuilderNum');
const cmpHarnessLabel = document.getElementById('cmpHarnessLabel');
const cmpHarnessNum   = document.getElementById('cmpHarnessNum');

let cmpFrames = [];
let cmpPulseRaf = null;
let cmpPulseRunning = false;

function setPathDashed(path) {
  if (!path) return 0;
  const len = path.getTotalLength();
  path.style.transition = 'none';
  path.style.strokeDasharray = len;
  path.style.strokeDashoffset = len;
  // force reflow
  void path.getBoundingClientRect();
  return len;
}

function resetCompounding() {
  // cancel running animations
  cmpFrames.forEach(id => clearTimeout(id));
  cmpFrames = [];
  if (cmpPulseRaf) cancelAnimationFrame(cmpPulseRaf);
  cmpPulseRunning = false;

  setPathDashed(cmpBuilderPath);
  setPathDashed(cmpHarnessPath);
  if (cmpBuilderEnd) cmpBuilderEnd.setAttribute('r', '0');
  if (cmpHarnessEnd) cmpHarnessEnd.setAttribute('r', '0');
  if (cmpHarnessPulse) {
    cmpHarnessPulse.setAttribute('r', '6');
    cmpHarnessPulse.style.opacity = '0';
  }
  [cmpBuilderLabel, cmpBuilderNum, cmpHarnessLabel, cmpHarnessNum].forEach(el => {
    if (el) el.setAttribute('opacity', '0');
  });
  if (cmpBuilderNum) cmpBuilderNum.textContent = '0';
  if (cmpHarnessNum) cmpHarnessNum.textContent = '0';
}

function animateCompounding() {
  resetCompounding();

  // Builder — linear, draws over 1.6s
  setTimeout(() => {
    if (!cmpBuilderPath) return;
    cmpBuilderPath.style.transition = 'stroke-dashoffset 1600ms cubic-bezier(0.5, 0, 0.5, 1)';
    cmpBuilderPath.style.strokeDashoffset = '0';
  }, 200);

  // Builder endpoint pop in + label + counter
  cmpFrames.push(setTimeout(() => {
    if (cmpBuilderEnd) {
      cmpBuilderEnd.style.transition = 'r 320ms cubic-bezier(0.16, 1, 0.3, 1)';
      cmpBuilderEnd.setAttribute('r', '6');
    }
    if (cmpBuilderLabel) {
      cmpBuilderLabel.style.transition = 'opacity 360ms ease';
      cmpBuilderLabel.setAttribute('opacity', '0.62');
    }
    if (cmpBuilderNum) {
      cmpBuilderNum.style.transition = 'opacity 360ms ease';
      cmpBuilderNum.setAttribute('opacity', '1');
      countTo(cmpBuilderNum, 12, 700);
    }
  }, 1900));

  // Harness — exponential curve, draws slower & bigger
  cmpFrames.push(setTimeout(() => {
    if (!cmpHarnessPath) return;
    cmpHarnessPath.style.transition = 'stroke-dashoffset 2600ms cubic-bezier(0.65, 0, 0.5, 1)';
    cmpHarnessPath.style.strokeDashoffset = '0';
  }, 2400));

  // Harness endpoint pop + label + count + pulse
  cmpFrames.push(setTimeout(() => {
    if (cmpHarnessEnd) {
      cmpHarnessEnd.style.transition = 'r 360ms cubic-bezier(0.16, 1, 0.3, 1)';
      cmpHarnessEnd.setAttribute('r', '9');
    }
    if (cmpHarnessLabel) {
      cmpHarnessLabel.style.transition = 'opacity 400ms ease';
      cmpHarnessLabel.setAttribute('opacity', '1');
    }
    if (cmpHarnessNum) {
      cmpHarnessNum.style.transition = 'opacity 400ms ease';
      cmpHarnessNum.setAttribute('opacity', '1');
      countTo(cmpHarnessNum, 31, 1100);
    }
    startHarnessPulse();
  }, 4900));
}

function startHarnessPulse() {
  if (!cmpHarnessPulse || cmpPulseRunning) return;
  cmpPulseRunning = true;
  const t0 = performance.now();
  function frame(t) {
    if (!cmpPulseRunning) return;
    const phase = ((t - t0) % 1500) / 1500;
    const r = 9 + phase * 24;
    const op = (1 - phase) * 0.55;
    cmpHarnessPulse.setAttribute('r', String(r));
    cmpHarnessPulse.style.opacity = String(op);
    cmpPulseRaf = requestAnimationFrame(frame);
  }
  cmpPulseRaf = requestAnimationFrame(frame);
}

function countTo(el, target, duration) {
  if (!el) return;
  const start = parseInt(el.textContent, 10) || 0;
  const t0 = performance.now();
  function frame(t) {
    const k = Math.min(1, (t - t0) / duration);
    const eased = 1 - Math.pow(1 - k, 3);
    const v = Math.round(start + (target - start) * eased);
    el.textContent = (target >= 30 && k === 1) ? `${v}+` : String(v);
    if (k < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Pre-prep the dasharrays so first paint already shows the lines hidden
setPathDashed(cmpBuilderPath);
setPathDashed(cmpHarnessPath);

// Kick off
activateSlide(0);
