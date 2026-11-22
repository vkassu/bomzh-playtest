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
    keys: { index: 'bomzh.recIndex', run: 'bomzh.rec.', save: 'bomzh.save' },   // ключи localStorage
    /* строки журнала, которые попадают в запись отдельным событием: ключ журнала -> имя события */
    fromLog: {
      entranceEvicted: 'kicked', copKick: 'copKick', doorFollow: 'followIn', entranceLocked: 'locked', doorSlammed: 'slammed',
      entranceCop: 'copAtDoor', closed: 'closed', closedWalked: 'closed', itemGone: 'itemGone', invFullDrop: 'fullDrop', invFull: 'bagFull',
      copCome: 'copCome', grannyCome: 'grannyCome', binEmpty: 'binEmpty', nothingToSell: 'nothingToSell',
      noMoney: 'noMoney', noMoneyStall: 'noMoney', fireOut: 'fireOut', fireFed: 'fireFed', fireFedPaper: 'fireFed', notSleepy: 'notSleepy',
      noCardboard: 'noFuel', noFireNear: 'noFireNear', cantUseAsleep: 'asleepCant', cantPickAsleep: 'asleepCant', fullBagWalk: 'fullBagWalk'
    }
  },
  /* ---------- Сохранение: автослот на рассвете и отдельные ручные ячейки ---------- */
  save: {
    on: true,
    manualSlots: 3,
    keepAfterDeath: false,                    // автослот завершённого забега стирается; ручные ячейки остаются
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

  /* ---------- Звук (синтез и записи) ---------- */
  sound: {
    enabledByDefault: true,
    volume: 0.7,                              // громкость игрока по умолчанию (0–1)
    storageKey: 'bomzh.sound',
    master: 0.8, outputTrim: 0.7,             // общий уровень и запас после лимитера
    ambience: 1, sfx: 0.9,
    bus: {
      files: {
        drive: 'audio/bus/bus-drive-loop.wav', idle: 'audio/bus/bus-idle-loop.wav',
        open: 'audio/bus/bus-door-open.wav', close: 'audio/bus/bus-door-close.wav'
      },
      range: 0.92, edgeFade: 0.16,              // слух и затухание у концов пути, в координатах двора
      fadeSeconds: 0.28, engineGain: 0.95, doorGain: 1
    },
    courtyard: {
      outdoor: 'audio/courtyard/courtyard-loop.wav',
      indoor: 'audio/courtyard/courtyard-loop-indoor.wav',
      steps: [
        'audio/courtyard/step-snow-01.wav', 'audio/courtyard/step-snow-02.wav', 'audio/courtyard/step-snow-03.wav',
        'audio/courtyard/step-snow-04.wav', 'audio/courtyard/step-snow-05.wav'
      ],
      open: 'audio/courtyard/entrance-door-open.wav', close: 'audio/courtyard/entrance-door-close.wav',
      gain: 0.65, fadeSeconds: 0.42, syncDrift: 0.06,
      stepGain: 0.95, doorGain: 0.95, doorRange: 0.8, passSeconds: 0.74
    },
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
      fireCraft: ['strike'], fireLit: ['whoosh'], fireFed: ['paper', 'whoosh'], fireFedPaper: ['paper', 'whoosh'], fireOut: ['hiss']
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
      frost: ['Мороз. Сопли звенят', 'Минус такой, что водка задумалась', 'На морозе даже ветер кутается в шарф'],
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
      heroMult: 0.65,                         // спокойная походка героя, от неё считаются скорости прохожих
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
      talkLabel: 'заговорить'
    }
  },

  /* ---------- Места (координаты — доли поля) ---------- */
  places: {
    bin: {
      emoji: '🗑', name: 'Мусорный бак', action: 'рыться', x: 0.803, y: 0.468,
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
      emoji: '♨️', name: 'Теплотрасса', action: 'греться', x: 0.861, y: 0.247, heroStand: { x: 0, y: 0 },
      warmthPerSecond: 0.55                   // было 1 (сутки ×1,8)
    },
    /* Правка 022: лаз между плитами теплотрассы. Обустраивается по ступеням (раздел den ниже): клик — встать у лаза и,
       если в пакете есть всё на следующую ступень, строить; построенное греет и укрывает. */
    den: {
      emoji: '🕳', name: 'Лежбище', action: 'обустроить', x: 0.963, y: 0.247, heroStand: { x: 0, y: 0 },
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
  begging: {
    xpPerAsk: 1, xpPerReply: 1, levels: [0, 8, 24, 46, 75], socialLevels: [0, 8, 24, 46, 75],
    // Доля пути от исходного шанса конкретного типажа до его шанса на пятом уровне.
    practice: { begging: [0, .20, .50, .79, 1], social: [0, .30, .60, .84, 1] },
    socialReach: .67,
    socialBases: {
      student: { talk: .51, joke: .62, askAboutYard: .43, explain: .42, favor: .34 },
      worker:  { talk: .54, joke: .34, askAboutYard: .65, explain: .55, favor: .63 },
      coat:    { talk: .27, joke: .22, askAboutYard: .36, explain: .49, favor: .24 },
      fat:     { talk: .53, joke: .39, askAboutYard: .50, explain: .51, favor: .46 },
      drunk:   { talk: .46, joke: .60, askAboutYard: .30, explain: .32, favor: .35 },
      granny:  { talk: .59, joke: .34, askAboutYard: .72, explain: .63, favor: .70 }
    },
    // Множители отношения успехов к отказам. Границы вероятности сохраняются.
    moods: {
      cheerful: { talk: 1.90, joke: .64, askAboutYard: 1.22, explain: 1.13, favor: 1.12, ask: 1.50 },
      gloomy:   { talk: .73, joke: 1.92, askAboutYard: .89, explain: 1.05, favor: 1.32, ask: .78 },
      hurried:  { talk: .51, joke: .47, askAboutYard: .73, explain: 1.25, favor: .71, ask: .63 },
      calm:     { talk: 1, joke: 1, askAboutYard: 1, explain: 1, favor: 1, ask: 1 }
    },
    rapportOdds: {
      talk: { yes: 1.75, no: .77 }, joke: { yes: 2.18, no: .53 }, askAboutYard: { yes: 1.28, no: .83 },
      explain: { yes: 1.90, no: .72 }, favor: { yes: 1.56, no: .78 }
    },
    cards: {
      talk: { skill: 'social', level: 1, label: 'Поговорить', description: 'Перекинуться парой слов.',
        variants: [
          { id: 'mitten', line: 'Варежка на ветке у подъезда — не твоя? Я повыше повесил, а то затопчут.',
            replies: {
              student: '«Моя! Там на резинке имя пришито. Бабушка до сих пор не в курсе, что я уже на третьем курсе».',
              worker: '«Серая, большой палец синим заштопан? Ну слава богу. А то жена только вчера зашила».',
              coat: '«Зелёная, с оленем? Тогда я знаю хозяйку. Дочь утром уверяла меня, что олень убежал сам».',
              fat: '«У меня обе. А у продавщицы из ларька сегодня одна рука в кармане. Скажу ей, когда за хлебом пойду».',
              drunk: 'Он пересчитал варежки на руках. «Две. А третья мне зачем? Хотя погоди, какого цвета?»',
              granny: '«Детская, с зайцем? Оставь на ветке. Мать за руку малыша возьмёт, тут и хватится».'
            } },
          { id: 'pancakes', line: 'Блинами пахнет, чуешь? У нас дома первый всегда мне доставался. Мать говорила: всё равно рваный.',
            replies: {
              student: '«У нас на этаже первый тоже рваный. Второй сырой. А к третьему на запах приходит комендант».',
              worker: '«Моя дочурка теперь у плиты первый караулит. С вареньем-то какая разница, сколько у него дырок».',
              coat: '«У нас первый доставался отцу. Я, признаться, лет до десяти думал, что это по должности».',
              fat: '«Это блины на дрожжах. Слышишь, запах чуть хлебный? У меня отец такие пёк по воскресеньям».',
              drunk: '«Мне мать края у блинов отдавала. Говорила, серединка детям вредна. Я лет до двенадцати верил».',
              granny: '«Ох, хитрая у тебя мать. Мои внуки тоже любят рваные. Приходится лопаткой помогать».'
            } },
          { id: 'accordion', line: 'Вчера кто-то за стенкой на гармошке играл. До припева дошёл — и всё. Так и хожу с половиной песни.',
            replies: {
              student: '«Напойте кусочек. Я такое записываю: на одной стороне лекции, на другой — всё интересное».',
              worker: '«Это Петрович учится. Ты ему в следующий раз снизу подпой, а то он дальше куплета стесняется».',
              coat: '«Зато в половине одиннадцатого он всё-таки остановился». По тону было слышно, что стенка у них общая.',
              fat: '«Подожди, там дальше вот так…» Он прогудел три ноты, задумался и начал куплет сначала.',
              drunk: '«А ты первую половину пой, я вторую подберу. Если песни разные — ещё интересней».',
              granny: '«Это у Нинки зять. Там не припев дальше, там Нинка кричит: картошка стынет!»'
            } },
          { id: 'first_pay', line: 'Первую получку помню до копейки. Купил ботинки, а домой в старых пошёл — новые жалко. А у тебя на что первая получка ушла?',
            replies: {
              student: '«Я летом листовки раздавал. Купил маме торт. Она чек увидела и долго уговаривала меня съесть второй кусок».',
              worker: '«Набор ключей. Вон в сумке до сих пор. Только на тринадцать уже четвёртый по счёту».',
              coat: '«На эти часы». Он показал потёртый циферблат. «Ремешок с тех пор четыре раза менял, а они всё идут».',
              fat: '«Арбуз. Нёс домой на плече, как телевизор. А внутри белый. До сих пор обидно».',
              drunk: '«Билет на поезд. Там девчонка одна жила. Назад она мне сама билет купила».',
              granny: '«Духи “Красная Москва”. Мама ругалась: зачем такие дорогие. А сама к празднику у меня просила».'
            } },
          { id: 'snowbird', line: 'Утром увидел на снегу будто цветок. Два лепестка, а между ними вот так — раз, раз! — вороньи лапы. Никогда не замечал, как они садятся.',
            replies: {
              student: '«Я теперь знаю, что сниму для задания про узоры во дворе. А то в телефоне двадцать семь одинаковых кирпичей».',
              worker: '«Знаю такой след. Крыльями снег черканёт, потом лапами тормозит. Целая посадочная полоса».',
              coat: '«Такие тонкие штрихи по бокам, верно? Видел у машины. Думал, дети веткой нарисовали».',
              fat: '«Если увидишь ещё один цветок в двух шагах от первого, там я корки бросаю. Она всё норовит поближе сесть».',
              drunk: '«Вот и пусть будет цветок. У нас и садовник в таком случае есть — чёрный, с клювом».',
              granny: '«А я всё гадаю, кто мне на свежем снегу веера печатает. Выходит, ворона. Разгадал!»'
            } }
        ] },
      ask: { level: 1, label: 'Попросить денег', description: 'Попросить мелочь и закончить разговор.',
        variants: [
          { id: 'tea', line: 'Подкинь на горячий чай, если можешь. Хочу хоть кружку в руках подержать.',
            replies: {
              student: { yes: 'У меня после автомата сдача осталась. Держите, я сам так пальцы отогреваю.', no: 'Боюсь, нечем. У нас в комнате один чайный пакетик уже второй день дежурит.' },
              worker: { yes: 'На, грей руки. Я с утра ключ из пальцев выронил — так замёрзли.', no: 'Не обессудь. Я на смену термос из дома таскаю. На покупной чай и у самого мелочи нет.' },
              coat: { yes: 'Берите. И попросите у них крышку, пока несёте — расплещете.', no: 'Мелочи с собой нет. Я даже чай картой оплачиваю.' },
              fat: { yes: 'На чай держи. Попроси покрепче, они пакетик иногда вынимают раньше времени.', no: 'Сегодня не могу. Сам до получки перешёл на кипяток. Зато заваривается моментально.' },
              drunk: { yes: 'Держи, друг. А я кружку обычно за бока обнимаю, у неё тогда две ручки — мои!', no: 'Выкрутил все карманы. Я бы и сам сейчас кружку обнял.' },
              granny: { yes: 'Бери, родной. На пустой желудок одним чаем тоже не проживёшь.', no: 'Ох, милок, у меня всё по конвертам. Сегодня с собой только аптечный.', food: 'Чаю у меня нет, а перекусить есть. Бери, родной, чай потом вприкуску выпьешь.' }
            } },
          { id: 'bread', line: 'Поможешь на хлеб? У ларька уже второй раз читаю состав батона. На вкус бы теперь проверить.',
            replies: {
              student: { yes: 'Я тоже этикетки перед стипендией читаю. Вот, скинемся на практическую часть.', no: 'Мы в общаге на ужин уже скинулись. От меня там как раз батон ждут.' },
              worker: { yes: 'Держи. Корочку я бы первым делом отломил, пока ещё хрустит.', no: 'Сам две горбушки на смену откладываю. Мелочь жене на продукты оставил.' },
              coat: { yes: 'Возьмите. Я этот состав тоже читал. Со шрифтом у них прямо тайна вклада.', no: 'Боюсь, от меня только очки — прочитать помельче. Наличных нет.' },
              fat: { yes: 'Бери. Из середины стопки попроси, там батоны мягче.', no: 'Эх, поздно встретились. Только что сам за буханку последнюю мелочь отсчитал.' },
              drunk: { yes: 'На хлеб — святое. Горбушку не откладывай, она вкусней всего по дороге.', no: 'Я тебе сейчас насоветую, какой батон брать, а платить-то нечем. Прости.' },
              granny: { yes: 'Хлеба захотелось? Это я понимаю. Держи, поешь.', no: 'У меня самой на хлеб отложено, на половинку как раз.', food: 'На батон не добавлю, а вот тебе перекусить. Завёрнуто, в кармане не раскрошится.' }
            } },
          { id: 'loan', line: 'Дашь немного мелочи? В долг не прошу. Честнее сразу сказать: отдавать пока нечем.',
            replies: {
              student: { yes: 'О, так можно было? Запомню к разговору с соседом по комнате. Держите.', no: 'Я бы рад, но мне самому вчера так же честно не вернули.' },
              worker: { yes: 'Вот за это спасибо. Держи. А то один до пятницы занимал — уже третий год у него четверг.', no: 'Ну и я прямо скажу: до аванса у меня всё расписано. Без обид?' },
              coat: { yes: 'Без расписки обойдёмся. Возьмите и закроем вопрос.', no: 'Я понял, что не в долг. Всё равно откажу. Всего доброго.' },
              fat: { yes: 'Ладно, держи. По крайней мере, завтра можно спокойно поздороваться.', no: 'Я денег до получки у кума занял. Чужие раздавать как-то неловко.' },
              drunk: { yes: 'Бери! С должниками пить чай неловко, а мы с тобой теперь просто знакомые.', no: 'А мне-то как раз должны. Пойду найду этого честного человека.' },
              granny: { yes: 'Хорошо, что прямо сказал. Бери, сочтёмся добрым словом.', no: 'Раз начистоту, то и я начистоту: сегодня помочь не смогу.', food: 'Еда у меня с собой есть. Бери, родной. Таким долгам я и счёта не веду.' }
            } },
          { id: 'pockets', line: 'Не найдётся мелочи, которая в кармане только звенит? У меня ей дело есть.',
            replies: {
              student: { yes: 'Вот что у меня на лекции звенело! А я ручку всю раскрутил. Забирайте.', no: 'Это ключ от общаги звенит. Его, боюсь, надо оставить.' },
              worker: { yes: 'Держи. Монеты в одну сторону, шайбы в другую. Эту не бери: шайба, а с виду десятка.', no: 'Слышишь звон? Гайки. Монеты я бы и сам по звуку отличать хотел.' },
              coat: { yes: 'Нашлась. Наконец-то пиджак перестанет изображать копилку.', no: 'Это связка ключей. Карман с деньгами, увы, ведёт себя тихо.' },
              fat: { yes: 'Держи сдачу с ларька. Я её уже два раза вместе с семечками чуть не съел.', no: 'Звенит-то ложка о крышку. Я обед из дома ношу.' },
              drunk: { yes: 'Ага, поймал! Она неделю от меня по подкладке бегала. Теперь твоя.', no: 'Слышал звон? Это у меня в сумке бутылка о бутылку. Карманы можешь даже не слушать.' },
              granny: { yes: 'А у тебя ухо хорошее. На, пригодится.', no: 'Это напёрсток. Дать послушать могу, а на сдачу его не примут.', food: 'Звенит у меня напёрсток, милок. Зато есть чем перекусить — вот, держи.' }
            } },
          { id: 'gloves', line: 'На тёплые перчатки откладываю. Подкинешь мелочи? Летом, говорят, они дешевле, да пальцам-то сейчас зима.',
            replies: {
              student: { yes: 'Держите. Я в перчатках даже экран носом листать научился. Того стоит.', no: 'Сам пока в одной хожу. Вторую, кажется, в автобусе оставил. Денег до стипендии впритык.' },
              worker: { yes: 'Держи на перчатки. Примеряй обе, а то мне как-то две правых выдали.', no: 'Я бы добавил, да уже сменщику на рукавицы одолжил. У нас сегодня сбор по всему двору, что ли?' },
              coat: { yes: 'Возьмите. И сожмите кулак, когда мерить будете. Мои вот по шву уже пошли.', no: 'Сочувствую, но сегодня без наличных. Перчатки мои, как видите, тоже давно просят замены.' },
              fat: { yes: 'На, бери. В хороших перчатках и за горячую шаурму браться удобнее.', no: 'У меня как раз осталось жене на варежки. Вторую зиму напоминает, неудобно уже.' },
              drunk: { yes: 'Держи. Я свои теперь на одной верёвке ношу. Потерять можно, зато сразу обе.', no: 'Не выйдет, друг. Свои-то у меня из разных пар, и ни одна пара не моя.' },
              granny: { yes: 'Бери, а пока пальцы в рукаве в кулак собери. Вот так, большой внутрь.', no: 'Денег сегодня не дам, сынок. А рукава оставь подлиннее, хоть так кисти прикроешь.', food: 'На перчатки отложить не могу. Может, поешь хотя бы? Вот, с собой возьми.' }
            } }
        ] },
      askAboutYard: { skill: 'social', level: 1, label: 'Спросить про двор', description: 'Разузнать, где поесть, сдать тару или устроить ночлег.',
        hints: {
          student: [
            '«У меня обед студенческий: чай за {tea} ₽ и хлеб за {bread} ₽. В ларьке, вон там».',
            '«Газету в баке найдёшь — глянь прогноз. Я так решаю, в чём идти на пары. Иногда даже иду».',
            '«Кофе три в одном в ларьке бери, если носом клюёшь. Что там за три, не знаю, но спать перехочется».',
            '«В палатке кроссовки есть. В них быстрее ходишь. За автобусом проверял лично».',
            '«Прочитанную газету можно сунуть в утепление у труб. Наконец-то от прогноза точно будет тепло».'
          ],
          worker: [
            '«Я по пути бутылки сдаю. Приёмка с {recycleOpen} до {recycleClose}, по {bottle} ₽ за штуку».',
            '«К вечеру жильцы пакеты к баку тащат. Загляни в бак сразу за ними: свежак сверху, даже копать обидно».',
            '«Для бака хозяйственные перчатки в палатке есть. В них смелее в железки лезешь, быстрее дело идёт».',
            '«Лаз у трубы продувает? Как подстелишь и утеплишь, ставь заслон из досок. Плёнка тоже сгодится».',
            '«Замёрз — разожги костёр у теплотрассы. От трубы греешься снизу, от огня сбоку. Переворачиваться по вкусу».'
          ],
          coat: [
            '«Палатку с одеждой открывают в {stallOpen}, сворачивают в {stallClose}. Часы у меня точные».',
            '«Вот пальто из палатки. В таком в подъезде дольше греться дают. Жильцы, видимо, ждут, когда я сам у них квартплату спрошу».',
            '«Присмотритесь к пиджаку. На просьбы о мелочи охотнее откликаются. Забавно, правда? Сначала потратьтесь».',
            '«Если домофон заперт, дождитесь жильца и зайдите следом. Только не стойте у открытой двери, как будто вам нужно письменное приглашение».',
            '«В дождевике мокрый снег переносить проще. Надевается поверх пальто. Сам я, конечно, предпочёл бы такси».'
          ],
          fat: [
            '«Шаурма в ларьке по {shawarma} ₽. Закрываются в {kioskClose}. Цену я запомнил, сдачу всегда два раза считаю».',
            '«Лапшу в ларьке бери, когда и голодно, и холодно. Чай с хлебом приходится держать в двух руках. Тут всё в одной».',
            '«В ларьке спроси пакет с ручками. Пока донёс хлеб без него, пришлось освободить место. Хлебом».',
            '«Если еда в пакет не влезла, смотри под ноги. Шаурма сама обратно в окошко не запрыгнет».',
            '«Объедки в баке попадаются. Наешься, конечно, только живот потом может высказать особое мнение».'
          ],
          drunk: [
            '«Банку не выбрасывай! В приёмке за неё {can} ₽. Мелочь? А если две?»',
            '«Найдёшь спички с картоном — вот тебе и костёр. Газета тоже годится, только дочитать успей».',
            '«Газету в костёр подкидывай, пока тот горит. Я однажды дождался, пока погаснет. Вот тогда и выяснилось, у кого спички».',
            '«Чекушка греет, да здоровью боком выходит. Возьми горячий чай. Скажешь в ларьке, что это я посоветовал, — не поверят».',
            '«Если помяли бока, посиди на лавке — полегчает. Я её так и называю: участковый терапевт».'
          ],
          granny: [
            '«У труб лаз есть. На подстилку нужно кусков картона — {cardboard}. Выбирай сухие, а то на бетоне мигом отсыреют».',
            '«Мёрзнешь — зайди в подъезд погреться. Только как увидишь мента у двери, не толкайся. Он там вовсе не коврик поправляет».',
            '«Для утепления в лаз тащи газеты и тряпьё. Газету сперва прочти. Потом ведь будешь спать и думать, чем там всё кончилось».',
            '«Когда у лаза заначку доделаешь, лишние вещи там оставляй. А то полную сумку тары и из окна слышно».',
            '«Старый шарф в палатке бывает. Шею бережёт, и с аккуратным человеком охотнее разговаривают. Только концы заправляй, а то в двери прищемит».'
          ]
        } },
      goodbye: { level: 1, label: 'Попрощаться', description: 'Закончить разговор и отпустить собеседника.',
        openers: [
          { id: 'later', line: 'Ладно, не буду задерживать. Доброго пути.',
            replies: {
              student: 'Давайте! Если что, я тут после пар хожу.',
              worker: 'Давай, земляк. Под ноги гляди, скользко.',
              coat: 'Благодарю. Всего доброго.',
              fat: 'И тебе. Если в другой раз запахнет пирогами — зови, вместе выясним откуда.',
              drunk: 'Бывай, друг. Рад был повидаться!',
              granny: 'И ты иди осторожно, у ступенек намело.'
            } },
          { id: 'hello', line: 'Да я просто поздороваться хотел. Увидимся.',
            replies: {
              student: 'А, тогда привет! И уже пока.',
              worker: 'Здоровкаться — дело хорошее. Бывай.',
              coat: 'Здравствуйте. Вернее, уже до свидания.',
              fat: 'Ну здравствуй на обратную дорогу тоже.',
              drunk: 'Вот! Узнают ещё на районе. Будь здоров.',
              granny: 'Приятно, что узнаёшь. До свидания, милок.'
            } },
          { id: 'warm', line: 'Ну, пойду ноги разомну, пока не примёрз. Счастливо.',
            replies: {
              student: 'Увидимся. Мне тоже пора ноги размять, а то как после двух пар подряд.',
              worker: 'Давай. Стойку «ноги вместе» здесь долго не выдержишь.',
              coat: 'Всего хорошего. Я и сам уже засиделся в конторе.',
              fat: 'Бывай. На ходу хоть кровь по ногам погоняешь.',
              drunk: 'Левой-правой, командир! У меня как раз правая свободна.',
              granny: 'Иди, иди. Стельки вечером вынь просушить.'
            } }
        ],
        topics: {
          mitten: { line: 'Ну, варежка на ветке хозяина подождёт. А мне пора. Увидимся.',
            replies: {
              student: 'Заберу сейчас! И бабушке про вас расскажу.',
              worker: 'Спасибо, земляк. Жена спросит, где нашёл, — скажу, на дереве выросла.',
              coat: 'Заберу оленя по дороге. Дочь обрадуется. Спасибо вам.',
              fat: 'Загляну к продавщице, спрошу. Бывай!',
              drunk: 'Ветку запомнил. Увижу кого с одной голой рукой — отправлю к ветке!',
              granny: 'Ну и ступай. Хорошо, что повыше повесил.'
            } },
          pancakes: { line: 'Хорошо блины вспомнились. Ладно, пойду, а то уже третий мысленно съел.',
            replies: {
              student: 'Приятного мысленного! У меня на вечер тесто осталось, попробую ещё раз.',
              worker: 'Бывай. Пожалуй, вечером сам к плите встану.',
              coat: 'Да, запах и правда есть. Всего вам хорошего.',
              fat: 'Третий-то со сметаной считай. Иначе зря съел.',
              drunk: 'Вот и я наелся рассказами. Ненадолго, правда. Бывай!',
              granny: 'Перед сном сковородку не вспоминай. Утром вкуснее. Ступай.'
            } },
          accordion: { line: 'Услышу, чем песня кончилась, при встрече напою. Бывай.',
            replies: {
              student: 'Договорились, я тогда запись включу с припева.',
              worker: 'Ты только Петровичу не свисти под руку. До встречи.',
              coat: 'Буду признателен. Днём, если можно.',
              fat: 'Отлично. А то мы теперь вдвоём её не допели.',
              drunk: 'Узнаешь — свистни! Я басом вступлю.',
              granny: 'Иди уж, певец. Если Нинка с картошкой не вмешается — услышишь.'
            } },
          first_pay: { line: 'Вот ведь сколько всего в одной получке помещалось. Хорошо вспомнили. До встречи.',
            replies: {
              student: 'Ага. Я теперь думаю, может, опять маме тортик купить.',
              worker: 'Бывай. Ключ на тринадцать увидишь — привет ему передай.',
              coat: 'Да, занятно. Всего хорошего.',
              fat: 'Бывай. Арбузы с тех пор сам выбирать научился.',
              drunk: 'И тебе спасибо. Давно я её не вспоминал.',
              granny: 'Хороший разговор. А флакон-то у меня до сих пор на трюмо.'
            } },
          snowbird: { line: 'Увижу ещё воронин цветок — обойду, пусть кому-нибудь достанется. До встречи.',
            replies: {
              student: 'Спасибо! Увижу такой след, сперва сниму, потом уж пойду дальше.',
              worker: 'Давай. Завтра сам под ноги погляжу, вдруг и мне такая посадка попадётся.',
              coat: 'Теперь, боюсь, буду от машины до двери каждый след разглядывать.',
              fat: 'Бывай. Корку чуть в стороне положу.',
              drunk: 'И правильно. Клумба казённая, топтать не велено!',
              granny: 'Вот и ладно. Пусть полежит до следующего снега.'
            } },
          cat: { line: 'Пойду проверю, как там мой начальник на подоконнике.',
            replies: {
              student: 'Увидимся! Спросите у него насчёт летней практики.',
              worker: 'Бывай. Моему бы мастеру тоже форточку прикрыть.',
              coat: 'Передайте руководству моё почтение.',
              fat: 'Давай. Если начальник обед спросит, скажи, что смета на сосиски ещё не утверждена.',
              drunk: 'Товарищу коту от меня мяу!',
              granny: 'Ступай. Мурзику от тебя только и надо, чтоб голубя не спугнул.'
            } },
          hotel: { line: 'Ладно, гостиничный сезон открою, как постель под трубой приготовлю.',
            replies: {
              student: 'Если в общаге опять батареи отключат, к вам на экскурсию приду.',
              worker: 'Давай. Подстилку бери потолще, бетон — постель жёсткая.',
              coat: 'Приятного отдыха. Счёт за отопление вам точно не подсунут.',
              fat: 'Бывай. Как обживёшься, табличку «мест нет» не забудь.',
              drunk: 'Ага! На первом этаже встретимся, если что.',
              granny: 'Иди, квартиросъёмщик. Картон не забудь.'
            } },
          forecast: { line: 'Полечу-ка следом за прогнозом. Вдруг ещё кроссворд догоню.',
            replies: {
              student: 'Если поймаете — начинайте с «ветер», пять букв.',
              worker: 'Давай. Мою накладную встретишь — придави кирпичом.',
              coat: 'Ищите с подветренной стороны. Удачи.',
              fat: 'Пирожком сверху прижми в следующий раз. Бывай.',
              drunk: 'Лови спорт! Прогноз я уже видел!',
              granny: 'Ступай. А погоду завтра опять по белью проверим.'
            } },
          pockets: { line: 'Пойду. Теперь при примерке буду заранее говорить, когда меня искать.',
            replies: {
              student: 'Найдёте октябрьский проездной — это мой!',
              worker: 'Бывай. Подкладку только отвёрткой не ковыряй.',
              coat: 'Удачных поисков. Мой бухгалтер вам бы посочувствовал.',
              fat: 'Если ужин в кармане найдёшь — не жди весны, ешь сразу. Бывай!',
              drunk: 'А я варежку больше обратно в карман не суну. Бывай!',
              granny: 'Иди. Дырку нащупаешь — зашей, а то искать будешь уже по двору.'
            } },
          tariff: { line: 'Пойду, а то наговорим тут на весь отопительный сезон. Счастливо!',
            replies: {
              student: 'Квитанцию мне в зачётку! До встречи.',
              worker: 'Ладно, грейся. В расчётный листок такой тариф точно не поместится.',
              coat: 'Хорошо. Главное, без автопродления.',
              fat: 'Бывай. Я всё-таки за чаем.',
              drunk: 'А за вторую улыбку пусть следующий погреется!',
              granny: 'Иди, тариф. Уши-то прикрой.'
            } },
          explain: { line: 'Ладно, прикину ещё раз, что мне по карману. Спасибо за разговор.',
            replies: {
              student: 'С хлеба начинайте. На сладком я как-то неделю не протянул.',
              worker: 'Давай, земляк. Поешь горячего, если выйдет.',
              coat: 'Надеюсь, на обед хватит. Всего хорошего.',
              fat: 'Спроси, свежая ли лапша. Есть разница!',
              drunk: 'Бывай! На сытый желудок даже этот двор нарядней.',
              granny: 'Ступай. Хорошо, что про еду прямо сказал.'
            } },
          favor: { line: 'Ну, теперь держится. Счастливо добраться!',
            replies: {
              student: 'Спасибо! Эту лямку после сессии первой на каникулы отпущу.',
              worker: 'Бывай, земляк. А пряжка-то хорошо села.',
              coat: 'Благодарю. Теперь и тяжесть почти не чувствуется.',
              fat: 'Пакет-то по дороге сам легче станет. Бывай!',
              drunk: 'Донесу! Главное, самому по дороге не потеряться.',
              granny: 'Иди, милок. И ладони теперь целы, и платок при деле.'
            } }
        },
        yard: {
          student: [
            { line: 'Спасибо, на чай с хлебом прикину. Удачи на парах.', reply: 'Спасибо! Если чай брать первым, руки хоть согреются, пока хлеб режут.' },
            { line: 'Газету теперь сперва разверну. Посмотрим, в чём завтра ходить. Бывай.', reply: 'Я тоже гляну. Только расписание пар погода ещё ни разу не отменила.' },
            { line: 'Запомнил про кофе. Если начну клевать носом, знаю куда идти.', reply: 'Ага. Перед сном лучше не берите, проверено на сессии.' },
            { line: 'Спасибо за наводку на кроссовки. Может, и я автобус когда догоню.', reply: 'До встречи! Начните с того, который ещё стоит.' },
            { line: 'Сперва почитаю, потом утеплюсь. Спасибо за газету… в смысле, за идею.', reply: 'Пожалуйста. Кроссвордом кверху кладите, вдруг не уснётся.' }
          ],
          worker: [
            { line: 'Понял, с бутылками пойду до закрытия. Спасибо, что подсказал.', reply: 'Давай. Я однажды на минуту опоздал — всю смену с мешком звенел.' },
            { line: 'Значит, к баку загляну после жильцов. Бывай.', reply: 'Ага. Как крышка хлопнет — обернись.' },
            { line: 'Уговорил, погляжу в палатке хозяйственные перчатки. До встречи.', reply: 'Давай. Швы на пальцах проверь, им первым достанется.' },
            { line: 'Доски для заслона приберегу. Если плёнка попадётся — тоже в дело. Спасибо.', reply: 'Вот и ладно. Без сквозняка совсем другое жильё.' },
            { line: 'Разведу у трубы костёр. Если от меня жареным запахнет — пора переворачиваться. Бывай.', reply: 'Давай, шашлычник. Хоть сапоги к огню вплотную не ставь.' }
          ],
          coat: [
            { line: 'Часы палатки запомнил. Спасибо за подсказку.', reply: 'Не за что. Приятных покупок.' },
            { line: 'Буду знать, почему жильцы вам дверь придерживают. Всего хорошего.', reply: 'До свидания. Остаётся надеяться, что всё-таки из вежливости.' },
            { line: 'Примерю пиджак на досуге. Для начала хотя бы в зеркале при деньгах похожу.', reply: 'Зеркало там бесплатное. Удачи вам.' },
            { line: 'Дождусь жильца у двери. Спасибо, письменного приглашения ждать не буду.', reply: 'Совершенно верно. Всего доброго.' },
            { line: 'Если снег размокнет, поищу дождевик. Спасибо.', reply: 'Берите посвободнее, тогда и поверх куртки налезет. Всего доброго.' }
          ],
          fat: [
            { line: 'Понял, где искать шаурму. Бывай, пока я не начал меню вслух читать.', reply: 'Ещё увидимся. У окошка обычно и увидимся.' },
            { line: 'Возьму лапшу, когда промёрзну. Руки свободны — ложку хоть держать есть чем.', reply: 'Вот! Сразу видно, человек понял. Бывай.' },
            { line: 'Попробую пакет с ручками. Может, хлеб домой целым донесу.', reply: 'Донести-то донесёшь. А как потом по дороге без закуски? Бывай.' },
            { line: 'Если покупка не влезет, посмотрю под ноги. Спасибо за науку.', reply: 'Ага. Особенно если покупка в бумаге и вкусно пахнет.' },
            { line: 'С объедками буду поосторожнее. Береги живот.', reply: 'И ты свой. Другого в ларьке не купишь.' }
          ],
          drunk: [
            { line: 'Ладно, банки придержу до приёмки. Звенеть буду по делу. Бывай.', reply: 'Давай! Вторую найдёшь — считай, уже ансамбль.' },
            { line: 'Спасибо. Газету сперва дочитаю, потом уж спичку чиркну.', reply: 'Бывай! Ответы на кроссворд-то сбереги!' },
            { line: 'Понял: подкидывать, пока ещё горит. Спички по двору потом не выпрашивать.', reply: 'Вот! Это я тебе целую холодную ночь в одну фразу уместил.' },
            { line: 'Пойду за чаем. Кто присоветовал, так и быть, не выдам.', reply: 'Спасибо, друг. А то у меня тут репутация.' },
            { line: 'Пойду к твоему терапевту на лавку. Прощай, доктор.', reply: 'Садись, там без записи!' }
          ],
          granny: [
            { line: 'Начну с картона. На голом бетоне и правда каждую косточку помнишь. До свидания.', reply: 'Иди, милок. Посуше кусок выбирай.' },
            { line: 'Погреюсь в подъезде, когда у двери свободно. Спасибо вам.', reply: 'Ступай. И дверь за собой тихонько.' },
            { line: 'Газету прочту, а потом в лаз. Хоть буду знать, на чём сплю.', reply: 'Вот и хорошо. Тряпьё сухое тоже подбирай.' },
            { line: 'Как обустроюсь, сложу бутылки в заначку. Под окнами станет потише.', reply: 'И тебе легче, и у меня голова целее. До свидания.' },
            { line: 'Присмотрюсь к шарфу. А концы заправлю, без шлейфа обойдусь. Спасибо.', reply: 'И правильно. Красиво, когда целое. Ступай, милок.' }
          ]
        } },
      explain: { level: 2, label: 'Объяснить, на что', description: 'Сказать прямо, что собираешь на еду.',
        feedback: '«На еду? Так бы и сказал». Тебя выслушали.' },
      joke: { skill: 'social', level: 2, label: 'Пошутить', description: 'Попробовать рассмешить собеседника.',
        variants: [
          { id: 'cat', line: 'У нас кот в окне взял меня дворником. За чистоту отвечает он, а мёрзнуть поручил мне.',
            replies: {
              student: '«А практику он подписывает? Я бы к вам на полставки».',
              worker: '«У меня такой же мастер. Только мой ещё разговаривает, к сожалению». Работяга усмехнулся.',
              coat: '«Судя по окну, кабинет у начальника лучше моего». Он приподнял воротник и улыбнулся.',
              fat: '«А я-то думал, он за шаурмой надзирает. С какой серьёзной мордой в сторону ларька смотрит!»',
              drunk: 'Он вытянулся по стойке смирно. «Товарищ кот, разрешите дворнику обед!»',
              granny: '«Начальника-то Мурзиком зовут». Бабка захихикала. «И впрямь, голуби у него по струнке ходят!»'
            } },
          { id: 'hotel', line: 'У труб можно гостиницу открыть. Отопление центральное, а главный сервис — чтобы картон под боком не уехал.',
            replies: {
              student: '«Соседей сверху нет? Всё, у вас лучше, чем в общаге».',
              worker: '«Выходит, это я в твоей гостинице в ноябре отопление чинил!» Работяга засмеялся. «За сварной шов отдельная плата».',
              coat: '«Номер у вас, я полагаю, люкс. Стандарт — это между трубами?»',
              fat: '«А завтрак в такой номер по трубе присылают? Мне тогда два яйца вкрутую — чтоб по дороге не расплескались!»',
              drunk: '«Мне номер на первом этаже! Чтоб, если с картона съеду, недалеко падать!»',
              granny: '«Номер у него. Картон подстелил хоть? Вот и весь тебе гостиничный сервис».'
            } },
          { id: 'forecast', line: 'В газете обещали штиль. Вырвало её из рук в тот самый момент, когда я до прогноза дочитал.',
            replies: {
              student: '«Это вам исправленное издание вслед полетело. Первое было с опечаткой».',
              worker: '«Вчера так накладную ловил. Мне потом за эту погоду ещё и расписаться пришлось».',
              coat: '«Оперативно у них редакция отзывает тираж». Он позволил себе усмешку.',
              fat: '«Вы бы завтрак в неё завернули. От меня газета с пирожком ещё ни разу не улетала».',
              drunk: '«Увидишь её ещё раз — припиши от руки: по уточнённым данным, летит отлично!»',
              granny: '«А у меня прогноз на верёвке сохнет. Как простыня соседу в окно полезет — значит, штиль кончился!»'
            } },
          { id: 'pockets', line: 'Примерил пиджак в палатке. Карманы такие глубокие, что я впервые в жизни долго искал деньги.',
            replies: {
              student: '«У меня в зимней куртке так же. Один раз до весны искал. Нашёл проездной за октябрь».',
              worker: '«В одном кармане у меня деньги, в другом гвозди. Про деньги бывало забывал. Про гвозди — ни разу».',
              coat: '«Понимаю. У меня бухгалтер этим целый отдел занимает». Он усмехнулся собственному сравнению.',
              fat: '«Мне бы такой пиджак! В один карман обед, в другой ужин. И денег уже искать незачем».',
              drunk: 'Он ощупал собственную куртку и просиял. «Вот это ты вовремя пошутил! Варежка нашлась!»',
              granny: '«Ты до подкладки добрался? А то мой дед там пенсию прятал. Искали тоже долго».'
            } },
          { id: 'tariff', line: 'У меня зимний тариф: за улыбку можно погреться?',
            replies: {
              student: '«А студенческая скидка на улыбку есть?» Ответ придумал сразу и сам собой остался доволен.',
              worker: '«За улыбку? Смотри, бухгалтерия услышит — с нового месяца все в улыбках зарплату получим!»',
              coat: '«А НДС в улыбку включён?» — поинтересовался он с деловым видом.',
              fat: '«А если во весь рот улыбнуться, второй стакан в подарок?» Он показал, как собирается платить.',
              drunk: '«Смотри, я за двоих плачу!» Он заулыбался во весь рот.',
              granny: '«А зубы морозить кто будет? В моём возрасте улыбка дорого обходится».'
            } }
        ] },
      favor: { level: 3, label: 'Предложить помощь', description: 'Подсобить с вещами. Если человек примет помощь и даст денег, получишь ещё 5 ₽.',
        extraMoney: 5, feedback: 'Ты предложил помочь с поклажей.' }
    }
  },
  npcs: {
    passerby: {
      emoji: '🚶', name: 'Прохожий',
      talkSeconds: 5,
      /* Типы прохожих. weight — как часто встречается; giveChance и giveMax — границы по навыку для спокойного собеседника в тихую погоду.
         Размер подачки определяется отдельно при удачной просьбе. */
      kinds: {                                // speedMin/speedMax — доля спокойного шага героя до поправки на фазу суток
        student: { emoji: '🧑‍🎓', name: 'Студент', weight: 0.38, giveChance: .30, giveMax: .79, moneyMin: 2, moneyMax: 6, speedMin: 0.55, speedMax: 0.65 },     // бодро, под музыку
        worker: { emoji: '👷', name: 'Работяга', weight: 0.30, giveChance: .28, giveMax: .80, moneyMin: 6, moneyMax: 14, speedMin: 0.40, speedMax: 0.50 },      // идёт с работы, никуда не спешит
        coat: { emoji: '🕴', name: 'Мужик в пальто', weight: 0.17, giveChance: .09, giveMax: .65, moneyMin: 30, moneyMax: 50, speedMin: 0.60, speedMax: 0.70, weatherHurry: true },
        fat: { emoji: '🧍‍♂️', name: 'Толстяк', weight: 0.15, giveChance: .23, giveMax: .76, moneyMin: 4, moneyMax: 10, speedMin: 0.27, speedMax: 0.33 },         // идёт вразвалочку, подаёт средне
        /* Правка 016: ночной прохожий. Медленный, качается (sway — только вид, на логику не влияет), подаёт чаще дневных,
           а сумма — лотерея по таблице money: то мелочь, то купюра. weight здесь не используется: кто ходит — решает расписание (schedule.*.kinds). */
        drunk: { emoji: '🥴', name: 'Подвыпивший', weight: 0, giveChance: .32, giveMax: .79, speedMin: 0.22, speedMax: 0.30, sway: 0.010,
          money: [{ weight: 0.55, min: 1, max: 4 }, { weight: 0.33, min: 6, max: 15 }, { weight: 0.12, min: 30, max: 80 }] }
      }
    },
    granny: {
      emoji: '👵', name: 'Бабка',
      talkSeconds: 5,
      giveChance: .43, giveMax: .86, scrapsChance: 0.5,
      money: 10,
      appearPhase: 'day',                     // правка 016: выходит в фазе «день» расписания (schedule), раз в сутки
      appearFrom: 0.05, appearTo: 0.6,        // окно появления: доли длины этой фазы
      speedFactor: 0.293,                    // доля спокойного шага героя
      sitMin: 60, sitMax: 90,                 // сколько сидит на лавке, с (было 40–60: сутки длиннее)
      path: [                                 // подъезд -> лавка у подъезда (садится с краю) -> подъезд
        { x: 0.46, y: 0.262, door: 'out' }, { x: 0.5, y: 0.305 }, { x: 0.549, y: 0.299, sit: true }, { x: 0.5, y: 0.305 }, { x: 0.46, y: 0.262, door: 'in' }
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
    }
  },

  encounterText: {
    observations: {
      student: {
        cheerful: ['В телефоне у студента нарисован преподаватель верхом на циркуле. «Сам декан перепостил», — хвастается студент и гасит экран.', 'Студент пнул комок снега точно между двумя следами. Увидел, что ты смотрел, и тихо сказал: «Один — ноль».'],
        gloomy: ['У студента из конспекта торчит листок с красными пометками. Он спрятал его под обложку. «Маме вот как сказать…»', 'Из наушников доносится голос: «До экзамена допускаются…» Студент выключает запись посреди списка и прячет наушники в карман.'],
        hurried: ['Студент запихнул конспект в рюкзак и вытянул шею на звук мотора. Выдохнул: «Не мой. До моего ещё минутка».', 'У студента развязался шнурок. Он сунул конец в ботинок, посмотрел на часы. «Я слушаю. Только быстро, ладно?»'],
        calm: ['Студент меняет песню в телефоне. Один наушник так и оставил висеть на воротнике.', 'Студент стирает снег с обложки конспекта. «Сопротивление материалов», — читает он и сдувает последнюю снежинку.']
      },
      worker: {
        cheerful: ['Работяга наиграл пальцами по крышке термоса знакомый припев. Постучал ещё раз, с завитушкой, и улыбнулся.', 'Из нагрудного кармана у работяги торчит записка: «Папа, ложку не забыл?» Он хлопнул себя по другому карману. Звякнуло.'],
        gloomy: ['Работяга глотнул из термоса уже остывшего чаю. Завинтил крышку и тяжело вздохнул.', 'Работяга вытащил из сумки лопнувшую рулетку. Подержал в руках и аккуратно смотал обратно.'],
        hurried: ['«Да иду я, иду!» Работяга закончил звонок, сунул телефон в нагрудный карман и повернулся к тебе. «Чего хотел, земляк?»', 'Работяга перекинул ремень сумки через плечо и глянул на часы. «Если дело на минуту — говори».'],
        calm: ['Работяга сделал глоток из термоса. Докручивая крышку, кивнул тебе: «Здорово».', 'Работяга подтянул винтик на дужке очков. Убрал отвёртку и глянул на тебя поверх стёкол.']
      },
      coat: {
        cheerful: ['Мужчина в пальто закончил разговор словами «Вот это новость!» и никак не спрячет улыбку в воротник.', 'Мужчина в пальто скользнул по льду, чудом удержался и раскланялся перед единственным зрителем — тобой.'],
        gloomy: ['Мужчина в пальто дослушал голосовое сообщение. Спрятал телефон и ещё немного постоял, глядя перед собой.', 'У мужчины в пальто из бумажника выглянула старая фотография на двоих. Он бережно убрал её и застегнул карман.'],
        hurried: ['«Задержусь на две минуты», — говорит мужчина в пальто. Убрал телефон, поправил манжету. «Вы что-то хотели?»', 'Мужчина в пальто застёгивается через пуговицу. Замечает ошибку, смотрит на часы и оставляет как есть.'],
        calm: ['Мужчина в пальто загнул уголок последней колонки, сложил газету вчетверо и убрал её в карман.', 'Мужчина в пальто протёр стекло часов краем рукава. Поднёс циферблат к уху, прислушался и довольно кивнул.']
      },
      fat: {
        cheerful: ['Толстяк негромко напевает. Дотянул припев до высокой ноты, перевёл дух и подмигнул тебе.', 'Толстяк выдул облако пара и попытался проткнуть его пальцем. Попал в пустоту и сам же расхохотался.'],
        gloomy: ['У толстяка в руке мандарин. Он снял кожуру одной лентой, завернул дольки в салфетку и убрал. Есть, похоже, расхотелось.', 'Толстяк достал из бумажного пакета пирожок. Повертел его и завернул обратно, даже не откусив.'],
        hurried: ['У толстяка в сумке гремит кастрюля. Он поправил полотенце под крышкой, дёрнул молнию. «Только коротко, а то остынет».', 'Из кармана толстяка звонит телефон. «Уже несу, ставь чайник!» Он закончил звонок и перехватил пакет с батоном. «Ага, слушаю».'],
        calm: ['Толстяк очистил мандарин. Кожуру завернул в бумажку, дольку прожевал и кивнул тебе.', 'Толстяк вдохнул запах из своего свёртка. «С капустой». Развернул краешек для проверки. «Так и знал».']
      },
      drunk: {
        cheerful: ['Мужичок отбил каблуком ритм, сделал рукой дирижёрский росчерк и поклонился тебе как целому залу.', 'Мужичок пытается насвистеть мелодию через щербинку. Вместо последней ноты получается смешок.'],
        gloomy: ['У мужичка оторвалась пуговица. Он долго примерял её к пустой петельке, потом вздохнул и убрал в карман.', 'Мужичок разглаживает смятую фотографию на ладони. Наконец прячет её за пазуху и долго застёгивает куртку.'],
        hurried: ['Мужичок торопливо застегнул куртку. «Только бы дождался». Глянул за твоё плечо и переминается с ноги на ногу.', 'Мужичок окликнул кого-то за твоим плечом. Обознался. «И шапка не синяя. Эх, уйдёт ведь».'],
        calm: ['Мужичок поудобнее замотал шарф, оставив нос на воздухе. Кивнул тебе как соседу.', 'Мужичок катит кругляш льда по ладони и щурится на свет. «Чистый, хоть в часы вставляй», — бормочет себе.']
      },
      granny: {
        cheerful: ['Бабка пересчитала воробьёв на снегу. Один прилетел позже всех, и она картинно погрозила опоздавшему пальцем.', 'Бабка завязала платок до самых бровей. «Вот теперь попробуй узнай!» — улыбнулась она и высунула нос.'],
        gloomy: ['Бабка разгладила сложенный вчетверо рисунок, на котором её нарисовали выше дома. Спрятала обратно в сумку. «Давно гостила…»', 'Бабка достала из кошелька трамвайный билетик. «На двоих тогда брали». Сложила его по старому сгибу.'],
        hurried: ['Бабка одной рукой придерживает авоську, другой натягивает варежку. «Сейчас ведь закроют», — бормочет себе под нос.', 'Бабка пробежала пальцем по списку покупок. «Хлеб, молоко… чего ж я опять забыла?» Сунула список в карман. «Ты говори, я слушаю».'],
        calm: ['Бабка носком варежки смахнула снег с очков. Поглядела сквозь них, протёрла как следует платочком.', 'Бабка завязала мешочек с семечками на двойной узел. «А то прошлый раз у меня полный карман подсолнухов чуть не взошёл».']
      }
    },
    lines: {
      askAboutYard: 'Я тут ещё осваиваюсь. Что про этот двор полезно знать?',
      explain: 'Откладываю на еду. Хочу, чтоб на горячее хватило.',
      favor: 'Давай с поклажей подсоблю? Бывает, ручка так врежется, аж пальцы сводит.'
    },
    failures: {
      mitten: {
        student: '«У меня такие в детском саду были. Вы в родительском чате лучше спросите».',
        worker: '«Я в рукавицах работаю. Варежки у меня с ясель кончились». Про ветку он так и не спросил.',
        coat: '«У меня перчатки». Он повёл плечами. «С варежкой я вам не помощник».',
        fat: '«Мои дома на батарее. Значит, эта точно не моя».',
        drunk: '«Не моя. А проверять меня лучше не посылай: ещё вместе с веткой принесу».',
        granny: '«На ветке и оставь, милок. Мне-то чужую зачем сватаешь?»'
      },
      pancakes: {
        student: '«У меня в общаге плита сломалась. Можно хоть до обеда блины не вспоминать?»',
        worker: '«Слушай, я уже свой судок до крошки выскреб. Не трави душу».',
        coat: '«После банкета я блины ещё неделю вспоминать не хочу. Особенно с икрой».',
        fat: '«Я на запах уже четыре раза к окну подходил. Мне сейчас про блины лучше не надо».',
        drunk: '«Тебе блинами пахнет, а мне шарфом. Мокрым». Он поёжился.',
        granny: '«Пахнет, как же. А мне врач мучное велел исключить. Давай про другое».'
      },
      accordion: {
        student: '«Я в наушниках лекцию слушал. Если там и был припев, я его тоже пропустил».',
        worker: '«Вчера после смены я бы и оркестр проспал. Спроси у ночной бригады».',
        coat: '«У меня за этой стеной ребёнок еле уснул. С удовольствием бы забыл этот припев».',
        fat: '«Я эту песню еле из головы выкинул. Не напевай, договорились?»',
        drunk: '«Мне вчера сказали: ещё раз с гармошкой придёшь, отправим обратно. Без припева, друг».',
        granny: '«Я соседу уже всё про гармошку сказала. Тебе повторять не стану».'
      },
      first_pay: {
        student: '«У меня пока только стипендия. Про первую получку меня и дома уже замучили».',
        worker: '«Мне бы последнюю увидеть. Про первую как-нибудь потом».',
        coat: '«Чужая зарплата — странная тема для знакомства, вы не находите?» Он одёрнул манжету.',
        fat: '«Я домой её целиком отнёс. Что дальше было — дело семейное».',
        drunk: '«Я и последнюю не помню. Давай бухгалтерию закрывать».',
        granny: '«Это долгая история, милок. Я её внучке обещала первой рассказать».'
      },
      snowbird: {
        student: '«Да я со своими глазами эти узоры с солью перепутаю. Мне бы просто не поскользнуться».',
        worker: '«У меня после смены от разметки перед глазами рябит. Хоть во дворе от чертежей отдохну».',
        coat: '«Боюсь, орнитолог из меня никудышный. Для меня след в снегу и есть след».',
        fat: '«Я тут сам вчера так же растянулся. Красивого мало». Он пощупал локоть.',
        drunk: '«Ворона, говоришь? А я-то думал, кто у меня корку стащил». Он нахмурился, припоминая пропажу.',
        granny: '«Знаю я этих художниц. Пусть лучше мои семечки в покое оставят».'
      },
      cat: {
        student: '«Я только что с подработки. Даже кота начальником видеть сегодня не хочу».',
        worker: '«Я на своего мастера уже насмотрелся. Давай хоть кота с ним не равнять».',
        coat: '«Вы меня остановили, чтобы представить начальству?» Он посмотрел на часы.',
        fat: '«Кот-то хоть во дворе не мёрзнет. Чего тут весёлого?»',
        drunk: '«Тише. Мы с этим котом ещё из-за сосиски не помирились».',
        granny: '«Какой ещё начальник? Это Мурзик. У него вся должность — голубей считать».'
      },
      hotel: {
        student: '«У нас на прошлой неделе батарея лопнула. Про центральное отопление шутить ещё рано».',
        worker: '«Это я там в ноябре трубу латал. Тебе смешно, а я три часа в мокрых рукавицах провозился».',
        coat: '«Если там и правда приходится спать, я не нахожу это смешным».',
        fat: '«Мне вот от мысли про такой ночлег совсем не весело». Он поёжился.',
        drunk: '«Сам между труб однажды застрял. Ты шути, а я тогда сапог потерял».',
        granny: '«Номер у него. Застудишь почки, шутник, ещё наплачешься».'
      },
      forecast: {
        student: '«А у меня так лист с зачётом улетел. Я за ним два двора бежал». Не улыбнулся.',
        worker: '«Этот штиль мне утром лист железа с крыши скинул. Я б редактору пару слов сказал».',
        coat: '«А числа вы запомнили? Мне бы настоящий прогноз узнать».',
        fat: '«Я в тот ветер крышку с обеда потерял. До сих пор горох из пакета выковыриваю».',
        drunk: '«Лови её сам, друг. Меня вчера уже газета по лицу отхлестала».',
        granny: '«Газета эта у меня в лицо и прилетела, между прочим». Бабка поправила очки.'
      },
      pockets: {
        student: '«Я в такой карман однажды проездной сунул. Пропустил автобус, пока нащупал. Мне пока не смешно».',
        worker: '«Я однажды так ключи полчаса искал. Смену держал под дверью. Не напоминай».',
        coat: 'Он прижал локоть к пальто. «Про карманы я предпочитаю с незнакомыми не шутить».',
        fat: '«Так ты там что нашёл-то? Ничего?» Он пожал плечами, так и не дождавшись развязки.',
        drunk: '«Я из-за такой подкладки однажды весь день без обеда ходил. Монета-то на месте была».',
        granny: '«Карманы глубокие шить тоже работы стоит. У меня вон на пальце до сих пор след от иголки».'
      },
      tariff: {
        student: '«Ещё один тариф? Мне с утра оператор уже три раза звонил».',
        worker: '«Мне сегодня за смену тоже улыбкой заплатить хотели. Что-то я не согрелся».',
        coat: '«У меня с утра четыре письма о повышении тарифов. Вы бы хоть до понедельника отложили».',
        fat: '«А я уж думал, чай предлагают». Он поглядел, нет ли у тебя за спиной термоса.',
        drunk: '«Если зубы стучат, это за улыбку считается? А то мне уже не до тарифов».',
        granny: '«Тарифами не пугай, милок. Мне ещё за отопление квитанцию не принесли».'
      },
      askAboutYard: {
        student: '«Я как объясню — ещё круг сделаете. У меня и на карте верх всегда не с той стороны».',
        worker: '«У меня сейчас вся смена в голове жужжит. Я тебе с такими мыслями даже дверь не ту покажу».',
        coat: '«Боюсь, полезного совета сходу не дам. От моего “в общем направлении” вам мало проку».',
        fat: '«Я могу про обед, но у меня сейчас мысли совсем про другое. В другой раз».',
        drunk: '«Ох, брат, я один раз подсказал. Теперь человек здоровается через дорогу. Не возьмусь».',
        granny: '«Начну тебе рассказывать — сама забуду, за чем вышла. В другой раз, милок».'
      },
      explain: {
        student: '«Я про обед всё понял. Можно хоть раз без задачки про то, сколько денег осталось до стипендии?»',
        worker: '«Понял, на еду. Мне про обеды говорить сейчас тяжко, вся смена одними бутербродами живёт».',
        coat: '«Я понимаю, о чём вы. Обсуждать ваш обед посреди двора мне неловко».',
        fat: '«Ох, про еду лучше не начинай. У меня и так одни котлеты на уме».',
        drunk: '«Да понял я, что на еду. Зачем оправдываешься, я тебя ни в чём не обвинял».',
        granny: '«Слышала, на обед. Что ж ты ко мне с отчётом, милок?»'
      },
      favor: {
        student: '«Спасибо, у рюкзака лямка ниткой прихвачена. Я его только сам умею брать».',
        worker: '«Инструмент под отчёт, земляк. Я сумку даже сменщику из рук не даю».',
        coat: '«Портфель останется у меня. Благодарю». Он перехватил ручку покрепче.',
        fat: '«У меня там банка набок легла. Перехватим вдвоём — точно всё вытечет».',
        drunk: '«А если мы оба забудем, у кого мои вещи? У меня такое уже было».',
        granny: '«Не бери, милок. У меня в авоське яйца, я за них сама отвечу».'
      }
    },
    successes: {
      explain: {
        student: '«У нас перед длинной парой так же: сперва решаешь, на что поешь, потом уже всё остальное».',
        worker: '«На пустой желудок я тоже не работник. Хорошо, что сказал прямо».',
        coat: '«Теперь понимаю. Сам иной раз в разъездах до вечера одним кофе обхожусь».',
        fat: '«На еду — это дело понятное. У меня и день по-другому идёт, если горячего поем».',
        drunk: '«И правильно, что поесть решил. С пустым брюхом даже чай грустный».',
        granny: '«Вот, теперь понятно. А то стоят, мнутся, что им надо — сама догадайся».'
      },
      favor: {
        student: '«Вот тут лямка завернулась, под капюшоном. Ага, расправили. О, теперь шею не трёт!»',
        worker: '«Придержи сумку, я пряжку на одно деление отпущу. Во! С плеча теперь не сползает».',
        coat: '«Придержите, пожалуйста, портфель за ручку. Я ремешок пристегну… Вот теперь можно на плечо. Благодарю».',
        fat: '«Подхвати пакет снизу, я узелок на ручке сделаю. Всё! Теперь хоть до дому доживёт».',
        drunk: '«Вот, поддержи маленько, ручка перекрутилась. Во! Сразу полкило как рукой сняло».',
        granny: '«Приподними авоську, милок, за донышко. Я ручки платком оберну… Всё, отпускай. Другое дело!»'
      }
    },
    weatherRefusals: {
      student: 'Извините, я уже пальцев не чувствую. Мне бы скорее в тепло.',
      worker: 'Не сегодня, земляк. На таком холоде пока мелочь нащупаю, сам околею.',
      coat: 'Боюсь, в такую погоду я могу думать только о тёплом подъезде. Извините.',
      fat: 'Ух, ну и продувает тут. Я уж побегу греться, не обессудь.',
      drunk: 'Друг, зуб на зуб не попадает. Давай в другой раз, как потеплеет.'
    },
    followupRequests: {
      explain: { id: 'ask-food', line: 'Так что если можешь добавить на обед — выручишь.',
        replies: {
          student: { yes: 'Вот немного. До стипендии я сам знаю, сколько стоит каждый обед.', no: 'Понимаю. А у меня в столовой до получки уже тетрадка на мою фамилию.' },
          worker: { yes: 'На, земляк. На горячее добавлю.', no: 'Про обед я понял. Сам из дома ношу, с деньгами нынче никак.' },
          coat: { yes: 'Возьмите. Надеюсь, теперь на горячее хватит.', no: 'Я вас услышал. Денег дать не смогу.' },
          fat: { yes: 'На обед добавлю. Человек с ложкой в руке уже на мир добрее смотрит.', no: 'Я б добавил, да мне самому до получки обеды дома собирать.' },
          drunk: { yes: 'Вот. Будешь обедать — считай, я к столу поучаствовал.', no: 'Эх, поскрёб бы для тебя по сусекам. Так у меня их уже с обоих концов выскребли.' },
          granny: { yes: 'Вот тебе на обед, милок. Горячего возьми.', no: 'Деньгами сегодня не помогу, милый. Своё по копеечке рассчитываю.', food: 'Мелочи не дам, а поесть у меня с собой есть. Вот, завернула, бери.' }
        } },
      favorAgreed: { id: 'ask-favor', line: 'Ну вот, так поудобнее. А у тебя мелочи для меня не найдётся?',
        replies: {
          student: { yes: 'Нашлась. И спасибо за лямку, я б так до общаги и шёл скрюченный.', no: 'За лямку большое спасибо. С деньгами пусто, а спасибо у меня настоящее.' },
          worker: { yes: 'На, держи. Ох и намучился бы я с этим ремнём один.', no: 'Выручил с пряжкой, земляк. А в кармане у меня одни шайбы.' },
          coat: { yes: 'Пожалуйста. Вы мне вовремя подставили плечо.', no: 'Сожалею, мелочи при себе нет. За помощь с портфелем я вам благодарен.' },
          fat: { yes: 'Держи. Этот узелок мне сейчас весь обед спас.', no: 'Пакет ты спас, спасибо. А мелочь я уже на его содержимое извёл.' },
          drunk: { yes: 'Секундочку, вот! Теперь, когда ручка не режет, даже мелочь искать веселее.', no: 'За помощь спасибо, друг. А в кармане ветер. Зато теперь с удобствами.' },
          granny: { yes: 'Держи, милок. Хорошо придумали с платочком.', no: 'За авоську спасибо. А деньгами я сегодня не выручу, сынок.', food: 'Вот и руки освободились. Достану тебе гостинец, милок, за подмогу.' }
        } },
      favorDeclined: { id: 'ask-no-favor', line: 'Хорошо, вещи у тебя. А мелочью всё-таки не выручишь?',
        replies: {
          student: { yes: 'Мелочь можно. Держите, у денег лямок нет.', no: 'Не выйдет, простите. Сам до стипендии на калькуляторе обед выбираю.' },
          worker: { yes: 'Инструмент у меня под отчёт, а это мои кровные. Держи.', no: 'Не взыщи. Инструмент казённый, а своих денег тоже в обрез.' },
          coat: { yes: 'Мелочью могу. Вот, пожалуйста.', no: 'Сожалею. На этот раз ничем не помогу.' },
          fat: { yes: 'С поклажей сам разберусь, а вот сдачей поделюсь. Лови.', no: 'Сегодня и у меня только на проезд осталось.' },
          drunk: { yes: 'С вещами и правда сам управлюсь. Монетку на счастье держи.', no: 'Пусто, друг. Будь у меня мелочь, она бы уже позвякивала.' },
          granny: { yes: 'Авоську я сама, а это, милок, бери.', no: 'Не сегодня, сынок. Я уж и так последнюю копеечку переворачиваю.', food: 'Деньги мне самой нужны. А вот перекусить могу дать. Держи, сама достану.' }
        } }
    },
    failedFarewellLines: {
      mitten: 'Ну, варежку оставлю на ветке. Хозяин сам найдёт. До встречи.',
      pancakes: 'Ладно, про блины умолкаю. Всего доброго.',
      accordion: 'Поищу припев в другом месте. Доброго пути.',
      first_pay: 'Что-то я с ходу в чужой кошелёк полез. Бывай.',
      snowbird: 'Ладно, пойду свои следы на снегу оставлять. До встречи.',
      cat: 'Пойду скажу коту, что дворник из меня лучше, чем шутник. Бывай.',
      hotel: 'Ладно, про свой «номер» промолчу. До встречи.',
      forecast: 'Эх, шутку про газету тоже ветром унесло. Доброго пути.',
      pockets: 'Ладно, хватит про карманы. Всего доброго.',
      tariff: 'Что ж, закрываю тариф до оттепели. Бывай.',
      askAboutYard: 'Ладно, пройдусь сам, осмотрюсь. До встречи.',
      explain: 'Ладно, про обед я заговорился. До встречи.',
      favor: 'Как скажешь, сам так сам. Счастливо добраться.'
    },
    failedFarewells: {
      student: { line: 'Ладно, не буду отвлекать. Удачи тебе.', reply: 'До встречи. Что-то у меня сегодня с разговорами как на пересдаче.' },
      worker: { line: 'Вижу, не ко времени. Бывай, земляк.', reply: 'Давай. Может, в другой раз поболтаем.' },
      coat: { line: 'Понял вас. Всего доброго.', reply: 'И вам всего хорошего.' },
      fat: { line: 'Ладно, оставлю тебя с твоими мыслями. Бывай.', reply: 'Бывай. Сегодня я что-то плохой собеседник.' },
      drunk: { line: 'Разговор нынче буксует. Я пойду, друг.', reply: 'Бывает, брат. Свидимся ещё.' },
      granny: { line: 'Хорошо. Я пойду, а то задерживаю вас.', reply: 'Иди, милок. За меня не переживай.' }
    }
  },
  /* ---------- Живые прохожие: маршруты, скорость, погода, автобус ----------
   * Координаты — доли поля. Между точками маршрута движок добавляет обходы препятствий двора.
   * Точка может иметь: wait: [мин, макс] — постоять (у ларька «покупает»), bus: true — ждать автобус, dump: true — выбросить мусор в бак.
   * Последняя точка — выход: край двора (за экраном), дверь подъезда или автобус.
   * Правка 016: какие маршруты работают и как часто — решает расписание (schedule, поле routes фазы), а не флаг night.
   * needs: 'kiosk' — маршрут идёт к заведению и не запускается, пока оно закрыто (places.*.hours). */
  walkers: {
    kioskCounter: { x: .276, y: .821, approachY: .858 },  // перед окном выдачи, с последним шагом прямо к прилавку
    laneJitter: 0.012,                        // разброс по вертикали, чтобы не шли в затылок
    maxAlive: 11,                             // больше во дворе не бывает (было 7): утренняя очередь и вечерняя высадка — событие, но не толпа
    /* Частота появления с краёв и из подъезда — в расписании (schedule.*.spawn). Пассажиры автобуса и жильцы с мусором — сверх неё. */
    contact: 0.063,                           // на каком расстоянии герой «догнал» и заговорил, логических единиц
    lookAhead: 60, lookStep: 0.25,            // прогноз перехвата: горизонт и шаг, с
    maxWalkFactor: 0.72,                     // предел обычного шага с учётом утренней спешки, доля спокойного шага героя
    maxWeatherFactor: 1.12,                  // предел спешки из-за погоды для типажей с weatherHurry
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
      { id: 'kioskL', needs: 'kiosk', path: [{ x: -0.05, y: 0.887 }, { x: 0.2, y: 0.887 }, { counter: true, wait: [5, 9] }, { x: 0.2, y: 0.887 }, { x: -0.05, y: 0.887 }] },
      { id: 'kioskR', needs: 'kiosk', path: [{ x: 1.05, y: 0.887 }, { x: 0.4, y: 0.887 }, { counter: true, wait: [5, 9] }, { x: 0.4, y: 0.887 }, { x: 1.05, y: 0.887 }] },
      { id: 'kioskHome', needs: 'kiosk', path: [{ x: 0.46, y: 0.262, door: 'out' }, { x: 0.41, y: 0.4 }, { counter: true, wait: [5, 9] }, { x: 0.41, y: 0.4 }, { x: 0.46, y: 0.262, door: 'in' }] },
      /* вечером по дороге домой — в ларёк, потом в подъезд */
      { id: 'kioskHomeL', needs: 'kiosk', path: [{ x: -0.05, y: 0.887 }, { x: 0.2, y: 0.887 }, { counter: true, wait: [5, 9] }, { x: 0.41, y: 0.6 }, { x: 0.41, y: 0.4 }, { x: 0.46, y: 0.262, door: 'in' }] },
      { id: 'kioskHomeR', needs: 'kiosk', path: [{ x: 1.05, y: 0.887 }, { x: 0.4, y: 0.887 }, { counter: true, wait: [5, 9] }, { x: 0.41, y: 0.6 }, { x: 0.41, y: 0.4 }, { x: 0.46, y: 0.262, door: 'in' }] },
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
      { id: 'trash', trash: true, path: [{ x: 0.46, y: 0.262, door: 'out' }, { x: 0.55, y: 0.33 }, { wait: [2, 3], face: 1, dump: true }, { x: 0.55, y: 0.33 }, { x: 0.46, y: 0.262, door: 'in' }] }
    ],
    /* Куда расходятся пассажиры, вышедшие из автобуса (первая точка — у дверей автобуса, x подставляет игра). Веса — в расписании (schedule.*.bus.exits). */
    busExits: [
      { id: 'exitDoor', path: [{ x: 0.5, y: 0.925 }, { x: 0.44, y: 0.8 }, { x: 0.42, y: 0.45 }, { x: 0.46, y: 0.262, door: 'in' }] },
      { id: 'exitL', path: [{ x: 0.5, y: 0.925 }, { x: 0.45, y: 0.887 }, { x: -0.05, y: 0.887 }] },
      { id: 'exitR', path: [{ x: 0.5, y: 0.925 }, { x: 0.55, y: 0.887 }, { x: 1.05, y: 0.887 }] },
      { id: 'exitKiosk', needs: 'kiosk', path: [{ x: 0.5, y: 0.925 }, { x: 0.44, y: 0.887 }, { counter: true, wait: [5, 9] }, { x: 0.2, y: 0.887 }, { x: -0.05, y: 0.887 }] },
      { id: 'exitKioskHome', needs: 'kiosk', path: [{ x: 0.5, y: 0.925 }, { x: 0.44, y: 0.887 }, { counter: true, wait: [5, 9] }, { x: 0.41, y: 0.6 }, { x: 0.41, y: 0.4 }, { x: 0.46, y: 0.262, door: 'in' }] },
      { id: 'exitYardL', path: [{ x: 0.5, y: 0.925 }, { x: 0.45, y: 0.8 }, { x: 0.3, y: 0.55 }, { x: -0.05, y: 0.4 }] },
      { id: 'exitYardR', path: [{ x: 0.5, y: 0.925 }, { x: 0.55, y: 0.8 }, { x: 0.7, y: 0.55 }, { x: 1.05, y: 0.4 }] }
    ],
    /* Вынос мусора (правка 016): кто выносит, сколько кладёт в бак и что. Состав сдвинут к бытовому: объедки, картон, газеты. */
    trash: {
      dropOffset: { x: -.019, y: .010 }, // подойти к переднему левому углу бака
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
    /* Погода: speed — множитель скорости для типажей с weatherHurry, give — множитель шанса подаяния, spawn — множитель частоты появления.
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
    traffic: {
      cycle: 145, farY: 0.984, edge: 0.18, carSpeed: 0.38, busSpeed: 0.28,
      trips: [
        { at: 8, kind: 'sedan', dir: -1 },
        { at: 31, kind: 'wagon', dir: 1 },
        { at: 59, kind: 'wagon', dir: -1 },
        { at: 86, kind: 'sedan', dir: 1 },
        { at: 114, kind: 'bus', dir: 1 }
      ]
    },
    bus: {
      emoji: '🚌', name: 'Автобус',
      stopEmoji: '🚏', stopShelterDy: -0.04,              // павильон остановки: запасной значок и сдвиг вверх от точки ожидания
      stop: { x: 0.5, y: 0.887, slots: [-0.012, 0.03, -0.05, 0.068, -0.085, 0.105, -0.12, 0.14] },   // остановка на тротуаре; ожидающие встают по очереди в эти смещения по x (утром очередь до восьми)
      y: 0.938,                                         // ближняя к остановке полоса между бордюром и разметкой
      speed: 0.32,                                      // долей поля в секунду
      stopSeconds: 3,
      passengers: { gap: 0.9 },                         // сколько выходит — в расписании (schedule.*.bus.out); gap — пауза между ними, с. Никто не ждёт и никто не выходит — автобус проезжает мимо
      boardY: 0.925, boardHurry: 1.5,                   // куда и как резво идут садиться
      startX: 1.14, endX: -0.14
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

  // Границы для ступней в координатах картины. У торговых точек и павильона занята только земля под основанием.
  navigation: {
    version: 4,
    top: .246,
    blocks: [
      { id: 'facade', left: -1, top: 0, right: .809, bottom: .260 },
      { id: 'stall', left: .442, top: .437, right: .636, bottom: .527 },
      { id: 'kiosk', left: .217, top: .690, right: .339, bottom: .805 },
      { id: 'recycle', left: .671, top: .693, right: .810, bottom: .808 },
      { id: 'busStop', left: .453, top: .847, right: .559, bottom: .867 },
      { id: 'bench', left: .531, top: .185, right: .624, bottom: .296 },
      { id: 'bin', left: .765, top: .421, right: .841, bottom: .468 }
    ]
  },

  /* ---------- Раскладка и хит-тесты (px) ---------- */
  layout: {
    defaultFieldW: 1280,
    defaultFieldH: 720,
    logicalAspect: 1.975,                     // ширина / высота логического поля (1920×972: окно 1920×1080 минус полоса снизу); все расстояния и скорости считаются в единицах высоты
    fieldMarginPx: 44,
    fieldTopMarginPx: 110,
    heroStand: { x: 0.022, y: 0.028 },        // куда встаёт герой относительно центра места (доли поля)
    kickOffset: { x: 0.0, y: 0.101 },         // проход между дверью и задним краем палатки
    lootRingRadiiPx: [104, 168, 232],
    lootRingSteps: 10,
    itemSpacingPx: 68,
    placeClearPx: 96,
    edgeOutside: 0.05                         // насколько встречные заходят/уходят за край
  },

  /* ---------- Интерфейс ---------- */
  ui: {
    dialogue: {
      context: 'Разговор во дворе', chance: 'Шанс успеха', helpChance: 'Шанс помощи',
      moneyOdds: 'Деньги', foodOdds: 'еда',
      moodYes: 'Удалось', moodNo: 'Не удалось',
      skill: 'Попрошайничество', social: 'Общение',
      level: 'Уровень', experience: 'Опыт', maxLevel: 'Максимальный уровень',
      unlocked: 'Новая карта', resultTitle: 'Итог разговора',
      moneyReceived: 'Получено {n} ₽.', foodReceived: 'Объедки в пакете.',
      foodDropped: 'Пакет полон. Объедки на земле.', refusal: 'Отказ.',
      weatherRefusal: 'Отказ из-за погоды.'
    },
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
    denStage1: ['Подстилка готова. Новоселье! Из удобств — тёплая труба', 'Картон постелен. Вид на бетон, зато свой', 'Подстилка. Ипотека без процентов, первый взнос — две коробки'],
    denStage2: ['Утеплился. Газеты держат тепло лучше, чем обещания', 'Тряпьё и пресса. Теперь тут теплее, чем в иной хрущёвке', 'Утепление. Евроремонт по-бомжовски: всё своё, всё с помойки'],
    denStage3: ['Заслон от ветра. Ветер стучит — никого нет дома', 'Закрылся от ветра. Окна во двор, вид на трубу, сквозняк — у соседей', 'Ветер больше не гость. Квартирный вопрос решён на треть'],
    denStage4: ['Заначка готова. Своя кладовка! Почти буржуй', 'Тайник под плитой. Банк «Теплотрасса»: вклады не страхуются', 'Заначка. Кто-то копит на квартиру, а у тебя уже есть'],
    denLack: ['Не хватило: {need}. Кто-то спёр, или ты сам', 'Стройка встала: нужно {need}', 'Материалы кончились. Классика долгостроя: {need}'],
    atDen: ['Залез в лежбище. Дома и стены греют, особенно тёплые', 'Лежбище. Скромно, но ни одного мента в радиусе пяти плит', 'Дома. Ну как дома — в трубе. Но дома'],
    denMatHint: ['{name} — в лежбище пригодится. Неси к теплотрассе', '{name}. Не мусор, а стройматериал. Лаз у теплотрассы ждёт', '{name}: для лежбища у трубы. Мебель сама себя не соберёт'],
    stashPut: ['{name} — в заначку. Под плиту, как в швейцарский банк', 'Спрятал {acc}. Об этом знаешь только ты', '{name} в заначке. Бетон хранит тайны'],
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
    pipeNoSleep: ['На краю плиты можно погреться сидя. Для сна рядом есть лаз под трубами.'],
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
    saveLoaded: ['Продолжаем. Двор ждал, мусор не вывозили', 'Вернулся. Бак на месте, совесть тоже', 'С возвращением. Утро то же, похмелье новое']
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
    button: 'Начать новую игру',
    continueBtn: 'Загрузиться',
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
      denBuilt: ['Сейчас тут {net}/с, во сне {sleep}/с (у трубы {pipe}/с)', 'Отсюда не выгоняют. Труба греет круглые сутки'],
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
      passerby: ['Если поможет — {how}. Разговор {s} с'],
      kinds: {
        student: { how: 'наскребёт мелочи', joke: 'Сам на мели, поэтому понимает' },
        worker: { how: 'отсыплет сдачи с обеда', joke: 'После получки добрый, до получки — как ты' },
        coat: { how: 'достанет купюру', joke: 'Обычно смотрит сквозь. Иногда — в бумажник' },
        fat: { how: 'поделится сдачей', joke: 'Идёт не спеша: торопиться некуда, везде уже успел' },
        drunk: { how: 'даст то, что попадётся под руку', joke: 'Идёт по синусоиде. Душа нараспашку, кошелёк — тоже' }
      },
      trash: 'Несёт мусор к баку. Сейчас в баке станет интереснее',
      hurry: 'Спешит: идёт быстро, подаёт неохотно',
      relaxed: 'Никуда не спешит. Самое время попросить',
      charisma: 'Твой наряд: шанс подаяния {pp} п.п.',
      weatherMeh: 'Погода портится: подают хуже',
      weatherBad: 'В такую погоду бомжа никто не слушает. Почти',
      weatherHurry: 'Прибавил шаг из-за погоды',
      asked: 'Вы уже поговорили. Дай человеку дойти по делам.',
      busWait: 'Ждёт автобус. Деваться ему некуда',
      noCatch: 'Не догнать. Он спешит сильнее, чем ты нуждаешься',
      granny: ['Если поможет — объедки или {m} ₽, поровну. Разговор {s} с', 'Гуляет до лавки и обратно. Раз в день, как совесть'],
      grannySit: 'Сидит на лавке, сторожит двор',
      cop: ['Застанет в подъезде — выгонит: −{d} здоровья, и домофон на замок', 'Стоит у двери {a}–{b} с. На улице ему до тебя дела нет']
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
    askedMark: 'уже говорили',
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
      pipe: 'Греется у открытых труб',
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
