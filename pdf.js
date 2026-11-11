/*
 * PDF экспорт: оқушының аты-жөні, тақырып, оқу мақсаты, деңгей, есептің шарты, шешу жолы, тақтадағы сызба, жауаптар.
 * html2canvas + jsPDF (кирилл әріптері мен формулалар сурет ретінде дұрыс шығады).
 * Қате болса — браузердің «Басып шығару → PDF ретінде сақтау» терезесі ашылады.
 */
window.PL = window.PL || {};
PL.pdf = (function () {
  const { el, blocks, latexToHTML } = PL.render;
  const t = (k, v) => PL.t(k, v);

  function buildReport(info) {
    const r = document.getElementById('pdfReport');
    r.innerHTML = '';
    const locale = { kk: 'kk-KZ', ru: 'ru-RU', en: 'en-GB' }[PL.getLang()] || 'kk-KZ';
    const row = (a, b) => el('tr', {}, [el('td', { html: '<b>' + a + '</b>' }), el('td', { text: b })]);
    r.append(
      el('h1', { text: t('rpTitle') }),
      el('table', { class: 'meta' }, [
        row(t('rpStudent'), info.student || '—'), row(t('rpTopic'), info.topic), row(t('rpObj'), info.objective),
        row(t('rpLevel'), info.level + ' (' + info.points + ')'), row(t('rpStatus'), info.status), row(t('rpDate'), new Date().toLocaleString(locale))
      ]),
      el('h2', { text: t('condition') }), blocks(info.condition),
      el('h2', { text: t('rpSol') })
    );
    const sol = el('div');
    const lines = (info.lines || []).filter(l => String(l.v || '').trim());
    if (!lines.length) sol.append(el('p', { text: t('rpNoSol') }));
    lines.forEach(l => {
      const p = el('div', { style: 'margin:4px 0' });
      if (l.t === 'm') p.append(latexToHTML(l.v, false)); else p.textContent = l.v;
      sol.append(p);
    });
    r.append(sol);
    if (info.boardImg) r.append(el('h2', { text: t('rpBoard') }), el('img', { src: info.boardImg, style: 'border:1px solid #c7d5e8;border-radius:6px' }));
    if (info.answers && info.answers.length) {
      r.append(el('h2', { text: t('finalAnswers').replace(/^\S+\s/, '') }));
      const tb = el('table');
      tb.append(el('tr', {}, [el('th', { text: t('rpQ') }), el('th', { text: t('rpMy') }), el('th', { text: t('rpRes') })]));
      info.answers.forEach(a => tb.append(el('tr', {}, [el('td', { text: a.label }), el('td', { text: a.value || '—' }), el('td', { text: a.result || t('rpNotChecked') })])));
      r.append(tb);
    }
    if (info.grade && info.grade.rows) {
      r.append(el('h2', { text: t('gradeTitle') }));
      const gt = el('table');
      gt.append(el('tr', {}, [el('th', { text: t('gCol') }), el('th', { text: t('gMax') }), el('th', { text: t('gGot') })]));
      const f = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
      info.grade.rows.forEach(g => gt.append(el('tr', {}, [el('td', { text: g.text + ' — ' + g.fb }), el('td', { text: f(g.max) }), el('td', { text: g.status === 'pending' ? t('gsPending') : f(g.earned) + (g.status === 'ai' ? ' (AI)' : '') })])));
      gt.append(el('tr', {}, [el('td', { html: '<b>' + t('gTotal') + '</b>' }), el('td', { text: f(info.grade.max) }), el('td', { html: '<b>' + f(info.grade.earned) + '</b>' })]));
      r.append(gt, el('p', { html: '<b>' + t('gScore', { a: f(info.grade.earned), b: f(info.grade.max) }) + '</b>' + (info.grade.pending ? ' — ' + t('gPendingNote', { n: f(info.grade.pending) }) : '') }));
    }
    r.append(el('p', { style: 'margin-top:18px;color:#5a6e86;font-size:12px', text: t('rpNote') }));
    return r;
  }

  async function exportPDF(info) {
    const r = buildReport(info);
    await Promise.all([...r.querySelectorAll('img')].map(img => img.complete ? 0 : new Promise(res => { img.onload = img.onerror = res; })));
    const fileName = ('Physics_' + (info.student || 'student') + '_' + info.taskId).replace(/[\\/:*?"<>|\s]+/g, '_') + '.pdf';
    try {
      if (!window.html2canvas || !window.jspdf) throw new Error('lib');
      const canvas = await html2canvas(r, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      const margin = 24, imgW = pw - margin * 2;
      const pxPerPt = canvas.width / imgW;
      const pageHpx = Math.floor((ph - margin * 2) * pxPerPt);
      let y = 0, page = 0;
      while (y < canvas.height) {
        const h = Math.min(pageHpx, canvas.height - y);
        const slice = document.createElement('canvas'); slice.width = canvas.width; slice.height = h;
        slice.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        if (page > 0) pdf.addPage();
        pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgW, h / pxPerPt);
        y += h; page++;
      }
      pdf.save(fileName);
      return { ok: true };
    } catch (e) {
      document.body.classList.add('printing-report');
      setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove('printing-report'), 500); }, 100);
      return { ok: false, fallback: true };
    }
  }

  return { exportPDF };
})();
