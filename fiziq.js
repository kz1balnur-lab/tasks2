/*
 * FIZIQ AI — физика бойынша интеллектуалды көмекші.
 *
 * Үш жұмыс режимі (адал белгіленеді, жалған «AI қосулы» статусы көрсетілмейді):
 *  1) «Оқу көмекшісі» — НЕГІЗГІ режим. Интернетсіз, кілтсіз, GitHub Pages-те жұмыс істейді.
 *     Жауаптар fiziq-kb.js білім базасынан және ағымдағы тапсырманың Word шешуінен (tasks-data.js) құрылады.
 *     Бұл тіл моделі емес — әр жауапта «Білім базасы» белгісі тұрады.
 *  2) «Браузердегі тіл моделі» (WebLLM, WebGPU) — модель оқушының браузерінде жүктеледі және іске қосылады,
 *     API кілті қажет емес. Құрылғы үйлесімділігі тексеріледі, жүктеу көлемі ескертіледі, Web Worker ішінде
 *     жұмыс істейді (бет қатып қалмайды). Сәтсіз болса — автоматты түрде білім базасына оралады.
 *  3) Claude API — сервер (backend/.env) немесе пайдаланушының өз кілті бапталса ғана.
 *
 * Педагогика: дайын шешу бірден берілмейді. 1-кеңес — берілгені мен табу керегі, 2-кеңес — формула/заң,
 * 3-кеңес — келесі қадам (соңғы сан жасырылады). Толық шешу — тек оқушы бөлек растағанда немесе «Тексеру» басылған соң.
 */
window.PL = window.PL || {};
PL.fiziq = (function () {
  const { el } = PL.render;
  const KB = window.FIZIQ_KB || { concepts: [], groups: {}, intents: {} };
  const WEBLLM_URL = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.86/+esm';
  const LLM_MODELS = [
    { base: 'Qwen2.5-1.5B-Instruct', name: 'Qwen 2.5 · 1.5B', size: '≈ 0,9 ГБ', vram: '≈ 1,7 ГБ', rec: true },
    { base: 'Qwen2.5-0.5B-Instruct', name: 'Qwen 2.5 · 0.5B', size: '≈ 0,3 ГБ', vram: '≈ 1 ГБ', weak: true },
    { base: 'gemma-2-2b-it', name: 'Gemma 2 · 2B', size: '≈ 1,4 ГБ', vram: '≈ 2 ГБ' }
  ];
  const MAX_MSGS = 150;

  // ── Интерфейс мәтіндері (көмекшінің жауаптары — әрқашан қазақ тілінде) ──
  const S = {
    kk: {
      tagline: 'Физикадағы ақылды көмекшіңіз', fabTip: 'Сұрағыңыз бар ма?', open: 'FIZIQ AI көмекшісін ашу',
      stKb: 'Оқу көмекшісі режимі', stReady: 'Көмекші дайын', stLoading: 'Модель жүктелуде…', engKb: 'Білім базасы',
      settings: 'Баптаулар', clear: 'Чатты тазалау', close: 'Жабу', copy: 'Көшіру', copied: 'Көшірілді',
      ph: 'Физика бойынша сұрағыңызды жазыңыз…', send: 'Жіберу', thinking: 'Жауап дайындалуда',
      hello: 'Сәлем! 👋', hello2: 'Мен <b>FIZIQ AI</b> — физика пәні бойынша ақылды көмекшіңізбін.', hello3: 'Бүгін қандай тақырыпты бірге зерттейміз?',
      c1: 'Формуланы түсіндіріңіз', c2: 'Есепті шығаруға көмектесіңіз', c3: 'Бірінші қадамды көрсетіңіз', c4: 'Қателігімді түсіндіріңіз',
      c1d: 'Шамалар мен бірліктер', c2d: 'Біртіндеп кеңес', c3d: 'Неден бастау керек', c4d: 'Тексеру нәтижесі бойынша',
      ctxNow: 'Қазіргі тақырып', ctxNone: 'Тапсырма таңдалмаған — сол жақтан тақырыпты ашыңыз.',
      modeTitle: 'Жұмыс режимі', mKb: 'Оқу көмекшісі (білім базасы)', mKbD: 'Интернетсіз және API кілтсіз жұмыс істейді. Жауаптар осы платформаға енгізілген дайын материалдан және тапсырманың Word шешуінен құрылады — бұл тіл моделі емес.',
      mLlm: 'Браузердегі тіл моделі (WebLLM) — тәжірибелік', mLlmD: 'Модель сіздің құрылғыңызда іске қосылады, кілт қажет емес. Бірінші рет жүктеу ұзақ болуы мүмкін, кейін браузер кэшінде сақталады.',
      mApi: 'Claude API (сервер немесе кілт)', mApiD: 'Мұғалім backend серверін немесе өз API кілтін баптаған жағдайда ғана.',
      consent: 'Шешуімді тіл моделіне жіберуге рұқсат беремін (тек 2–3 режимдерде)',
      gpuOk: 'WebGPU қолжетімді — модельді іске қосуға болады.', gpuNo: 'Бұл браузерде WebGPU жоқ — тіл моделі жұмыс істемейді. Chrome/Edge (113+) соңғы нұсқасын қолданыңыз. Әзірге білім базасы жауап береді.',
      gpuChecking: 'Құрылғы тексерілуде…', gpuMobile: 'Ескерту: телефонда модель баяу жұмыс істеуі және батареяны тез отырғызуы мүмкін.', gpuLowMem: 'Ескерту: құрылғының жады аз ({g} ГБ) — ең жеңіл модельді таңдаңыз.',
      model: 'Модель', load: 'Модельді жүктеу', cancel: 'Тоқтату', unload: 'Модельді өшіру', loaded: 'Модель жүктелді және жұмысқа дайын.',
      loadWarn: 'Жүктеу көлемі: {s}. Видеожады: {v}. Wi-Fi арқылы жүктеген дұрыс. Жүктеу кезінде сайтты пайдалана бересіз.',
      llmFail: 'Модельді жүктеу сәтсіз болды: {e}. Көмекші білім базасы режимінде жұмысын жалғастырады.',
      kzNote: 'Маңызды: браузерге сыятын шағын модельдер қазақ тілін нашар біледі — тексеруде Qwen 0.5B мен 1.5B жауаптары сөздері бұзылған, мағынасыз болды. Сондықтан сұрақ білім базасында болса, дайын тексерілген жауап көрсетіледі; модель тек қалған сұрақтарға жауап береді және оның жауабына сенуге болмайды.', llmNote: 'Жергілікті модельдің жауабы тексерілмеген, қазақ тілінде қате болуы мүмкін. Мұғаліммен немесе оқулықпен салыстырыңыз.',
      notLoaded: 'Модель әлі жүктелмеген — әзірге білім базасы жауап береді.', llmJson: 'модель бағалауды дұрыс форматта қайтармады', llmBad: 'Модельдің жауабы сапасыз шықты (қайталанып кетті). Сұрақты қысқартып қойыңыз немесе үлкенірек модельді таңдаңыз.', weak: 'Бұл модель өте шағын: қазақ тілінде жиі қате жазады. Тек құрылғыны тексеру үшін ұсынылады.', hybrid: 'Гибрид режим: сұрақ білім базасында болса — тексерілген дайын жауап, болмаса — тіл моделі жауап береді.',
      footKb: 'Білім базасы режимі: жауаптар дайын материалдан алынады.', footLlm: 'Жергілікті тіл моделі: жауапта қате болуы мүмкін.', footApi: 'Claude API арқылы жауап береді.'
    },
    ru: {
      tagline: 'Ваш умный помощник по физике', fabTip: 'Есть вопрос?', open: 'Открыть помощника FIZIQ AI',
      stKb: 'Режим учебного помощника', stReady: 'Помощник готов', stLoading: 'Загрузка модели…', engKb: 'База знаний',
      settings: 'Настройки', clear: 'Очистить чат', close: 'Закрыть', copy: 'Копировать', copied: 'Скопировано',
      ph: 'Напишите вопрос по физике…', send: 'Отправить', thinking: 'Готовлю ответ',
      hello: 'Сәлем! 👋', hello2: 'Я <b>FIZIQ AI</b> — ваш умный помощник по физике (отвечаю на казахском языке).', hello3: 'Какую тему исследуем сегодня?',
      c1: 'Объясните формулу', c2: 'Помогите решить задачу', c3: 'Покажите первый шаг', c4: 'Объясните мою ошибку',
      c1d: 'Величины и единицы', c2d: 'Подсказки по шагам', c3d: 'С чего начать', c4d: 'По результату проверки',
      ctxNow: 'Текущая тема', ctxNone: 'Задание не выбрано — откройте тему слева.',
      modeTitle: 'Режим работы', mKb: 'Учебный помощник (база знаний)', mKbD: 'Работает без интернета и API-ключа. Ответы составляются из встроенных материалов и решения из Word — это не языковая модель.',
      mLlm: 'Языковая модель в браузере (WebLLM) — экспериментально', mLlmD: 'Модель запускается на вашем устройстве, ключ не нужен. Первая загрузка может быть долгой, затем модель хранится в кэше браузера.',
      mApi: 'Claude API (сервер или ключ)', mApiD: 'Только если учитель настроил backend или ввёл свой API-ключ.',
      consent: 'Разрешаю отправлять моё решение языковой модели (только режимы 2–3)',
      gpuOk: 'WebGPU доступен — модель можно запустить.', gpuNo: 'В этом браузере нет WebGPU — языковая модель не заработает. Используйте свежий Chrome/Edge (113+). Пока отвечает база знаний.',
      gpuChecking: 'Проверка устройства…', gpuMobile: 'Внимание: на телефоне модель может работать медленно и быстро разряжать батарею.', gpuLowMem: 'Внимание: мало памяти ({g} ГБ) — выберите самую лёгкую модель.',
      model: 'Модель', load: 'Загрузить модель', cancel: 'Остановить', unload: 'Выгрузить модель', loaded: 'Модель загружена и готова.',
      loadWarn: 'Объём загрузки: {s}. Видеопамять: {v}. Лучше загружать по Wi-Fi. Во время загрузки сайтом можно пользоваться.',
      llmFail: 'Не удалось загрузить модель: {e}. Помощник продолжит работу в режиме базы знаний.',
      kzNote: 'Важно: маленькие модели, помещающиеся в браузер, плохо знают казахский — при проверке ответы Qwen 0.5B и 1.5B были с искажёнными словами и без смысла. Поэтому если вопрос есть в базе знаний, показывается проверенный ответ; модель отвечает только на остальные вопросы, и её ответам доверять нельзя.', llmNote: 'Ответ локальной модели не проверен и может содержать ошибки в казахском языке. Сверяйте с учителем или учебником.',
      notLoaded: 'Модель ещё не загружена — пока отвечает база знаний.', llmJson: 'модель вернула оценку в неверном формате', llmBad: 'Ответ модели получился некачественным (зациклился). Сформулируйте вопрос короче или выберите модель побольше.', weak: 'Это очень маленькая модель: часто ошибается в казахском языке. Рекомендуется только для проверки устройства.', hybrid: 'Гибридный режим: если вопрос есть в базе знаний — проверенный готовый ответ, иначе отвечает языковая модель.',
      footKb: 'Режим базы знаний: ответы из готовых материалов.', footLlm: 'Локальная языковая модель: возможны ошибки.', footApi: 'Отвечает через Claude API.'
    },
    en: {
      tagline: 'Your smart physics assistant', fabTip: 'Got a question?', open: 'Open FIZIQ AI assistant',
      stKb: 'Study-helper mode', stReady: 'Assistant ready', stLoading: 'Loading model…', engKb: 'Knowledge base',
      settings: 'Settings', clear: 'Clear chat', close: 'Close', copy: 'Copy', copied: 'Copied',
      ph: 'Write your physics question…', send: 'Send', thinking: 'Preparing an answer',
      hello: 'Сәлем! 👋', hello2: 'I am <b>FIZIQ AI</b> — your smart physics assistant (I answer in Kazakh).', hello3: 'Which topic shall we explore today?',
      c1: 'Explain the formula', c2: 'Help me solve it', c3: 'Show the first step', c4: 'Explain my mistake',
      c1d: 'Quantities and units', c2d: 'Step-by-step hints', c3d: 'Where to start', c4d: 'Based on the check',
      ctxNow: 'Current topic', ctxNone: 'No task selected — open a topic on the left.',
      modeTitle: 'Mode', mKb: 'Study helper (knowledge base)', mKbD: 'Works offline and without an API key. Answers come from built-in materials and the Word solution — this is not a language model.',
      mLlm: 'In-browser language model (WebLLM) — experimental', mLlmD: 'The model runs on your device, no key needed. The first download can take a while; then it stays in the browser cache.',
      mApi: 'Claude API (server or key)', mApiD: 'Only if the teacher set up the backend or entered an API key.',
      consent: 'Allow sending my solution to the language model (modes 2–3 only)',
      gpuOk: 'WebGPU is available — the model can run.', gpuNo: 'This browser has no WebGPU — the language model will not work. Use a recent Chrome/Edge (113+). The knowledge base answers for now.',
      gpuChecking: 'Checking device…', gpuMobile: 'Note: on a phone the model can be slow and drain the battery.', gpuLowMem: 'Note: low memory ({g} GB) — choose the lightest model.',
      model: 'Model', load: 'Download model', cancel: 'Stop', unload: 'Unload model', loaded: 'Model loaded and ready.',
      loadWarn: 'Download size: {s}. GPU memory: {v}. Wi-Fi recommended. You can keep using the site while it loads.',
      llmFail: 'Model failed to load: {e}. The assistant continues in knowledge-base mode.',
      kzNote: 'Important: small models that fit in a browser know Kazakh poorly — in testing, Qwen 0.5B and 1.5B produced garbled, meaningless answers. So if the question is in the knowledge base, the verified answer is shown; the model only answers the remaining questions and its answers cannot be trusted.', llmNote: 'This local-model answer is unverified and may contain errors in Kazakh. Check with the teacher or textbook.',
      notLoaded: 'Model not loaded yet — the knowledge base answers for now.', llmJson: 'the model did not return the grading in the expected format', llmBad: 'The model\'s answer degenerated (it started repeating). Ask a shorter question or choose a larger model.', weak: 'This model is very small and often makes mistakes in Kazakh. Recommended only to test the device.', hybrid: 'Hybrid mode: if the question is in the knowledge base you get the verified answer, otherwise the language model answers.',
      footKb: 'Knowledge-base mode: answers come from prepared material.', footLlm: 'Local language model: answers may contain errors.', footApi: 'Answers via Claude API.'
    }
  };
  const L = (k, v) => {
    let s = (S[PL.getLang()] || S.kk)[k]; if (s == null) s = S.kk[k] || k;
    if (v) Object.keys(v).forEach(n => { s = s.replace('{' + n + '}', v[n]); });
    return s;
  };
  const ls = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // білім базасының мәтіндері үшін: «F_теңәсер» → F<sub>теңәсер</sub>
  const escS = (s) => PL.render.subHTML(esc(s));

  // ── Күй ──
  let W = {}, ctx = null, msgs = [], hints = {}, busy = false;
  let mode = ls.get('pl-fiziq-mode') || 'kb';
  const llm = { status: 'idle', progress: 0, text: '', engine: null, worker: null, model: ls.get('pl-fiziq-model') || LLM_MODELS[0].base, gpu: null };
  try { msgs = JSON.parse(ls.get('pl-fiziq-chat') || '[]'); if (!Array.isArray(msgs)) msgs = []; } catch (e) { msgs = []; }
  try { hints = JSON.parse(ls.get('pl-fiziq-hints') || '{}') || {}; } catch (e) { hints = {}; }
  const save = () => { if (msgs.length > MAX_MSGS) msgs = msgs.slice(-MAX_MSGS); ls.set('pl-fiziq-chat', JSON.stringify(msgs)); ls.set('pl-fiziq-hints', JSON.stringify(hints)); };

  // ═════════ ЛОГОТИП (SVG) ═════════
  let logoN = 0;
  function logo(size) {
    const n = ++logoN, g1 = 'fqc' + n, g2 = 'fqo' + n;
    const span = el('span', { class: 'fq-logo', 'aria-hidden': 'true' });
    span.innerHTML = `<svg viewBox="0 0 48 48" width="${size}" height="${size}" focusable="false">
      <defs>
        <radialGradient id="${g1}" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#bfe8ff"/><stop offset=".75" stop-color="#7aa8ff"/><stop offset="1" stop-color="#8b6cf6"/></radialGradient>
        <linearGradient id="${g2}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9be7ff"/><stop offset="1" stop-color="#b9a2ff"/></linearGradient>
      </defs>
      <ellipse cx="24" cy="24" rx="19.5" ry="7.2" fill="none" stroke="url(#${g2})" stroke-width="1.9" transform="rotate(-32 24 24)" opacity=".95"/>
      <ellipse cx="24" cy="24" rx="19.5" ry="7.2" fill="none" stroke="url(#${g2})" stroke-width="1.9" transform="rotate(32 24 24)" opacity=".75"/>
      <circle cx="24" cy="24" r="7.2" fill="url(#${g1})"/>
      <circle cx="39.6" cy="13.9" r="2.3" fill="#e8f6ff"/>
      <circle cx="9.2" cy="15.6" r="1.5" fill="#d9ccff" opacity=".9"/>
    </svg>`;
    return span;
  }

  // ═════════ ТАПСЫРМА БІЛІМІ (Word шешуінен) ═════════
  const know = {};
  const plainOf = (h) => PL.render.stripTags(h || '');
  function stripLabel(h, label) { return h.replace(new RegExp('^\\s*(?:<b>)?\\s*' + label + '[^:<]*:?\\s*(?:</b>)?\\s*', 'i'), '').replace(/^\s*<\/b>\s*/, '').trim(); }
  /* «P = m · g = 5000 кг · 10 Н/кг = 50 000 Н» → «P = m · g = 5000 кг · 10 Н/кг = …» (соңғы сан жасырылады) */
  const numsOf = (p) => (String(p).replace(/(\d)[\s ](?=\d{3}(\D|$))/g, '$1').match(/\d+(?:[.,]\d+)?/g) || []).map(x => x.replace(',', '.').replace(/\.0+$/, ''));
  /* Сегменттерді қай жерден кесу керек: нәтиже (амалсыз сан) немесе оқушы өзі табатын сан кездескен жерден.
     allowed — шартта, «Берілгені» мен ХБЖ жолында бұрыннан көрінетін сандар. */
  function cutIndex(plains, allowed) {
    const OP = /\s[·×\/:+−-]\s|\s·|·\s|\\frac|\\cdot|\\times|[+−]|\s-\s/;
    for (let i = 1; i < plains.length; i++) {
      const p = plains[i];
      if (!/\d/.test(p)) continue;
      if (!OP.test(p)) return i;                                   // таза нәтиже
      if (numsOf(p).some(n => !allowed.has(n))) return i;          // оқушы өзі табатын сан
    }
    return plains.length - 1;
  }
  const latexPlain = (x) => x.replace(/\\text\{([^}]*)\}/g, '$1').replace(/\{,\}/g, ',').replace(/\\[,;!: ]|\\q?quad/g, ' ').replace(/[{}]/g, ' ');
  function maskResult(h, allowed) {
    const segs = []; let cur = '', inTag = false;
    for (const ch of h) {
      if (ch === '<') inTag = true;
      if (ch === '>') inTag = false;
      if (ch === '=' && !inTag) { segs.push(cur); cur = ''; } else cur += ch;
    }
    segs.push(cur);
    if (segs.length >= 2) {
      const cut = cutIndex(segs.map(plainOf), allowed);
      return segs.slice(0, cut).join('=') + '= <b>…</b>';
    }
    // Бүкіл жол — формула (KaTeX): теңдік белгілері data-tex ішінде
    return h.replace(/data-tex="([^"]*)"/, (m, tx) => {
      const parts = tx.replace(/&amp;/g, '&').split('=');
      if (parts.length < 2) return m;
      const cut = cutIndex(parts.map(latexPlain), allowed);
      return 'data-tex="' + (parts.slice(0, cut).join('=') + '= \\ldots').replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"';
    });
  }
  const UNIT_RE = /(\d+(?:[.,]\d+)?(?:\s?\d{3})*(?:\s*·\s*10[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)?)\s*(кг\/м³|г\/см³|Н\/кг|Н\/м|кН|мм|см³|см|дм³|дм|м³|мл|мг|кг|км|м|г|т|л|Н)(?![А-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІі])/g;
  function taskKnow(c) {
    if (!c || !c.task) return null;
    if (know[c.task.id]) return know[c.task.id];
    const sol = (c.task.solution || []).filter(b => b.t === 'p');
    const k = { given: null, find: null, formula: null, si: null, step: null, data: [], concepts: [], mistakes: [] };
    let after = -1;
    sol.forEach((b, i) => {
      const p = plainOf(b.h);
      if (/^Берілгені/i.test(p)) {
        let h = stripLabel(b.h, 'Берілгені');
        const m = h.split(/(?:<b>)?\s*Табу керек\s*:?\s*(?:<\/b>)?/i);
        k.given = m[0].trim(); if (m[1] && !k.find) k.find = m[1].trim();
      } else if (/^Табу керек/i.test(p)) k.find = stripLabel(b.h, 'Табу керек');
      else if (/^Формула/i.test(p) && !k.formula) { k.formula = stripLabel(b.h, 'Формула'); after = Math.max(after, i); }
      else if (/^ХБЖ-да/i.test(p)) { k.si = stripLabel(b.h, 'ХБЖ-да'); after = Math.max(after, i); }
      else if (/^Шешуі/i.test(p)) after = Math.max(after, i);
    });
    const cond = PL.render.plain(c.task.condition || []);
    const allowed = new Set([...numsOf(cond), ...numsOf(plainOf(k.given || '')), ...numsOf(plainOf(k.si || ''))]);
    for (let i = 0; i < sol.length && !k.step; i++) {
      let h = sol[i].h; const p = plainOf(h);
      if (/^(Берілгені|ХБЖ|Табу керек|Жауабы|Формула|Есте сақта)/i.test(p)) continue;
      if (/^Шешуі/i.test(p)) h = stripLabel(h, 'Шешуі');
      const hp = plainOf(h);
      if (/=/.test(hp) && /\d/.test(hp)) k.step = maskResult(h, allowed);
    }
    const seen = new Set(); let m;
    UNIT_RE.lastIndex = 0;
    while ((m = UNIT_RE.exec(cond)) && k.data.length < 8) { const s = m[1] + ' ' + m[2]; if (!seen.has(s)) { seen.add(s); k.data.push(s); } }
    const g = KB.groups[c.objId] || { c: [], err: [] };
    k.concepts = g.c.map(id => KB.concepts.find(x => x.id === id)).filter(Boolean);
    k.mistakes = g.err || [];
    k.numeric = !!(k.formula || k.si || k.step || (k.given && /\d/.test(plainOf(k.given))));
    know[c.task.id] = k;
    return k;
  }

  // ═════════ БІЛІМ БАЗАСЫНЫҢ ЖАУАПТАРЫ ═════════
  const lower = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');
  function findConcept(q) {
    const s = lower(q);
    return KB.concepts.find(cn => cn.k.some(key => s.includes(key))) || null;
  }
  function formulaList(cn, withLegend) {
    return '<ul class="fq-f">' + cn.f.map(([f, d]) => '<li><span class="fq-formula">' + escS(f) + '</span>' + (withLegend && d ? '<span class="fq-legend">' + escS(d) + '</span>' : '') + '</li>').join('') + '</ul>';
  }
  function conceptCard(cn, full) {
    let h = '<div class="fq-card-h">' + esc(cn.title) + '</div><p>' + esc(cn.def) + '</p>' + formulaList(cn, true);
    if (cn.more) h += '<p>' + esc(cn.more) + '</p>';
    if (cn.ex) h += '<p class="fq-ex"><b>Мысал.</b> ' + escS(cn.ex) + '</p>';
    if (full && cn.err && cn.err.length) h += '<div class="fq-sub">Жиі кездесетін қателер</div><ul>' + cn.err.map(e => '<li>' + escS(e) + '</li>').join('') + '</ul>';
    return h;
  }
  const needTask = () => reply('Бұл сұраққа жауап беру үшін алдымен тақырыпты ашып, тапсырманы таңдаңыз (сол жақтағы тізімнен). Ал жалпы ұғымдар бойынша қазір де сұрай аласыз: мысалы, «тығыздық деген не?» немесе «3 см неше метр?».');
  const taskLabel = () => ctx ? ctx.topicTitle() + ' · ' + ctx.levelLabel() : '';

  function hintStep(n) {
    const c = ctx, k = taskKnow(c); const id = c.task.id;
    hints[id] = Math.max(hints[id] || 0, n);
    const acts = n < 3 ? [{ a: 'hint', l: 'Келесі кеңес' }, { a: 'formula', l: 'Формуланы түсіндіріңіз' }] : [{ a: 'solution', l: 'Толық шешуді көрсету' }, { a: 'mistake', l: 'Қателігімді түсіндіріңіз' }];
    let h = '<div class="fq-step"><span class="fq-step-n">' + n + '</span>' + ['Бірінші кеңес', 'Екінші кеңес', 'Үшінші кеңес'][n - 1] + '</div>';
    if (n === 1) {
      if (k.given || k.find) {
        h += '<p>Алдымен есепте не берілгенін және не табу керек екенін анықтайық.</p>';
        if (k.given) h += '<p><b>Берілгені:</b> ' + k.given + '</p>';
        if (k.find) h += '<p><b>Табу керек:</b> ' + k.find + '</p>';
        h += '<p>Осы шамаларды дәптеріңізге «Берілгені» түрінде жазыңыз. Олардың бірліктері ХБЖ-да ма, тексеріңіз.</p>';
      } else {
        h += '<p>Шартты мұқият оқып, сұрақтың нені талап ететінін анықтаңыз.</p>';
        if (k.data.length) h += '<p><b>Шартта берілген шамалар:</b> ' + k.data.map(esc).join('; ') + '.</p>';
        if (k.concepts[0]) h += '<p>Бұл тапсырма <b>' + esc(k.concepts[0].title.toLowerCase()) + '</b> тақырыбына қатысты. Өзіңізге сұрақ қойыңыз: шартта қандай құбылыс немесе шама сипатталған?</p>';
      }
      h += '<p class="fq-q">Сізде қандай шамалар белгілі? Келесі кеңеске дайын болсаңыз, «Келесі кеңес» батырмасын басыңыз.</p>';
    } else if (n === 2) {
      if (k.formula) {
        h += '<p>Енді берілген шамаларды байланыстыратын формуланы таңдаймыз:</p><p class="fq-formula-big">' + k.formula + '</p>';
      } else if (k.concepts[0]) {
        h += '<p>Тапсырманы шешу үшін мына заңдылықты еске түсіріңіз:</p>' + formulaList(k.concepts[0], true);
      }
      const cn = k.concepts[0];
      if (cn) h += '<p class="fq-legend-p">' + esc(cn.def) + '</p>';
      if (k.concepts[1] && k.formula) h += '<p>Қажет болса, мына байланыстар да көмектеседі:</p>' + formulaList(k.concepts[1], false);
      h += '<p class="fq-q">Формуладағы әр әріп қандай шаманы білдіреді? Қай шаманы табасыз?</p>';
    } else {
      if (k.si) h += '<p>Келесі қадам — мәндерді ХБЖ-ға келтіру:</p><p class="fq-formula-big">' + k.si + '</p>';
      if (k.step) h += '<p>' + (k.si ? 'Содан кейін' : 'Келесі қадам —') + ' мәндерді формулаға қойыңыз:</p><p class="fq-formula-big">' + k.step + '</p><p>Соңғы есептеуді өзіңіз орындаңыз (калькулятор көмектеседі) және жауаптың бірлігін жазыңыз.</p>';
      if (!k.si && !k.step) {
        const cn = k.concepts[0];
        h += '<p>Жауапты өз сөзіңізбен құрастырыңыз. Ойланатын нәрсе:</p>';
        if (cn && cn.ex) h += '<p class="fq-ex"><b>Ұқсас мысал.</b> ' + escS(cn.ex) + '</p>';
        if (cn && cn.more) h += '<p>' + esc(cn.more) + '</p>';
        h += '<p>Жауап нұсқаларын таңдағанда әр нұсқаны осы ережемен салыстырыңыз.</p>';
      }
      h += '<p class="fq-q">Жауабыңызды енгізіп, «Тексеру» батырмасын басыңыз. Толық шешуді көргіңіз келсе, төмендегі батырманы басыңыз.</p>';
    }
    return reply(h, acts);
  }
  function nextHint() { const id = ctx.task.id; return hintStep(Math.min(3, (hints[id] || 0) + 1)); }

  function explainFormula(q) {
    const cn = q && findConcept(q);
    if (cn && (!ctx || !taskKnow(ctx).concepts.includes(cn) || /формула/.test(lower(q)) === false)) return reply(conceptCard(cn, false), [{ a: 'hint', l: 'Есепті шығаруға көмектесіңіз' }]);
    if (!ctx) return cn ? reply(conceptCard(cn, false)) : needTask();
    const k = taskKnow(ctx);
    let h = '<div class="fq-card-h">Осы тапсырманың формулалары</div>';
    if (k.formula) h += '<p class="fq-formula-big">' + k.formula + '</p>';
    k.concepts.slice(0, 2).forEach(c => { h += '<div class="fq-sub">' + esc(c.title) + '</div>' + formulaList(c, true); });
    h += '<p>Есептеудің алдында барлық шамаларды ХБЖ-ға келтіріңіз: ұзындық — м, масса — кг, көлем — м³, күш — Н.</p>';
    return reply(h, [{ a: 'hint', l: 'Есепті шығаруға көмектесіңіз' }, { a: 'si', l: 'ХБЖ-ға қалай келтіремін?' }]);
  }

  function explainMistake() {
    if (!ctx) return needTask();
    const k = taskKnow(ctx);
    const g = ctx.getGrade ? ctx.getGrade() : null;
    let h = '';
    if (g) {
      const bad = g.rows.filter(r => r.status === 'fail' || r.status === 'part');
      const pend = g.rows.filter(r => r.status === 'pending');
      h += '<div class="fq-card-h">Тексеру нәтижесі: ' + String(g.earned).replace('.', ',') + '/' + g.max + ' балл</div>';
      if (!bad.length && !pend.length) h += '<p>Барлық дескриптор орындалған — керемет! Шешу жолын ресми шешумен салыстырып шығыңыз.</p>';
      if (bad.length) h += '<p>Мына дескрипторлар орындалмады:</p><ul>' + bad.map(r => '<li><b>' + esc(r.text) + '.</b> ' + esc(r.fb) + '</li>').join('') + '</ul>';
      if (pend.length) h += '<p>Мына бөліктерді мұғалім тексереді (балл әлі қойылмаған):</p><ul>' + pend.map(r => '<li>' + esc(r.text) + '</li>').join('') + '</ul>';
    } else {
      h += '<p>Сіз әлі «Тексеру» батырмасын баспадыңыз, сондықтан қай жерде қате бар екенін нақты айта алмаймын. Жауаптарыңызды енгізіп, тексеріңіз — содан кейін қай дескриптор орындалмағанын түсіндіремін.</p>';
    }
    if (k.mistakes.length) h += '<div class="fq-sub">Осы тақырыптағы жиі кездесетін қателер</div><ul>' + k.mistakes.map(e => '<li>' + escS(e) + '</li>').join('') + '</ul>';
    h += '<p class="fq-q">Қатені өзіңіз тауып көріңіз: бірліктерді ХБЖ-ға келтірдіңіз бе? Формула дұрыс таңдалды ма?</p>';
    return reply(h, g ? [{ a: 'solution', l: 'Толық шешуді көрсету' }] : [{ a: 'hint', l: 'Кеңес беріңіз' }]);
  }

  function showSolution(confirmed) {
    if (!ctx) return needTask();
    if (!ctx.isRevealed() && !confirmed) {
      return reply('<p>Толық шешуді көрсетсем, есепті өзіңіз шығару мүмкіндігі жоғалады. Алдымен кеңестерді қолданып көріңіз немесе жауабыңызды «Тексеру» арқылы тексеріңіз.</p><p class="fq-q">Бәрібір толық шешуді көргіңіз келе ме?</p>',
        [{ a: 'solution-yes', l: 'Иә, толық шешуді көрсетіңіз' }, { a: 'hint', l: 'Жоқ, кеңес беріңіз' }]);
    }
    const t = ctx.task;
    const box = el('div');
    if (t.answer && !t.teacher_answers) box.append(el('div', { class: 'fq-answer', html: PL.render.decorateSolution(t.answer) }));
    box.append(PL.render.blocks(t.solution || [], { solution: true }));
    box.querySelectorAll('img').forEach(i => i.removeAttribute('loading'));
    return reply('<div class="fq-card-h">Толық шешу (Word құжатынан)</div>' + box.innerHTML + (ctx.isRevealed() ? '' : '<p class="fq-note">Шешуді оқығаннан кейін есепті дәптерге өзіңіз қайта шығарып көріңіз.</p>'));
  }

  function descriptors() {
    if (!ctx) return needTask();
    const rows = PL.grading.descriptorRows(ctx.task);
    if (!rows.length) return reply('<p>Бұл тапсырманың дескрипторлары жоқ — ол бағаланбайды.</p>');
    const sum = rows.reduce((a, r) => a + r.max, 0);
    return reply('<div class="fq-card-h">Бағалау дескрипторлары · ' + sum + ' балл</div><ul>' + rows.map(r => '<li>' + esc(r.text) + ' — <b>' + r.max + ' балл</b></li>').join('') + '</ul><p>«Тексеру» басылғаннан кейін әр дескриптор бойынша жиналған балл тапсырма астында көрсетіледі.</p>');
  }

  const SUFFIX = /(ге|ға|ке|қа|не|на|ден|дан|тен|тан|нен|нан|ды|ді|ты|ті|ны|ні|мен|бен|пен)$/;
  function unitToken(w) {
    const n = PL.checker.normUnit; if (!w) return null;
    let x = w.replace(/[?.,!;:]+$/, '');
    if (n(x)) return n(x);
    const y = x.replace(/-?(ге|ға|ке|қа|не|на|ден|дан|тен|тан|нен|нан|ды|ді|ты|ті|ны|ні|мен|бен|пен)$/, ''); if (y !== x && n(y)) return n(y);
    if (SUFFIX.test(x)) { const z = x.replace(SUFFIX, ''); if (n(z)) return n(z); }
    return null;
  }
  function convertQuestion(q) {
    const s = q.replace(/(\d),(\d)/g, '$1.$2');
    const m = s.match(/(-?\d+(?:\.\d+)?)\s*(?:·\s*10\^?(-?\d+))?\s*([^\s\d=?,]+)/);
    if (!m) return null;
    const from = unitToken(m[3]); if (!from) return null;
    let num = parseFloat(m[1]); if (m[2]) num *= Math.pow(10, parseInt(m[2], 10));
    const rest = s.slice(m.index + m[0].length).split(/\s+/);
    let to = null; for (const w of rest) { const u = unitToken(w.toLowerCase() === 'метрге' ? 'м' : w); if (u && u !== from) { to = u; break; } }
    const r = PL.checker.convert(num, from, to);
    if (!r) return null;
    if (r.err) return reply('<p>«' + esc(from) + '» мен «' + esc(to) + '» — әр түрлі шамалардың бірліктері, оларды бір-біріне айналдыруға болмайды.</p>');
    const f = (x) => String(+x.toPrecision(10)).replace('.', ',');
    const fac = r.factor >= 1 ? f(r.factor) : f(r.factor);
    return reply('<div class="fq-card-h">Бірлікті айналдыру</div><p class="fq-formula-big">' + f(num) + ' ' + esc(r.from) + ' = ' + f(num) + ' · ' + fac + ' ' + esc(r.to) + ' = <b>' + f(r.v) + ' ' + esc(r.to) + '</b></p><p>Себебі: 1 ' + esc(r.from) + ' = ' + fac + ' ' + esc(r.to) + '.</p>');
  }
  function siHelp() {
    const cn = KB.concepts.find(x => x.id === 'si');
    let h = conceptCard(cn, true);
    if (ctx) { const k = taskKnow(ctx); if (k.data.length) h += '<p><b>Осы тапсырмадағы шамалар:</b> ' + k.data.map(esc).join('; ') + '. Қайсысы ХБЖ-да емес екенін анықтап, айналдырыңыз.</p>'; }
    h += '<p class="fq-q">Нақты санды айналдыру керек болса, жазыңыз: мысалы, «3 см неше метр?» немесе «1,4 кН Н-ға».</p>';
    return reply(h);
  }

  function kbAnswer(q) {
    const s = lower(q).trim();
    const I = KB.intents;
    if (!s) return null;
    if (I.greet.test(s) && s.length < 25) return reply('<p>Сәлем! Мен осы тапсырма бойынша көмектесуге дайынмын. Не қиын болып тұр — формула ма, бірліктер ме, әлде неден бастау керек пе?</p>', welcomeActs());
    if (I.thanks.test(s) && s.length < 30) return reply('<p>Оқасы жоқ! Тағы сұрақ туындаса, жаза беріңіз. Сәттілік! 🌟</p>');
    if (I.solution.test(s)) return showSolution(false);
    if (I.mistake.test(s)) return explainMistake();
    const conv = /\d/.test(s) ? convertQuestion(q) : null;
    if (conv) return conv;
    if (I.si.test(s)) return siHelp();
    if (I.descriptor.test(s)) return descriptors();
    if (I.step1.test(s) || I.given.test(s)) return ctx ? hintStep(1) : needTask();
    if (I.formula.test(s)) return explainFormula(q);
    if (I.hint.test(s)) return ctx ? nextHint() : needTask();
    const cn = findConcept(q);
    if (cn) return reply(conceptCard(cn, true), ctx ? [{ a: 'hint', l: 'Осы тапсырмаға кеңес' }] : null);
    return replyUnknown('<p>Кешіріңіз, бұл сұрақты білім базасынан таба алмадым. Мен тіл моделі емеспін (қазір «Оқу көмекшісі» режимі қосулы), сондықтан тек дайын материал бойынша жауап беремін.</p><p>Мен мыналарға көмектесе аламын:</p><ul><li>физикалық ұғымдар: масса, көлем, тығыздық, инерция, күш, ауырлық күші, салмақ, деформация, Гук заңы, үйкеліс, тең әрекетті күш;</li><li>формуланы түсіндіру және ХБЖ-ға айналдыру (мысалы, «5 см неше метр?»);</li><li>осы тапсырма бойынша біртіндеп кеңес және қатені талдау.</li></ul>', welcomeActs());
  }
  const welcomeActs = () => [{ a: 'formula', l: 'Формуланы түсіндіріңіз' }, { a: 'hint', l: 'Кеңес беріңіз' }, { a: 'step1', l: 'Бірінші қадам' }];

  function runAction(a) {
    switch (a) {
      case 'formula': return explainFormula();
      case 'hint': return ctx ? nextHint() : needTask();
      case 'step1': return ctx ? hintStep(1) : needTask();
      case 'mistake': return explainMistake();
      case 'solution': return showSolution(false);
      case 'solution-yes': return showSolution(true);
      case 'si': return siHelp();
      case 'desc': return descriptors();
    }
    return null;
  }
  const ACT_Q = { formula: 'c1', hint: 'c2', step1: 'c3', mistake: 'c4' };

  // ═════════ ЖЕРГІЛІКТІ ТІЛ МОДЕЛІ (WebLLM) ═════════
  async function checkGpu() {
    const r = { ok: false, f16: false, mobile: /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent), mem: navigator.deviceMemory || null };
    try {
      if (navigator.gpu) {
        const ad = await navigator.gpu.requestAdapter();
        if (ad) { r.ok = true; r.f16 = ad.features && ad.features.has('shader-f16'); }
      }
    } catch (e) { r.ok = false; }
    llm.gpu = r;
    return r;
  }
  const fullId = (base) => base + (llm.gpu && llm.gpu.f16 ? '-q4f16_1-MLC' : '-q4f32_1-MLC');
  async function loadModel() {
    if (llm.status === 'loading') return;
    const gpu = llm.gpu || await checkGpu();
    if (!gpu.ok) { llm.status = 'error'; llm.text = L('gpuNo'); refreshStatus(); renderSettings(); return; }
    llm.status = 'loading'; llm.progress = 0; llm.text = ''; refreshStatus(); renderSettings();
    try {
      const webllm = await import(WEBLLM_URL);
      const src = `import { WebWorkerMLCEngineHandler } from '${WEBLLM_URL}'; const h = new WebWorkerMLCEngineHandler(); self.onmessage = (m) => h.onmessage(m);`;
      llm.worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })), { type: 'module' });
      llm.engine = await webllm.CreateWebWorkerMLCEngine(llm.worker, fullId(llm.model), {
        initProgressCallback: (p) => { llm.progress = p.progress || 0; llm.text = p.text || ''; refreshStatus(); paintProgress(); }
      });
      llm.status = 'ready'; refreshStatus(); renderSettings();
    } catch (e) {
      try { if (llm.worker) llm.worker.terminate(); } catch (x) {}
      const wasCancelled = llm.status === 'idle';
      llm.engine = null; llm.worker = null;
      if (!wasCancelled) { llm.status = 'error'; llm.text = L('llmFail', { e: (e && e.message) || e }); note(llm.text); }
      refreshStatus(); renderSettings();
    }
  }
  function unloadModel() {
    try { if (llm.worker) llm.worker.terminate(); } catch (e) {}
    llm.engine = null; llm.worker = null; llm.status = 'idle'; llm.progress = 0; llm.text = '';
    refreshStatus(); renderSettings();
  }
  function llmSystem() {
    const c = ctx;
    const lines = [
      'Сен — FIZIQ AI, 7-сынып оқушыларына арналған физика көмекшісісің (Қазақстан, ІІ тоқсан).',
      'Әрқашан тек ҚАЗАҚ тілінде, қысқа (3–6 сөйлем), қарапайым жауап бер. Оқушыға «сіз» деп жүгін.',
      'Дайын жауапты немесе соңғы санды айтпа. Бағыттаушы сұрақ қой, формуланы түсіндір, ХБЖ-ға айналдыруды көрсет, бір келесі қадамды ұсын.',
      'Формулаларды қарапайым мәтінмен жаз (ρ = m / V, F = k · Δl). Ондық бөлшекте үтір қолдан. Білмесең — «білмеймін» деп айт, ойдан шығарма.'
    ];
    if (c) {
      const k = taskKnow(c);
      lines.push('', 'ТАПСЫРМА:', 'Тақырып: ' + c.topicTitle(), 'Оқу мақсаты: ' + c.objectiveCode + ' — ' + c.objectiveText(), 'Деңгей: ' + c.levelLabel() + ' (' + c.points() + ')', 'Шарты: ' + String(c.conditionText).slice(0, 1500));
      if (k.concepts.length) lines.push('Қажетті формулалар: ' + k.concepts.slice(0, 2).map(x => x.f.map(f => f[0]).join('; ')).join('; '));
      if (c.isRevealed && c.isRevealed()) lines.push('Оқушы жұмысын тексерді. Ресми шешу: ' + String(c.solutionText).slice(0, 1500));
      if (W.consent && W.consent.checked && c.getStudentWork) { const sw = c.getStudentWork(); if (sw) lines.push('Оқушының шешуі: ' + sw.slice(0, 1200)); }
    }
    return lines.join('\n');
  }
  async function llmAnswer(q, bubble) {
    // Шағын модельдер бұрынғы жауаптарды қайталап кетпеуі үшін әр сұрақ жеке қойылады (жүйелік нұсқау + сұрақ)
    const messages = [{ role: 'system', content: llmSystem() }];
    messages.push({ role: 'user', content: q.slice(0, 600) });
    const stream = await llm.engine.chat.completions.create({ messages, stream: true, temperature: 0.3, max_tokens: 380, frequency_penalty: 0.7, presence_penalty: 0.4 });
    let out = '', bad = false;
    for await (const ch of stream) {
      const d = ch.choices && ch.choices[0] && ch.choices[0].delta && ch.choices[0].delta.content;
      if (!d) continue;
      out += d; bubble.innerHTML = fmtText(out); scrollDown();
      // Қайталанып кету (degeneration) — тоқтатамыз
      const tail = out.slice(-40);
      if (out.length > 1400 || (tail.length === 40 && out.split(tail).length > 3)) { bad = true; try { await llm.engine.interruptGenerate(); } catch (e) {} break; }
    }
    if (bad) { const tail = out.slice(-40); const i = out.indexOf(tail); out = out.slice(0, Math.max(i + 40, 200)) + ' …'; }
    return { text: out.trim(), bad };
  }
  async function apiAnswer() {
    const c = ctx;
    const hist = msgs.filter(m => (m.role === 'user' || m.role === 'bot') && m.text).slice(-12).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text.slice(0, 3000) }));
    while (hist.length && hist[0].role !== 'user') hist.shift();
    const context = c ? {
      topic: c.topicTitle(), objective: c.objectiveCode + ' — ' + c.objectiveText(), level: c.levelLabel(), points: c.points(),
      condition: c.conditionText, remember: c.rememberText, revealed: c.isRevealed(), solution: c.isRevealed() ? c.solutionText : undefined,
      studentWork: W.consent && W.consent.checked ? c.getStudentWork() : undefined
    } : { topic: '', objective: '', level: '', points: '', condition: '(тапсырма таңдалмаған)', revealed: false };
    return PL.ai.chatRequest(hist, context, 'kk');
  }
  function fmtText(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^\s*[-•]\s+/gm, '• ').replace(/\n/g, '<br>');
  }

  // ═════════ ХАБАРЛАМАЛАР ═════════
  let pendingReply = null;
  function reply(html, acts) { pendingReply = { html, acts: acts || null }; return pendingReply; }
  function replyUnknown(html, acts) { const r = reply(html, acts); r.unknown = true; return r; }
  function engineNow() {
    if (mode === 'llm' && llm.status === 'ready') return 'llm';
    if (mode === 'api' && PL.ai.ready()) return 'api';
    return 'kb';
  }
  const srcLabel = (src) => src === 'llm' ? 'WebLLM · ' + (LLM_MODELS.find(m => m.base === llm.model) || {}).name : src === 'api' ? 'Claude API' : L('engKb');

  function pushCtxDivider() {
    if (!ctx) return;
    const last = [...msgs].reverse().find(m => m.task !== undefined);
    if (!last || last.task !== ctx.taskId) msgs.push({ role: 'ctx', text: taskLabel(), task: ctx.taskId, ts: Date.now() });
  }
  function addUser(text) { pushCtxDivider(); msgs.push({ role: 'user', text, task: ctx ? ctx.taskId : null, ts: Date.now() }); }
  function addBot(r, src) {
    const tmp = el('div', { html: r.html });
    msgs.push({ role: 'bot', html: r.html, text: tmp.textContent.replace(/\s+/g, ' ').trim().slice(0, 4000), src, acts: r.acts, task: ctx ? ctx.taskId : null, ts: Date.now() });
  }
  function note(text) { msgs.push({ role: 'note', text, ts: Date.now() }); save(); renderLog(); }

  async function ask(text, action) {
    if (busy) return;
    const q = (text || '').trim();
    if (!q && !action) return;
    busy = true;
    addUser(q || L(ACT_Q[action] || 'c2'));
    W.text.value = ''; autoGrow();
    renderLog(); save();
    const eng = action ? 'kb' : engineNow();
    let kb0 = null;
    const typing = typingBubble();
    try {
      await new Promise(r => setTimeout(r, eng === 'kb' ? 380 : 0));
      if (eng === 'kb') {
        pendingReply = null;
        const r = action ? runAction(action) : kbAnswer(q);
        typing.remove();
        addBot(r || reply('<p>…</p>'), 'kb');
      } else if (eng === 'llm' && (pendingReply = null, kb0 = kbAnswer(q)) && !kb0.unknown) {
        // Гибрид: білім базасы сенімді жауап тапса — тексерілген дайын материал көрсетіледі
        typing.remove();
        addBot(kb0, 'kb');
      } else if (eng === 'llm') {
        const bubble = typing.querySelector('.fq-bubble'); typing.classList.remove('typing');
        const res = await llmAnswer(q, bubble);
        typing.remove();
        addBot(reply(fmtText(res.text || '…') + '<p class="fq-note fq-llm-note">' + esc(res.bad ? L('llmBad') : L('llmNote')) + '</p>'), 'llm');
      } else {
        const out = await apiAnswer();
        typing.remove();
        addBot(reply(fmtText(out)), 'api');
      }
    } catch (e) {
      typing.remove();
      // Тіл моделі/API істемесе — адал хабарлап, білім базасымен жауап береміз
      msgs.push({ role: 'note', text: (eng === 'api' && e instanceof TypeError ? PL.t('aiNet') : PL.t('aiErr', { e: (e && e.message) || e })) + ' → ' + L('engKb'), ts: Date.now() });
      pendingReply = null;
      const r = action ? runAction(action) : kbAnswer(q);
      addBot(r || reply('<p>…</p>'), 'kb');
    } finally {
      busy = false; save(); renderLog();
    }
  }

  function typingBubble() {
    const row = el('div', { class: 'fq-msg bot typing fq-in' }, [logo(22), el('div', { class: 'fq-bubble' }, [el('span', { class: 'fq-dots', 'aria-label': L('thinking') }, [el('i'), el('i'), el('i')])])]);
    W.log.append(row); scrollDown();
    return row;
  }
  function scrollDown() { W.log.scrollTo({ top: W.log.scrollHeight, behavior: 'smooth' }); }

  function renderLog() {
    W.log.innerHTML = '';
    if (!msgs.length) { W.log.append(welcome()); return; }
    const lastBot = msgs.map((m, i) => m.role === 'bot' ? i : -1).filter(i => i >= 0).pop();
    msgs.forEach((m, i) => {
      if (m.role === 'ctx') { W.log.append(el('div', { class: 'fq-divider' }, [el('span', { text: m.text })])); return; }
      if (m.role === 'note') { W.log.append(el('div', { class: 'fq-note-msg', text: m.text })); return; }
      if (m.role === 'user') { W.log.append(el('div', { class: 'fq-msg user' }, [el('div', { class: 'fq-bubble', text: m.text })])); return; }
      const bubble = el('div', { class: 'fq-bubble', html: m.html });
      PL.render.tex(bubble);
      bubble.querySelectorAll('img').forEach(img => { img.addEventListener('click', () => PL.app.zoomImage(img.src)); });
      const copy = el('button', { class: 'fq-copy', type: 'button', title: L('copy'), 'aria-label': L('copy') }, [PL.icon('copy', 14)]);
      copy.addEventListener('click', () => {
        const txt = bubble.innerText.trim();
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => PL.app.toast(L('copied'))).catch(() => {
          const ta = el('textarea'); ta.value = txt; document.body.append(ta); ta.select(); try { document.execCommand('copy'); PL.app.toast(L('copied')); } catch (e) {} ta.remove();
        });
      });
      const meta = el('div', { class: 'fq-meta' }, [el('span', { class: 'fq-src fq-src-' + (m.src || 'kb'), text: srcLabel(m.src) }), copy]);
      const body = el('div', { class: 'fq-body' }, [bubble, meta]);
      if (i === lastBot && m.acts && m.acts.length) body.append(el('div', { class: 'fq-acts' }, m.acts.map(a => el('button', { type: 'button', class: 'fq-act', text: a.l, onclick: () => ask(a.l, a.a) }))));
      W.log.append(el('div', { class: 'fq-msg bot' + (i === msgs.length - 1 ? ' fq-in' : '') }, [logo(22), body]));
    });
    W.log.scrollTop = W.log.scrollHeight;
  }

  const CARD_ICONS = {
    formula: '<path d="M4 19h4l6-14h6"/><path d="M8 12h6"/><path d="m15 15 4 4"/><path d="m19 15-4 4"/>',
    hint: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>',
    step1: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/><circle cx="5" cy="12" r="1.5"/>',
    mistake: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/>'
  };
  function cardIcon(k) {
    const s = el('span', { class: 'fq-card-ic', 'aria-hidden': 'true' });
    s.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + CARD_ICONS[k] + '</svg>';
    return s;
  }
  function welcome() {
    const cards = [['formula', 'c1', 'c1d'], ['hint', 'c2', 'c2d'], ['step1', 'c3', 'c3d'], ['mistake', 'c4', 'c4d']];
    return el('div', { class: 'fq-welcome fq-in' }, [
      el('div', { class: 'fq-hero-logo' }, [logo(64)]),
      el('div', { class: 'fq-hello', text: L('hello') }),
      el('p', { class: 'fq-hello2', html: L('hello2') }),
      el('p', { class: 'fq-hello3', text: L('hello3') }),
      el('div', { class: 'fq-cards' }, cards.map(([a, k, d]) => el('button', { type: 'button', class: 'fq-card', onclick: () => ask('', a) }, [cardIcon(a), el('span', { class: 'fq-card-t', text: L(k) }), el('span', { class: 'fq-card-d', text: L(d) })])))
    ]);
  }

  // ═════════ КОНТЕКСТ ═════════
  function setContext(c) {
    if (c) {
      ctx = Object.assign({}, c, { objId: c.obj ? c.obj.id : null, taskId: c.taskId });
    } else ctx = null;
    paintCtx();
  }
  function paintCtx() {
    if (!W.ctx) return;
    W.ctx.innerHTML = '';
    if (!ctx) { W.ctx.append(el('div', { class: 'fq-ctx-none', text: L('ctxNone') })); return; }
    W.ctx.append(
      el('div', { class: 'fq-ctx-k', text: L('ctxNow') }),
      el('div', { class: 'fq-ctx-t', text: ctx.lessonTitle ? ctx.lessonTitle() : ctx.topicTitle() }),
      el('div', { class: 'fq-ctx-m' }, [
        el('span', { class: 'fq-pill lv-' + ctx.level, text: ctx.levelLabel() + ' · ' + ctx.points() }),
        el('span', { class: 'fq-pill code', text: ctx.objectiveCode }),
        ctx.taskNo ? el('span', { class: 'fq-pill', text: ctx.taskNo() }) : null
      ])
    );
    W.ctx.title = ctx.objectiveCode + ' — ' + ctx.objectiveText();
  }

  // ═════════ КҮЙ ЖӘНЕ БАПТАУЛАР ═════════
  function refreshStatus() {
    if (!W.status) return;
    let st, cls;
    if (mode === 'llm' && llm.status === 'loading') { st = L('stLoading') + ' ' + Math.round(llm.progress * 100) + '%'; cls = 'loading'; }
    else if (engineNow() !== 'kb') { st = L('stReady'); cls = 'ready'; }
    else { st = L('stKb'); cls = 'kb'; }
    W.status.textContent = st;
    W.statusWrap.className = 'fq-status ' + cls;
    W.foot.textContent = engineNow() === 'llm' ? L('footLlm') : engineNow() === 'api' ? L('footApi') : L('footKb');
  }
  function paintProgress() {
    const bar = W.settings && W.settings.querySelector('.fq-progress > i');
    if (bar) bar.style.width = Math.round(llm.progress * 100) + '%';
    const tx = W.settings && W.settings.querySelector('.fq-progress-t');
    if (tx) tx.textContent = Math.round(llm.progress * 100) + '% · ' + String(llm.text || '').slice(0, 90);
  }
  function setMode(m) { mode = m; ls.set('pl-fiziq-mode', m); refreshStatus(); renderSettings(); }
  function renderSettings() {
    if (!W.settings || W.settings.hidden) return;
    const b = W.settingsBody; b.innerHTML = '';
    b.append(el('div', { class: 'fq-set-title', text: L('modeTitle') }));
    const opt = (val, title, desc, extra) => {
      const r = el('input', { type: 'radio', name: 'fqmode', value: val });
      r.checked = mode === val; r.addEventListener('change', () => setMode(val));
      const box = el('label', { class: 'fq-opt' + (mode === val ? ' on' : '') }, [r, el('span', { class: 'fq-opt-b' }, [el('b', { text: title }), el('span', { class: 'fq-opt-d', text: desc })])]);
      b.append(box);
      if (mode === val && extra) b.append(extra);
    };
    opt('kb', L('mKb'), L('mKbD'));
    // WebLLM
    const lx = el('div', { class: 'fq-opt-x' });
    const gpuLine = el('div', { class: 'fq-gpu', text: llm.gpu ? (llm.gpu.ok ? L('gpuOk') : L('gpuNo')) : L('gpuChecking') });
    lx.append(gpuLine);
    if (!llm.gpu) checkGpu().then(() => renderSettings());
    if (llm.gpu && llm.gpu.ok) {
      if (llm.gpu.mobile) lx.append(el('div', { class: 'fq-warn', text: L('gpuMobile') }));
      if (llm.gpu.mem && llm.gpu.mem < 4) lx.append(el('div', { class: 'fq-warn', text: L('gpuLowMem', { g: llm.gpu.mem }) }));
      const sel = el('select', { class: 'ai-input', 'aria-label': L('model') });
      LLM_MODELS.forEach(m => sel.append(el('option', { value: m.base, text: m.name + ' — ' + m.size + (m.rec ? ' ★' : '') })));
      sel.value = llm.model; sel.disabled = llm.status === 'loading' || llm.status === 'ready';
      sel.addEventListener('change', () => { llm.model = sel.value; ls.set('pl-fiziq-model', sel.value); renderSettings(); });
      const md = LLM_MODELS.find(m => m.base === llm.model) || LLM_MODELS[0];
      lx.append(el('label', { class: 'ai-label', text: L('model') }), sel, el('div', { class: 'fq-warn', text: L('loadWarn', { s: md.size, v: md.vram }) }));
      if (md.weak) lx.append(el('div', { class: 'fq-warn err', text: L('weak') }));
      lx.append(el('div', { class: 'fq-note-s', text: L('hybrid') }));
      if (llm.status === 'loading') {
        lx.append(el('div', { class: 'fq-progress' }, [el('i')]), el('div', { class: 'fq-progress-t' }), el('button', { type: 'button', class: 'btn btn-outline', text: L('cancel'), onclick: () => { llm.status = 'idle'; unloadModel(); } }));
        setTimeout(paintProgress, 0);
      } else if (llm.status === 'ready') {
        lx.append(el('div', { class: 'fq-ok', text: L('loaded') }), el('button', { type: 'button', class: 'btn btn-outline', text: L('unload'), onclick: unloadModel }));
      } else {
        if (llm.status === 'error' && llm.text) lx.append(el('div', { class: 'fq-warn err', text: llm.text }));
        else lx.append(el('div', { class: 'fq-note-s', text: L('notLoaded') }));
        lx.append(el('button', { type: 'button', class: 'btn btn-primary', text: L('load'), onclick: loadModel }));
      }
      lx.append(el('div', { class: 'fq-warn', text: L('kzNote') }));
    }
    opt('llm', L('mLlm'), L('mLlmD'), lx);
    // API
    const ax = el('div', { class: 'fq-opt-x' });
    PL.ai.renderKeySettings(ax, refreshStatus);
    opt('api', L('mApi'), (PL.ai.ready() ? PL.ai.statusText() + '. ' : '') + L('mApiD'), ax);
    // келісім
    const cons = el('input', { type: 'checkbox' }); cons.checked = ls.get('pl-ai-consent') === '1';
    cons.addEventListener('change', () => ls.set('pl-ai-consent', cons.checked ? '1' : null));
    W.consent = cons;
    b.append(el('label', { class: 'fq-consent' }, [cons, el('span', { text: L('consent') })]));
  }
  function openSettings(tab) {
    const show = tab != null ? true : W.settings.hidden;
    if (tab === 'api' && mode !== 'api' && !PL.ai.ready()) setMode('api');
    W.settings.hidden = !show;
    W.setBtn.setAttribute('aria-expanded', String(show)); W.setBtn.classList.toggle('active', show);
    if (show) { toggle(true); renderSettings(); }
  }

  // ═════════ ПАНЕЛЬ ═════════
  const isMobile = () => window.matchMedia('(max-width: 1100px)').matches;
  function isOpen() { return isMobile() ? document.body.classList.contains('show-right') : !document.body.classList.contains('right-collapsed'); }
  function toggle(show) {
    const vis = show != null ? show : !isOpen();
    const scrim = document.getElementById('scrim');
    if (isMobile()) {
      document.body.classList.toggle('show-right', vis);
      if (vis) document.body.classList.remove('show-left');
      scrim.hidden = !vis || window.matchMedia('(max-width: 640px)').matches;
    } else {
      document.body.classList.toggle('right-collapsed', !vis);
      ls.set('pl-fiziq-open', vis ? '1' : '0');
    }
    document.body.classList.toggle('fq-open', vis);
    [W.fab, W.barBtn].forEach(b => { if (b) { b.setAttribute('aria-expanded', String(vis)); b.classList.toggle('active', vis); } });
    if (vis) setTimeout(() => { if (!isMobile()) W.text.focus({ preventScroll: true }); W.log.scrollTop = W.log.scrollHeight; }, 260);
  }

  function build() {
    const box = document.getElementById('aiWidget');
    box.className = 'ai-panel fq'; box.setAttribute('aria-label', 'FIZIQ AI');
    box.innerHTML = '';
    W.setBtn = el('button', { class: 'fq-hbtn', type: 'button', title: L('settings'), 'aria-label': L('settings'), 'aria-expanded': 'false' }, [PL.icon('settings', 17)]);
    const clr = el('button', { class: 'fq-hbtn', type: 'button', title: L('clear'), 'aria-label': L('clear') }, [PL.icon('trash', 17)]);
    const cls = el('button', { class: 'fq-hbtn', type: 'button', title: L('close'), 'aria-label': L('close') }, [PL.icon('x', 18)]);
    W.status = el('span', { class: 'fq-status-t' });
    W.statusWrap = el('div', { class: 'fq-status kb' }, [el('span', { class: 'fq-dot' }), W.status]);
    const head = el('header', { class: 'fq-head' }, [
      el('div', { class: 'fq-head-row' }, [
        el('div', { class: 'fq-head-logo' }, [logo(34)]),
        el('div', { class: 'fq-head-t' }, [el('div', { class: 'fq-name', html: 'FIZIQ <span>AI</span>' }), el('div', { class: 'fq-tagline', text: L('tagline') })]),
        el('div', { class: 'fq-head-btns' }, [W.setBtn, clr, cls])
      ]),
      W.statusWrap
    ]);
    W.settingsBody = el('div');
    W.settings = el('div', { class: 'fq-settings', hidden: '' }, [W.settingsBody]);
    W.ctx = el('div', { class: 'fq-ctx' });
    W.log = el('div', { class: 'fq-log', 'aria-live': 'polite', role: 'log' });
    W.text = el('textarea', { rows: '1', placeholder: L('ph'), 'aria-label': L('ph'), enterkeyhint: 'send' });
    const sendBtn = el('button', { class: 'fq-send', type: 'submit', title: L('send'), 'aria-label': L('send') });
    sendBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';
    const form = el('form', { class: 'fq-input' }, [W.text, sendBtn]);
    W.foot = el('div', { class: 'fq-foot' });
    box.append(head, W.settings, W.ctx, W.log, el('div', { class: 'fq-bottom' }, [form, W.foot]));

    form.addEventListener('submit', e => { e.preventDefault(); ask(W.text.value); });
    W.text.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(W.text.value); } });
    W.text.addEventListener('input', autoGrow);
    W.setBtn.addEventListener('click', () => openSettings());
    clr.addEventListener('click', () => { msgs = []; hints = {}; save(); renderLog(); PL.app.toast(L('clear') + ' ✓'); });
    cls.addEventListener('click', () => toggle(false));

    // Қалқымалы батырма
    let fab = document.getElementById('fqFab');
    if (!fab) { fab = el('button', { class: 'fq-fab', id: 'fqFab', type: 'button' }); document.body.append(fab); }
    fab.innerHTML = ''; fab.append(logo(30), el('span', { class: 'fq-fab-tip', text: L('fabTip') }));
    fab.setAttribute('aria-label', L('open')); fab.title = '';
    W.fab = fab;
  }
  function autoGrow() { W.text.style.height = 'auto'; W.text.style.height = Math.min(W.text.scrollHeight, 140) + 'px'; }

  function refreshLang() {
    const wasSettings = W.settings && !W.settings.hidden;
    build(); bindFab(); paintCtx(); renderLog(); refreshStatus();
    if (wasSettings) { W.settings.hidden = false; renderSettings(); }
    const open = isOpen(); [W.fab, W.barBtn].forEach(b => { if (b) { b.setAttribute('aria-expanded', String(open)); b.classList.toggle('active', open); } });
  }
  function bindFab() { W.fab.onclick = () => toggle(true); }

  function init() {
    build(); bindFab();
    W.barBtn = document.getElementById('btnAI');
    if (W.barBtn) W.barBtn.addEventListener('click', () => toggle());
    document.getElementById('scrim').addEventListener('click', () => { if (document.body.classList.contains('show-right')) toggle(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen() && document.activeElement && document.activeElement.closest && document.activeElement.closest('#aiWidget')) toggle(false); });
    const wantOpen = ls.get('pl-fiziq-open') === '1';
    if (!isMobile()) document.body.classList.toggle('right-collapsed', !wantOpen);
    document.body.classList.toggle('fq-open', isOpen());
    [W.fab, W.barBtn].forEach(b => { if (b) { b.setAttribute('aria-expanded', String(isOpen())); b.classList.toggle('active', isOpen()); } });
    if (mode === 'llm') checkGpu();
    paintCtx(); renderLog(); refreshStatus();
  }

  /* Тапсырманы бағалау үшін жергілікті модельге сұраныс (тек түсіндірмелер; нәтижесі сенімсіз ұсыныс) */
  const llmReady = () => llm.status === 'ready' && !!llm.engine;
  async function llmGrade(p) {
    if (!llmReady()) throw new Error(L('notLoaded'));
    const sys = 'You are a physics teacher grading a grade-7 student by criteria. For each descriptor give whole points 0..max ONLY if the student\'s own text shows it. Judge by meaning, not keywords. Return ONLY a JSON array like [{"id":1,"points":0,"comment":"..."}]. Comment in Kazakh, max 15 words.';
    const user = 'Task:\n' + String(p.condition).slice(0, 1500) + '\n\nReference solution:\n' + String(p.solution).slice(0, 1500) + '\n\nDescriptors:\n' + JSON.stringify(p.descriptors) + '\n\nStudent work:\n' + (String(p.studentWork || '').slice(0, 2000) || '(empty)');
    const res = await llm.engine.chat.completions.create({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], temperature: 0, max_tokens: 600 });
    const text = (res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content) || '';
    const m = text.match(/\[[\s\S]*\]/);
    let arr; try { arr = JSON.parse(m ? m[0] : text); } catch (e) { throw new Error(L('llmJson')); }
    if (!Array.isArray(arr)) throw new Error(L('llmJson'));
    return arr;
  }

  return {
    init, setContext, toggle, openSettings, refreshLang, refreshStatus, isOpen, llmReady, llmGrade,
    _ask: ask, _kb: (q) => { pendingReply = null; return kbAnswer(q); }, _know: () => taskKnow(ctx), _state: () => ({ mode, llm: Object.assign({}, llm, { engine: !!llm.engine, worker: !!llm.worker }), msgs: msgs.length, hints }), _checkGpu: checkGpu
  };
})();
