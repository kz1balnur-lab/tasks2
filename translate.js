/*
 * Тапсырма мәтінін (Word-тан алынған) орыс/ағылшын тіліне аудару.
 * Аударманы Claude жасайды (ИИ көмекші арқылы). Формулалар (KaTeX), сандар мен HTML құрылымы сақталады.
 * Нәтиже осы браузерде кэштеледі — бір тапсырма бір рет қана аударылады.
 */
window.PL = window.PL || {};
PL.tr = (function () {
  const TEX_RE = /<span class="tex( tex-d)?" data-tex="[^"]*"><\/span>/g;
  const inflight = {};

  function collect(src, kind) {
    const copy = JSON.parse(JSON.stringify(src));
    const refs = [];
    const addHTML = (o, k) => { if (o && typeof o[k] === 'string' && /[A-Za-zЀ-ӿ]/.test(o[k].replace(TEX_RE, ''))) refs.push({ o, k, html: true }); };
    const addText = (o, k) => { if (o && typeof o[k] === 'string' && /[A-Za-zЀ-ӿ]/.test(o[k])) refs.push({ o, k, html: false }); };
    const walk = (blocks) => (blocks || []).forEach(b => {
      if (b.t === 'p') addHTML(b, 'h');
      else if (b.t === 'box') walk(b.b);
      else if (b.t === 'tbl') b.rows.forEach(r => r.forEach(c => walk(c.b)));
    });
    if (kind === 'task') {
      walk(copy.condition); walk(copy.solution);
      addHTML(copy, 'answer'); addText(copy, 'criterion');
      if (copy.descriptors) copy.descriptors.rows.forEach(r => r.forEach(c => walk(c.b)));
      (copy.checks || []).forEach(it => {
        addText(it, 'l');
        if (Array.isArray(it.o)) { it.od = it.o.slice(); it.od.forEach((_, i) => addText(it.od, i)); }
      });
    } else {
      walk(copy.preamble);
    }
    // HTML ішіндегі формулаларды ⟦n⟧ белгілерімен ауыстыру
    const items = refs.map(r => {
      if (!r.html) return r.o[r.k];
      r.tex = [];
      return r.o[r.k].replace(TEX_RE, m => { r.tex.push(m); return '⟦' + (r.tex.length - 1) + '⟧'; });
    });
    function apply(arr) {
      refs.forEach((r, i) => {
        let s = arr[i];
        if (typeof s !== 'string' || !s.trim()) return;
        if (r.html) {
          const ok = r.tex.every((_, n) => s.includes('⟦' + n + '⟧'));
          if (!ok) return; // формула жоғалса — түпнұсқа қалады
          s = s.replace(/⟦(\d+)⟧/g, (m, n) => r.tex[+n] || '');
          if (/<script|on\w+=/i.test(s)) return; // қауіпсіздік
        }
        r.o[r.k] = s;
      });
      return copy;
    }
    return { items, apply };
  }

  function cacheKey(lang, id) { return 'pl-tr:' + lang + ':' + id; }
  /* Бастапқы мәтіннің хэші: тапсырма мәтіні өзгерсе (task-text-fixes.js), ескі аударма қолданылмай, қайта аударылады */
  function hashItems(items) {
    let h = 5381;
    const s = items.join('\u0001');
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  function readCache(lang, id, items) {
    try {
      const v = JSON.parse(localStorage.getItem(cacheKey(lang, id)) || 'null');
      return v && v.h === hashItems(items) && Array.isArray(v.t) && v.t.length === items.length ? v.t : null;
    } catch (e) { return null; }
  }
  function writeCache(lang, id, items, arr) {
    try { localStorage.setItem(cacheKey(lang, id), JSON.stringify({ h: hashItems(items), t: arr })); } catch (e) {}
  }

  async function translateItems(items, lang) {
    // ұзын мәтінді бөліктерге бөлу
    const chunks = []; let cur = [], size = 0;
    items.forEach(s => {
      if (size + s.length > 7000 && cur.length) { chunks.push(cur); cur = []; size = 0; }
      cur.push(s); size += s.length;
    });
    if (cur.length) chunks.push(cur);
    const out = [];
    for (const ch of chunks) out.push(...(await PL.ai.translate(ch, lang)));
    return out;
  }

  /* id — кэш кілті; src — тапсырма (checks қосылған) немесе оқу мақсаты; kind — 'task' | 'obj' */
  function cached(id, src, kind, lang) {
    const c = collect(src, kind);
    const arr = readCache(lang, id, c.items);
    return arr ? c.apply(arr) : null;
  }
  function get(id, src, kind, lang) {
    const c = collect(src, kind);
    if (!c.items.length) return Promise.resolve(c.apply([]));
    const arr = readCache(lang, id, c.items);
    if (arr) return Promise.resolve(c.apply(arr));
    const key = lang + ':' + id;
    if (!inflight[key]) {
      inflight[key] = translateItems(c.items, lang).then(res => {
        writeCache(lang, id, c.items, res);
        return res;
      }).finally(() => { delete inflight[key]; });
    }
    return inflight[key].then(res => collect(src, kind).apply(res));
  }

  return { get, cached };
})();
