/*
 * «Менің шешуім» — клавиатурамен жазу режимі.
 * Word-тағы «Теңдеу» таспасына ұқсас құралдар: Формула, Юникод/LaTeX/Мәтін, Түрлендіру, Таңбалар,
 * Бөлшек, Индекс, Түбір, Интеграл, Үлкен оператор, Жақша, Функция, Диакритикалық белгілер,
 * Шек және логарифм, Оператор, Матрица (+ физикалық бірліктер).
 * Әр жол не формула (MathLive <math-field> немесе сызықтық LaTeX), не мәтін.
 */
window.PL = window.PL || {};
PL.Editor = (function () {
  const { el } = PL.render;
  const t = (k, v) => PL.t(k, v);

  // ── Таспа мазмұны ──
  const PHYS = ['F=m\\cdot g', 'P=m\\cdot g', '\\rho=\\frac{m}{V}', 'm=\\rho\\cdot V', 'V=\\frac{m}{\\rho}', 'V=a\\cdot b\\cdot c', 'V=V_2-V_1',
    'F=k\\cdot\\Delta l', 'k=\\frac{F}{\\Delta l}', '\\Delta l=\\frac{F}{k}', '\\Delta l=l-l_0', 'g=\\frac{P}{m}', 'R=F_1+F_2', 'R=F_1-F_2'];
  const SYM_GALLERY = ['\\pm', '\\infty', '=', '\\ne', '\\sim', '\\times', '\\div', '!', '\\propto', '<', '\\ll', '>'];
  const SYM_BASIC = SYM_GALLERY.concat(['\\gg', '\\le', '\\ge', '\\approx', '\\equiv', '\\cdot', '^{\\circ}', '\\prime', '\\partial', '\\nabla', '\\%', '\\perp', '\\parallel', '\\angle', '\\triangle', '\\cdots']);
  const SYM_GREEK = ['\\alpha', '\\beta', '\\gamma', '\\delta', '\\varepsilon', '\\eta', '\\theta', '\\lambda', '\\mu', '\\nu', '\\pi', '\\rho', '\\sigma', '\\tau', '\\varphi', '\\omega', '\\Delta', '\\Theta', '\\Lambda', '\\Pi', '\\Sigma', '\\Phi', '\\Omega'];
  const SYM_ARROWS = ['\\to', '\\leftarrow', '\\uparrow', '\\downarrow', '\\leftrightarrow', '\\Rightarrow', '\\Leftarrow', '\\Leftrightarrow', '\\nearrow', '\\searrow', '\\nwarrow', '\\swarrow', '\\uparrow\\downarrow'];
  const MENUS = {
    frac: ['\\frac{#0}{#?}', '#0/#?', '\\tfrac{#0}{#?}', '\\frac{\\Delta #0}{\\Delta #?}', '\\frac{1}{2}', '\\frac{m}{V}', '\\frac{F}{k}', '\\frac{F}{\\Delta l}'],
    index: ['#@^{#?}', '#@_{#?}', '#@_{#?}^{#?}', '{}_{#?}^{#?}#0', 'x^{2}', 'x_{1}', 'F_{1}', 'l_{0}', '10^{-6}', '\\text{м}^{3}'],
    root: ['\\sqrt{#0}', '\\sqrt[#?]{#0}', '\\sqrt[3]{#0}', '\\sqrt{#0^{2}+#?^{2}}'],
    integral: ['\\int #0', '\\int_{#?}^{#?} #0', '\\iint #0', '\\oint #0'],
    largeop: ['\\sum #0', '\\sum_{#?}^{#?} #0', '\\sum_{i=1}^{n} #0', '\\prod_{#?}^{#?} #0'],
    bracket: ['\\left(#0\\right)', '\\left[#0\\right]', '\\left\\{#0\\right\\}', '\\left|#0\\right|', '\\left\\langle #0\\right\\rangle', '\\left\\lfloor #0\\right\\rfloor', '\\left\\lceil #0\\right\\rceil'],
    func: ['\\sin #0', '\\cos #0', '\\tan #0', '\\cot #0', '\\log #0', '\\ln #0', '\\lg #0', '\\exp #0'],
    accent: ['\\vec{#0}', '\\overrightarrow{#0}', '\\bar{#0}', '\\overline{#0}', '\\hat{#0}', '\\dot{#0}', '\\ddot{#0}', '\\tilde{#0}', '\\underline{#0}'],
    limlog: ['\\lim_{#?\\to #?} #0', '\\lim_{n\\to\\infty} #0', '\\log_{#?} #0', '\\ln #0', '\\max #0', '\\min #0'],
    operator: ['\\to', '\\Rightarrow', '\\Leftrightarrow', '\\leftarrow', '\\equiv', '\\approx', '\\propto', '\\pm', '\\mp', '\\overset{#?}{=}', '\\xrightarrow{#?}'],
    matrix: ['\\begin{pmatrix}#?&#?\\\\#?&#?\\end{pmatrix}', '\\begin{bmatrix}#?&#?\\\\#?&#?\\end{bmatrix}', '\\begin{vmatrix}#?&#?\\\\#?&#?\\end{vmatrix}', '\\begin{pmatrix}#?&#?\\end{pmatrix}', '\\begin{pmatrix}#?\\\\#?\\end{pmatrix}', '\\begin{cases}#?\\\\#?\\end{cases}'],
    units: ['\\,\\text{Н}', '\\,\\text{кН}', '\\,\\text{кг}', '\\,\\text{г}', '\\,\\text{т}', '\\,\\text{м}', '\\,\\text{см}', '\\,\\text{мм}', '\\,\\text{м}^3', '\\,\\text{см}^3',
      '\\,\\text{мл}', '\\,\\text{л}', '\\,\\text{кг}/\\text{м}^3', '\\,\\text{г}/\\text{см}^3', '\\,\\text{Н}/\\text{м}', '\\,\\text{Н}/\\text{кг}', '\\,\\text{м}/\\text{с}']
  };
  const ICONS = {
    phys: '\\pi', convert: 'e^{x}', frac: '\\frac{x}{y}', index: 'e^{x}', root: '\\sqrt[n]{x}', integral: '\\int_{-x}^{x}', largeop: '\\sum_{i=0}^{n}',
    bracket: '\\{()\\}', func: '\\sin\\theta', accent: '\\ddot{a}', limlog: '\\lim_{n\\to\\infty}', operator: '\\overset{\\Delta}{=}', matrix: '\\left[\\begin{smallmatrix}1&0\\\\0&1\\end{smallmatrix}\\right]', units: '\\text{Н}'
  };

  const preview = (latex) => latex.replace(/#[0?@]/g, '\\square');
  function texNode(latex, display) {
    const s = document.createElement('span');
    s.className = 'rb-tex';
    try { katex.render(preview(latex), s, { throwOnError: false, strict: 'ignore', displayMode: !!display }); } catch (e) { s.textContent = latex; }
    return s;
  }
  // LaTeX → сызықтық жолға қою үшін бос орындарды алып тастау
  const linear = (latex) => latex.replace(/#[0?@]/g, '');
  // Мәтін жолына қойылатын Юникод баламасы (қарапайым белгілер үшін)
  const UNI = { '\\pm': '±', '\\infty': '∞', '\\ne': '≠', '\\sim': '~', '\\times': '×', '\\div': '÷', '\\propto': '∝', '\\ll': '≪', '\\gg': '≫', '\\le': '≤', '\\ge': '≥', '\\approx': '≈', '\\equiv': '≡', '\\cdot': '·',
    '^{\\circ}': '°', '\\prime': '′', '\\partial': '∂', '\\nabla': '∇', '\\%': '%', '\\perp': '⊥', '\\parallel': '∥', '\\angle': '∠', '\\triangle': '△', '\\cdots': '⋯', '\\to': '→', '\\leftarrow': '←', '\\uparrow': '↑',
    '\\downarrow': '↓', '\\leftrightarrow': '↔', '\\Rightarrow': '⇒', '\\Leftarrow': '⇐', '\\Leftrightarrow': '⇔', '\\nearrow': '↗', '\\searrow': '↘', '\\nwarrow': '↖', '\\swarrow': '↙', '\\mp': '∓',
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\varepsilon': 'ε', '\\eta': 'η', '\\theta': 'θ', '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\pi': 'π', '\\rho': 'ρ', '\\sigma': 'σ', '\\tau': 'τ',
    '\\varphi': 'φ', '\\omega': 'ω', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Phi': 'Φ', '\\Omega': 'Ω' };

  function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; }

  // ── Ашылмалы мәзір ──
  let openMenu = null;
  function closeMenu() { if (openMenu) { openMenu.remove(); openMenu = null; document.removeEventListener('pointerdown', outside, true); } }
  function outside(e) { if (openMenu && !openMenu.contains(e.target) && !e.target.closest('.rb-has-menu')) closeMenu(); }
  function showMenu(anchor, sections, onPick, cls) {
    closeMenu();
    const m = el('div', { class: 'rb-menu ' + (cls || ''), role: 'menu' });
    sections.forEach(sec => {
      if (sec.title) m.append(el('div', { class: 'rb-menu-title', text: sec.title }));
      const grid = el('div', { class: 'rb-menu-grid' + (sec.wide ? ' wide' : '') });
      sec.items.forEach(item => {
        const latex = typeof item === 'string' ? item : item.latex;
        const b = el('button', { type: 'button', class: 'rb-tile', role: 'menuitem', title: item.title || latex });
        if (item.label) b.append(el('span', { class: 'rb-tile-label', text: item.label }));
        else b.append(texNode(latex, sec.display));
        b.addEventListener('mousedown', e => e.preventDefault());
        b.addEventListener('click', () => { closeMenu(); onPick(item); });
        grid.append(b);
      });
      m.append(grid);
    });
    document.body.append(m);
    const r = anchor.getBoundingClientRect();
    const mw = m.offsetWidth, mh = m.offsetHeight;
    let left = Math.min(r.left, window.innerWidth - mw - 8); left = Math.max(8, left);
    let top = r.bottom + 4; if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
    m.style.left = left + 'px'; m.style.top = top + 'px';
    openMenu = m; m._anchor = anchor;
    setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
    const onKey = (e) => { if (e.key === 'Escape') { closeMenu(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
  }

  /* ═════════ ҚАЗАҚША ЭКРАН ПЕРНЕТАҚТАСЫ (MathLive виртуал пернетақтасына қосылады) ═════════
     Қазақ әріптері (ә і ң ғ ү ұ қ ө һ), кирилл ЙЦУКЕН орналасуы, Shift (бас әріп), бос орын, өшіру, жаңа жол. */
  function setupKazakhKeyboard() {
    const vk = window.mathVirtualKeyboard;
    if (!vk || vk.__kz) return;
    const k = (lo, up, w) => ({ label: lo, insert: lo, width: w || 1, shift: { label: up || lo.toUpperCase(), insert: up || lo.toUpperCase() } });
    const row = (str) => str.split(' ').map(c => k(c));
    const kz = {
      label: 'ҚАЗ', tooltip: 'Қазақша пернетақта',
      rows: [
        row('ә і ң ғ ү ұ қ ө һ'),
        row('й ц у к е н г ш щ з х ъ'),
        row('ф ы в а п р о л д ж э'),
        [{ label: '<svg class="svg-glyph" viewBox="0 0 20 20" width="18" height="18"><path d="M10 3 3 11h4v5h6v-5h4z" fill="currentColor"/></svg>', class: 'shift', width: 1.5, command: ['performWithFeedback', 'toggleShift'] }]
          .concat(row('я ч с м и т ь б ю'), [{ label: '<svg class="svg-glyph" viewBox="0 0 20 20" width="18" height="18"><path d="M7 4h10v12H7l-5-6zM9 8l4 4M13 8l-4 4" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>', class: 'action', width: 1.5, command: ['performWithFeedback', 'deleteBackward'] }]),
        [{ label: '.', insert: '.' }, { label: ',', insert: ',' }, { label: '(', insert: '(' }, { label: ')', insert: ')' },
         { label: '␣', class: 'big', insert: '\\:', width: 3 },
         { label: ':', insert: ':' }, { label: ';', insert: ';' }, { label: '?', insert: '?' }, { label: '=', insert: '=' },
         { label: '↵', class: 'action', width: 1.5, command: ['performWithFeedback', 'commit'] }]
      ]
    };
    try { vk.layouts = ['numeric', kz, 'symbols', 'alphabetic', 'greek']; vk.__kz = true; } catch (e) {}
  }

  class Editor {
    constructor(container, lines, onChange) {
      setupKazakhKeyboard();
      this.root = container;
      this.onChange = onChange || (() => {});
      this.lastFocus = null;
      this.mathOK = !!window.MathfieldElement;
      this.build();
      const init = (lines && lines.length) ? lines : [{ t: 'm', v: '' }];
      init.forEach(l => this.addLine(l.t, l.v, null, false, l.view));
    }

    // ═════════ ТАСПА ═════════
    build() {
      const rb = el('div', { class: 'ribbon', role: 'toolbar', 'aria-label': t('toolbarAria') });
      const grp = (cls, kids) => el('div', { class: 'rb-group ' + (cls || '') }, kids);
      const keepFocus = (b) => { b.addEventListener('mousedown', e => e.preventDefault()); return b; };

      const bigBtn = (key, labelKey, sections, onPick) => {
        const b = keepFocus(el('button', { type: 'button', class: 'rb-big rb-has-menu', title: t(labelKey), 'aria-haspopup': 'menu' }, [
          el('span', { class: 'rb-icon' }, [texNode(ICONS[key])]),
          el('span', { class: 'rb-label' }, [document.createTextNode(t(labelKey)), el('span', { class: 'rb-caret', text: '▾' })])
        ]));
        b.addEventListener('click', () => (openMenu && openMenu._anchor === b ? closeMenu() : showMenu(b, sections(), onPick || (it => this.insertLatex(it)))));
        return b;
      };
      const smallBtn = (key, labelKey, sections) => {
        const b = keepFocus(el('button', { type: 'button', class: 'rb-small rb-has-menu', title: t(labelKey), 'aria-haspopup': 'menu' }, [
          el('span', { class: 'rb-sicon' }, [texNode(ICONS[key])]),
          el('span', { class: 'rb-slabel', text: t(labelKey) }), el('span', { class: 'rb-caret', text: '▾' })
        ]));
        b.addEventListener('click', () => (openMenu && openMenu._anchor === b ? closeMenu() : showMenu(b, sections(), it => this.insertLatex(it))));
        return b;
      };
      const one = (key) => () => [{ items: MENUS[key], display: key === 'integral' || key === 'largeop' || key === 'matrix' || key === 'limlog' }];

      // 1) Формула (дайын физика формулалары)
      const physBtn = bigBtn('phys', 'rFormula', () => [{ title: t('rPhys'), items: PHYS, wide: true }], it => this.insertLatex(it, true));

      // 2) Юникод / LaTeX / Мәтін
      this.modeBtns = {};
      const modeCol = el('div', { class: 'rb-modes' });
      [['uni', '/', 'rUnicode'], ['latex', '{ }', 'rLatex'], ['text', 'ab', 'rText']].forEach(([id, ic, lk]) => {
        const b = keepFocus(el('button', { type: 'button', class: 'rb-mode', title: t(lk) }, [el('span', { class: 'rb-mode-ic', text: ic }), document.createTextNode(t(lk))]));
        b.addEventListener('click', () => this.setInputMode(id));
        this.modeBtns[id] = b; modeCol.append(b);
      });

      // 3) Түрлендіру
      const convBtn = keepFocus(el('button', { type: 'button', class: 'rb-big rb-has-menu', title: t('rConvert'), 'aria-haspopup': 'menu' }, [
        el('span', { class: 'rb-icon' }, [texNode(ICONS.convert)]),
        el('span', { class: 'rb-label' }, [document.createTextNode(t('rConvert')), el('span', { class: 'rb-caret', text: '▾' })])
      ]));
      convBtn.addEventListener('click', () => (openMenu && openMenu._anchor === convBtn ? closeMenu() : showMenu(convBtn, [{ items: [
        { id: 'prof', label: t('rConvProf') }, { id: 'lin', label: t('rConvLin') }, { id: 'allprof', label: t('rConvAllProf') }, { id: 'alllin', label: t('rConvAllLin') }
      ], wide: true }], it => this.convert(it.id), 'rb-list')));

      // 4) Таңбалар галереясы
      const gal = el('div', { class: 'rb-gallery' });
      SYM_GALLERY.forEach(s => {
        const b = keepFocus(el('button', { type: 'button', class: 'rb-sym', title: s }, [texNode(s)]));
        b.addEventListener('click', () => this.insertLatex(s));
        gal.append(b);
      });
      const more = keepFocus(el('button', { type: 'button', class: 'rb-more rb-has-menu', title: t('rMore'), 'aria-label': t('rMore'), text: '›' }));
      more.addEventListener('click', () => (openMenu && openMenu._anchor === more ? closeMenu() : showMenu(more, [
        { title: t('rBasic'), items: SYM_BASIC }, { title: t('rGreek'), items: SYM_GREEK }, { title: t('rArrows'), items: SYM_ARROWS }
      ], it => this.insertLatex(it), 'rb-symbols')));

      // 5) Құрылымдар
      const structs = [
        bigBtn('frac', 'rFrac', one('frac')), bigBtn('index', 'rIndex', one('index')), bigBtn('root', 'rRoot', one('root')),
        bigBtn('integral', 'rIntegral', one('integral')), bigBtn('largeop', 'rLargeOp', one('largeop'))
      ];
      const col1 = el('div', { class: 'rb-col' }, [smallBtn('bracket', 'rBracket', one('bracket')), smallBtn('func', 'rFunc', one('func')), smallBtn('accent', 'rAccent', one('accent'))]);
      const col2 = el('div', { class: 'rb-col' }, [smallBtn('limlog', 'rLimLog', one('limlog')), smallBtn('operator', 'rOperator', one('operator')), smallBtn('matrix', 'rMatrix', one('matrix'))]);

      // 6) Бірліктер + экран пернетақтасы
      const units = bigBtn('units', 'rUnits', () => [{ items: MENUS.units, wide: false }]);
      const vk = keepFocus(el('button', { type: 'button', class: 'rb-big', title: t('rVkbd') }, [el('span', { class: 'rb-icon' }, [PL.icon('keyboard', 18)]), el('span', { class: 'rb-label', text: t('rVkbd') })]));
      vk.addEventListener('click', () => {
        if (!window.mathVirtualKeyboard) return;
        const mf = this.lastFocus && this.lastFocus.tagName === 'MATH-FIELD' ? this.lastFocus : this.list.querySelector('math-field');
        if (mf) mf.focus();
        window.mathVirtualKeyboard.visible ? window.mathVirtualKeyboard.hide() : window.mathVirtualKeyboard.show();
      });

      rb.append(
        grp('', [physBtn]), grp('', [modeCol]), grp('', [convBtn]),
        grp('rb-gal-wrap', [gal, more]),
        grp('', structs), grp('', [col1, col2]), grp('', [units, vk])
      );

      this.list = el('div', { class: 'editor-lines' });
      const add = el('div', { class: 'editor-add' }, [
        el('button', { type: 'button', class: 'btn btn-outline', text: t('addFormula'), onclick: () => this.addLine('m', '', this.currentLine(), true) }),
        el('button', { type: 'button', class: 'btn btn-outline', text: t('addText'), onclick: () => this.addLine('t', '', this.currentLine(), true) })
      ]);
      if (!this.mathOK) this.root.append(el('div', { class: 'notice warn', text: t('mathFail') }));
      this.root.append(el('div', { class: 'ribbon-wrap' }, [rb]), this.list, add, el('div', { class: 'kbd-hint', html: t('edHint') }));
      this.updateModeButtons();
    }

    currentLine() { return this.lastFocus && this.lastFocus.isConnected ? this.lastFocus.closest('.ed-line') : null; }

    updateModeButtons() {
      const line = this.currentLine();
      const f = this.lastFocus;
      let mode = 'uni';
      if (line && line.dataset.kind === 't') mode = 'text';
      else if (line && line.dataset.view === 'lin') mode = 'latex';
      else if (f && f.tagName === 'MATH-FIELD' && f.mode === 'text') mode = 'text';
      Object.entries(this.modeBtns).forEach(([k, b]) => b.classList.toggle('active', k === mode));
    }

    setInputMode(id) {
      let line = this.currentLine();
      if (!line) line = this.list.querySelector('.ed-line');
      if (!line) return;
      if (id === 'latex') {
        if (line.dataset.kind === 't') line = this.toggleKind(line);
        if (line.dataset.view !== 'lin') line = this.setView(line, 'lin');
      } else if (id === 'uni') {
        if (line.dataset.kind === 't') line = this.toggleKind(line);
        if (line.dataset.view === 'lin') line = this.setView(line, 'prof');
        const f = line.children[1];
        if (f.tagName === 'MATH-FIELD') { f.focus(); try { f.executeCommand(['switchMode', 'math']); } catch (e) {} }
      } else if (id === 'text') {
        const f = line.children[1];
        if (line.dataset.kind === 'm' && f.tagName === 'MATH-FIELD') { f.focus(); try { f.executeCommand(['switchMode', 'text']); } catch (e) {} }
        else if (line.dataset.kind === 'm') line = this.toggleKind(line);
      }
      setTimeout(() => this.updateModeButtons(), 30);
    }

    convert(id) {
      if (id === 'allprof' || id === 'alllin') {
        [...this.list.children].forEach(l => { if (l.dataset.kind === 'm') this.setView(l, id === 'allprof' ? 'prof' : 'lin', false); });
        this.onChange(); return;
      }
      const line = this.currentLine() || this.list.querySelector('.ed-line[data-kind="m"]');
      if (line && line.dataset.kind === 'm') this.setView(line, id === 'prof' ? 'prof' : 'lin');
    }

    // ═════════ ЖОЛДАР ═════════
    makeField(kind, value, view) {
      if (kind === 'm' && this.mathOK && view !== 'lin') {
        const mf = new MathfieldElement();
        mf.mathVirtualKeyboardPolicy = 'manual';
        mf.smartFence = true;
        // Формула жолында да бос орын пернесі сөздерді бөледі (әйтпесе «Жауабы 3 Н» → «Жауабы3Н» болып бірігеді)
        try { mf.mathModeSpace = '\\:'; } catch (e) {}
        try { mf.value = value || ''; } catch (e) {}
        mf.setAttribute('aria-label', t('formulaLine'));
        mf.addEventListener('input', () => this.onChange());
        mf.addEventListener('focusin', () => { this.lastFocus = mf; this.updateModeButtons(); });
        mf.addEventListener('mode-change', () => this.updateModeButtons());
        mf.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); this.addLine('m', '', mf.closest('.ed-line'), true); }
          else if (e.key === 'Backspace' && !mf.value) { e.preventDefault(); this.removeLine(mf.closest('.ed-line'), true); }
        }, true);
        return mf;
      }
      const isLatex = kind === 'm';
      const ta = el('textarea', { rows: '1', class: isLatex ? 'latex-src' : '', 'aria-label': isLatex ? t('formulaLine') + ' (LaTeX)' : t('textLine'), placeholder: isLatex ? t('latexPh') : t('phTextLine'), spellcheck: isLatex ? 'false' : 'true' });
      ta.value = value || '';
      ta.addEventListener('input', () => { autoGrow(ta); this.onChange(); });
      ta.addEventListener('focus', () => { this.lastFocus = ta; this.updateModeButtons(); });
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.addLine(kind, '', ta.closest('.ed-line'), true, isLatex ? 'lin' : undefined); }
        else if (e.key === 'Backspace' && !ta.value) { e.preventDefault(); this.removeLine(ta.closest('.ed-line'), true); }
      });
      setTimeout(() => autoGrow(ta), 0);
      return ta;
    }

    addLine(kind, value, after, focus, view) {
      const v = kind === 'm' ? (view === 'lin' ? 'lin' : 'prof') : '';
      const field = this.makeField(kind, value, v);
      const line = el('div', { class: 'ed-line kind-' + kind + (v === 'lin' ? ' view-lin' : '') });
      line.dataset.kind = kind; if (v) line.dataset.view = v;
      const kindBtn = el('button', { type: 'button', class: 'ed-kind', title: kind === 'm' ? t('kindToggleM') : t('kindToggleT'), text: kind === 'm' ? (v === 'lin' ? '{ }' : '∑') : 'Aa' });
      kindBtn.addEventListener('click', () => this.toggleKind(line));
      const tools = el('div', { class: 'ed-tools' }, [
        el('button', { type: 'button', title: t('lineUp'), 'aria-label': t('lineUp'), text: '↑', onclick: () => { const p = line.previousElementSibling; if (p) { this.list.insertBefore(line, p); this.onChange(); } } }),
        el('button', { type: 'button', title: t('lineDown'), 'aria-label': t('lineDown'), text: '↓', onclick: () => { const n = line.nextElementSibling; if (n) { this.list.insertBefore(n, line); this.onChange(); } } }),
        el('button', { type: 'button', title: t('lineCopy'), 'aria-label': t('lineCopy'), text: '⧉', onclick: () => { this.addLine(line.dataset.kind, this.valueOf(line), line, true, line.dataset.view); this.onChange(); } }),
        el('button', { type: 'button', title: t('lineDelete'), 'aria-label': t('lineDelete'), text: '✕', onclick: () => this.removeLine(line, false, true) })
      ]);
      line.append(kindBtn, field, tools);
      if (after && after.parentNode === this.list) after.after(line); else this.list.append(line);
      if (focus) {
        const doFocus = (n) => { field.focus(); if (document.activeElement !== field && n < 8) setTimeout(() => doFocus(n + 1), 40); };
        setTimeout(() => doFocus(0), 20);
        this.onChange();
      }
      return line;
    }

    valueOf(line) { return line.children[1].value; }

    setView(line, view, notify) {
      if (line.dataset.kind !== 'm' || (line.dataset.view || 'prof') === view) return line;
      const nl = this.addLine('m', this.valueOf(line), line, true, view);
      line.remove();
      if (notify !== false) this.onChange();
      return nl;
    }

    toggleKind(line) {
      const next = line.dataset.kind === 'm' ? 't' : 'm';
      const nl = this.addLine(next, this.valueOf(line), line, true);
      line.remove();
      this.onChange();
      return nl;
    }

    removeLine(line, focusPrev, force) {
      if (this.list.children.length <= 1) {
        if (force) { line.children[1].value = ''; this.onChange(); }
        return;
      }
      const prev = line.previousElementSibling || line.nextElementSibling;
      line.remove();
      if (focusPrev && prev) setTimeout(() => prev.children[1].focus(), 0);
      this.onChange();
    }

    /* LaTeX үлгісін ағымдағы жолға қою. Мәтін жолы болса — Юникод белгісі немесе жаңа формула жолы. */
    insertLatex(item, newLine) {
      const latex = typeof item === 'string' ? item : item.latex;
      let target = this.lastFocus;
      if (!target || !target.isConnected) target = this.list.querySelector('math-field, textarea');
      if (!target) return;
      const line = target.closest('.ed-line');
      if (newLine && line && this.valueOf(line).trim()) {
        const nl = this.addLine('m', '', line, false);
        target = nl.children[1];
      }
      if (target.tagName === 'MATH-FIELD') {
        target.focus();
        target.insert(latex, { format: 'latex', focus: true, selectionMode: 'placeholder' });
      } else {
        const isText = line && line.dataset.kind === 't';
        let ins;
        if (isText) {
          if (UNI[latex] == null) { // күрделі құрылым — жаңа формула жолына
            const nl = this.addLine('m', '', line, false);
            const f = nl.children[1];
            setTimeout(() => { if (f.tagName === 'MATH-FIELD') { f.focus(); f.insert(latex, { format: 'latex', focus: true, selectionMode: 'placeholder' }); } else { f.value = linear(latex); } this.onChange(); }, 60);
            return;
          }
          ins = UNI[latex];
        } else ins = linear(latex) + ' ';
        const s = target.selectionStart, e = target.selectionEnd;
        target.value = target.value.slice(0, s) + ins + target.value.slice(e);
        target.focus();
        target.selectionStart = target.selectionEnd = s + ins.length;
        autoGrow(target);
      }
      this.onChange();
    }

    getLines() {
      return [...this.list.children].map(line => {
        const o = { t: line.dataset.kind, v: this.valueOf(line) };
        if (line.dataset.view === 'lin') o.view = 'lin';
        return o;
      });
    }
    isEmpty() { return this.getLines().every(l => !String(l.v || '').trim()); }
    appendLines(arr) {
      const last = this.list.lastElementChild;
      if (last && !String(this.valueOf(last)).trim()) last.remove();
      arr.forEach(l => this.addLine(l.t, l.v, null, false));
      if (!this.list.children.length) this.addLine('m', '', null, false);
      this.onChange();
    }
    destroy() { closeMenu(); }
  }
  return Editor;
})();
