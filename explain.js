/*
 * ТҮСІНДІРМЕЛЕРДІ ТЕКСЕРУ — әр тапсырманың өз дескрипторына арналған алдын ала анықталған мағыналық шарттар.
 *
 * Бұл — табиғи тілді толық түсіну ЕМЕС. Әр дескриптор үшін (explain-rules.js) мұғалімнің үлгі жауабынан алынған
 * мағыналық топтар жазылған: синонимдер мен түрлі тұжырымдар (иіледі / майысады / пішіні өзгереді),
 * себеп пен объектінің бір сөйлемде (немесе көрші сөйлемде) бірге келуі, болымсыз форма («қайтпайды»,
 * «серпімді емес»), қарама-қайшылық («пластикалық» деп қате атау).
 *
 * Нәтиже: ok — шарттар орындалды; part — жартылай (мыс., түрі аталды, негіздеме жоқ) → «Толық орындалмады»;
 * none — сәйкес мазмұн жоқ → «Орындалмады»; contra — қате тұжырым → «Орындалмады»;
 * pending — оқушы түсіндірме жазған (себебі/өйткені/сондықтан…), бірақ ереже оны сенімді тани алмады → мұғалім тексереді.
 */
window.PL = window.PL || {};
PL.explain = (function () {
  const W = 'a-zа-яёәіңғүұқөһ0-9';
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"“”„']/g, ' ')
    .replace(/[−–—]/g, '-').replace(/[₀-₉]/g, c => '₀₁₂₃₄₅₆₇₈₉'.indexOf(c)).replace(/\s+/g, ' ').trim();
  const CONNECT = /(себебі|себепті|өйткені|сондықтан|сол үшін|сол себепті|яғни|демек|себеп|неге десең|неге десеңіз|болғандықтан|болғаннан|үшін)/;
  const NEG = /^(ма|ме|ба|бе|па|пе)(й|с|ған|ген|қан|кен|у|ды|ді|ты|ті|ң|йт)/;

  /* Оқушы мәтінін сөйлемдерге бөлу; көшірілген сұрақтар («…?») алынып тасталады */
  function sentences(lines) {
    const out = [];
    (lines || []).forEach(l => {
      let txt = norm(PL.solcheck.lineText(l));
      if (!txt) return;
      txt = txt.replace(/\s((?:\d+\s*-\s*қадам\s*:?\s*)?(?:\d+(?:\.\d+)*|[аәбвгғд])\s*\))\s/gi, '\n$1 '); // жаңа тармақ — жаңа сөйлем
      let cur = '';
      for (let i = 0; i < txt.length; i++) {
        const ch = txt[i]; cur += ch;
        if (ch === '\n' || (/[.!?;]/.test(ch) && (i + 1 === txt.length || /\s/.test(txt[i + 1])))) {
          const s = cur.replace(/\n/g, ' ').trim(); if (s && !/\?$/.test(s)) out.push(s); cur = '';
        }
      }
      const s = cur.trim(); if (s && !/\?$/.test(s)) out.push(s);
    });
    return out;
  }
  const tokens = (s) => s.split(new RegExp('[^' + W + ',.<>=+\\-/^]+', 'i')).filter(Boolean);

  /* Бір балама: RegExp | 'сөз' (сөз басы) | 'сөз тіркесі' (ретімен, арасында ≤2 сөз) | '+етістік' (болымсыз емес) | [бәрі бірге] */
  let LOOSE = false; // бос орынсыз біріккен формула жолы бар болса — түбірлерді мәтін ішінен іздеу
  function matchAlt(alt, text, toks) {
    if (alt instanceof RegExp) return alt.test(text) || (LOOSE && alt.test(text.replace(/\s+/g, '')));
    if (Array.isArray(alt)) return alt.every(a => matchAlt(a, text, toks));
    let pos = alt[0] === '+';
    const words = (pos ? alt.slice(1) : alt).split(' ');
    for (let i = 0; i < toks.length; i++) {
      if (!toks[i].startsWith(words[0])) continue;
      let j = i, ok = true, last = i;
      for (let w = 1; w < words.length && ok; w++) {
        let found = -1;
        for (let k = j + 1; k <= Math.min(toks.length - 1, j + 3); k++) if (toks[k].startsWith(words[w])) { found = k; break; }
        if (found < 0) ok = false; else { j = found; last = found; }
      }
      if (!ok) continue;
      if (pos) {
        const lw = words[words.length - 1], tk = toks[last];
        const nx = String(toks[last + 1] || '').replace(/[.,;:!?]+$/, '');
        if (NEG.test(tk.slice(lw.length)) || nx === 'емес' || nx === 'жоқ') continue;
      }
      return true;
    }
    if (LOOSE) { const flat = text.replace(/\s+/g, ''), w = words.join(''); const i = flat.indexOf(w); if (i >= 0 && !(pos && NEG.test(flat.slice(i + w.length)))) return true; }
    return false;
  }
  const groupIn = (g, text, toks) => g.some(a => matchAlt(a, text, toks));

  function evaluate(rule, lines) {
    LOOSE = (lines || []).some(l => l.t === 'm' && String(l.v || '').replace(/\\[a-z]+|[{}]/gi, '').length > 15 && !/\s|\\[:,; ]/.test(String(l.v)));
    const S = sentences(lines);
    if (!S.length) return { st: 'none' };
    const all = S.join(' '), allT = tokens(all);
    if (rule.fn) return rule.fn(S, all, { matchAlt, tokens });
    if (rule.not && rule.not.some(a => matchAlt(a, all, allT))) return { st: 'contra' };
    if (rule.count) {
      const n = rule.count.alts.filter(a => matchAlt(a, all, allT)).length;
      if (n >= rule.count.need) return { st: 'ok', n };
      return { st: n ? (rule.soft ? 'pending' : 'part') : 'none', n };
    }
    const G = rule.all;
    let best = { n: 0, text: '' };
    if (rule.near) {
      for (let i = 0; i < S.length; i++) {
        // көрші сөйлем тек сол тармақтың жалғасы болса қосылады («3)» жаңа тармағы — бөлек)
        const nextOk = S[i + 1] && !/^((\d+\s*-\s*қадам\s*:?\s*)?(\d+(\.\d+)*|[аәбвгғд])\s*\))/i.test(S[i + 1]);
        for (const win of nextOk ? [S[i], S[i] + ' ' + S[i + 1]] : [S[i]]) {
          const tk = tokens(win);
          const sat = G.map(g => groupIn(g, win, tk));
          const n = sat.filter(Boolean).length;
          if (n === G.length) return { st: 'ok' };
          if (n > best.n) best = { n, text: win, sat };
        }
      }
    } else {
      const sat = G.map(g => groupIn(g, all, allT));
      const n = sat.filter(Boolean).length;
      if (n === G.length) return { st: 'ok' };
      best = { n, text: all, sat };
    }
    if (!best.n) return { st: 'none' };
    // Жартылай: оқушы түсіндіруге тырысқан, бірақ ереже танымады → мұғалім; әйтпесе «Толық орындалмады»
    if (rule.soft || CONNECT.test(best.text)) return { st: 'pending', sat: best.sat };
    return { st: 'part', sat: best.sat };
  }

  return { evaluate, sentences, norm, _match: matchAlt };
})();
