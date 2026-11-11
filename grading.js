/*
 * КРИТЕРИАЛДЫ БАҒАЛАУ — әр тапсырма ӨЗ дескрипторлары бойынша бағаланады.
 * Дескрипторлардың мәтіні descriptors.js файлында (Word кестесімен бірдей реті мен балы сақталған).
 *
 * Әр дескриптор (Word кестесінің жолы, «Барлығы» жолынан басқа) үшін төмендегі PHYS_GRADING картасы
 * қай жауап өрістері (checks.js элементтері) және шешу жолындағы қандай дәлелдер сол дескрипторды
 * растайтынын көрсетеді. Балл дескриптор бойынша беріледі (дұрыс жауаптар санына қарап емес).
 *
 * Дескриптор өрістері:
 *   c   — жауап өрістерінің нөмірлері (checks.js). Бәрі дұрыс болса ғана дескриптор автоматты орындалады.
 *   u   — өлшем бірлігіне қойылатын талап:
 *           'conv' — ХБЖ-ға/басқа бірлікке КЕЛТІРУ керек: мәні басқа бірлікте берілсе — орындалмады;
 *           'unit' — өлшем бірлігін ЖАЗУ керек: бірлік жоқ болса — орындалмады (басқа дұрыс бірлік — қабылданады);
 *           'si'   — ХБЖ-ға келтіріп, бірлігін жазу керек: екеуі де тексеріледі.
 *         Көрсетілмесе — мәні дұрыс болса жеткілікті (бірлік туралы тек ескерту беріледі).
 *   w   — шешу жолынан (теңдеу редакторы жолдарынан) іздейтін дәлелдер: {f:'rho'} формула, {n:0.054} сан,
 *         {re:/…/} үлгі. Табылса — орындалды; табылмаса — АЙЫППҰЛ ЖОҚ, «Мұғалім тексеруі қажет».
 *   t   — автоматты тексеруге келмейтін бөлік (түсіндірме, сызба, мысал). Бар болса, дескриптор
 *         «Мұғалім тексеруі қажет» күйінде қалады (AI бапталса — оқушының рұқсатымен AI алдын ала бағалай алады).
 *   lst — тізім жауабында белгілі бір мәндердің болуы: {i:0, has:[8]}.
 *   rule— ерекше ереже (Word дескрипторында бөлек көрсетілген балдар).
 *
 * Тексерілген бөлік қате болса — дескриптор орындалмады (0 балл). Тексерілмеген бөлік үшін балл автоматты
 * түрде НЕ қосылмайды, НЕ алынбайды.
 */
window.PL = window.PL || {};

window.PHYS_GRADING = (function () {
  const T = (t) => ({ t });
  return {
    // ── 1-тақырып: масса, көлем, тығыздық ──
    t1o1A: [{ c: [0, 1] }, { c: [2], u: 'conv' }],
    t1o1B: [{ c: [0] }, { c: [0], t: 'бос ыдыстың массасын не себепті алып тастайтынын түсіндіру' }, { c: [1], u: 'si' }],
    t1o1C: [{ c: [0] }, { c: [1], u: 'conv' }, { c: [2], t: 'тепе-теңдікке сүйеніп жазылған негіздеме' }, { c: [3, 4], u: 'conv' }, { c: [5], u: 'unit' }],
    t1o1EBQ: [{ c: [0] }, { c: [1, 2] }, { c: [3] }, { c: [4] }, { c: [5] }, { c: [6] }, { c: [7] }, { c: [8], u: 'conv' }, { c: [9] }, { c: [10] }],
    t1o2A: [{ c: [0, 1] }, { c: [2], u: 'conv' }],
    t1o2B: [{ c: [0, 1, 2] }, { c: [3] }, { c: [4], u: 'si' }],
    t1o2C: [{ c: [0, 1] }, { c: [2] }, { c: [3], t: 'екі әдістің нәтижесін салыстыру' }, { c: [4], t: 'мензурка не себепті қажет екенін түсіндіру' }, { c: [5], u: 'conv' }],
    t1o2EBQ: [{ c: [0] }, { c: [1] }, { c: [2] }, { c: [3] }, { c: [4] }, { c: [5] }, { c: [6] }, { c: [7] }, { c: [8], u: 'conv' }, { c: [9] }],
    t1o3A: [{ c: [0, 1] }, { c: [2] }],
    t1o3B: [{ c: [0], u: 'conv' }, T('«900 кг/м³» сөзінің физикалық мағынасын түсіндіру'), { c: [2], t: 'тығыздыққа сүйеніп жазылған негіздеме' }],
    t1o3C: [T('«19300 кг/м³» нені білдіретінін жазу'), { c: [1], u: 'conv' }, { c: [2, 3] }, { c: [4] }, { c: [5, 6], u: 'unit' }],
    t1o3EBQ: [{ c: [0] }, { c: [1] }, { c: [2] }, { c: [3] }, { c: [4] }, { c: [5] }, { c: [6] }, { c: [7] }, { c: [8], u: 'conv' }, { c: [9] }],
    // ── 2-тақырып: тығыздықты есептеу, инерция, күш ──
    t2o1A: [{ w: [{ f: 'rho' }, { n: 0.054 }, { n: 0.00002 }] }, { c: [0, 1], u: 'unit' }],
    t2o1B: [{ c: [0], u: 'si' }, { w: [{ f: 'mRhoV' }] }, { c: [1], u: 'unit' }],
    t2o1C: [{ c: [0, 1] }, { c: [2], u: 'conv' }, { c: [3] }, { c: [4] }, { c: [5] }],
    t2o1EBQ: [{ c: [0, 1] }, { c: [2] }, { c: [3] }, { c: [4] }, { c: [5], u: 'conv' }, { c: [6], u: 'conv' }, { c: [7], u: 'unit' }, { c: [8] }, { c: [9] }, { c: [10] }],
    t2o2A: [{ c: [0] }, T('жолаушының алға ауытқу себебін инерциямен түсіндіру')],
    t2o2B: [{ c: [0] }, T('тиын мен картон жағдайын инерциямен түсіндіру'), T('балға жағдайын инерциямен түсіндіру')],
    t2o2C: [T('инерцияның анықтамасын жазу'), { c: [1], t: '«а» жағдайын инерция тұрғысынан түсіндіру' }, { c: [2], t: '«ә» жағдайын инерция тұрғысынан түсіндіру' }, { c: [3], t: '«б» жағдайын инерция тұрғысынан түсіндіру' }, T('күнделікті өмірден инерцияға мысал және түсіндірме')],
    t2o2EBQ: [{ c: [0] }, { c: [1] }, { c: [2] }, { c: [3] }, { c: [4] }, { c: [5] }, { c: [6] }, { c: [7] }, { c: [8], u: 'conv' }, { c: [9] }],
    t2o3A: [{ c: [0] }, { c: [1, 2] }],
    t2o3B: [T('әр жағдайда әсер етуші және әсер алушы денені жазу'), { c: [1, 2, 3] }, { c: [4, 5, 6] }],
    t2o3C: [{ c: [0] }, { c: [1] }, T('күшті масштабпен, бағытымен және түсірілу нүктесінен сызу (тақтада)'), T('шанаға не болатынын түсіндіру'), T('күнделікті өмірден пішіні өзгеретін және жылдамдығы өзгеретін бір-бір мысал')],
    t2o3EBQ: [{ c: [0] }, { c: [1] }, { c: [2], u: 'conv' }, { w: [{ re: /(^|[^\d.,])2(кг)?\*10([^\d.,]|$)|(^|[^\d.,])10(н\/кг)?\*2([^\d.,]|$)/, d: 'F = 2 кг · 10 Н/кг' }] }, { c: [3], u: 'unit' }, { c: [4] }, T('көрсеткінің басын A нүктесіне қойып, бағытын көрсету (тақтада)'), T('көрсеткіні тор көзде есептелген ұзындықпен сызу (тақтада)'), { c: [6, 7] }, { c: [8, 9] }],
    // ── 3-тақырып: салмақ, деформация, Гук заңы ──
    t3o1A: [{ c: [0, 2, 3] }, { c: [1, 4, 5, 6] }],
    t3o1B: [{ c: [0, 1], w: [{ f: 'gPm' }] }, { c: [2] }, T('масса мен салмақты салыстырып жазылған қорытынды')],
    t3o1C: [{ c: [0] }, { c: [1] }, { c: [2, 3] }, T('ауырлық күші мен салмақтың қай денеге түсірілетінін түсіндіру'), { c: [5, 6], t: 'Жер мен Айдағы нәтижелерді салыстырып жазылған қорытынды' }],
    t3o1EBQ: [{ c: [0] }, { c: [1] }, { c: [2] }, { c: [3] }, { c: [4] }],
    t3o2A: [T('күштің ағаштың пішінін өзгертетінін анықтау'), { c: [1], t: 'ағаштың бастапқы пішініне қайтуымен негіздеу' }],
    t3o2B: [{ c: [0, 2, 3, 4] }, { c: [1, 5] }, T('сыныптағы заттардан әр деформация түріне мысал')],
    t3o2C: [{ c: [0, 1] }, { c: [2] }, { c: [3] }, T('серпімді деформация кезіндегі ұзару мен күштің байланысын кестедегі сандармен көрсету'), T('көпірге шектен тыс жүк түсіруге болмайтынын негіздеу')],
    t3o2EBQ: [{ c: [0] }, { c: [1] }, { c: [2] }, { c: [3] }, { c: [4] }, { c: [5] }],
    t3o3A: [{ w: [{ n: 0.03 }] }, { c: [0], u: 'unit' }],
    t3o3B: [{ c: [0] }, { c: [1] }, { c: [2] }],
    t3o3C: [{ c: [0] }, { c: [1] }, { c: [2] }, { c: [3] }, { c: [4], t: 'баудың қатаңдығын екі серіппемен салыстырып жазылған қорытынды' }],
    t3o3EBQ: [{ c: [0, 1, 2] }, { c: [3] }, { c: [4], u: 'conv' }, { c: [5] }, { c: [6], u: 'unit' }],
    // ── 4-тақырып: Гук заңы (есептер), үйкеліс, күштерді қосу ──
    t4o1A: [{ c: [0] }, { c: [1], u: 'unit' }],
    t4o1B: [{ w: [{ n: 1400 }, { n: 0.035 }, { n: 0.021 }] }, { w: [{ f: 'kFx' }, { n: 40000 }] }, { c: [0], u: 'unit' }],
    t4o1C: [{ c: [0] }, { c: [1, 2] }, T('күштерді таңдаған масштабта сызу (тақтада)'), { c: [4] }, { c: [5], u: 'conv' }],
    t4o1EBQ: [{ c: [0] }, { c: [1] }, { c: [2, 3] }, { c: [4, 5, 6, 7] }, { c: [8] }, { c: [9, 10] }, { c: [11] }, { c: [12] }, { c: [13] }, { c: [14] }],
    t4o2A: [{ c: [0] }, T('көлбеу бетте үйкеліс күшінің бағыты және себебі')],
    t4o2B: [T('таспа жағынан әсер ететін күштердің атауын жазу'), T('күштердің бағытын сызбада көрсету (тақтада)'), T('үйкеліс түрін анықтап негіздеу')],
    t4o2C: [T('үйкеліс күшін тарту күшімен салыстыру'), T('тең әрекетті күштің мәні мен күштердің бағытын негіздеу'), { c: [1], t: 'үйкеліс күшінің төмен бағытталуын мысалмен көрсету' }, T('үйкеліс күшінің бағытын қозғалыспен байланыстыру'), { c: [2] }],
    t4o2EBQ: [{ c: [0, 1, 2] }, { c: [3] }, { c: [4, 5] }, { c: [6] }, { c: [7] }, { c: [8] }, { c: [9] }, { c: [10] }, { c: [11] }, T('таңдауды бір сөйлеммен негіздеу')],
    t4o3A: [T('үйкелісті арттыру немесе азайту қажеттігін анықтау'), T('құм себілгенде үйкеліс неге өзгеретінін түсіндіру')],
    t4o3B: [T('үйкеліс пайдалы болатын мысал келтіру'), T('үйкеліс зиянды болатын мысал келтіру'), T('үйкелісті азайтудың кемінде екі тәсілін жазу')],
    t4o3C: [{ c: [0] }, T('ара тістерін бүгудің себебі'), T('жібек жіптің тез шешілуін үйкеліспен түсіндіру'), T('балықты ұстаудың қиындығын үйкеліспен түсіндіру'), T('үйкелісті арттырудың кемінде екі тәсілін жазу')],
    t4o3EBQ: [{ c: [0, 1] }, { c: [2, 3] }, { c: [4, 5, 6], rule: 'twoOfThree' }, { c: [7, 8] }, { c: [9, 10] }, { c: [11, 12] }, T('үйкеліс жоғалғандағы бірінші салдарды жазу'), T('үйкеліс жоғалғандағы екінші салдарды жазу'), { c: [14] }],
    t4o4A: [{ c: [0], t: 'таңдаған масштаб бойынша кесінді ұзындығын есептеу' }, { c: [1, 2], t: 'күштерді сызып, тең әрекетті күшті негіздеу (тақтада)' }],
    t4o4B: [{ c: [0] }, T('күштерді таңдаған масштабта сызу (тақтада)'), { c: [1, 2] }],
    t4o4C: [T('масштабты таңдап, сызбада көрсету'), T('күштерді масштабта дұрыс ұзындықпен сызу (тақтада)'), { c: [0] }, T('тең әрекетті күшті есептеп тексеру'), T('тең әрекетті күштің бағытын сызбада көрсету')],
    t4o4EBQ: [{ c: [0] }, { c: [1] }, { c: [2] }, { c: [3] }, { c: [4], t: 'кесіндіні тор көзде сызу (тақтада)' }, { c: [5, 6] }, T('екі күшті дұрыс бағытта, дұрыс ұзындықпен сызу (тақтада)'), { c: [8, 9] }, { c: [10] }, { c: [11] }],
    t4o5A: [{ c: [0] }, T('тең әрекетті күштің бағытын анықтап негіздеу')],
    t4o5B: [{ lst: { i: 0, has: [8] } }, { lst: { i: 0, has: [6, 4, 2] } }, T('әр нұсқада тең әрекетті күштің бағытын анықтау')],
    t4o5C: [{ w: [{ n: 125000 }] }, { c: [0] }, { w: [{ re: /(^|[^\d.,])1н/, d: 'P = 1 Н' }] }, T('гирьге әсер ететін күштердің бағытын анықтау'), { c: [1] }],
    t4o5EBQ: [{ c: [0] }, { c: [1] }, { c: [2] }, { c: [3] }, { c: [4] }, { c: [5] }, { c: [6] }, { c: [7] }, { c: [8] }, { c: [9, 10] }]
  };
})();

PL.grading = (function () {
  const t = (k, v) => PL.t(k, v);
  const SPEC = window.PHYS_GRADING || {};
  const cellText = (c) => PL.render.plain(c.b);

  /* Word дескриптор кестесінен жолдар: [{ri, crit, text, max}] («Барлығы» және тақырып жолдарынсыз) */
  function descriptorRows(task) {
    if (!task.descriptors || !task.descriptors.rows || task.descriptors.rows.length < 2) return [];
    const rows = task.descriptors.rows;
    const colsOf = (rw) => { const out = []; let p = 0; rw.forEach(c => { out.push(p); p += c.cs || 1; }); return out; };
    const hdr = rows[0], hpos = colsOf(hdr);
    const htext = hdr.map(cellText);
    let dCol = htext.findIndex(h => /дескриптор/i.test(h)); if (dCol < 0) dCol = Math.min(1, hdr.length - 1);
    let pCol = htext.findIndex(h => /^Балл/i.test(h)); if (pCol < 0) pCol = hdr.length - 1;
    let cCol = htext.findIndex((h, i) => i !== dCol && i !== pCol && /деңгей|критерий|дағды|блум/i.test(h));
    const at = (rw, pos) => { const ps = colsOf(rw); const i = ps.indexOf(pos); return i >= 0 ? rw[i] : null; };
    const out = [];
    let lastCrit = '';
    rows.forEach((rw, ri) => {
      if (ri === 0) return;
      if (rw.some(c => /^Барлығы/i.test(cellText(c)))) return;
      const dc = at(rw, hpos[dCol]) || rw[Math.min(dCol, rw.length - 1)];
      const pc = at(rw, hpos[pCol]) || rw[rw.length - 1];
      const max = pc ? parseFloat(cellText(pc).replace(',', '.')) : NaN;
      if (!dc || isNaN(max)) return;
      const cc = cCol >= 0 ? at(rw, hpos[cCol]) : null;
      const crit = cc && cellText(cc) ? cellText(cc) : lastCrit;
      lastCrit = crit;
      out.push({ ri, crit, text: cellText(dc), max });
    });
    return out;
  }

  // ── Шешу жолын (теңдеу редакторы жолдары) қалыпқа келтіру ──
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  const SUBS = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
  function normWork(lines) {
    return (lines || []).map(l => String(l.v || '')).join(' ; ')
      .replace(/\\text\{([^}]*)\}|\\mathrm\{([^}]*)\}|\\operatorname\{([^}]*)\}/g, (m, a, b, c) => a || b || c || '')
      .replace(/\{,\}/g, ',')
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
      .replace(/\\rho|ρ/g, 'ρ').replace(/\\Delta|Δ|\\delta/g, 'δ')
      .replace(/\\cdot|\\times|·|×|⋅|∙/g, '*').replace(/\\left|\\right|\\[,;! ]|~/g, '')
      .replace(/−|–|—/g, '-').replace(/[₀-₉]/g, ch => SUBS[ch])
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, m => '^' + m.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, ch => SUP[ch]))
      .replace(/[{}()\s]/g, '').replace(/:/g, '/')
      .toLowerCase();
  }
  const FORMULA = {
    rho: { re: /ρ=m\/v|p=m\/v/, d: 'ρ = m / V' },
    mRhoV: { re: /m=ρ\*?v|m=v\*?ρ|m=p\*v|m=v\*p/, d: 'm = ρ · V' },
    gPm: { re: /g[а-яa-z0-9]*=[pf][а-яa-z0-9]*\/m/, d: 'g = P / m' },
    kFx: { re: /k[0-9]*=f[а-яa-z0-9]*\/δ?[lx][0-9]*/, d: 'k = F / Δx' }
  };
  function numbersIn(s) {
    const out = [];
    const re = /(\d+(?:[.,]\d+)?)(?:\*10\^(-?\d+))?/g;
    let m;
    while ((m = re.exec(s))) {
      let v = parseFloat(m[1].replace(',', '.'));
      if (m[2]) v *= Math.pow(10, parseInt(m[2], 10));
      out.push(v);
    }
    return out;
  }
  const near = (a, b) => Math.abs(a - b) <= Math.max(Math.abs(b) * 1e-6, 1e-12);
  function evidence(ev, work, nums) {
    if (ev.f) return { ok: FORMULA[ev.f].re.test(work), d: FORMULA[ev.f].d };
    if (ev.n != null) return { ok: nums.some(x => near(x, ev.n)), d: String(ev.n).replace('.', ',') };
    if (ev.re) return { ok: ev.re.test(work), d: ev.d };
    return { ok: false, d: '?' };
  }

  function listValues(v) {
    if (!v || !String(v).trim()) return null;
    return String(v).split(/[;\n]+|,\s+/).map(s => PL.checker.parseQuantity(s)).filter(q => q && !isNaN(q.num)).map(q => q.num);
  }

  const short = (s) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > 48 ? s.slice(0, 46) + '…' : s; };

  /* Бір тапсырманы дескрипторлар бойынша бағалау.
     results — solcheck.analyze() нәтижелері, lines — шешу жолдары, hasWork — шешу тек тақтада (мәтін жоқ),
     teacher — мұғалім қойған балдар {ri: балл}, ai — AI алдын ала бағасы {ri: {pts, comment}} */
  function grade(task, items, results, lines, hasWork, teacher, ai) {
    const rows = descriptorRows(task);
    const spec = SPEC[task.id];
    if (!rows.length || !spec) return null;
    if (spec.length !== rows.length) console.warn('[grading] ' + task.id + ': дескриптор саны (' + rows.length + ') мен карта (' + spec.length + ') сәйкес емес');
    // results — solcheck.js: оқушының шешу мәтінінен табылған әр бақылау нүктесінің күйі
    const res = results || [];
    const work = normWork(lines), nums = numbersIn(work);
    const out = rows.map((row, k) => {
      const s = spec[k] || { t: row.text };
      const g = { ri: row.ri, crit: row.crit, text: row.text, max: row.max, earned: 0, status: 'pending', fb: '' };
      // Түсіндірме ережесі бар болса (explain-rules.js), сөз/ашық жауап өрістерін ереже өзі тексереді
      const xr = (window.PHYS_EXPLAIN || {})[task.id] && window.PHYS_EXPLAIN[task.id][k];
      const auto = (s.c || []).filter(i => !xr || !items[i] || (items[i].k !== 'word' && items[i].k !== 'open')).map(i => ({ i, r: res[i] || { status: 'unsure' }, l: items[i] ? items[i].l : '' }));
      const fail = [], unit = [], empty = [], unsure = [], unitNote = [], failFb = [];
      auto.forEach(a => {
        const st = a.r.status;
        if (st === 'wrong') { fail.push(a.l); if (a.r.fb) failFb.push(a.r.fb); }
        else if (st === 'empty') empty.push(a.l);
        else if (st === 'unsure' || st === 'open') unsure.push(a.l + (a.r.board ? ' (тақтада)' : ''));
        else if (st === 'partial') {
          if (s.u === 'si' || (s.u === 'unit' && a.r.reason === 'nounit') || (s.u === 'conv' && a.r.reason === 'conv')) unit.push(a.l);
          else unitNote.push(a.l);
        }
      });
      // ерекше ереже: «үш сұрақтың кемінде екеуіне — 1 балл, үшеуіне — 2 балл»
      if (s.rule === 'twoOfThree') {
        const okN = auto.filter(a => a.r.status === 'ok').length;
        const emptyN = auto.filter(a => a.r.status === 'empty').length;
        if (emptyN === auto.length && hasWork) { g.status = 'pending'; g.fb = t('gfEmptyWork'); }
        else {
          g.earned = okN >= 3 ? 2 : okN >= 2 ? 1 : 0;
          g.status = g.earned === row.max ? 'ok' : g.earned > 0 ? 'part' : 'fail';
          g.fb = t('gfTwoOfThree', { n: okN });
        }
        return applyOverrides(g, teacher, ai);
      }
      if (s.lst) {
        const vals = (res[s.lst.i] && res[s.lst.i].values && res[s.lst.i].values.length) ? res[s.lst.i].values : null;
        if (!vals) { g.status = hasWork ? 'pending' : 'fail'; g.fb = hasWork ? t('gfEmptyWork') : t('gfEmpty', { l: short(items[s.lst.i].l) }); }
        else if (s.lst.has.every(v => vals.some(x => near(x, v)))) { g.status = 'ok'; g.earned = row.max; g.fb = t('gfOk'); }
        else { g.status = 'fail'; g.fb = t('gfListMiss', { v: s.lst.has.join('; ') }); }
        return applyOverrides(g, teacher, ai);
      }
      if (xr && !fail.length && !unit.length && !empty.length) {
        if (res.some(r => r && r.copy) || (hasWork && !(lines || []).some(l => String(l.v || '').trim()))) { g.status = 'pending'; g.fb = t('gfTeacher') + '.'; return applyOverrides(g, teacher, ai); }
        const ev = PL.explain.evaluate(xr, lines);
        if (ev.st === 'ok' && !unsure.length) { g.status = 'ok'; g.earned = row.max; g.fb = xr.ok || t('gfOk'); }
        else if (ev.st === 'ok') { g.status = 'pending'; g.fb = t('gfTeacher') + ': ' + t('gfUnsure', { l: unsure.map(short).join('», «') }) + '.'; }
        else if (ev.st === 'pending') { g.status = 'pending'; g.fb = t('gfTeacherExpl'); }
        else if (ev.st === 'part') { g.status = 'fail'; g.partial = true; g.fb = xr.part || t('gfPartial'); }
        else if (ev.st === 'contra') { g.status = 'fail'; g.fb = xr.contra || t('gfContra'); }
        else { g.status = 'fail'; g.fb = xr.none || t('gfNone'); }
        return applyOverrides(g, teacher, ai);
      }
      if (fail.length) { g.status = 'fail'; g.fb = failFb.length ? failFb.join(' ') : t('gfWrong', { l: fail.map(short).join('», «') }); return applyOverrides(g, teacher, ai); }
      if (unit.length) { g.status = 'fail'; g.fb = t(s.u === 'conv' || (s.u === 'si' && auto.some(a => a.r.reason === 'conv')) ? 'gfConv' : 'gfUnit', { l: unit.map(short).join('», «') }); return applyOverrides(g, teacher, ai); }
      if (empty.length) {
        if (hasWork) { g.status = 'pending'; g.fb = t('gfEmptyWork'); }
        else { g.status = 'fail'; g.fb = t('gfEmpty', { l: empty.map(short).join('», «') }); }
        return applyOverrides(g, teacher, ai);
      }
      const reasons = [];
      if (unsure.length) reasons.push(t('gfUnsure', { l: unsure.map(short).join('», «') }));
      (s.w || []).forEach(ev => { const e = evidence(ev, work, nums); if (!e.ok) reasons.push(t('gfNoEvidence', { d: e.d })); });
      if (s.t) reasons.push(s.t);
      if (reasons.length) { g.status = 'pending'; g.fb = t('gfTeacher') + ': ' + reasons.join('; ') + '.'; g.teacherPart = s.t || ''; }
      else { g.status = 'ok'; g.earned = row.max; g.fb = unitNote.length ? t('gfOkUnitNote') : (s.w ? t('gfOkWork') : t('gfOk')); }
      return applyOverrides(g, teacher, ai);
    });
    const sum = (f) => out.reduce((a, g) => a + f(g), 0);
    return {
      rows: out,
      max: sum(g => g.max),
      earned: sum(g => (g.status === 'pending' ? 0 : g.earned)),
      pending: sum(g => (g.status === 'pending' ? g.max : 0)),
      aiPts: sum(g => (g.status === 'ai' ? g.earned : 0)),
      teacherPts: sum(g => (g.status === 'teacher' ? g.earned : 0))
    };
  }
  function applyOverrides(g, teacher, ai) {
    if (teacher && teacher[g.ri] != null && teacher[g.ri] !== '') {
      g.auto = { status: g.status, earned: g.earned };
      g.earned = Math.max(0, Math.min(g.max, +teacher[g.ri]));
      g.status = 'teacher'; g.fb = t('gfTeacherSet');
    } else if (g.status === 'pending' && ai && ai[g.ri] && ai[g.ri].local) {
      // Жергілікті модельдің бағасы сенімсіз: ұпай қосылмайды, тек ұсыныс ретінде көрсетіледі
      g.suggest = Math.max(0, Math.min(g.max, +ai[g.ri].pts || 0));
      g.fb += ' ' + t('gfLocal', { n: g.suggest, m: g.max }) + (ai[g.ri].comment ? ' — ' + ai[g.ri].comment : '');
    } else if (g.status === 'pending' && ai && ai[g.ri]) {
      g.earned = Math.max(0, Math.min(g.max, +ai[g.ri].pts || 0));
      g.status = 'ai'; g.fb = t('gfAi') + (ai[g.ri].comment ? ': ' + ai[g.ri].comment : '');
    }
    return g;
  }

  return { grade, descriptorRows, normWork, numbersIn };
})();
