/*
 * Сайт құрылымы — 7-сынып КТЖ (2026–2027), ІІ тоқсан, №17–№32 сабақтар.
 * Навигация САБАҚ ТАҚЫРЫПТАРЫ бойынша құрылады. Оқу мақсаттары — тек ақпараттық блок.
 * groups — осы сабаққа жататын тапсырмалар тобы: Word құжатындағы оқу мақсатының идентификаторы
 *   (t1o1 = «1 тақырып.docx», 1-оқу мақсаты; t4o3 = «4 тақырып.docx», 3-оқу мақсаты және т.б.).
 * №30 (БЖБ №4) және №31 (ТЖБ №2) — бақылау жұмыстары, тапсырмалары берілмеген, сондықтан көрсетілмейді.
 */
window.PHYS_OBJECTIVES = {
  '7.2.2.11': { kk: 'электронды, серіппелі, иінді таразылардың көмегімен дененің массасын өлшеу', ru: 'измерять массу тела с помощью электронных, пружинных и рычажных весов', en: 'measure the mass of a body using electronic, spring and lever balances' },
  '7.2.2.12': { kk: 'әртүрлі пішіндегі қатты дененің немесе сұйықтың көлемін өлшеу үшін өлшеуіш цилиндрді (мензурка) қолдану', ru: 'использовать измерительный цилиндр (мензурку) для измерения объёма твёрдого тела различной формы или жидкости', en: 'use a measuring cylinder to measure the volume of a liquid or of a solid of any shape' },
  '7.2.2.13': { kk: 'тығыздықтың физикалық мағынасын түсіндіру', ru: 'объяснять физический смысл плотности', en: 'explain the physical meaning of density' },
  '7.2.2.14': { kk: 'сұйықтар мен қатты денелердің тығыздығын тәжірибе арқылы анықтау', ru: 'определять плотность жидкостей и твёрдых тел опытным путём', en: 'determine the density of liquids and solids experimentally' },
  '7.1.3.3': { kk: 'физика кабинетінде қауіпсіздік ережелерін білу және сақтау', ru: 'знать и соблюдать правила техники безопасности в кабинете физики', en: 'know and follow safety rules in the physics laboratory' },
  '7.2.2.15': { kk: 'тығыздықтың формуласын есептер шығаруда қолдану', ru: 'применять формулу плотности при решении задач', en: 'apply the density formula when solving problems' },
  '7.2.2.1': { kk: 'инерция құбылысын түсіндіру және мысалдар келтіру', ru: 'объяснять явление инерции и приводить примеры', en: 'explain the phenomenon of inertia and give examples' },
  '7.2.2.2': { kk: 'күнделікті өмірден күштердің әрекет етуіне мысалдар келтіру', ru: 'приводить примеры действия сил из повседневной жизни', en: 'give examples of forces acting in everyday life' },
  '7.2.2.10': { kk: 'масса, салмақ және ауырлық күші ұғымдарын ажырату', ru: 'различать понятия массы, веса и силы тяжести', en: 'distinguish between the concepts of mass, weight and the force of gravity' },
  '7.2.2.4': { kk: 'серпімділік күшінің серіппенің ұзаруына тәуелділік графигінен қатаңдық коэффициентін анықтау', ru: 'определять коэффициент жёсткости по графику зависимости силы упругости от удлинения пружины', en: 'determine the stiffness coefficient from a graph of elastic force against spring extension' },
  '7.2.2.3': { kk: 'пластикалық және серпімді деформацияларды ажырату, мысалдар келтіру', ru: 'различать пластические и упругие деформации, приводить примеры', en: 'distinguish between plastic and elastic deformations, give examples' },
  '7.2.2.5': { kk: 'Гук заңының формуласы бойынша серпімділік күшін есептеу', ru: 'рассчитывать силу упругости по формуле закона Гука', en: "calculate the elastic force using the formula of Hooke's law" },
  '7.2.2.6': { kk: 'тыныштық, домалау және сырғанау үйкелістерін сипаттау', ru: 'описывать трение покоя, качения и скольжения', en: 'describe static, rolling and sliding friction' },
  '7.2.2.7': { kk: 'үйкеліс күшінің пайдасы мен зиянына мысалдар келтіру', ru: 'приводить примеры пользы и вреда силы трения', en: 'give examples of the benefits and harm of friction' },
  '7.2.2.8': { kk: 'күштерді берілген масштабта графикалық түрде көрсету', ru: 'изображать силы графически в заданном масштабе', en: 'represent forces graphically to a given scale' },
  '7.2.2.9': { kk: 'денеге бір түзудің бойымен әрекет ететін күштердің тең әрекетті күшінің модулі мен бағытын анықтау', ru: 'определять модуль и направление равнодействующей сил, действующих на тело вдоль одной прямой', en: 'determine the magnitude and direction of the resultant of forces acting on a body along one straight line' }
};

window.PHYS_SECTIONS = [
  {
    id: 's1', icon: 'scale',
    title: { kk: 'Тығыздық', ru: 'Плотность', en: 'Density' },
    lessons: [
      { no: 17, title: { kk: 'Масса және денелердің массасын өлшеу', ru: 'Масса и измерение массы тел', en: 'Mass and measuring the mass of bodies' },
        detail: { kk: 'Пр.№3 Электрондық және иіндік таразыларды қолданып, әр түрлі денелердің массасын анықтау', ru: 'Пр. №3 Определение массы различных тел с помощью электронных и рычажных весов', en: 'Practical work No. 3: finding the mass of different bodies with electronic and lever balances' },
        objectives: ['7.2.2.11'], groups: ['t1o1'] },
      { no: 18, title: { kk: 'Дұрыс және дұрыс емес пішінді денелердің көлемін өлшеу', ru: 'Измерение объёма тел правильной и неправильной формы', en: 'Measuring the volume of regular and irregular bodies' },
        objectives: ['7.2.2.12'], groups: ['t1o2'] },
      { no: 19, title: { kk: 'Заттың тығыздығы және тығыздықтың өлшем бірлігі', ru: 'Плотность вещества и единица плотности', en: 'Density of a substance and its unit' },
        detail: { kk: '№3 зертханалық жұмыс. «Сұйықтар мен қатты денелердің тығыздығын анықтау»', ru: 'Лабораторная работа №3 «Определение плотности жидкостей и твёрдых тел»', en: 'Lab work No. 3 “Determining the density of liquids and solids”' },
        objectives: ['7.2.2.13'], groups: ['t1o3'] },
      { no: 20, title: { kk: 'Тығыздықты есептеу', ru: 'Расчёт плотности', en: 'Calculating density' },
        objectives: ['7.2.2.15'], groups: ['t2o1'] }
    ]
  },
  {
    id: 's2', icon: 'forces',
    title: { kk: 'Денелердің өзара әрекеттесуі', ru: 'Взаимодействие тел', en: 'Interaction of bodies' },
    lessons: [
      { no: 21, title: { kk: 'Инерция құбылысы', ru: 'Явление инерции', en: 'The phenomenon of inertia' },
        objectives: ['7.2.2.1'], groups: ['t2o2'] },
      { no: 22, title: { kk: 'Күш', ru: 'Сила', en: 'Force' },
        objectives: ['7.2.2.2'], groups: ['t2o3'] },
      { no: 23, title: { kk: 'Тартылыс құбылысы және ауырлық күші. Салмақ', ru: 'Явление тяготения и сила тяжести. Вес', en: 'Gravitation and the force of gravity. Weight' },
        objectives: ['7.2.2.10'], groups: ['t3o1'], hideObjectives: true },
      { no: 25, title: { kk: 'Деформация', ru: 'Деформация', en: 'Deformation' },
        detail: { kk: 'Пр.№4 Түрлі денелердің созылуын зерттеу', ru: 'Пр. №4 Исследование растяжения различных тел', en: 'Practical work No. 4: investigating the stretching of different bodies' },
        objectives: ['7.2.2.3'], groups: ['t3o2'] },
      { no: 26, title: { kk: 'Серпімділік күші, Гук заңы', ru: 'Сила упругости, закон Гука', en: "Elastic force, Hooke's law" },
        objectives: ['7.2.2.5'], groups: ['t3o3'] },
      { no: 27, title: { kk: 'Сапалық және сандық есептер шығару', ru: 'Решение качественных и количественных задач', en: 'Solving qualitative and quantitative problems' },
        objectives: ['7.2.2.5'], groups: ['t4o1'] },
      { no: 28, title: { kk: 'Үйкеліс күші', ru: 'Сила трения', en: 'Friction' },
        detail: { kk: 'Үйкеліс әрекетін техникада ескеру. №5 зертханалық жұмыс. «Сырғанау үйкеліс күшін зерттеу»', ru: 'Учёт трения в технике. Лабораторная работа №5 «Исследование силы трения скольжения»', en: 'Friction in engineering. Lab work No. 5 “Investigating sliding friction”' },
        objectives: ['7.2.2.6', '7.2.2.7'], groups: ['t4o2', 't4o3'] },
      { no: 29, title: { kk: 'Бір түзу бойымен денеге әрекет еткен күштерді қосу', ru: 'Сложение сил, действующих на тело вдоль одной прямой', en: 'Adding forces acting on a body along one straight line' },
        objectives: ['7.2.2.8', '7.2.2.9'], groups: ['t4o4', 't4o5'] }
    ]
  }
];
