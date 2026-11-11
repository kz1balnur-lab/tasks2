/*
 * Оқушы жауабын тексеру: сандарды, өлшем бірліктерін, үтір/нүктені, жуық мәндерді өңдеу.
 * Нәтиже мәртебесі:
 *   ok      — дұрыс (сенімді тексерілді)
 *   partial — сан мәні дұрыс, бірақ өлшем бірлігі жоқ/басқа бірлікте
 *   wrong   — дұрыс емес
 *   unsure  — автоматты түрде сенімді тексеру мүмкін болмады
 *   open    — ашық сұрақ, автоматты тексерілмейді
 *   empty   — жауап енгізілмеген
 */
window.PL = window.PL || {};
PL.checker = (function () {
  const T = (k, v) => PL.t(k, v);
  // өлшем бірліктері: [шама, ХБЖ-ға көбейткіш]
  const U = {};
  function def(dim, factor, names) { names.forEach(n => { U[n] = { dim, f: factor, name: names[0] }; }); }
  def('mass', 1, ['кг', 'kg', 'килограмм', 'килограм']);
  def('mass', 1e-3, ['г', 'гр', 'грамм', 'грам', 'g']);
  def('mass', 1e-6, ['мг', 'mg', 'миллиграмм']);
  def('mass', 1e3, ['т', 'тонна', 't']);
  def('len', 1, ['м', 'm', 'метр']);
  def('len', 1e-2, ['см', 'cm', 'сантиметр']);
  def('len', 1e-3, ['мм', 'mm', 'миллиметр']);
  def('len', 1e-1, ['дм', 'dm', 'дециметр']);
  def('len', 1e3, ['км', 'km', 'километр']);
  def('vol', 1, ['м³', 'м3', 'm3', 'm³', 'текшем']);
  def('vol', 1e-3, ['дм³', 'дм3', 'dm3', 'л', 'l', 'литр']);
  def('vol', 1e-6, ['см³', 'см3', 'cm3', 'cm³', 'мл', 'ml', 'миллилитр']);
  def('vol', 1e-9, ['мм³', 'мм3', 'mm3']);
  def('force', 1, ['Н', 'н', 'n', 'ньютон', 'h']);
  def('force', 1e3, ['кН', 'кн', 'kn', 'килоньютон', 'kh', 'кh']);
  def('force', 1e6, ['мн_mega']);
  def('dens', 1, ['кг/м³', 'кг/м3', 'kg/m3', 'kg/m³']);
  def('dens', 1e3, ['г/см³', 'г/см3', 'g/cm3', 'g/cm³', 'г/мл', 'g/ml', 'кг/л', 'кг/дм³', 'кг/дм3']);
  def('stiff', 1, ['Н/м', 'н/м', 'n/m', 'h/m']);
  def('stiff', 100, ['Н/см', 'н/см', 'n/cm']);
  def('stiff', 1000, ['Н/мм', 'н/мм', 'n/mm', 'кН/м', 'кн/м', 'kn/m']);
  def('acc', 1, ['Н/кг', 'н/кг', 'n/kg', 'h/кг', 'м/с²', 'м/с2', 'm/s2', 'm/s²']);
  def('times', 1, ['есе', 'рет', 'раз', 'x', 'times']);

  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+' };

  function normUnit(u) {
    let s = (u || '').trim()
      .replace(/\\text\{([^}]*)\}/g, '$1').replace(/\\mathrm\{([^}]*)\}/g, '$1')
      .replace(/\^\{?(\d)\}?/g, '$1').replace(/[²]/g, '2').replace(/[³]/g, '3')
      .replace(/\s+/g, '').replace(/[.]$/, '').replace(/\\cdot|·|\*/g, '');
    if (!s) return '';
    // қазақ/орыс сөздеріндегі жалғаулар: «кг-ға», «Н-ға» → кг, Н
    s = s.replace(/-(ға|ге|қа|ке|на|не|да|де|та|те|ден|дан|тен|тан|нен|нан)$/i, '');
    if (U[s]) return s;
    const lo = s.toLowerCase();
    if (U[lo]) return lo;
    // «м^3» → «м3», «m^3» → «m3»
    const m3 = lo.replace(/\^/g, '');
    if (U[m3]) return m3;
    return null; // танылмады
  }

  /* «0,27 кг», «2,5·10⁻⁵ м³», «40 000 Н», «F = 3 Н», «3ньютон» → {num, unit} */
  function parseQuantity(raw) {
    if (raw == null) return null;
    let s = String(raw).trim();
    if (!s) return null;
    // соңғы «=» белгісінен кейінгі бөлікті аламыз
    if (s.includes('=')) s = s.split('=').pop().trim();
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, m => '^' + m.split('').map(c => SUP[c]).join(''))
      .replace(/−|–/g, '-').replace(/ /g, ' ')
      .replace(/(\d)[\s ']+(?=\d{3}(\D|$))/g, '$1') // 40 000 → 40000
      .replace(/(\d),(\d)/g, '$1.$2');
    // «м^3» жағдайын қалпына келтіру (жоғарыдағы ауыстыру бірлікті де қамтыды)
    const re = /^([+-]?(?:\d+\.?\d*|\.\d+))\s*(?:(?:[·*×x]|\\cdot|\\times)\s*10\s*\^\s*\(?\{?\s*([+-]?\d+)\s*\}?\)?)?(?:[eE]([+-]?\d+))?\s*(.*)$/;
    const m = s.match(re);
    if (!m) return { num: NaN, unit: s };
    let num = parseFloat(m[1]);
    if (m[2]) num *= Math.pow(10, parseInt(m[2], 10));
    if (m[3]) num *= Math.pow(10, parseInt(m[3], 10));
    let unit = (m[4] || '').replace(/\^(\d)/g, '$1').trim();
    return { num, unit };
  }

  function close(a, b, tol) {
    if (tol != null) return Math.abs(a - b) <= tol + 1e-12;
    return Math.abs(a - b) <= Math.max(Math.abs(b) * 1e-9, 1e-12);
  }

  function fmt(n) { return String(+n.toPrecision(10)).replace('.', ','); }

  function checkNum(item, value) {
    const q = parseQuantity(value);
    if (!q) return { status: 'empty' };
    if (isNaN(q.num)) return { status: 'unsure', msg: T('ckNumParse') };
    const expU = item.u && U[item.u] ? U[item.u] : null;
    const dimless = !expU || expU.dim === 'times';
    if (dimless) {
      if (q.unit && normUnit(q.unit) && U[normUnit(q.unit)].dim !== 'times') return { status: 'wrong', msg: T('ckNoUnitNeeded') };
      return close(q.num, item.v, item.tol) ? { status: 'ok', msg: T('ckOk') } : { status: 'wrong', msg: T('ckValMismatch') };
    }
    if (!q.unit) {
      const valOk = close(q.num, item.v, item.tol);
      if (item.uo || item.v === 0) return valOk ? { status: 'ok', msg: T('ckOk') } : { status: 'wrong', msg: T('ckValMismatch') };
      return valOk
        ? { status: 'partial', reason: 'nounit', msg: T('ckNoUnit', { u: item.u }) }
        : { status: 'wrong', msg: T('ckValMismatchUnit') };
    }
    const nu = normUnit(q.unit);
    if (!nu) return { status: 'unsure', msg: T('ckUnitUnknown', { u: q.unit }) };
    const gotU = U[nu];
    if (gotU.dim !== expU.dim) return { status: 'wrong', msg: T('ckUnitDim', { u: q.unit, e: item.u }) };
    const siGot = q.num * gotU.f, siExp = item.v * expU.f;
    const tolSI = item.tol != null ? item.tol * expU.f : null;
    const valOk = close(siGot, siExp, tolSI);
    const sameUnit = gotU.name === expU.name;
    if (valOk && (sameUnit || item.any || item.v === 0)) return { status: 'ok', msg: T('ckOk') };
    if (valOk) return { status: 'partial', reason: 'conv', msg: T('ckUnitConv', { a: fmt(q.num) + ' ' + q.unit, b: fmt(item.v) + ' ' + item.u, e: item.u }) };
    return { status: 'wrong', msg: T('ckValMismatch2') };
  }

  function checkList(item, value) {
    if (!value || !String(value).trim()) return { status: 'empty' };
    const parts = String(value).split(/[;\n]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 1 && /\d\s*,\s*\d/.test(parts[0]) && !/\d,\d/.test(parts[0].replace(/\s/g, ''))) { /* «2, 4, 6» */ }
    // «2, 4, 6 Н» (үтір+бос орын) бөлу
    let arr = parts.length === 1 ? parts[0].split(/,\s+|\s+и\s+|\s+және\s+/) : parts;
    arr = arr.map(s => s.trim()).filter(Boolean);
    const qs = arr.map(parseQuantity);
    if (qs.some(q => !q || isNaN(q.num))) return { status: 'unsure', msg: T('ckListSep') };
    const lastUnit = [...qs].reverse().find(q => q.unit);
    const expU = U[item.u];
    const vals = [];
    for (const q of qs) {
      const uStr = q.unit || (lastUnit ? lastUnit.unit : '');
      if (!uStr) { vals.push(q.num); continue; }
      const nu = normUnit(uStr);
      if (!nu) return { status: 'unsure', msg: T('ckUnitUnknown', { u: uStr }) };
      if (U[nu].dim !== expU.dim) return { status: 'wrong', msg: T('ckUnitDimList', { e: item.u }) };
      vals.push(q.num * U[nu].f / expU.f);
    }
    if (vals.length !== item.vs.length) return { status: 'wrong', msg: T('ckListCount', { n: item.vs.length, m: vals.length }) };
    let ok;
    if (item.unordered) {
      const a = [...vals].sort((x, y) => x - y), b = [...item.vs].sort((x, y) => x - y);
      ok = a.every((v, i) => close(v, b[i], item.tol));
    } else ok = vals.every((v, i) => close(v, item.vs[i], item.tol));
    if (!ok) return { status: 'wrong', msg: T('ckListSome') };
    if (!lastUnit && !item.uo) return { status: 'partial', reason: 'nounit', msg: T('ckListNoUnit', { u: item.u }) };
    return { status: 'ok', msg: T('ckOk') };
  }

  function normWord(s, formula) {
    let r = String(s || '').toLowerCase().trim()
      .replace(/[«»"'“”.!?]/g, '').replace(/\s+/g, ' ');
    if (formula) {
      r = r.replace(/\\left|\\right/g, '').replace(/\\cdot|\\times|·|\*|×|⋅/g, '').replace(/\\rho/g, 'ρ').replace(/\\delta|\\delta/g, 'δ')
        .replace(/δ/g, 'δ').replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2').replace(/[{}\s]/g, '').replace(/÷|:/g, '/');
    } else {
      r = r.replace(/[()]/g, '').replace(/\s*\/\s*/g, '/');
    }
    return r;
  }

  function checkWord(item, value) {
    if (!value || !String(value).trim()) return { status: 'empty' };
    const v = normWord(value, item.formula);
    const ok = item.a.some(a => normWord(a, item.formula) === v);
    if (ok) return { status: 'ok', msg: T('ckOk') };
    return { status: 'unsure', msg: T('ckWordUnsure') };
  }

  function check(item, value) {
    switch (item.k) {
      case 'num': return checkNum(item, value);
      case 'list': return checkList(item, value);
      case 'word': return checkWord(item, value);
      case 'choice':
        if (!value) return { status: 'empty' };
        return value === item.a ? { status: 'ok', msg: T('ckOk') } : { status: 'wrong', msg: T('ckWrong') };
      case 'multi': {
        const v = Array.isArray(value) ? value : [];
        if (!v.length) return { status: 'empty' };
        const ok = v.length === item.a.length && item.a.every(a => v.includes(a));
        return ok ? { status: 'ok', msg: T('ckOk') } : { status: 'wrong', msg: T('ckMulti') };
      }
      case 'open': return { status: 'open', msg: T('ckOpen') };
      default: return { status: 'unsure' };
    }
  }

  /* Бірлікті айналдыру: convert(3, 'см', 'м') → {v: 0.03, from: 'см', to: 'м'}; to жоқ болса — ХБЖ бірлігіне */
  const SI = { mass: 'кг', len: 'м', vol: 'м³', force: 'Н', dens: 'кг/м³', stiff: 'Н/м', acc: 'Н/кг' };
  function convert(num, from, to) {
    const a = normUnit(from); if (!a) return null;
    const ua = U[a]; const b = to ? normUnit(to) : SI[ua.dim]; if (!b) return null;
    const ub = U[b]; if (!ub || ub.dim !== ua.dim) return { err: 'dim' };
    return { v: num * ua.f / ub.f, from: ua.name, to: ub.name, factor: ua.f / ub.f };
  }

  return { check, parseQuantity, normUnit, convert };
})();
