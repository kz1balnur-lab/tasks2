/*
 * ЕБҚ тапсырмалары: оқушы бос орындарды ТІКЕЛЕЙ тапсырма мәтінінде толтырады және нұсқаны басып таңдайды.
 * «Тексеру» тек осы бос орындарға жазылғанды тексереді (редактор мен тақта сандар/таңдау үшін оқылмайды).
 *
 *  • Тапсырма мәтіні (Word-тан алынған) өзгертілмейді: «______» орнына енгізу өрісі, «а / б / в» орнына басылатын
 *    нұсқалар, «Пайдасы / Зияны» кестесінде басылатын ұяшықтар шығады.
 *  • Өрістер мәтіндегі реті бойынша нөмірленеді; әр бақылау нүктесі (checks.js) қай өріске сәйкес екені
 *    PHYS_EBQ_MAP (ebq-map.js) ішінде жазылған.
 *  • Сандар PL.checker арқылы (үтір/нүкте, өлшем бірлігі, ХБЖ-ға келтіру) тексеріледі. Өлшем бірлігі бос орыннан кейін
 *    мәтінде тұрса («г», «см³», «Н/м»), ол автоматты ескеріледі.
 *  • Қолмен жазылған сөз нұсқалардың біріне теңелсе (1 әріп қатесіне дейін) — сол нұсқа есептеледі; басқа нұсқаға
 *    тең болса — қате; бұл тізімде жоқ сөз — «мұғалім тексереді» (жалған нөл жоқ).
 */
window.PL = window.PL || {};
PL.ebq = (function () {
  const el = PL.render.el;
  const strip = (h) => PL.render.stripTags(h || '');
  const cache = {};
  const spec = (task) => (window.PHYS_EBQ_MAP || {})[task && task.id];
  const supports = (task) => !!(task && task.level === 'EBQ' && spec(task));
  const PH = (i, v) => '<span class="ebq-f" data-f="' + i + '"' + (v != null ? ' data-v="' + String(v).replace(/"/g, '&quot;') + '"' : '') + '></span>';

  // ═════════ МӘТІНДІ ӨҢДЕУ: бос орындар мен нұсқа топтарын табу ═════════
  const WHOLE_OPTS = /^\s*[^;:?→_\/]{1,60}( \/ [^;:?→_\/]{1,60})+\s*\.?\s*$/;

  function procText(s, fields, cell) {
    if (!s || !/\S/.test(s)) return s;
    const paren = [];
    const m = s.replace(/\([^()]*\)/g, (x) => { paren.push(x); return '\u0001' + (paren.length - 1) + '\u0002'; });
    const unmask = (x) => x.replace(/\u0001(\d+)\u0002/g, (_, n) => paren[+n]);
    if (cell && WHOLE_OPTS.test(m)) {
      const opts = m.trim().replace(/\.$/, '').split(' / ').map(x => unmask(x).trim());
      fields.push({ kind: 'opts', opts });
      return PH(fields.length - 1);
    }
    const spans = [];
    const free = (a, b) => !spans.some(sp => a < sp.e && b > sp.s);
    const add = (sp) => { if (sp.e > sp.s && free(sp.s, sp.e)) spans.push(sp); };

    // (1) «а  /  б  /  в» — кемінде 2 бос орынмен бөлінген нұсқалар
    const sepRe = /\s{2,}\/\s{2,}/g; const seps = []; let sm;
    while ((sm = sepRe.exec(m))) seps.push({ s: sm.index, e: sm.index + sm[0].length });
    if (seps.length) {
      const runs = []; let run = [seps[0]];
      for (let i = 1; i < seps.length; i++) {
        if (/[;?:]/.test(m.slice(seps[i - 1].e, seps[i].s))) { runs.push(run); run = [seps[i]]; } else run.push(seps[i]);
      }
      runs.push(run);
      runs.forEach(r => {
        const first = r[0], last = r[r.length - 1];
        const pre = m.slice(0, first.s); let st = 0, bm; const bre = /(:\s+|\?\s+|→\s+|\s{2,})/g;
        while ((bm = bre.exec(pre))) st = bm.index + bm[0].length;
        const post = m.slice(last.e); let en = post.search(/\s{2,}|[.;](?:\s|$)|\s*$/); if (en < 0) en = post.length;
        const end = last.e + en;
        const opts = m.slice(st, end).split(/\s{2,}\/\s{2,}/).map(x => unmask(x).trim()).filter(Boolean);
        if (opts.length >= 2) add({ s: st, e: end, kind: 'opts', opts });
      });
    }
    // (2) «А) …;   Ә) …» немесе «1) …;  2) …» — әріпті/нөмірлі нұсқалар
    const mkRe = /(:\s+|\s{2,}|;\s+)([А-ЯӘІҢҒҮҰҚӨҺа-яәіңғүұқөһ]|\d{1,2})\)\s/g; const mk = []; let km;
    while ((km = mkRe.exec(m))) mk.push({ at: km.index + km[1].length, sepAt: km.index });
    if (mk.length >= 2) {
      const opts = mk.map((x, i) => {
        const to = i + 1 < mk.length ? mk[i + 1].sepAt : m.length;
        return unmask(m.slice(x.at, to)).replace(/[;.\s]+$/, '').trim();
      });
      const lastTo = mk[mk.length - 1].at + m.slice(mk[mk.length - 1].at).replace(/[;.\s]+$/, '').length;
      add({ s: mk[0].at, e: lastTo, kind: 'opts', opts });
    }
    // (3) «1-серіппе: созылу / қысылу;»  және  «доп → серпімді / пластикалық;»
    const adRe = /([→:]\s)([^\s;:.\/]+(?: [^\s;:.\/]+)?) \/ ([^\s;:.\/]+(?: [^\s;:.\/]+)?)(?=[;.]|\s*$)/g; let am;
    while ((am = adRe.exec(m))) add({ s: am.index + am[1].length, e: am.index + am[0].length, kind: 'opts', opts: [unmask(am[2]), unmask(am[3])] });
    // (4) бос орындар
    const blRe = /_{3,}/g; let bl;
    while ((bl = blRe.exec(m))) add({ s: bl.index, e: bl.index + bl[0].length, kind: 'blank', len: bl[0].length, after: unmask(m.slice(bl.index + bl[0].length, bl.index + bl[0].length + 14).replace(/\u0001\d*$/, '')) });

    spans.sort((a, b) => a.s - b.s);
    let out = '', pos = 0;
    spans.forEach(sp => {
      out += unmask(m.slice(pos, sp.s));
      fields.push(sp.kind === 'blank' ? { kind: 'blank', len: sp.len, after: sp.after } : { kind: 'opts', opts: sp.opts });
      out += PH(fields.length - 1);
      pos = sp.e;
    });
    return out + unmask(m.slice(pos));
  }

  /* <sub>…</sub> мәтінді бөлмеуі үшін (мыс., «F<sub>теңәсер</sub> = F₁ + F₂  /  …» нұсқалары) уақытша белгімен
     ауыстырылады; нұсқа мәнінде ол «F_теңәсер» болып сақталады, батырмада астыңғы индекспен көрсетіледі. */
  const SO = '\u0003', SC = '\u0004', SUB_MARK = /\u0003([^\u0003\u0004]*)\u0004/g;
  function procParagraph(h, fields, cell) {
    if (/^\s*(<[^>]+>\s*)*(Көмек|Көмекші)/.test(h)) return h;
    const f0 = fields.length;
    const out = h.replace(/<sub>([^<]*)<\/sub>/g, SO + '$1' + SC)
      .split(/(<[^>]+>)/).map(seg => seg && seg[0] === '<' ? seg : procText(seg, fields, cell)).join('');
    for (let k = f0; k < fields.length; k++) {
      if (fields[k].opts) fields[k].opts = fields[k].opts.map(o => o.replace(SUB_MARK, '_$1'));
      if (fields[k].after) fields[k].after = fields[k].after.replace(SUB_MARK, '$1');
    }
    return out.replace(SUB_MARK, '<sub>$1</sub>');
  }

  function processTable(tb, fields) {
    const t = JSON.parse(JSON.stringify(tb));
    const hdr = t.rows[0].map(c => strip(((c.b || [])[0] || {}).h).trim());
    const tog = hdr.map((h, i) => /^(Пайдасы|Зияны)$/i.test(h) ? i : -1).filter(i => i >= 0);
    t.rows.forEach((row, ri) => {
      if (ri === 0) return;
      const label = strip(((row[0].b || [])[0] || {}).h).trim();
      if (tog.length === 2) {
        const idx = fields.length; fields.push({ kind: 'toggle', opts: tog.map(c => hdr[c]), label });
        tog.forEach(c => { row[c].b = [{ t: 'p', h: PH(idx, hdr[c]) }]; });
        return;
      }
      const rowOpts = row.some(c => (c.b || []).some(p => p.t === 'p' && WHOLE_OPTS.test(strip(p.h))));
      row.forEach((cell, ci) => {
        const f0 = fields.length;
        if (rowOpts && ci > 0 && !(cell.b || []).length) {
          fields.push({ kind: 'blank', len: 14, after: '', label });
          cell.b = [{ t: 'p', h: PH(fields.length - 1) }];
          return;
        }
        cell.b = (cell.b || []).map(p => p.t === 'p' ? { t: 'p', h: procParagraph(p.h, fields, true) } : p);
        for (let k = f0; k < fields.length; k++) fields[k].label = label;
      });
    });
    return t;
  }

  function processBlocks(list, fields) {
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.t === 'p') {
        const txt = strip(b.h);
        if (/(сызыңыз|таңдаңыз|белгілеңіз)\s*:\s*$/.test(txt)) {
          let j = i + 1; const grp = [];
          while (j < list.length && list[j].t === 'p' && /^\s*\d\)\s/.test(strip(list[j].h)) && !/_{3,}|\s{2,}\/\s{2,}/.test(list[j].h)) { grp.push(list[j]); j++; }
          if (grp.length >= 2) {
            out.push(b);
            const idx = fields.length; fields.push({ kind: 'optp', opts: grp.map(g => strip(g.h).trim()), label: txt });
            grp.forEach((g, n) => out.push({ t: 'p', h: '<span class="ebq-optp-mark" data-f="' + idx + '" data-v="' + (n + 1) + ')"></span>' + g.h }));
            i = j - 1; continue;
          }
        }
        const f0 = fields.length;
        const h = procParagraph(b.h, fields, false);
        for (let k = f0; k < fields.length; k++) fields[k].label = txt.slice(0, 90);
        out.push({ t: 'p', h });
      } else if (b.t === 'tbl') out.push(processTable(b, fields));
      else out.push(b);
    }
    return out;
  }

  function prepare(task) {
    if (cache[task.id]) return cache[task.id];
    const fields = [];
    const blocks = processBlocks(JSON.parse(JSON.stringify(task.condition || [])), fields);
    return (cache[task.id] = { blocks, fields });
  }

  // ═════════ КӨРСЕТУ ═════════
  function render(task, rec, onChange) {
    const prep = prepare(task), fields = prep.fields;
    rec.fill = rec.fill || {};
    const node = PL.render.blocks(prep.blocks, { ebq: true });
    const ctl = {};
    const get = (i) => rec.fill[i] == null ? '' : String(rec.fill[i]);
    const set = (i, v) => { rec.fill[i] = v; onChange && onChange(); };
    const ensure = (i) => (ctl[i] = ctl[i] || { els: [], paint: [] });

    node.querySelectorAll('.ebq-f').forEach(ph => {
      const i = +ph.dataset.f, f = fields[i], c = ensure(i);
      let ctrl;
      if (f.kind === 'blank') {
        ctrl = el('input', { type: 'text', class: 'ebq-blank' + (f.len >= 14 ? ' wide' : ''), autocomplete: 'off', spellcheck: 'false', 'aria-label': (f.label || 'бос орын') + ' — ' + (f.len >= 14 ? 'жауап' : 'бос орын') });
        ctrl.style.width = f.len >= 14 ? '' : Math.max(4.5, Math.min(11, f.len * 0.95)) + 'ch';
        ctrl.value = get(i);
        ctrl.addEventListener('input', () => { set(i, ctrl.value); c.els.forEach(x => x.classList.remove('ebq-ok', 'ebq-bad', 'ebq-part', 'ebq-unsure')); });
        ctrl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const all = [...node.querySelectorAll('.ebq-blank')]; const n = all[all.indexOf(ctrl) + 1]; if (n) n.focus(); } });
        c.els.push(ctrl); ph.replaceWith(ctrl);
      } else if (f.kind === 'toggle') {
        const val = ph.dataset.v;
        ctrl = el('button', { type: 'button', class: 'ebq-cell', role: 'radio', 'aria-label': (f.label || '') + ' — ' + val }, [document.createTextNode('+')]);
        ctrl.dataset.v = val;
        ctrl.addEventListener('click', () => { set(i, get(i) === val ? '' : val); sync(i); });
        c.els.push(ctrl); ph.replaceWith(ctrl);
      } else { // opts
        const wrap = el('span', { class: 'ebq-opts', role: 'radiogroup' });
        f.opts.forEach(o => {
          const b = el('button', { type: 'button', class: 'ebq-opt', role: 'radio', 'aria-label': o.replace(/_/g, ' ') }, PL.render.subNodes(o));
          b.dataset.v = o;
          b.addEventListener('click', () => { set(i, get(i) === o ? '' : o); sync(i); });
          wrap.append(b);
        });
        c.els.push(wrap); ph.replaceWith(wrap);
      }
    });
    node.querySelectorAll('.ebq-optp-mark').forEach(mk => {
      const i = +mk.dataset.f, f = fields[i], c = ensure(i), p = mk.parentElement, n = parseInt(mk.dataset.v, 10) - 1;
      const val = f.opts[n];
      p.classList.add('ebq-optp'); p.setAttribute('role', 'radio'); p.tabIndex = 0; p.dataset.v = val;
      const go = () => { set(i, get(i) === val ? '' : val); sync(i); };
      p.addEventListener('click', go); p.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); go(); } });
      c.els.push(p); mk.remove();
    });
    function sync(i) {
      const v = get(i), c = ctl[i]; if (!c) return;
      c.els.forEach(x => {
        x.classList.remove('ebq-ok', 'ebq-bad', 'ebq-part', 'ebq-unsure');
        const items = x.matches && x.matches('.ebq-opts') ? [...x.children] : [x];
        items.forEach(b => { if (b.dataset && b.dataset.v != null) { const on = b.dataset.v === v; b.classList.toggle('sel', on); b.setAttribute('aria-checked', String(on)); } });
      });
    }
    Object.keys(ctl).forEach(i => sync(+i));

    // тексеру нәтижесін өрістерде белгілеу (дұрыс жауапты ашпайды)
    const paint = (results) => {
      Object.keys(ctl).forEach(i => ctl[i].els.forEach(x => x.classList.remove('ebq-ok', 'ebq-bad', 'ebq-part', 'ebq-unsure')));
      const m = spec(task).i || [];
      (results || []).forEach((r, j) => {
        const t = m[j]; if (t == null) return;
        const cls = { ok: 'ebq-ok', wrong: 'ebq-bad', partial: 'ebq-part', unsure: 'ebq-unsure' }[r.status];
        if (!cls) return;
        (Array.isArray(t) ? t : [t]).forEach(f => ctl[f] && ctl[f].els.forEach(x => {
          if (x.matches('.ebq-opts')) { const sel = [...x.children].find(b => b.classList.contains('sel')); (sel || x).classList.add(cls); }
          else if (x.matches('.ebq-cell')) { if (x.classList.contains('sel')) x.classList.add(cls); }
          else x.classList.add(cls);
        }));
      });
    };
    return { node, paint };
  }

  // ═════════ ТЕКСЕРУ ═════════
  const LAT = { a: 'а', b: 'в', c: 'с', e: 'е', o: 'о', p: 'р', x: 'х', k: 'к', m: 'м', h: 'н', t: 'т' };
  const nz = (s) => String(s == null ? '' : s).toLowerCase().replace(/ё/g, 'е').replace(/[«»"“”„]/g, '').replace(/[.;,!?]+$/g, '').replace(/\s+/g, ' ').trim();
  // нұсқа белгісі: «а)», «1)» немесе жалғыз «А» (мәтіннің басындағы бір әріп «V = a · a» сияқты формулада белгі емес)
  const mkey = (s) => { const m = nz(s).match(/^([a-zа-яәіңғүұқөһ]|\d{1,2})(?:\)(?:\s|$)|$)/); return m ? (LAT[m[1]] || m[1]) : null; };
  function lev(a, b) {
    if (a === b) return 0; if (Math.abs(a.length - b.length) > 1) return 2;
    const d = []; for (let i = 0; i <= a.length; i++) { d[i] = [i]; } for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  /* Жазылған/басылған мәтін item.o нұсқаларының қайсысына сәйкес: индекс, немесе -1 */
  function matchOption(text, opts) {
    const t = nz(text); if (!t) return -1;
    let i = opts.findIndex(o => nz(o) === t); if (i >= 0) return i;
    const k = mkey(text);
    if (k != null) {
      i = opts.findIndex(o => { const n = nz(o), ok = mkey(o); return n === k || n === k + ')' || (ok != null && ok === k); });
      if (i >= 0) return i;
    }
    // «а) 1 м³ мұздың …» ↔ «1 м³ мұздың …»
    i = opts.findIndex(o => nz(o).replace(/^([a-zа-яәіңғүұқөһ]|\d{1,2})\)\s*/, '') === t.replace(/^([a-zа-яәіңғүұқөһ]|\d{1,2})\)\s*/, ''));
    if (i >= 0) return i;
    // қолмен жазылған сөздегі 1 әріптік қате (сандары жоқ сөздер ғана; басқа нұсқамен шатаспайтындай)
    if (t.length >= 6 && /^[a-zа-яәіңғүұқөһ\s-]+$/i.test(t)) { const near = opts.map((o, n) => ({ n, d: lev(nz(o), t) })).filter(x => x.d <= 1); if (near.length === 1) return near[0].n; }
    return -1;
  }
  const strip1 = (v) => String(v == null ? '' : v).trim();

  function evalItem(it, fieldsOfItem, vals) {
    if (vals.every(v => !v)) return { status: 'empty' };
    const shown = vals.filter(Boolean).join('; ');
    if (it.k === 'num') {
      let v = vals[0];
      const q = PL.checker.parseQuantity(v);
      const f = fieldsOfItem[0];
      if (q && !q.unit && f && f.kind === 'blank' && f.after) {
        const um = f.after.match(/^\s*([a-zа-яәіңғүұқөһ°μ]+(?:\s*\/\s*[a-zа-яәіңғүұқөһ]+)?(?:[³²2-3]|\^\d)?)/i);
        if (um && PL.checker.normUnit(um[1])) v = v + ' ' + um[1];
      }
      const r = PL.checker.check(it, v);
      return Object.assign({}, r, { found: v });
    }
    if (it.k === 'choice') {
      // «______-серіппе» — бос орыннан кейінгі жалғау да ескеріледі
      const f0 = fieldsOfItem[0], aft = f0 && f0.kind === 'blank' && f0.after ? (f0.after.match(/^-[a-zа-яәіңғүұқөһ]+/i) || [''])[0] : '';
      let i = matchOption(vals[0] + aft, it.o); if (i < 0 && aft) i = matchOption(vals[0], it.o);
      if (i < 0) return { status: 'unsure', found: shown };
      return it.o[i] === it.a ? { status: 'ok', found: shown } : { status: 'wrong', found: shown };
    }
    if (it.k === 'multi') {
      const idx = vals.filter(Boolean).map(v => matchOption(v, it.o));
      if (idx.some(i => i < 0)) return { status: 'unsure', found: shown };
      const got = [...new Set(idx.map(i => it.o[i]))];
      const ok = got.length === it.a.length && it.a.every(a => got.includes(a)) && vals.filter(Boolean).length === it.a.length;
      return { status: ok ? 'ok' : 'wrong', found: shown };
    }
    if (it.k === 'word') {
      const v = it.formula ? vals.filter(Boolean).join('·') : vals[0];
      const r = PL.checker.check(it, v);
      return Object.assign({}, r, { found: v });
    }
    return { status: 'open' };
  }

  function analyze(task, items, fill) {
    const prep = prepare(task), m = spec(task).i || [];
    fill = fill || {};
    return items.map((it, j) => {
      const t = m[j];
      if (it.k === 'open') return { status: 'open' };
      if (t == null) return { status: 'unsure' };
      const idxs = Array.isArray(t) ? t : [t];
      return evalItem(it, idxs.map(f => prep.fields[f]), idxs.map(f => strip1(fill[f])));
    });
  }
  /* Еркін мәтінді өрістер (түсіндірме) — explain.js ережелері үшін жол ретінде */
  function openLines(task, fill) {
    fill = fill || {};
    return (spec(task).open || []).map(f => strip1(fill[f])).filter(Boolean).map(v => ({ t: 't', v }));
  }
  const hasContent = (fill) => Object.values(fill || {}).some(v => String(v == null ? '' : v).trim());
  function text(task, fill) {
    const prep = prepare(task); fill = fill || {};
    return Object.keys(fill).filter(k => strip1(fill[k]) && prep.fields[k]).map(k => (prep.fields[k].label ? prep.fields[k].label + ' → ' : '') + fill[k]).join('\n');
  }
  function dump(task) { return prepare(task).fields.map((f, i) => i + ' [' + f.kind + '] ' + (f.opts ? JSON.stringify(f.opts) : 'len' + f.len + ' after«' + f.after + '»') + '  ⟵ ' + (f.label || '')); }

  return { supports, render, analyze, openLines, hasContent, text, dump, matchOption, _prepare: prepare };
})();
