/*
 * Электронды тақта (Canvas API). Тышқан, саусақ, стилус (Pointer Events, қысым сезімталдығы).
 * Сызбалар вектор түрінде сақталады (items) → деңгей ауысқанда да, браузер жабылса да жоғалмайды.
 */
window.PL = window.PL || {};
PL.Board = (function () {
  const { el } = PL.render;
  const T = (k, v) => PL.t(k, v);
  const W = 1600, H = 1000, GRID = 40;
  const COLORS = ['#0F172A', '#2563EB', '#B91C1C', '#15803D', '#B45309', '#6D28D9'];

  class Board {
    constructor(container, data, onChange, opts) {
      this.root = container;
      this.onChange = onChange || (() => {});
      this.opts = opts || {};
      this.data = { items: [], grid: false, ...(data || {}) };
      this.items = this.data.items || [];
      this.redo = [];
      this.tool = 'pen';
      this.color = COLORS[0];
      this.width = 4;
      this.cur = null;
      this.build();
      this.renderCommitted();
      this.draw();
    }

    build() {
      const tools = el('div', { class: 'board-tools', role: 'toolbar', 'aria-label': T('bTools') });
      const toolDefs = [
        ['pen', 'pencil', T('bPen')], ['eraser', 'eraser', T('bEraser')], ['line', 'line', T('bRuler')],
        ['arrow', 'arrow', T('bArrow')], ['rect', 'square', T('bRect')], ['ellipse', 'circle', T('bEllipse')], ['text', 'type', T('bText')]
      ];
      this.toolBtns = {};
      toolDefs.forEach(([id, icon, title]) => {
        const b = el('button', { type: 'button', class: 'bt' + (id === this.tool ? ' active' : ''), title, 'aria-label': title }, [PL.icon(icon, 17)]);
        b.addEventListener('click', () => this.setTool(id));
        this.toolBtns[id] = b; tools.append(b);
      });
      tools.append(el('span', { class: 'sep' }));
      this.swatches = COLORS.map(c => {
        const s = el('button', { type: 'button', class: 'swatch' + (c === this.color ? ' active' : ''), title: T('bColor'), 'aria-label': T('bColor') + ' ' + c, style: 'background:' + c });
        s.addEventListener('click', () => this.setColor(c));
        tools.append(s); return s;
      });
      const picker = el('input', { type: 'color', value: '#111827', title: T('bOtherColor'), 'aria-label': T('bOtherColor') });
      picker.addEventListener('input', () => this.setColor(picker.value));
      tools.append(picker);
      const range = el('input', { type: 'range', min: '1', max: '24', value: String(this.width), title: T('bWidth'), 'aria-label': T('bWidth') });
      range.addEventListener('input', () => { this.width = +range.value; });
      tools.append(range, el('span', { class: 'sep' }));
      tools.append(
        el('button', { type: 'button', class: 'bt', title: T('bUndo'), 'aria-label': T('bUndo'), onclick: () => this.undo() }, [PL.icon('undo', 17)]),
        el('button', { type: 'button', class: 'bt', title: T('bRedo'), 'aria-label': T('bRedo'), onclick: () => this.redoAction() }, [PL.icon('redo', 17)]),
        el('button', { type: 'button', class: 'bt', title: T('bClear'), 'aria-label': T('bClear'), onclick: () => this.clear() }, [PL.icon('trash', 17)])
      );
      this.gridBtn = el('button', { type: 'button', class: 'bt' + (this.data.grid ? ' active' : ''), title: T('bGrid'), 'aria-label': T('bGrid') }, [PL.icon('grid', 17)]);
      this.gridBtn.addEventListener('click', () => { this.data.grid = !this.data.grid; this.gridBtn.classList.toggle('active', this.data.grid); this.draw(); this.save(); });
      tools.append(this.gridBtn);

      this.canvas = el('canvas', { width: W, height: H, 'aria-label': T('bAria'), role: 'img' });
      this.ctx = this.canvas.getContext('2d');
      this.layer = document.createElement('canvas'); this.layer.width = W; this.layer.height = H;
      this.lctx = this.layer.getContext('2d');
      this.holder = el('div', { class: 'board-canvas-holder' }, [this.canvas]);

      const c = this.canvas;
      c.addEventListener('pointerdown', e => this.down(e));
      c.addEventListener('pointermove', e => this.move(e));
      c.addEventListener('pointerup', e => this.up(e));
      c.addEventListener('pointercancel', e => this.up(e));
      c.addEventListener('contextmenu', e => e.preventDefault());
      this.keyHandler = (e) => {
        if (!this.root.isConnected) return;
        if (!this.root.contains(document.activeElement) && document.activeElement !== document.body) return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redoAction() : this.undo(); }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); this.redoAction(); }
      };
      document.addEventListener('keydown', this.keyHandler);

      const foot = el('div', { class: 'board-foot' });
      this.foot = foot;
      this.toolsEl = tools;
      this.root.append(el('div', { class: 'board-wrap' }, [tools, this.holder, foot]));
    }

    destroy() { document.removeEventListener('keydown', this.keyHandler); }

    setTool(t) {
      this.tool = t;
      Object.entries(this.toolBtns).forEach(([k, b]) => b.classList.toggle('active', k === t));
      this.canvas.style.cursor = t === 'text' ? 'text' : (t === 'eraser' ? 'cell' : 'crosshair');
    }
    setColor(c) {
      this.color = c;
      this.swatches.forEach(s => s.classList.toggle('active', s.style.background && this.rgbEq(s.style.background, c)));
      if (this.tool === 'eraser') this.setTool('pen');
    }
    rgbEq(rgb, hex) {
      const m = rgb.match(/\d+/g); if (!m) return false;
      const h = '#' + m.slice(0, 3).map(x => (+x).toString(16).padStart(2, '0')).join('');
      return h.toLowerCase() === hex.toLowerCase();
    }

    pos(e) {
      const r = this.canvas.getBoundingClientRect();
      return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
    }

    down(e) {
      if (e.button === 2) return;
      e.preventDefault();
      const p = this.pos(e);
      if (this.tool === 'text') { this.textAt(p, e); return; }
      this.canvas.setPointerCapture(e.pointerId);
      const pressure = e.pointerType === 'pen' ? (e.pressure || 0.5) : 0.5;
      if (this.tool === 'pen' || this.tool === 'eraser') {
        this.cur = { type: this.tool, color: this.color, w: this.tool === 'eraser' ? Math.max(18, this.width * 4) : this.width, pts: [[p[0], p[1], pressure]], pen: e.pointerType === 'pen' };
      } else {
        this.cur = { type: this.tool, color: this.color, w: this.width, a: p, b: p };
      }
      this.draw();
    }

    move(e) {
      if (!this.cur) return;
      e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      if (this.cur.pts) {
        evs.forEach(ev => {
          const p = this.pos(ev);
          this.cur.pts.push([p[0], p[1], ev.pointerType === 'pen' ? (ev.pressure || 0.5) : 0.5]);
        });
      } else {
        let p = this.pos(e);
        if (e.shiftKey && (this.cur.type === 'line' || this.cur.type === 'arrow')) {
          const [ax, ay] = this.cur.a; const dx = p[0] - ax, dy = p[1] - ay;
          const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * (Math.PI / 12); const len = Math.hypot(dx, dy);
          p = [ax + Math.cos(ang) * len, ay + Math.sin(ang) * len];
        }
        this.cur.b = p;
      }
      this.draw();
    }

    up() {
      if (!this.cur) return;
      const it = this.cur; this.cur = null;
      const tiny = it.pts ? it.pts.length < 1 : Math.hypot(it.b[0] - it.a[0], it.b[1] - it.a[1]) < 3;
      if (!tiny) this.commit(it);
      this.draw();
    }

    textAt(p, e) {
      if (this.textInput) this.textInput.blur();
      const r = this.canvas.getBoundingClientRect(), hr = this.holder.getBoundingClientRect();
      const input = el('input', { class: 'board-text-input', type: 'text', placeholder: T('bTextPh'), 'aria-label': T('bText') });
      input.style.left = (e.clientX - hr.left) + 'px';
      input.style.top = (e.clientY - hr.top - 14) + 'px';
      input.style.color = this.color;
      this.holder.append(input);
      this.textInput = input;
      const size = Math.max(28, this.width * 6);
      let done = false;
      const finish = (ok) => {
        if (done) return; done = true;
        const txt = input.value.trim();
        input.remove(); this.textInput = null;
        if (ok && txt) { this.commit({ type: 'text', color: this.color, size, x: p[0], y: p[1], text: txt }); this.draw(); }
      };
      input.addEventListener('keydown', ev => { if (ev.key === 'Enter') finish(true); if (ev.key === 'Escape') finish(false); });
      input.addEventListener('blur', () => finish(true));
      setTimeout(() => input.focus(), 0);
      void r;
    }

    commit(it) {
      this.items.push(it);
      this.redo = [];
      this.renderCommitted();
      this.save();
    }
    undo() {
      if (!this.items.length) return;
      this.redo.push(this.items.pop());
      this.renderCommitted(); this.draw(); this.save();
    }
    redoAction() {
      if (!this.redo.length) return;
      this.items.push(this.redo.pop());
      this.renderCommitted(); this.draw(); this.save();
    }
    clear() {
      if (!this.hasContent()) return;
      this.items.push({ type: 'clear' });
      this.redo = [];
      this.renderCommitted(); this.draw(); this.save();
      PL.app && PL.app.toast(T('bCleared'));
    }
    visibleItems(list) {
      const arr = list || this.items;
      let start = 0;
      arr.forEach((it, i) => { if (it.type === 'clear') start = i + 1; });
      return arr.slice(start);
    }
    hasContent() { return this.visibleItems().length > 0; }

    save() {
      this.data.items = this.items;
      this.onChange(this.data);
    }

    /* ── Сызу ── */
    drawItem(ctx, it) {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (it.type === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = '#000'; }
      else ctx.strokeStyle = it.color;
      ctx.fillStyle = it.color;
      if (it.pts) {
        const pts = it.pts;
        if (pts.length === 1) {
          ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], it.w / 2, 0, Math.PI * 2);
          if (it.type === 'eraser') ctx.fillStyle = '#000';
          ctx.fill();
        } else if (it.pen && it.type === 'pen') {
          for (let i = 1; i < pts.length; i++) {
            ctx.beginPath(); ctx.lineWidth = it.w * (0.4 + pts[i][2] * 1.2);
            ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
          }
        } else {
          ctx.lineWidth = it.w;
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length - 1; i++) {
            const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
            ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
          }
          const l = pts[pts.length - 1]; ctx.lineTo(l[0], l[1]); ctx.stroke();
        }
      } else if (it.type === 'line' || it.type === 'arrow') {
        ctx.lineWidth = it.w;
        ctx.beginPath(); ctx.moveTo(it.a[0], it.a[1]); ctx.lineTo(it.b[0], it.b[1]); ctx.stroke();
        if (it.type === 'arrow') {
          const ang = Math.atan2(it.b[1] - it.a[1], it.b[0] - it.a[0]);
          const hs = Math.max(16, it.w * 4.5);
          ctx.beginPath();
          ctx.moveTo(it.b[0], it.b[1]);
          ctx.lineTo(it.b[0] - hs * Math.cos(ang - 0.42), it.b[1] - hs * Math.sin(ang - 0.42));
          ctx.lineTo(it.b[0] - hs * Math.cos(ang + 0.42), it.b[1] - hs * Math.sin(ang + 0.42));
          ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.arc(it.a[0], it.a[1], Math.max(4, it.w), 0, Math.PI * 2); ctx.fill(); // түсірілу нүктесі
        }
      } else if (it.type === 'rect') {
        ctx.lineWidth = it.w;
        ctx.strokeRect(Math.min(it.a[0], it.b[0]), Math.min(it.a[1], it.b[1]), Math.abs(it.b[0] - it.a[0]), Math.abs(it.b[1] - it.a[1]));
      } else if (it.type === 'ellipse') {
        ctx.lineWidth = it.w;
        ctx.beginPath();
        ctx.ellipse((it.a[0] + it.b[0]) / 2, (it.a[1] + it.b[1]) / 2, Math.abs(it.b[0] - it.a[0]) / 2, Math.abs(it.b[1] - it.a[1]) / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (it.type === 'text') {
        ctx.font = '600 ' + it.size + 'px Inter, Arial, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.text, it.x, it.y);
      }
      ctx.restore();
    }

    renderCommitted() {
      this.lctx.clearRect(0, 0, W, H);
      this.visibleItems().forEach(it => this.drawItem(this.lctx, it));
    }

    drawBackground(ctx, grid) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
      if (grid) {
        ctx.save(); ctx.strokeStyle = '#dbe7f6'; ctx.lineWidth = 1.5;
        for (let x = GRID; x < W; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = GRID; y < H; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        ctx.restore();
      }
    }

    draw() {
      const ctx = this.ctx;
      this.drawBackground(ctx, this.data.grid);
      if (this.cur && this.cur.type === 'eraser') {
        // өшіргішті уақытша қабатта көрсету
        const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
        const t = tmp.getContext('2d'); t.drawImage(this.layer, 0, 0); this.drawItem(t, this.cur);
        ctx.drawImage(tmp, 0, 0);
      } else {
        ctx.drawImage(this.layer, 0, 0);
        if (this.cur) this.drawItem(ctx, this.cur);
      }
    }

    /* Сызба шекарасы (OCR үшін кесу) */
    bounds() {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      const add = (x, y, pad) => { x0 = Math.min(x0, x - pad); y0 = Math.min(y0, y - pad); x1 = Math.max(x1, x + pad); y1 = Math.max(y1, y + pad); };
      this.visibleItems().forEach(it => {
        if (it.type === 'eraser') return;
        if (it.pts) it.pts.forEach(p => add(p[0], p[1], it.w));
        else if (it.a) { add(it.a[0], it.a[1], it.w); add(it.b[0], it.b[1], it.w); }
        else if (it.type === 'text') { add(it.x, it.y, it.size); add(it.x + it.text.length * it.size * 0.6, it.y, it.size); }
      });
      if (!isFinite(x0)) return null;
      const pad = 30;
      x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W, x1 + pad); y1 = Math.min(H, y1 + pad);
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }

    /* PNG ретінде экспорт: {crop, grid} */
    toDataURL(opts) {
      opts = opts || {};
      const full = document.createElement('canvas'); full.width = W; full.height = H;
      const f = full.getContext('2d');
      this.drawBackground(f, opts.grid != null ? opts.grid : this.data.grid);
      f.drawImage(this.layer, 0, 0);
      if (!opts.crop) return full.toDataURL('image/png');
      const b = this.bounds();
      if (!b) return null;
      const out = document.createElement('canvas'); out.width = Math.round(b.w); out.height = Math.round(b.h);
      out.getContext('2d').drawImage(full, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
      return out.toDataURL('image/png');
    }
  }
  Board.W = W; Board.H = H;
  return Board;
})();
