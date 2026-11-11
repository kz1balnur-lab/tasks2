/*
 * ГРАФИК САЛУ: оқушы координат торына нүктелерді өзі қояды, «Тексеру» нүктелерді кестедегі мәндермен салыстырады.
 *
 *  • Торды басу — нүкте қою (тор түйіндеріне «жабысады»), нүктені қайта басу — өшіру. Тышқан жүргенде
 *    нүктенің координаты көрінеді (Δl = 8 мм; F = 2 Н).
 *  • Тексеру: кестедегі әр жол (Δl, F) үшін оған сәйкес нүкте қойылуы керек; артық/қате нүкте болмауы керек.
 *    Дұрыс графиктің суреті «Дұрыс жауап» бөлімінде көрсетіледі; тексеруден кейін нүктелер түсі бойынша белгіленеді
 *    (жасыл — дұрыс, қызыл — қате), жетіспейтін нүктелердің орны ашылмайды.
 *  • Нәтиже PHYS_GRAPHS[тапсырма].item бақылау нүктесіне жазылады және дескриптор балына есептеледі.
 */
window.PL = window.PL || {};
window.PHYS_GRAPHS = {
  t3o3C: {
    afterText: /тәуелділік графигін/, item: 1,
    title: 'F-тің Δl-ге тәуелділік графигі',
    x: { label: 'Δl, мм', min: 0, max: 24, major: 4, snap: 1 },
    y: { label: 'F, Н', min: 0, max: 6, major: 1, snap: 0.25 },
    points: [[0, 0], [4, 1], [8, 2], [12, 3], [16, 4], [20, 5]],
    tol: { x: 0.5, y: 0.125 }
  }
};

PL.graph = (function () {
  const NS = 'http://www.w3.org/2000/svg';
  const el = PL.render.el;
  const S = (name, attrs, text) => { const e = document.createElementNS(NS, name); if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; };
  const fmt = (n) => String(Math.round(n * 1000) / 1000).replace('.', ',');
  const W = 760, H = 420, M = { l: 76, r: 24, t: 24, b: 64 };
  const t = (k, v) => PL.t(k, v);

  const has = (g) => !!(g && g.points && g.points.length);

  /* Тексеру: әр талап етілген нүктеге бір қойылған нүкте сәйкес келуі керек */
  function check(cfg, g) {
    const pts = (g && g.points) || [];
    if (!pts.length) return { status: 'empty' };
    const need = cfg.points, used = new Array(pts.length).fill(false), marks = new Array(pts.length).fill(false);
    let matched = 0;
    need.forEach(([nx, ny]) => {
      let best = -1, bd = Infinity;
      pts.forEach(([px, py], i) => {
        if (used[i]) return;
        if (Math.abs(px - nx) <= cfg.tol.x + 1e-9 && Math.abs(py - ny) <= cfg.tol.y + 1e-9) {
          const d = Math.abs(px - nx) / cfg.x.max + Math.abs(py - ny) / cfg.y.max;
          if (d < bd) { bd = d; best = i; }
        }
      });
      if (best >= 0) { used[best] = true; marks[best] = true; matched++; }
    });
    const extra = pts.length - matched;
    const found = t('grFound', { a: matched, b: need.length, n: pts.length });
    if (matched === need.length && extra === 0) return { status: 'ok', found, matched, extra, marks };
    const fb = t('grFb', { a: matched, b: need.length }) + (extra ? ' ' + t('grExtra', { n: extra }) : '') + ' ' + t('grHint');
    return { status: 'wrong', found, fb, matched, extra, marks };
  }

  function render(cfg, rec, onChange) {
    rec.graph = rec.graph || { points: [] };
    const pts = rec.graph.points = rec.graph.points || [];
    const pw = W - M.l - M.r, ph = H - M.t - M.b;
    const X = (v) => M.l + (v - cfg.x.min) / (cfg.x.max - cfg.x.min) * pw;
    const Y = (v) => M.t + ph - (v - cfg.y.min) / (cfg.y.max - cfg.y.min) * ph;
    const svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'gr-svg', role: 'img', 'aria-label': cfg.title + ': ' + cfg.x.label + ' — ' + cfg.y.label });

    // тор: ұсақ және негізгі сызықтар
    const grid = S('g', { class: 'gr-grid' });
    for (let v = cfg.x.min; v <= cfg.x.max + 1e-9; v += cfg.x.snap) grid.append(S('line', { x1: X(v), y1: Y(cfg.y.min), x2: X(v), y2: Y(cfg.y.max), class: Math.abs(v / cfg.x.major - Math.round(v / cfg.x.major)) < 1e-9 ? 'maj' : 'min' }));
    for (let v = cfg.y.min; v <= cfg.y.max + 1e-9; v += cfg.y.snap) grid.append(S('line', { x1: X(cfg.x.min), y1: Y(v), x2: X(cfg.x.max), y2: Y(v), class: Math.abs(v / cfg.y.major - Math.round(v / cfg.y.major)) < 1e-9 ? 'maj' : 'min' }));
    svg.append(grid);
    // осьтер мен белгілер
    const ax = S('g', { class: 'gr-axes' });
    ax.append(S('line', { x1: X(cfg.x.min), y1: Y(cfg.y.min), x2: X(cfg.x.max), y2: Y(cfg.y.min) }), S('line', { x1: X(cfg.x.min), y1: Y(cfg.y.min), x2: X(cfg.x.min), y2: Y(cfg.y.max) }));
    for (let v = cfg.x.min; v <= cfg.x.max + 1e-9; v += cfg.x.major) ax.append(S('text', { x: X(v), y: Y(cfg.y.min) + 22, 'text-anchor': 'middle', class: 'tk' }, fmt(v)));
    for (let v = cfg.y.min; v <= cfg.y.max + 1e-9; v += cfg.y.major) ax.append(S('text', { x: X(cfg.x.min) - 10, y: Y(v) + 5, 'text-anchor': 'end', class: 'tk' }, fmt(v)));
    ax.append(S('text', { x: X(cfg.x.max), y: H - 10, 'text-anchor': 'end', class: 'ttl' }, cfg.x.label), S('text', { x: 18, y: M.t + 6, 'text-anchor': 'start', class: 'ttl' }, cfg.y.label));
    svg.append(ax);
    const ghost = S('circle', { r: 7, class: 'gr-ghost', cx: -50, cy: -50 });
    const refLayer = S('g', { class: 'gr-ref-layer' });
    const lineLayer = S('g', { class: 'gr-lines' });
    const layer = S('g', { class: 'gr-pts' });
    svg.append(refLayer, lineLayer, ghost, layer);
    const readout = el('div', { class: 'gr-read', 'aria-live': 'polite', text: t('grReadIdle') });
    const count = el('span', { class: 'gr-count' });
    let marks = null;

    const draw = () => {
      layer.innerHTML = ''; lineLayer.innerHTML = ''; refLayer.innerHTML = '';
      // тексеруден кейін ДҰРЫС график (сызық пен нүктелер) осы графиктің өзінде көрсетіледі
      if (marks) {
        const rp = [...cfg.points].sort((a, b) => a[0] - b[0]);
        refLayer.append(S('polyline', { class: 'gr-line ref', fill: 'none', points: rp.map(([x, y]) => X(x) + ',' + Y(y)).join(' ') }));
        rp.forEach(([x, y]) => refLayer.append(S('circle', { cx: X(x), cy: Y(y), r: 13, class: 'gr-target' })));
      }
      // тексеруден кейін оқушы нүктелері x бойынша сұрыпталып, сызықпен қосылады
      if (marks && pts.length > 1) {
        const sorted = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        lineLayer.append(S('polyline', { class: 'gr-line', fill: 'none', points: sorted.map(([x, y]) => X(x) + ',' + Y(y)).join(' ') }));
      }
      pts.forEach(([x, y], i) => {
        const c = S('circle', { cx: X(x), cy: Y(y), r: 8, class: 'gr-pt' + (marks ? (marks[i] ? ' ok' : ' bad') : '') });
        c.append(S('title', null, cfg.x.label.split(',')[0] + ' = ' + fmt(x) + '; ' + cfg.y.label.split(',')[0] + ' = ' + fmt(y)));
        layer.append(c);
      });
      count.textContent = t('grCount', { n: pts.length });
    };
    const snap = (e) => {
      const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
      const q = p.matrixTransform(svg.getScreenCTM().inverse());
      let x = cfg.x.min + (q.x - M.l) / pw * (cfg.x.max - cfg.x.min), y = cfg.y.min + (M.t + ph - q.y) / ph * (cfg.y.max - cfg.y.min);
      if (x < cfg.x.min - cfg.x.snap || x > cfg.x.max + cfg.x.snap || y < cfg.y.min - cfg.y.snap || y > cfg.y.max + cfg.y.snap) return null;
      x = Math.min(cfg.x.max, Math.max(cfg.x.min, Math.round(x / cfg.x.snap) * cfg.x.snap));
      y = Math.min(cfg.y.max, Math.max(cfg.y.min, Math.round(y / cfg.y.snap) * cfg.y.snap));
      return [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000];
    };
    let hideAfterEdit = null;
    const changed = () => { marks = null; draw(); if (hideAfterEdit) hideAfterEdit(); onChange && onChange(); };
    svg.addEventListener('pointermove', (e) => {
      const p = snap(e);
      if (!p) { ghost.setAttribute('cx', -50); readout.textContent = t('grReadIdle'); return; }
      ghost.setAttribute('cx', X(p[0])); ghost.setAttribute('cy', Y(p[1]));
      readout.textContent = cfg.x.label.split(',')[0] + ' = ' + fmt(p[0]) + ' ' + cfg.x.label.split(', ')[1] + ';  ' + cfg.y.label.split(',')[0] + ' = ' + fmt(p[1]) + ' ' + cfg.y.label.split(', ')[1];
    });
    svg.addEventListener('pointerleave', () => { ghost.setAttribute('cx', -50); readout.textContent = t('grReadIdle'); });
    svg.addEventListener('click', (e) => {
      const p = snap(e); if (!p) return;
      const i = pts.findIndex(q => q[0] === p[0] && q[1] === p[1]);
      if (i >= 0) pts.splice(i, 1); else pts.push(p);
      changed();
    });
    const undo = el('button', { type: 'button', class: 'btn btn-outline', onclick: () => { pts.pop(); changed(); } }, [PL.icon('undo', 15), document.createTextNode(t('grUndo'))]);
    const clr = el('button', { type: 'button', class: 'btn btn-outline', onclick: () => { pts.length = 0; changed(); } }, [PL.icon('trash', 15), document.createTextNode(t('grClear'))]);
    draw();

    // ── Графикті жеке тексеру (түйме графиктің астында) ──
    const result = el('div', { class: 'gr-result', hidden: '' });
    const legend = el('div', { class: 'gr-legend', hidden: '' }, [
      el('span', { class: 'lg lg-line' }), el('span', { text: t('grLgRef') }),
      el('span', { class: 'lg lg-ok' }), el('span', { text: t('grLgOk') }),
      el('span', { class: 'lg lg-bad' }), el('span', { text: t('grLgBad') })
    ]);
    const showCheck = (silent) => {
      const res = check(cfg, rec.graph);
      if (res.status === 'empty') { marks = null; draw(); result.hidden = false; legend.hidden = true; result.className = 'gr-result warn'; result.textContent = t('grNeedPts'); return res; }
      marks = res.marks; draw();
      result.hidden = false; result.className = 'gr-result ' + (res.status === 'ok' ? 'ok' : 'bad');
      result.innerHTML = '';
      result.append(el('b', { text: res.status === 'ok' ? t('grOk') : t('grNotYet') }), document.createTextNode(' ' + (res.status === 'ok' ? res.found : res.fb)));
      legend.hidden = false;
      return res;
    };
    const verify = el('button', { type: 'button', class: 'btn btn-primary gr-verify', onclick: () => showCheck() }, [PL.icon('checkCircle', 15), document.createTextNode(t('grCheck'))]);
    // нүкте өзгерсе — ескі нәтиже мен дұрыс график жасырылады (қайта тексеру қажет)
    const hideRes = () => { result.hidden = true; legend.hidden = true; };
    const node = el('div', { class: 'gr-box' }, [
      el('div', { class: 'gr-head' }, [PL.icon('penTool', 16), el('b', { text: cfg.title }), el('span', { class: 'gr-hint', text: t('grHow') })]),
      el('div', { class: 'gr-wrap' }, [svg]),
      el('div', { class: 'gr-foot' }, [readout, el('span', { class: 'grow' }), count, undo, clr]),
      el('div', { class: 'gr-bottom' }, [verify]),
      result, legend
    ]);
    hideAfterEdit = hideRes;
    return { node, paint: (res) => { marks = res && res.marks ? res.marks : null; draw(); } };
  }

  return { render, check, has };
})();
