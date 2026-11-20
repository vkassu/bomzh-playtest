/* СОБРАНО из src/data/ скриптом build.js, не править руками — править части в src/data/ и запускать node build.js */
/* «Бомж» v0.1 — все числа баланса, таблицы и тексты. Логика — в game.js. */
var GAME_DATA = {
  version: '0.1',
  build: '20261120b',                         // правка 017: сборка игры — то же, что ?v= в index.html. Сохранение другой сборки молча выбрасывается

  /* ---------- Запись забега (правка 017) ----------
     Ядро ведёт хронологию забега (game.js, «запись забега»): приказы, дела, места, сон, встречные, мир, управление, предупреждения,
     снимки состояния. Формат одинаковый у браузера и у бота в Node; рассчитан на будущую отправку на сервер как есть. */
  record: {
    on: true,                                 // писать запись в браузере
    format: 'bomzh-rec', formatVersion: 1,
    snapEvery: 12,                            // с игрового времени между снимками состояния (и ещё снимок на каждом рассвете)
    lowAt: 25, rearm: 5,                      // событие «low» — шкала ниже lowAt; снова — когда поднялась выше lowAt + rearm (событие «ok»)
    keepRuns: 5,                              // сколько последних забегов хранить в памяти браузера; старые вытесняются
    flushSec: 3,                              // с реального времени между сбросами записи в память браузера (и ещё при уходе со страницы)
    chunk: 300,                               // событий в одном куске хранилища (переписывается только последний кусок)
    exportModes: ['off', 'end', 'daily'],     // выгрузка файлом: выключено / в конце забега / на каждом рассвете и в конце
    exportDefault: 'daily',
    keys: { index: 'bomzh.recIndex', run: 'bomzh.rec.', mode: 'bomzh.recExport', save: 'bomzh.save' },   // ключи localStorage
    /* строки журнала, которые попадают в запись отдельным событием: ключ журнала -> имя события */
    fromLog: {
      entranceEvicted: 'kicked', copKick: 'copKick', doorFollow: 'followIn', entranceLocked: 'locked', doorSlammed: 'slammed',
      entranceCop: 'copAtDoor', closed: 'closed', closedWalked: 'closed', itemGone: 'itemGone', invFullDrop: 'fullDrop', invFull: 'bagFull',
      copCome: 'copCome', grannyCome: 'grannyCome', dogPass: 'dogPass', binEmpty: 'binEmpty', nothingToSell: 'nothingToSell',
      noMoney: 'noMoney', noMoneyStall: 'noMoney', fireOut: 'fireOut', fireFed: 'fireFed', fireFedPaper: 'fireFed', notSleepy: 'notSleepy',
      noCardboard: 'noFuel', noFireNear: 'noFireNear', cantUseAsleep: 'asleepCant', cantPickAsleep: 'asleepCant', fullBagWalk: 'fullBagWalk'
    }
  },
  /* ---------- Сохранение (правка 017): один слот, раз в сутки на рассвете ---------- */
  save: {
    on: true,
    keepAfterDeath: false,                    // false — после смерти или победы слот стирается (переиграть неудачные сутки нельзя)
    formatVersion: 1
  },

  /* ---------- Время ---------- */
  /* Сутки (правка 016). Циферблат — 24 часа на 12 делениях (деление = 2 часа), полночь сверху.
     Свет и люди живут отдельно: светлая часть суток (dayDivisions) стоит вокруг полудня noonHour и к 7-м суткам сжимается
     с обоих концов — рассвет позже, закат раньше. Люди, заведения, автобус и мент живут по часам (schedule, places.*.hours), а не по солнцу.
     К темноте привязаны: погода дня/ночи, холод, ночной вид двора, фонари, окна, звук, счёт пережитых ночей. */
  time: {
    cycleSeconds: 540,                        // сутки, секунд игрового времени (было 300): 22,5 с на час
    divisions: 12,                            // делений на циферблате
    hoursPerDivision: 2,
    days: 7,                                  // суток до победы
    dayDivisions: [9, 8, 8, 7, 7, 6, 6],      // сутки -> сколько делений светлые (остальное — ночь)
    noonHour: 13,                             // середина светлого времени: 1-е сутки светло 4:00–22:00, 7-е — 7:00–19:00
    startHour: 6.5,                           // игра начинается в 6:30 первого дня — утро, двор просыпается
    paceRef: 300                              // длина суток, под которую писались «секундные» числа до правки 016 (для справки и тестов)
  },

  /* ---------- Скорость игры ---------- */
  speed: {
    options: [1, 2, 4],                       // кнопки ×1 ×2 ×4, клавиши 1/2/3
    initial: 1,
    resetTo: 1,
    resetEvents: ['statZero', 'copKick', 'evicted', 'wake'],   // события, сбрасывающие скорость
    maxSubstep: 0.1                           // макс. шаг логики, секунд игрового времени
  },

  /* ---------- Инвентарь ---------- */
  inventory: {
    slots: 6,
    maxSlots: 12,                             // больше мест не бывает, сколько карманов ни нашей
    name: 'Пакет',
    handlesMark: '+ручки'
  },

  /* ---------- Одежда: характеристики и слоты ----------
   * Вещи — в items (поле wear). Сумма по надетому:
   *   тепло    — каждое очко уменьшает потерю тепла на улице на warmthPerPoint (не больше warmthCap);
   *   непогода — каждое очко уменьшает поправку «ощущается как» от ветра и осадков на weatherPerPoint (не больше weatherCap);
   *   харизма  — каждое очко даёт charismaPerPoint к шансу подаяния (прохожие и бабка), отрицательная отнимает;
   *   карманы  — дополнительные места в пакете (всего не больше inventory.maxSlots).
   * Особые свойства (wear.special) — множители: patience (терпение жильцов), searchTime (время рытья в баке),
   * scrapsRisk (шанс отравиться объедками), walk (скорость ходьбы). */
  gear: {
    warmthPerPoint: 0.03, warmthCap: 0.6,
    weatherPerPoint: 0.10, weatherCap: 0.8,
    charismaPerPoint: 0.02,
    title: 'Надето',
    slots: [
      { id: 'head', name: 'голова' }, { id: 'neck', name: 'шея' }, { id: 'body', name: 'тело' }, { id: 'over', name: 'поверх' },
      { id: 'legs', name: 'штаны' }, { id: 'hands', name: 'руки' }, { id: 'feet', name: 'обувь' }
    ],
    /* порядок и подписи характеристик: вещей (первые четыре) и расходников */
    stats: {
      warmth: { name: 'тепло', emoji: '🔥' }, weather: { name: 'непогода', emoji: '☂' }, charisma: { name: 'харизма', emoji: '🙂' }, pockets: { name: 'карманы', emoji: '👝' },
      satiety: { name: 'сытость', emoji: '🍴' }, energy: { name: 'бодрость', emoji: '⚡' }, health: { name: 'здоровье', emoji: '❤' }, slots: { name: 'мест в пакете', emoji: '🛍' }
    },
    wearOrder: ['warmth', 'weather', 'charisma', 'pockets'],
    useOrder: ['satiety', 'warmth', 'energy', 'health'],
    special: {
      patience: 'жильцы терпят в подъезде в {m} раза дольше',
      searchTime: 'рытьё в баке на {p}% быстрее',
      scrapsRisk: 'шанс отравиться объедками ниже в {d} раза',
      walk: 'ходьба на {p}% быстрее'
    }
  },

  /* ---------- Звук (синтез в sound.js, файлов нет) ---------- */
  sound: {
    enabledByDefault: true,
    volume: 0.7,                              // громкость игрока по умолчанию (0–1)
    storageKey: 'bomzh.sound',
    master: 0.8, outputTrim: 0.7,             // общий уровень и запас после лимитера
    ambience: 1, sfx: 0.9,
    limiter: { threshold: -16, knee: 8, ratio: 12, attack: 0.003, release: 0.25 },
    layers: { wind: true, sleet: true, hum: true, fire: true, steps: true, events: true, ui: true },   // что звучит вообще
    wind: [                                   // по силе ветра: штиль / слабый / сильный
      { gain: 0.02, freq: 300, howl: 0, howlFreq: 520, gust: 2.6 },      // почти тишина, редкие далёкие порывы
      { gain: 0.11, freq: 460, howl: 0.012, howlFreq: 640, gust: 0.7 },  // ровный шелест
      { gain: 0.24, freq: 640, howl: 0.07, howlFreq: 800, gust: 0.9 }    // вой с порывами
    ],
    blizzard: { gainMult: 1.3, howlMult: 1.7 },                           // метель: плотнее и с подвыванием
    transitionSeconds: 2.5,                   // смена погоды — плавно
    day: { lowpass: 9000 },
    night: { lowpass: 5200, gainMult: 0.88 }, // ночью фон глуше и ниже
    indoor: { lowpass: 420, gainMult: 0.45 }, // в подъезде ветер за дверью
    pause: { ambienceMult: 0.5 },
    hum: { gain: 0.045, lowpass: 110 },       // городской гул днём
    sleet: { gain: 0.045, splatsPerSecond: 3 },
    fire: { gain: 0.06, farMult: 0.3, cracklesPerSecond: 9 },
    steps: { stride: 0.097, minInterval: 0.16 },    // шаг: логических единиц (было 0,062 доли ширины при скорости 0,17); не чаще раза в minInterval с (чтобы на ×4 не трещало)
    rummage: { minGap: 0.25, maxGap: 0.6, clankChance: 0.25 },
    minGap: { default: 0.09, step: 0.16, pop: 0.25, clink: 0.2, tin: 0.2, coins: 0.2, bill: 0.3, rustle: 0.2, clank: 0.4, crackle: 0.03, splat: 0.08, tick: 0.05, order: 0.12, deny: 0.3, bus: 2, thud: 0.3, alarm: 1, whistle: 1.5, beeps: 1 },
    unlimited: { crackle: true, splat: true },      // фоновые мелочи не занимают общий лимит
    maxPerSecond: 9,                          // событийных звуков в секунду, не больше
    bigMoney: 12,                             // подаяние от этой суммы шелестит купюрой
    ui: { onEmoji: '🔊', offEmoji: '🔇', title: 'Звук: вкл/выкл (M)' },
    map: {                                    // строка лога -> звуки ('money' = монеты или купюра по сумме)
      findBottle: ['pop', 'clink'], findCan: ['pop', 'tin'], findScraps: ['pop'], findCardboard: ['pop', 'paper'], findNewspaper: ['pop', 'paper'],
      binEmpty: ['thud'], sellBottle: ['clink', 'coins'], sellCan: ['tin', 'coins'], sellDone: ['register'],
      begOk_student: ['money'], begOk_worker: ['money'], begOk_coat: ['money'], begOk_fat: ['money'], begOk_drunk: ['money'], grannyMoney: ['money'], grannyFood: ['pop'],
      begNo_student: ['deny'], begNo_worker: ['deny'], begNo_coat: ['deny'], begNo_fat: ['deny'], begNo_drunk: ['deny'], trashDump: ['thud'], begNoWeather: ['deny'], npcGone: ['deny'],
      busCome: ['bus'], busGo: ['bus'], busMissed: ['deny'], doorFollow: ['pop'], doorSlammed: ['thud', 'beeps'], grannySit: ['paper'], grannySitNear: ['paper'],
      eatScraps: ['munch'], eatScrapsBad: ['munch', 'deny'], eatShawarma: ['munch'], drinkVodka: ['glug'], eatBread: ['munch'], eatNoodles: ['munch'], drinkTea: ['glug'], drinkCoffee: ['glug'],
      buyGear: ['register', 'rustle'], buyHandles: ['register', 'rustle'], noMoneyStall: ['deny'], wearOn: ['rustle'], wearOff: ['rustle'], wearSwap: ['rustle'], paperRead: ['paper'], paperAlready: ['deny'], paperNoNews: ['paper'], grannyNo: ['deny'],
      buy: ['register'], noMoney: ['deny'], invFull: ['thud'], invFullDrop: ['thud'], pickUp: ['pop'], putDown: ['paper'],
      closed: ['deny'], closedWalked: ['deny'], nothingToSell: ['deny'], noCardboard: ['deny'], noFireNear: ['deny'], cantUseAsleep: ['deny'], cantPickAsleep: ['deny'], notSleepy: ['deny'],
      copCome: ['whistle'], copKick: ['thud', 'whistle'], entranceCop: ['deny'], entranceLocked: ['beeps'], entranceLockSet: ['beeps'], entranceEvicted: ['thud', 'beeps'],
      sleepStart: ['sleep'], wake: ['wake'], wakeFull: ['wake'], wakeAlarm: ['wake'],
      dayStart: ['chimeDay'], nightStart: ['chimeNight'], phase_morning: ['chimeDay'], starving: ['alarm'], freezing: ['alarm'], exhausted: ['alarm'],
      warnCold: ['alarm'], warnHunger: ['deny'], warnSleep: ['deny'], warnHealth: ['deny'],
      fireCraft: ['strike'], fireLit: ['whoosh'], fireFed: ['paper', 'whoosh'], fireFedPaper: ['paper', 'whoosh'], fireOut: ['hiss'], dogEat: ['munch']
    }
  },

  /* ---------- Погода ----------
   * Своя на каждый день и каждую ночь, выбирается при смене времени суток.
   * «Ощущается как» = температура − поправка на ветер − поправка на осадки.
   * Потеря тепла на улице, ед./с = max(loss.min, (loss.zeroAt − ощущается) × loss.perDegree).
   * На лавке потеря ×2 (places.bench.warmthDrainMultiplier), в подъезде — places.entrance.indoorLoss.
   * Теплотрасса греет warmthPerSecond × pipeFactor ветра. Костёр расходует время горения × fireBurn ветра × fireBurn осадков. */
  weather: {
    phases: [                                 // температура воздуха, °C: среднее ± разброс (треугольное распределение)
      { mean: 1, spread: 3 }, { mean: -5, spread: 4 },       // сутки 1: день, ночь
      { mean: 0, spread: 3 }, { mean: -6, spread: 5 },       // сутки 2
      { mean: -1, spread: 4 }, { mean: -8, spread: 5 },      // сутки 3
      { mean: -2, spread: 4 }, { mean: -9, spread: 6 },      // сутки 4
      { mean: -4, spread: 4 }, { mean: -11, spread: 6 },     // сутки 5
      { mean: -5, spread: 5 }, { mean: -13, spread: 7 },     // сутки 6
      { mean: -7, spread: 5 }, { mean: -15, spread: 7 }      // сутки 7
    ],
    winds: [
      { id: 'calm', name: 'штиль', msMin: 0, msMax: 1, chill: 0, pipeFactor: 1, fireBurn: 1 },
      { id: 'light', name: 'слабый ветер', msMin: 4, msMax: 7, chill: 5, pipeFactor: 0.6, fireBurn: 1.3 },
      { id: 'strong', name: 'сильный ветер', msMin: 10, msMax: 16, chill: 12, pipeFactor: 0.25, fireBurn: 1.8 }
    ],
    windChanceDay: [0.5, 0.33, 0.17],         // штиль / слабый / сильный
    windChanceNight: [0.35, 0.3, 0.35],
    precips: [
      { id: 'none', name: 'без осадков', chill: 0, fireBurn: 1 },
      { id: 'snow', name: 'снег', chill: 1, fireBurn: 1.1 },
      { id: 'sleet', name: 'мокрый снег', chill: 4, fireBurn: 1.4 }
    ],
    precipChance: [0.4, 0.4, 0.2],            // нет / снег / мокрый снег
    loss: { zeroAt: 8, perDegree: 0.025, min: 0.028 },   // правка 016: сутки ×1,8 — потеря в секунду /1,8, за сутки та же (было 0,045 и 0,05)
    frostFeels: -24,
    /* Прогноз из газеты: погода на две фазы вперёд заготовлена заранее (S.weatherAhead). Газета врёт в меру:
       температура ± tempError, ветер и осадки с шансом windMiss / precipMiss съезжают на соседнюю строку. */
    forecast: { tempError: 2, windMiss: 0.2, precipMiss: 0.2 },
    labels: { wind: '{name}, {ms} м/с', feels: 'ощущается как {f}' },                          // «ощущается» не выше — это уже «мороз»
    types: {                                  // тип погоды для значка, подписи и лога
      calm: { name: 'Тихо', emoji: '🌙' },
      calmday: { name: 'Ясно', emoji: '🌤' },         // значок тихой погоды днём (тип погоды тот же — calm)
      windy: { name: 'Ветрено', emoji: '💨' },
      snow: { name: 'Снег', emoji: '🌨' },
      sleet: { name: 'Мокрый снег', emoji: '🌧' },
      frost: { name: 'Мороз', emoji: '🥶' },
      blizzard: { name: 'Метель', emoji: '🌪' }
    },
    captions: {
      calm: ['Погода шепчет: «займи и выпей»', 'Тихо. Даже холод сегодня без энтузиазма', 'Ясно. Видно всё, включая перспективы'],
      windy: ['Ветер перемен. Меняет в основном температуру', 'Дует. Двор продувается бесплатно', 'Сквозняк размером с город'],
      snow: ['Снежок. Красиво, если смотреть из окна', 'Идёт снег. Ему-то есть куда идти', 'Снег бесплатно. Берите, пока дают'],
      sleet: ['Мокрый снег: дождь, который не определился', 'Сыро, как в подвале, только без подвала', 'С неба падает каша. Несъедобная'],
      frost: ['Мороз. Сопли звенят', 'Минус такой, что водка задумалась', 'Холод собачий. Собака не согласна — ей тоже холодно'],
      blizzard: ['Метель. Синоптики советуют иметь дом', 'Метёт так, что мент не выйдет. Шутка, выйдет', 'Метель. Природа выселяет без суда']
    }
  },

  /* ---------- Герой ---------- */
  hero: {
    emoji: '🧔',
    name: 'Бомж',
    start: { satiety: 60, warmth: 70, health: 80, energy: 80 },
    max: 100,
    lowThreshold: 25,                         // ниже — шкала краснеет
    /* Правка 016: сутки 540 с вместо 300 (×1,8). Расходы и сон растянуты вместе с сутками — за сутки уходит столько же;
       аварийные таймеры «шкала в нуле» оставлены в секундах: время на реакцию — человеческое, а не суточное. */
    satietyDrainInterval: 7.2,                // сытость −1 каждые N с (было 4)
    starveHealthInterval: 2,                  // при сытости 0: здоровье −1 каждые N с
    freezeHealthInterval: 1,                  // при тепле 0: здоровье −1 каждые N с
    energyDrainInterval: 7.2,                 // не спит: бодрость −1 каждые N с (было 4)
    energyGainInterval: 1.8,                  // спит: бодрость +1 каждые N с (было 1)
    tiredThreshold: 25,                       // ниже — дела героя идут дольше
    tiredTaskMultiplier: 1.5,                 // во сколько раз дольше
    exhaustHealthInterval: 2,                 // при бодрости 0: здоровье −1 каждые N с
    sleepEmoji: '💤',
    sleepName: 'Спит',
    startPos: { x: 0.5, y: 0.68 },
    /* Ходьба. Позиции — доли поля (x — от ширины, y — от высоты), а РАССТОЯНИЯ и СКОРОСТИ — в «логических единицах»:
       1 единица = высота поля, ширина = layout.logicalAspect единиц. Так шаг в любую сторону даёт одинаковое число
       пикселей в секунду, а симуляция в Node не зависит от размера окна. Скорость — единиц в секунду. */
    walk: {
      speed: 0.25,                            // базовая скорость героя, единиц/с (≈ 243 px/с на поле 1920×972 в любую сторону). Подобрана по двум меркам: среднее время в пути между местами (+7% к прежнему, диагональ двора 8,9 с против 8,3) и время ходьбы ботов за сутки (56 с против 58 с прежних): боты чаще всего ходят бак ↔ приёмка, а этот путь в старой геометрии был медленнее среднего
      heroMult: 1,                            // множитель героя (для будущих разных героев)
      tiredFactor: 0.7,                       // бодрость ниже tiredThreshold
      fullBagFactor: 0.8,                     // пакет полон
      reach: 0.084,                           // дотянуться до предмета или встречного (клавиша действия), единиц
      reachPlace: 0.112,                      // до места, единиц
      besideNpc: 0.056,                       // где встаёт рядом со встречным, единиц
      besideFire: { x: -0.035, y: 0.02 },     // где встаёт у костра
      fireOffset: { x: 0.035, y: 0.01 },      // где разгорается костёр относительно ног
      dropOffset: { x: -0.02, y: 0.04 },      // куда падает выложенное из пакета
      longWalk: 0.77,                         // «через весь двор», единиц — для шутки про полный пакет
      actionKey: 'E',
      labelGo: 'идёт: {name}',
      labelGoPoint: 'идёт',
      pickLabel: 'подобрать',
      talkLabel: 'попросить'
    }
  },

  /* ---------- Места (координаты — доли поля) ---------- */
  places: {
    bin: {
      emoji: '🗑', name: 'Мусорный бак', action: 'рыться', x: 0.91, y: 0.27,
      searchSeconds: 10,
      autoRepeat: true,                       // после находки герой сам начинает следующий поиск
      /* Правка 016: бак наполняют жильцы. Утром — немного «само» (дворник, ночные гости: schedule, binAdd утра), основное — вечерние выносы
         мусора (walkers.trash, schedule.evening.trash). Было: каждое утро ровно 6. Стало: старт 5, утром +1, вечером 3–4 выноса по 1–2 — около 6,3 за сутки. */
      stock: 5,                               // предметов в баке на старте (утро 1-го дня)
      max: 12,                                // больше в бак не влезает
      loot: [                                 // что лежит «само» (утреннее и стартовое); у выносов — своя таблица walkers.trash.loot
        { type: 'bottle', chance: 0.37 },
        { type: 'can', chance: 0.23 },
        { type: 'scraps', chance: 0.18 },
        { type: 'cardboard', chance: 0.12 },
        { type: 'newspaper', chance: 0.10 }
      ],
      /* Правка 022: пока лежбище не достроено, бак щедрее на строительное (картон, газеты, тряпьё, доски, плёнка: 58% против 22%).
         Достроил — бак возвращается к таблице loot: бутылки снова в почёте. */
      lootDen: [
        { type: 'bottle', chance: 0.19 },
        { type: 'can', chance: 0.11 },
        { type: 'scraps', chance: 0.12 },
        { type: 'cardboard', chance: 0.16 },
        { type: 'newspaper', chance: 0.12 },
        { type: 'rags', chance: 0.09 },
        { type: 'boards', chance: 0.13 },
        { type: 'film', chance: 0.08 }
      ]
    },
    entrance: {
      emoji: '🚪', name: 'Подъезд', action: 'войти', x: 0.46, y: 0.22,
      warmthPerSecond: 1.1,                   // правка 016: тепло в секунду /1,8, терпение и домофон ×1,8 — за заход столько же тепла (было 2)
      indoorLoss: 0,                          // потеря тепла внутри: ветер и осадки не достают
      lockMin: 126, lockMax: 216,             // после выгона жильцы запираются на домофон, с (было 70–120)
      patienceMin: 38, patienceMax: 88,       // сколько жильцы терпят героя внутри (с): случайно при каждом входе, потом выставляют (без урона) и запираются (было 21–49)
      patienceRecover: 0.22,                  // пока герой снаружи, терпение возвращается: с терпения за 1 с (было 0,4)
      moodCalmAbove: 0.55,                    // доля оставшегося терпения: выше — «спокойно»
      moodEdgeBelow: 0.2                      // ниже — «сейчас выставят»; между — «косятся»
    },
    bench: {
      emoji: '🪑', name: 'Лавка', action: 'лечь', x: 0.575, y: 0.27,      // у подъезда, справа от двери: тут сидят бабки
      healthInterval: 3,                      // здоровье +1 каждые N с
      warmthDrainMultiplier: 2,
      fireCancelsPenalty: true                // у костра штраф лавки к теплу не действует
    },
    pipe: {
      emoji: '♨️', name: 'Теплотрасса', action: 'греться', x: 0.09, y: 0.5,
      warmthPerSecond: 0.55                   // было 1 (сутки ×1,8)
    },
    /* Правка 022: лаз между плитами теплотрассы. Обустраивается по ступеням (раздел den ниже): клик — встать у лаза и,
       если в пакете есть всё на следующую ступень, строить; построенное греет и укрывает. */
    den: {
      emoji: '🕳', name: 'Лежбище', action: 'обустроить', x: 0.09, y: 0.715,
      autoRepeat: true                        // достроил ступень, а на следующую уже всё есть — строит дальше сам
    },
    kiosk: {
      emoji: '🏪', name: 'Ларёк', action: 'купить', x: 0.3, y: 0.8,
      /* Часы работы (правка 016), часы суток: [открывается, закрывается]; закрытие раньше открытия — работает через полночь */
      hours: [8, 2],                          // с 8 утра до 2 ночи: закрыт только глубокой ночью
      browseSeconds: 3,
      goods: [
        { type: 'tea', price: 4 },
        { type: 'coffee', price: 5 },
        { type: 'bread', price: 8 },
        { type: 'noodles', price: 12 },
        { type: 'vodka', price: 20 },
        { type: 'shawarma', price: 25 },
        { type: 'matches', price: 10 },
        { type: 'handles', price: 45 }           // пакет с ручками: покупается один раз (items.handles.once)
      ]
    },
    stall: {
      emoji: '⛺', name: 'Одёжная палатка', action: 'прицениться', x: 0.5, y: 0.5,
      hours: [10, 18],                        // торгует днём, к вечеру сворачивается
      browseSeconds: 3,
      title: 'Одёжная палатка «Вторые руки»',
      goods: [
        { type: 'hat', price: 25 }, { type: 'ushanka', price: 60 }, { type: 'scarf', price: 35 },
        { type: 'jacket', price: 70 }, { type: 'vatnik', price: 90 }, { type: 'coatGood', price: 120 },
        { type: 'raincoat', price: 45 }, { type: 'trackpants', price: 25 }, { type: 'jeans', price: 50 },
        { type: 'gloves', price: 30 }, { type: 'workGloves', price: 40 }, { type: 'sneakers', price: 60 }
      ]
    },
    recycle: {
      emoji: '♻️', name: 'Приёмка стеклотары', action: 'сдать тару', x: 0.7, y: 0.8,
      hours: [7, 16],                         // открывается раньше всех и закрывается раньше всех: до вечернего наплыва
      processSeconds: 5,                      // герой сдаёт одну тару из пакета за N с
      autoRepeat: true,                       // сдаёт по одной, пока тара в пакете не кончится
      prices: { bottle: 5, can: 3 }
    }
  },

  /* ---------- Лежбище у теплотрассы (правка 022) ----------
   * Ступени строятся по порядку. need — варианты (хватит любого): { тип: сколько }; 'a|b' — любой из типов, в сумме. seconds — сколько строить.
   * Тепло в лежбище (пока стоишь или спишь у лаза, как у трубы): погода студит × lossMult; труба греет gain × ветер трубы
   * (windproof — ветер не мешает); во сне ещё + sleepGain (утепление держит тепло тела). Ступень без своих чисел берёт их у предыдущей.
   * Сравнение (ночь, ощущается −10, штиль / ощущается −20, сильный ветер): труба +0,10 / −0,56; подъезд +1,10 всегда, но выгоняют;
   * подстилка во сне +0,43 / −0,25; утепление +0,99 / +0,27; заслон +1,24 / +1,18. Стоя без сна заслон даёт +0,89 — греться днём всё равно в подъезд. */
  den: {
    stages: [
      { id: 'bed', name: 'Подстилка', need: [{ cardboard: 1 }], seconds: 8, lossMult: 0.6, gain: 0.7, sleepGain: 0 },
      { id: 'warm', name: 'Утепление', need: [{ 'newspaper|rags': 2 }], seconds: 10, lossMult: 0.35, gain: 0.85, sleepGain: 0.3 },
      { id: 'wind', name: 'Заслон от ветра', need: [{ boards: 2 }, { film: 1 }], seconds: 12, lossMult: 0.25, gain: 1, sleepGain: 0.35, windproof: true },
      { id: 'stash', name: 'Заначка', need: [{ cardboard: 1, rags: 1 }], seconds: 8, stash: 4 }
    ],
    goal: { text: 'Обустроить лежбище', title: 'Цель', next: 'дальше: {name} — {need}', done: 'обустроено. Ипотека закрыта', or: ' или ' },
    stashTitle: 'Заначка',
    stashHint: 'Перетащи вещь из пакета сюда. Клик — забрать',
    stashEmpty: 'пусто'
  },

  /* ---------- Предметы ---------- */
  items: {
    bottle: { emoji: '🍾', name: 'Бутылка', acc: 'бутылку' },
    can: { emoji: '🥫', name: 'Банка', acc: 'банку' },
    scraps: {
      emoji: '🍞', name: 'Объедки', acc: 'объедки', food: true,
      use: { seconds: 3, satiety: 20, riskChance: 0.30, riskHealth: 10 }
    },
    /* short — подпись в пакете, если полное имя не влезает */
    cardboard: { emoji: '📦', name: 'Картон', acc: 'картон', burn: 162 },        // burn — сколько секунд горит, если подкинуть в костёр (было 90; сутки ×1,8)
    /* правка 022: строительное для лежбища. Тряпьё горит (плохо), доски сырые и в костёр не идут, плёнку жечь — себе дороже */
    rags: { emoji: '🧦', name: 'Тряпьё', acc: 'тряпьё', burn: 18 },
    boards: { emoji: '🪵', name: 'Доски', acc: 'доски' },
    film: { emoji: '🧻', name: 'Плёнка', acc: 'плёнку' },
    newspaper: { emoji: '📰', name: 'Газета', acc: 'газету', readName: 'Газета (прочитана)', readAcc: 'прочитанную газету', burn: 27 },
    shawarma: {
      emoji: '🌯', name: 'Шаурма', acc: 'шаурму', food: true,
      use: { seconds: 3, satiety: 50, warmth: 5, health: 3 }
    },
    tea: { emoji: '🍵', name: 'Горячий чай', acc: 'горячий чай', short: 'Чай', use: { seconds: 3, warmth: 12, health: 2 } },
    coffee: { emoji: '☕', name: 'Кофе «три в одном»', acc: 'кофе «три в одном»', short: 'Кофе', use: { seconds: 3, satiety: 3, warmth: 5, energy: 15 } },
    bread: { emoji: '🍞', name: 'Хлеб', acc: 'хлеб', food: true, use: { seconds: 3, satiety: 15 } },
    noodles: { emoji: '🍜', name: 'Лапша', acc: 'лапшу', food: true, use: { seconds: 3, satiety: 25, warmth: 5 } },
    handles: { emoji: '🛍', name: 'Пакет с ручками', acc: 'пакет с ручками', once: true, bagSlots: 2 },   // не предмет: +bagSlots мест в пакете навсегда
    /* одежда: wear = слот + характеристики (нули не пишем и не показываем) + особые свойства-множители */
    hat: { emoji: '🧶', name: 'Вязаная шапка', acc: 'вязаную шапку', short: 'Шапка', wear: { slot: 'head', warmth: 2, weather: 1 } },
    ushanka: { emoji: '🪖', name: 'Ушанка', acc: 'ушанку', wear: { slot: 'head', warmth: 5, weather: 2, charisma: -1 } },
    scarf: { emoji: '🧣', name: 'Старый шарф', acc: 'старый шарф', short: 'Шарф', wear: { slot: 'neck', warmth: 3, weather: 1, charisma: 1 } },
    jacket: { emoji: '🤵', name: 'Пиджак с чужого плеча', acc: 'пиджак с чужого плеча', short: 'Пиджак', wear: { slot: 'body', warmth: 1, charisma: 5, pockets: 2 } },
    vatnik: { emoji: '🧥', name: 'Телогрейка', acc: 'телогрейку', short: 'Ватник', wear: { slot: 'body', warmth: 8, weather: 1, charisma: -3, pockets: 1 } },
    coatGood: { emoji: '🧥', name: 'Приличное пальто', acc: 'приличное пальто', short: 'Пальто', wear: { slot: 'body', warmth: 5, weather: 2, charisma: 4, pockets: 2, special: { patience: 1.5 } } },
    raincoat: { emoji: '☔', name: 'Дождевик', acc: 'дождевик', wear: { slot: 'over', weather: 5, charisma: -1 } },
    trackpants: { emoji: '🩳', name: 'Треники', acc: 'треники', wear: { slot: 'legs', warmth: 1, charisma: -1, pockets: 1 } },
    jeans: { emoji: '👖', name: 'Джинсы', acc: 'джинсы', wear: { slot: 'legs', warmth: 2, charisma: 1, pockets: 2 } },
    gloves: { emoji: '🧤', name: 'Вязаные перчатки', acc: 'вязаные перчатки', short: 'Перчатки', wear: { slot: 'hands', warmth: 2 } },
    workGloves: { emoji: '🧤', name: 'Хозяйственные перчатки', acc: 'хозяйственные перчатки', short: 'Хозперчатки', wear: { slot: 'hands', charisma: -1, special: { searchTime: 0.75, scrapsRisk: 0.5 } } },
    sneakers: { emoji: '👟', name: 'Кроссовки', acc: 'кроссовки', wear: { slot: 'feet', charisma: 1, special: { walk: 1.1 } } },
    vodka: {
      emoji: '🥃', name: 'Чекушка', acc: 'чекушку',
      use: { seconds: 3, warmth: 40, health: -10 }
    },
    matches: { emoji: '🧨', name: 'Спички', acc: 'спички' },
    fire: { emoji: '🔥', name: 'Костёр', acc: 'костёр' }
  },

  /* ---------- Костёр ---------- */
  fire: {
    craftSeconds: 5,
    burnSeconds: 216,                         // костёр, разожжённый картоном (топливо с burn = burnRef); правка 016: ×1,8 вместе с сутками (было 120)
    burnRef: 162,                             // розжиг другим топливом: burnSeconds × burn / burnRef (газета — 36 с)
    feedSeconds: 1,                           // сколько секунд подкидывается одна штука; прибавка к горению — items.<топливо>.burn
    warmthPerSecond: 1.65,                    // было 3: тепла с одного картона за весь костёр — столько же
    radiusX: 0.085,                           // радиус тепла: доли ширины и высоты поля
    radiusY: 0.17
  },

  /* ---------- Встречные ---------- */
  npcs: {
    passerby: {
      emoji: '🚶', name: 'Прохожий',
      talkSeconds: 5,
      /* Типы прохожих. weight — как часто встречается; giveChance — шанс подаяния в тихую погоду.
         Средний доход с одной просьбы в тихую погоду ≈ 3,8 ₽ (до правки было 0,40 × 10 = 4 ₽). */
      kinds: {                                // speedMin/speedMax — доля базовой скорости героя (hero.walk.speed), своя у каждого человека
        student: { emoji: '🧑‍🎓', name: 'Студент', weight: 0.38, giveChance: 0.65, moneyMin: 2, moneyMax: 6, speedMin: 0.55, speedMax: 0.65 },     // бодро, под музыку
        worker: { emoji: '👷', name: 'Работяга', weight: 0.30, giveChance: 0.45, moneyMin: 6, moneyMax: 14, speedMin: 0.40, speedMax: 0.50 },      // идёт с работы, никуда не спешит
        coat: { emoji: '🕴', name: 'Мужик в пальто', weight: 0.17, giveChance: 0.15, moneyMin: 30, moneyMax: 50, speedMin: 0.60, speedMax: 0.70 }, // деловой, спешит
        fat: { emoji: '🧍‍♂️', name: 'Толстяк', weight: 0.15, giveChance: 0.40, moneyMin: 4, moneyMax: 10, speedMin: 0.27, speedMax: 0.33 },         // идёт вразвалочку, подаёт средне
        /* Правка 016: ночной прохожий. Медленный, качается (sway — только вид, на логику не влияет), подаёт чаще дневных,
           а сумма — лотерея по таблице money: то мелочь, то купюра. weight здесь не используется: кто ходит — решает расписание (schedule.*.kinds). */
        drunk: { emoji: '🥴', name: 'Подвыпивший', weight: 0, giveChance: 0.65, speedMin: 0.22, speedMax: 0.30, sway: 0.010,
          money: [{ weight: 0.55, min: 1, max: 4 }, { weight: 0.33, min: 6, max: 15 }, { weight: 0.12, min: 30, max: 80 }] }
      }
    },
    granny: {
      emoji: '👵', name: 'Бабка',
      talkSeconds: 5,
      scrapsChance: 0.5,
      money: 10,
      appearPhase: 'day',                     // правка 016: выходит в фазе «день» расписания (schedule), раз в сутки
      appearFrom: 0.05, appearTo: 0.6,        // окно появления: доли длины этой фазы
      speedFactor: 0.293,                     // доля базовой скорости героя (до лавки у подъезда ей теперь два шага — около 3 с)
      sitMin: 60, sitMax: 90,                 // сколько сидит на лавке, с (было 40–60: сутки длиннее)
      path: [                                 // подъезд -> лавка у подъезда (садится с краю) -> подъезд
        { x: 0.46, y: 0.262, door: 'out' }, { x: 0.5, y: 0.305 }, { x: 0.549, y: 0.258, sit: true }, { x: 0.5, y: 0.305 }, { x: 0.46, y: 0.262, door: 'in' }
      ]
    },
    cop: {
      emoji: '👮', name: 'Мент',
      /* интервал обходов — в расписании (schedule, поле cop каждой фазы): днём и утром мента нет, поздним вечером реже, ночью чаще */
      crossSeconds: 12,                       // за сколько пересёк бы двор без остановки
      kickDamage: 5,
      kickRange: 0.05,                        // доля ширины поля вокруг подъезда
      lingerMin: 10, lingerMax: 20,           // сколько стоит у двери подъезда, с
      stopOffset: 0.05,                       // где встаёт относительно двери (доля ширины поля)
      y: 0.34
    },
    dog: {
      emoji: '🐕', name: 'Собака',
      perDayMin: 1, perDayMax: 2,             // раз в сутки
      speed: 0.355,                           // логических единиц в секунду (было 230 px/с на поле 1280×720)
      eatSeconds: 1,
      yMin: 0.42, yMax: 0.7
    }
  },

  /* ---------- Живые прохожие: маршруты, скорость, погода, автобус ----------
   * Координаты — доли поля. Маршрут — список точек; идут по отрезкам, без поиска пути.
   * Точка может иметь: wait: [мин, макс] — постоять (у ларька «покупает»), bus: true — ждать автобус, dump: true — выбросить мусор в бак.
   * Последняя точка — выход: край двора (за экраном), дверь подъезда или автобус.
   * Правка 016: какие маршруты работают и как часто — решает расписание (schedule, поле routes фазы), а не флаг night.
   * needs: 'kiosk' — маршрут идёт к заведению и не запускается, пока оно закрыто (places.*.hours). */
  walkers: {
    laneJitter: 0.012,                        // разброс по вертикали, чтобы не шли в затылок
    maxAlive: 11,                             // больше во дворе не бывает (было 7): утренняя очередь и вечерняя высадка — событие, но не толпа
    /* Частота появления с краёв и из подъезда — в расписании (schedule.*.spawn). Пассажиры автобуса и жильцы с мусором — сверх неё. */
    contact: 0.063,                           // на каком расстоянии герой «догнал» и заговорил, логических единиц
    lookAhead: 60, lookStep: 0.25,            // прогноз перехвата: горизонт и шаг, с
    street: { sidewalkTop: 0.862, roadTop: 0.915, lamps: [0.1, 0.405, 0.6, 0.9], lampY: 0.9 },   // тротуар — полоса между двором и дорогой (для отрисовки); lamps — фонари вдоль дороги (доли ширины), lampY — где стоит столб
    /* Дверь подъезда. door: 'in' на точке маршрута — человек подходит, ищет ключи (inWait с) и только потом заходит;
       door: 'out' — выходит и секунду-две стоит в дверях (outWait). Пока дверь «открыта» (после захода или выхода кого-то,
       openMin–openMax с, около 5) герой может зайти следом, даже если после выгона подъезд заперт на домофон. Мент у двери не пускает. */
    door: { inWait: [3, 5], outWait: [1, 2], openMin: 4.5, openMax: 5.5 },
    routes: [
      { id: 'streetLR', path: [{ x: -0.05, y: 0.887 }, { x: 1.05, y: 0.887 }] },
      { id: 'streetRL', path: [{ x: 1.05, y: 0.887 }, { x: -0.05, y: 0.887 }] },
      { id: 'doorOutL', path: [{ x: 0.46, y: 0.262, door: 'out' }, { x: 0.4, y: 0.33 }, { x: -0.05, y: 0.37 }] },       // жилец уходит пешком за край двора
      { id: 'doorOutR', path: [{ x: 0.46, y: 0.262, door: 'out' }, { x: 0.55, y: 0.33 }, { x: 1.05, y: 0.4 }] },
      { id: 'homeL', path: [{ x: -0.05, y: 0.37 }, { x: 0.4, y: 0.33 }, { x: 0.46, y: 0.262, door: 'in' }] },          // пешком домой с края двора
      { id: 'homeR', path: [{ x: 1.05, y: 0.4 }, { x: 0.55, y: 0.33 }, { x: 0.46, y: 0.262, door: 'in' }] },
      { id: 'kioskL', needs: 'kiosk', path: [{ x: -0.05, y: 0.887 }, { x: 0.2, y: 0.887 }, { x: 0.352, y: 0.846, wait: [5, 9], face: -1 }, { x: 0.2, y: 0.887 }, { x: -0.05, y: 0.887 }] },
      { id: 'kioskR', needs: 'kiosk', path: [{ x: 1.05, y: 0.887 }, { x: 0.4, y: 0.887 }, { x: 0.352, y: 0.846, wait: [5, 9], face: -1 }, { x: 0.4, y: 0.887 }, { x: 1.05, y: 0.887 }] },
      { id: 'kioskHome', needs: 'kiosk', path: [{ x: 0.46, y: 0.262, door: 'out' }, { x: 0.41, y: 0.4 }, { x: 0.352, y: 0.846, wait: [5, 9], face: -1 }, { x: 0.41, y: 0.4 }, { x: 0.46, y: 0.262, door: 'in' }] },
      /* вечером по дороге домой — в ларёк, потом в подъезд */
      { id: 'kioskHomeL', needs: 'kiosk', path: [{ x: -0.05, y: 0.887 }, { x: 0.2, y: 0.887 }, { x: 0.352, y: 0.846, wait: [5, 9], face: -1 }, { x: 0.41, y: 0.6 }, { x: 0.41, y: 0.4 }, { x: 0.46, y: 0.262, door: 'in' }] },
      { id: 'kioskHomeR', needs: 'kiosk', path: [{ x: 1.05, y: 0.887 }, { x: 0.4, y: 0.887 }, { x: 0.352, y: 0.846, wait: [5, 9], face: -1 }, { x: 0.41, y: 0.6 }, { x: 0.41, y: 0.4 }, { x: 0.46, y: 0.262, door: 'in' }] },
      /* покупатель у одёжной палатки: стоит, щупает товар, уходит */
      { id: 'stallL', needs: 'stall', path: [{ x: -0.05, y: 0.62 }, { x: 0.3, y: 0.6 }, { x: 0.452, y: 0.535, wait: [6, 11], face: 1 }, { x: 0.62, y: 0.63 }, { x: 1.05, y: 0.64 }] },
      { id: 'stallHome', needs: 'stall', path: [{ x: 0.46, y: 0.262, door: 'out' }, { x: 0.42, y: 0.42 }, { x: 0.452, y: 0.535, wait: [6, 11], face: 1 }, { x: 0.42, y: 0.42 }, { x: 0.46, y: 0.262, door: 'in' }] },
      { id: 'busL', path: [{ x: -0.05, y: 0.887 }, { x: 0.5, y: 0.887, bus: true }] },
      { id: 'busR', path: [{ x: 1.05, y: 0.887 }, { x: 0.5, y: 0.887, bus: true }] },
      { id: 'busHome', path: [{ x: 0.46, y: 0.262, door: 'out' }, { x: 0.42, y: 0.45 }, { x: 0.44, y: 0.8 }, { x: 0.5, y: 0.887, bus: true }] },   // жилец из подъезда — на остановку
      /* ночные: подвыпивший бродит по двору, стоит, думает о вечном; или идёт домой «на автопилоте» */
      { id: 'drunkYard', path: [{ x: -0.05, y: 0.6 }, { x: 0.28, y: 0.56 }, { x: 0.62, y: 0.42, wait: [4, 8] }, { x: 0.8, y: 0.55 }, { x: 1.05, y: 0.52 }] },
      { id: 'drunkHome', path: [{ x: 1.05, y: 0.62 }, { x: 0.7, y: 0.6 }, { x: 0.55, y: 0.4 }, { x: 0.46, y: 0.262, door: 'in' }] },
      /* вынос мусора: из подъезда к баку, выбросить, обратно (запускает расписание — schedule.*.trash) */
      { id: 'trash', trash: true, path: [{ x: 0.46, y: 0.262, door: 'out' }, { x: 0.55, y: 0.33 }, { x: 0.865, y: 0.315, wait: [2, 3], face: 1, dump: true }, { x: 0.55, y: 0.33 }, { x: 0.46, y: 0.262, door: 'in' }] }
    ],
    /* Куда расходятся пассажиры, вышедшие из автобуса (первая точка — у дверей автобуса, x подставляет игра). Веса — в расписании (schedule.*.bus.exits). */
    busExits: [
      { id: 'exitDoor', path: [{ x: 0.5, y: 0.925 }, { x: 0.44, y: 0.8 }, { x: 0.42, y: 0.45 }, { x: 0.46, y: 0.262, door: 'in' }] },
      { id: 'exitL', path: [{ x: 0.5, y: 0.925 }, { x: 0.45, y: 0.887 }, { x: -0.05, y: 0.887 }] },
      { id: 'exitR', path: [{ x: 0.5, y: 0.925 }, { x: 0.55, y: 0.887 }, { x: 1.05, y: 0.887 }] },
      { id: 'exitKiosk', needs: 'kiosk', path: [{ x: 0.5, y: 0.925 }, { x: 0.44, y: 0.887 }, { x: 0.352, y: 0.846, wait: [5, 9], face: -1 }, { x: 0.2, y: 0.887 }, { x: -0.05, y: 0.887 }] },
      { id: 'exitKioskHome', needs: 'kiosk', path: [{ x: 0.5, y: 0.925 }, { x: 0.44, y: 0.887 }, { x: 0.352, y: 0.846, wait: [5, 9], face: -1 }, { x: 0.41, y: 0.6 }, { x: 0.41, y: 0.4 }, { x: 0.46, y: 0.262, door: 'in' }] },
      { id: 'exitYardL', path: [{ x: 0.5, y: 0.925 }, { x: 0.45, y: 0.8 }, { x: 0.3, y: 0.55 }, { x: -0.05, y: 0.4 }] },
      { id: 'exitYardR', path: [{ x: 0.5, y: 0.925 }, { x: 0.55, y: 0.8 }, { x: 0.7, y: 0.55 }, { x: 1.05, y: 0.4 }] }
    ],
    /* Вынос мусора (правка 016): кто выносит, сколько кладёт в бак и что. Состав сдвинут к бытовому: объедки, картон, газеты. */
    trash: {
      kinds: { worker: 1, fat: 1, student: 0.7, coat: 0.3 },
      add: [1, 2],                            // находок в бак за один вынос
      logChance: 0.45,                        // доля выносов, о которых пишет журнал (чтобы не засорять)
      loot: [
        { type: 'scraps', chance: 0.3 },
        { type: 'cardboard', chance: 0.21 },
        { type: 'bottle', chance: 0.19 },
        { type: 'newspaper', chance: 0.13 },
        { type: 'can', chance: 0.1 },
        { type: 'rags', chance: 0.07 }        // правка 022: старые вещи жильцов — тряпьё для лежбища
      ],
      /* правка 022: пока лежбище не достроено, жильцы «выносят» больше строительного: сломанная полка, плёнка от ремонта (53% против 41%) */
      lootDen: [
        { type: 'scraps', chance: 0.25 },
        { type: 'cardboard', chance: 0.18 },
        { type: 'bottle', chance: 0.14 },
        { type: 'newspaper', chance: 0.1 },
        { type: 'can', chance: 0.08 },
        { type: 'rags', chance: 0.1 },
        { type: 'boards', chance: 0.09 },
        { type: 'film', chance: 0.06 }
      ]
    },
    /* Погода: speed — множитель скорости, give — множитель шанса подаяния, spawn — множитель частоты появления.
       Берётся худшее из строки ветра и строки типа погоды: самый быстрый шаг, самый низкий шанс, самая редкая толпа. */
    wind: [
      { speed: 1, give: 1, spawn: 1 },                 // штиль
      { speed: 1.15, give: 0.9, spawn: 1 },            // слабый ветер: чуть быстрее
      { speed: 1.6, give: 0.5, spawn: 0.8 }            // сильный: до скорости героя — догнать трудно
    ],
    weather: {
      sleet: { speed: 1.15, give: 0.85, spawn: 0.9 },
      frost: { speed: 1.6, give: 0.45, spawn: 0.7 },
      blizzard: { speed: 1.9, give: 0.25, spawn: 0.4 } // кто станет в метель слушать бомжа
    },
    badGive: 0.6,                             // множитель шанса ниже — в подсказке «в такую погоду не подают»
    bus: {
      emoji: '🚌', name: 'Автобус',
      stopEmoji: '🚏', stopShelterDy: -0.04,              // павильон остановки: запасной значок и сдвиг вверх от точки ожидания
      stop: { x: 0.5, y: 0.887, slots: [-0.012, 0.03, -0.05, 0.068, -0.085, 0.105, -0.12, 0.14] },   // остановка на тротуаре; ожидающие встают по очереди в эти смещения по x (утром очередь до восьми)
      y: 0.957,                                         // полоса на дороге
      speed: 0.32,                                      // долей поля в секунду
      stopSeconds: 3,
      passengers: { gap: 0.9 },                         // сколько выходит — в расписании (schedule.*.bus.out); gap — пауза между ними, с. Никто не ждёт и никто не выходит — автобус проезжает мимо
      boardY: 0.925, boardHurry: 1.5,                   // куда и как резво идут садиться
      startX: -0.14, endX: 1.14
      /* интервал — в расписании (schedule.*.bus.interval) */
    }
  },

  /* ---------- Ритм двора: расписание (правка 016) ----------
   * Двор живёт по часам, а не по солнцу. Фаза начинается в час from (часы суток, 0–24) и длится до from следующей.
   * В фазе:
   *   spawn {min,max}  — раз в сколько секунд появляется человек с края двора или из подъезда;
   *   routes {id: вес} — какие маршруты из walkers.routes работают и как часто (маршрут к закрытому заведению не запускается);
   *   kinds {тип: вес} — кто ходит (npcs.passerby.kinds);
   *   hurry            — множитель шага (спешат на работу — быстрее, поздно вечером — медленнее), задаётся человеку при появлении;
   *   give             — множитель шанса подаяния, тоже «зашивается» в человека при появлении: утренний и вечерний остаются собой и после смены фазы;
   *   bus              — interval {min,max} с, out — шансы высадить 0, 1, 2… человек, exits {id: вес} — куда пассажиры идут;
   *   cop {min,max}    — интервал обходов мента (null — мента нет);
   *   trash [мин, макс] — сколько жильцов вынесут мусор за фазу (walkers.trash);
   *   binAdd           — сколько находок прибавится в баке в начале фазы.
   * Наборы фаз — schedule.days: сейчас один набор default на все сутки. Дни недели позже: новый набор и строка в byDay (номер суток -> имя набора). */
  schedule: {
    byDay: {},                                // например { 6: 'weekend', 7: 'weekend' } — пока пусто: все сутки по default
    days: {
      default: [
        { id: 'night', name: 'ночь', from: 0,
          spawn: { min: 30, max: 50 },
          routes: { streetLR: 2, streetRL: 2, drunkYard: 2, drunkHome: 1, homeL: 0.5, homeR: 0.5 },
          kinds: { drunk: 0.6, worker: 0.25, student: 0.15 },
          hurry: 1.1, give: 0.9,
          bus: { interval: { min: 140, max: 200 }, out: [0.5, 0.4, 0.1], exits: { exitDoor: 2, exitL: 1, exitR: 1 } },
          cop: { min: 55, max: 90 } },
        { id: 'morning', name: 'утро', from: 6,
          spawn: { min: 4, max: 6.5 },
          routes: { busHome: 6, doorOutL: 2, doorOutR: 2, streetLR: 1, streetRL: 1, kioskHome: 0.5 },
          kinds: { worker: 0.35, student: 0.3, coat: 0.25, fat: 0.1 },
          hurry: 1.25, give: 0.75,
          bus: { interval: { min: 32, max: 45 }, out: [0.5, 0.35, 0.15], exits: { exitL: 1, exitR: 1, exitYardL: 0.5, exitYardR: 0.5, exitDoor: 0.3 } },
          cop: null, binAdd: 1 },
        { id: 'day', name: 'день', from: 9.5,
          spawn: { min: 22, max: 34 },
          routes: { streetLR: 3, streetRL: 3, kioskL: 1.5, kioskR: 1, stallL: 1.5, stallHome: 1, homeL: 0.5, homeR: 0.5, doorOutL: 0.5, doorOutR: 0.5, busL: 0.7, busR: 0.7 },
          kinds: { student: 0.3, worker: 0.25, fat: 0.3, coat: 0.15 },
          hurry: 1, give: 1,
          bus: { interval: { min: 60, max: 90 }, out: [0.3, 0.4, 0.3], exits: { exitL: 1, exitR: 1, exitKiosk: 1, exitYardL: 0.7, exitYardR: 0.7, exitDoor: 1 } },
          cop: null },
        { id: 'evening', name: 'вечер', from: 17,
          spawn: { min: 8, max: 13 },
          routes: { homeL: 2.5, homeR: 2.5, kioskHomeL: 1.5, kioskHomeR: 1.5, streetLR: 1, streetRL: 1, kioskL: 0.5 },
          kinds: { worker: 0.4, student: 0.25, coat: 0.2, fat: 0.15 },
          hurry: 0.9, give: 1.2,
          bus: { interval: { min: 22, max: 32 }, out: [0, 0.05, 0.15, 0.3, 0.3, 0.2], exits: { exitDoor: 3, exitKioskHome: 2, exitL: 0.5, exitR: 0.5, exitYardL: 0.5, exitYardR: 0.5 } },
          cop: null, trash: [3, 4] },
        { id: 'late', name: 'поздний вечер', from: 21,
          spawn: { min: 18, max: 28 },
          routes: { homeL: 2, homeR: 2, streetLR: 1.5, streetRL: 1.5, kioskL: 1, drunkYard: 1.5, drunkHome: 1 },
          kinds: { drunk: 0.35, worker: 0.3, student: 0.2, coat: 0.1, fat: 0.05 },
          hurry: 1, give: 1,
          bus: { interval: { min: 55, max: 80 }, out: [0.3, 0.4, 0.3], exits: { exitDoor: 3, exitL: 1, exitR: 1, exitKiosk: 0.5 } },
          cop: { min: 80, max: 120 } }
      ]
    }
  },

  /* ---------- Раскладка и хит-тесты (px) ---------- */
  layout: {
    defaultFieldW: 1280,
    defaultFieldH: 720,
    logicalAspect: 1.975,                     // ширина / высота логического поля (1920×972: окно 1920×1080 минус полоса снизу); все расстояния и скорости считаются в единицах высоты
    fieldMarginPx: 44,
    fieldTopMarginPx: 110,
    heroStand: { x: 0.022, y: 0.028 },        // куда встаёт герой относительно центра места (доли поля)
    kickOffset: { x: 0.0, y: 0.19 },          // куда вылетает герой из подъезда (доли поля)
    lootRingRadiiPx: [104, 168, 232],
    lootRingSteps: 10,
    itemSpacingPx: 68,
    placeClearPx: 96,
    edgeOutside: 0.05                         // насколько встречные заходят/уходят за край
  },

  /* ---------- Интерфейс ---------- */
  ui: {
    awayNote: 'Ты отвлёкся. Бомж ждал.',     // подпись к паузе, когда игра встала сама: окно потеряло фокус или вкладка скрыта
    menu: { close: '✕', closeTitle: 'Закрыть (Esc)', note: 'Esc, ✕ или клик мимо — закрыть. Бомж останется стоять рядом' },   // правка 016: меню ларька и палатки закрывается
    logLines: 5,
    warmthFastLoss: 0.28,                     // тепло уходит быстрее N/с — стрелка у шкалы краснеет (было 0,5 при сутках 300 с)
    /* Предупреждения над героем. Порог значка — тот же, при котором шкала краснеет (hero.lowThreshold), если low: null.
       Ниже critical значок мигает. Каждый эффект отключается своим on. frost и shiver — только для холода. */
    warn: {
      on: true,
      low: null,                              // null — брать hero.lowThreshold (25)
      critical: 10,                           // ниже — значок пульсирует
      order: ['cold', 'hunger', 'sleep', 'health'],     // порядок значков слева направо
      items: {
        cold: { stat: 'warmth', icon: true, log: 'warnCold', frost: true, shiver: true },
        hunger: { stat: 'satiety', icon: true, log: 'warnHunger' },
        sleep: { stat: 'energy', icon: true, log: 'warnSleep', hideWhileAsleep: true },
        health: { stat: 'health', icon: true, log: 'warnHealth' }
      },
      log: { on: true, rearm: 5 },            // строка в лог при пересечении порога вниз; снова — когда шкала поднялась на rearm выше порога
      frost: { on: true, start: null, maxScale: 1.14 },  // иней по краям поля: от start (null — порог) до нуля тепла растёт; maxScale — на сколько он «снаружи» при слабом холоде
      shiver: { on: true, amplitudePx: 1.2, amplitudeCriticalPx: 2.2, stepMs: 70 },   // дрожь героя при тепле ниже порога
      iconPx: 30, gapPx: 4, baseOffsetPx: 56, minTopPx: 56      // размер значка, зазор, где нижний край ряда над центром героя, выше не поднимать (полоса мира сверху)
    },
    /* Перехват без меткости: клик в радиусе factor × радиус спрайта вокруг прохожего ловит его (ближайшего к курсору).
       Кольцо под ногами показывает, успеет ли герой; пересчёт не чаще recalcMs. */
    catchZone: { factor: 1.8, minRadiusPx: 44, recalcMs: 250 },
    tipOffsetPx: 18,
    dragThresholdPx: 5,
    maxFrameDt: 0.25,
    removeFadeMs: 300
  },

  /* ---------- Тексты ---------- */
  texts: {
    hint: ['Кликни — бомж пойдёт. Или WASD, E — действие. Пробел — пауза'],
    findBottle: ['Нашёл бутылку. Почти богат', 'Бутылка! Стеклянный фонд пополнен', 'Бутылка. Кто-то праздновал за тебя'],
    findCan: ['Банка. Алюминий — металл будущего', 'Нашёл банку. Мелочь, а звенит', 'Банка. Чей-то вчерашний вечер'],
    findScraps: ['Объедки. Шеф рекомендует не нюхать', 'Чей-то недоеденный ужин. Теперь твой', 'Объедки. Срок годности — понятие философское'],
    findCardboard: ['Картон. Недвижимость эконом-класса', 'Коробка. Почти студия', 'Картон. И постель, и дрова'],
    findNewspaper: ['Газета. Вчерашние новости, завтрашняя погода', 'Нашёл газету. Кроссворд разгадан, судьба — нет', 'Газета. Пресса свободная: лежит где хочет'],
    /* правка 016: смена фазы расписания (schedule) — по строке на смену, без объяснений, что она даёт */
    phase_morning: ['Утро. Двор пошёл зарабатывать на ипотеку', 'Утро. Хлопают двери: жильцы уходят служить экономике', 'Утро. На остановке очередь из людей, которые ненавидят остановку', 'Утро. Все куда-то спешат. Ты — нет, это твоё конкурентное преимущество'],
    phase_day: ['День. Двор опустел: все на работе, кроме тебя и бабок', 'День. Тишина, только палатка торгует чужим прошлым', 'Разгар дня. Город занят, двор отдыхает от людей', 'День. Время, когда даже мусор лежит без дела'],
    phase_evening: ['Вечер. Автобусы везут людей обратно, уставших и с пакетами', 'Вечер. Рабочий день кончился, начался вечер у ларька', 'Вечер. Двор возвращается домой и выносит мусор — за это его и любим', 'Вечер. Люди идут с работы: усталые, но при зарплате'],
    phase_late: ['Поздний вечер. Приличные люди дома. Остальные — во дворе', 'Поздно. Окна гаснут, ларёк ещё светится — последняя надежда района', 'Поздний вечер. Из темноты слышно «я тебя уважаю». Это не тебе. Пока', 'Поздно. Двор переходит в ночную смену'],
    phase_night: ['Глубокая ночь. Ларёк закрылся, открылась философия', 'Ночь. Ходят только те, кому некуда спешить и есть чем согреться', 'Ночь. Город спит, мент — делает вид, что нет', 'Глухая ночь. Самое время подумать о жизни. Лучше не надо'],
    trashDump: ['Жилец вынес мусор. В баке прибавилось, в мире — убавилось', 'Кто-то выбросил пакет. Для него — мусор, для тебя — ассортимент', 'Вынесли мусор. Свежая поставка, прямо от производителя', 'Пакет полетел в бак. Двор делится с тобой, сам того не зная'],
    begOk_drunk: ['Подвыпивший обнял тебя и сунул {n} ₽: «Ты мне как брат». Брат согласен', '+{n} ₽ от подвыпившего. Щедрость у него сегодня на градусе', 'Подвыпивший долго искал по карманам и нашёл {n} ₽. Остальное он ищет до сих пор'],
    begNo_drunk: ['Подвыпивший выслушал, прослезился и ушёл. Денег не дал, но сочувствие было искренним', '«Я сам такой!» — сказал подвыпивший и показал пустой кошелёк. Не врёт', 'Подвыпивший предложил выпить вместо денег. Ты гордо отказался. Ну, почти гордо'],
    stallOpen: ['Палатка: «Всё ношеное, зато с историей»', 'Торговец оглядел тебя и сразу скинул ожидания', 'Развал открыт. Мода прошлых сезонов и чужих жизней'],
    buyGear: ['Купил и надел {acc}. Гардероб удвоился', 'Купил {acc}. Прежний хозяин не возражает, его не спросили', 'Взял {acc}. Сидит как влитое, если не дышать'],
    buyHandles: ['Пакет с ручками. Багажное отделение расширено', 'Теперь у тебя пакет с ручками. Почти чемодан, почти турист', 'Взял пакет с ручками. Статус растёт вместе с вместимостью'],
    noMoneyStall: ['Не хватает. Торговец в долг не даёт: ты у него не первый такой красивый', 'Денег мало. Примерить можно только взглядом', 'На это не наскрёб. Мода требует жертв, в том числе финансовых'],
    wearOn: ['Надел {acc}. Зеркала нет, и слава богу', 'Надел {acc}. Двор оценит, бабки осудят', 'Надел {acc}. Стиль «что нашёл, то и ношу»'],
    wearSwap: ['Надел {acc}, а {oldAcc} — в пакет, на чёрный день. То есть на завтра', 'Переоделся: надел {acc}, снял {oldAcc}. Показ мод окончен', 'Надел {acc}, убрал в пакет {oldAcc}. Гардеробная на выезде'],
    wearOff: ['Снял {acc}. Проветрился', 'Снял {acc} и убрал в пакет. Раздеваться зимой — смелое решение', 'Снял {acc}. Свобода, равенство, сквозняк'],
    paperRead: ['Газета обещает. {f}. Гороскоп был рядом, он врёт честнее', 'Прогноз из газеты. {f}. Синоптик подписался псевдонимом', 'Прочитал прогноз. {f}. Верить можно, проверять придётся'],
    paperAlready: ['Уже читал. Новости не изменились, как и жизнь', 'Газета прочитана до дыр. Теперь это растопка с кроссвордом', 'Читано. Второй раз погода лучше не станет'],
    paperNoNews: ['В газете прогноза нет: дальше синоптики не заглядывают. Ты тоже не загадывай', 'Прогноз кончился раньше, чем зима'],
    grannyNo: ['Бабка оглядела тебя и поджала губы: «Ишь, вырядился. Иди отсюда»', 'Бабка не дала ничего. В таком виде — только на учёт', '«На бутылку собираешь, по глазам вижу». Бабка сегодня не подаёт'],
    eatBread: ['Хлеб. Всему голова, особенно пустой', 'Съел хлеб. Просто, как правда', 'Хлеб внутри. Зрелищ пока не завезли'],
    eatNoodles: ['Лапша заварилась и съелась. На уши хватило бы, а так — в желудок', 'Лапша. Пять минут — и ты студент', 'Съел лапшу. Вкус курицы, которой не было'],
    drinkTea: ['Чай. Горячий, как чужая батарея', 'Выпил чаю. Внутри потеплело, снаружи без перемен', 'Чай согрел. Англичане бы одобрили, но их тут нет'],
    drinkCoffee: ['Кофе «три в одном»: кофе, сахар и надежда', 'Выпил кофе. Глаза открылись, и зря', 'Кофе взбодрил. Теперь мёрзнешь внимательнее'],
    binEmpty: ['Бак пуст. Конкуренты не дремлют', 'В баке только эхо', 'Бак пуст. Жди, пока жильцы вынесут свежее'],
    closed: ['{name}: закрыто до {t}', '{name} не работает. Откроется в {t}, если не запьют', '{name}: закрыто до {t}. Стучать бесполезно'],
    nothingToSell: ['Сдавать нечего. Себя не примут — не стеклотара', 'Пакет без тары. Приёмщица смотрит как на пустое место', 'Тары нет. Тут принимают бутылки, а не надежды'],
    bottleWontWalk: ['Бутылка сама до окошка не дойдёт. Ног нет, как и совести', 'Тара лежит и ждёт курьера. Курьер — ты', 'Самовывоз не работает. Неси в пакете, как все приличные люди'],
    sellDone: ['Партия сдана: {n} ₽. Малый бизнес жив', 'Вся тара ушла, выручка {n} ₽. Налоговая не в курсе', 'Сдал всё, что звенело: {n} ₽. Пакет полегчал, душа тоже'],
    invFull: ['Пакет полон. Это не «Ашан», тележек нет', 'Не лезет. Пакет трещит, как твоя судьба', 'Места нет. Выбрось что-нибудь ненужное, кроме себя'],
    invFullDrop: ['Пакет полон. {name} — мимо, валяется рядом', 'Пакет трещит по швам. {name} — на асфальт', '{name}: мест нет. У ног, как упущенная возможность'],
    pickUp: ['{name} — в пакет. Всё своё ношу с собой', 'Подобрал {acc}. В хозяйстве пригодится', 'Подобрал {acc}. Движимое имущество растёт'],
    putDown: ['Выложил {acc}. Камера хранения — двор', 'Оставил {acc} на земле. Авось не сопрут', 'Выложил {acc}. Склад под открытым небом'],
    cantPickAsleep: ['Он спит. Руки тоже спят', 'Спящий ничего не подбирает. Разве что простуду'],
    sellBottle: ['За бутылку: +{n} ₽', 'Бутылка принята. +{n} ₽ к пенсии', '+{n} ₽ за стекло. Капитализм'],
    sellCan: ['За банку: +{n} ₽', 'Банка принята. +{n} ₽', '+{n} ₽ за алюминий'],
    shopOpen: ['Ларёк: «Чего тебе?»', 'Продавщица смотрит с подозрением'],
    buy: ['Купил {acc}. Экономика работает', 'Купил {acc}. Кошелёк похудел', 'Взял {acc}. Сдачи не надо, её нет'],
    noMoney: ['Не хватает. Ларёк в долг не верит', 'Денег мало. Продавщица непреклонна'],
    eatScraps: ['Объедки зашли. Желудок удивлён', 'Съел объедки. Бывало и хуже', 'Объедки. На вкус как вторник'],
    eatScrapsBad: ['Объедки отомстили. Здоровье −{n}', 'Это было не свежее. Здоровье −{n}', 'Желудок подал в отставку. Здоровье −{n}'],
    eatShawarma: ['Шаурма. Лучший день недели', 'Шаурма внутри. Жизнь налаживается', 'Шаурма. Ради этого стоило жить'],
    drinkVodka: ['Чекушка греет душу и губит печень', 'Тепло пошло. Печень против', 'Согрелся изнутри. Здоровье не оценило'],
    begOk_student: ['Студент отсыпал {n} ₽ мелочью. Сам такой же, только с зачёткой', '+{n} ₽ от студента. Стипендия делится на двоих', 'Студент дал {n} ₽: «Держи, коллега по бюджету»'],
    begNo_student: ['Студент показал пустые карманы. Верится охотно', '«Сам до стипендии на дошираке». Солидарность есть, денег нет', 'Студент в наушниках. Музыка громче совести'],
    begOk_worker: ['Работяга сунул {n} ₽: «На хлеб. Только на хлеб, понял?»', '+{n} ₽ от работяги. Пролетарии всех дворов, соединяйтесь', 'Работяга дал {n} ₽ и рассказал, как сам чуть не спился. Рассказ — бесплатно'],
    begNo_worker: ['«Иди работай». Сказал человек, который идёт с работы', 'Работяга вывернул карман: там гайка и воспоминание об авансе', '«Мне самому до получки занять не у кого». Не поспоришь'],
    begOk_coat: ['Мужик в пальто достал купюру: {n} ₽. Грехи на этой неделе, видимо, крупные', '+{n} ₽ от пальто. Дешевле, чем с тобой разговаривать', 'Пальто откупилось купюрой: {n} ₽. Проверь на свет — щедрость бывает фальшивой'],
    begOk_fat: ['Толстяк отсыпал {n} ₽, не отрываясь от пирожка. Делиться — второе его хобби', '+{n} ₽ от толстяка. Сытый человек добр, это наука', 'Толстяк дал {n} ₽ и вздохнул: «Мне бы твою фигуру. Только без остального»'],
    begNo_fat: ['Толстяк развёл руками: карманы пусты, всё остальное на месте', '«Я на диете, и кошелёк тоже». Две голодовки — уже традиция', 'Толстяк тяжело дышит и не подаёт. Из двух дел выбрал дыхание'],
    doorFollow: ['Проскочил следом за жильцом. Домофон — для тех, кто честно звонит', 'Дверь не успела захлопнуться, а ты уже внутри. Ловкость рук и никакого мошенничества', 'Зашёл следом, как тень. Жильцы потом спросят у соседей, кто это был. Соседи не знают'],
    doorSlammed: ['Дверь захлопнулась перед самым носом. Домофон пискнул с удовольствием', 'Не успел: магнит щёлкнул, как насмешка. Проход закрыт', 'Дверь закрылась на секунду раньше, чем ты пришёл. Судьба обожает чувство юмора, особенно чужое'],
    begNo_coat: ['Мужик в пальто посмотрел сквозь тебя. Ты для него прозрачнее налогов', '«Я перевожу в фонды». В какие — не уточнил', 'Пальто ускорило шаг и проверило бумажник. Бумажник на месте, увы'],
    begNoWeather: ['В такую погоду кошелёк не достают: пальцы дороже', '«Мужик, метёт же!» — и нет человека', 'Кто станет в такую погоду слушать бомжа. Никто и не стал'],
    busMissed: ['Автобус ушёл без него: {name} слушал тебя. Теперь слушает себя, и не лучшие слова', '{name} опоздал на автобус из-за беседы с тобой. Отзыв будет плохой', 'Двери закрылись. {name} смотрит вслед автобусу, потом на тебя. Лучше отойди'],
    grannyCome: ['Бабка вышла из подъезда. Лавка, готовься', 'Бабка на посту. Двор под наблюдением'],
    grannySit: ['Бабка заняла лавку. Наблюдательный пункт открыт', 'Бабка села и включила режим видеонаблюдения', 'Бабка на лавке. Двор под присмотром, ты — под подозрением'],
    grannySitNear: ['Бабка присела с краю и перекрестила тебя, спящего. На всякий случай', 'Бабка села рядом: «Лежи, горе, я посторожу»', 'Бабка устроилась с краешка. Лавка общая, как и судьба'],
    grannyFood: ['Бабка сунула объедки: «Кушай, горе»', 'Бабка поделилась вчерашним. Свято'],
    grannyMoney: ['Бабка дала {n} ₽ и перекрестила', '+{n} ₽ от бабки. «Только не пропей»'],
    copCome: ['Мент вышел на обход', 'Во дворе мент. Сделай лицо попроще', 'Идёт мент. Подъезд — плохая идея'],
    copKick: ['Мент попросил на выход. Здоровье −{n}', '«Гражданин, тут не ночлежка». Здоровье −{n}', 'Выдворен из подъезда с напутствием. Здоровье −{n}'],
    dogEat: ['Собака сожрала твою еду и не извинилась', 'Пёс унёс обед. Пищевая цепочка', 'Собака поела. Ты — нет'],
    dogPass: ['Собака пробежала мимо. У неё свои дела', 'Пёс глянул на тебя с сочувствием и убежал'],
    fireCraft: ['Чиркаешь спичкой над растопкой…'],
    fireFedPaper: ['Газета ушла в огонь. Новости сгорели, стало теплее', 'Подкинул газету. Пресса наконец-то греет'],
    fireLit: ['Костёр горит. Уют уровня «подворотня»', 'Есть огонь. Ты почти турист'],
    fireFed: ['Подкинул картона. Горит веселее', 'Картон ушёл в огонь. Тепло важнее жилья'],
    fireOut: ['Костёр погас. Романтика кончилась', 'Огонь догорел. Остался запах'],
    atEntrance: ['В подъезде тепло и пахнет кошками', 'Подъезд. Главное — не шуметь', 'Подъезд. Батарея — лучший друг'],
    /* правка 022: лежбище у теплотрассы. {need} — чего не хватает на следующую ступень */
    findRags: ['Тряпьё. Чей-то свитер ушёл на пенсию — к тебе', 'Тряпки. В хозяйстве бомжа нет мусора, есть стройматериалы', 'Ветошь. Мягкая, как жизнь у тех, кто её выбросил'],
    findBoards: ['Доски. Сырые, в костёр не пойдут — только в дело', 'Обломки ящика. Почти пиломатериал', 'Доски! Строительный рынок «Помойка» работает без выходных'],
    findFilm: ['Плёнка. Парниковый эффект для одного', 'Кусок полиэтилена. Ветру — от ворот поворот', 'Плёнка. Окна ПВХ эконом-класса'],
    denNeed: ['Лаз между плитами. Тепло тянет, но на голом бетоне не уснёшь. Нужно: {need}', 'Щель в теплотрассе. Риелтор сказал бы «с потенциалом». Не хватает: {need}', 'Тут бы обустроиться. Для начала: {need}'],
    denBuildStart: ['Обустраивается. Прораб, бригада и заказчик в одном лице', 'Строит. СНиП не читал, но чувствует', 'За работу. Ремонт, который нельзя закончить, — но можно начать'],
    denStage1: ['Подстилка готова. Новоселье! Соседи — две собаки и труба', 'Картон постелен. Вид на бетон, зато свой', 'Подстилка. Ипотека без процентов, первый взнос — две коробки'],
    denStage2: ['Утеплился. Газеты держат тепло лучше, чем обещания', 'Тряпьё и пресса. Теперь тут теплее, чем в иной хрущёвке', 'Утепление. Евроремонт по-бомжовски: всё своё, всё с помойки'],
    denStage3: ['Заслон от ветра. Ветер стучит — никого нет дома', 'Закрылся от ветра. Окна во двор, вид на трубу, сквозняк — у соседей', 'Ветер больше не гость. Квартирный вопрос решён на треть'],
    denStage4: ['Заначка готова. Своя кладовка! Почти буржуй', 'Тайник под плитой. Банк «Теплотрасса»: вклады не страхуются', 'Заначка. Кто-то копит на квартиру, а у тебя уже есть'],
    denLack: ['Не хватило: {need}. Кто-то спёр, или ты сам', 'Стройка встала: нужно {need}', 'Материалы кончились. Классика долгостроя: {need}'],
    atDen: ['Залез в лежбище. Дома и стены греют, особенно тёплые', 'Лежбище. Скромно, но ни одного мента в радиусе пяти плит', 'Дома. Ну как дома — в трубе. Но дома'],
    denMatHint: ['{name} — в лежбище пригодится. Неси к теплотрассе', '{name}. Не мусор, а стройматериал. Лаз у теплотрассы ждёт', '{name}: для лежбища у трубы. Мебель сама себя не соберёт'],
    stashPut: ['{name} — в заначку. Под плиту, как в швейцарский банк', 'Спрятал {acc}. Об этом знают ты и собаки', '{name} в заначке. Бетон хранит тайны'],
    stashTake: ['Достал {acc} из заначки. Снял со счёта', '{name} из заначки. Вклад до востребования', 'Забрал {acc}. Тайник худеет'],
    stashFull: ['Заначка полна. Даже у тайника есть пределы', 'Больше не влезает. Плита не резиновая', 'Заначка забита. Пора открывать филиал'],
    stashFar: ['Заначка в лежбище. Сначала дойди', 'До тайника далеко. Банкомат на теплотрассе', 'Заначка — там, где лежбище. Ноги в руки'],
    atPipe: ['Теплотрасса. Тёплая труба — друг человека', 'Прижался к трубе. Трубе всё равно'],
    atBench: ['Лавка. Жёстко, зато своё', 'Прилёг на лавку. Дует, но лечит'],
    searching: ['Роешься в баке…', 'Ныряешь в бак. Глубоко не заплывай'],
    nightStart: ['Стемнело. Ночь {n}. Холодает', 'Темно, ночь {n}. Фонари включили, тепло — нет', 'Солнце ушло, ночь {n}. Мороз заступил на смену'],
    dayStart: ['Рассвело, день {n}. Ты всё ещё тут', 'Рассвет, день {n}. Солнце вышло проверить, жив ли ты. Жив', 'День {n}: светает. Холод чуть отступил, проблемы — нет'],
    starving: ['Живот прилип к спине. Здоровье тает', 'Голод. Организм ест сам себя'],
    exhausted: ['Глаза слипаются насмерть. Здоровье тает', 'Организм требует отбой. Здоровье тает'],
    sleepStart: ['Отбой. Снится батарея', 'Прикорнул. Во сне ты директор ларька', 'Заснул. Мир подождёт, он привык'],
    wake: ['Проснулся. Всё на месте, включая проблемы', 'Подъём. Сон был лучше', 'Разбудили. Реальность без изменений'],
    wakeFull: ['Выспался. Редкая роскошь', 'Проснулся бодрым. Аж подозрительно', 'Выспался. Хоть что-то в жизни в достатке'],
    wakeAlarm: ['Проснулся от того, что всё плохо', 'Организм сыграл подъём. Причина уважительная'],
    notSleepy: ['Сна ни в одном глазу', 'Не спится. Слишком бодр для этой жизни'],
    cantUseAsleep: ['Спящего не кормят. Сначала разбуди', 'Он спит. Во сне не наливают'],
    freezing: ['Ты замерзаешь. Здоровье тает', 'Холод собачий. Пальцы уже не твои'],
    warnCold: ['Тепло на исходе. Зубы выстукивают азбуку Морзе: «согрей»', 'Холодает всерьёз. Пальцы уже ведут себя как чужие', 'Мороз берёт своё. Он-то никуда не торопится'],
    warnHunger: ['Живот заиграл марш. Оркестр голодный', 'Желудок подал рапорт: «Прошу снабдить»', 'Сытости почти нет. Мысли только о шаурме'],
    warnSleep: ['Глаза слипаются. Двор плывёт, как после праздника', 'Зевота такая, что слышно в соседнем дворе', 'Бодрость на исходе. Пора на боковую, хоть на какую'],
    warnHealth: ['Здоровье просело. Организм просит пощады', 'Самочувствие хуже некуда, а ведь есть куда', 'Здоровья мало. Береги, что осталось'],
    npcGone: ['Не догнал: {name} — уже точка на горизонте. Ноги короче, чем чужая спешка', 'Пока ты ковылял, {name} — всё. Милостыня на месте не стоит', 'Опоздал. {name} теперь рассказывает дома про чудесное спасение'],
    itemGone: ['Пока шёл, добро ушло. Двор не склад', 'Пришёл — а там пусто. Кто-то был голоднее'],
    closedWalked: ['Дошёл, а там табличка: «{name}: закрыто до {t}». Прогулка полезная, больше ни для чего', '{name}: закрыто до {t}. Зато размялся', 'Шёл к месту «{name}» через весь двор, чтобы прочитать «откроемся в {t}»'],
    noCardboard: ['Спички есть, жечь нечего. Себя не предлагать', 'Нечем разжечь: нужен картон или хотя бы газета. Спички сами не горят долго, как и надежды'],
    noFireNear: ['Топливо подкидывают в костёр, а костра рядом нет. Логика, бомж', 'Нет огня поблизости. {name} пока побудет имуществом'],
    fullBagWalk: ['Тащишь полный пакет через весь двор. Грузчик без оклада', 'С полным пакетом ноги идут медленнее. Богатство обязывает'],
    daylight: ['День стал короче: светлых делений {d} из 12. Зима берёт двор в ипотеку', 'Темнеет раньше. Светлого времени — {d} делений, тёмного — {n}', 'Солнце экономит: {d} делений света, {n} — темноты. Как и ты, оно на мели'],
    entranceCop: ['У двери мент. Заходить сейчас — это явка с повинной', 'Подъезд занят: там мент изображает швейцара', 'Мент у двери. Подожди, он тоже мёрзнет'],
    entranceLocked: ['Домофон не пускает ещё {n} с. Жильцы обиделись', 'Дверь на замке: {n} с. Тебя тут запомнили', 'Подъезд закрыт ещё {n} с. Позвони в любую квартиру — шутка, не звони'],
    entranceEvicted: ['Жильцы вынесли тебя вместе с запахом. Домофон заперт на {n} с', '«Опять он тут!» — и ты снова на улице. Дверь закрыта на {n} с', 'Тётка с третьего этажа сильнее мента. Подъезд закрыт на {n} с'],
    entranceLockSet: ['Жильцы заперлись на домофон: {n} с подъезд не твой', 'За спиной щёлкнул замок. {n} с гуляй где хочешь'],
    weather_calm: ['Погода: {t}°, тихо. Подозрительно мирно', 'На улице {t}° и штиль. Редкий подарок судьбы', 'Тихо, {t}°. Мёрзнуть можно без спешки'],
    weather_windy: ['Задуло: {t}°, а по ощущениям {f}°', 'Ветер поднялся. На градуснике {t}°, на шкуре {f}°', 'Дует. {t}° превращаются в {f}°. Трубу сдувает'],
    weather_snow: ['Пошёл снег, {t}°. Двор хорошеет, ты — нет', 'Снег, {t}°. Романтика для тех, у кого есть окно', 'Снежок и {t}°. По ощущениям {f}°'],
    weather_sleet: ['Мокрый снег, {t}°. Промок — значит {f}°', 'С неба течёт каша. {t}°, ощущается {f}°', 'Мокрый снег. Костру такое не нравится, тебе тоже'],
    weather_frost: ['Мороз: ощущается {f}°. Труба не вывезет', 'Ударил мороз, {f}° по ощущениям. Ищи стены или огонь', 'Холод {f}°. В такую погоду и мент — почти родня'],
    weather_blizzard: ['Метель: {t}°, ощущается {f}°. На улице — никак', 'Замело. Ощущается {f}°. Подъезд или костёр, третьего не дано', 'Метель, {f}° по шкуре. Теплотрассу сдуло морально'],
    /* правка 017: сохранение и запись (эти строки не трогают игровой генератор случайности) */
    saveDone: ['Рассвет. Жизнь сохранена — в отличие от достоинства', 'Утро записано в память браузера. Твоя память так не умеет', 'Сохранился. Если отключат свет — начнёшь с этого утра, а не с помойки'],
    saveLoaded: ['Продолжаем. Двор ждал, мусор не вывозили', 'Вернулся. Бак на месте, совесть тоже', 'С возвращением. Утро то же, похмелье новое'],
    saveStale: ['Вчерашний день не пережил обновления. Начинаем с чистого листа картона', 'Сохранение было от старой версии мира. Мир обновился, ты — нет', 'Прошлое сохранение устарело. Как и всё, что у тебя было'],
    recExported: ['Запись забега выгружена файлом. Мемуары бомжа, том {n}', 'Скачал запись. Архив потомкам: как выжить на {n}-е сутки', 'Запись ушла в загрузки. Хроника падения, глава {n}'],
    recSaved: ['Запись забега легла в папку. Мемуары бомжа, том {n}, в твёрдой обложке', 'Хроника {n}-х суток сохранена в папку. Архив потомкам в порядке'],
    recFull: ['Память браузера переполнена. Записи старых забегов подвинулись, как бабки в очереди', 'Места в памяти мало: старые забеги выселены без домофона']
  },

  /* ---------- Задачи (сейчас одна; позже сюда встанет список заданий) ----------
   * kind: 'surviveNights' — прогресс = пережитые ночи из time.days. */
  goals: [
    { id: 'survive', kind: 'surviveNights', text: 'Дожить до утра {n}-го дня', progress: 'ночей пережито: {a} из {b}' }
  ],
  goalsTitle: 'Задача',

  /* ---------- Стартовая карточка ---------- */
  startCard: {
    title: 'Бомж',
    intro: ['Ты — бомж во дворе панельной пятиэтажки. Зима близко, дом — нет.', 'Протяни семь суток: не замёрзни, не оголодай, не усни насмерть. Дни будут короче, ночи — злее.'],
    howTitle: 'Как тут жить',
    how: [
      'Кликни по баку, ларьку, палатке, приёмке, трубе, подъезду, лавке — бомж дойдёт и сделает. Дорога стоит времени',
      'Или ходи сам: WASD или стрелки, E — действие с тем, что рядом, Z — спать',
      'Наведи на что угодно — увидишь, что оно даёт, почём и сколько до него идти',
      'Прохожие не стоят: кликни рядом с идущим — бомж пойдёт наперерез. Кольцо под ногами тёплое — успеет, холодное перечёркнутое — не догнать. У одного человека просят один раз',
      'Находки падают в пакет. Клик по еде — съесть, вытащить из пакета — выложить у ног',
      'Клик по спичкам, когда в пакете есть картон или газета, — костёр у ног',
      'Палатка посреди двора одевает: клик по вещи в пакете — надеть, по слоту «Надето» — снять. Газету из бака прочти: в ней погода',
      'Двор живёт по часам: утром одни люди, вечером другие, ночью третьи. У ларька, палатки и приёмки свои часы работы — наведи и узнаешь',
      'Значок над головой — шкала просела. Иней по краям — холод пора лечить. Пробел — пауза (приказы на паузе принимаются), 1 / 2 / 3 — скорость'
    ],
    button: 'Пошёл выживать',
    continueBtn: 'Продолжить (сутки {n}, утро)',        // правка 017: есть сохранение этой версии
    newBtn: 'Новая игра',                               // подпись первой кнопки, когда есть что продолжить
    note: 'Время не идёт, пока ты читаешь. Редкая для тебя роскошь'
  },

  /* ---------- Подсказки при наведении ({…} подставляет игра) ---------- */
  tips: {
    places: {
      bin: ['Внутри: {n}. Поиск {s} с за находку', 'Чужой мусор — твой ассортимент'],
      binEmpty: ['Пусто. Жильцы ещё не вынесли', 'Конкуренты встали раньше'],
      recycle: ['Бутылка {b} ₽, банка {c} ₽, {s} с за штуку', 'Сдаёт только бомж лично. Приёмщица уходит рано: у неё тоже вечер'],
      kiosk: ['Еда, питьё, спички и пакет: от {min} до {max} ₽', 'На вывеске «24», на деле — до двух ночи. Совести не держит'],
      stall: ['Ношеная одежда: от {min} до {max} ₽. Купленное сразу надевается', 'Греет, красит и прибавляет карманов. К вечеру накрывают брезентом'],
      hours: 'Работает {a}–{b}',                 // правка 016: часы заведений в подсказке
      closedUntil: 'Закрыто до {t}',
      closesIn: 'Закроется в {t}',
      bench: ['Лёжа: здоровье +1 за {n} с', 'Тепло уходит вдвое быстрее: сейчас {x}/с. У костра штраф не действует'],
      entrance: ['{g} тепла/с, ветер и снег не достают', 'Поздно вечером и ночью мент стоит у двери {a}–{b} с. Застанет внутри: −{d} здоровья и домофон на {c}–{e} с'],
      entrancePatience: 'Жильцы терпят недолго и каждый раз по-разному. Потом выставят и запрутся',
      entranceMood: {
        calm: 'Жильцы пока спокойны. Принимают тебя за сантехника',
        wary: 'Жильцы косятся. На третьем этаже скрипнула дверь',
        edge: 'Сейчас выставят: тётка уже набрала воздуха'
      },
      entranceCop: ['У двери мент — не войти', 'Жди, пока уйдёт. Он на работе, ты — нет'],
      entranceLocked: ['Домофон: закрыто ещё {n} с', 'Жильцы злопамятны, но отходчивы'],
      entranceDoorOpen: ['Дверь ещё не захлопнулась — можно проскочить', 'Домофон спит, пока кто-то держит дверь. Успеешь — войдёшь'],
      pipeCalm: ['{g} тепла/с — штиль, греет в полную силу', 'С погодой выходит {net}/с'],
      pipeLight: ['{g} тепла/с — ветер сдувает часть', 'С погодой выходит {net}/с'],
      pipeStrong: ['{g} тепла/с — ветер сдувает почти всё', 'С погодой выходит {net}/с. Труба — не дом'],
      /* правка 022: лежбище */
      denBare: ['Лаз между плитами теплотрассы. Обустроишь — будет где спать', 'Отсюда не выгоняют: мент сюда не полезет, форма дорогая'],
      denBuilt: ['Сейчас тут {net}/с, во сне {sleep}/с (у трубы {pipe}/с)', 'Отсюда не выгоняют. Соседи — собаки, они не стучат'],
      denNext: 'Дальше — {name}: {need}',
      denReady: 'Всё на «{name}» в пакете — клик, и строишь',
      denDone: 'Обустроено целиком. Заначка: {n} из {c}'
    },
    items: {
      bottle: ['Сдать на приёмке: +{p} ₽', 'Чужой праздник, твоя выручка'],
      can: ['Сдать на приёмке: +{p} ₽', 'Алюминий. Почти цветмет'],
      scraps: ['+{sat} сытости за {s} с', '{risk}%: здоровье −{hp}. Русская рулетка, но еда'],
      shawarma: ['{stats} за {s} с', 'Вершина местной кухни. Лечит душу'],
      vodka: ['+{w} тепла, −{hp} здоровья за {s} с', 'Греет сегодня, должен завтра'],
      cardboard: ['Клик в пакете рядом с костром: +{feed} с горения', 'Со спичками в пакете — костёр на {burn} с', 'В лежбище у теплотрассы — подстилка и заначка'],
      newspaper: ['Клик в пакете — прочитать: погода на две смены вперёд', 'Потом сгодится в костёр: +{feed} с горения или на утепление лежбища'],
      rags: ['Для лежбища: утепление (вместе с газетами)', 'Горит, но так себе: +{feed} с костру. Чей-то свитер отслужил'],
      boards: ['Для лежбища: заслон от ветра и заначка', 'Сырые, в костёр не годятся. Только в дело'],
      film: ['Для лежбища: заслон от ветра — хватит одной', 'Жечь не стоит: воняет, а греет как совесть'],
      newspaperRead: ['Прочитана. Клик рядом с костром: +{feed} с горения', 'Со спичками — костёр на {burn} с. Пресса греет лучше, чем информирует'],
      matches: ['Клик в пакете, если есть картон или газета: костёр у твоих ног (на картоне — {burn} с)', 'Разжигать {s} с. Топливо и спички сгорят, совесть останется'],
      fire: ['{g} тепла/с всем, кто рядом', 'Горит ещё {t} с{burnNote}']
    },
    fireBurnNote: '. На такой погоде прогорает в {m} раза быстрее',
    use: '{stats} за {s} с',                    // первая строка подсказки расходника: только ненулевые числа
    /* шутки к товарам и вещам: карточки в ларьке и палатке, подсказки в пакете и на земле */
    jokes: {
      tea: 'Кипяток с намёком на заварку',
      coffee: 'Кофе, сахар и сливки. Ни одного из трёх внутри нет',
      bread: 'Вчерашний. Сегодняшний стоит как завтрашний',
      noodles: 'Со вкусом курицы, которая мимо проходила',
      vodka: 'Греет сегодня, должен завтра',
      shawarma: 'Вершина местной кухни. Лечит душу',
      matches: 'Сорок штук, из них горят двадцать',
      handles: 'Плюс {n} места. Пакет в пакете — уже логистика',
      hat: 'Связана бабушкой. Не твоей',
      ushanka: 'Уши греет, взгляды притягивает. В основном милицейские',
      scarf: 'Пахнет чужим одеколоном и немного надеждой',
      jacket: 'В таком подают охотнее: думают, человек временно',
      vatnik: 'Тепло, надёжно, не модно никогда. Классика',
      coatGood: 'В этом пальто ты уже не бомж, а «мужчина, вы к кому?»',
      raincoat: 'Шуршит так, что ветер обходит стороной',
      trackpants: 'Три полоски. Четвёртая — жизненная, чёрная',
      jeans: 'Протёрты на коленях. Ты их дизайнер или молился?',
      gloves: 'Обе на левую руку. Зато две',
      workGloves: 'Жёлтые, резиновые. В баке ты теперь хирург',
      sneakers: 'Бегают быстрее хозяина. Прежнего — точно'
    },
    wear: {
      slot: 'Слот: {slot}', click: 'Клик в пакете — надеть', clickOff: 'Клик — снять в пакет', worn: 'уже на тебе', once: 'берут один раз',
      vs: 'вместо «{name}»: {diff}', vsSame: 'вместо «{name}»: то же на то же',
      empty: ['Пусто. Родная одежда не в счёт: она уже часть тела', 'Свободно. Палатка посреди двора ждёт твоих денег'],
      sumTitle: 'Надето: итог', sumNone: 'Ничего сверх родного. Родное не греет, оно просто приросло',
      warmth: 'Тепло {v}: на улице уходит на {p}% меньше тепла',
      weather: 'Непогода {v}: ветер и осадки студят на {p}% слабее',
      charisma: 'Харизма {v}: шанс подаяния {pp} п.п.',
      slots: 'Мест в пакете: {n}'
    },
    forecast: {
      title: 'Погода', day: 'День {n}', night: 'Ночь {n}',
      line: '{when}: около {t}°, {wind}, {precip}',
      none: 'Прогноза нет. Синоптики в баке, ищи газету',
      note: 'Прогноз из газеты. Сбывается, как обещания перед выборами: местами'
    },
    npcs: {
      passerby: ['Подаёт: {how}. Разговор {s} с'],
      kinds: {
        student: { how: 'часто, мелочь', joke: 'Сам на мели, поэтому понимает' },
        worker: { how: 'через раз, средне', joke: 'После получки добрый, до получки — как ты' },
        coat: { how: 'редко, зато купюрой', joke: 'Обычно смотрит сквозь. Иногда — в бумажник' },
        fat: { how: 'через раз, средне', joke: 'Идёт не спеша: торопиться некуда, везде уже успел' },
        drunk: { how: 'охотно, а сколько — как повезёт', joke: 'Идёт по синусоиде. Душа нараспашку, кошелёк — тоже' }
      },
      trash: 'Несёт мусор к баку. Сейчас в баке станет интереснее',
      hurry: 'Спешит: идёт быстро, подаёт неохотно',
      relaxed: 'Никуда не спешит. Самое время попросить',
      charisma: 'Твой наряд: шанс подаяния {pp} п.п.',
      weatherMeh: 'Погода портится: идут быстрее, подают хуже',
      weatherBad: 'В такую погоду бомжа никто не слушает. Почти',
      asked: 'Уже просил. Второй заход — это уже вымогательство',
      busWait: 'Ждёт автобус. Деваться ему некуда',
      noCatch: 'Не догнать. Он спешит сильнее, чем ты нуждаешься',
      granny: ['Объедки или {m} ₽, пополам. Разговор {s} с', 'Гуляет до лавки и обратно. Раз в день, как совесть'],
      grannySit: 'Сидит на лавке, сторожит двор',
      cop: ['Застанет в подъезде — выгонит: −{d} здоровья, и домофон на замок', 'Стоит у двери {a}–{b} с. На улице ему до тебя дела нет'],
      dog: ['Съест еду, что лежит на земле', 'В пакет не полезет. Воспитание']
    },
    stats: {                                  // подсказки на шкалах героя внизу; у тепла ещё и разбор по источникам
      satiety: { title: 'Сытость', lines: ['Падает на 1 каждые {s} с. На нуле здоровье тает', 'Желудок не философ: ему нужна еда, а не смысл'] },
      warmth: { title: 'Тепло', lines: ['На нуле здоровье тает быстрее всего', 'Холод — главный убийца двора. Остальное — мелочи'] },
      health: { title: 'Здоровье', lines: ['Лавка лечит, голод, холод и недосып — калечат', 'На нуле — конец. Без апелляции'] },
      energy: { title: 'Бодрость', lines: ['Не спишь — падает на 1 каждые {s} с. Ниже {t} — всё делается дольше', 'На нуле здоровье тает. Спать надо, а не героически держаться'] }
    },
    walk: 'Идти {s} с', walkNear: 'В двух шагах',
    ground: 'Клик — подойти и подобрать',
    sub: { den: 'ступень {n} из {m}', denReady: 'всё есть — строй', denBare: 'голый бетон', closed: 'закрыто до {t}', cop: 'мент у двери', lock: 'домофон {n} с', doorOpen: 'дверь открыта', mood: { calm: 'жильцы спокойны', wary: 'жильцы косятся', edge: 'сейчас выставят' } },
    askedMark: 'уже просил',
    clock: {
      title: 'День {n} из {all} · {phase}',     // правка 016: подсказка циферблата — текущая часть суток и время
      now: 'Сейчас около {t}',
      toDark: 'До темноты: {s} с',
      toDawn: 'До рассвета: {s} с',
      split: 'Сегодня светло {d} делений из {all}, темно — {n}',
      joke: ['Часы уличные, время — тоже', 'Стрелка идёт. В отличие от трамвая', 'Зима забирает по делению. Без спроса']
    },
    doing: {
      idle: 'Стоит. Мёрзнет профессионально',
      asleep: 'Спит: бодрость +{e}/с',
      search: 'Роется в баке',
      sell: 'Сдаёт тару',
      shop: 'Разглядывает витрину',
      talk: 'Клянчит',
      use: 'Трапезничает',
      light: 'Разводит костёр',
      walking: 'Идёт',
      bench: 'Лежит на лавке, лечится',
      entrance: 'Греется в подъезде',
      pipe: 'Обнимает трубу',
      den: 'Лежит в лежбище',
      build: 'Обустраивает лежбище',
      tired: 'Устал: все дела в {m} раза дольше'
    },
    heat: {
      weather: 'Погода', weatherBench: 'Погода (на лавке ×{m})', indoor: 'В подъезде не дует', gearNote: ', одежда −{p}%',
      entrance: 'Подъезд', pipe: 'Теплотрасса', fire: 'Костёр', total: 'Итого тепло',
      weatherDen: 'Погода (в лазе ×{m})', den: 'Теплотрасса изнутри', denSleep: 'Утепление держит тепло во сне'
    }
  },

  /* ---------- Окно «Записи» и кнопки выгрузки (правка 017) ---------- */
  recUi: {
    btn: '📼', btnTitle: 'Записи забегов',
    title: 'Записи',
    intro: ['Здесь лежат записи твоих последних забегов — хроника того, как ты выживал. Хранятся в браузере, наружу не уходят.', 'Хочешь показать, как играл, — скачай файл.'],
    modeTitle: 'Когда записывать файл',
    modes: { off: 'Никогда', end: 'В конце забега', daily: 'Каждое утро и в конце' },
    download: 'Скачать запись',
    downloadNow: 'Скачать запись этого забега',
    listTitle: 'Последние забеги',
    empty: ['Пусто. Ты ещё не начинал страдать', 'Ни одного забега. Подозрительно благополучная жизнь'],
    current: 'идёт сейчас',
    win: 'дожил',
    lose: { cold: 'замёрз', hunger: 'оголодал', sleep: 'недоспал', other: 'помер' },
    unfinished: 'брошен',
    day: 'сутки {n}',
    close: '✕', closeTitle: 'Закрыть (Esc)',
    dirTitle: 'Куда складывать записи',
    dirPick: 'Папка для записей…', dirChange: 'Другая папка…', dirOk: 'Пускай пишет (разрешить доступ)', dirForget: 'Забыть папку',
    whereDir: 'Пишем в папку «{name}»: один файл на забег, растёт сам. Бухгалтерия на высоте',
    whereDl: 'Пишем в «Загрузки» скачиванием. Chrome это терпит ровно до второго раза',
    whereNoApi: 'Этот браузер папок не умеет, пишем скачиванием в «Загрузки»',
    last: 'Последняя запись: {t}, сутки {n}, {to}',
    lastNone: 'Последняя запись: пока ни одной. Летопись пуста',
    toDir: 'в папку', toDl: 'в «Загрузки»',
    why: {
      perm: 'Папка помнит тебя, но ждёт «можно»: нажми кнопку ниже, или просто начни забег — доступ спросят один раз',
      fail: 'В папку не вышло (удалена? заперта?) — положил скачиванием. Выбери папку заново',
      pick: 'Папку выбрать не удалось. Некоторые системные папки (Загрузки, Документы целиком) Chrome не отдаёт: заведи свою',
      idb: 'Папка выбрана, но браузер её не запомнит: после перезапуска придётся выбрать снова'
    },
    note: 'Пока открыто это окно, во дворе стоит пауза'
  },

  /* ---------- Экран конца ---------- */
  endTexts: {
    winTitle: 'Дожил до рассвета',
    winText: 'Семь ночей позади. Весна не обещана, но ты ещё здесь.',
    loseTitle: 'Отмучился',
    causes: {
      cold: 'Причина: холод. Замёрз, так и не дождавшись отопительного сезона.',
      hunger: 'Причина: голод. Последним ужином был вчерашний воздух.',
      sleep: 'Причина: недосып. Отоспишься теперь.',
      other: 'Причина: прочее. Здоровье кончилось раньше, чем неприятности.'
    }
  }
};
