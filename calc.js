/*
 * Қалқымалы ғылыми калькулятор (Math.js). Тек оқушы енгізген өрнекті есептейді — есептің жауабын өзі көрсетпейді.
 * Мүмкіндіктері: + − × ÷, жақшалар, %, ±, xʸ, x², x³, √, ∛, 1/x, n!, |x|, log, ln, 10ˣ, eˣ, sin/cos/tan және
 * кері функциялары (DEG/RAD), π, e, ×10ⁿ, Ans (соңғы нәтиже), жад (MC, MR, M+, M−), тарих.
 */
window.PL = window.PL || {};
PL.calc = (function () {
  let win, expr, res, hist, fab, memEl, angEl, keysEl;
  let deg = true, ans = 0, mem = 0, lastVal = null;
  const ls = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // ── Пернетақта: [мән, белгі, класс, түсініктеме] ──
  const KEYS = [
    // жад
    ['MC', 'MC', 'k-mem', 'calcMC'], ['MR', 'MR', 'k-mem', 'calcMR'], ['M+', 'M+', 'k-mem', 'calcMplus'], ['M-', 'M−', 'k-mem', 'calcMminus'], ['Ans', 'Ans', 'k-mem', 'calcAns'],
    // ғылыми
    ['ang', 'DEG', 'k-sci k-ang', 'calcAng'], ['sin(', 'sin', 'k-sci'], ['cos(', 'cos', 'k-sci'], ['tan(', 'tan', 'k-sci'], ['π', 'π', 'k-sci', 'calcPi'],
    ['!', 'n!', 'k-sci', 'calcFact'], ['asin(', 'sin⁻¹', 'k-sci'], ['acos(', 'cos⁻¹', 'k-sci'], ['atan(', 'tan⁻¹', 'k-sci'], ['ℯ', 'e', 'k-sci', 'calcE'],
    ['²', 'x²', 'k-sci', 'calcSq'], ['³', 'x³', 'k-sci', 'calcCube'], ['^', 'xʸ', 'k-sci', 'calcPow'], ['√(', '√x', 'k-sci', 'calcSqrt'], ['∛(', '∛x', 'k-sci', 'calcCbrt'],
    ['inv', '1/x', 'k-sci', 'calcInv'], ['log(', 'log', 'k-sci', 'calcLog'], ['ln(', 'ln', 'k-sci', 'calcLn'], ['10^(', '10ˣ', 'k-sci', 'calc10x'], ['ℯ^(', 'eˣ', 'k-sci', 'calcEx'],
    // негізгі
    ['C', 'C', 'k-fn', 'calcClear'], ['back', '⌫', 'k-fn', 'calcBack'], ['(', '(', 'k-fn'], [')', ')', 'k-fn'], ['/', '÷', 'k-op'],
    ['7', '7'], ['8', '8'], ['9', '9'], ['neg', '±', 'k-fn', 'calcNeg'], ['*', '×', 'k-op'],
    ['4', '4'], ['5', '5'], ['6', '6'], ['abs(', '|x|', 'k-fn', 'calcAbs'], ['-', '−', 'k-op'],
    ['1', '1'], ['2', '2'], ['3', '3'], ['%', '%', 'k-fn', 'calcPct'], ['+', '+', 'k-op'],
    ['0', '0'], [',', ','], ['e', '×10ⁿ', 'k-fn', 'calcExp'], ['=', '=', 'k-eq']
  ];

  let imported = false;
  function ensureFns() {
    if (imported || !window.math) return;
    const r = (x) => x * Math.PI / 180, d = (x) => x * 180 / Math.PI;
    const clean = (v) => Math.abs(v) < 1e-12 ? 0 : v; // sin 180° = 0 (1.2e-16 емес)
    math.import({
      sind: (x) => clean(Math.sin(r(x))), cosd: (x) => clean(Math.cos(r(x))),
      tand: (x) => { const c = Math.cos(r(x)); if (Math.abs(c) < 1e-12) return Infinity; return clean(Math.tan(r(x))); },
      asind: (x) => d(Math.asin(x)), acosd: (x) => d(Math.acos(x)), atand: (x) => d(Math.atan(x))
    }, { override: true });
    imported = true;
  }

  function toMathJs(s) {
    let out = s
      .replace(/×/g, '*').replace(/·/g, '*').replace(/÷/g, '/').replace(/:/g, '/').replace(/−/g, '-')
      .replace(/√/g, 'sqrt').replace(/∛/g, 'cbrt').replace(/π/g, ' pi ')
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/\|x\|/g, 'abs')
      .replace(/(\d),(\d)/g, '$1.$2').replace(/,/g, '.')
      .replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)')
      .replace(/(\d)\s*e\s*([+-]?\d)/gi, '$1e$2')
      .replace(/ℯ/g, ' e ')
      .replace(/\bAns\b/g, ' Ans ')
      .replace(/\blog\(/g, 'log10(').replace(/\bln\(/g, 'log(');
    if (deg) out = out.replace(/\b(a?)(sin|cos|tan)\(/g, '$1$2d(');
    return out;
  }

  function format(v) {
    if (typeof v === 'number') {
      if (!isFinite(v)) return PL.t('calcDiv0');
      const s = math.format(v, { precision: 12, lowerExp: -9, upperExp: 15 });
      return s.replace(/\./g, ',');
    }
    return String(v);
  }

  function compute(raw) {
    ensureFns();
    const v = math.evaluate(toMathJs(raw), { Ans: ans });
    if (typeof v === 'function' || v === undefined || v === null) throw new Error('bad');
    if (typeof v === 'object' && v.re !== undefined) return { complex: true };
    const n = typeof v === 'object' && v.toNumber ? v.toNumber() : +v;
    if (Number.isNaN(n)) throw new Error('nan');
    return { n };
  }

  function evaluate(commit) {
    const raw = expr.value.trim();
    if (!raw) { res.textContent = '0'; res.classList.remove('err'); lastVal = null; return; }
    if (!window.math) { res.textContent = PL.t('calcLib'); res.classList.add('err'); return; }
    try {
      const r = compute(raw);
      if (r.complex) { res.textContent = PL.t('calcNotReal'); res.classList.add('err'); lastVal = null; return; }
      const out = format(r.n);
      res.textContent = out; res.classList.toggle('err', !isFinite(r.n));
      lastVal = isFinite(r.n) ? r.n : null;
      if (commit && isFinite(r.n)) {
        hist.textContent = raw + ' =';
        ans = r.n;
        expr.value = out.replace(/\s/g, '');
      }
    } catch (e) {
      lastVal = null;
      if (commit) { res.textContent = PL.t('calcErr'); res.classList.add('err'); }
    }
  }

  function insert(text) {
    const s = expr.selectionStart ?? expr.value.length, e = expr.selectionEnd ?? expr.value.length;
    expr.value = expr.value.slice(0, s) + text + expr.value.slice(e);
    expr.selectionStart = expr.selectionEnd = s + text.length;
  }
  const numText = (n) => format(n).replace(/\s/g, '');
  function currentValue() {
    if (lastVal != null) return lastVal;
    if (!expr.value.trim()) return 0;
    try { const r = compute(expr.value); return r.complex ? null : r.n; } catch (e) { return null; }
  }
  function paintMem() { memEl.hidden = !mem; memEl.title = PL.t('calcMemVal', { v: numText(mem) }); ls.set('pl-calc-mem', String(mem)); }
  function paintAng() {
    angEl.textContent = deg ? 'DEG' : 'RAD';
    const k = keysEl.querySelector('[data-k="ang"]'); if (k) k.textContent = deg ? 'DEG' : 'RAD';
    ls.set('pl-calc-deg', deg ? '1' : '0');
  }

  function press(k) {
    const s = expr.selectionStart ?? expr.value.length, e = expr.selectionEnd ?? expr.value.length;
    switch (k) {
      case 'C': expr.value = ''; hist.textContent = ''; break;
      case 'back':
        if (s === e && s > 0) { expr.value = expr.value.slice(0, s - 1) + expr.value.slice(e); expr.selectionStart = expr.selectionEnd = s - 1; }
        else { expr.value = expr.value.slice(0, s) + expr.value.slice(e); expr.selectionStart = expr.selectionEnd = s; }
        break;
      case '=': evaluate(true); expr.focus(); return;
      case 'ang': deg = !deg; paintAng(); break;
      case 'neg': { const v = expr.value.trim(); expr.value = !v ? '−' : /^−\(.*\)$/.test(v) ? v.slice(2, -1) : '−(' + v + ')'; break; }
      case 'inv': { const v = expr.value.trim(); expr.value = v ? '1÷(' + v + ')' : '1÷'; break; }
      case 'MC': mem = 0; paintMem(); break;
      case 'MR': insert(numText(mem)); break;
      case 'M+': case 'M-': {
        const v = currentValue();
        if (v == null) { res.textContent = PL.t('calcErr'); res.classList.add('err'); return; }
        mem += k === 'M+' ? v : -v; paintMem(); break;
      }
      case 'Ans': insert('Ans'); break;
      default: {
        const ins = { '*': '×', '/': '÷', '-': '−', 'e': '·10^' }[k] || k;
        insert(ins);
      }
    }
    evaluate(); expr.focus();
  }

  function drag(handle) {
    let sx, sy, ox, oy, on = false;
    handle.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      on = true; handle.setPointerCapture(e.pointerId);
      const r = win.getBoundingClientRect(); sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
    });
    handle.addEventListener('pointermove', e => {
      if (!on) return;
      const x = Math.min(Math.max(0, ox + e.clientX - sx), window.innerWidth - win.offsetWidth);
      const y = Math.min(Math.max(0, oy + e.clientY - sy), window.innerHeight - 50);
      win.style.left = x + 'px'; win.style.top = y + 'px'; win.style.right = 'auto'; win.style.bottom = 'auto';
    });
    handle.addEventListener('pointerup', () => { on = false; });
  }

  function toggle(show) {
    const vis = show != null ? show : win.hidden;
    win.hidden = !vis;
    fab.setAttribute('aria-expanded', String(vis));
    if (vis) setTimeout(() => expr.focus(), 0);
  }
  function setSci(on) {
    win.classList.toggle('sci', on);
    const b = document.getElementById('calcSci');
    b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
    ls.set('pl-calc-sci', on ? '1' : '0');
  }

  function buildKeys() {
    keysEl.innerHTML = '';
    KEYS.forEach(([k, label, cls, tip]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.k = k; b.textContent = label;
      if (cls) b.className = cls;
      if (tip) { b.title = PL.t(tip); b.setAttribute('aria-label', PL.t(tip)); }
      keysEl.append(b);
    });
    paintAng();
  }

  function init() {
    win = document.getElementById('calc'); expr = document.getElementById('calcExpr');
    res = document.getElementById('calcRes'); hist = document.getElementById('calcHist'); fab = document.getElementById('btnCalc');
    memEl = document.getElementById('calcMem'); angEl = document.getElementById('calcAngle'); keysEl = document.getElementById('calcKeys');
    deg = ls.get('pl-calc-deg') !== '0';
    mem = parseFloat(ls.get('pl-calc-mem')) || 0;
    buildKeys(); paintMem();
    setSci(ls.get('pl-calc-sci') !== '0');
    fab.addEventListener('click', () => toggle());
    document.getElementById('calcClose').addEventListener('click', () => toggle(false));
    document.getElementById('calcSci').addEventListener('click', () => setSci(!win.classList.contains('sci')));
    keysEl.addEventListener('click', e => { const b = e.target.closest('button'); if (b) press(b.dataset.k); });
    keysEl.addEventListener('mousedown', e => e.preventDefault());
    expr.addEventListener('input', () => evaluate());
    expr.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); evaluate(true); }
      if (e.key === 'Escape') toggle(false);
    });
    drag(document.getElementById('calcHead'));
  }
  function refreshLang() { if (keysEl) buildKeys(); if (memEl) paintMem(); }

  return { init, toggle, refreshLang, _toMathJs: toMathJs, _compute: (s) => compute(s), _setDeg: (v) => { deg = v; paintAng(); } };
})();
