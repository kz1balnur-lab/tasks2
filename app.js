/*
 * PHYSICS | 7-СЫНЫП — негізгі қосымша.
 * Навигация КТЖ-дағы САБАҚ ТАҚЫРЫПТАРЫ бойынша (topics-meta.js → PHYS_SECTIONS).
 * Тақырып таңдалғанда: тақырып атауы → оқу мақсаттары (тек ақпарат) → сол тақырыптың барлық тапсырмалары.
 */
window.PL = window.PL || {};
PL.app = (function () {
  const { el, blocks, plain, tex } = PL.render;
  const t = (k, v) => PL.t(k, v);
  const DOC = window.PHYS_TOPICS || [];
  const SECTIONS = window.PHYS_SECTIONS || [];
  const OBJ = window.PHYS_OBJECTIVES || {};
  const CHECKS = window.PHYS_CHECKS || {};
  const LEVEL_ORDER = ['A', 'B', 'C', 'EBQ', 'EXTRA'];

  // ── Индекстер ──
  const GROUPS = {};       // 't1o1' → Word құжатындағы оқу мақсаты (тапсырмалары, «Есте сақта» материалы)
  // Әдебиет/дереккөз жолдары («Оқулық: …», «Қайдан алынған: …») көрсетілмейді
  const SRC_RE = /^\s*(?:<[^>]+>\s*)*(?:Оқулық|Қайдан алынған|Дереккөз|Әдебиет)\s*(?:<[^>]+>\s*)*:/i;
  DOC.forEach(tp => tp.objectives.forEach(o => {
    o.preamble = (o.preamble || []).filter(b => !(b.t === 'p' && SRC_RE.test(b.h || '')));
    GROUPS[o.id] = o;
  }));
  const LESSONS = [];      // КТЖ ретімен
  SECTIONS.forEach(s => s.lessons.forEach(l => { l.id = 'L' + l.no; l.section = s; LESSONS.push(l); }));
  const taskIndex = {};
  LESSONS.forEach(l => (l.groups || []).forEach(g => (GROUPS[g] ? GROUPS[g].tasks : []).forEach(k => { taskIndex[k.id] = { task: k, obj: GROUPS[g], lesson: l }; })));

  const nav = { lesson: null };
  let cards = [];          // ағымдағы беттегі тапсырма карточкалары
  let active = null;       // ИИ көмекші қарап тұрған карточка
  let showOriginal = false;
  const openEBQ = new Set(); // осы сеанста ашылған ЕБҚ тапсырмалары
  let summaryHost = null;    // тақырып бойынша балл
  let teacherMode = false;
  try { teacherMode = sessionStorage.getItem('pl-teacher') === '1'; } catch (e) {}

  const lessonTitle = (l) => PL.tx(l.title);
  const objText = (code) => PL.tx(OBJ[code]) || '';
  const levelLabel = (lv) => t('lv' + lv);
  const pointsLabel = (task) => task.level === 'EXTRA' ? t('notGraded') : t('pts', { n: task.points });
  const sortedTasks = (o) => [...o.tasks].sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
  const escapeHTML = (s) => String(s || '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const scroller = () => document.querySelector('.ws-body');

  // ── Оқушы жазбасы ──
  function rec(id) {
    let r = PL.store.get(id);
    if (!r) {
      const x = taskIndex[id];
      r = { id, lesson: x.lesson.no, objective: x.obj.code, level: x.task.level, lines: [], answers: {}, fill: {}, graph: { points: [] }, board: { items: [], grid: false }, mode: 'kbd', checked: false, teacher: {}, ai: {}, chat: [] };
    }
    return r;
  }
  function boardHas(r) {
    const items = (r.board && r.board.items) || [];
    let start = 0; items.forEach((it, i) => { if (it.type === 'clear') start = i + 1; });
    return items.length - start > 0;
  }
  function hasContent(r) {
    if (!r) return false;
    const lines = (r.lines || []).some(l => String(l.v || '').trim());
    const ans = Object.values(r.answers || {}).some(v => Array.isArray(v) ? v.length : String(v || '').trim()) || PL.ebq.hasContent(r.fill) || PL.graph.has(r.graph);
    return lines || ans || boardHas(r);
  }
  function statusOf(id) {
    const r = PL.store.get(id);
    if (r && r.checked) return 'checked';
    if (hasContent(r)) return 'progress';
    return 'none';
  }
  function statusChip(st) {
    const map = { none: ['', t('stNone')], progress: ['progress', t('stProgress')], checked: ['checked', t('stChecked')] };
    return el('span', { class: 'status-chip ' + map[st][0], text: map[st][1] });
  }

  // ═════════ СОЛ ЖАҚ: БӨЛІМДЕР ЖӘНЕ ТАҚЫРЫПТАР ═════════
  function lessonButton(l, extraCls) {
    const b = el('button', { class: 'lesson-btn ' + (extraCls || '') + (nav.lesson === l.id ? ' active' : ''), 'aria-current': nav.lesson === l.id ? 'page' : null, 'data-lesson': l.id }, [
      el('span', { class: 'lesson-no', text: '№' + l.no }),
      el('span', { class: 'lesson-name', text: lessonTitle(l) })
    ]);
    b.addEventListener('click', () => { openLesson(l.id); closeDrawers(); });
    return b;
  }
  function renderSidebar() {
    const list = document.getElementById('topicList');
    list.innerHTML = '';
    SECTIONS.forEach(s => {
      list.append(el('div', { class: 'nav-section' }, [
        el('div', { class: 'nav-section-title' }, [PL.icon(s.icon, 15), el('span', { text: PL.tx(s.title) })]),
        el('div', { class: 'nav-lessons' }, s.lessons.map(l => lessonButton(l)))
      ]));
    });
  }

  // ═════════ НАВИГАЦИЯ (#L17, #L18 …) ═════════
  function saveNav() {
    try { localStorage.setItem('pl-nav2', JSON.stringify(nav)); } catch (e) {}
    try { history.replaceState(null, '', nav.lesson ? '#' + nav.lesson : location.pathname + location.search); } catch (e) {}
  }
  function openLesson(id) {
    flushAll();
    nav.lesson = id;
    saveNav(); renderSidebar(); renderView();
    scroller().scrollTop = 0;
  }

  // ═════════ ОРТАҢҒЫ БӨЛІК ═════════
  function renderView() {
    destroyCards();
    const view = document.getElementById('view');
    view.innerHTML = '';
    const l = LESSONS.find(x => x.id === nav.lesson);
    if (!l) { view.append(home()); PL.ai.setContext(null); return; }
    renderCrumbs(l);
    const wrap = el('div', { class: 'fade-in' });

    // Тақырып атауы
    const head = el('header', { class: 'page-head' }, [
      el('div', { class: 'eyebrow', text: t('lessonN', { n: l.no }) + ' · ' + PL.tx(l.section.title) }),
      el('h1', { text: lessonTitle(l) })
    ]);
    if (l.detail) head.append(el('div', { class: 'page-meta', text: PL.tx(l.detail) }));
    wrap.append(head);

    // Оқу мақсаттары — тек ақпараттық блок (батырма емес)
    const info = el('section', { class: 'obj-info', 'aria-label': l.objectives.length > 1 ? t('objInfoMany') : t('objInfoOne') }, [
      el('div', { class: 'obj-info-head' }, [PL.icon('target', 16), el('span', { text: l.objectives.length > 1 ? t('objInfoMany') : t('objInfoOne') })])
    ]);
    l.objectives.forEach(code => info.append(el('div', { class: 'obj-info-row' }, [el('span', { class: 'code', text: code }), el('span', { class: 'obj-info-text', text: objText(code) })])));
    if (!l.hideObjectives) wrap.append(info);

    const groups = (l.groups || []).map(g => GROUPS[g]).filter(Boolean);
    if (!groups.length) {
      const box = el('div', { class: 'notice info' }, [el('span', { text: t('noTasks') + ' ' })]);
      if (l.seeLesson) {
        box.append(el('span', { text: t('seeLesson', { n: l.seeLesson }) + ' ' }),
          el('button', { class: 'link-btn', text: t('openLesson', { n: l.seeLesson }), onclick: () => openLesson('L' + l.seeLesson) }));
      }
      wrap.append(box);
      PL.ai.setContext(null);
      view.append(wrap);
      return;
    }

    // Тапсырмалар (нөмірлеу бүкіл тақырып бойынша жалғасады)
    let no = 0;
    groups.forEach(o => {
      const multi = groups.length > 1;
      wrap.append(el('h2', { class: 'section-title' }, multi
        ? [document.createTextNode(t('tasksFor')), el('span', { class: 'code', text: o.code })]
        : [document.createTextNode(t('tasksTitle')), el('span', { class: 'count', text: String(o.tasks.length) })]));
      if (o.preamble.length) {
        const ref = el('details', { class: 'ref' }, [el('summary', {}, [PL.icon('book', 16), document.createTextNode(t('remember'))])]);
        const body = el('div', { class: 'ref-body' });
        renderTranslatable(body, o.id, { preamble: o.preamble }, 'obj', (src) => blocks(src.preamble));
        ref.append(body);
        // «Есте сақта» ішінде тапсырмаларда қолданылатын кесте болса — ашық тұрады
        if (o.preamble.some(b => b.t === 'tbl' || (b.t === 'p' && /кесте/i.test(b.h)))) ref.open = true;
        wrap.append(ref);
      }
      // деңгейлерге жылдам өту
      const jump = el('div', { class: 'level-tabs', role: 'navigation' });
      sortedTasks(o).forEach(k => {
        const st = statusOf(k.id);
        const tab = el('button', { class: 'level-tab lv-' + k.level, 'data-task': k.id, title: t(st === 'checked' ? 'stChecked' : st === 'progress' ? 'stProgress' : 'stNone') }, [
          el('span', { class: 'lv-mark' }), el('span', { text: levelLabel(k.level) }), el('span', { class: 'lv-pts', text: '· ' + pointsLabel(k) }), el('span', { class: 'st-dot ' + st })
        ]);
        tab.addEventListener('click', () => { const x = cards.find(c => c.task.id === k.id); if (x && x.openEBQ) x.openEBQ(true); const c = document.getElementById('task-' + k.id); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        jump.append(tab);
      });
      wrap.append(jump);
      sortedTasks(o).forEach(k => wrap.append(buildTaskCard(k, o, l, ++no)));
    });
    summaryHost = el('section', { class: 'card topic-score', id: 'topicScore', 'aria-live': 'polite' });
    wrap.append(summaryHost);
    renderTopicSummary(l);
    view.append(wrap);
    if (cards.length) setActive(cards[0]);
  }

  /* Жол-навигация: Физика / 7-сынып / II тоқсан / Бөлім / Тақырып */
  function renderCrumbs(l) {
    const c = document.getElementById('crumbs');
    c.innerHTML = '';
    const sep = () => el('span', { class: 'sep', text: '/' });
    const home = () => { flushAll(); nav.lesson = null; saveNav(); renderSidebar(); renderView(); };
    c.append(el('button', { class: 'crumb-hide', text: t('crPhys'), onclick: home }), sep(),
      el('button', { class: 'crumb-hide', text: t('crGrade'), onclick: home }), sep(),
      el('button', { text: t('crTerm'), onclick: home }));
    if (!l) return;
    c.append(sep(), el('span', { class: 'crumb-hide', text: PL.tx(l.section.title) }), sep(), el('span', { class: 'cur', text: lessonTitle(l) }));
  }

  function home() {
    renderCrumbs(null);
    return el('section', { class: 'welcome fade-in' }, [
      el('div', { class: 'eyebrow', text: t('crGrade') + ' · ' + t('crTerm') }),
      el('h1', { text: t('welcomeTitle') }),
      el('p', { text: t('welcomeText') }),
      ...SECTIONS.map(s => el('div', { class: 'home-section' }, [
        el('div', { class: 'section-title' }, [document.createTextNode(PL.tx(s.title))]),
        el('div', { class: 'home-lessons' }, s.lessons.map(l => lessonButton(l, 'home-lesson')))
      ]))
    ]);
  }

  // ── Аударма: тіл қазақша болмаса, Word мазмұнын Claude арқылы аудару ──
  function renderTranslatable(host, id, src, kind, render, onBanner) {
    const lang = PL.getLang();
    const paint = (data) => { host.innerHTML = ''; host.append(render(data)); };
    if (lang === 'kk') { paint(src); return src; }
    const cached = PL.tr.cached(id, src, kind, lang);
    if (cached && !showOriginal) { paint(cached); if (onBanner) onBanner('done'); return cached; }
    paint(src);
    if (showOriginal && cached) { if (onBanner) onBanner('orig'); return src; }
    if (!PL.ai.translateReady()) { if (onBanner) onBanner('need'); return src; }
    if (onBanner) onBanner('loading');
    const lessonAt = nav.lesson;
    const stillHere = () => PL.getLang() === lang && nav.lesson === lessonAt && (kind === 'task' ? cards.some(c => c.task.id === id) : host.isConnected);
    PL.tr.get(id, src, kind, lang).then(tr => {
      if (!stillHere()) return;
      if (kind === 'task') { scheduleRerender(); return; }
      paint(tr);
    }).catch(() => { if (onBanner && stillHere()) onBanner('fail'); });
    return src;
  }
  let rerenderTimer;
  function scheduleRerender() { clearTimeout(rerenderTimer); rerenderTimer = setTimeout(rerenderKeepScroll, 150); }
  function rerenderKeepScroll() {
    const s = scroller(); const y = s.scrollTop;
    flushAll(); renderView(); s.scrollTop = y;
  }

  // ═════════ ТАПСЫРМА КАРТОЧКАСЫ ═════════
  function buildTaskCard(task, obj, lesson, no) {
    const r = rec(task.id);
    const isEBQ = task.level === 'EBQ';
    const card = el('article', { class: 'card task-card lv-' + task.level + (isEBQ ? ' ebq' : ''), id: 'task-' + task.id, 'aria-label': levelLabel(task.level) });
    const cx = { task, obj, lesson, rec: r, card, no };
    cards.push(cx);
    card.addEventListener('pointerdown', () => setActive(cx));
    card.addEventListener('focusin', () => setActive(cx));

    // Аударма
    const items = CHECKS[task.id] || [];
    const src = Object.assign({}, task, { checks: items });
    const banner = el('div', { class: 'tr-banner', hidden: '' });
    const setBanner = (state) => {
      banner.hidden = false; banner.innerHTML = '';
      const msg = { loading: 'trLoading', done: 'trDone', need: 'trNeed', fail: 'trFail', orig: 'trDone' }[state];
      banner.append(el('span', { text: t(msg) }));
      if (state === 'done' || state === 'orig') banner.append(el('button', { class: 'link-btn', text: showOriginal ? t('trShowTr') : t('trShowOrig'), onclick: () => { showOriginal = !showOriginal; rerenderKeepScroll(); } }));
      if (state === 'need') banner.append(el('button', { class: 'link-btn', text: t('aiSettings'), onclick: () => { PL.ai.toggleWidget(true); PL.ai.toggleSettings(true); } }));
      if (state === 'fail') banner.append(el('button', { class: 'link-btn', text: t('trRetry'), onclick: () => rerenderKeepScroll() }));
    };
    const view = renderTranslatable(el('div'), task.id, src, 'task', () => document.createTextNode(''), setBanner) || src;
    cx.view = view;

    // Тақырыпша: ТАПСЫРМА 01 · А деңгейі · 2 балл
    const fsBtn = el('button', { class: 'icon-btn', title: t('fullscreen'), 'aria-label': t('fullscreen'), onclick: () => toggleFullscreen(card, fsBtn) }, [PL.icon('maximize', 16)]);
    cx.statusHost = el('span', {}, [statusChip(statusOf(task.id))]);
    card.append(el('header', { class: 'task-head' }, [
      el('div', {}, [
        el('div', { class: 'task-no', text: t('taskNo') + ' ' + String(no).padStart(2, '0') }),
        el('div', {}, [el('span', { class: 'task-level', text: levelLabel(task.level) }), el('span', { class: 'task-points', text: ' · ' + pointsLabel(task) })])
      ]),
      el('span', { class: 'spacer' }), cx.statusHost, fsBtn
    ]));
    if (PL.getLang() !== 'kk') card.append(banner);

    // Шарты
    const cond = el('section', { class: 'task-section' }, [el('div', { class: 'sec-label', text: t('condition') })]);
    if (isEBQ) cond.append(el('div', { class: 'ebq-banner' }, [PL.icon('info', 18), el('div', { html: t('ebqBanner') })]));
    // ЕБҚ: бос орындарды тапсырма мәтінінің өзінде толтырады (ebq.js); «Тексеру» тек сол өрістерді тексереді
    cx.fillMode = isEBQ && PL.ebq.supports(task);
    if (cx.fillMode) { cx.ebq = PL.ebq.render(task, r, () => onWorkChanged(cx)); cond.append(cx.ebq.node); }
    else {
      const body = blocks(view.condition, { ebq: isEBQ });
      // График салу тапсырмасы: ә) тармағының астына координат торы қойылады (graph.js)
      const gcfg = (window.PHYS_GRAPHS || {})[task.id];
      if (gcfg) {
        const bi = (task.condition || []).findIndex(b => b.t === 'p' && gcfg.afterText.test(PL.render.stripTags(b.h)));
        cx.graph = PL.graph.render(gcfg, r, () => onWorkChanged(cx));
        if (bi >= 0 && body.children[bi]) body.children[bi].after(cx.graph.node); else body.append(cx.graph.node);
      }
      cond.append(body);
    }
    card.append(cond);

    // Менің шешуім
    const sol = el('section', { class: 'task-section' }, [el('div', { class: 'sec-label' }, [document.createTextNode(t('mySolution')), el('span', { class: 'hint', text: t('mySolutionHint') })])]);
    const tabs = el('div', { class: 'mode-tabs', role: 'tablist' });
    const kbdTab = el('button', { role: 'tab' }, [PL.icon('fileText', 15), document.createTextNode(t('modeKbd'))]);
    const brdTab = el('button', { role: 'tab' }, [PL.icon('penTool', 15), document.createTextNode(t('modeBoard'))]);
    tabs.append(kbdTab, brdTab);
    const edHost = el('div'), bdHost = el('div');
    sol.append(tabs, edHost, bdHost);
    cx.editor = new PL.Editor(edHost, r.lines, () => onWorkChanged(cx));
    cx.board = new PL.Board(bdHost, r.board, (data) => { r.board = data; onWorkChanged(cx); });
    cx.board.toolsEl.append(el('button', { class: 'bt bt-ocr', type: 'button', title: t('ocrNote'), onclick: () => handwritingToText(cx) }, [PL.icon('scanText', 16), document.createTextNode(t('ocrBtn'))]));
    cx.board.foot.append(el('span', { text: t('ocrNote') }));
    const setMode = (m) => {
      r.mode = m;
      kbdTab.classList.toggle('active', m === 'kbd'); brdTab.classList.toggle('active', m === 'board');
      kbdTab.setAttribute('aria-selected', String(m === 'kbd')); brdTab.setAttribute('aria-selected', String(m === 'board'));
      edHost.hidden = m !== 'kbd'; bdHost.hidden = m !== 'board';
      if (PL.store.get(r.id) || hasContent(r)) PL.store.put(r, 400);
    };
    kbdTab.addEventListener('click', () => setMode('kbd'));
    brdTab.addEventListener('click', () => setMode('board'));
    cx.setMode = setMode;
    setMode(r.mode || 'kbd');

    // Бөлек жауап өрістері жоқ: «Тексеру» редактордағы толық шешуді оқиды (solcheck.js)
    cx.answerRows = [];
    sol.append(el('div', { class: 'sol-write-hint' }, [PL.icon('info', 16), el('span', { html: t(cx.fillMode ? 'ebqFillHint' : 'solWriteHint') })]));
    card.append(sol);

    // Әрекеттер: Тексеру · Дескриптор
    cx.saveState = el('span', { class: 'save-state', text: r.updatedAt ? t('savedAt', { t: new Date(r.updatedAt).toLocaleTimeString() }) : '' });
    const descBtn = el('button', { class: 'btn btn-outline', 'aria-expanded': 'false' }, [PL.icon('clipboard', 15), document.createTextNode(t('descriptor'))]);
    const checkBtn = el('button', { class: 'btn btn-primary' }, [PL.icon('checkCircle', 15), document.createTextNode(t('check'))]);
    card.append(el('div', { class: 'task-actions' }, [
      checkBtn, descBtn, el('span', { class: 'grow' }), cx.saveState,
      el('button', { class: 'icon-btn', title: t('save'), 'aria-label': t('save'), onclick: () => saveNow(cx, true) }, [PL.icon('save', 16)]),
      el('button', { class: 'icon-btn', title: t('pdf'), 'aria-label': t('pdf'), onclick: () => exportPDF(cx) }, [PL.icon('fileDown', 16)]),
      el('button', { class: 'icon-btn', title: t('clear'), 'aria-label': t('clear'), onclick: () => clearWork(cx) }, [PL.icon('trash', 16)])
    ]));

    cx.descPanel = el('section', { class: 'desc-panel', hidden: '' });
    card.append(cx.descPanel);
    descBtn.addEventListener('click', () => {
      const open = cx.descPanel.hidden;
      if (open) renderDescriptors(cx);
      cx.descPanel.hidden = !open;
      descBtn.setAttribute('aria-expanded', String(open)); descBtn.classList.toggle('active', open);
      if (open) cx.descPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    cx.resultPanel = el('section', { class: 'result-panel', hidden: '' });
    card.append(cx.resultPanel);
    checkBtn.addEventListener('click', () => doCheck(cx, true));
    if (r.checked) showResult(cx, false);

    // ЕБҚ тапсырмасы бірден көрінбейді — батырманы басқанда ғана ашылады
    if (isEBQ) {
      const body = el('div', { class: 'ebq-body', id: 'ebq-body-' + task.id });
      [...card.children].slice(1).forEach(n => body.append(n));
      const lbl = el('span');
      const toggle = el('button', { class: 'btn btn-primary ebq-toggle', type: 'button', 'aria-controls': body.id }, [PL.icon('chevronDown', 15), lbl]);
      const note = el('p', { class: 'ebq-note', text: t('ebqCollapsed') });
      const bar = el('div', { class: 'ebq-collapsed' }, [note, toggle]);
      cx.openEBQ = (open) => {
        body.hidden = !open; note.hidden = open;
        open ? openEBQ.add(task.id) : openEBQ.delete(task.id);
        lbl.textContent = open ? t('ebqClose') : t('ebqOpen');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.classList.toggle('btn-primary', !open); toggle.classList.toggle('btn-outline', open);
        card.classList.toggle('ebq-open', open);
      };
      toggle.addEventListener('click', () => cx.openEBQ(body.hidden));
      card.append(bar, body);
      cx.openEBQ(openEBQ.has(task.id));
    }
    return card;
  }

  /* ИИ көмекшіге қай тапсырманы көрсету керегін белгілеу */
  function setActive(cx) {
    if (active === cx) return;
    active = cx;
    cards.forEach(c => c.card.classList.toggle('is-active', c === cx));
    const { task, obj, lesson, rec: r } = cx;
    PL.ai.setContext({
      taskId: task.id, task, obj, lesson, level: task.level,
      lessonTitle: () => lessonTitle(lesson),
      taskNo: () => t('taskNo') + ' ' + String(cx.no).padStart(2, '0'),
      getGrade: () => (r.checked ? (cx.grade || gradeRec(task, r)) : null),
      topicTitle: () => t('lessonN', { n: lesson.no }) + ': ' + lessonTitle(lesson),
      objectiveCode: obj.code, objectiveText: () => objText(obj.code),
      levelLabel: () => levelLabel(task.level), points: () => pointsLabel(task),
      conditionText: plain(task.condition), rememberText: plain(obj.preamble), solutionText: plain(task.solution),
      isRevealed: () => !!r.checked,
      getStudentWork: () => studentWorkText(cx),
      getChat: () => r.chat || [],
      setChat: (c) => { r.chat = c; PL.store.put(r); }
    });
  }

  function buildAnswerRow(cx, it, shown, i) {
    const r = cx.rec;
    const row = el('div', { class: 'ans-row' + (it.k === 'open' ? ' full' : '') });
    const label = el('div', { class: 'ans-label' }, PL.render.subNodes(shown.l || it.l));
    if (it.k === 'num' && it.u && !it.uo && it.u !== 'есе') label.append(el('span', { class: 'u', text: ' (' + it.u + ')' }));
    row.append(label);
    const api = { el: row, item: it, idx: i };
    if (it.k === 'num' || it.k === 'list' || it.k === 'word') {
      const ph = it.k === 'list' ? t('phList') + (it.u ? ' ' + it.u : '') : it.k === 'num' ? (it.u && it.u !== 'есе' ? t('phNumUnit', { u: it.u }) : t('phNum')) : t('phWord');
      const inp = el('input', { type: 'text', placeholder: ph, 'aria-label': shown.l || it.l, autocomplete: 'off', spellcheck: 'false' });
      inp.value = r.answers[i] || '';
      inp.addEventListener('input', () => { r.answers[i] = inp.value; onWorkChanged(cx); });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') doCheck(cx, true); });
      row.append(inp);
    } else if (it.k === 'choice' || it.k === 'multi') {
      const wrap = el('div', { class: 'choices', role: it.k === 'choice' ? 'radiogroup' : 'group', 'aria-label': shown.l || it.l });
      const disp = shown.od || it.o;
      const btns = it.o.map((opt, oi) => {
        const b = el('button', { type: 'button', class: 'choice', role: it.k === 'choice' ? 'radio' : 'checkbox' }, PL.render.subNodes(disp[oi] || opt));
        b.dataset.val = opt;
        b.addEventListener('click', () => {
          if (it.k === 'choice') r.answers[i] = r.answers[i] === opt ? '' : opt;
          else { const c = Array.isArray(r.answers[i]) ? r.answers[i] : []; r.answers[i] = c.includes(opt) ? c.filter(x => x !== opt) : [...c, opt]; }
          paint(); onWorkChanged(cx);
        });
        wrap.append(b); return b;
      });
      const paint = () => btns.forEach(b => {
        const v = r.answers[i];
        const on = it.k === 'choice' ? v === b.dataset.val : Array.isArray(v) && v.includes(b.dataset.val);
        b.classList.toggle('sel', on); b.setAttribute('aria-checked', String(on));
      });
      paint(); row.append(wrap);
    } else {
      row.append(el('div', { class: 'ans-open', text: t('openAnsHint') }));
    }
    api.setResult = (res) => {
      row.classList.remove('res-ok', 'res-wrong', 'res-partial', 'res-unsure', 'res-open');
      const old = row.querySelector('.res-msg'); if (old) old.remove();
      if (!res) return;
      if (res.status === 'empty') { row.append(el('div', { class: 'res-msg', text: t('notAnswered') })); return; }
      row.classList.add('res-' + res.status);
      row.append(el('div', { class: 'res-msg', text: res.msg || '' }));
    };
    return api;
  }

  function studentWorkText(cx) {
    const out = [];
    const lines = cx.editor ? cx.editor.getLines() : cx.rec.lines;
    if (cx.fillMode) { const ft = PL.ebq.text(cx.task, cx.rec.fill); if (ft) out.push(ft); }
    else lines.filter(l => String(l.v || '').trim()).forEach(l => out.push(l.t === 'm' ? '$' + l.v + '$' : l.v));
    if (cx.graph && PL.graph.has(cx.rec.graph)) out.push('(Оқушы графикке ' + cx.rec.graph.points.length + ' нүкте қойды.)');
    if (cx.board && cx.board.hasContent()) out.push('(Оқушы электронды тақтада сызба/жазба жасады.)');
    return out.join('\n');
  }

  // ── Автосақтау ──
  const statusTimers = {};
  function onWorkChanged(cx) {
    const r = cx.rec;
    if (cx.editor) r.lines = cx.editor.getLines();
    cx.saveState.textContent = t('saving');
    PL.store.put(r, 700).then(() => { if (cx.saveState.isConnected) cx.saveState.textContent = t('savedAt', { t: new Date().toLocaleTimeString() }); });
    clearTimeout(statusTimers[r.id]); statusTimers[r.id] = setTimeout(() => refreshStatusUI(cx), 400);
  }
  function flushAll() {
    cards.forEach(cx => {
      if (cx.editor) cx.rec.lines = cx.editor.getLines();
      if (hasContent(cx.rec) || PL.store.get(cx.rec.id)) PL.store.put(cx.rec);
    });
  }
  function saveNow(cx, toastIt) {
    cx.rec.lines = cx.editor.getLines();
    PL.store.put(cx.rec).then(ok => {
      cx.saveState.textContent = t('savedAt', { t: new Date().toLocaleTimeString() });
      if (toastIt) toast(ok ? t('savedToast') : t('saveFail'));
    });
    refreshStatusUI(cx);
  }
  function refreshStatusUI(cx) {
    const id = cx.task.id, st = statusOf(id);
    cx.statusHost.innerHTML = ''; cx.statusHost.append(statusChip(st));
    const lc = document.querySelector('.level-tab[data-task="' + id + '"] .st-dot');
    if (lc) lc.className = 'st-dot ' + st;
  }
  function destroyCards() {
    cards.forEach(cx => { if (cx.board) cx.board.destroy(); if (cx.editor) cx.editor.destroy(); });
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    cards = []; active = null;
  }

  // ═════════ ЖАУАПТЫ ТЕКСЕРУ ЖӘНЕ КРИТЕРИАЛДЫ БАҒАЛАУ ═════════
  const hasText = (r) => (r.lines || []).some(l => String(l.v || '').trim());
  const boardOnly = (r) => boardHas(r) && !hasText(r);
  /* Оқушының шешу мәтінін талдау: әр бақылау нүктесі (сан, бірлік, формула, таңдау) мәтіннен ізделеді */
  const analyzeRec = (task, r) => PL.ebq.supports(task)
    ? PL.ebq.analyze(task, CHECKS[task.id] || [], r && r.fill)          // ЕБҚ: толтырылған бос орындар
    : withGraph(task, r, PL.solcheck.analyze(task, CHECKS[task.id] || [], (r && r.lines) || [], !!r && boardOnly(r)));
  /* График тапсырмасы: сәйкес бақылау нүктесі оқушы қойған нүктелер бойынша тексеріледі */
  function withGraph(task, r, res) {
    const gc = (window.PHYS_GRAPHS || {})[task.id];
    if (gc && r) res[gc.item] = PL.graph.check(gc, r.graph);
    return res;
  }
  const evaluate = (cx) => { if (cx.editor) cx.rec.lines = cx.editor.getLines(); return analyzeRec(cx.task, cx.rec); };
  /* Дескрипторлар бойынша баға (grading.js). r — оқушы жазбасы (IndexedDB-дан да болуы мүмкін). */
  function gradeRec(task, r) {
    if (!r) return null;
    const fill = PL.ebq.supports(task);
    return PL.grading.grade(task, CHECKS[task.id] || [], analyzeRec(task, r), fill ? PL.ebq.openLines(task, r.fill) : (r.lines || []), fill ? false : boardOnly(r), r.teacher || {}, r.ai || {});
  }
  const fmtPts = (n) => String(Math.round(n * 100) / 100).replace('.', ',');

  function doCheck(cx, scroll) {
    const r = cx.rec;
    r.lines = cx.editor.getLines();
    if (!hasContent(r)) {
      cx.resultPanel.hidden = false; cx.resultPanel.innerHTML = '';
      cx.resultPanel.append(el('div', { class: 'notice warn', text: t('noAttempt') }));
      if (scroll) cx.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    r.result = evaluate(cx).map(x => ({ status: x.status }));
    // жауап өзгерген соң AI-дың бұрынғы алдын ала бағасы жарамсыз
    if (r.aiSig && r.aiSig !== workSig(r)) { r.ai = {}; r.aiSig = ''; }
    r.checked = true; r.checkedAt = Date.now();
    PL.store.put(r);
    showResult(cx, scroll);
    refreshStatusUI(cx);
    renderTopicSummary(cx.lesson);
  }
  const workSig = (r) => JSON.stringify([r.answers, r.fill, r.graph, (r.lines || []).map(l => l.v), ((r.board && r.board.items) || []).length]);

  function showResult(cx, scroll) {
    const task = cx.task, view = cx.view || task, p = cx.resultPanel, r = cx.rec;
    if (cx.editor) r.lines = cx.editor.getLines();
    const results = evaluate(cx);
    p.hidden = false; p.innerHTML = '';
    const g = gradeRec(task, r);
    cx.grade = g;
    if (g) p.append(gradeTable(cx, g));
    else {
      // Дескрипторы жоқ тапсырма (қосымша, бағаланбайды) — тек жауаптардың дұрыстығы
      const c = { ok: 0, wrong: 0, partial: 0, unsure: 0, open: 0, empty: 0 };
      results.forEach(x => { c[x.status] = (c[x.status] || 0) + 1; });
      const sum = el('div', { class: 'result-summary' }, [el('b', { text: t('resultTitle') })]);
      if (c.ok) sum.append(el('span', { class: 'pill ok', text: t('rOk', { n: c.ok }) }));
      if (c.wrong) sum.append(el('span', { class: 'pill bad', text: t('rWrong', { n: c.wrong }) }));
      if (c.partial) sum.append(el('span', { class: 'pill warn', text: t('rPartial', { n: c.partial }) }));
      if (c.unsure) sum.append(el('span', { class: 'pill warn', text: t('rUnsure', { n: c.unsure }) }));
      if (c.open) sum.append(el('span', { class: 'pill', text: t('rOpen', { n: c.open }) }));
      if (c.empty) sum.append(el('span', { class: 'pill', text: t('rEmpty', { n: c.empty }) }));
      p.append(sum, el('div', { class: 'notice info', text: t('notGradedTask') }));
    }
    p.append(analysisBox(cx, results));
    if (cx.ebq) cx.ebq.paint(results);
    if (cx.graph) cx.graph.paint(results[window.PHYS_GRAPHS[task.id].item]);
    const box = el('div', { class: 'solution-box' }, [el('h4', { text: task.teacher_answers && task.sol_kind !== 'steps' ? t('solTitleTeacher') : t('solTitle') })]);
    if (view.answer && !task.teacher_answers) { const a = el('div', { class: 'answer-hl', html: PL.render.decorateSolution(view.answer) }); tex(a); box.append(a); }
    box.append(blocks(view.solution, { solution: true }));
    p.append(box);
    if (scroll) p.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!cx.descPanel.hidden) renderDescriptors(cx);
  }

  const ST_CLASS = { ok: 'ok', part: 'warn', fail: 'bad', pending: 'pend', ai: 'ai', teacher: 'teach' };
  function statusText(gr) {
    if (gr.status === 'fail' && gr.partial) return t('gsPartFail');
    return { ok: t('gsOk'), part: t('gsPart'), fail: t('gsFail'), pending: t('gsPending'), ai: t('gsAi'), teacher: t('gsTeacher') }[gr.status];
  }
  function earnedCell(cx, gr) {
    const td = el('td', { class: 'g-got st-' + ST_CLASS[gr.status] });
    if (teacherMode) {
      const sel = el('select', { class: 'teacher-sel', 'aria-label': t('gTeacherSetFor', { d: gr.text }) });
      sel.append(el('option', { value: '', text: t('gTeacherAuto') }));
      for (let v = 0; v <= gr.max; v++) sel.append(el('option', { value: String(v), text: String(v) }));
      const cur = cx.rec.teacher && cx.rec.teacher[gr.ri];
      sel.value = cur == null ? '' : String(cur);
      sel.addEventListener('change', () => {
        cx.rec.teacher = cx.rec.teacher || {};
        if (sel.value === '') delete cx.rec.teacher[gr.ri]; else cx.rec.teacher[gr.ri] = +sel.value;
        PL.store.put(cx.rec); showResult(cx, false); renderTopicSummary(cx.lesson);
      });
      td.append(sel);
    } else {
      td.append(el('b', { text: gr.status === 'pending' ? '—' : fmtPts(gr.earned) }));
    }
    td.append(el('span', { class: 'g-st', text: statusText(gr) }));
    return td;
  }

  /* «Шешуді талдау»: жүйе оқушының мәтінінен әр бақылау нүктесі бойынша не тапқаны (дұрыс мәнді ашпайды) */
  function analysisBox(cx, results) {
    const items = CHECKS[cx.task.id] || [];
    if (!items.length) return document.createTextNode('');
    const shown = (cx.view && cx.view.checks) || items;
    const icon = { ok: '✓', partial: '±', wrong: '✗', empty: '—', unsure: '?', open: '✎' };
    const msg = (r) => {
      if (r.board) return t('anaBoard');
      if (r.copy) return t('anaCopy');
      switch (r.status) {
        case 'ok': return r.found ? t('anaFound', { v: r.found }) : t('rs_ok');
        case 'partial': return t(r.reason === 'conv' ? 'anaConv' : 'anaNoUnit', { v: r.found || '' });
        case 'wrong': return r.need ? t('anaListSome', { n: r.count, m: r.need }) : t('anaWrong', { v: r.found || '' });
        case 'empty': return t(cx.fillMode ? 'anaBlank' : 'anaNotFound');
        case 'open': return t('anaOpen');
        default: return r.found ? t('anaUnsureV', { v: r.found }) : t('anaUnsure');
      }
    };
    const list = el('ul', { class: 'ana-list' });
    items.forEach((it, i) => {
      const r = results[i] || { status: 'unsure' };
      list.append(el('li', { class: 'ana-' + r.status }, [el('span', { class: 'ana-ic', text: icon[r.status] || '?' }), el('span', { class: 'ana-l' }, PL.render.subNodes((shown[i] && shown[i].l) || it.l)), el('span', { class: 'ana-m', text: msg(r) })]));
    });
    return el('details', { class: 'ana-box' }, [el('summary', {}, [PL.icon('scanText', 16), document.createTextNode(t('anaTitle'))]), el('p', { class: 'kbd-hint', text: t('anaNote') }), list]);
  }

  /* «Бағалау нәтижесі»: Дескриптор | Максималды балл | Жиналған балл, «Барлығы», «Жиналған балл: x/y», кері байланыс */
  function gradeTable(cx, g) {
    const wrap = el('div', { class: 'grade-box' });
    wrap.append(el('div', { class: 'grade-head' }, [PL.icon('award', 18), el('h4', { text: t('gradeTitle') })]));
    const tbl = el('table', { class: 'grade-table' });
    tbl.append(el('tr', {}, [el('th', { text: t('gCol') }), el('th', { text: t('gMax') }), el('th', { text: t('gGot') })]));
    g.rows.forEach(gr => {
      tbl.append(el('tr', { class: 'g-row st-' + ST_CLASS[gr.status] }, [
        el('td', {}, [el('div', { class: 'g-desc', text: gr.text }), el('div', { class: 'g-fb', text: gr.fb })]),
        el('td', { class: 'g-max', text: fmtPts(gr.max) }),
        earnedCell(cx, gr)
      ]));
    });
    tbl.append(el('tr', { class: 'total' }, [el('td', { text: t('gTotal') }), el('td', { class: 'g-max', text: fmtPts(g.max) }), el('td', { class: 'g-got', text: fmtPts(g.earned) + (g.pending ? ' (+' + fmtPts(g.pending) + ' ?)' : '') })]));
    wrap.append(el('div', { class: 'table-wrap' }, [tbl]));
    if (g.pending) {
      // Тексеру аяқталмаған: расталған балл мен күтудегі балл бөлек, «0/2» соңғы баға ретінде көрсетілмейді
      wrap.append(el('div', { class: 'grade-split' }, [
        el('div', { class: 'gs-item gs-auto' }, [el('span', { text: t('gAutoPts') }), el('b', { text: fmtPts(g.earned) + ' / ' + fmtPts(g.max - g.pending) })]),
        el('div', { class: 'gs-item gs-wait' }, [el('span', { text: t('gPendPts') }), el('b', { text: fmtPts(g.pending) })])
      ]));
      wrap.append(el('div', { class: 'notice warn', text: t('gNotFinal', { m: fmtPts(g.max) }) }));
    } else {
      wrap.append(el('div', { class: 'grade-score' + (g.aiPts ? ' prelim' : '') }, [
        el('span', { text: t('gScore', { a: fmtPts(g.earned), b: fmtPts(g.max) }) }),
        g.aiPts ? el('span', { class: 'prelim-tag', text: t('gPrelim') }) : null
      ]));
    }
    if (g.aiPts || g.rows.some(x => x.status === 'ai')) wrap.append(el('div', { class: 'notice info', text: t('gAiNote', { n: fmtPts(g.aiPts) }) }));
    if (g.teacherPts || g.rows.some(x => x.status === 'teacher')) wrap.append(el('div', { class: 'notice info', text: t('gTeacherNote', { n: fmtPts(g.teacherPts) }) }));

    // Әрекеттер: AI алдын ала бағалау · Мұғалім бағалауы
    const acts = el('div', { class: 'grade-actions' });
    if (g.rows.some(x => x.status === 'pending')) {
      acts.append(el('button', { class: 'btn btn-outline', type: 'button', onclick: () => aiGrade(cx) }, [PL.icon('sparkles', 15), document.createTextNode(t('gAiBtn'))]));
    }
    acts.append(el('button', { class: 'btn btn-outline' + (teacherMode ? ' active' : ''), type: 'button', onclick: () => toggleTeacher() }, [PL.icon('userCheck', 15), document.createTextNode(teacherMode ? t('gTeacherExit') : t('gTeacherBtn'))]));
    wrap.append(acts);
    if (teacherMode) wrap.append(el('div', { class: 'kbd-hint', text: t('gTeacherHint') }));
    cx.aiStatus = el('div', { class: 'ai-grade-status' });
    wrap.append(cx.aiStatus);
    return wrap;
  }

  /* Мұғалім режимі: дескрипторлар бойынша балды қолмен қою (PIN — config.js). */
  function toggleTeacher() {
    const apply = (on) => {
      teacherMode = on;
      try { on ? sessionStorage.setItem('pl-teacher', '1') : sessionStorage.removeItem('pl-teacher'); } catch (e) {}
      cards.forEach(c => { if (c.rec.checked) showResult(c, false); if (!c.descPanel.hidden) renderDescriptors(c); });
      if (nav.lesson) renderTopicSummary(LESSONS.find(x => x.id === nav.lesson));
      toast(on ? t('gTeacherOn') : t('gTeacherOff'));
    };
    if (teacherMode) return apply(false);
    const pin = String((window.PHYS_CONFIG && window.PHYS_CONFIG.teacherPin) || '');
    if (!pin) return apply(true);
    const inp = el('input', { type: 'password', class: 'ai-input', autocomplete: 'off', inputmode: 'numeric', 'aria-label': t('gTeacherPin') });
    modal(t('gTeacherBtn'), el('div', {}, [el('p', { text: t('gTeacherPin') }), inp, el('p', { class: 'kbd-hint', text: t('gTeacherPinNote') })]), [
      { label: t('cancel') },
      { label: t('gTeacherEnter'), cls: 'btn-primary', fn: () => { if (inp.value === pin) apply(true); else toast(t('gTeacherBad')); } }
    ]);
    setTimeout(() => inp.focus(), 50);
  }

  /* AI арқылы алдын ала бағалау — тек «Мұғалім тексеруі қажет» дескрипторлары үшін, оқушының рұқсатымен. */
  async function aiGrade(cx) {
    const g = cx.grade; if (!g) return;
    const pending = g.rows.filter(x => x.status === 'pending');
    if (!pending.length) return;
    if (!PL.ai.serverStatus().checked) await PL.ai.checkHealth();
    const local = !PL.ai.ready() && PL.fiziq.llmReady && PL.fiziq.llmReady();
    if (!PL.ai.ready() && !local) {
      modal(t('gAiBtn'), el('div', {}, [el('div', { class: 'notice warn', text: t('gAiNeed') })]), [
        { label: t('close') },
        { label: t('aiSettings'), cls: 'btn-primary', fn: () => { PL.ai.toggleWidget(true); PL.ai.toggleSettings(true); } }
      ]);
      return;
    }
    const withImg = !local && cx.board && cx.board.hasContent();
    const body = el('div', {}, [el('p', { text: local ? t('gAiLocalConsent') : t('gAiConsent') }), withImg ? el('p', { class: 'kbd-hint', text: t('gAiConsentImg') }) : null, local ? el('div', { class: 'notice warn', text: t('gAiLocalWarn') }) : null]);
    modal(t('gAiBtn'), body, [
      { label: t('cancel') },
      { label: t('gAiAgree'), cls: 'btn-primary', fn: () => runAiGrade(cx, pending, withImg, local) }
    ]);
  }
  async function runAiGrade(cx, pending, withImg, local) {
    const r = cx.rec, task = cx.task;
    r.lines = cx.editor.getLines();
    cx.aiStatus.innerHTML = '';
    cx.aiStatus.append(el('div', { class: 'notice info', text: t('gAiWorking') }));
    const payload = {
      lang: PL.getLang(),
      task: t('lessonN', { n: cx.lesson.no }) + ': ' + lessonTitle(cx.lesson) + ' · ' + levelLabel(task.level),
      condition: plain(task.condition),
      solution: plain(task.solution) + (task.answer ? '\n' + plain([{ t: 'p', h: task.answer }]) : ''),
      descriptors: pending.map(x => ({ id: x.ri, text: x.text, max: x.max })),
      studentWork: studentWorkText(cx),
      image: withImg ? cx.board.toDataURL({ crop: true, grid: false }) : null
    };
    try {
      // Жергілікті модель (WebLLM) — тек ұсыныс: балл қосылмайды, дескриптор мұғалім тексеруінде қалады
      const out = local ? await PL.fiziq.llmGrade(payload) : await PL.ai.grade(payload);
      r.ai = r.ai || {};
      pending.forEach(x => {
        const m = out.find(o => String(o.id) === String(x.ri));
        if (m && isFinite(+m.points)) r.ai[x.ri] = { pts: Math.max(0, Math.min(x.max, Math.round(+m.points))), comment: String(m.comment || '').slice(0, 300), local: !!local };
      });
      r.aiSig = workSig(r);
      await PL.store.put(r);
      if (!cx.card.isConnected) return;
      showResult(cx, false);
      renderTopicSummary(cx.lesson);
      cx.aiStatus.append(el('div', { class: 'notice info', text: local ? t('gAiLocalDone') : t('gAiDone') }));
    } catch (e) {
      if (cx.aiStatus.isConnected) { cx.aiStatus.innerHTML = ''; cx.aiStatus.append(el('div', { class: 'notice err', text: t('gAiFail', { e: e.message }) })); }
    }
  }

  // ═════════ ДЕСКРИПТОР (Word кестесі + жиналған балл) ═════════
  function renderDescriptors(cx) {
    const task = cx.task, view = cx.view || task, r = cx.rec, p = cx.descPanel;
    p.innerHTML = '';
    p.append(el('div', { class: 'sec-label', text: t('descTitle') }));
    if (view.criterion) p.append(el('p', { class: 'desc-crit', html: '<b>' + t('critLabel') + '</b> ' + escapeHTML(view.criterion) }));
    if (!view.descriptors) { p.append(el('div', { class: 'notice info', text: t('noDesc') })); return; }
    const g = r.checked ? (cx.grade || gradeRec(task, r)) : null;
    const byRow = {}; if (g) g.rows.forEach(x => { byRow[x.ri] = x; });
    const rows = view.descriptors.rows, orig = task.descriptors.rows;
    const cellText = c => plain(c.b);
    const hdr = orig[0].map(cellText);
    const nCols = orig[0].length;
    // Word кестесіндегі бос «Өзін-өзі тексер» бағаны көрсетілмейді — орнына платформа есептеген балл
    const drop = new Set(hdr.map((h, i) => /Өзін-өзі/i.test(h) ? i : -1).filter(i => i >= 0));
    let ptsIdx = hdr.findIndex(h => /^Балл/.test(h)); if (ptsIdx < 0) ptsIdx = nCols - 1;
    const isTotalRow = (ri) => orig[ri].some(c => /^Барлығы/.test(cellText(c)));
    const isCont = (c, ri, ci) => c.vm === 'cont' || (ci === 0 && ri > 1 && orig[ri].length === nCols && !cellText(orig[ri][ci]) && !isTotalRow(ri));
    const spans = rows.map(rw => rw.map(() => 1)), skip = rows.map(rw => rw.map(() => false));
    rows.forEach((rw, ri) => {
      let col = 0;
      rw.forEach((c, ci) => {
        if (rw.length === nCols && drop.has(ci)) skip[ri][ci] = true;
        else if (isCont(c, ri, ci)) {
          for (let up = ri - 1; up >= 0; up--) {
            let cc = 0, found = -1;
            rows[up].forEach((x, xi) => { if (cc === col) found = xi; cc += x.cs || 1; });
            if (found >= 0 && !skip[up][found]) { spans[up][found]++; break; }
          }
          skip[ri][ci] = true;
        }
        col += c.cs || 1;
      });
    });
    const tbl = el('table', { class: 'desc-table' });
    const head = el('tr');
    rows[0].forEach((c, ci) => { if (!skip[0][ci]) head.append(el('th', { text: cellText(c), colspan: c.cs > 1 ? c.cs : null })); });
    if (g) head.append(el('th', { text: t('descGotCol') }));
    tbl.append(head);
    rows.slice(1).forEach((rw, i) => {
      const ri = i + 1, isTotal = isTotalRow(ri);
      const tr = el('tr', { class: isTotal ? 'total' : null });
      rw.forEach((c, ci) => {
        if (skip[ri][ci]) return;
        const isPts = rw.length === nCols ? ci === ptsIdx : ci === rw.length - 1;
        const td = el('td', { class: isPts ? 'pts' : null, colspan: c.cs > 1 ? c.cs : null, rowspan: spans[ri][ci] > 1 ? spans[ri][ci] : null });
        td.append(blocks(c.b)); tr.append(td);
      });
      if (isTotal) {
        const filled = rw.reduce((s, c, ci) => s + (skip[ri][ci] && drop.has(ci) ? 0 : (c.cs || 1)), 0);
        const need = rows[0].reduce((s, c, ci) => s + (drop.has(ci) ? 0 : (c.cs || 1)), 0);
        if (filled < need && tr.firstChild) tr.firstChild.colSpan = (tr.firstChild.colSpan || 1) + (need - filled);
      }
      if (g) {
        const x = byRow[ri];
        if (isTotal) tr.append(el('td', { class: 'g-got', html: '<b>' + fmtPts(g.earned) + '</b>' + (g.pending ? ' (+' + fmtPts(g.pending) + ' ?)' : '') }));
        else if (x) tr.append(el('td', { class: 'g-got st-' + ST_CLASS[x.status] }, [el('b', { text: x.status === 'pending' ? '—' : fmtPts(x.earned) }), el('span', { class: 'g-st', text: statusText(x) })]));
        else tr.append(el('td'));
      }
      tbl.append(tr);
    });
    p.append(el('div', { class: 'table-wrap' }, [tbl]));
    p.append(g ? el('div', { class: 'self-score', text: t('gScore', { a: fmtPts(g.earned), b: fmtPts(g.max) }) + (g.pending ? ' · ' + t('gPendingShort', { n: fmtPts(g.pending) }) : '') }) : el('div', { class: 'kbd-hint', text: t('descHint') }));
  }

  // ═════════ ТАҚЫРЫП БОЙЫНША БАЛЛ ═════════
  function renderTopicSummary(l) {
    if (!summaryHost || !summaryHost.isConnected || !l) return;
    const host = summaryHost; host.innerHTML = '';
    const groups = (l.groups || []).map(gid => GROUPS[gid]).filter(Boolean);
    const multi = groups.length > 1;
    const tbl = el('table', { class: 'grade-table topic-table' });
    tbl.append(el('tr', {}, [el('th', { text: t('tsLevel') }), el('th', { text: t('gGot') }), el('th', { text: t('tsState') })]));
    const tot = { main: { e: 0, m: 0, p: 0, ai: 0 }, ebq: { e: 0, m: 0, p: 0, ai: 0 } };
    let anyChecked = false;
    groups.forEach(o => sortedTasks(o).forEach(k => {
      if (k.level === 'EXTRA') return;
      const rec = PL.store.get(k.id);
      const live = cards.find(c => c.task.id === k.id);
      const r = live ? live.rec : rec;
      const max = PL.grading.descriptorRows(k).reduce((a, x) => a + x.max, 0) || k.points;
      const g = r && r.checked ? gradeRec(k, Object.assign({}, r, live && live.editor ? { lines: live.editor.getLines() } : {})) : null;
      const bucket = k.level === 'EBQ' ? tot.ebq : tot.main;
      bucket.m += max;
      let state;
      if (g) {
        anyChecked = true;
        bucket.e += g.earned; bucket.p += g.pending; bucket.ai += g.aiPts;
        state = g.pending ? t('tsPending', { n: fmtPts(g.pending) }) : g.aiPts ? t('tsPrelimAi') : t('tsDone');
      } else state = t('tsNotChecked');
      const name = levelLabel(k.level) + (multi ? ' · ' + o.code : '');
      tbl.append(el('tr', { class: g ? (g.pending ? 'st-pend' : 'st-ok') : 'st-none' }, [
        el('td', { text: name }),
        el('td', { class: 'g-got', text: (g ? fmtPts(g.earned) : '0') + '/' + fmtPts(max) }),
        el('td', { class: 'g-st', text: state })
      ]));
    }));
    host.append(el('div', { class: 'grade-head' }, [PL.icon('award', 18), el('h2', { class: 'ts-title', text: t('topicScore') })]));
    host.append(el('div', { class: 'table-wrap' }, [tbl]));
    const line = el('div', { class: 'topic-total' });
    if (tot.main.m) line.append(el('div', { class: 'grade-score' + (tot.main.p || tot.main.ai ? ' prelim' : '') }, [el('span', { text: t('topicTotal', { a: fmtPts(tot.main.e), b: fmtPts(tot.main.m) }) }), tot.main.p || tot.main.ai ? el('span', { class: 'prelim-tag', text: t('gPrelim') }) : null]));
    if (tot.ebq.m) line.append(el('div', { class: 'grade-score ebq-score' + (tot.ebq.p || tot.ebq.ai ? ' prelim' : '') }, [el('span', { text: t('topicEbq', { a: fmtPts(tot.ebq.e), b: fmtPts(tot.ebq.m) }) }), tot.ebq.p || tot.ebq.ai ? el('span', { class: 'prelim-tag', text: t('gPrelim') }) : null]));
    host.append(line);
    const pend = tot.main.p + tot.ebq.p, ai = tot.main.ai + tot.ebq.ai;
    if (pend) host.append(el('div', { class: 'notice warn', text: t('topicPending', { n: fmtPts(pend) }) }));
    if (ai) host.append(el('div', { class: 'notice info', text: t('gAiNote', { n: fmtPts(ai) }) }));
    host.append(el('div', { class: 'kbd-hint', text: anyChecked ? t('topicHint') : t('topicHintNone') }));
  }

  // ═════════ ТАЗАЛАУ / PDF / ТОЛЫҚ ЭКРАН ═════════
  function clearWork(cx) {
    modal(t('clearTitle'), el('p', { text: t('clearText') }), [
      { label: t('cancel') },
      { label: t('clearYes'), cls: 'btn-danger', fn: () => {
        const id = cx.task.id, chat = cx.rec.chat;
        PL.store.remove(id).then(() => {
          if (chat && chat.length) { const r = rec(id); r.chat = chat; PL.store.put(r); }
          rerenderKeepScroll(); toast(t('clearedToast'));
        });
      } }
    ]);
  }

  function exportPDF(cx) {
    const nameInput = document.getElementById('studentName');
    const go = () => {
      const r = cx.rec; r.lines = cx.editor.getLines();
      const items = CHECKS[cx.task.id] || [], shownItems = (cx.view && cx.view.checks) || items;
      const results = r.checked ? evaluate(cx) : [];
      const st = statusOf(cx.task.id);
      toast(t('pdfPreparing'));
      PL.pdf.exportPDF({
        taskId: cx.task.id, student: nameInput.value.trim(),
        topic: t('lessonN', { n: cx.lesson.no }) + ': ' + lessonTitle(cx.lesson),
        objective: cx.obj.code + ' — ' + objText(cx.obj.code),
        level: t('lv' + cx.task.level), points: pointsLabel(cx.task),
        status: t(st === 'checked' ? 'stChecked' : st === 'progress' ? 'stProgress' : 'stNone'),
        condition: (cx.view || cx.task).condition, lines: r.lines,
        grade: r.checked ? gradeRec(cx.task, r) : null,
        boardImg: cx.board.hasContent() ? cx.board.toDataURL({ crop: false }) : null,
        answers: items.map((it, i) => {
          return {
            label: (shownItems[i] && shownItems[i].l) || it.l,
            value: it.k === 'open' ? t('rpInSol') : (results[i] && results[i].found) || '—',
            result: results[i] ? t('rs_' + results[i].status) : ''
          };
        })
      }).then(res => toast(res.ok ? t('pdfSaved') : t('pdfPrint')));
    };
    if (nameInput.value.trim()) return go();
    const inp = el('input', { type: 'text', placeholder: t('namePh'), class: 'ai-input' });
    modal(t('pdfTitle'), el('div', {}, [el('p', { text: t('pdfAsk') }), inp]), [
      { label: t('cancel') },
      { label: t('pdfMake'), cls: 'btn-primary', fn: () => { nameInput.value = inp.value.trim(); try { localStorage.setItem('pl-name', nameInput.value); } catch (e) {} go(); } }
    ]);
    setTimeout(() => inp.focus(), 50);
  }

  function toggleFullscreen(card, btn) {
    const exit = () => { card.classList.remove('pseudo-full'); btn.title = t('fullscreen'); };
    if (document.fullscreenElement || card.classList.contains('pseudo-full')) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      exit(); return;
    }
    if (card.requestFullscreen) {
      card.requestFullscreen().then(() => { btn.title = t('exitFull'); }).catch(() => { card.classList.add('pseudo-full'); btn.title = t('exitFull'); });
      document.addEventListener('fullscreenchange', function h() { if (!document.fullscreenElement) { exit(); document.removeEventListener('fullscreenchange', h); } });
    } else { card.classList.add('pseudo-full'); btn.title = t('exitFull'); }
  }

  // ═════════ ҚОЛЖАЗБАНЫ МӘТІНГЕ АЙНАЛДЫРУ ═════════
  async function handwritingToText(cx) {
    const board = cx.board;
    if (!board.hasContent()) { toast(t('boardEmpty')); return; }
    if (!PL.ai.serverStatus().checked) await PL.ai.checkHealth();
    const img = board.toDataURL({ crop: true, grid: false });
    const local = !PL.ai.ocrExact();
    const status = el('div', { class: 'notice info', text: local ? t('ocrLocalStart') : t('ocrWorking') });
    const body = el('div', {}, [el('img', { class: 'ocr-preview', src: img, alt: t('ocrTitle') }), status]);
    modal(t('ocrTitle'), body, [{ label: t('close') }]);
    const onProgress = (st, p) => {
      const pct = Math.round(p * 100) + '%';
      status.textContent = /recogniz/i.test(st) ? t('ocrWorking') + ' ' + pct : t('ocrLocalLoading', { p: pct });
    };
    try {
      const res = await PL.ai.ocr(img, onProgress);
      if (!res.lines.length) throw new Error(t('ocrEmpty'));
      showOcrConfirm(cx, img, res.lines, res.provider, res.approx);
    } catch (e) {
      if (body.isConnected) status.replaceWith(el('div', { class: 'notice err', text: t('ocrFail', { e: e.message }) }));
    }
  }

  function showOcrConfirm(cx, img, lines, provider, approx) {
    const wrap = el('div', {}, [el('img', { class: 'ocr-preview', src: img, alt: t('ocrTitle') })]);
    if (approx) wrap.append(el('div', { class: 'notice warn' }, [
      el('span', { text: t('ocrApprox') + ' ' }),
      el('button', { class: 'link-btn', text: t('ocrExactHow'), onclick: () => { document.getElementById('modalClose').click(); PL.ai.toggleWidget(true); PL.ai.toggleSettings(true); } })
    ]));
    wrap.append(el('div', { class: 'notice info', text: t('ocrCheckInfo', { p: approx ? t('ocrLocalName') : (provider || 'OCR') }) }));
    const list = el('div', { class: 'ocr-lines' });
    const rows = lines.map(l => {
      const kind = el('select', { 'aria-label': t('formulaLine') }, [el('option', { value: 'm', text: t('kindFormula') }), el('option', { value: 't', text: t('kindText') })]);
      kind.value = l.t === 't' ? 't' : 'm';
      let field;
      const holder = el('div', { style: 'flex:1' });
      const mk = () => {
        const val = field ? field.value : l.v;
        holder.innerHTML = '';
        if (kind.value === 'm' && window.MathfieldElement) { field = new MathfieldElement(); field.mathVirtualKeyboardPolicy = 'manual'; field.value = val; field.style.width = '100%'; field.style.fontSize = '1.2rem'; }
        else { field = el('textarea', { rows: '1', class: 'ai-input', style: 'height:auto;padding:.4rem' }); field.value = val; }
        holder.append(field);
      };
      mk(); kind.addEventListener('change', mk);
      const del = el('button', { class: 'icon-btn', type: 'button', title: t('removeLine'), 'aria-label': t('removeLine') }, [PL.icon('x', 15)]);
      const row = el('div', { style: 'display:flex;gap:.4rem;align-items:center' }, [kind, holder, del]);
      const api = { get: () => ({ t: kind.value, v: field.value }), removed: false };
      del.addEventListener('click', () => { api.removed = true; row.remove(); });
      list.append(row);
      return api;
    });
    wrap.append(list);
    modal(t('ocrCheckTitle'), wrap, [
      { label: t('cancel') },
      { label: t('ocrConfirm'), cls: 'btn-primary', fn: () => {
        const out = rows.filter(r => !r.removed).map(r => r.get()).filter(x => String(x.v).trim());
        if (!out.length || !cx.card.isConnected) return;
        cx.editor.appendLines(out); cx.setMode('kbd'); toast(t('ocrInserted'));
      } }
    ]);
  }

  // ═════════ МОДАЛЬ, TOAST, СУРЕТ ═════════
  function modal(title, bodyNode, actions) {
    const wrap = document.getElementById('modal');
    document.getElementById('modalTitle').textContent = title;
    const body = document.getElementById('modalBody'); body.innerHTML = ''; body.append(bodyNode);
    const foot = document.getElementById('modalFoot'); foot.innerHTML = '';
    const close = () => { wrap.hidden = true; document.removeEventListener('keydown', esc); };
    const esc = (e) => { if (e.key === 'Escape') close(); };
    (actions || [{ label: t('close') }]).forEach(a => foot.append(el('button', { class: 'btn ' + (a.cls || 'btn-outline'), text: a.label, onclick: () => { close(); a.fn && a.fn(); } })));
    document.getElementById('modalClose').onclick = close;
    wrap.onclick = (e) => { if (e.target === wrap) close(); };
    document.addEventListener('keydown', esc);
    wrap.hidden = false;
    return { close };
  }
  function zoomImage(src) { modal(t('imgTitle'), el('img', { class: 'zoom', src, alt: t('imgAlt') }), [{ label: t('close') }]); }
  let toastTimer;
  function toast(msg) {
    const tEl = document.getElementById('toast');
    tEl.textContent = msg; tEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => tEl.classList.remove('show'), 2600);
  }

  // ═════════ ПАНЕЛЬ ЖӘНЕ НАШАР КӨРЕТІНДЕРГЕ РЕЖИМІ ═════════
  function closeDrawers() { document.body.classList.remove('show-left', 'show-right'); document.getElementById('scrim').hidden = true; }
  function initPanels() {
    const b = document.body, scrim = document.getElementById('scrim');
    const mobile = () => window.matchMedia('(max-width: 1100px)').matches;
    document.getElementById('btnOpenTopics').onclick = () => { b.classList.add('show-left'); scrim.hidden = false; };
    scrim.onclick = closeDrawers;
    const setLeft = (c) => { b.classList.toggle('left-collapsed', c); document.getElementById('btnExpandLeft').hidden = !c; try { localStorage.setItem('pl-left', c ? '1' : '0'); } catch (e) {} };
    document.getElementById('btnCollapseLeft').onclick = () => mobile() ? closeDrawers() : setLeft(true);
    document.getElementById('btnExpandLeft').onclick = () => setLeft(false);
    try { if (localStorage.getItem('pl-left') === '1') setLeft(true); } catch (e) {}
  }

  function initA11y() {
    const root = document.documentElement, bar = document.getElementById('a11yBar'), btn = document.getElementById('btnA11y');
    const S = { fs: '1', scheme: 'default', img: 'on', open: false };
    try { Object.assign(S, JSON.parse(localStorage.getItem('pl-a11y') || '{}')); } catch (e) {}
    const apply = () => {
      root.dataset.fs = S.fs; root.dataset.scheme = S.scheme; root.dataset.img = S.img;
      bar.hidden = !S.open; btn.setAttribute('aria-expanded', String(S.open)); document.body.classList.toggle('a11y-open', S.open);
      bar.querySelectorAll('[data-fs]').forEach(x => x.classList.toggle('active', x.dataset.fs === S.fs));
      bar.querySelectorAll('[data-scheme]').forEach(x => x.classList.toggle('active', x.dataset.scheme === S.scheme));
      document.getElementById('imgModeLabel').textContent = t({ on: 'imgOn', gray: 'imgGray', off: 'imgOff' }[S.img]);
      document.getElementById('btnImgMode').classList.toggle('active', S.img !== 'on');
      try { localStorage.setItem('pl-a11y', JSON.stringify(S)); } catch (e) {}
    };
    btn.onclick = () => { S.open = !S.open; apply(); };
    bar.querySelectorAll('[data-fs]').forEach(x => x.onclick = () => { S.fs = x.dataset.fs; apply(); });
    bar.querySelectorAll('[data-scheme]').forEach(x => x.onclick = () => { S.scheme = x.dataset.scheme; apply(); });
    document.getElementById('btnImgMode').onclick = () => { S.img = { on: 'gray', gray: 'off', off: 'on' }[S.img]; apply(); };
    document.getElementById('btnA11yReset').onclick = () => { Object.assign(S, { fs: '1', scheme: 'default', img: 'on', open: false }); apply(); toast(t('normalVersion')); };
    PL.a11yApply = apply;
    apply();
  }

  // ═════════ ІСКЕ ҚОСУ ═════════
  function readHash() {
    const h = location.hash.replace('#', '').split('/')[0];
    return LESSONS.some(l => l.id === h) ? h : null;
  }
  async function init() {
    await PL.store.init();
    PL.applyI18n();
    PL.fillIcons();
    initA11y(); initPanels();
    PL.calc.init(); PL.fiziq.init(); PL.ai.init();
    const nameInput = document.getElementById('studentName');
    try { nameInput.value = localStorage.getItem('pl-name') || ''; } catch (e) {}
    nameInput.addEventListener('input', () => { try { localStorage.setItem('pl-name', nameInput.value); } catch (e) {} });
    document.querySelectorAll('.lang-switch button').forEach(b => b.addEventListener('click', () => PL.setLang(b.dataset.lang)));
    nav.lesson = readHash();
    if (!nav.lesson) { try { const s = JSON.parse(localStorage.getItem('pl-nav2') || 'null'); if (s && LESSONS.some(l => l.id === s.lesson)) nav.lesson = s.lesson; } catch (e) {} }
    saveNav(); renderSidebar(); renderView();
    window.addEventListener('hashchange', () => {
      const want = readHash();
      if (want === nav.lesson) return;
      flushAll(); nav.lesson = want; saveNav(); renderSidebar(); renderView(); scroller().scrollTop = 0;
    });
    window.addEventListener('beforeunload', flushAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flushAll(); });
  }

  function rerender() {
    const s = scroller(); const y = s.scrollTop;
    flushAll(); renderSidebar(); renderView(); s.scrollTop = y;
    if (PL.a11yApply) PL.a11yApply();
  }

  document.addEventListener('DOMContentLoaded', init);
  return { rerender, zoomImage, toast, modal, _nav: nav, _cards: () => cards, _taskIndex: taskIndex, _lessons: LESSONS, _groups: GROUPS };
})();
