/* ==============================================================
   Deck controller — staggered reveals, custom animations
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

const totalSlides = slides.length;
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
  foliationNum.textContent = pad(num);
}

// ---------- Custom slide animations ----------
function runSlideAnimations(slide) {
  const num = parseInt(slide.dataset.slide, 10);
  if (num === 10) {
    // Compounding cascade triggers per-step
  }
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

  // Reset compounding state if leaving
  if (prev && parseInt(prev.dataset.slide, 10) === 10) resetCompounding();
  // Reset compounding fresh on entering
  if (parseInt(next.dataset.slide, 10) === 10) resetCompounding();

  const totalSteps = parseInt(next.dataset.steps || '1', 10);
  if (revealAll) {
    stepIdx = totalSteps;
    next.querySelectorAll('.reveal').forEach((el, idx) => {
      setTimeout(() => {
        el.classList.add('is-in');
        maybeRunStrike(next, el);
        triggerStepAnimation(next, parseInt(el.dataset.step || '1', 10));
      }, 120 + idx * 90);
    });
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
    } else {
      // No reveals — slide is purely auto-animated (e.g. cold open)
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
  const num = parseInt(slide.dataset.slide, 10);
  if (num === 10) {
    if (step === 1) animateBuilderColumn();
    if (step === 2) animateHarnessColumn();
  }
}

// ---------- Compounding visual ----------
const builderSvg = document.getElementById('cmpBuilder');
const harnessSvg = document.getElementById('cmpHarness');
const builderNum = document.getElementById('cmpBuilderNum');
const harnessNum = document.getElementById('cmpHarnessNum');

let builderTimer = null, harnessTimer = null;
let builderCountTimer = null, harnessCountTimer = null;

function buildBuilderTree() {
  if (!builderSvg) return;
  // Single column: 12 nodes spaced linearly (one per "day-hour")
  builderSvg.innerHTML = '';
  const rows = 12;
  const startY = 30;
  const endY = 450;
  for (let i = 0; i < rows; i++) {
    const y = startY + (endY - startY) * (i / (rows - 1));
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', 300);
    c.setAttribute('cy', y);
    c.setAttribute('r', 4);
    c.setAttribute('class', 'node');
    c.dataset.idx = i;
    builderSvg.appendChild(c);
  }
}

function buildHarnessTree() {
  if (!harnessSvg) return;
  harnessSvg.innerHTML = '';
  // Branching binary tree: 5 levels — 1, 2, 4, 8, 16 = 31 nodes
  const levels = [1, 2, 4, 8, 16];
  const ySpan = 110;
  const startY = 30;
  // Compute positions
  const positions = []; // [{x, y, level, idx, parentX, parentY}]
  levels.forEach((count, lvl) => {
    const y = startY + lvl * ySpan;
    for (let i = 0; i < count; i++) {
      const x = ((i + 0.5) / count) * 600;
      positions.push({ x, y, lvl, idx: i });
    }
  });
  // Branches: connect each node to its parent
  const branches = [];
  positions.forEach(p => {
    if (p.lvl === 0) return;
    const parentLevel = p.lvl - 1;
    const parentIdx = Math.floor(p.idx / 2);
    const parent = positions.find(q => q.lvl === parentLevel && q.idx === parentIdx);
    if (parent) {
      branches.push({ x1: parent.x, y1: parent.y, x2: p.x, y2: p.y, lvl: p.lvl });
    }
  });

  // Draw branches first (under nodes)
  branches.forEach((b, i) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${b.x1} ${b.y1} L ${b.x2} ${b.y2}`;
    path.setAttribute('d', d);
    path.setAttribute('class', 'branch');
    path.dataset.lvl = b.lvl;
    // Per-path dasharray = length
    const len = Math.hypot(b.x2 - b.x1, b.y2 - b.y1);
    path.setAttribute('stroke-dasharray', len);
    path.setAttribute('stroke-dashoffset', len);
    path.dataset.len = len;
    harnessSvg.appendChild(path);
  });

  // Draw nodes
  positions.forEach(p => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', p.x);
    c.setAttribute('cy', p.y);
    c.setAttribute('r', p.lvl === 4 ? 3 : 4);
    c.setAttribute('class', 'node' + (p.lvl === 4 ? ' signal' : ''));
    c.dataset.lvl = p.lvl;
    c.dataset.idx = p.idx;
    harnessSvg.appendChild(c);
  });
}

function resetCompounding() {
  clearInterval(builderTimer); clearInterval(harnessTimer);
  clearInterval(builderCountTimer); clearInterval(harnessCountTimer);
  buildBuilderTree();
  buildHarnessTree();
  if (builderNum) builderNum.textContent = '0';
  if (harnessNum) harnessNum.textContent = '0';
}

function animateBuilderColumn() {
  if (!builderSvg) return;
  const nodes = builderSvg.querySelectorAll('.node');
  let i = 0;
  let count = 0;
  clearInterval(builderTimer);
  builderTimer = setInterval(() => {
    if (i >= nodes.length) { clearInterval(builderTimer); return; }
    nodes[i].classList.add('is-on');
    count += 1;
    builderNum.textContent = String(count);
    i++;
  }, 180);
}

function animateHarnessColumn() {
  if (!harnessSvg) return;
  const branches = harnessSvg.querySelectorAll('.branch');
  const nodes = harnessSvg.querySelectorAll('.node');
  // Light up by level: lvl 0 first, then 1, 2, 3, 4
  const byLevel = { 0: [], 1: [], 2: [], 3: [], 4: [] };
  nodes.forEach(n => byLevel[parseInt(n.dataset.lvl, 10)].push(n));
  const branchByLevel = { 1: [], 2: [], 3: [], 4: [] };
  branches.forEach(b => branchByLevel[parseInt(b.dataset.lvl, 10)].push(b));

  // Compounding count: 1, 2, 4, 8, 16 cumulative = 1, 3, 7, 15, 31
  const cumulative = [1, 3, 7, 15, 31];

  let lvl = 0;
  function tick() {
    if (lvl > 4) { return; }
    // Light branches into this level (except lvl 0)
    if (lvl > 0) {
      branchByLevel[lvl].forEach(b => b.classList.add('is-on'));
    }
    // Light nodes at this level — small per-node stagger
    byLevel[lvl].forEach((n, i) => {
      setTimeout(() => n.classList.add('is-on'), i * 40);
    });
    // Animate the count up to cumulative[lvl]
    animateNum(harnessNum, cumulative[lvl], 500);
    lvl++;
    setTimeout(tick, 700);
  }
  tick();
}

function animateNum(el, target, duration) {
  if (!el) return;
  const start = parseInt(el.textContent, 10) || 0;
  const t0 = performance.now();
  function frame(t) {
    const k = Math.min(1, (t - t0) / duration);
    const eased = 1 - Math.pow(1 - k, 3);
    const v = Math.round(start + (target - start) * eased);
    el.textContent = String(v);
    if (k < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Pre-build trees so they exist on first paint
buildBuilderTree();
buildHarnessTree();

// Kick off
activateSlide(0);
