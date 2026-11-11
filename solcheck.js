/*
 * ШЕШУ МӘТІНІН ТАЛДАУ — оқушы «Менің шешуім» редакторына жазған толық шешуді автоматты тексеру.
 *
 * Бөлек жауап өрістері жоқ: checks.js ішіндегі әр «бақылау нүктесі» (сан, тізім, таңдау, сөз/формула, ашық сұрақ)
 * оқушы мәтінінен ізделеді. Жазу реті маңызды емес.
 *
 *  • Сандар мен бірліктер: мәтіннен барлық шамалар (сан + бірлік, 2,5·10⁻⁵, 40 000, LaTeX \frac, {,} …) алынады,
 *    ХБЖ-ға келтіріліп салыстырылады. Оқушы санды дөңгелектесе (13,28 → 13,3) — қабылданады.
 *    Күтілген мән шартта бұрыннан бар болса (мысалы, «Берілгені» көшірілгенде), ол тек есептеу нәтижесі ретінде
 *    (теңдіктің соңғы бөлігі немесе «Жауабы» жолы) кездескенде ғана есептеледі — шартты көшіру жауап болып саналмайды.
 *  • Формулалар: математикалық баламалы жазулар қабылданады (ρ = m/V ≡ \rho=\frac{m}{V} ≡ m/V = ρ).
 *  • Таңдау жауаптары: сұрақтың нөмірі (1), 2.2 а), 3-қадам) немесе кілт сөздері бар жолдан ізделеді;
 *    «Масса: 1, 3, 4» сияқты топтау түрі де танылады. Сенімді анықталмаса — «сенімсіз» (мұғалім тексереді).
 *  • Түсіндірмелер (open) автоматты тексерілмейді.
 * Кілт сөздің жай ғана бар болуы бағаланбайды: сандар ХБЖ бойынша есептеледі, таңдау — нақты сұраққа байланыстырылады.
 */
window.PL = window.PL || {};
PL.solcheck = (function () {
  const LET = 'a-zа-яёәіңғүұқөһ';
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  const SUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };

  // ── LaTeX (MathLive) → жай мәтін ──
  function latexToLinear(s) {
    let x = String(s || '').replace(/\{,\}/g, ',').replace(/\\left|\\right/g, '').replace(/\\displaystyle/g, '');
    x = x.replace(/\\(?:text|mathrm|operatorname|mathit|textbf)\{([^{}]*)\}/g, ' $1 ').replace(/\s+\^/g, '^');
    for (let i = 0; i < 4; i++) x = x.replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, (m, a, b) => /^[\sa-zA-Zа-яА-ЯәіңғүұқөһӘІҢҒҮҰҚӨҺ^0-9]*$/.test(a + b) && /[a-zA-Zа-яА-Я]/.test(a) && /[a-zA-Zа-яА-Я]/.test(b) && !/\d\s*$/.test(a.trim().replace(/\^\d$/, '')) ? a.trim() + '/' + b.trim() : '(' + a + ')/(' + b + ')');
    x = x.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)').replace(/\{,\}/g, ',')
      .replace(/\\cdot|\\times|\\ast/g, '·').replace(/\\div/g, ':').replace(/\\rho/g, 'ρ').replace(/\\Delta/g, 'Δ').replace(/\\delta/g, 'Δ')
      .replace(/\\approx/g, '≈').replace(/\\mu/g, 'μ').replace(/\\pi/g, 'π').replace(/\\to|\\rightarrow/g, '→').replace(/\\degree|\\circ/g, '°')
      .replace(/\^\{([^{}]*)\}/g, '^$1').replace(/_\{([^{}]*)\}/g, '_$1')
      .replace(/\\[,;:! ]|~|\\q?quad/g, ' ').replace(/\\[a-zA-Z]+/g, ' ').replace(/[{}]/g, '');
    return x;
  }
  /* Формула жолында бос орынсыз біріккен мәтінді бөлу: «Берілгеніm=54гV=20см^3m» → «Берілгені m=54г V=20см^3 m» */
  const CYR = 'а-яәіңғүұқөһё';
  function unmerge(x) {
    return x
      .replace(new RegExp('([' + CYR + ']{3,})(\\d)', 'gi'), '$1 $2')                // Жауабы3Н → Жауабы 3Н
      .replace(new RegExp('([' + CYR + '])([a-zA-ZρΔδ])', 'gi'), '$1 $2')             // гV → г V
      .replace(new RegExp('([a-zA-Z])([' + CYR + ']{3,})', 'g'), '$1 $2')             // mЖауабы → m Жауабы
      .replace(/(\^-?\d+)(?=[a-zA-Zа-яА-ЯәіңғүұқөһΔρ])/g, '$1 ')                      // м^3m → м^3 m
      .replace(new RegExp('(\\d)([' + CYR + ']{4,})', 'gi'), (m, d, w) => (PL.checker.normUnit(w) ? m : d + ' ' + w)); // 54грамм ок, 3есептеу → 3 есептеу
  }
  function lineText(l) { return l.t === 'm' ? unmerge(latexToLinear(l.v)) : String(l.v || ''); }
  function prep(s) {
    return String(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, m => '^' + m.split('').map(c => SUP[c]).join(''))
      .replace(/[₀-₉]/g, c => SUB[c]).replace(/−|–|—/g, '-').replace(/ /g, ' ').replace(/×/g, '·').replace(/\*/g, '·');
  }
  const norm = (s) => prep(s).toLowerCase().replace(/ё/g, 'е').replace(/[«»"“”„']/g, '').replace(/\s+/g, ' ').trim();
  const compact = (s) => norm(s).replace(/\\?rho/g, 'ρ').replace(/[\s()·]/g, '').replace(/:|÷/g, '/').replace(/_/g, '');

  // ── Шамаларды табу: сан (+ ×10ⁿ) + бірлік ──
  const QRE = new RegExp('(\\d{1,3}(?:[  ]\\d{3})+(?![\\d,.])|\\d+)([.,]\\d+)?(?:\\s*·\\s*10\\s*\\^\\s*\\(?(-?\\d+)\\)?|\\s*e(-?\\d+))?(\\s*(?:[' + LET + 'μ°]+(?:\\s*\\/\\s*[' + LET + ']+)?(?:\\^?-?\\d)?))?', 'gi');
  function unitOf(raw) {
    if (!raw) return null;
    let u = raw.trim().replace(/\s+/g, '');
    const nu = PL.checker.normUnit(u);
    if (nu) return nu;
    const m = u.match(/^(.+?)-?(ге|ға|ке|қа|ден|дан|тен|тан|нен|нан|мен|бен|пен|ды|ді|ты|ті|ны|ні|да|де|та|те)$/i);
    if (m && PL.checker.normUnit(m[1])) return PL.checker.normUnit(m[1]);
    return null;
  }
  const CASE = /^(ге|ға|ке|қа|не|на|ден|дан|тен|тан|нен|нан|ге тең|мен|бен|пен|ден|ші|шы|сы|сі|ы|і|да|де|та|те)(?![а-яәіңғүұқөһ])/i;
  function quantities(text) {
    const out = []; let m; QRE.lastIndex = 0;
    while ((m = QRE.exec(text))) {
      const i = m.index, before = text[i - 1] || '';
      const numEnd = i + m[1].length + (m[2] || '').length;
      const after = text.slice(i + m[0].length, i + m[0].length + 8);
      if (new RegExp('[' + LET + '_^0-9]', 'i').test(before) || text.slice(i - 2, i) === '^-') continue; // m1, V_2, 10^-5
      const hy = text.slice(numEnd).match(/^-([а-яәіңғүұқөһ]+)/i);
      if (hy && !CASE.test(hy[1])) continue;                                        // 3-қадам, 1-серіппе (бірақ 0-ге — сан)
      if (!m[5] && /^\s*\)/.test(after)) continue;                                  // 1) тармақ нөмірі
      let num = parseFloat((m[1].replace(/[  ]/g, '') + (m[2] || '')).replace(',', '.'));
      const exp = m[3] != null ? parseInt(m[3], 10) : m[4] != null ? parseInt(m[4], 10) : null;
      if (exp != null) num *= Math.pow(10, exp);
      const unit = hy ? null : unitOf(m[5]);
      const word = !unit && !!m[5] && /[a-zа-яәіңғүұқөһ]{2,}/i.test(m[5]);   // «3 балл», «2 шар» — бірлік емес сөз
      const unitRaw = unit ? m[5].trim() : '';
      const decimals = exp == null ? (m[2] ? m[2].length - 1 : 0) : null;
      out.push({ num, unit, unitRaw, raw: (m[1] + (m[2] || '') + (exp != null ? '·10^' + exp : '') + (unit ? ' ' + unitRaw : '')).trim(), idx: i, end: i + m[0].length, decimals, word });
    }
    return out;
  }
  const U = (u) => { const n = PL.checker.normUnit(u); if (!n) return null; const c = PL.checker.convert(1, n); return c && !c.err ? { name: n, f: c.factor, si: c.to } : { name: n, f: 1, si: n }; };
  const dimOf = (u) => { const x = U(u); return x ? x.si : null; };

  // ── Тармақ белгілері: «2-қадам», «1.1» (жол басында), «1)», «а)» ──
  const ENUM_L = 'аәбвгғдabcd';
  function markersIn(s, lineStart) {
    const out = []; let m;
    const re = new RegExp('(\\d+)\\s*-\\s*қадам|(\\d+)\\s*\\)|([' + ENUM_L + '])\\)', 'gi');
    while ((m = re.exec(s))) {
      const prev = s.slice(0, m.index).replace(/\s+$/, '');
      const pc = prev[prev.length - 1] || '';
      if (m[2] && /[\d.,]/.test(s[m.index - 1] || '')) continue;
      if (m[3] && ((/\d/.test(pc) && !/(^|\s)\d+\.\d+\s*$/.test(prev)) || new RegExp('[' + LET + ']', 'i').test(s[m.index - 1] || ''))) continue; // «2 г)», сөздің ішіндегі әріп (бірақ «3.4 а)» — белгі)
      out.push({ pos: m.index, end: m.index + m[0].length, mark: m[1] ? m[1] + '-қадам' : m[2] ? m[2] + ')' : m[3].toLowerCase() + ')', kind: m[1] ? 'step' : 'item' });
    }
    if (lineStart) { const sm = s.match(/^\s*(\d+(?:\.\d+)+)(?=\s)/); if (sm) out.unshift({ pos: 0, end: sm[0].length, mark: sm[1], kind: 'sec' }); }
    return out.sort((a, b) => a.pos - b.pos);
  }

  /* Шартты көшіру — шешу емес. Шарттағы қатарынан 4 сөзден тұратын тізбектер жиыны (нұсқалар тізімі «а / б / в»
     мен «:» бөлгіш ретінде алынады, сондықтан «кітаптың массасы гирлердің массасына тең» деген жауап өшпейді). */
  const TOK = /_{2,}|[a-zа-яёәіңғүұқөһρδ\d][a-zа-яёәіңғүұқөһρδ\d,.\-\/^]*/gi;
  const cleanTok = (w) => /^_+$/.test(w) ? '_' : w.toLowerCase().replace(/ё/g, 'е').replace(/[.,]+$/, '');
  function condGrams(task) {
    const set = new Set();
    const txt = prep(PL.render.plain(task.condition || [])).toLowerCase();
    txt.split(/[\n:;?!()«»]|\.\s/).forEach(seg => {
      const parts = seg.split(/\s\/\s/);
      parts.forEach((part, pi) => {
        let toks = part.match(TOK) || [];
        toks = toks.map(cleanTok);
        if (pi < parts.length - 1) toks = toks.slice(0, -1);      // тізімдегі бірінші нұсқа сұрақпен қосылмасын
        if (pi > 0) toks = toks.slice(1);                         // соңғы нұсқадан кейінгі сөздер
        // кемінде екі нақты сөз болуы керек: «2700 кг/м³ темір 7800» сияқты сандар тізбегі көшірме саналмайды
        for (let i = 0; i + 4 <= toks.length; i++) { const g = toks.slice(i, i + 4); if (g.filter(w => /[a-zа-яәіңғүұқөһ]{3,}/i.test(w) && !/\d/.test(w)).length >= 2) set.add(g.join(' ')); }
      });
    });
    return set;
  }
  function maskCopied(raw, grams) {
    if (!grams || !grams.size) return raw;
    const toks = []; let m; TOK.lastIndex = 0;
    while ((m = TOK.exec(raw))) toks.push({ s: m.index, e: m.index + m[0].length, w: cleanTok(m[0]) });
    const cover = new Array(toks.length).fill(false);
    for (let i = 0; i + 4 <= toks.length; i++) if (grams.has(toks.slice(i, i + 4).map(t => t.w).join(' '))) for (let j = i; j < i + 4; j++) cover[j] = true;
    let out = raw;
    toks.forEach((t, i) => { if (cover[i]) out = out.slice(0, t.s) + ' '.repeat(t.e - t.s) + out.slice(t.e); });
    return out;
  }

  // «;», «.», «:» белгілерінен кейін (бос орын немесе жол соңы болса) бөлу — ұзындығы сақталады
  function splitStatements(s) {
    const out = []; let start = 0;
    for (let i = 0; i < s.length; i++) if (/[;.:]/.test(s[i]) && (i + 1 === s.length || /\s/.test(s[i + 1]))) { out.push(s.slice(start, i + 1)); start = i + 1; }
    if (start < s.length) out.push(s.slice(start));
    return out;
  }

  /* Мәтінді құрылымдау: жолдар → тармақтар (белгі бойынша) → тұжырымдар (;) → теңдік бөліктері (=, ≈) → шамалар */
  function parse(lines, grams, condNorm) {
    const L = [];
    let sec = null, step = null;
    (lines || []).forEach((l, li) => {
      const full = prep(lineText(l));
      let raw = maskCopied(full, grams);             // шарттан көшірілген тізбектер бос орынмен алмастырылған (ұзындығы сол)
      // шарттағы тұжырымды сөзбе-сөз көшіру (мыс., «Көмек: 12 см = 0,12 м») — жауап емес
      if (condNorm) { let off = 0; splitStatements(raw).forEach(st => { const ns = norm(st).replace(/[;.:]$/, '').trim(); const body = ns.replace(/^(\d+\s*-\s*қадам\s*:?\s*)?((\d+(\.\d+)*|[аәбвгғд])\s*\)\s*)*/i, ''); if (body.length >= 10 && (body.match(TOK) || []).length >= 3 && condNorm.includes(ns)) raw = raw.slice(0, off) + ' '.repeat(st.length) + raw.slice(off + st.length); off += st.length; }); }
      // көшірілген сұрақ («…қозғалады?») немесе нұсқау («…таңдаңыз:») — жауап емес, тек одан кейінгі мәтін есептеледі
      const qEnd = Math.max(raw.lastIndexOf('?') + 1, (() => { let e = 0, mm; const re = /[а-яәіңғүұқөһ]+(?:ңыз|ңіз)\s*:/gi; while ((mm = re.exec(raw))) e = mm.index + mm[0].length; return e; })());
      if (qEnd > 0) raw = raw.slice(0, qEnd).replace(/[^\s]/g, (ch, i) => (/[\d)]/.test(ch) && /^\s*(\d+(\.\d+)*\s*\)?|[аәбвгғд]\))?\s*$/i.test(raw.slice(0, i + 1)) ? ch : ' ')) + raw.slice(qEnd);
      if (!full.trim()) return;
      const lineNorm = norm(raw);
      const isAnswer = /^\s*(жауабы|жауап|answer|ответ)/i.test(lineNorm) || /жауабы\s*:/i.test(lineNorm);
      const isGiven = /^\s*(берілгені|берілген|дано|given)/i.test(lineNorm);
      // тармақтар
      const soft = (x) => x.toLowerCase().replace(/ё/g, 'е').replace(/[«»"“”„']/g, ' '); // ұзындығы сақталады
      const rawLow = soft(raw), fullLow = soft(full);
      const mk = markersIn(fullLow, true);
      if (mk.some(x => x.kind === 'sec')) { sec = mk.find(x => x.kind === 'sec').mark; step = null; }
      const ctx = () => [sec, step].filter(Boolean);
      const pieces = []; let cur = { marks: mk.some(x => x.kind === 'sec') ? [] : ctx(), start: 0 };
      mk.forEach(x => {
        if (x.kind === 'sec') { cur.marks = [x.mark]; return; }
        if (x.kind === 'step') { step = x.mark; if (x.pos > cur.start + 2) { cur.end = x.pos; pieces.push(cur); } cur = { marks: ctx(), start: x.pos }; return; }
        if (x.pos > cur.start + 1 || cur.marks.some(mm => /\)$/.test(mm))) { cur.end = x.pos; pieces.push(cur); cur = { marks: ctx(), start: x.pos }; }
        cur.marks.push(x.mark);
      });
      cur.end = rawLow.length; pieces.push(cur);
      pieces.forEach(p => { p.loose = l.t === 'm'; p.text = rawLow.slice(p.start, p.end); p.full = fullLow.slice(p.start, p.end); p.compact = compact(p.text); p.line = li; p.isAnswer = isAnswer; if (!p.marks.length && sec) p.marks.push(sec); });
      // шамалар
      const qs = [];
      let off = 0;
      raw.split(';').forEach((stmt) => {
        const segs = stmt.split(/=|≈/);
        let soff = off;
        segs.forEach((seg, gi) => {
          const qq = quantities(seg);
          let rest = seg; qq.slice().sort((a, b) => b.idx - a.idx).forEach(q => { rest = rest.slice(0, q.idx) + rest.slice(q.end); });
          const hasOp = /[+·\/:√^]|\s-\s|^\s*-/.test(rest.replace(/[а-яa-z]+\s*\/\s*[а-яa-z]+/gi, ''));
          const restWords = rest.replace(/[\s.,;:()]/g, '');
          qq.forEach(q => qs.push(Object.assign(q, {
            line: li, seg: gi, segs: segs.length, pos: soff + q.idx,
            result: gi >= 1 && qq.length === 1 && !hasOp, last: gi === segs.length - 1 && gi >= 1,
            alone: qq.length === 1 && !hasOp && segs.length === 1 && restWords.replace(/^(\d+\)|[аәбвгғд]\))+/i, '').length <= 3,
            answer: isAnswer, given: isGiven
          })));
          soff += seg.length + 1;
        });
        off += stmt.length + 1;
      });
      // Тармақта тек сандар тұрса («2) 200 г, 50 г») — олар оқушының жауабы
      pieces.forEach(p => {
        const inP = qs.filter(q => q.pos >= p.start - 1 && q.pos < p.end);
        if (!inP.length) return;
        let rest = raw.slice(p.start, p.end);
        inP.slice().sort((a, b) => b.pos - a.pos).forEach(q => { const a = q.pos - p.start; rest = rest.slice(0, a) + rest.slice(a + (q.end - q.idx)); });
        rest = rest.toLowerCase().replace(/\d+\s*-\s*қадам|\d+(\.\d+)*\s*\)|[аәбвгғд]\)|\d+\.\d+/g, '').replace(/[\s,;:.()=]|және|и\b/g, '').replace(/[a-zа-яδρ]_?\d*/gi, m => m.length <= 3 ? '' : m);
        if (rest.length <= 2) inP.forEach(q => { q.alone = true; });
      });
      L.push({ i: li, loose: l.t === 'm', raw, full, norm: lineNorm, compact: compact(raw), qs, pieces, isAnswer, isGiven });
    });
    return L;
  }

  // Санды салыстыру: дәл немесе оқушы дөңгелектеген түрі (кемінде 2 мәнді цифр, қате ≤ 1 %)
  function sameNum(a, b, tol) {
    if (tol != null) return Math.abs(a - b) <= tol + 1e-12;
    return Math.abs(a - b) <= Math.max(Math.abs(b) * 1e-6, 1e-12);
  }
  function roundedEq(q, target) {
    if (q.decimals == null) return false;
    const r = Math.round(target * Math.pow(10, q.decimals)) / Math.pow(10, q.decimals);
    const sig = String(q.num).replace('.', '').replace(/^0+/, '').length;
    return sig >= 2 && Math.abs(r - q.num) < 1e-9 * Math.max(1, Math.abs(q.num)) && Math.abs(target - q.num) <= Math.abs(target) * 0.01;
  }

  function condValues(task) {
    const qs = quantities(prep(PL.render.plain(task.condition || [])));
    return qs.map(q => ({ num: q.num, unit: q.unit, si: q.unit ? q.num * U(q.unit).f : null, dim: q.unit ? dimOf(q.unit) : null }));
  }

  // ── Сандық бақылау нүктесі ──
  function checkNum(it, P, cond, otherVals) {
    const all = P.flatMap(l => l.qs);
    const eU = it.u && it.u !== 'есе' ? U(it.u) : null;
    const eSI = eU ? it.v * eU.f : it.v;
    // Шарттағы шаманы сол бірлікпен көшіру (мыс., «Берілгені: m = 54 г») — есептеу нәтижесі емес
    const copied = (q) => cond.some(c => sameNum(c.num, q.num) && (c.unit || null) === (q.unit || null)) && (q.given || !(q.result || q.alone || q.answer));
    let best = null;
    const rank = { ok: 3, conv: 2, nounit: 1 };
    all.forEach(q => {
      if (copied(q)) return;
      let kind = null;
      if (!eU) {
        if (sameNum(q.num, it.v, it.tol) || roundedEq(q, it.v)) kind = 'ok';
      } else if (q.unit) {
        const qU = U(q.unit);
        if (qU && qU.si === eU.si) {
          const inQ = eSI / qU.f, tolQ = it.tol != null ? it.tol * eU.f / qU.f : null;
          if (sameNum(q.num, inQ, tolQ) || roundedEq(q, inQ)) kind = (qU.name === eU.name || it.any || it.v === 0) ? 'ok' : 'conv';
        }
      } else if (q.word) { /* «3 балл» — сұралған шама емес */ }
      else if (sameNum(q.num, it.v, it.tol) || roundedEq(q, it.v)) kind = (it.uo || it.v === 0) ? 'ok' : 'nounit';
      else if (eU.f !== 1 && (sameNum(q.num, eSI) || roundedEq(q, eSI))) kind = it.uo ? 'conv' : 'nounit';
      if (kind && (!best || rank[kind] > rank[best.kind])) best = { kind, q };
    });
    if (best) {
      if (best.kind === 'ok') return { status: 'ok', found: best.q.raw, line: best.q.line };
      return { status: 'partial', reason: best.kind === 'conv' ? 'conv' : 'nounit', found: best.q.raw, line: best.q.line };
    }
    // Табылмады: сол шамаға ұқсас өзге нәтиже бар ма (қате есептеу)?
    const wrong = all.find(q => (q.result || q.alone) && !q.given && (eU ? q.unit && dimOf(q.unit) === eU.si : true)
      && !cond.some(c => sameNum(c.num, q.num)) && !otherVals.some(v => sameNum(v, eU && q.unit ? q.num * U(q.unit).f : q.num)));
    if (wrong) return { status: 'wrong', found: wrong.raw, line: wrong.line };
    return { status: 'empty' };
  }

  const isCopiedQ = (q, cond) => cond.some(c => sameNum(c.num, q.num) && (c.unit || null) === (q.unit || null)) && (q.given || !(q.result || q.alone || q.answer));
  function checkList(it, P, cond) {
    const eU = it.u ? U(it.u) : null;
    const all = P.flatMap(l => l.qs).filter(q => !isCopiedQ(q, cond));
    const found = [];
    it.vs.forEach(v => {
      const hit = all.find(q => {
        if (q.unit && eU) { const qU = U(q.unit); return qU && qU.si === eU.si && (sameNum(q.num * qU.f, v * eU.f) || roundedEq(q, v * eU.f / qU.f)); }
        return sameNum(q.num, v, it.tol) || roundedEq(q, v);
      });
      if (hit) found.push(v);
    });
    const vals = all.map(q => q.unit && eU && U(q.unit) && U(q.unit).si === eU.si ? q.num * U(q.unit).f / eU.f : q.num);
    if (found.length === it.vs.length) return { status: 'ok', found: it.vs.map(v => String(v).replace('.', ',')).join('; '), values: vals };
    if (found.length) return { status: 'wrong', values: vals, count: found.length, need: it.vs.length };
    return { status: 'empty', values: vals };
  }

  // ── Мәтіннен сөз/нұсқа іздеу (кирилл әріптерінің шекарасымен, қазақ жалғауларына рұқсат) ──
  const SUFFIX = /^(ның|нің|дың|дің|тың|тің|ға|ге|қа|ке|на|не|да|де|та|те|дан|ден|тан|тен|нан|нен|ны|ні|ды|ді|ты|ті|мен|бен|пен|сы|сі|ы|і|лар|лер|дар|дер|тар|тер)/i;
  function findAll(hay, needle, loose) {
    const out = []; if (!needle) return out;
    const isL = (c) => !!c && new RegExp('[' + LET + '0-9]', 'i').test(c);
    let i = hay.indexOf(needle);
    while (i >= 0) {
      const a = hay[i - 1], b = hay[i + needle.length];
      const edgeA = !isL(needle[0]) || !isL(a);
      let edgeB = !isL(needle[needle.length - 1]) || !isL(b);
      if (!edgeB && isL(b)) { const tail = hay.slice(i + needle.length); edgeB = needle.length >= 5 || (SUFFIX.test(tail) && !isL(tail[tail.match(SUFFIX)[0].length])) || needle.length >= 4 && SUFFIX.test(tail); }
      if ((edgeA && edgeB) || (loose && needle.length >= 4)) out.push(i);
      i = hay.indexOf(needle, i + 1);
    }
    return out;
  }
  const isFormulaish = (s) => /[=\/·+]/.test(s) || /^[a-zρδ]$/i.test(s.trim());
  /* Мәтін бөлігіндегі нұсқалар: ұзыны бірінші, қабаттаспайтын (тепе-теңдікте емес ≠ тепе-теңдікте) */
  /* Әр нұсқаның баламалы жазулары: толық мәтін; «Б) 0 Н» → «б», «0 н»; «тістері бүгілмеген» → «бүгілмеген»; «итеру» → «итер…» */
  function needles(opts) {
    const N = opts.map(o => norm(o));
    const words = N.map(n => n.split(/\s+/));
    const out = [];
    N.forEach((n, i) => {
      out.push({ i, n });
      const en = n.match(/^([а-яәa-z])\)\s*(.+)$/i);
      if (en) { out.push({ i, n: en[2] }); out.push({ i, n: en[1], letter: true }); }
      if (words[i].length > 1 && words[i].some(w => words.some((ws, j) => j !== i && ws.includes(w)))) words[i].filter(w => w.length >= 4 && !words.some((ws, j) => j !== i && ws.includes(w))).forEach(w => out.push({ i, n: w }));
      if (words[i].length === 1 && n.length >= 5 && /[ую]$/.test(n)) out.push({ i, n: n.slice(0, -1), stem: true });
    });
    return out;
  }
  function optionsIn(text, opts, loose) {
    const order = needles(opts).sort((a, b) => b.n.length - a.n.length);
    let t = text; const hits = [];
    order.forEach(x => {
      const found0 = x.stem ? (() => { const r = []; let j = t.indexOf(x.n); while (j >= 0) { if (!new RegExp('[' + LET + ']', 'i').test(t[j - 1] || '')) r.push(j); j = t.indexOf(x.n, j + 1); } return r; })() : findAll(t, x.n, loose);
      const enumCount = (text.match(/(^|[\s;,])[аәбвгғд]\s*\)/gi) || []).length;
      const found = x.n.length === 1 && enumCount >= 2 ? found0.filter(p => !/^\s*\)/.test(t.slice(p + 1, p + 4))) : found0;
      found.forEach(p => { hits.push({ i: x.i, pos: p, len: x.n.length }); t = t.slice(0, p) + ' '.repeat(x.n.length) + t.slice(p + x.n.length); });
    });
    return hits.sort((a, b) => a.pos - b.pos);
  }
  // Шарттағы «Н / кг / м» тізімін көшіру — жауап емес
  function isCopiedList(text, hits) {
    for (let k = 1; k < hits.length; k++) {
      const between = text.slice(hits[k - 1].pos + hits[k - 1].len, hits[k].pos);
      if (/^\s*\/\s*$/.test(between) && hits[k - 1].i !== hits[k].i) return true;
    }
    return false;
  }
  const STOP = new Set(['қай', 'қандай', 'дұрыс', 'жауап', 'жауабы', 'жауапты', 'сөзді', 'таңдаңыз', 'нұсқа', 'неше', 'нөмірі', 'және', 'немесе', 'бірінші', 'екінші', 'болса', 'болады', 'деген', 'дегеніміз', 'мен', 'бен', 'пен', 'бос', 'орын', 'қадам', 'жағдай', 'қатысты', 'нәтижесі', 'себебі']);
  function anchors(label, opts) {
    const l = norm(label).replace(/\(.*?(бос орын).*?\)/g, ' ');
    const marks = markersIn(l, true).map(x => x.mark);
    const refs = (l.match(/\d+\s*-\s*[а-яәіңғүұқөһ]+/gi) || []).filter(x => !/қадам/.test(x)).map(x => x.replace(/\s+/g, ''));
    const optWords = new Set(opts.flatMap(o => norm(o).split(/\s+/)));
    const optText = opts.map(o => norm(o)).join(' ');
    const words = l.replace(/_+|…|\.\.\./g, ' ').replace(/[^а-яәіңғүұқөһa-z\s]/g, ' ').split(/\s+/)
      .filter(w => w.length >= 3 && !STOP.has(w) && !optWords.has(w)).map(w => w.slice(0, Math.max(3, Math.min(5, w.length - 3)))).filter(st => !optText.includes(st));
    const num = (l.match(/^(\d+)\s*\)/) || [])[1];
    const LAT = { a: 'а', b: 'в', c: 'с', e: 'е', o: 'о', p: 'р', x: 'х', k: 'к', m: 'м', h: 'н', t: 'т' };
    const lm = l.replace(/^\s*(\d+\s*-\s*қадам\s*)?(\d+\s*\)\s*)?/, '').match(/^([а-яәa-z])\s*-\s/i);
    const letter = lm ? (LAT[lm[1]] || lm[1]) : null;
    const items = (l.match(/(\d+)\s*\)/g) || []); const itemNum = items.length ? items[items.length - 1].replace(/\D/g, '') : null;
    const steps = marks.filter(x => /қадам|\./.test(x));
    return { marks, refs, words, num, letter, itemNum, steps };
  }

  function checkChoice(it, P, sharedOpts, group) {
    const opts = it.o, multi = it.k === 'multi';
    const want = multi ? it.a : [it.a];
    const pieces = P.flatMap(l => l.pieces).filter(p => { const h = optionsIn(p.text, opts, p.loose); return !(h.length >= 2 && isCopiedList(p.text, h)); });
    const verdict = (idxs) => {
      const got = [...new Set(idxs)].map(i => opts[i]);
      if (!got.length) return null;
      if (multi) return want.every(w => got.includes(w)) && got.every(g => want.includes(g)) ? 'ok' : 'wrong';
      return got.length === 1 ? (got[0] === it.a ? 'ok' : 'wrong') : null;
    };
    const res = (i, p) => ({ status: opts[i] === it.a ? 'ok' : 'wrong', found: opts[i], line: p.line });

    // 0) Бос орынды формула/сөйлем: «ρ = ______ / ______» — топтағы барлық жауаптармен толтырып іздейміз
    if (group && group.tpl) {
      const filled = compact(group.fill(group.items.map(x => x.a)));
      if (P.some(l => l.compact.includes(filled))) return { status: 'ok', found: group.fill(group.items.map(x => x.a)).trim(), line: 0 };
      const sides = group.tpl.split(/_{3,}/).map(s => norm(s).trim());
      const idx = group.items.indexOf(it);
      const L = sides[idx].split(/\s+/).filter(Boolean).slice(-1)[0], R = (sides[idx + 1] || '').split(/\s+/).filter(Boolean)[0];
      if (L || R) {
        for (const p of pieces) {
          const lp = L ? p.full.indexOf(L.slice(0, Math.max(2, L.length - 2))) : 0; if (lp < 0) continue;
          const from = L ? p.full.indexOf(' ', lp) + 1 : 0;
          const rp = R ? p.full.indexOf(R.slice(0, Math.max(2, R.length - 2)), from) : p.full.length; if (rp < 0 || rp - from > 40) continue;
          const h = optionsIn(p.text.slice(from, rp), opts);
          if (h.length === 1) return res(h[0].i, p);
        }
      }
    }
    const A = anchors(it.l, opts);
    // 1) Топтау түрі: «Масса: 1, 3, 4» немесе «Серпімді: резеңке, губка…»
    for (const p of pieces) {
      for (const h of optionsIn(p.text, opts, p.loose)) {
        const tail = p.text.slice(h.pos + h.len);
        if (A.num) { const t = tail.match(/^\s*[:—-]?\s*((?:\d+\s*[,;]?\s*(?:және\s*)?)+)/); if (t && t[1].split(/[^\d]+/).filter(Boolean).includes(A.num)) return res(h.i, p); }
        const c = tail.match(/^[^:;]{0,14}:/);
        if (c && A.words.length) { const fullSeg = p.full.slice(h.pos + h.len + c[0].length).split(';')[0]; const nextOpt = optionsIn(fullSeg, opts)[0]; const seg = nextOpt ? fullSeg.slice(0, nextOpt.pos) : fullSeg; const mw = A.words.filter(w => seg.includes(w)); if (mw.length >= 2 || mw.some(w => w.length >= 4)) return res(h.i, p); }
      }
    }
    // 1б) «А - тыныштық, В - сырғанау» және «2-қадам: 1 - ә; 2 - а» түрлері
    const LATN = { a: 'а', b: 'в', c: 'с', e: 'е' };
    for (const p of pieces) {
      if (A.steps.length && !A.steps.every(sm => p.marks.includes(sm))) continue;
      const t = p.full.replace(/\b[abce]\b/g, ch => LATN[ch] || ch);
      const keys = [];
      if (A.letter) keys.push(new RegExp('(?:^|[\\s,;:)])' + A.letter + '\\s*-\\s*', 'i'));
      if (A.itemNum && !p.marks.includes(A.itemNum + ')')) keys.push(new RegExp('(?:^|[\\s,;:])' + A.itemNum + '\\s*[-:]\\s*(?!қадам)'));
      for (const re of keys) {
        const m = t.match(re); if (!m) continue;
        const from = m.index + m[0].length, seg = p.text.slice(from, from + t.slice(from).split(/[;,]/)[0].length);
        const h = optionsIn(seg, opts); if (h.length) return res(h[0].i, p);
      }
    }
    // 2) Тармақ белгісі, сілтеме («2-серіппе») немесе кілт сөздер бар бөлік
    const ranked = [];
    pieces.forEach(p => {
      const hits = optionsIn(p.text, opts, p.loose); if (!hits.length) return;
      let score = 0, anchorPos = -1;
      A.marks.forEach(mk => { if (p.marks.includes(mk)) score += 3; });
      A.refs.forEach(r => { const q = p.full.replace(/\s*-\s*/g, '-').indexOf(r); if (q >= 0) { score += 3; anchorPos = Math.max(anchorPos, q + r.length); } });
      A.words.forEach(w => { const q = p.full.indexOf(w); if (q >= 0) { score += 1; anchorPos = Math.max(anchorPos, q + w.length); } });
      if (score > 0) ranked.push({ p, hits, score, anchorPos });
    });
    ranked.sort((a, b) => b.score - a.score || (b.p.isAnswer ? 1 : 0) - (a.p.isAnswer ? 1 : 0));
    for (const best of ranked) {
      let hs = best.hits;
      if (!multi && new Set(hs.map(h => h.i)).size > 1 && best.anchorPos >= 0) { const after = hs.filter(h => h.pos >= best.anchorPos - 1); hs = after.length ? [after[0]] : []; }
      const v = verdict(hs.map(h => h.i));
      if (v) return { status: v, found: [...new Set(hs.map(h => opts[h.i]))].join(', '), line: best.p.line };
    }
    // 3) Бұл нұсқалар тек осы сұраққа тиесілі болса — бүкіл мәтіннен
    if (!sharedOpts) {
      const hs = pieces.flatMap(p => optionsIn(p.text, opts, p.loose).map(h => Object.assign({ line: p.line }, h)));
      const v = verdict(hs.map(h => h.i));
      if (v) return { status: v, found: [...new Set(hs.map(h => opts[h.i]))].join(', '), line: hs[0].line };
      if (hs.length) return { status: 'unsure', found: [...new Set(hs.map(h => opts[h.i]))].join(', ') };
    }
    return pieces.some(p => optionsIn(p.text, opts, p.loose).length) ? { status: 'unsure' } : { status: 'empty' };
  }

  function checkWord(it, P) {
    if (it.formula) {
      const nf = (s) => compact(latexToLinear(s)).replace(/^p(?==)/, 'ρ');
      const acc = it.a.map(nf);
      for (const l of P) {
        for (const part of l.compact.split(/[;,]/)) {
          const p = part.replace(/^p(?==)/, 'ρ');
          if (acc.some(a => p.includes(a))) return { status: 'ok', found: part.slice(0, 40), line: l.i };
          const sw = p.split('=').reverse().join('=');                     // жақтары ауысқан: m/v=ρ
          if (acc.some(a => sw.includes(a))) return { status: 'ok', found: part.slice(0, 40), line: l.i };
        }
      }
      return { status: 'unsure' };
    }
    for (const l of P) for (const a of it.a) { if (findAll(l.norm, norm(a), l.loose).length) return { status: 'ok', found: a, line: l.i }; }
    return { status: 'unsure' };
  }

  /* Бүкіл тапсырма: items — checks.js, lines — редактор жолдары, boardOnly — тақтада жазба бар, мәтін жоқ */
  function analyze(task, items, lines, boardOnly) {
    const grams = condGrams(task);
    const condNorm = norm(PL.render.plain(task.condition || []));
    const P = parse(lines, grams, condNorm);
    // Шешудің басым бөлігі шарттың көшірмесі болса — автоматты балл берілмейді (мұғалім тексереді)
    const tk = (x) => (x.match(TOK) || []).length;
    const totFull = P.reduce((a2, l) => a2 + tk(l.full), 0), totLeft = P.reduce((a2, l) => a2 + tk(l.raw), 0);
    if (totFull >= 12 && (totFull - totLeft) / totFull >= 0.6) return items.map(it => it.k === 'open' ? { status: 'open' } : { status: 'unsure', copy: true });
    if (!P.length) return items.map(it => it.k === 'open' ? { status: 'open' } : boardOnly ? { status: 'unsure', board: true } : { status: 'empty' });
    const cond = condValues(task);
    const nums = items.filter(x => x.k === 'num');
    const numVals = nums.map(x => { const u = x.u && x.u !== 'есе' ? U(x.u) : null; return u ? x.v * u.f : x.v; });
    // бос орынды үлгілер бойынша топтар
    const groups = {};
    items.forEach(it => {
      if (it.k !== 'choice') return;
      const m = it.l.replace(/\(.*?\)/g, '').match(/[^)]*?_{3,}.*$/);
      if (!m) return;
      const tpl = m[0].replace(/^\s*[\d.]+\s*[аәбвгa-d]?\)?\s*/i, '').trim();
      (groups[tpl] = groups[tpl] || { tpl, items: [], fill: (ans) => { let k = 0; return tpl.replace(/_{3,}/g, () => ans[k++] || ''); } }).items.push(it);
    });
    return items.map((it, i) => {
      switch (it.k) {
        case 'num': return checkNum(it, P, cond, numVals.filter((_, j) => nums[j] !== it));
        case 'list': return checkList(it, P, cond);
        case 'choice': case 'multi': {
          const shared = items.some((o, j) => j !== i && (o.k === 'choice' || o.k === 'multi') && o.o.some(x => it.o.includes(x)));
          const g = Object.values(groups).find(gr => gr.items.includes(it));
          return checkChoice(it, P, shared, g);
        }
        case 'word': return checkWord(it, P);
        case 'open': return { status: 'open' };
        default: return { status: 'unsure' };
      }
    });
  }

  return { analyze, parse, quantities, latexToLinear, lineText, _norm: norm, _compact: compact, _dbg: { condGrams, needles, optionsIn, anchors, checkChoice } };
})();
