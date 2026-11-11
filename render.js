/* Word-тан алынған мазмұн блоктарын HTML-ге көрсету (мәтін, кесте, сурет, KaTeX формулалар) */
window.PL = window.PL || {};
PL.render = (function () {
  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(c => c != null && e.append(c));
    return e;
  }

  /* «F_теңәсер» → F<sub>теңәсер</sub>: мәтін түрінде сақталатын белгілерде (жауап нұсқалары, бақылау нүктелерінің атаулары)
     астыңғы индекс кириллицамен жазылады. subNodes — DOM түйіндері, subHTML — экрандалған мәтінге қолдануға арналған. */
  const SUB_RE = /([A-Za-z])_([А-Яа-яӘәІіҢңҒғҮүҰұҚқӨөҺһЁё]+)/g;
  function subNodes(s) {
    s = String(s == null ? '' : s);
    const out = []; let pos = 0, m;
    SUB_RE.lastIndex = 0;
    while ((m = SUB_RE.exec(s))) {
      out.push(document.createTextNode(s.slice(pos, m.index) + m[1]), el('sub', { text: m[2] }));
      pos = m.index + m[0].length;
    }
    out.push(document.createTextNode(s.slice(pos)));
    return out;
  }
  const subHTML = (h) => String(h == null ? '' : h).replace(SUB_RE, '$1<sub>$2</sub>');

  function stripTags(h) {
    const d = document.createElement('div');
    d.innerHTML = h;
    d.querySelectorAll('.tex').forEach(t => t.replaceWith(' ' + (t.dataset.tex || '') + ' '));
    return d.textContent.replace(/\s+/g, ' ').trim();
  }

  /* Шешу жолындағы бөлім атауларын (Берілгені, Шешуі, Жауабы…) белгілеу */
  const TAGS = [
    [/^(<b>)?(Берілгені:)/, ''], [/^(<b>)?(ХБЖ-да:)/, ''], [/^(<b>)?(Табу керек:)/, ''],
    [/^(<b>)?(Формуланы түрлендіру:)/, 't-formula'], [/^(<b>)?(Формула:)/, 't-formula'],
    [/^(<b>)?(Есептеу:)/, 't-calc'], [/^(<b>)?(Шешуі \(үлгі жауап\):|Шешуі:)/, ''],
    [/^(<b>)?(Салыстыру:)/, 't-concl'], [/^(<b>)?(Қорытынды:)/, 't-concl'], [/^(<b>)?(Тексеру[^:]*:)/, 't-calc'],
    [/^(<b>)?(Жауабы:)/, 't-ans'], [/^(<b>)?(Ескерту:)/, 't-concl']
  ];
  function decorateSolution(h) {
    for (const [re, cls] of TAGS) {
      const m = h.match(re);
      if (m) {
        const rest = h.slice(m[0].length).replace(/^<\/b>/, '');
        return '<span class="sol-tag ' + cls + '">' + m[2].replace(/:$/, '') + '</span>' + rest;
      }
    }
    return h;
  }

  function paragraph(b, opts) {
    let h = b.h;
    const txt = stripTags(h);
    if (opts && opts.solution) h = decorateSolution(h);
    let cls;
    if (/^Есте сақта/.test(txt)) cls = 'remember';
    else if (/^Көмек:/.test(txt)) cls = 'helper';
    else if (/^\d-қадам\./.test(txt)) cls = 'step-head';
    // бос орындар ______ көрнекі болсын
    h = h.replace(/_{2,}/g, m => '<span class="blank" aria-label="бос орын">' + m + '</span>');
    return el('p', { class: cls, html: h });
  }

  function figure(b) {
    const img = el('img', {
      src: b.src, class: 'task-img', loading: 'lazy', alt: PL.t('imgAlt'),
      style: b.w ? 'width:' + Math.min(b.w, 760) + 'px' : null
    });
    img.addEventListener('click', () => PL.app && PL.app.zoomImage(b.src));
    return el('figure', { class: 'fig' }, [img, el('div', { class: 'img-off', text: PL.t('imgHidden') })]);
  }

  function table(b, opts) {
    const rows = b.rows;
    // vMerge → rowspan есептеу
    const grid = rows.map(r => r.map(c => ({ c, rs: 1, skip: false })));
    for (let ri = 0; ri < grid.length; ri++) {
      let col = 0;
      grid[ri].forEach(cell => {
        cell.col = col; col += cell.c.cs || 1;
      });
    }
    for (let ri = 0; ri < grid.length; ri++) {
      grid[ri].forEach(cell => {
        if (cell.c.vm === 'cont') {
          // жоғарыдағы сол бағандағы ұяшықты табу
          for (let up = ri - 1; up >= 0; up--) {
            const above = grid[up].find(x => x.col === cell.col);
            if (above && !above.skip) { above.rs++; break; }
          }
          cell.skip = true;
        }
      });
    }
    const t = el('table');
    grid.forEach(r => {
      const tr = el('tr');
      r.forEach(cell => {
        if (cell.skip) return;
        const td = el('td', { colspan: cell.c.cs > 1 ? cell.c.cs : null, rowspan: cell.rs > 1 ? cell.rs : null });
        cell.c.b.forEach(x => td.append(block(x, opts)));
        tr.append(td);
      });
      t.append(tr);
    });
    return el('div', { class: 'table-wrap' }, [t]);
  }

  function box(b, opts) {
    const first = b.b[0] && b.b[0].t === 'p' ? stripTags(b.b[0].h) : '';
    let cls = 'box';
    if (/^(Көмекші|Дайын сөздер)/.test(first)) cls += ' box-help';
    else if (/^Контекст/.test(first)) cls += ' box-context';
    const d = el('div', { class: cls });
    b.b.forEach(x => d.append(block(x, opts)));
    return d;
  }

  function block(b, opts) {
    switch (b.t) {
      case 'p': return paragraph(b, opts);
      case 'img': return figure(b);
      case 'tbl': return table(b, opts);
      case 'box': return box(b, opts);
      default: return document.createTextNode('');
    }
  }

  function blocks(list, opts) {
    const wrap = el('div', { class: 'content' });
    (list || []).forEach(b => wrap.append(block(b, opts)));
    tex(wrap);
    return wrap;
  }

  /* KaTeX арқылы формулаларды көрсету */
  function tex(root) {
    if (!window.katex) return;
    root.querySelectorAll('.tex').forEach(s => {
      if (s.dataset.done) return;
      try {
        katex.render(s.dataset.tex, s, { throwOnError: false, strict: 'ignore', displayMode: s.classList.contains('tex-d') });
        s.dataset.done = '1';
      } catch (e) { s.textContent = s.dataset.tex; }
    });
  }

  function latexToHTML(latex, display) {
    if (!window.katex) return document.createTextNode(latex);
    const s = document.createElement('span');
    try { katex.render(latex, s, { throwOnError: false, strict: 'ignore', displayMode: !!display }); }
    catch (e) { s.textContent = latex; }
    return s;
  }

  /* AI мен PDF үшін блоктарды жай мәтінге айналдыру */
  function plain(list) {
    const out = [];
    (list || []).forEach(b => {
      if (b.t === 'p') out.push(stripTags(b.h));
      else if (b.t === 'img') out.push('[сурет]');
      else if (b.t === 'box') out.push(plain(b.b));
      else if (b.t === 'tbl') out.push(b.rows.map(r => '| ' + r.map(c => plain(c.b).replace(/\n/g, ' ')).join(' | ') + ' |').join('\n'));
    });
    return out.join('\n');
  }

  return { el, blocks, tex, plain, stripTags, latexToHTML, decorateSolution, subNodes, subHTML };
})();
