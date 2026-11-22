/* СОБРАНО из src/game/ скриптом build.js, не править руками — править части в src/game/ и запускать node build.js */
/* «Бомж» v0.1 — логика. Все числа баланса — в data.js (GAME_DATA). */
(function (global) {
  'use strict';

  var D = global.GAME_DATA;

  /* =====================================================================
   *  ЯДРО: чистая симуляция без DOM
   * ===================================================================== */
  /* Генератор случайности с сохраняемым состоянием (правка 017): тот же mulberry32, что у ботов (tests/bots.js prng).
     getState() / setState(v) — одно 32-битное число; так сохранение продолжает ровно ту же последовательность. */
  function makeRng(seed) {
    var s = seed >>> 0;
    var f = function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.getState = function () { return s; };
    f.setState = function (v) { s = v >>> 0; };
    return f;
  }

  var courtyardGraph; // Один неизменный граф на все забеги и симуляции ботов.
  function createGame(opts) {
    opts = opts || {};
    var rng = opts.rng || makeRng((Math.random() * 4294967296) >>> 0);   // в браузере — свой генератор с состоянием; тесты и боты дают свой
    var field = { w: opts.w || D.layout.defaultFieldW, h: opts.h || D.layout.defaultFieldH };
    var L = D.layout;
    var nextId = 1;
    var S = null;

    function rand(a, b) { return a + (b - a) * rng(); }
    function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function pick(arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }

    /* Винительный падеж названий вещей (data.js: items.*.acc): «купил вязаную шапку». В строки журнала идёт как {acc} и {oldAcc}. */
    var ACC = {};
    for (var ik in D.items) { var idf = D.items[ik]; if (idf.acc) ACC[idf.name] = idf.acc; if (idf.readName && idf.readAcc) ACC[idf.readName] = idf.readAcc; }
    function accOf(name) { return ACC[name] || (name ? name.charAt(0).toLowerCase() + name.slice(1) : ''); }
    function appendLogLine(text) {
      S.log.push(text);
      while (S.log.length > D.ui.logLines) S.log.shift();
      S.logSeq++;
    }
    function log(key, vars) {
      var s = pick(D.texts[key]);
      if (vars && vars.name !== undefined && vars.acc === undefined) vars.acc = accOf(vars.name);
      if (vars && vars.old !== undefined && vars.oldAcc === undefined) vars.oldAcc = accOf(vars.old);
      if (vars) {
        for (var k in vars) { s = s.split('{' + k + '}').join(vars[k]); }
      }
      appendLogLine(s);
      if (R && RCD.fromLog[key]) ev(RCD.fromLog[key], vars ? { it: NAME_ID[vars.name] || vars.name, n: vars.n } : null);   // правка 017: в запись
      S.sfx.push({ key: key, n: vars ? vars.n : undefined });   // для звука (sound.js); на симуляцию не влияет
      if (S.sfx.length > 40) S.sfx.shift();
    }

    /* ---------- телеметрия: только считает, на логику и rng не влияет ---------- */
    function newTele() {
      return {
        copKicks: 0, evictions: 0, entranceLocked: 0, entranceCop: 0,
        followIn: 0, doorSlammed: 0, doorIn: 0, doorOut: 0, busStops: 0, busPass: 0, busAlight: 0, fullDrops: 0, fullDropsFood: 0,
        fires: 0, cardboardFed: 0, vodka: 0, shawarma: 0, scrapsEaten: 0, scrapsBad: 0,
        buys: {}, soldN: 0, soldMoney: 0, finds: {}, emptyTries: 0,
        spentGear: 0, spentFood: 0, spentOther: 0, used: {}, wears: 0, unwears: 0, papersRead: 0, paperFed: 0, gearDay: [],
        asks: {}, begCards: {}, chases: 0, missed: 0, sleepN: 0, sleeps: {}, slAt: 'ground', slT: 0,
        time: { walk: 0, search: 0, sell: 0, talk: 0, shop: 0, eat: 0, light: 0, build: 0, sleep: 0, warmEntrance: 0, warmPipe: 0, warmDen: 0, warmFire: 0, bench: 0, idle: 0 },
        low: { satiety: 0, warmth: 0, health: 0, energy: 0 }, zero: { satiety: 0, warmth: 0, health: 0, energy: 0 },
        /* правка 016: ритм двора — по фазам расписания (rh[id]) и по маршрутам / типам людей */
        rh: {}, routes: {}, kinds: {}, closedHits: 0, trashDumps: 0, trashItems: 0, binAdded: 0, binMorning: 0,
        denStages: [], stashPut: 0, stashTake: 0          // правка 022: когда построена каждая ступень лежбища (S.total, с), заначка
      };
    }
    function rhTele(id) {
      id = id || S.rh || 'day';
      return S.tele.rh[id] || (S.tele.rh[id] = { t: 0, crowd: 0, asks: 0, ok: 0, money: 0, finds: 0, closed: 0, follow: 0, trash: 0, sleep: 0, busIn: 0, busOut: 0, spawned: 0, n: 0 });
    }
    function rollLoot(loot) {
      var r = rng(), acc = 0;
      for (var i = 0; i < loot.length; i++) { acc += loot[i].chance; if (r < acc) return loot[i].type; }
      return loot[loot.length - 1].type;
    }
    function teleInc(obj, key, v) { obj[key] = (obj[key] || 0) + (v === undefined ? 1 : v); }
    function teleTick(dt) {
      var T = S.tele, h = S.hero, t = h.task, k, lim = D.hero.max * 0.25;
      if (h.asleep) k = 'sleep';
      else if (t) k = ({ search: 'search', sell: 'sell', talk: 'talk', shop: 'shop', use: 'eat', light: 'light', build: 'build' })[t.kind] || 'idle';
      else if (h.walking) k = 'walk';
      else if (h.at === 'entrance') k = 'warmEntrance';
      else if (h.at === 'pipe') k = 'warmPipe';
      else if (h.at === 'den') k = 'warmDen';
      else if (nearFire()) k = 'warmFire';
      else if (h.at === 'bench') k = 'bench';
      else k = 'idle';
      T.time[k] += dt;
      var R = rhTele(), crowd = 0;
      for (var ci = 0; ci < S.npcs.length; ci++) if (S.npcs[ci].type === 'passerby' || S.npcs[ci].type === 'granny') crowd++;
      R.t += dt; R.crowd += crowd * dt;
      if (h.asleep) R.sleep += dt;
      if (h.asleep) {                                    // «засыпал» = проспал не меньше 10 с (иначе мелкие просыпания раздувают счёт)
        T.slT += dt;
        if (T.slT >= 10 && T.slT - dt < 10) { T.sleepN++; teleInc(T.sleeps, T.slAt); }
      } else T.slT = 0;
      for (var b in T.low) { var v = h[b]; if (v < lim) T.low[b] += dt; if (v <= 0) T.zero[b] += dt; }
    }

    /* ---------- правка 017: запись забега ----------
       Только читает S и пишет в R (вне S): rng не трогает, на исход не влияет. Включается opts.record (объект шапки или true).
       Событие: { e: имя, t: игровые секунды от начала, d: сутки, h: часы, ph: фаза расписания, r: реальные секунды от начала сессии, …поля }.
       Большая часть событий — сравнение S с прошлым кадром (recTrack, в начале и в конце update), остальное — явные вызовы ev(). */
    var RCD = D.record, R = null;
    var inCtx = { by: opts.inputBy || null, paused: false };   // кто отдаёт приказы: 'mouse' / 'key' / 'bot'; был ли приказ на паузе
    var now = opts.now || function () { return Date.now(); };
    var sessT0 = now();
    var NAME_ID = {};                                  // русское название -> id (для событий, пришедших из строк журнала)
    (function () { var k; for (k in D.items) { NAME_ID[D.items[k].name] = k; if (D.items[k].readName) NAME_ID[D.items[k].readName] = k; } for (k in D.places) NAME_ID[D.places[k].name] = k; })();
    function r1(v) { return Math.round(v * 10) / 10; }
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function ev(e, f) {
      if (!R) return null;
      var o = { e: e, t: r1(S.total), d: Math.min(dayNo(), D.time.days), h: fmtHour(clockHour()), ph: S.rh, r: r1((now() - sessT0) / 1000) };
      if (f) for (var k in f) if (f[k] !== undefined && f[k] !== null && f[k] !== '') o[k] = f[k];
      R.events.push(o);
      return o;
    }
    function who(n) { return n ? (n.type === 'passerby' ? n.kind : n.type) : undefined; }
    function tgt(t) {                                  // цель приказа строкой: place:bin, npc:student, item:bottle
      if (!t) return 'pt';
      if (t.kind === 'place') return 'place:' + t.id;
      if (t.kind === 'npc') { var n = findNpc(t.id); return 'npc:' + (n ? who(n) : t.type); }
      if (t.kind === 'item') { var it = findItem(t.id); return 'item:' + (it ? it.type : '?'); }
      return t.kind;
    }
    function doing() {
      var h = S.hero;
      if (h.asleep) return 'sleep';
      if (h.task) return h.task.kind;
      if (h.walking || h.move) return 'walk';
      return h.at || 'idle';
    }
    function curOrder() { var h = S.hero; return h.task ? 'task:' + h.task.kind : (h.move ? tgt(h.move.target) : undefined); }
    function wornList() { var o = {}, n = 0; for (var sl in S.worn) if (S.worn[sl]) { o[sl] = S.worn[sl].type; n++; } return n ? o : undefined; }
    function snap(why) {
      var h = S.hero;
      ev('snap', { why: why, sat: r1(h.satiety), warm: r1(h.warmth), hp: r1(h.health), en: r1(h.energy), money: S.money,
        inv: S.inv.map(function (i) { return i.type; }), worn: wornList(), x: r3(h.x), y: r3(h.y), at: h.at, doing: doing() });
    }
    function wxSig() { var w = S.weather; return w ? w.type + '|' + w.temp + '|' + w.wind + '|' + w.precip : ''; }
    function taskInfo(t) {
      var o = { k: t.kind, at: t.placeId, sec: r1(t.dur) };
      if (t.kind === 'talk') { var n = findNpc(t.npcId); o.id = t.npcId; o.who = who(n); }
      if (t.kind === 'use') o.it = t.item.type;
      return o;
    }
    function recSync() {                               // трекер по текущему S, без событий (начало записи и после загрузки)
      var h = S.hero, w = R.w;
      w.phase = S.phase; w.rh = S.rh; w.wx = wxSig(); w.speed = S.speed; w.at = h.at; w.over = S.over ? 1 : 0;
      R.task = h.task; R.done = null;
    }
    function recBegin(head) {
      R = { head: head, events: [], lost: [], w: { atT: S.total, sleepT: 0, low: {}, zero: {}, snapAt: S.total + RCD.snapEvery, km: null, sess: 1 }, task: null, done: null };
      recSync();
      ev('session', { n: 1, kind: 'start', date: head.started });
      snap('start');
    }
    function recTrack() {
      if (!R) return;
      var w = R.w, h = S.hero, b, v;
      if (S.phase !== w.phase) { w.phase = S.phase; var dawn = S.phase % 2 === 0; ev(dawn ? 'dawn' : 'dusk', { day: dayNo() }); if (dawn) snap('dawn'); }
      if (S.rh !== w.rh) { w.rh = S.rh; ev('phase', { to: S.rh }); }
      v = wxSig();
      if (v !== w.wx) { w.wx = v; var W = S.weather; ev('weather', { type: W.type, temp: W.temp, feels: W.feels, wind: W.wind, precip: W.precip }); }
      if (S.speed !== w.speed) { w.speed = S.speed; ev('speed', { v: S.speed, auto: 1 }); }
      if (h.task !== R.task) {
        var pt = R.task;
        if (pt && pt !== R.done) ev('cut', { k: pt.kind, at: pt.placeId, sec: r1(pt.t), of: r1(pt.dur) });
        R.task = h.task; R.done = null;
        if (h.task) ev('task', taskInfo(h.task));
      }
      if (h.at !== w.at) {
        if (w.at) ev('leave', { at: w.at, sec: r1(S.total - w.atT) });
        w.at = h.at; w.atT = S.total;
        if (h.at) ev('enter', { at: h.at });
      }
      var bars = { satiety: 'sat', warmth: 'warm', health: 'hp', energy: 'en' };
      for (b in bars) {
        v = h[b];
        if (!w.low[b] && v < RCD.lowAt) { w.low[b] = 1; ev('low', { bar: bars[b], v: r1(v) }); }
        else if (w.low[b] && v > RCD.lowAt + RCD.rearm) { w.low[b] = 0; ev('ok', { bar: bars[b], v: r1(v) }); }
        if (!w.zero[b] && v <= 0) { w.zero[b] = 1; ev('zero', { bar: bars[b] }); }
        else if (w.zero[b] && v > RCD.rearm) w.zero[b] = 0;
      }
      if (S.total >= w.snapAt) { snap('tick'); while (w.snapAt <= S.total) w.snapAt += RCD.snapEvery; }
      if (S.over && !w.over) {
        w.over = 1;
        if (h.at) ev('leave', { at: h.at, sec: r1(S.total - w.atT) });
        snap('end');
        ev('end', { win: S.over.win ? 1 : 0, cause: S.over.cause, day: Math.min(dayNo(), D.time.days), lived: r1(S.over.total), money: S.money });
      }
    }
    /* Файл записи: шапка, события, потерянные хвосты (после аварийной загрузки), итог и телеметрия целиком */
    function recFile() {
      if (!R) return null;
      var head = JSON.parse(JSON.stringify(R.head));
      head.day = Math.min(dayNo(), D.time.days); head.gameSec = r1(S.total); head.events = R.events.length; head.exported = new Date(now()).toISOString();
      return { format: RCD.format, formatVersion: RCD.formatVersion, head: head, events: R.events, lost: R.lost,
        end: S.over ? { win: S.over.win ? 1 : 0, cause: S.over.cause, lived: r1(S.over.total), day: Math.min(dayNo(), D.time.days) } : null, tele: S.tele };
    }

    /* ---------- время ----------
       S.phase — светлая часть (чётная) и тёмная (нечётная): от рассвета до заката и от заката до следующего рассвета.
       Светлое время стоит вокруг полудня (time.noonHour) и к 7-м суткам сжимается с обоих концов, поэтому ночь между сутками
       разной длины чуть длиннее половины разницы. Часы суток (clockHour) идут ровно: cycleSeconds на 24 часа. */
    var HOUR = D.time.cycleSeconds / 24;               // секунд на час
    function isNight() { return S.phase % 2 === 1; }
    function dayNo() { return Math.floor(S.phase / 2) + 1; }
    function dayDiv(day) { var t = D.time.dayDivisions; return t[Math.max(1, Math.min(day, t.length)) - 1]; }
    function dayLen(day) { return D.time.cycleSeconds * dayDiv(day) / D.time.divisions; }
    function lightHours(day) { return dayDiv(day) * D.time.hoursPerDivision; }
    function sunrise(day) { return D.time.noonHour - lightHours(day) / 2; }
    function sunset(day) { return D.time.noonHour + lightHours(day) / 2; }
    function nightLen(day) { return (24 - sunset(day) + sunrise(day + 1)) * HOUR; }
    function phaseLen() { return isNight() ? nightLen(dayNo()) : dayLen(dayNo()); }
    /* Который час (0–24) и какие это сутки по календарю (после полуночи — уже следующие) */
    function clockHour() {
      var h = (isNight() ? sunset(dayNo()) : sunrise(dayNo())) + S.phaseTime / HOUR;
      return ((h % 24) + 24) % 24;
    }
    function calDay() { return dayNo() + (isNight() && clockHour() < sunset(dayNo()) ? 1 : 0); }
    function fmtHour(h) {
      h = ((h % 24) + 24) % 24;
      var hh = Math.floor(h), mm = Math.round((h - hh) * 60);
      if (mm === 60) { hh = (hh + 1) % 24; mm = 0; }
      return hh + ':' + (mm < 10 ? '0' : '') + mm;
    }
    function fmtHourApprox(h) { return fmtHour(Math.round(h * 6) / 6); }   // «около 7:30» — с точностью до 10 минут
    /* ---------- ритм двора: расписание из data.js (schedule) ---------- */
    function scheduleSet() { var SC = D.schedule, id = SC.byDay[calDay()] || 'default'; return SC.days[id] || SC.days.default; }
    function rhythmAt(hour) {
      var list = scheduleSet(), cur = list[list.length - 1];
      for (var i = 0; i < list.length; i++) if (hour >= list[i].from) cur = list[i];
      return cur;
    }
    function rhythm() {
      var list = scheduleSet();
      for (var i = 0; i < list.length; i++) if (list[i].id === S.rh) return list[i];
      return rhythmAt(clockHour());
    }
    function rhythmDur(def) {                         // длина фазы в секундах
      var list = scheduleSet().slice().sort(function (a, b) { return a.from - b.from; }), i = list.indexOf(def);
      var next = list[(i + 1) % list.length].from, d = (next - def.from + 24) % 24;
      return (d || 24) * HOUR;
    }
    /* Часы работы заведения: [открытие, закрытие]; если закрытие раньше открытия — работает через полночь */
    function openAt(hours, x) { var a = hours[0], b = hours[1]; return a < b ? (x >= a && x < b) : (x >= a || x < b); }
    /* Подъезд: 'cop' — мент у двери, 'lock' — жильцы заперлись на домофон после выгона */
    function copAtDoor(n) {
      return n.state === 'linger' || Math.abs(n.x - D.places.entrance.x) <= D.npcs.cop.kickRange;
    }
    /* Дверь «не захлопнулась»: кто-то только что вошёл или вышел — можно проскочить даже при домофоне */
    function doorOpen() { return S.doorOpen > 0; }
    function setDoorOpen(seconds) {
      var wasOpen = doorOpen();
      S.doorOpen = seconds;
      if (wasOpen !== doorOpen()) sfx(doorOpen() ? 'entranceDoorOpen' : 'entranceDoorClose');
    }
    function openDoor() { setDoorOpen(Math.max(S.doorOpen, rand(D.walkers.door.openMin, D.walkers.door.openMax))); }
    function entranceBlocked() {
      if (S.entranceLock > 0 && !doorOpen()) return 'lock';
      for (var i = 0; i < S.npcs.length; i++) if (S.npcs[i].type === 'cop' && copAtDoor(S.npcs[i])) return 'cop';
      return null;
    }
    function placeClosed(id) {
      if (id === 'entrance') return !!entranceBlocked();
      var hrs = D.places[id].hours;
      return !!hrs && !openAt(hrs, clockHour());
    }
    function opensAt(id) { var hrs = D.places[id].hours; return hrs ? fmtHour(hrs[0]) : ''; }

    /* ---------- погода и тепло ---------- */
    function weatherType(w) {
      var WD = D.weather;
      if (w.wind >= 2 && w.precip !== 'none') return 'blizzard';
      if (w.feels <= WD.frostFeels) return 'frost';
      if (w.precip === 'sleet') return 'sleet';
      if (w.wind >= 1) return 'windy';
      if (w.precip === 'snow') return 'snow';
      return 'calm';
    }
    function precipDef(id) {
      var P = D.weather.precips;
      for (var i = 0; i < P.length; i++) if (P[i].id === id) return P[i];
      return P[0];
    }
    function finishWeather(w) {
      var WD = D.weather;
      w.feels = w.temp - WD.winds[w.wind].chill - precipDef(w.precip).chill;
      w.type = weatherType(w);
      w.caption = pick(WD.captions[w.type]);
      return w;
    }
    function rollIndex(chances) {
      var r = rng(), acc = 0;
      for (var i = 0; i < chances.length; i++) { acc += chances[i]; if (r < acc) return i; }
      return chances.length - 1;
    }
    /* Погода фазы phase (чётная — день, нечётная — ночь). Заготавливается на две фазы вперёд (S.weatherAhead): по ней газета даёт прогноз.
       Распределения те же, что были, когда погода выбиралась в момент смены фазы. */
    function genWeatherFor(phase) {
      var WD = D.weather, ph = WD.phases[Math.min(phase, WD.phases.length - 1)];
      var wind = rollIndex(phase % 2 === 1 ? WD.windChanceNight : WD.windChanceDay);
      var w = {
        temp: Math.round(ph.mean + (rng() + rng() - 1) * ph.spread),
        wind: wind,
        windMs: randInt(WD.winds[wind].msMin, WD.winds[wind].msMax),
        precip: WD.precips[rollIndex(WD.precipChance)].id
      };
      return finishWeather(w);
    }
    /* Прогноз из газеты: погода следующих двух фаз с погрешностью (weather.forecast). Запоминается до наступления этих фаз. */
    function makeForecast() {
      var WD = D.weather, F = WD.forecast, out = [], i, j, w, pi, wind;
      for (i = 0; i < S.weatherAhead.length; i++) {
        var ph = S.phase + 1 + i;
        if (ph >= D.time.days * 2) break;
        w = S.weatherAhead[i]; wind = w.wind; pi = 0;
        for (j = 0; j < WD.precips.length; j++) if (WD.precips[j].id === w.precip) pi = j;
        var t = w.temp + randInt(-F.tempError, F.tempError);
        if (rng() < F.windMiss) wind = clamp(wind + (rng() < 0.5 ? -1 : 1), 0, WD.winds.length - 1);
        if (rng() < F.precipMiss) pi = clamp(pi + (rng() < 0.5 ? -1 : 1), 0, WD.precips.length - 1);
        out.push({ phase: ph, temp: t, wind: wind, precip: WD.precips[pi].id });
      }
      for (i = 0; i < out.length; i++) {
        for (j = S.forecast.length - 1; j >= 0; j--) if (S.forecast[j].phase === out[i].phase) S.forecast.splice(j, 1);
        S.forecast.push(out[i]);
      }
      S.forecast.sort(function (a, b) { return a.phase - b.phase; });
      return out;
    }
    function tempText(v) { return (v < 0 ? '−' : (v > 0 ? '+' : '')) + Math.abs(v); }
    function forecastLines(list) {
      var T = D.tips.forecast, WD = D.weather;
      return list.map(function (f) {
        var when = (f.phase % 2 === 1 ? T.night : T.day).split('{n}').join(Math.floor(f.phase / 2) + 1);
        return fill([T.line], { when: when, t: tempText(f.temp), wind: WD.winds[f.wind].name, precip: precipDef(f.precip).name })[0];
      });
    }
    /* Для тестов и отладки: задать погоду вручную; lock — не менять её при смене суток. */
    function setWeather(w, lock) {
      var WD = D.weather, wind = w.wind || 0;
      S.weather = finishWeather({
        temp: w.temp, wind: wind,
        windMs: w.windMs !== undefined ? w.windMs : WD.winds[wind].msMin,
        precip: w.precip || 'none'
      });
      S.weatherLocked = !!lock;
    }
    /* ---------- одежда: сумма характеристик надетого (S.gs — кэш, пересчитывается при каждой смене одежды) ---------- */
    function refreshGear() {
      var G = D.gear, r = { warmth: 0, weather: 0, charisma: 0, pockets: 0 }, sp = { patience: 1, searchTime: 1, scrapsRisk: 1, walk: 1 }, i, k, w;
      for (i = 0; i < G.slots.length; i++) {
        w = S.worn[G.slots[i].id];
        if (!w) continue;
        w = D.items[w.type].wear;
        for (k in r) r[k] += w[k] || 0;
        if (w.special) for (k in w.special) sp[k] = (sp[k] === undefined ? 1 : sp[k]) * w.special[k];
      }
      r.sp = sp;
      r.warmthCut = clamp(r.warmth * G.warmthPerPoint, 0, G.warmthCap);          // доля, на которую меньше потеря тепла на улице
      r.chillCut = clamp(r.weather * G.weatherPerPoint, 0, G.weatherCap);        // доля, на которую слабее поправка от ветра и осадков
      r.give = r.charisma * G.charismaPerPoint;                                  // прибавка к шансу подаяния
      r.slots = Math.min(D.inventory.maxSlots, D.inventory.slots + Math.max(0, r.pockets) + (S.bagHandles ? D.items.handles.bagSlots : 0));
      S.gs = r;
      return r;
    }
    function gearStats() { return S.gs; }
    function capacity() { return S.gs.slots; }
    /* «Ощущается как» для героя: одежда от непогоды срезает поправку и ветра, и осадков */
    function heroFeels() {
      var w = S.weather;
      return w.temp - (D.weather.winds[w.wind].chill + precipDef(w.precip).chill) * (1 - S.gs.chillCut);
    }
    function outdoorLoss() {
      var Lw = D.weather.loss;
      return Math.max(Lw.min, (Lw.zeroAt - heroFeels()) * Lw.perDegree) * (1 - S.gs.warmthCut);
    }
    function pipeGain() { return D.places.pipe.warmthPerSecond * D.weather.winds[S.weather.wind].pipeFactor; }
    function fireBurnMult() { return D.weather.winds[S.weather.wind].fireBurn * precipDef(S.weather.precip).fireBurn; }
    function nearFire() {
      var h = S.hero;
      for (var i = 0; i < S.items.length; i++) {
        var it = S.items[i];
        if (it.type !== 'fire') continue;
        var fx = (h.x - it.x) / D.fire.radiusX, fy = (h.y - it.y) / D.fire.radiusY;
        if (fx * fx + fy * fy <= 1) return true;
      }
      return false;
    }
    /* Эффект места (труба, подъезд, лавка) работает, пока герой стоит на месте — в том числе пока ест или разжигает костёр:
       это дела «на ходу», а не уход со двора. Рытьё, сдача тары, разговор и покупки место не греют. */
    function placeIdle() {
      var t = S.hero.task;
      return !t || t.kind === 'use' || t.kind === 'light';
    }
    /* Все слагаемые тепла героя в секунду (без учёта границ шкалы). */
    function heat() {
      var h = S.hero, idle = placeIdle(), parts = [], out = outdoorLoss(), net = 0, i, dh = denHeat(out, idle);
      if (dh) {                                           // правка 022: в обустроенном лежбище погода студит слабее
        parts.push({ key: 'weatherDen', v: dh.loss });
        if (dh.gain) parts.push({ key: 'den', v: dh.gain });
        if (dh.sleep) parts.push({ key: 'denSleep', v: dh.sleep });
      } else if (h.at === 'entrance') {
        parts.push({ key: 'indoor', v: -D.places.entrance.indoorLoss });
      } else if (idle && h.at === 'bench' && !(D.places.bench.fireCancelsPenalty && nearFire())) {
        parts.push({ key: 'weatherBench', v: -out * D.places.bench.warmthDrainMultiplier });
      } else {
        parts.push({ key: 'weather', v: -out });
      }
      if (idle && h.at === 'entrance') parts.push({ key: 'entrance', v: D.places.entrance.warmthPerSecond });
      if (idle && h.at === 'pipe') parts.push({ key: 'pipe', v: pipeGain() });
      if (nearFire()) parts.push({ key: 'fire', v: D.fire.warmthPerSecond });
      for (i = 0; i < parts.length; i++) net += parts[i].v;
      return { parts: parts, net: net, outdoorLoss: out, pipeGain: pipeGain(), fireBurn: fireBurnMult() };
    }

    /* ---------- подсказки: название и что это даёт, с числами ---------- */
    function num(v) {
      var a = Math.abs(v), s = a < 1 ? a.toFixed(2).replace(/0$/, '') : a.toFixed(1);
      s = s.replace(/\.0$/, '').replace('.', ',');
      return (v < 0 ? '−' : '+') + s;
    }
    function plain(v) { return num(v).slice(1); }
    function fill(lines, vars) {
      return lines.map(function (s) {
        for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
        return s;
      });
    }
    /* Характеристики вещи или товара: только ненулевые, [{key, v}] в порядке gear.wearOrder / gear.useOrder */
    function statList(type) {
      var def = D.items[type], src = def.wear || def.use || {}, order = def.wear ? D.gear.wearOrder : D.gear.useOrder, out = [], i;
      for (i = 0; i < order.length; i++) if (src[order[i]]) out.push({ key: order[i], v: src[order[i]] });
      if (def.bagSlots) out.push({ key: 'slots', v: def.bagSlots });
      return out;
    }
    function signed(v) { return (v < 0 ? '−' : '+') + Math.abs(v); }
    function statText(list) {
      return list.map(function (q) { return D.gear.stats[q.key].name + ' ' + signed(q.v); }).join(', ');
    }
    function specialList(type) {
      var w = D.items[type].wear, out = [], k, v;
      if (!w || !w.special) return out;
      for (k in w.special) {
        v = w.special[k];
        out.push(fill([D.gear.special[k] || k], { m: plain(v), p: Math.round(Math.abs(v - 1) * 100), d: plain(1 / v) })[0]);
      }
      return out;
    }
    function slotName(id) {
      for (var i = 0; i < D.gear.slots.length; i++) if (D.gear.slots[i].id === id) return D.gear.slots[i].name;
      return id;
    }
    function itemName(it) { var d = D.items[it.type]; return it.read && d.readName ? d.readName : d.name; }
    /* Чем вещь type отличается от надетой в том же слоте: [{key, v}] (пусто — то же самое) или null, если слот пуст */
    function gearDiff(type) {
      var w = D.items[type].wear, old = w ? S.worn[w.slot] : null, out = [], i, k, d;
      if (!old) return null;
      var ow = D.items[old.type].wear;
      for (i = 0; i < D.gear.wearOrder.length; i++) { k = D.gear.wearOrder[i]; d = (w[k] || 0) - (ow[k] || 0); if (d) out.push({ key: k, v: d }); }
      return { name: D.items[old.type].name, list: out };
    }
    /* Что продаёт место (ларёк, палатка): всё для карточек меню. Купленное «один раз» в списке не показывается. */
    function shopInfo(pid) {
      var P = D.places[pid], out = [], i, g, def;
      if (!P || !P.goods) return out;
      for (i = 0; i < P.goods.length; i++) {
        g = P.goods[i]; def = D.items[g.type];
        if (def.once && S.bagHandles) continue;
        var w = def.wear, worn = !!(w && S.worn[w.slot] && S.worn[w.slot].type === g.type);
        out.push({
          type: g.type, price: g.price, name: def.name, emoji: def.emoji, stats: statList(g.type), special: specialList(g.type),
          joke: (D.tips.jokes[g.type] || '').split('{n}').join(def.bagSlots || ''), slot: w ? slotName(w.slot) : '', once: !!def.once,
          worn: worn, diff: w && !worn ? gearDiff(g.type) : null, canBuy: S.money >= g.price && !worn
        });
      }
      return out;
    }
    function priceRange(pid) {
      var g = D.places[pid].goods, mn = Infinity, mx = 0, i;
      for (i = 0; i < g.length; i++) { mn = Math.min(mn, g[i].price); mx = Math.max(mx, g[i].price); }
      return { min: mn, max: mx };
    }
    function heatLabel(key) {
      var hd = denHeatDef(), s = D.tips.heat[key].split('{m}').join(key === 'weatherDen' && hd ? plain(hd.lossMult) : D.places.bench.warmthDrainMultiplier);
      if ((key === 'weather' || key === 'weatherBench' || key === 'weatherDen') && S.gs.warmthCut > 0) s += D.tips.heat.gearNote.split('{p}').join(Math.round(S.gs.warmthCut * 100));
      return s;
    }
    function describe(kind, id) {
      var T = D.tips, H = heat(), slow = taskSlowdown(), it, def, n, i;
      var walkLine = function (t) {
        var s = walkSeconds(t);
        return s < 1 ? T.walkNear : T.walk.split('{s}').join(Math.ceil(s));
      };
      if (kind === 'place') {
        var P = D.places[id];
        if (!P) return null;
        var lines;
        if (id === 'bin') {
          lines = S.binStock > 0 ? fill(T.places.bin, { n: S.binStock, s: plain(P.searchSeconds * S.gs.sp.searchTime * slow) }) : T.places.binEmpty.slice();
        } else if (id === 'recycle') {
          lines = fill(T.places.recycle, { b: P.prices.bottle, c: P.prices.can, s: plain(P.processSeconds * slow) });
        } else if (id === 'kiosk') {
          lines = fill(T.places[id], priceRange(id));
        } else if (id === 'stall') {
          lines = fill(T.places[id], priceRange(id));
        } else if (id === 'bench') {
          lines = fill(T.places.bench, { n: P.healthInterval, x: num(-H.outdoorLoss * P.warmthDrainMultiplier) });
        } else if (id === 'entrance') {
          var blk = entranceBlocked(), CC = D.npcs.cop;
          lines = fill(T.places.entrance, { g: num(P.warmthPerSecond - P.indoorLoss), d: CC.kickDamage, a: CC.lingerMin, b: CC.lingerMax, c: P.lockMin, e: P.lockMax });
          lines.push(S.hero.at === 'entrance' ? T.places.entranceMood[entranceMood()] : T.places.entrancePatience);
          if (blk === 'cop') lines = T.places.entranceCop.concat(lines.slice(0, 1));
          else if (blk === 'lock') lines = fill(T.places.entranceLocked, { n: Math.ceil(S.entranceLock) }).concat(lines.slice(0, 1));
          else if (S.entranceLock > 0 && S.doorOpen > 0 && S.hero.at !== 'entrance') lines = T.places.entranceDoorOpen.concat(lines.slice(0, 1));
        } else if (id === 'den') {                       // правка 022
          var nx = denNext(), pg = pipeGain() - H.outdoorLoss;
          lines = S.den.stage > 0 ? fill(T.places.denBuilt, { net: num(denPreview(false)), sleep: num(denPreview(true)), pipe: num(pg) }) : T.places.denBare.slice();
          if (nx) lines.push((nx.ok ? T.places.denReady : T.places.denNext).split('{name}').join(nx.def.name.toLowerCase()).split('{need}').join(denNeedText(nx)));
          else lines.push(T.places.denDone.split('{n}').join(S.den.stash.length).split('{c}').join(stashCap()));
        } else if (id === 'pipe') {
          lines = fill(T.places[['pipeCalm', 'pipeLight', 'pipeStrong'][Math.min(S.weather.wind, 2)]], { g: num(H.pipeGain), net: num(H.pipeGain - H.outdoorLoss) });
        } else {
          lines = [];
        }
        if (P.hours) {                                     // правка 016: часы работы и «закрыто до …»
          if (placeClosed(id)) lines = [T.places.closedUntil.split('{t}').join(opensAt(id))].concat(lines);
          else lines.push(T.places.hours.split('{a}').join(fmtHour(P.hours[0])).split('{b}').join(fmtHour(P.hours[1])));
        }
        if (S.hero.at !== id) lines = lines.concat([walkLine({ kind: 'place', id: id })]);
        return { title: P.name + (placeClosed(id) ? ' (закрыто)' : ''), lines: lines };
      }
      if (kind === 'item' || kind === 'inv') {
        if (kind === 'item') it = findItem(id);
        else { i = invIndex(id); it = i >= 0 ? S.inv[i] : null; }
        if (!it) return null;
        def = D.items[it.type];
        var u = def.use || {}, F = D.fire, fb = def.burn || D.items.cardboard.burn;
        var vars = {
          p: D.places.recycle.prices[it.type], sat: u.satiety, s: plain((u.seconds || (it.type === 'matches' ? F.craftSeconds : 0)) * slow), w: u.warmth, hp: u.riskHealth || -(u.health || 0),
          risk: Math.round((u.riskChance || 0) * S.gs.sp.scrapsRisk * 100), burn: Math.round(F.burnSeconds * fb / F.burnRef / H.fireBurn), feed: Math.round(fb / H.fireBurn),
          g: num(F.warmthPerSecond), t: it.timeLeft !== undefined ? Math.max(0, Math.ceil(it.timeLeft / H.fireBurn)) : 0,
          burnNote: H.fireBurn > 1.05 ? T.fireBurnNote.split('{m}').join(plain(H.fireBurn)) : '',
          stats: statText(statList(it.type))
        };
        var tk = it.type === 'newspaper' && it.read ? 'newspaperRead' : it.type, il;
        if (def.wear) {                                    // вещь: что даёт, куда надевается, особое свойство, шутка
          il = [statText(statList(it.type)), T.wear.slot.split('{slot}').join(slotName(def.wear.slot))].concat(specialList(it.type));
          if (!il[0]) il.shift();
          if (T.jokes[it.type]) il.push(T.jokes[it.type]);
          if (kind === 'inv') il.push(T.wear.click);
        } else if (T.items[tk]) il = fill(T.items[tk], vars);
        else if (def.use) il = fill([T.use], vars).concat(T.jokes[it.type] ? [T.jokes[it.type]] : []);
        else il = [];
        if (kind === 'item') il = il.concat(it.type === 'fire' ? [walkLine({ kind: 'item', id: id })] : [T.ground + '. ' + walkLine({ kind: 'item', id: id })]);
        return { title: itemName(it), lines: il };
      }
      if (kind === 'gear') {                               // слот «Надето»
        var gw = S.worn[id], gl;
        if (!gw) return { title: slotName(id), lines: [T.wear.empty[(String(id).length + dayNo()) % T.wear.empty.length]] };
        gl = [statText(statList(gw.type))].concat(specialList(gw.type));
        if (!gl[0]) gl.shift();
        if (T.jokes[gw.type]) gl.push(T.jokes[gw.type]);
        gl.push(T.wear.clickOff);
        return { title: D.items[gw.type].name + ' (' + slotName(id) + ')', lines: gl };
      }
      if (kind === 'gearsum') {                            // строка-итог: что дают надетые вещи вместе, нули не показываются
        var gs = S.gs, sl = [];
        if (gs.warmth) sl.push(fill([T.wear.warmth], { v: signed(gs.warmth), p: Math.round(gs.warmthCut * 100) })[0]);
        if (gs.weather) sl.push(fill([T.wear.weather], { v: signed(gs.weather), p: Math.round(gs.chillCut * 100) })[0]);
        if (gs.charisma) sl.push(fill([T.wear.charisma], { v: signed(gs.charisma), pp: signed(Math.round(gs.give * 100)) })[0]);
        if (gs.slots !== D.inventory.slots) sl.push(T.wear.slots.split('{n}').join(gs.slots));
        if (!sl.length) sl.push(T.wear.sumNone);
        return { title: T.wear.sumTitle, lines: sl };
      }
      if (kind === 'weather') {                            // панель погоды: что сейчас и прогноз из газеты, пока он не наступил
        var Wn = S.weather, wl = [tempText(Wn.temp) + '°, ' + D.weather.winds[Wn.wind].name + ', ' + precipDef(Wn.precip).name + ', ' + D.weather.labels.feels.split('{f}').join(tempText(Math.round(heroFeels())) + '°')];
        if (S.forecast.length) wl = wl.concat(forecastLines(S.forecast), [T.forecast.note]);
        else wl.push(T.forecast.none);
        return { title: T.forecast.title, lines: wl };
      }
      if (kind === 'npc') {
        n = findNpc(id);
        if (!n) return null;
        var C = D.npcs[n.type], nl;
        if (n.type === 'passerby' || n.type === 'granny') {
          var mods = walkerMods(), ws = walkSeconds({ kind: 'npc', id: id });
          if (n.type === 'passerby') {
            var KT = T.npcs.kinds[n.kind] || { how: '', joke: '' };
            nl = fill(T.npcs.passerby, { how: KT.how, s: plain(C.talkSeconds * slow) });
            if (mods.give < D.walkers.badGive) nl.push(T.npcs.weatherBad);
            else if (mods.give < 1) nl.push(T.npcs.weatherMeh);
            else if (KT.joke) nl.push(KT.joke);
            if (n.state === 'busWait') nl.push(T.npcs.busWait);
            else if (n.trash) nl.push(T.npcs.trash);
            else if (n.state === 'walk' && kindDef(n).weatherHurry && mods.speed > 1) nl.push(T.npcs.weatherHurry);
            else if ((n.hurry || 1) > 1.05) nl.push(T.npcs.hurry);
            else if ((n.giveF || 1) > 1.05) nl.push(T.npcs.relaxed);
          } else {
            nl = fill(T.npcs.granny, { s: plain(C.talkSeconds * slow), m: C.money });
            if (n.pose === 'sit') nl.push(T.npcs.grannySit);
          }
          if (S.gs.charisma && !n.asked && !n.spoken) nl.push(T.npcs.charisma.split('{pp}').join(signed(Math.round(S.gs.give * 100))));
          if (n.asked || n.spoken) nl.push(T.npcs.asked);
          else nl.push(ws === Infinity ? T.npcs.noCatch : (ws < 1 ? T.walkNear : T.walk.split('{s}').join(Math.ceil(ws))));
          return { title: npcName(n) + (n.asked || n.spoken ? ' (' + T.askedMark + ')' : ''), lines: nl };
        }
        return {
          title: C.name,
          lines: [walkLine({ kind: 'npc', id: id })].concat(fill(T.npcs[n.type] || [], { a: C.lingerMin, b: C.lingerMax, d: C.kickDamage }))
        };
      }
      if (kind === 'clock') {
        var left = Math.max(0, Math.ceil(phaseLen() - S.phaseTime)), dd = dayDiv(dayNo());
        return {
          title: T.clock.title.split('{n}').join(dayNo()).split('{all}').join(D.time.days).split('{phase}').join(rhythm().name),
          lines: [
            T.clock.now.split('{t}').join(fmtHourApprox(clockHour())),
            (isNight() ? T.clock.toDawn : T.clock.toDark).split('{s}').join(left),
            T.clock.split.split('{d}').join(dd).split('{all}').join(D.time.divisions).split('{n}').join(D.time.divisions - dd),
            T.clock.joke[dayNo() % T.clock.joke.length]
          ]
        };
      }
      if (kind === 'stat') {
        var ST = T.stats[id];
        if (!ST || S.hero[id] === undefined) return null;
        var sl = fill(ST.lines, { s: plain(id === 'satiety' ? D.hero.satietyDrainInterval : D.hero.energyDrainInterval), t: D.hero.tiredThreshold });
        if (id === 'warmth') {                            // разбор по источникам — как на подсказке героя
          var hl = [];
          for (i = 0; i < H.parts.length; i++) hl.push(heatLabel(H.parts[i].key) + ': ' + num(H.parts[i].v) + '/с');
          hl.push(T.heat.total + ': ' + num(H.net) + '/с');
          sl = hl.concat(sl);
        }
        return { title: ST.title + ': ' + Math.ceil(S.hero[id]), lines: sl };
      }
      if (kind === 'hero') {
        var h = S.hero, doing;
        if (h.asleep) doing = T.doing.asleep.split('{e}').join(plain(1 / D.hero.energyGainInterval));
        else if (h.task) doing = T.doing[h.task.kind] || T.doing.idle;
        else if (h.walking || h.move) doing = T.doing.walking;
        else doing = T.doing[h.at] || T.doing.idle;
        var out = [doing];
        if (slow > 1) out.push(T.doing.tired.split('{m}').join(plain(slow)));
        for (i = 0; i < H.parts.length; i++) {
          out.push(heatLabel(H.parts[i].key) + ': ' + num(H.parts[i].v) + '/с');
        }
        out.push(T.heat.total + ': ' + num(H.net) + '/с');
        return { title: D.hero.name, lines: out };
      }
      return null;
    }

    /* ---------- задачи (data.js: goals) ---------- */
    function goals() {
      var list = D.goals.map(function (G) {
        var done = 0, total = 1;
        if (G.kind === 'surviveNights') { total = D.time.days; done = Math.min(total, Math.floor(S.phase / 2)); }
        return {
          id: G.id, done: done, total: total, complete: done >= total,
          text: G.text.split('{n}').join(D.time.days + 1),
          progress: G.progress.split('{a}').join(done).split('{b}').join(total)
        };
      });
      list.push(denGoal());                                 // правка 022: ближняя цель — лежбище
      return list;
    }

    /* ---------- геометрия ---------- */
    function boundedPos(x, y) {
      var mx = Math.min(.035, L.fieldMarginPx / field.w), my = Math.min(.06,L.fieldMarginPx / field.h);
      return {
        x: clamp(x, mx, 1 - mx),
        y: clamp(y, navTop, 1 - my)
      };
    }
    function clampPos(x,y) {
      var p = boundedPos(x,y);
      return projectGround(p.x,p.y);
    }
    function distPx(ax, ay, bx, by) {
      var dx = (ax - bx) * field.w, dy = (ay - by) * field.h;
      return Math.sqrt(dx * dx + dy * dy);
    }
    function freeSpot(cx, cy) {
      var steps = L.lootRingSteps;
      var start = Math.floor(rng() * steps);
      for (var r = 0; r < L.lootRingRadiiPx.length; r++) {
        for (var k = 0; k < steps; k++) {
          var ang = (start + k) / steps * Math.PI * 2;
          var px = cx * field.w + Math.cos(ang) * L.lootRingRadiiPx[r];
          var py = cy * field.h + Math.sin(ang) * L.lootRingRadiiPx[r];
          if (px < L.fieldMarginPx || px > field.w - L.fieldMarginPx) continue;
          if (py < L.fieldTopMarginPx || py > field.h - L.fieldMarginPx) continue;
          var x = px / field.w, y = py / field.h, ok = walkable(x,y), i;
          for (i = 0; i < S.items.length && ok; i++) {
            if (distPx(x, y, S.items[i].x, S.items[i].y) < L.itemSpacingPx) ok = false;
          }
          for (var pid in D.places) {
            if (distPx(x, y, D.places[pid].x, D.places[pid].y) < L.placeClearPx) ok = false;
          }
          if (ok) return { x: x, y: y };
        }
      }
      return clampPos(cx + rand(-0.08, 0.08), cy + rand(-0.08, 0.08));
    }

    /* ---------- сущности ---------- */
    function findItem(id) {
      for (var i = 0; i < S.items.length; i++) if (S.items[i].id === id) return S.items[i];
      return null;
    }
    function removeItem(it) {
      var i = S.items.indexOf(it);
      if (i >= 0) S.items.splice(i, 1);
    }
    function findNpc(id) {
      for (var i = 0; i < S.npcs.length; i++) if (S.npcs[i].id === id) return S.npcs[i];
      return null;
    }
    function removeNpc(n) {
      var i = S.npcs.indexOf(n);
      if (i >= 0) S.npcs.splice(i, 1);
    }
    function spawnItemAt(type, x, y) {
      var pos = clampPos(x,y);
      var it = { id: nextId++, type: type, x: pos.x, y: pos.y, locked: false, held: false };
      if (type === 'fire') { it.timeLeft = D.fire.burnSeconds; it.feedQueue = 0; it.feedT = 0; it.feedList = []; }
      S.items.push(it);
      return it;
    }
    function spawnItemNear(type, cx, cy) {
      var p = freeSpot(cx, cy);
      return spawnItemAt(type, p.x, p.y);
    }

    /* ---------- инвентарь ---------- */
    function invFull() { return S.inv.length >= capacity(); }
    /* Положить предмет из рук у ног героя (сохраняет номер и пометку «прочитано») */
    function layDown(it) {
      var O = D.hero.walk.dropOffset;
      var p = clampPos(S.hero.x + O.x + rand(-0.012, 0.012), S.hero.y + O.y + rand(-0.008, 0.008));
      var gi = spawnItemAt(it.type, p.x, p.y);
      gi.id = it.id;
      if (it.read) gi.read = true;
      return gi;
    }
    /* Мест стало меньше (сняли вещь с карманами) — лишнее из пакета падает у ног */
    function fitInv() {
      while (S.inv.length > capacity()) {
        var it = S.inv.pop();
        layDown(it);
        log('invFullDrop', { name: itemName(it) });
      }
    }
    function invIndex(id) {
      for (var i = 0; i < S.inv.length; i++) if (S.inv[i].id === id) return i;
      return -1;
    }
    function sellableIndex() {
      var prices = D.places.recycle.prices;
      for (var i = 0; i < S.inv.length; i++) if (prices[S.inv[i].type] !== undefined) return i;
      return -1;
    }
    /* Выдать герою предмет: в пакет, а если не влез — на землю рядом с источником. */
    function give(type, cx, cy) {
      if (!invFull()) { S.inv.push({ id: nextId++, type: type }); return true; }
      var di = spawnItemNear(type, cx, cy);
      di.fromFull = true;                                  // для телеметрии: упало из-за полного пакета
      S.tele.fullDrops++;
      if (D.items[type].food) S.tele.fullDropsFood++;
      log('invFullDrop', { name: D.items[type].name });
      return false;
    }

    /* ---------- урон / конец ---------- */
    function damage(n, cause) {
      if (n <= 0 || S.over) return;
      S.hero.health -= n;
      if (S.hero.health <= 0) {
        S.hero.health = 0;
        S.over = { win: false, cause: cause, total: S.total, phase: S.phase, phaseTime: S.phaseTime };
      }
    }

    /* ---------- события, скорость, сон ---------- */
    function emit(name) {
      if (D.speed.resetEvents.indexOf(name) >= 0) S.speed = D.speed.resetTo;
    }
    function wake(textKey) {
      if (!S.hero.asleep) return;
      S.hero.asleep = false;
      if (R) ev('wake', { why: textKey === 'wakeAlarm' ? 'alarm' : textKey === 'wakeFull' ? 'rested' : textKey ? 'player' : 'kicked', sec: r1(S.total - R.w.sleepT), en: r1(S.hero.energy) });
      if (textKey) log(textKey);
      emit('wake');
    }
    function toggleSleep() {
      if (S.over || S.begging.dialog) return;
      var h = S.hero;
      if (h.asleep) { wake('wake'); return; }
      if (h.at === 'pipe') { log('pipeNoSleep'); return; }
      if (h.energy >= D.hero.max) { log('notSleepy'); return; }
      cancelHeroTask();
      S.menuOpen = false;
      h.asleep = true;
      S.tele.slAt = (!h.at || h.at === 'bench') && nearFire() ? 'fire' : (h.at || 'ground'); S.tele.slT = 0;   // засчитается в teleTick, если проспит 10 с
      if (R) { R.w.sleepT = S.total; ev('sleep', { at: S.tele.slAt, en: r1(h.energy), by: inCtx.by, paused: inCtx.paused ? 1 : 0 }); }
      log('sleepStart');
    }
    function setSpeed(v) {
      if (D.speed.options.indexOf(v) >= 0) {
        if (R && v !== S.speed) { R.w.speed = v; ev('speed', { v: v, from: S.speed, by: inCtx.by }); }
        S.speed = v;
      }
    }
    function taskSlowdown() {
      return S.hero.energy < D.hero.tiredThreshold ? D.hero.tiredTaskMultiplier : 1;
    }

    /* Навигация по точке опоры. Касание ребра разрешено, пересечение внутренности — нет. */
    var blocks = D.navigation.blocks, navTop = D.navigation.top, navEps = 1e-10;
    function walkable(x, y) {
      if (y < navTop - navEps) return false;
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        if (x > b.left + navEps && x < b.right - navEps && y > b.top + navEps && y < b.bottom - navEps) return false;
      }
      return true;
    }
    function projectGround(x, y) {
      y = Math.max(navTop, y);
      if (walkable(x, y)) return { x: x, y: y };
      var nearest, best = Infinity;
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        if (x <= b.left || x >= b.right || y <= b.top || y >= b.bottom) continue;
        var options = [{ x: b.left, y: y }, { x: b.right, y: y }, { x: x, y: b.bottom }];
        if (b.top >= navTop) options.push({ x: x, y: b.top });
        options.forEach(function (p) {
          var d = dist(x,y,p.x,p.y);
          if (d < best && walkable(p.x,p.y)) { best = d; nearest = p; }
        });
      }
      return nearest || { x: x, y: y };
    }
    // Время входа во внутренность прямоугольника. Прямая вдоль края и касание единственного угла допустимы.
    function firstContact(x, y, tx, ty) {
      var dx = tx - x, dy = ty - y, hit = 1;
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        if (Math.max(x,tx) <= b.left + navEps || Math.min(x,tx) >= b.right - navEps ||
            Math.max(y,ty) <= b.top + navEps || Math.min(y,ty) >= b.bottom - navEps) continue;
        var loX = dx ? ((dx > 0 ? b.left : b.right) - x) / dx : -Infinity;
        var hiX = dx ? ((dx > 0 ? b.right : b.left) - x) / dx : Infinity;
        var loY = dy ? ((dy > 0 ? b.top : b.bottom) - y) / dy : -Infinity;
        var hiY = dy ? ((dy > 0 ? b.bottom : b.top) - y) / dy : Infinity;
        var enter = Math.max(0,loX,loY), leave = Math.min(1,hiX,hiY);
        if (enter + navEps < leave && enter < hit) hit = enter;
      }
      return hit;
    }
    function canWalk(x,y,tx,ty) {
      return y >= navTop - navEps && ty >= navTop - navEps && firstContact(x,y,tx,ty) === 1;
    }
    function slideWalk(h, tx, ty) {
      var dx = tx-h.x, dy = ty-h.y, t = firstContact(h.x,h.y,tx,ty);
      if (t === 1) return {x:tx, y:ty};
      var x = h.x + t*dx, y = h.y + t*dy;
      if (dx && canWalk(x,y,tx,y)) x = tx;
      if (dy) y += (ty-y) * firstContact(x,y,x,ty);
      return {x:x,y:y};
    }
    function makeGraph() {
      var nodes = [], costs = [], next = [], i, j, k;
      blocks.forEach(function (b) {
        [b.left,b.right].forEach(function (x) {
          [Math.max(b.top,navTop), b.bottom].forEach(function (y) { nodes.push({x:x,y:y}); });
        });
      });
      for (i = 0; i < nodes.length; i++) {
        var a = nodes[i]; costs[i] = []; next[i] = [];
        for (j = 0; j < nodes.length; j++) {
          var b = nodes[j];
          costs[i][j] = canWalk(a.x,a.y,b.x,b.y) ? dist(a.x,a.y,b.x,b.y) : Infinity;
          next[i][j] = j;
        }
      }
      for (k = 0; k < nodes.length; k++) for (i = 0; i < nodes.length; i++) for (j = 0; j < nodes.length; j++) {
        var via = costs[i][k] + costs[k][j];
        if (via + navEps < costs[i][j]) { costs[i][j] = via; next[i][j] = next[i][k]; }
      }
      return {nodes:nodes, costs:costs, next:next};
    }
    var navSource;
    function fromGround(x, y) {
      if (navSource && navSource.x === x && navSource.y === y) return navSource;
      var graph = courtyardGraph || (courtyardGraph = makeGraph()), nodes = graph.nodes;
      var lens = nodes.map(function () { return Infinity; }), starts = [];
      nodes.forEach(function (a,i) {
        if (!canWalk(x,y,a.x,a.y)) return;
        var edge = dist(x,y,a.x,a.y);
        for (var j = 0; j < nodes.length; j++) {
          var cost = edge + graph.costs[i][j];
          if (cost < lens[j] - navEps) { lens[j] = cost; starts[j] = i; }
        }
      });
      navSource = {x:x,y:y,lens:lens,starts:starts};
      return navSource;
    }
    function groundRoute(x,y,tx,ty,points) {
      if (canWalk(x,y,tx,ty)) return points ? [{x:tx,y:ty}] : dist(x,y,tx,ty);
      var src = fromGround(x,y), g = courtyardGraph, best = Infinity, end = -1;
      for (var j = 0; j < g.nodes.length; j++) {
        var a = g.nodes[j], d = src.lens[j] + dist(a.x,a.y,tx,ty);
        if (d < best - navEps && canWalk(a.x,a.y,tx,ty)) { best = d; end = j; }
      }
      if (!points) return best;
      var path = [];
      if (end < 0) return path;
      var idx = src.starts[end];
      for (;;) {
        a = g.nodes[idx];
        if (dist(x,y,a.x,a.y) > navEps) path.push(a);
        if (idx === end) break;
        idx = g.next[idx][end];
      }
      path.push({x:tx,y:ty});
      return path;
    }
    function walkDistance(x,y,tx,ty) { return groundRoute(x,y,tx,ty,false); }
    // Производные углы пути не входят в сохранение: после загрузки пересчитываются от текущего положения.
    var routes = new WeakMap();
    function moveOnGround(actor, tx, ty, step) {
      var path = routes.get(actor);
      if (!path || path.tx !== tx || path.ty !== ty || path.x !== actor.x || path.y !== actor.y) {
        path = { tx:tx, ty:ty, points:groundRoute(actor.x,actor.y,tx,ty,true), index:0 };
        routes.set(actor,path);
      }
      var moved = 0;
      while (path.index < path.points.length) {
        var p = path.points[path.index], dx = p.x-actor.x, d = dist(actor.x,actor.y,p.x,p.y);
        if (step > 0 && Math.abs(dx) > .002) actor.dir = dx < 0 ? -1 : 1;
        if (d > step) {
          actor.x += dx * step/d; actor.y += (p.y-actor.y)*step/d; moved += step;
          break;
        }
        actor.x = p.x; actor.y = p.y; moved += d; step -= d; path.index++;
        // Показываем сам угол хотя бы один кадр: между двумя соседними позами тоже свободный отрезок.
        if (d > navEps) break;
      }
      path.x = actor.x; path.y = actor.y;
      return {arrived:actor.x === tx && actor.y === ty, moved:moved};
    }

    /* ---------- дела героя ---------- */
    /* Дело героя с таймером на месте. autoRepeat у места в data.js — повторять, пока доступно. */
    function placeTaskDef(id) {
      var P = D.places[id];
      if (id === 'bin') return { kind: 'search', dur: P.searchSeconds * S.gs.sp.searchTime, available: S.binStock > 0, blockedText: 'binEmpty', startText: 'searching' };
      if (id === 'den') {                                // правка 022: есть всё на следующую ступень — строить; голый лаз без материалов — не лечь
        var nx = denNext();
        if (nx && nx.ok) return { kind: 'build', dur: nx.def.seconds, available: true, startText: 'denBuildStart' };
        if (S.den.stage === 0) return { kind: 'build', dur: 0, available: false, blockedText: 'denNeed', vars: { need: denNeedText(nx) } };
        return null;
      }
      if (id === 'kiosk' || id === 'stall') return { kind: 'shop', dur: P.browseSeconds, available: true };
      if (id === 'recycle') {
        return {
          kind: 'sell', dur: P.processSeconds, available: sellableIndex() >= 0,
          blockedText: 'nothingToSell', doneText: S.sellBatch > 0 ? 'sellDone' : 'nothingToSell'
        };
      }
      return null;
    }
    function startPlaceTask(id, carry, isRepeat) {
      var def = placeTaskDef(id);
      if (!def) return false;
      if (placeClosed(id)) return false;
      if (!def.available) {
        var key = isRepeat ? (def.doneText || def.blockedText) : def.blockedText;
        if (key) log(key, def.vars || { n: S.sellBatch });
        if (id === 'bin') S.tele.emptyTries++;
        return false;
      }
      S.hero.task = { kind: def.kind, placeId: id, t: carry || 0, dur: def.dur };
      return true;
    }
    function cancelHeroTask() {
      var t = S.hero.task;
      if (!t) return;
      S.hero.task = null;
      if (t.kind === 'use') {
        // недоеденное возвращается в пакет, а если места уже нет — на землю
        if (!invFull()) S.inv.push({ id: t.item.id, type: t.item.type });
        else {
          spawnItemNear(t.item.type, S.hero.x, S.hero.y);
          log('invFullDrop', { name: D.items[t.item.type].name });
        }
      } else if (t.kind === 'talk') {
        var n = findNpc(t.npcId);
        if (n) n.engaged = false;
      }
    }
    function heroLeavePlace(forced) {
      cancelHeroTask();
      if (!forced && S.hero.at === 'entrance' && !doorOpen()) sfx('entranceDoorPass');
      S.hero.at = null;
      S.menuOpen = false;
    }
    function talkable(n) {
      return !!n && (n.type === 'passerby' || n.type === 'granny') && !n.engaged && !n.asked && !n.spoken && n.state !== 'board';
    }
    function startTalk(n) {
      cancelHeroTask();
      n.engaged = true;
      S.hero.task = { kind: 'talk', npcId: n.id, t: 0, dur: D.npcs[n.type].talkSeconds };
    }

    function skillProgress(skill) {
      var social = skill === 'social', xp = social ? S.begging.socialXp : S.begging.xp;
      var levels = social ? D.begging.socialLevels : D.begging.levels, level = 1;
      while (level < levels.length && xp >= levels[level]) level++;
      var nextCard = null;
      for (var id in D.begging.cards) {
        var card = D.begging.cards[id];
        if ((card.skill || 'begging') === skill && card.level === level + 1) nextCard = card.label;
      }
      return { xp: xp, level: level, nextLevelXp: levels[level] || null, nextCard: nextCard };
    }
    function cardEnabled(id, dialog) {
      if (id === 'ask' || id === 'goodbye') return true;
      return id === 'askAboutYard' ? !dialog.question : !dialog.used;
    }
    function adjustOdds(chance, factor) {
      return chance * factor / (1 - chance + chance * factor);
    }
    function cardChance(id, n, dialog) {
      if (id === 'ask') return giveChance(n, dialog);
      if (id === 'goodbye') return null;
      var base = D.begging.socialBases[who(n)][id];
      var practice = D.begging.practice.social[skillProgress('social').level - 1];
      var chance = base + (1 - base) * D.begging.socialReach * practice;
      return adjustOdds(chance, D.begging.moods[dialog.mood][id] * dialog.rapport);
    }
    function newDialogue(n, step) {
      var moods = Object.keys(D.begging.moods), roll = rng() * moods.length;
      var mood = moods[Math.floor(roll)], lines = D.encounterText.observations[who(n)][mood];
      return { npcId: n.id, used: null, question: false, lastMove: null, socialGain: 0, unlocked: [],
        mood: mood, observationIndex: Math.floor((roll % 1) * lines.length), rapport: 1, bonus: 0, feedback: '', step: step };
    }
    function nextDialogueLine(id, play, dialog) {
      // Даже после вопроса о дворе просьба продолжает разговор о еде или состоявшейся помощи.
      if (id === 'ask') {
        var followups = D.encounterText.followupRequests;
        if (dialog.used === 'explain') return followups.explain;
        if (dialog.used === 'favor') return dialog.favorAgreed ? followups.favorAgreed : followups.favorDeclined;
      }
      var variants = D.begging.cards[id].variants, count = { talk: 'talksTold', joke: 'jokesTold', ask: 'requestsMade' }[id];
      var variant = variants[S.begging[count] % variants.length];
      if (play) S.begging[count]++;
      return variant;
    }
    function farewellLine(dialog, kind) {
      var data = D.begging.cards.goodbye, last = dialog.lastMove;
      if (last && last.ok === false) {
        var farewell = D.encounterText.failedFarewells[kind];
        return { id: 'miss-' + last.topic, line: D.encounterText.failedFarewellLines[last.topic] || farewell.line, reply: farewell.reply };
      }
      if (last && last.card === 'askAboutYard') {
        var yard = data.yard[kind][last.index];
        if (yard) return { id: 'yard-' + kind + '-' + last.index, line: yard.line, reply: yard.reply };
      }
      var topic = last && data.topics[last.topic];
      if (topic) return { id: last.topic, line: topic.line, reply: topic.replies[kind] };
      var opener = data.openers[S.begging.neutralGoodbyes % data.openers.length];
      return { id: opener.id, line: opener.line, reply: opener.replies[kind], neutral: true };
    }
    function begView() {
      var dialog = S.begging.dialog;
      if (!dialog) return null;
      var n = findNpc(dialog.npcId), cards = [];
      var skills = { social: skillProgress('social'), begging: skillProgress('begging') };
      for (var id in D.begging.cards) {
        var card = D.begging.cards[id], skill = card.skill || 'begging';
        if (card.level > skills[skill].level) continue;
        var enabled = cardEnabled(id, dialog);
        cards.push({ id: id, label: card.label, description: card.description, enabled: enabled, chance: cardChance(id, n, dialog),
          line: id === 'goodbye' ? farewellLine(dialog, who(n)).line : card.variants && enabled ? nextDialogueLine(id, false, dialog).line : D.encounterText.lines[id] || null });
      }
      var help = giveChance(n, dialog), food = n.type === 'granny' ? help * D.npcs.granny.scrapsChance : 0;
      return { npcId: n.id, name: npcName(n), kind: who(n), skills: skills, socialGain: dialog.socialGain,
        xp: skills.begging.xp, level: skills.begging.level, nextLevelXp: skills.begging.nextLevelXp, nextCard: skills.begging.nextCard,
        feedback: dialog.feedback, exchange: dialog.exchange || null, joke: dialog.used === 'joke' ? dialog.exchange || null : null,
        unlocked: dialog.unlocked.slice(), chance: help, foodChance: food, moneyChance: help - food,
        mood: dialog.mood, observation: D.encounterText.observations[who(n)][dialog.mood][dialog.observationIndex],
        lastOutcome: dialog.lastOutcome || null, cards: cards };
    }
    function formatYardHint(reply) {
      var places = D.places, kiosk = places.kiosk, recycle = places.recycle;
      function price(type) { return kiosk.goods.find(function (item) { return item.type === type; }).price; }
      var values = { tea: price('tea'), bread: price('bread'), shawarma: price('shawarma'),
        kioskClose: fmtHour(kiosk.hours[1]), recycleOpen: fmtHour(recycle.hours[0]), recycleClose: fmtHour(recycle.hours[1]),
        stallOpen: fmtHour(places.stall.hours[0]), stallClose: fmtHour(places.stall.hours[1]),
        can: recycle.prices.can, bottle: recycle.prices.bottle, cardboard: D.den.stages[0].need[0].cardboard };
      return reply.replace(/\{(\w+)\}/g, function (_, key) { return values[key]; });
    }
    function savedDialogueMove(dialog, kind) {
      if (dialog.question) {
        var hints = D.begging.cards.askAboutYard.hints[kind];
        var index = hints.findIndex(function (hint) { return formatYardHint(hint) === dialog.feedback; });
        if (index >= 0) return { card: 'askAboutYard', index: index };
        if (!dialog.used && S.begging.yardHintsHeard[kind]) {
          return { card: 'askAboutYard', index: (S.begging.yardHintsHeard[kind] - 1) % hints.length };
        }
      }
      if (dialog.exchange && (!dialog.question || dialog.feedback === dialog.exchange.reply)) {
        return { card: dialog.used, topic: dialog.exchange.id };
      }
      if (dialog.used === 'explain' || dialog.used === 'favor') {
        if (!dialog.question || dialog.feedback === D.begging.cards[dialog.used].feedback) {
          return { card: dialog.used, topic: dialog.used };
        }
      }
      return null;
    }
    function awardCardXp(skill, dialog, previous) {
      var social = skill === 'social', gain = social ? D.begging.xpPerReply : D.begging.xpPerAsk;
      if (social) {
        S.begging.socialXp += gain;
        dialog.socialGain += gain;
      } else S.begging.xp += gain;
      var after = skillProgress(skill);
      if (after.level > previous.level && previous.nextCard) dialog.unlocked.push(previous.nextCard);
      ev(social ? 'socialXp' : 'begXp', { id: dialog.npcId, xp: after.xp, level: after.level, gain: gain });
    }
    function playBegCard(id) {
      var dialog = S.begging.dialog;
      if (!dialog || !Object.prototype.hasOwnProperty.call(D.begging.cards, id)) return false;
      var card = D.begging.cards[id], skill = card.skill || 'begging', progress = skillProgress(skill), n = findNpc(dialog.npcId);
      if (!n || card.level > progress.level || !cardEnabled(id, dialog)) return false;
      teleInc(S.tele.begCards, id);
      var practiced = id === 'ask' ? 'begging' : 'social';
      ev('begCard', { id: n.id, who: who(n), card: id, skill: id === 'goodbye' ? undefined : practiced, level: skillProgress(practiced).level });
      if (id !== 'ask' && id !== 'goodbye') {
        var before = giveChance(n, dialog), probability = cardChance(id, n, dialog), ok = rng() < probability;
        var kind = who(n), variant = card.variants ? nextDialogueLine(id, true, dialog) : null;
        var topic = variant ? variant.id : id, line = variant ? variant.line : D.encounterText.lines[id];
        var reply, last = { card: id, topic: topic, ok: ok };
        if (id === 'askAboutYard') dialog.question = true;
        else dialog.used = id;
        if (!ok) reply = D.encounterText.failures[topic][kind];
        else if (id === 'askAboutYard') {
          var hints = card.hints[kind], heard = S.begging.yardHintsHeard[kind] || 0;
          last.index = heard % hints.length;
          S.begging.yardHintsHeard[kind] = heard + 1;
          reply = formatYardHint(hints[last.index]);
          ev('yardHint', { id: n.id, who: kind, index: last.index, text: reply });
        } else {
          reply = variant ? variant.replies[kind] : D.encounterText.successes[id][kind];
        }
        if (id === 'favor') dialog.favorAgreed = ok;
        dialog.rapport *= D.begging.rapportOdds[id][ok ? 'yes' : 'no'];
        dialog.lastOutcome = { card: id, ok: ok, before: before, after: giveChance(n, dialog) };
        dialog.feedback = reply;
        dialog.exchange = { id: topic, line: line, reply: reply };
        dialog.lastMove = last;
        appendLogLine(D.hero.name + ' — ' + line + '  ' + npcName(n) + ' — ' + reply);
        ev(id, { id: n.id, who: kind, variant: topic, line: line, reply: reply, chance: probability, ok: ok, rapport: dialog.rapport });
        awardCardXp('social', dialog, skillProgress('social'));
        return true;
      }
      S.begging.dialog = null;
      var result = {}, text = card.feedback;
      if (id === 'ask') {
        result = finishHeroTask(dialog, nextDialogueLine(id, true, dialog));
        text = result.outcome;
        awardCardXp('begging', dialog, progress);
      } else {
        var farewell = farewellLine(dialog, who(n));
        if (farewell.neutral) S.begging.neutralGoodbyes++;
        result.variant = farewell.id; result.line = farewell.line; result.reply = farewell.reply;
        text = '';
        appendLogLine(D.hero.name + ' — ' + result.line + '  ' + npcName(n) + ' — ' + result.reply);
        n.engaged = false;
        n.spoken = true;
        if (R) R.done = S.hero.task;
        S.hero.task = null;
        ev('done', { k: 'conversation', id: n.id, who: who(n), variant: farewell.id, line: result.line, reply: result.reply });
      }
      // Доводим прерванный шаг до конца в исходном порядке: награда, предметы, затем NPC.
      updateItems(dialog.step);
      updateNpcs(dialog.step);
      recTrack();
      var skills = { social: skillProgress('social'), begging: skillProgress('begging') };
      return { action: id, ok: !!result.ok, got: result.got || 0, food: result.food || null, text: text, skills: skills,
        exchange: { id: result.variant, line: result.line, reply: result.reply, name: npcName(n) },
        why: result.why || null, dropped: !!result.drop,
        xp: skills.begging.xp, xpGain: id === 'ask' ? D.begging.xpPerAsk : 0, socialGain: dialog.socialGain,
        level: skills.begging.level, unlocked: dialog.unlocked.slice() };
    }

    /* ---------- ходьба: герой ходит ногами, дорога стоит времени ---------- */
    function baseWalkSpeed() { return D.hero.walk.speed * D.hero.walk.heroMult; }
    function walkSpeed() {
      var Wk = D.hero.walk, v = baseWalkSpeed();
      if (S.hero.energy < D.hero.tiredThreshold) v *= Wk.tiredFactor;
      if (invFull()) v *= Wk.fullBagFactor;
      return v * S.gs.sp.walk;
    }
    /* Расстояние в логических единицах (1 = высота поля, ширина = layout.logicalAspect): не зависит от размера окна */
    function dist(ax, ay, bx, by) { var dx = (ax - bx) * L.logicalAspect, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
    /* Где герой встаёт, чтобы работать с целью */
    function standPoint(t, x, y) {
      var Wk = D.hero.walk;
      if (t && t.kind === 'place') {
        var place = D.places[t.id], stand = place.heroStand || L.heroStand;
        return clampPos(place.x + stand.x, place.y + stand.y);
      }
      if (t && t.kind === 'npc') { var n = findNpc(t.id); if (n) return clampPos(n.x, n.y); }
      if (t && t.kind === 'item') {
        var it = findItem(t.id);
        if (it) return it.type === 'fire' ? clampPos(it.x + Wk.besideFire.x, it.y + Wk.besideFire.y) : clampPos(it.x, it.y);
      }
      return clampPos(x, y);
    }
    function walkSeconds(t) {
      if (t && t.kind === 'npc') {                        // идущего перехватывают: время до встречи или «не догнать»
        var wn = findNpc(t.id);
        if (talkable(wn)) { var ip = intercept(wn); return ip ? ip.t : Infinity; }
      }
      var p = standPoint(t, S.hero.x, S.hero.y);
      return walkDistance(S.hero.x, S.hero.y, p.x, p.y) / walkSpeed();
    }
    /* Приказ «иди»: к месту, встречному, предмету, костру или в точку. Отменяет прежний маршрут и дело. */
    function order(target, x, y) {
      if (S.over || S.begging.dialog) return;
      /* Приказ в никуда (цели нет в мире, точки нет) игнорируется: герой продолжает прежнее, журнал и запись не трогаем. */
      var ok = isFinite(x) && isFinite(y) && x !== null && y !== null;
      if (!ok && target) ok = (target.kind === 'place' && !!D.places[target.id]) || (target.kind === 'npc' && !!findNpc(target.id)) || (target.kind === 'item' && !!findItem(target.id));
      if (!ok) return;
      var was = R ? curOrder() : null;
      wake('wake');
      heroLeavePlace();
      S.moveHold = false;
      var t = target ? { kind: target.kind, id: target.id } : null;
      if (t && t.kind === 'place' && !D.places[t.id]) t = null;
      if (t && t.kind === 'npc') {
        var n = findNpc(t.id);
        if (n) { t.type = n.type; t.name = npcName(n); }
        if (!n) t = null;
        else if (!talkable(n)) { x = n.x; y = n.y + 0.03; t = null; }
        else S.tele.chases++;
      }
      if (t && t.kind === 'item' && !findItem(t.id)) t = null;
      if (t && t.kind === 'place' && t.id === 'entrance' && S.entranceLock > 0 && doorOpen()) t.hoped = true;   // шёл, пока дверь была открыта
      var p = standPoint(t, x, y);
      S.hero.move = { x: p.x, y: p.y, target: t };
      if (R) {
        var oe = { to: tgt(t), by: inCtx.by, paused: inCtx.paused ? 1 : 0, was: was };
        if (t && t.kind === 'npc') oe.id = t.id;
        if (!t) { oe.x = r3(p.x); oe.y = r3(p.y); if (target) oe.asked = target.kind === 'npc' ? 'npc:' + who(findNpc(target.id)) : target.kind; }   // целился в кого-то, но вышло «в точку»
        ev('order', oe);
      }
      if (invFull() && dist(S.hero.x, S.hero.y, p.x, p.y) >= D.hero.walk.longWalk) log('fullBagWalk');
    }
    function pickUpItem(it) {
      if (it.type === 'fire') return false;
      if (S.hero.asleep) { log('cantPickAsleep'); return false; }
      if (invFull()) { log('invFull'); return false; }
      removeItem(it);
      var pi = { id: it.id, type: it.type };
      if (it.read) pi.read = true;
      S.inv.push(pi);
      ev('pick', { it: it.type });
      log('pickUp', { name: itemName(it) });
      return true;
    }
    /* Герой встал у места: начать дело или занять место */
    function enterPlace(id, walked, hoped) {
      var P = D.places[id];
      if (id === 'entrance' && entranceBlocked()) {
        if (entranceBlocked() === 'cop') { S.tele.entranceCop++; log('entranceCop'); }
        else {
          S.tele.entranceLocked++;
          if (hoped) { S.tele.doorSlammed++; log('doorSlammed'); }          // дверь была открыта, когда шёл, — а пока дошёл, захлопнулась
          else log('entranceLocked', { n: Math.ceil(S.entranceLock) });
        }
        return;
      }
      if (placeClosed(id)) { rhTele().closed++; S.tele.closedHits++; log(walked ? 'closedWalked' : 'closed', { name: P.name, t: opensAt(id) }); return; }
      S.sellBatch = 0;
      var def = placeTaskDef(id);
      if (def) {
        if (!def.available) { if (id === 'bin') S.tele.emptyTries++; if (def.blockedText) log(def.blockedText, def.vars); return; }
        S.hero.at = id;
        startPlaceTask(id, 0);
        if (def.startText) log(def.startText);
        return;
      }
      S.hero.at = id;
      if (id === 'entrance') {
        if (!doorOpen()) sfx('entranceDoorPass');
        rollPatience();
        if (S.entranceLock > 0) { S.tele.followIn++; rhTele().follow++; log('doorFollow'); }  // домофон ещё заперт, но дверь придержали — зашёл следом
        else log('atEntrance');
      }
      else if (id === 'pipe') log('atPipe');
      else if (id === 'den') log('atDen');
      else if (id === 'bench') log('atBench');
    }
    function arrive(t) {
      if (!t) return;
      if (t.kind === 'npc') {
        var n = findNpc(t.id);
        if (talkable(n)) startTalk(n);
        return;
      }
      if (t.kind === 'item') {
        var it = findItem(t.id);
        if (it) pickUpItem(it);
        return;
      }
      if (t.kind === 'place') enterPlace(t.id, true, t.hoped);
    }
    function moveHero(dt) {
      var h = S.hero, kx = S.moveDir.x, ky = S.moveDir.y, sp = walkSpeed(), p;
      h.walking = false;
      if (h.asleep) return;
      if ((kx || ky) && !S.moveHold) {                    // клавиатура: идём напрямую
        var len = Math.sqrt(kx * kx + ky * ky);
        p = boundedPos(h.x + kx / len * sp * dt / L.logicalAspect, h.y + ky / len * sp * dt);
        p = slideWalk(h, p.x, p.y);
        if (p.x !== h.x || p.y !== h.y) { h.walking = true; S.walkTime += dt; }
        if (kx) h.dir = kx < 0 ? -1 : 1;
        h.x = p.x; h.y = p.y;
        return;
      }
      var m = h.move;
      if (!m) return;
      if (m.target && m.target.kind === 'npc') {          // встречный мог уйти, пока шли
        var n = findNpc(m.target.id);
        if (!talkable(n)) { h.move = null; S.tele.missed++; ev('missed', { id: m.target.id, who: n ? who(n) : m.target.type }); log('npcGone', { name: m.target.name || D.npcs.passerby.name }); return; }
        if (dist(h.x, h.y, n.x, n.y) <= D.walkers.contact && canWalk(h.x,h.y,n.x,n.y)) { h.move = null; arrive(m.target); return; }
        var ip = intercept(n), tp = ip ? clampPos(ip.x, ip.y) : clampPos(n.x, n.y);   // идём наперерез; не догнать — хотя бы следом
        m.x = tp.x; m.y = tp.y;
      }
      if (m.target && m.target.kind === 'item' && !findItem(m.target.id)) { h.move = null; log('itemGone'); return; }
      var travel = moveOnGround(h, m.x, m.y, sp * dt);
      h.walking = travel.moved > 0 && !travel.arrived;
      S.walkTime += travel.moved / sp;
      if (travel.arrived) {
        if (m.target && m.target.kind === 'npc') {       // пришёл в точку встречи раньше — ждёт, пока тот подойдёт
          var tn = findNpc(m.target.id);
          if (tn && dist(h.x, h.y, tn.x, tn.y) <= D.walkers.contact && canWalk(h.x,h.y,tn.x,tn.y)) { h.move = null; arrive(m.target); }
          return;
        }
        h.move = null;
        arrive(m.target);
      }
    }
    /* Клавиши движения: (0,0) — стоим. Нажатие отменяет маршрут и дело. */
    function setMoveDir(dx, dy) {
      if (S.over || S.begging.dialog) return;
      if (R) {
        var mv = !!(dx || dy);
        if (mv && R.w.km === null) { R.w.km = S.total; ev('keys', { dx: dx, dy: dy, by: inCtx.by, paused: inCtx.paused ? 1 : 0, was: curOrder() }); }
        else if (!mv && R.w.km !== null) { ev('keysStop', { sec: r1(S.total - R.w.km) }); R.w.km = null; }
      }
      S.moveDir = { x: dx, y: dy };
      S.moveHold = false;
      if (dx || dy) {
        wake('wake');
        if (S.hero.task || S.hero.at || S.hero.move) { heroLeavePlace(); S.hero.move = null; }
      }
    }
    /* Что рядом, с чем можно сделать действие (клавиша E) */
    function nearby() {
      var h = S.hero, Wk = D.hero.walk, best = null, bd = 1e9, i, dd;
      if (S.over || h.asleep || h.task || h.move) return null;
      for (var id in D.places) {
        if (h.at === id && (!placeTaskDef(id) || S.menuOpen)) continue;
        var sp = standPoint({ kind: 'place', id: id });
        dd = dist(h.x, h.y, sp.x, sp.y);
        if (dd <= Wk.reachPlace && dd < bd && canWalk(h.x,h.y,sp.x,sp.y)) { bd = dd; best = { kind: 'place', id: id, label: D.places[id].action }; }
      }
      for (i = 0; i < S.npcs.length; i++) {
        var n = S.npcs[i];
        if (!talkable(n)) continue;
        dd = dist(h.x, h.y, n.x, n.y);
        if (dd <= Wk.reach && dd < bd && canWalk(h.x,h.y,n.x,n.y)) { bd = dd; best = { kind: 'npc', id: n.id, label: Wk.talkLabel }; }
      }
      for (i = 0; i < S.items.length; i++) {
        var it = S.items[i];
        if (it.type === 'fire') continue;
        dd = dist(h.x, h.y, it.x, it.y);
        if (dd <= Wk.reach && dd < bd && canWalk(h.x,h.y,it.x,it.y)) { bd = dd; best = { kind: 'item', id: it.id, label: Wk.pickLabel }; }
      }
      return best;
    }
    function act() {
      var t = nearby();
      if (!t) return false;
      ev('act', { to: tgt(t), by: inCtx.by, paused: inCtx.paused ? 1 : 0 });
      if (t.kind === 'place' && D.places[t.id].heroStand) {
        order(t);
        S.moveHold = true;
        return true;
      }
      S.moveHold = true;                                  // зажатая клавиша движения не срывает начатое дело
      if (t.kind === 'place') { heroLeavePlace(); enterPlace(t.id, false); }
      else if (t.kind === 'npc') { heroLeavePlace(); startTalk(findNpc(t.id)); }
      else pickUpItem(findItem(t.id));
      return true;
    }

    function requestSound(key, coins) {
      // Прежний выбор случайной строки журнала занимал один шаг игрового генератора.
      rng();
      sfx(key, coins);
    }
    function finishHeroTask(dialog, request) {
      var h = S.hero, t = h.task, n, c, res = {};
      h.task = null;
      if (t.kind === 'search') {
        var P = D.places.bin;
        var type = S.binTop.length ? S.binTop.pop() : rollLoot(binLoot());   // сверху лежит то, что вынесли жильцы; пока лежбище не достроено — таблица щедрее на строительное
        S.binStock--;
        if (S.binTop.length > S.binStock) S.binTop.splice(0, S.binTop.length - S.binStock);
        teleInc(S.tele.finds, type);
        rhTele().finds++;
        log({ bottle: 'findBottle', can: 'findCan', scraps: 'findScraps', cardboard: 'findCardboard', newspaper: 'findNewspaper', rags: 'findRags', boards: 'findBoards', film: 'findFilm' }[type]);
        res.found = type;
        if (!give(type, P.x, P.y)) res.drop = 1;
      } else if (t.kind === 'sell') {
        var si = sellableIndex();
        if (si >= 0) {
          var sold = S.inv.splice(si, 1)[0], price = D.places.recycle.prices[sold.type];
          S.money += price;
          S.sellBatch += price;
          S.tele.soldN++; S.tele.soldMoney += price; res.it = sold.type; res.got = price;
          log(sold.type === 'bottle' ? 'sellBottle' : 'sellCan', { n: price });
        }
      } else if (t.kind === 'light') {
        var mi = invType('matches'), ci = fuelIndex();
        if (mi >= 0 && ci >= 0) {
          var fuel = S.inv[ci];
          S.inv.splice(Math.max(mi, ci), 1);
          S.inv.splice(Math.min(mi, ci), 1);
          var FO = D.hero.walk.fireOffset, fp = clampPos(h.x + FO.x, h.y + FO.y);
          spawnItemAt('fire', fp.x, fp.y).timeLeft = D.fire.burnSeconds * D.items[fuel.type].burn / D.fire.burnRef;   // картон — burnSeconds, газета — пропорционально меньше
          S.tele.fires++; res.ok = 1; res.fuel = fuel.type;
          log('fireLit');
        } else {
          res.ok = 0;
          log('noCardboard');
        }
      } else if (t.kind === 'build') {
        denBuildFinish(res);
      } else if (t.kind === 'shop') {
        S.menuOpen = true;
        log(t.placeId === 'stall' ? 'stallOpen' : 'shopOpen');
      } else if (t.kind === 'talk') {
        n = findNpc(t.npcId);
        if (!n) return;
        c = D.npcs[n.type];
        var chance = giveChance(n, dialog);
        var extraMoney = dialog.favorAgreed ? D.begging.cards.favor.extraMoney : 0;
        n.engaged = false;
        n.asked = true;                                   // у одного человека просят один раз
        S.stats.asks++;
        var rt = rhTele(); rt.asks++;
        var ak = n.type === 'granny' ? 'granny' : n.kind;
        var ta = S.tele.asks[ak] || (S.tele.asks[ak] = { n: 0, ok: 0, sum: 0 });
        ta.n++; res.who = ak; res.id = n.id; res.ok = 0; res.chance = chance; res.mood = dialog.mood;
        if (n.type === 'passerby') {
          var K = kindDef(n), r2 = rng();
          if (r2 < chance) {
            var m = K.money ? (function (row) { return randInt(row.min, row.max); })(weighted(K.money)) : randInt(K.moneyMin, K.moneyMax);   // у подвыпившего — лотерея
            m += extraMoney;
            S.money += m;
            S.stats.gave++; S.stats.begMoney += m;
            ta.ok++; ta.sum += m; res.ok = 1; res.got = m;
            rt.ok++; rt.money += m;
            requestSound('begOk_' + n.kind, m);
          } else if (r2 < giveChance(n, dialog, true)) {
            res.why = 'weather'; requestSound('begNoWeather');                 // дал бы, да погода не та
          } else {
            requestSound('begNo_' + n.kind);
          }
        } else if (chance < 1 && rng() >= chance) {
          requestSound('grannyNo');
        } else {
          S.stats.gave++;
          ta.ok++; rt.ok++; res.ok = 1;
          if (rng() < c.scrapsChance) {
            res.food = 'scraps';
            requestSound('grannyFood');
            if (!give('scraps', n.x, n.y)) res.drop = 1;
          } else {
            var coins = c.money + extraMoney;
            S.money += coins;
            S.stats.begMoney += coins;
            ta.sum += coins; rt.money += coins; res.got = coins;
            requestSound('grannyMoney', coins);
          }
        }
        var ui = D.ui.dialogue;
        res.variant = request.id; res.line = request.line;
        var replyKey = res.food ? 'food' : res.ok ? 'yes' : 'no';
        res.reply = res.why === 'weather' ? D.encounterText.weatherRefusals[ak] : request.replies[ak][replyKey];
        if (res.food) res.outcome = res.drop ? ui.foodDropped : ui.foodReceived;
        else if (res.ok) res.outcome = ui.moneyReceived.replace('{n}', res.got);
        else res.outcome = res.why === 'weather' ? ui.weatherRefusal : ui.refusal;
        appendLogLine(D.hero.name + ' — ' + res.line + '  ' + npcName(n) + ' — ' + res.reply + '  ' + res.outcome);
      } else if (t.kind === 'use') {
        var u = D.items[t.item.type].use;
        if (u.satiety) h.satiety = clamp(h.satiety + u.satiety, 0, D.hero.max);
        if (u.warmth) h.warmth = clamp(h.warmth + u.warmth, 0, D.hero.max);
        if (u.energy) h.energy = clamp(h.energy + u.energy, 0, D.hero.max);
        teleInc(S.tele.used, t.item.type); res.it = t.item.type;
        if (u.health) {
          if (u.health < 0) damage(-u.health, 'other');
          else h.health = clamp(h.health + u.health, 0, D.hero.max);
        }
        if (t.item.type === 'scraps') {
          S.tele.scrapsEaten++;
          if (rng() < u.riskChance * S.gs.sp.scrapsRisk) {
            S.tele.scrapsBad++; res.bad = 1;
            log('eatScrapsBad', { n: u.riskHealth });
            damage(u.riskHealth, 'other');
          } else {
            log('eatScraps');
          }
        } else if (t.item.type === 'shawarma') {
          S.tele.shawarma++;
          log('eatShawarma');
        } else if (t.item.type === 'vodka') {
          S.tele.vodka++;
          log('drinkVodka');
        } else {
          var uk = { tea: 'drinkTea', coffee: 'drinkCoffee', bread: 'eatBread', noodles: 'eatNoodles' }[t.item.type];
          if (uk) log(uk);
        }
      }
      if (R) { R.done = t; res.k = t.kind; res.at = t.placeId; ev('done', res); }
      if (t.placeId && D.places[t.placeId].autoRepeat && !S.over && !h.asleep && !h.task && h.at === t.placeId) {
        startPlaceTask(t.placeId, t.t - t.dur, true);
      }
      return res;
    }

    /* ---------- правка 022: лежбище у теплотрассы ----------
       Лаз между плитами (место den). Ступени — D.den.stages, строятся по порядку из того, что в пакете (дело 'build').
       Состояние — S.den {stage, stash}: stage — сколько ступеней построено, stash — заначка [{id,type,read?}]. */
    function denDone() { return S.den.stage >= D.den.stages.length; }
    /* числа тепла достигнутой ступени: ступень без своих чисел (заначка) берёт их у предыдущей */
    function denHeatDef() {
      for (var i = S.den.stage - 1; i >= 0; i--) if (D.den.stages[i].gain !== undefined) return D.den.stages[i];
      return null;
    }
    function stashCap() {
      var n = 0;
      for (var i = 0; i < S.den.stage; i++) n += D.den.stages[i].stash || 0;
      return n;
    }
    /* key — тип или несколько через «|» (подойдёт любой из них): 'newspaper|rags' */
    function invCount(key) {
      var n = 0, ts = key.split('|');
      for (var i = 0; i < S.inv.length; i++) if (ts.indexOf(S.inv[i].type) >= 0) n++;
      return n;
    }
    function matName(key) { return key.split('|').map(function (t) { return D.items[t].name.toLowerCase(); }).join(D.den.goal.or); }
    /* Следующая ступень: какой вариант материалов ближе к готовности и чего не хватает.
       → null (всё построено) или {idx, def, opt, ok, lack:[{type,have,need}]} */
    function denNext() {
      if (denDone()) return null;
      var def = D.den.stages[S.den.stage], best = null, bestMiss = 1e9;
      for (var k = 0; k < def.need.length; k++) {
        var opt = def.need[k], lack = [], miss = 0;
        for (var type in opt) {
          var have = invCount(type);
          if (have < opt[type]) { lack.push({ type: type, have: have, need: opt[type] }); miss += opt[type] - have; }
        }
        if (miss < bestMiss) { best = { opt: opt, lack: lack }; bestMiss = miss; }
        if (!miss) break;
      }
      return { idx: S.den.stage, def: def, opt: best.opt, ok: bestMiss === 0, lack: best.lack };
    }
    /* «картон 1/2, газета 0/2» — по всем вариантам ступени, через «или». Строка для журнала, подсказки и задач. */
    function denNeedText(nx) {
      if (!nx) return '';
      return nx.def.need.map(function (opt) {
        var parts = [];
        for (var key in opt) parts.push(matName(key) + ' ' + Math.min(invCount(key), opt[key]) + '/' + opt[key]);
        return parts.join(', ');
      }).join(D.den.goal.or);
    }
    /* Ступень достроена: материалы из пакета уходят (газеты — сначала прочитанные), ступень +1 */
    function denBuildFinish(res) {
      var nx = denNext();
      if (!nx) return;
      if (!nx.ok) { res.ok = 0; log('denLack', { need: denNeedText(nx) }); return; }
      for (var key in nx.opt) {
        var ts = key.split('|');
        for (var c = 0; c < nx.opt[key]; c++) {
          var idx = -1;
          for (var i = S.inv.length - 1; i >= 0; i--) {     // по порядку типов в ключе; газеты — сначала прочитанные
            var ti = ts.indexOf(S.inv[i].type);
            if (ti < 0) continue;
            var tb = idx < 0 ? 99 : ts.indexOf(S.inv[idx].type);
            if (idx < 0 || ti < tb || (ti === tb && S.inv[i].read && !S.inv[idx].read)) idx = i;
          }
          if (idx >= 0) S.inv.splice(idx, 1);
        }
      }
      S.den.stage++;
      S.tele.denStages.push(Math.round(S.total));
      res.ok = 1; res.st = S.den.stage; res.id = nx.def.id;
      ev('denBuild', { st: S.den.stage, id: nx.def.id, used: Object.keys(nx.opt).join('+') });
      log('denStage' + S.den.stage);
    }
    /* Тепло лежбища: вместо погоды целиком — погода × lossMult; труба — gain × ветер (или без ветра); во сне — ещё sleepGain.
       → null, если герой не в лежбище или оно не обустроено (голый бетон: как просто на улице) */
    function denHeat(out, idle) {
      var hd = S.hero.at === 'den' ? denHeatDef() : null;
      if (!hd) return null;
      var o = { loss: -out * hd.lossMult, gain: 0, sleep: 0 };
      if (idle) {
        o.gain = hd.gain * (hd.windproof ? 1 : D.weather.winds[S.weather.wind].pipeFactor);
        if (S.hero.asleep) o.sleep = hd.sleepGain || 0;
      }
      return o;
    }
    /* Сколько тепла в секунду было бы в лежбище сейчас (для подсказки и ботов): стоя или во сне. null — не обустроено */
    function denPreview(asleep) {
      var hd = denHeatDef();
      if (!hd) return null;
      return -outdoorLoss() * hd.lossMult + hd.gain * (hd.windproof ? 1 : D.weather.winds[S.weather.wind].pipeFactor) + (asleep ? hd.sleepGain || 0 : 0);
    }
    /* Заначка: класть и брать можно, стоя в лежбище (не во сне) */
    function stashReady() { return stashCap() > 0 && S.hero.at === 'den' && !S.hero.asleep && !S.over; }
    function stashPut(id) {
      if (S.over || S.begging.dialog || stashCap() <= 0) return false;
      if (S.hero.asleep) { log('cantUseAsleep'); return false; }
      if (S.hero.at !== 'den') { log('stashFar'); return false; }
      var idx = invIndex(id);
      if (idx < 0) return false;
      if (S.den.stash.length >= stashCap()) { log('stashFull'); return false; }
      var it = S.inv.splice(idx, 1)[0];
      S.den.stash.push(it);
      S.tele.stashPut++;
      ev('stashPut', { it: it.type, n: S.den.stash.length });
      log('stashPut', { name: itemName(it) });
      return true;
    }
    function stashTake(id) {
      if (S.over || S.begging.dialog) return false;
      if (S.hero.asleep) { log('cantUseAsleep'); return false; }
      if (S.hero.at !== 'den') { log('stashFar'); return false; }
      var idx = -1;
      for (var i = 0; i < S.den.stash.length; i++) if (S.den.stash[i].id === id) idx = i;
      if (idx < 0) return false;
      if (invFull()) { log('invFull'); return false; }
      var it = S.den.stash.splice(idx, 1)[0];
      S.inv.push(it);
      S.tele.stashTake++;
      ev('stashTake', { it: it.type, n: S.den.stash.length });
      log('stashTake', { name: itemName(it) });
      return true;
    }
    /* Таблица находок бака: пока лежбище не достроено — щедрее на строительное */
    function binLoot() { return denDone() || !D.places.bin.lootDen ? D.places.bin.loot : D.places.bin.lootDen; }
    /* Задача «Обустроить лежбище» для панели задач */
    function denGoal() {
      var G = D.den.goal, nx = denNext(), n = D.den.stages.length;
      return {
        id: 'den', title: G.title, done: S.den.stage, total: n, complete: !nx, text: G.text,
        progress: nx ? G.next.split('{name}').join(nx.def.name.toLowerCase()).split('{need}').join(denNeedText(nx)) : G.done,
        ready: !!(nx && nx.ok)
      };
    }
    /* ---------- пакет ---------- */
    function fireInReach() {
      var h = S.hero;
      for (var i = 0; i < S.items.length; i++) {
        var it = S.items[i];
        if (it.type !== 'fire') continue;
        var fx = (h.x - it.x) / D.fire.radiusX, fy = (h.y - it.y) / D.fire.radiusY;
        if (fx * fx + fy * fy <= 1) return it;
      }
      return null;
    }
    function invType(type) {
      for (var i = 0; i < S.inv.length; i++) if (S.inv[i].type === type) return i;
      return -1;
    }
    /* Лучшее топливо в пакете: горит дольше всех; при равенстве — прочитанная газета раньше непрочитанной. −1 — жечь нечего. */
    function fuelIndex() {
      var best = -1, bs = -1, i, b;
      for (i = 0; i < S.inv.length; i++) {
        b = D.items[S.inv[i].type].burn;
        if (!b) continue;
        if (S.inv[i].type === 'newspaper' && S.inv[i].read) b += 0.5;
        if (b > bs) { bs = b; best = i; }
      }
      return best;
    }
    /* Надеть вещь из пакета: прежняя из того же слота ложится на её место в пакете */
    function wearInv(idx) {
      var it = S.inv[idx], slot = D.items[it.type].wear.slot, old = S.worn[slot];
      if (S.hero.asleep) { log('cantUseAsleep'); return false; }
      S.worn[slot] = { id: it.id, type: it.type };
      if (old) S.inv[idx] = old; else S.inv.splice(idx, 1);
      refreshGear();
      S.tele.wears++;
      ev('wear', { it: it.type, old: old ? old.type : undefined });
      log(old ? 'wearSwap' : 'wearOn', { name: D.items[it.type].name, old: old ? D.items[old.type].name : '' });
      fitInv();
      return true;
    }
    /* Снять надетое (клик по слоту): уходит в пакет, а если места нет — к ногам */
    function unwear(slot) {
      if (S.over || S.begging.dialog) return false;
      var w = S.worn[slot];
      if (!w) return false;
      if (S.hero.asleep) { log('cantUseAsleep'); return false; }
      S.worn[slot] = null;
      refreshGear();
      S.tele.unwears++;
      ev('unwear', { it: w.type, slot: slot });
      log('wearOff', { name: D.items[w.type].name });
      if (!invFull()) S.inv.push(w);
      else { layDown(w); log('invFullDrop', { name: D.items[w.type].name }); }
      fitInv();
      return true;
    }
    /* Клик по предмету в пакете: еда/питьё — употребить; одежда — надеть; спички — костёр у ног (нужно топливо: картон или газета);
       газета — сначала прочитать (прогноз), прочитанная и картон — подкинуть в костёр, если герой рядом с ним. */
    function useInv(id) {
      if (S.over || S.begging.dialog) return false;
      var idx = invIndex(id);
      if (idx < 0) return false;
      var it = S.inv[idx], def = D.items[it.type];
      if (def.wear) return wearInv(idx);
      if (it.type === 'matches') {
        if (S.hero.asleep) { log('cantUseAsleep'); return false; }
        if (fuelIndex() < 0) { log('noCardboard'); return false; }
        cancelHeroTask();
        S.hero.move = null;
        S.hero.task = { kind: 'light', t: 0, dur: D.fire.craftSeconds };
        log('fireCraft');
        return true;
      }
      if (it.type === 'newspaper' && !it.read) {            // непрочитанную не сжечь случайно: сначала читается
        if (S.hero.asleep) { log('cantUseAsleep'); return false; }
        it.read = true;
        S.tele.papersRead++;
        var fc = makeForecast();
        ev('forecast', { f: fc.map(function (q) { return { ph: q.phase, temp: q.temp, wind: q.wind, precip: q.precip }; }) });
        if (fc.length) log('paperRead', { f: forecastLines(fc).join('; ') }); else log('paperNoNews');
        return true;
      }
      if (def.burn) {
        if (S.hero.asleep) { log('cantUseAsleep'); return false; }
        var f = fireInReach();
        if (!f) {
          if (stashReady()) return stashPut(id);             // правка 022: в лежбище без костра — в заначку
          log(it.type === 'newspaper' ? 'paperAlready' : 'noFireNear', { name: def.name }); return false;
        }
        S.inv.splice(idx, 1);
        f.feedQueue++;
        (f.feedList || (f.feedList = [])).push({ type: it.type, burn: def.burn });
        if (it.type === 'newspaper') S.tele.paperFed++; else S.tele.cardboardFed++;
        ev('feed', { it: it.type });
        return true;
      }
      if (!def.use) {                                     // правка 022: в лежбище с заначкой — убрать в заначку; стройматериал — подсказать, куда нести
        if (stashReady()) return stashPut(id);
        if (D.den.stages.some(function (st) { return st.need.some(function (o) { for (var k in o) if (k.split('|').indexOf(it.type) >= 0) return true; return false; }); })) log('denMatHint', { name: def.name });
        return false;
      }
      if (S.hero.asleep) { log('cantUseAsleep'); return false; }
      S.inv.splice(idx, 1);
      cancelHeroTask();
      S.hero.move = null;
      S.hero.task = { kind: 'use', item: it, t: 0, dur: def.use.seconds };
      return true;
    }
    /* Вытащить предмет из пакета: ложится у ног героя. */
    function dropFromInv(id) {
      if (S.over || S.begging.dialog) return false;
      var idx = invIndex(id);
      if (idx < 0) return false;
      var it = S.inv.splice(idx, 1)[0];
      layDown(it);
      ev('drop', { it: it.type });
      log('putDown', { name: itemName(it) });
      return true;
    }

    /* Покупка там, где открыто меню: ларёк (еда, спички, пакет с ручками) или палатка (одежда — сразу надевается) */
    function buy(type) {
      var pid = S.hero.at, K = D.places[pid], g = null, def = D.items[type];
      if (S.over || S.begging.dialog || !S.menuOpen || S.hero.asleep || !K || !K.goods || placeClosed(pid)) return false;
      for (var i = 0; i < K.goods.length; i++) if (K.goods[i].type === type) g = K.goods[i];
      if (!g) return false;
      if (def.once && S.bagHandles) return false;          // пакет с ручками берут один раз
      if (def.wear && S.worn[def.wear.slot] && S.worn[def.wear.slot].type === type) return false;   // такая уже на тебе
      if (S.money < g.price) { log(pid === 'stall' ? 'noMoneyStall' : 'noMoney'); return false; }
      S.money -= g.price;
      teleInc(S.tele.buys, type);
      ev('buy', { it: type, price: g.price, at: pid, cat: def.wear ? 'gear' : def.once ? 'other' : def.use ? 'food' : 'other' });
      if (def.wear) {
        var old = S.worn[def.wear.slot];
        S.worn[def.wear.slot] = { id: nextId++, type: type };
        refreshGear();
        S.tele.spentGear += g.price;
        log('buyGear', { name: def.name });
        if (old) {                                         // прежняя вещь — в пакет, нет места — к ногам
          if (!invFull()) S.inv.push(old);
          else { layDown(old); log('invFullDrop', { name: D.items[old.type].name }); }
        }
        fitInv();
      } else if (def.once) {
        S.bagHandles = true;
        refreshGear();
        S.tele.spentOther += g.price;
        log('buyHandles');
      } else {
        if (def.use) S.tele.spentFood += g.price; else S.tele.spentOther += g.price;
        log('buy', { name: def.name });
        give(type, K.x, K.y);
      }
      return true;
    }

    /* ---------- полоски прогресса ---------- */
    function bars() {
      var out = [], t = S.hero.task, i;
      if (t) {
        var anchor;
        if (t.placeId) anchor = { kind: 'place', id: t.placeId };
        else if (t.kind === 'talk') anchor = { kind: 'npc', id: t.npcId };
        else anchor = { kind: 'hero', id: 0 };
        out.push({ key: 'hero', anchor: anchor, p: t.t / t.dur });
      }
      for (i = 0; i < S.items.length; i++) {
        var it = S.items[i];
        if (it.type === 'fire' && it.feedQueue > 0) {
          out.push({ key: 'feed' + it.id, anchor: { kind: 'item', id: it.id }, p: it.feedT / D.fire.feedSeconds, count: it.feedQueue });
        }
      }
      return out;
    }

    /* ---------- смена фаз ---------- */
    function startPhase() {
      var nw = S.weatherAhead.shift();                     // погода этой фазы была заготовлена заранее; впереди всегда две фазы
      S.weatherAhead.push(genWeatherFor(S.phase + 2));
      if (!S.weatherLocked || !S.weather) S.weather = nw;
      while (S.forecast.length && S.forecast[0].phase <= S.phase) S.forecast.shift();   // прогноз наступил — больше не прогноз
      /* Правка 016: смена света — это только свет, погода и холод. Люди, заведения, мент, бак и бабка живут по часам (startRhythm). */
      if (isNight()) {
        log('nightStart', { n: dayNo() });
      } else {
        if (S.phase > 0) log('dayStart', { n: dayNo() });
        if (S.phase > 0 && dayDiv(dayNo()) !== dayDiv(dayNo() - 1)) log('daylight', { d: dayDiv(dayNo()), n: D.time.divisions - dayDiv(dayNo()) });
      }
      if (S.phase > 0) {
        var mt = function (v) { return (v < 0 ? '−' : (v > 0 ? '+' : '')) + Math.abs(v); };
        log('weather_' + S.weather.type, { t: mt(S.weather.temp), f: mt(S.weather.feels) });
      }
    }

    /* Смена фазы расписания: кто начнёт появляться, когда автобус, мент, вынос мусора, бабка. Уже идущие доходят свой маршрут.
       S.calm — рубильник для проверок: не планировать новых людей (бабка, мусор) и не сокращать «выключенные» таймеры. */
    function startRhythm(first) {
      var def = rhythmAt(clockHour()), prev = S.rh ? rhythm() : null, i;
      S.rh = def.id; S.rhT = first ? (clockHour() - def.from + 24) % 24 * HOUR : 0;
      rhTele().n++;
      if (!first) log('phase_' + def.id);
      if (def.binAdd && !first) {
        var add = Math.max(0, Math.min(def.binAdd, D.places.bin.max - S.binStock));
        S.binStock += add; S.tele.binAdded += add; S.tele.binMorning += add;
      }
      var dur = rhythmDur(def), left = dur - S.rhT;
      S.trashTimes = [];
      if (def.trash && !S.calm) {
        var tn = randInt(def.trash[0], def.trash[1]);
        for (i = 0; i < tn; i++) S.trashTimes.push(S.rhT + rand(0.05, 0.85) * left);
        S.trashTimes.sort(function (a, b) { return a - b; });
      }
      var G = D.npcs.granny;
      if (G.appearPhase === def.id && !S.calm) S.grannyAt = S.rhT + rand(G.appearFrom, G.appearTo) * left;
      else if (!first && !S.calm) S.grannyAt = null;
      if (def.cop) { if (!(prev && prev.cop) && !(S.copTimer > 1e8)) S.copTimer = rand(def.cop.min, def.cop.max); }
      if (S.walkerTimer < 1e8) S.walkerTimer = first ? rand(0.2, 1) * spawnInterval() : Math.min(S.walkerTimer, rand(0.2, 1) * spawnInterval());
      if (!S.bus && S.busTimer < 1e8) S.busTimer = first ? rand(0.3, 1) * busInterval() : Math.min(S.busTimer, rand(0.3, 1) * busInterval());
    }

    /* ---------- встречные ---------- */
    /* ---------- живые прохожие: ходят по маршрутам из data.js (walkers.routes), уходят за край, в подъезд, в автобус ---------- */
    function sfx(key, amount) {
      var event = { key: key };
      if (amount !== undefined) event.n = amount;
      S.sfx.push(event); if (S.sfx.length > 40) S.sfx.shift();
    }
    function walkerMods() {
      var WK = D.walkers, a = WK.wind[Math.min(S.weather.wind, WK.wind.length - 1)], b = WK.weather[S.weather.type];
      if (!b) return a;
      return { speed: Math.max(a.speed, b.speed), give: Math.min(a.give, b.give), spawn: Math.min(a.spawn, b.spawn) };
    }
    function kindDef(n) { return n.type === 'passerby' ? D.npcs.passerby.kinds[n.kind] : D.npcs[n.type]; }
    function npcName(n) { return kindDef(n).name; }
    function walkerSpeed(n) {
      var WK = D.walkers, factor = Math.min(n.speedF, WK.maxWalkFactor);
      if (n.type === 'passerby' && kindDef(n).weatherHurry) {
        factor = Math.min(factor * walkerMods().speed, WK.maxWeatherFactor);
      }
      return baseWalkSpeed() * factor;
    }
    function giveChance(n, dialog, dry) {
      var def = kindDef(n), practice = D.begging.practice.begging[skillProgress('begging').level - 1];
      var chance = def.giveChance + (def.giveMax - def.giveChance) * practice;
      if (n.type === 'passerby') chance *= (n.giveF || 1) * (dry ? 1 : walkerMods().give);
      dialog = dialog || (S.begging.dialog && S.begging.dialog.npcId === n.id ? S.begging.dialog : null);
      // bonus хранится для старых слотов, в которых первый ход уже дал прибавку в процентных пунктах.
      chance = clamp(chance, 0, 1);
      if (dialog) chance = adjustOdds(chance, D.begging.moods[dialog.mood].ask * dialog.rapport);
      return clamp(chance + S.gs.give + (dialog ? dialog.bonus : 0), 0, 1);
    }
    function spawnInterval() {
      var I = rhythm().spawn;
      return rand(I.min, I.max) / walkerMods().spawn;
    }
    /* Веса из расписания {id: вес} -> список для weighted(); маршрут к закрытому заведению (needs) не берём */
    function poolFrom(list, weights) {
      var out = [];
      for (var i = 0; i < list.length; i++) {
        var w = weights[list[i].id];
        if (!w || (list[i].needs && placeClosed(list[i].needs))) continue;
        out.push({ id: list[i].id, weight: w, route: list[i] });
      }
      return out;
    }
    function kindFrom(weights) {
      var out = [];
      for (var k in weights) if (weights[k] > 0 && D.npcs.passerby.kinds[k]) out.push({ id: k, weight: weights[k] });
      return out.length ? weighted(out).id : 'student';
    }
    function weighted(list) {
      var sum = 0, i, r;
      for (i = 0; i < list.length; i++) sum += list[i].weight;
      r = rng() * sum;
      for (i = 0; i < list.length; i++) { r -= list[i].weight; if (r < 0) return list[i]; }
      return list[list.length - 1];
    }
    function binDropPoint() {
      var bin = D.places.bin, offset = D.walkers.trash.dropOffset;
      return { x: bin.x + offset.x, y: bin.y + offset.y };
    }
    function buildPath(src, sitTime) {
      var WK = D.walkers, jit = rand(-WK.laneJitter, WK.laneJitter), out = [], i, q;
      for (i = 0; i < src.length; i++) {
        q = src[i].dump ? binDropPoint() : { x: src[i].x, y: src[i].y };
        if (src[i].counter) {
          out.push({ x: WK.kioskCounter.x, y: WK.kioskCounter.approachY });
          q = { x: WK.kioskCounter.x, y: WK.kioskCounter.y, counter: true };
        }
        if (q.y >= WK.street.sidewalkTop) q.y += jit;                 // по тротуару идут не в затылок
        if (src[i].wait) q.wait = rand(src[i].wait[0], src[i].wait[1]);
        if (src[i].sit) { q.wait = sitTime; q.sit = true; }
        if (src[i].face) q.face = src[i].face;
        if (src[i].dump) q.dump = true;
        if (src[i].door) {                                  // у двери подъезда: заходящий ищет ключи, выходящий задерживается в проёме
          var dw = src[i].door === 'in' ? WK.door.inWait : WK.door.outWait;
          q.door = src[i].door; q.wait = rand(dw[0], dw[1]);
        }
        if (src[i].bus) {                                   // на остановке встают рядом, а не друг в друга
          var k = 0, sl = WK.bus.stop.slots;
          for (var j = 0; j < S.npcs.length; j++) { var pp = S.npcs[j].path; if (pp && pp[pp.length - 1].bus) k++; }
          q.bus = true; q.x += sl[k % sl.length];
        }
        out.push(q);
      }
      return out;
    }
    // Вставляем углы между смысловыми точками: ожидание, дверь и посадка остаются на исходной цели.
    function safeWalkerPath(src, start) {
      var path = [], prev = start;
      src.forEach(function (point) {
        var p = projectGround(point.x,point.y);
        if (prev && !canWalk(prev.x,prev.y,p.x,p.y)) {
          var corners = groundRoute(prev.x,prev.y,p.x,p.y,true);
          for (var i = 0; i < corners.length - 1; i++) path.push({x:corners[i].x, y:corners[i].y});
        }
        var dest = Object.assign({}, point, p);
        path.push(dest); prev = dest;
      });
      return path;
    }
    function makeWalker(type, kind, routeId, path, speedF) {
      path = safeWalkerPath(path);
      var n = {
        id: nextId++, type: type, kind: kind, route: routeId, x: path[0].x, y: path[0].y,
        dir: path[1].x >= path[0].x ? 1 : -1, path: path, leg: 1, wait: 0, state: 'walk', pose: null,
        speedF: speedF, engaged: false, asked: false, walking: true, held: false, navVersion: 1
      };
      if (path[0].wait) {                                   // начинает с остановки (выходит из подъезда и стоит в дверях)
        n.leg = 0; n.wait = path[0].wait; n.pose = 'stand'; n.walking = false;
        if (path[0].door === 'out') { S.tele.doorOut++; setDoorOpen(Math.max(S.doorOpen, n.wait + rand(D.walkers.door.openMin, D.walkers.door.openMax))); }
      }
      S.npcs.push(n);
      return n;
    }
    /* Человек «надевает» настроение фазы, в которой вышел: спешка (в скорость) и щедрость (giveF). Смена фазы его не переделывает. */
    function dressWalker(n, def) {
      n.hurry = def.hurry || 1; n.giveF = def.give || 1; n.phase = def.id;
      teleInc(S.tele.routes, n.route); teleInc(S.tele.kinds, n.kind); rhTele(def.id).spawned++;
      return n;
    }
    /* Новый прохожий. Без аргументов — маршрут и тип по расписанию текущей фазы (schedule): веса routes и kinds.
       routeId — конкретный маршрут (для проверок и выноса мусора), kind — конкретный тип. */
    function spawnWalker(kind, routeId) {
      var WK = D.walkers, K = D.npcs.passerby.kinds, def = rhythm(), route = null, i;
      for (i = 0; i < WK.routes.length; i++) if (routeId && WK.routes[i].id === routeId) route = WK.routes[i];
      if (!route) {
        var pool = poolFrom(WK.routes, def.routes);
        if (!pool.length) return null;
        route = weighted(pool).route;
      }
      if (!kind || !K[kind]) kind = kindFrom(route.trash ? WK.trash.kinds : def.kinds);
      var n = makeWalker('passerby', kind, route.id, buildPath(route.path, 0), rand(K[kind].speedMin, K[kind].speedMax) * (def.hurry || 1));
      if (route.trash) n.trash = true;                    // несёт пакет с мусором (рисуется пакет в руке)
      return dressWalker(n, def);
    }
    /* Пассажир, вышедший из автобуса: куда идёт и кто он — по расписанию фазы (bus.exits, kinds) */
    function spawnPassenger() {
      var WK = D.walkers, K = D.npcs.passerby.kinds, def = rhythm();
      var pool = poolFrom(WK.busExits, def.bus.exits);
      if (!pool.length) pool = poolFrom(WK.busExits, { exitL: 1, exitR: 1 });
      var route = weighted(pool).route;
      var kind = kindFrom(def.kinds), path = buildPath(route.path, 0);
      path[0].x = S.bus.x + rand(-0.03, 0.03);
      S.tele.busAlight++; rhTele().busIn++;
      return dressWalker(makeWalker('passerby', kind, route.id, path, rand(K[kind].speedMin, K[kind].speedMax) * (def.hurry || 1)), def);
    }
    /* Жилец дошёл до бака и выбросил мусор: в баке прибавилось 1–2 находки из бытовой таблицы */
    function dumpTrash(n) {
      var T = D.walkers.trash, k = randInt(T.add[0], T.add[1]), put = 0;
      for (var i = 0; i < k; i++) {
        if (S.binStock >= D.places.bin.max) break;
        S.binStock++; S.binTop.push(rollLoot(denDone() || !T.lootDen ? T.loot : T.lootDen)); put++;   // правка 022: пока лежбище не достроено — больше строительного
      }
      n.trash = false;
      S.tele.trashDumps++; S.tele.trashItems += put; S.tele.binAdded += put; rhTele().trash++;
      if (rng() < T.logChance) log('trashDump');
    }
    function spawnGranny() {
      var G = D.npcs.granny;
      return makeWalker('granny', null, 'granny', buildPath(G.path, rand(G.sitMin, G.sitMax)), G.speedFactor);
    }
    /* Шаг одного прохожего. ghost — «призрак» для прогноза перехвата: без логов и посадки. false — ушёл со двора. */
    function stepWalker(n, dt, ghost) {
      var B = D.walkers.bus, pt;
      n.walking = false;
      if (n.engaged) return true;                         // разговаривает с героем — стоит
      if (n.state === 'busWait') {
        if (!ghost && S.bus && S.bus.state === 'stop') { n.state = 'board'; n.bx = S.bus.x + (n.x - B.stop.x) * 0.5; n.by = B.boardY; }
        return true;
      }
      if (n.wait > 0) {
        n.wait -= dt;
        if (n.wait > 0) return true;
        n.wait = 0; n.pose = null;
        if (!ghost && n.path[n.leg].door === 'in') { openDoor(); S.tele.doorIn++; }   // нашёл ключи и зашёл: дверь ещё какое-то время не захлопнута
        if (!ghost && n.path[n.leg].dump && n.trash) dumpTrash(n);
        n.leg++;
        return n.leg < n.path.length;
      }
      var board = n.state === 'board';
      if (board && ghost) return false;
      var tx = board ? n.bx : n.path[n.leg].x, ty = board ? n.by : n.path[n.leg].y;
      var dx = tx - n.x, dy = ty - n.y, d = dist(tx, ty, n.x, n.y), step = walkerSpeed(n) * (board ? B.boardHurry : 1) * dt;
      if (Math.abs(dx) > 0.002) n.dir = dx < 0 ? -1 : 1;
      n.walking = true;
      if (d > step) { n.x += dx * (step / d); n.y += dy * (step / d); return true; }
      n.x = tx; n.y = ty;
      if (board) { if (!ghost) rhTele().busOut++; return false; }   // сел в автобус
      pt = n.path[n.leg];
      if (pt.bus) { n.state = 'busWait'; n.dir = 1; return true; }
      if (pt.wait) {
        n.wait = pt.wait; n.walking = false;
        n.pose = pt.counter ? 'atCounter' : pt.sit ? 'sit' : 'stand';
        if (pt.face) n.dir = pt.face;
        if (pt.sit && !ghost) log(S.hero.at === 'bench' ? 'grannySitNear' : 'grannySit');
        return true;
      }
      n.leg++;
      return n.leg < n.path.length;                       // последняя точка — край двора или дверь подъезда
    }
    /* Перехват идущего: где и через сколько секунд герой его встретит. null — не догнать. */
    function intercept(n) {
      var WK = D.walkers, h = S.hero, sp = walkSpeed(), t = 0;
      var g = { x: n.x, y: n.y, path: n.path, leg: n.leg, wait: n.wait, state: n.state, pose: n.pose, speedF: n.speedF, type: n.type, kind: n.kind, dir: n.dir, engaged: false };
      for (;;) {
        var p = boundedPos(g.x,g.y);                     // путь прохожего свободен, но он может уйти за границу героя
        if (p.x !== g.x || p.y !== g.y) p = projectGround(p.x,p.y);
        var reach = WK.contact - dist(p.x,p.y,g.x,g.y), limit = sp*t + 1e-9;
        if (reach >= 0 && dist(h.x,h.y,p.x,p.y) - reach <= limit) {
          var need = walkDistance(h.x,h.y,p.x,p.y) - reach;
          if (need <= limit && canWalk(p.x,p.y,g.x,g.y)) {
            return { t: (g.x === n.x && g.y === n.y) ? Math.max(0, need) / sp : t, x: g.x, y: g.y };
          }
        }
        if (t >= WK.lookAhead) return null;
        if (!stepWalker(g, WK.lookStep, true)) return null;
        t += WK.lookStep;
      }
    }
    /* Успеет ли герой перехватить прохожего, если отдать приказ сейчас. Та же математика, что у приказа и у ботов (intercept / walkSeconds):
       текущая скорость героя с усталостью и пакетом, маршрут и скорость прохожего с погодой. Ничего не меняет и не трогает генератор случайных чисел.
       status: 'ok' — успеет через t с в точке (x, y); 'no' — не догнать; 'asked' — уже говорили; 'none' — недоступен для разговора. */
    function catchInfo(n) {
      if (!n || (n.type !== 'passerby' && n.type !== 'granny')) return { status: 'none' };
      if (n.asked || n.spoken) return { status: 'asked' };
      if (!talkable(n)) return { status: 'none' };
      var ip = intercept(n);
      return ip ? { status: 'ok', t: ip.t, x: ip.x, y: ip.y } : { status: 'no' };
    }

    /* ---------- предупреждения над героем (только показ: на симуляцию и генератор не влияют) ---------- */
    function warnLow() { var W = D.ui.warn; return W.low == null ? D.hero.lowThreshold : W.low; }
    /* Какие шкалы ниже порога: [{key, stat, level 1|2, value}] в порядке D.ui.warn.order */
    function warnings() {
      var W = D.ui.warn, lo = warnLow(), out = [], i, k, it, v;
      if (!W.on) return out;
      for (i = 0; i < W.order.length; i++) {
        k = W.order[i]; it = W.items[k];
        if (!it || !it.icon) continue;
        if (it.hideWhileAsleep && S.hero.asleep) continue;
        v = S.hero[it.stat];
        if (v < lo) out.push({ key: k, stat: it.stat, level: v < W.critical ? 2 : 1, value: v });
      }
      return out;
    }
    /* Иней: 0 — тепла достаточно, 1 — тепла нет совсем */
    function frostLevel() {
      var F = D.ui.warn.frost, st = F.start == null ? warnLow() : F.start, v = S.hero.warmth;
      if (!D.ui.warn.on || !F.on || v >= st) return 0;
      return clamp((st - v) / st, 0, 1);
    }
    /* Дрожь: 0 — нет, 1 — холодно, 2 — совсем плохо */
    function shiverLevel() {
      var W = D.ui.warn, v = S.hero.warmth;
      if (!W.on || !W.shiver.on || v >= warnLow()) return 0;
      return v < W.critical ? 2 : 1;
    }
    /* Строка в лог при пересечении порога вниз. Зовёт только интерфейс; свой выбор шутки (не rng ядра), поэтому исходы забегов не меняются. */
    function noteWarnings() {
      var W = D.ui.warn, lo = warnLow(), k, it, v, arr;
      if (!W.on || !W.log.on || !S || S.over) return;
      if (!S.warnSeen) S.warnSeen = {};
      for (k in W.items) {
        it = W.items[k];
        if (!it.log) continue;
        v = S.hero[it.stat];
        if (v < lo) {
          if (S.warnSeen[k]) continue;
          S.warnSeen[k] = true;
          arr = D.texts[it.log];
          if (!arr) continue;
          S.log.push(arr[Math.floor(Math.random() * arr.length)]);
          S.sfx.push({ key: it.log });
          if (S.sfx.length > 40) S.sfx.shift();
          while (S.log.length > D.ui.logLines) S.log.shift();
          S.logSeq++;
        } else if (v >= lo + W.log.rearm) S.warnSeen[k] = false;
      }
    }

    /* Когда откроется дверь подъезда: {t — через сколько секунд, left — сколько она потом простоит открытой} или null.
       Открыта сейчас — t = 0. Иначе ищем идущего к двери («in») и прогоняем его призрака до захода. Для ботов и подсказок. */
    function doorWindow() {
      var WK = D.walkers, mid = (WK.door.openMin + WK.door.openMax) / 2, best = null, i, n, g, t;
      if (S.doorOpen > 0) return { t: 0, left: S.doorOpen };
      for (i = 0; i < S.npcs.length; i++) {
        n = S.npcs[i];
        if ((n.type !== 'passerby' && n.type !== 'granny') || !n.path || n.path[n.path.length - 1].door !== 'in' || n.state !== 'walk') continue;
        g = { x: n.x, y: n.y, path: n.path, leg: n.leg, wait: n.wait, state: n.state, pose: n.pose, speedF: n.speedF, type: n.type, kind: n.kind, dir: n.dir, engaged: false };
        for (t = 0; t < WK.lookAhead; t += WK.lookStep) {
          if (!stepWalker(g, WK.lookStep, true)) { if (!best || t < best.t) best = { t: t + WK.lookStep, left: mid }; break; }
        }
      }
      return best;
    }
    /* Автобус: приезжает по дороге, стоит у остановки, забирает ожидающих, уезжает */
    function updateBus(dt) {
      var B = D.walkers.bus, b = S.bus, i, n;
      if (!b) {
        S.busTimer -= dt;
        if (S.busTimer <= 0) { S.bus = { x: B.startX, state: 'in', t: 0 }; sfx('busCome'); }
        return;
      }
      if (b.state === 'in') {
        b.x -= B.speed * dt;
        if (b.x <= B.stop.x) {
          b.x = B.stop.x;
          var waiting = 0, outN = rollIndex(rhythm().bus.out), keep = walkerMods().spawn, kept = 0, q;
          for (q = 0; q < outN; q++) if (keep >= 1 || rng() < keep) kept++;         // в непогоду выходит меньше людей: тот же множитель, что у появления с краёв
          outN = kept;
          for (i = 0; i < S.npcs.length; i++) if (S.npcs[i].state === 'busWait') waiting++;
          if (waiting === 0 && outN === 0) { b.state = 'out'; b.pass = true; S.tele.busPass++; }   // ни ждущих, ни выходящих: проехал мимо
          else {
            b.state = 'stop'; b.t = 0; b.outLeft = outN; b.outT = 0; S.tele.busStops++;
            sfx('busDoorsOpen');
          }
        }
      } else if (b.state === 'stop') {
        b.t += dt;
        if (b.outLeft > 0) {                                  // пассажиры выходят по одному
          b.outT -= dt;
          if (b.outT <= 0) { spawnPassenger(); b.outLeft--; b.outT = B.passengers.gap; }
        }
        var boarding = false;
        for (i = 0; i < S.npcs.length; i++) if (S.npcs[i].state === 'board') boarding = true;
        if (b.t >= B.stopSeconds && !boarding && b.outLeft <= 0) {
          b.state = 'out';
          if (!b.pass) sfx('busGo');
          for (i = 0; i < S.npcs.length; i++) {
            n = S.npcs[i];
            if (n.state === 'busWait' && n.engaged) log('busMissed', { name: npcName(n) });
          }
        }
      } else {
        b.x -= B.speed * dt;
        if (b.x <= B.endX) { S.bus = null; S.busTimer = busInterval(); }
      }
    }
    function busInterval() {
      var I = rhythm().bus.interval;
      return rand(I.min, I.max);
    }
    /* Декоративные рейсы идут по игровым часам и не используют генератор механик. */
    function updateTraffic(dt) {
      var cfg = D.walkers.traffic, vehicle = S.traffic;
      if (!vehicle) {
        var cycleStart = Math.floor(S.total / cfg.cycle) * cfg.cycle;
        for (var i = 0; i < cfg.trips.length; i++) {
          var trip = cfg.trips[i], start = cycleStart + trip.at;
          if (start > S.total || start <= S.total - dt) continue;
          // Оставляем полосу свободной на весь путь машины, если ожидается рейсовый автобус.
          if (trip.dir < 0 && (S.bus || S.busTimer <= (1 + 2 * cfg.edge) / cfg.carSpeed)) return;
          vehicle = S.traffic = { kind: trip.kind, dir: trip.dir, startedAt: start,
            x: 0, y: trip.dir < 0 ? D.walkers.bus.y : cfg.farY };
          break;
        }
        if (!vehicle) return;
      }
      var speed = vehicle.kind === 'bus' ? cfg.busSpeed : cfg.carSpeed;
      var distance = (S.total - vehicle.startedAt) * speed;
      if (distance >= 1 + 2 * cfg.edge) S.traffic = null;
      else vehicle.x = vehicle.dir < 0 ? 1 + cfg.edge - distance : distance - cfg.edge;
    }
    /* Подъезд: терпение жильцов случайно при каждом входе; накопленное раздражение сохраняется долей */
    function rollPatience() {
      var E = D.places.entrance, nw = rand(E.patienceMin, E.patienceMax) * S.gs.sp.patience;   // в приличном пальто терпят дольше
      S.entranceStay = S.entranceStay / S.entrancePatience * nw;
      S.entrancePatience = nw;
    }
    function entranceMood() {
      var E = D.places.entrance, left = 1 - S.entranceStay / S.entrancePatience;
      return left > E.moodCalmAbove ? 'calm' : (left < E.moodEdgeBelow ? 'edge' : 'wary');
    }
    function updateNpcs(dt) {
      var i, n, C;
      S.walkerTimer -= dt;
      if (S.walkerTimer <= 0) {
        S.walkerTimer = spawnInterval();
        var alive = 0;
        for (i = 0; i < S.npcs.length; i++) if (S.npcs[i].type === 'passerby') alive++;
        if (alive < D.walkers.maxAlive) spawnWalker();
      }
      if (doorOpen()) setDoorOpen(Math.max(0, S.doorOpen - dt));
      updateBus(dt);
      updateTraffic(dt);
      while (S.trashTimes.length && S.rhT >= S.trashTimes[0]) { S.trashTimes.shift(); spawnWalker(null, 'trash'); }   // жильцы выносят мусор (сверх maxAlive)
      if (S.grannyAt !== null && S.rhT >= S.grannyAt) {
        S.grannyAt = null;
        spawnGranny();
        log('grannyCome');
      }
      var RC = rhythm().cop;
      if (RC) {
        C = D.npcs.cop;
        S.copTimer -= dt;
        if (S.copTimer <= 0) {
          S.copTimer = rand(RC.min, RC.max);
          var hasCop = false;
          for (i = 0; i < S.npcs.length; i++) if (S.npcs[i].type === 'cop') hasCop = true;
          if (!hasCop) {
            S.npcs.push({ id: nextId++, type: 'cop', x: -L.edgeOutside, y: C.y, dir: 1, state: 'walk', t: 0 });
            log('copCome');
          }
        }
      }
      if (S.entranceLock > 0) S.entranceLock = Math.max(0, S.entranceLock - dt);
      var E = D.places.entrance;
      if (S.hero.at === 'entrance') {
        S.entranceStay += dt;
        if (S.entranceStay >= S.entrancePatience) {          // жильцы выставляют: без урона, но с домофоном
          wake(null);
          heroLeavePlace(true);
          S.hero.move = null;
          emit('evicted');
          var ep = clampPos(E.x + L.kickOffset.x, E.y + L.kickOffset.y);
          S.hero.x = ep.x; S.hero.y = ep.y;
          S.entranceStay = 0;
          setDoorOpen(0);                                    // за спиной хлопнула дверь
          S.entranceLock = rand(E.lockMin, E.lockMax);
          S.tele.evictions++;
          log('entranceEvicted', { n: Math.ceil(S.entranceLock) });
        }
      } else if (S.entranceStay > 0) {
        S.entranceStay = Math.max(0, S.entranceStay - dt * E.patienceRecover);
      }
      for (i = S.npcs.length - 1; i >= 0; i--) {
        n = S.npcs[i];
        if (n.type === 'passerby' || n.type === 'granny') {
          if (!stepWalker(n, dt, false)) S.npcs.splice(i, 1);
        } else if (n.type === 'cop') {
          C = D.npcs.cop;
          var stopX = D.places.entrance.x + C.stopOffset;
          if (n.state === 'linger') {
            n.t -= dt;
            if (n.t <= 0) n.state = 'leave';
          } else {
            var patrol = projectGround(n.state === 'walk' ? stopX : 1 + L.edgeOutside, C.y);
            var patrolStep = (1 + 2 * L.edgeOutside) * L.logicalAspect / C.crossSeconds * dt;
            var patrolMove = moveOnGround(n,patrol.x,patrol.y,patrolStep);
            if (patrolMove.arrived && n.state === 'walk') { n.state = 'linger'; n.t = rand(C.lingerMin, C.lingerMax); }
          }
          if (S.hero.at === 'entrance' && copAtDoor(n)) {
            wake(null);
            heroLeavePlace(true);
            S.hero.move = null;
            emit('copKick');
            var p = clampPos(D.places.entrance.x + L.kickOffset.x, D.places.entrance.y + L.kickOffset.y);
            S.hero.x = p.x; S.hero.y = p.y;
            S.tele.copKicks++;
            log('copKick', { n: C.kickDamage });
            damage(C.kickDamage, 'other');
            S.entranceLock = rand(D.places.entrance.lockMin, D.places.entrance.lockMax);
            setDoorOpen(0);
            S.entranceStay = 0;
            if (!S.over) log('entranceLockSet', { n: Math.ceil(S.entranceLock) });
          }
          if (n.state === 'leave' && n.x >= 1 + L.edgeOutside) S.npcs.splice(i, 1);
        }
      }
    }

    /* ---------- шкалы героя ---------- */
    function updateHero(dt) {
      var h = S.hero, H = D.hero;
      var idle = placeIdle();
      h.satiety -= dt / H.satietyDrainInterval;
      if (h.asleep) h.energy += dt / H.energyGainInterval;
      else h.energy -= dt / H.energyDrainInterval;
      h.energy = clamp(h.energy, 0, H.max);
      h.warmth += heat().net * dt;
      if (idle && h.at === 'bench') h.health = Math.min(H.max, h.health + dt / D.places.bench.healthInterval);
      h.satiety = clamp(h.satiety, 0, H.max);
      h.warmth = clamp(h.warmth, 0, H.max);
      var starving = h.satiety <= 0, freezing = h.warmth <= 0, exhausted = h.energy <= 0;
      var fell = false;
      if (starving && !S.wasStarving) { log('starving'); fell = true; }
      if (freezing && !S.wasFreezing) { log('freezing'); fell = true; }
      if (exhausted && !S.wasExhausted) { log('exhausted'); fell = true; }
      S.wasStarving = starving; S.wasFreezing = freezing; S.wasExhausted = exhausted;
      if (fell) { emit('statZero'); wake('wakeAlarm'); }
      if (h.asleep && h.energy >= H.max) wake('wakeFull');
      if (starving) damage(dt / H.starveHealthInterval, 'hunger');
      if (exhausted) damage(dt / H.exhaustHealthInterval, 'sleep');
      if (freezing) damage(dt / H.freezeHealthInterval, 'cold');
    }

    /* ---------- предметные таймеры ---------- */
    function updateItems(dt) {
      var i, it;
      for (i = S.items.length - 1; i >= 0; i--) {
        it = S.items[i];
        if (it.type !== 'fire') continue;
        if (it.feedQueue > 0) {
          it.feedT += dt;
          if (it.feedT >= D.fire.feedSeconds) {
            it.feedT = 0; it.feedQueue--;
            var fd = it.feedList && it.feedList.length ? it.feedList.shift() : { type: 'cardboard', burn: D.items.cardboard.burn };
            it.timeLeft += fd.burn;
            log(fd.type === 'newspaper' ? 'fireFedPaper' : 'fireFed');
          }
        }
        it.timeLeft -= dt * fireBurnMult();
        if (it.timeLeft <= 0 && it.feedQueue <= 0) {
          S.items.splice(i, 1);
          log('fireOut');
        }
      }
    }

    /* ---------- главный шаг ---------- */
    function update(dt) {
      if (S.over || S.begging.dialog) return;
      if (dt > D.speed.maxSubstep && S.hero.task && S.hero.task.kind === 'talk') {
        advance(dt / S.speed);
        return;
      }
      recTrack();
      update1(dt);
      recTrack();
    }
    function update1(dt) {
      teleTick(dt);
      S.total += dt;
      S.phaseTime += dt;
      if (S.phaseTime >= phaseLen()) {
        S.phaseTime -= phaseLen();
        S.phase++;
        if (S.phase % 2 === 0) S.tele.gearDay.push({ warmth: S.gs.warmth, weather: S.gs.weather, charisma: S.gs.charisma, slots: S.gs.slots });   // конец суток: что надето
        if (S.phase >= D.time.days * 2) {
          S.over = { win: true, cause: null, total: S.total, phase: S.phase, phaseTime: 0 };
          return;
        }
        startPhase();
      }
      S.rhT += dt;
      if (rhythmAt(clockHour()).id !== S.rh) startRhythm(false);
      var at = S.hero.at;
      if (at && D.places[at] && D.places[at].hours && placeClosed(at) && (S.menuOpen || (S.hero.task && S.hero.task.placeId === at))) {
        S.menuOpen = false;                               // закрылось, пока герой у окошка: дело обрывается
        if (S.hero.task && S.hero.task.placeId === at) S.hero.task = null;
        log('closed', { name: D.places[at].name, t: opensAt(at) });
      }
      moveHero(dt);
      updateHero(dt);
      if (S.over) return;
      var t = S.hero.task;
      if (t) {
        t.t += dt / taskSlowdown();
        if (t.t >= t.dur && t.kind === 'talk' && findNpc(t.npcId)) {
          S.begging.dialog = newDialogue(findNpc(t.npcId), dt);
          ev('begOpen', { id: t.npcId, mood: S.begging.dialog.mood, observation: S.begging.dialog.observationIndex,
            level: skillProgress('begging').level, xp: S.begging.xp, socialXp: S.begging.socialXp });
          return;
        }
        if (t.t >= t.dur) finishHeroTask();
      }
      if (S.over) return;
      updateItems(dt);
      updateNpcs(dt);
    }

    /* Реальное время -> игровое с учётом скорости; подшаги не длиннее maxSubstep. */
    function advance(realDt) {
      var left = realDt, guard = 0;
      while (left > 1e-9 && !S.over && !S.begging.dialog && guard++ < 100000) {
        var sp = S.speed;
        var step = Math.min(D.speed.maxSubstep, left * sp);
        update(step);
        left -= step / sp;
      }
    }

    function reset() {
      nextId = 1;
      S = {
        phase: 0, phaseTime: 0, total: 0, over: null, money: 0,
        hero: {
          x: D.hero.startPos.x, y: D.hero.startPos.y,
          satiety: D.hero.start.satiety, warmth: D.hero.start.warmth, health: D.hero.start.health,
          energy: D.hero.start.energy, asleep: false,
          at: null, task: null, move: null, dir: 1, walking: false
        },
        items: [], npcs: [],
        moveDir: { x: 0, y: 0 }, moveHold: false, walkTime: 0,
        binStock: D.places.bin.stock, binTop: [],
        rh: null, rhT: 0, trashTimes: [], calm: false,
        inv: [], sellBatch: 0,
        den: { stage: 0, stash: [] },                   // правка 022: лежбище — построено ступеней, заначка
        worn: { head: null, neck: null, body: null, over: null, legs: null, hands: null, feet: null }, bagHandles: false, gs: null,
        weatherAhead: [], forecast: [],
        menuOpen: false,
        walkerTimer: 0, copTimer: 0, grannyAt: null,
        bus: null, busTimer: 0, traffic: null, doorOpen: 0,
        stats: { asks: 0, gave: 0, begMoney: 0 },
        begging: { xp: 0, socialXp: 0, yardHintsHeard: {}, talksTold: 0, jokesTold: 0, requestsMade: 0, neutralGoodbyes: 0, dialog: null },
        tele: newTele(),
        wasStarving: false, wasFreezing: false, wasExhausted: false,
        weather: null, weatherLocked: false, entranceLock: 0, entranceStay: 0,
        entrancePatience: (D.places.entrance.patienceMin + D.places.entrance.patienceMax) / 2,
        speed: D.speed.initial,
        log: [], logSeq: 0, sfx: []
      };
      refreshGear();
      log('hint');
      S.weatherAhead = [genWeatherFor(0), genWeatherFor(1)];
      S.phaseTime = Math.max(0, (D.time.startHour - sunrise(1)) * HOUR);   // игра начинается не на рассвете, а в startHour
      startPhase();
      startRhythm(true);
      R = null;
      if (opts.record) recBegin(recHead(opts.record));
    }
    function recHead(o) {
      o = typeof o === 'object' ? o : {};
      var d = new Date(now());
      return { id: o.id || (d.getTime().toString(36) + Math.floor(Math.random() * 1e6).toString(36)), game: D.build, started: o.started || d.toISOString(),
        window: o.window || { w: Math.round(field.w), h: Math.round(field.h) }, consent: 'local', kind: o.kind || 'human', bot: o.bot, seed: o.seed };
    }

    /* ---------- правка 017: сохранение (один слот; браузер пишет его на рассвете) ----------
       В слоте — весь S (JSON-копия), счётчик id, состояние генератора и курсор записи. Всё, от чего зависит ход игры, обязано жить в S. */
    function copy(o) { return JSON.parse(JSON.stringify(o)); }
    function saveState() {
      ev('save', { day: dayNo() });
      var c = copy(S); c.sfx = [];
      return { kind: 'bomzh-save', formatVersion: D.save.formatVersion, yardLayout: D.navigation.version, build: D.build, savedAt: new Date(now()).toISOString(),
        day: dayNo(), hour: fmtHour(clockHour()), nextId: nextId, rng: rng.getState ? rng.getState() : null, field: { w: field.w, h: field.h }, S: c,
        rec: R ? { head: R.head, n: R.events.length, w: copy(R.w) } : null };
    }
    /* stored — то, что лежит в хранилище записи этого забега: { events, lost } (может не быть). Чужая сборка — false. */
    function loadState(sv, stored) {
      if (!sv || sv.kind !== 'bomzh-save' || sv.build !== D.build || sv.formatVersion !== D.save.formatVersion) return false;
      S = copy(sv.S); S.sfx = [];
      if (!S.begging) S.begging = { xp: S.stats.asks * D.begging.xpPerAsk, dialog: null };
      if (!S.tele.begCards) S.tele.begCards = {};
      if (S.begging.socialXp === undefined) {
        var cards = S.tele.begCards;
        S.begging.socialXp = ((cards.talk || 0) + (cards.joke || 0) + (cards.askAboutYard || 0)) * D.begging.xpPerReply;
      }
      var dialog = S.begging.dialog;
      if (dialog && dialog.mood === undefined) {
        dialog.mood = 'calm';
        dialog.observationIndex = 0;
        dialog.rapport = 1;
        dialog.favorAgreed = dialog.used === 'favor';
        dialog.bonus = dialog.bonus || 0;
      }
      // В старых слотах сохранился только ответ на прежнюю шутку. Новые пары начинаются со следующего выбора.
      if (S.begging.jokesTold === undefined) S.begging.jokesTold = 0;
      if (S.begging.talksTold === undefined) S.begging.talksTold = 0;
      if (S.begging.requestsMade === undefined) S.begging.requestsMade = 0;
      if (S.begging.neutralGoodbyes === undefined) S.begging.neutralGoodbyes = 0;
      if (dialog && dialog.joke && !dialog.exchange) dialog.exchange = dialog.joke;
      if (!S.begging.yardHintsHeard) {
        // Раньше каждый типаж знал ровно первую реплику. Учитываем только услышанное до сохранения.
        var heard = S.begging.yardHintsHeard = {}, hints = D.begging.cards.askAboutYard.hints;
        if (dialog && dialog.question) {
          var speaker = findNpc(dialog.npcId);
          if (speaker) heard[who(speaker)] = 1;
        }
        for (var kind in hints) {
          var name = kind === 'granny' ? D.npcs.granny.name : D.npcs.passerby.kinds[kind].name;
          if (S.log.some(function (line) { return line.startsWith(name + ' — «'); })) heard[kind] = 1;
        }
        if (sv.rec && stored && stored.events) {
          for (var i = 0; i < Math.min(sv.rec.n, stored.events.length); i++) {
            var event = stored.events[i];
            if (event.e === 'yardHint' && hints[event.who]) heard[event.who] = 1;
          }
        }
      }
      if (dialog && dialog.question === undefined) {
        dialog.question = false;
        dialog.socialGain = dialog.used === 'talk' || dialog.used === 'joke' ? D.begging.xpPerReply : 0;
        dialog.unlocked = [];
      }
      if (dialog && dialog.lastMove === undefined) {
        var partner = findNpc(dialog.npcId);
        dialog.lastMove = partner ? savedDialogueMove(dialog, who(partner)) : null;
      }
      if (S.traffic === undefined) S.traffic = null;
      // В старых сохранениях автобус подъезжал слева и уезжал вправо.
      var bus = S.bus, stopX = D.walkers.bus.stop.x;
      if (bus && ((bus.state === 'in' && bus.x < stopX) || (bus.state === 'out' && bus.x > stopX))) {
        bus.x = 2 * stopX - bus.x;
      }
      var oldYard = sv.yardLayout !== D.navigation.version;
      if (oldYard && S.hero.at === 'pipe' && S.hero.asleep) {
        S.hero.asleep = false;
        S.tele.slT = 0;
      }
      var movedPlace = oldYard && ['bin', 'pipe', 'den'].includes(S.hero.at);
      if (movedPlace || !walkable(S.hero.x,S.hero.y)) {
        var place = S.hero.at && D.places[S.hero.at];
        Object.assign(S.hero, place ? standPoint({kind:'place',id:S.hero.at}) : projectGround(S.hero.x,S.hero.y));
      }
      S.items.forEach(function (it) {
        if (!walkable(it.x,it.y)) Object.assign(it, projectGround(it.x,it.y));
      });
      if (S.hero.move && (S.hero.move.target && S.hero.move.target.kind === 'place' || !walkable(S.hero.move.x,S.hero.move.y))) {
        var m = S.hero.move;
        Object.assign(m, standPoint(m.target,m.x,m.y));
      }
      S.npcs.forEach(function (n) {
        if (n.type === 'dog') return;
        if (!walkable(n.x,n.y)) Object.assign(n, projectGround(n.x,n.y));
        // В сохранённых маршрутах прежняя точка покупки была у правого торца.
        if (n.path && /kiosk/i.test(n.route)) {
          var oldStop = n.path.findIndex(function (pt, i) {
            return i >= n.leg && pt.wait && pt.x === .352 && pt.y === .846;
          });
          if (oldStop >= 0) {
            var counter = D.walkers.kioskCounter, waiting = oldStop === n.leg && n.wait > 0;
            var stop = { x: counter.x, y: counter.y, counter: true, wait: n.path[oldStop].wait };
            var replacement = waiting ? [stop] : [{ x: counter.x, y: counter.approachY }, stop];
            if (waiting) { n.x = stop.x; n.y = stop.y; n.pose = 'atCounter'; }
            n.path.splice.apply(n.path, [oldStop, 1].concat(replacement));
            n.navVersion = 0;
          }
        }
        // В старом дворе у бака было другое место. Ожидание, мусор и обратный путь сохраняются.
        if (oldYard && n.path) {
          var drop = n.path.findIndex(function (pt, i) { return i >= n.leg && pt.dump; });
          if (drop >= 0) {
            Object.assign(n.path[drop], binDropPoint());
            if (drop === n.leg && n.wait > 0) Object.assign(n, binDropPoint());
          }
        }
        if (n.path && (oldYard || !n.navVersion)) {
          n.path = n.path.slice(0,n.leg).concat(safeWalkerPath(n.path.slice(n.leg),n));
          n.navVersion = 1;
        }
      });
      // Совместимость с забегами, записанными до удаления собак.
      var target = S.hero.move && S.hero.move.target;
      var oldTarget = target && target.kind === 'npc' && findNpc(target.id);
      if (target && (target.type === 'dog' || (oldTarget && oldTarget.type === 'dog'))) {
        S.hero.move = null;
        S.hero.walking = false;
      }
      S.npcs = S.npcs.filter(function (npc) { return npc.type !== 'dog'; });
      delete S.dogTimes;
      nextId = sv.nextId;
      if (sv.rng !== null && sv.rng !== undefined && rng.setState) rng.setState(sv.rng);
      R = null;
      if (sv.rec) {
        var evs = (stored && stored.events) || [], n = sv.rec.n, tail = evs.slice(n);
        R = { head: sv.rec.head, events: evs.slice(0, n), lost: (stored && stored.lost) || [], w: copy(sv.rec.w), task: null, done: null };
        if (tail.length) R.lost.push({ at: new Date(now()).toISOString(), events: tail });   // сыграно после сохранения и потеряно при загрузке
        recSync();
        R.w.sess = (R.w.sess || 1) + 1; sessT0 = now();
        ev('load', { n: R.w.sess, date: new Date(now()).toISOString(), from: sv.savedAt, dropped: tail.length, missing: Math.max(0, n - evs.length) });
      } else if (opts.record) recBegin(recHead(opts.record));
      return true;
    }
    /* Строка журнала без игрового генератора (сохранение, выгрузка): выбор варианта — Math.random, на исход не влияет */
    function note(key, vars) {
      var arr = D.texts[key], s = arr[Math.floor(Math.random() * arr.length)];
      if (vars) for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
      appendLogLine(s);
    }
    reset();

    return {
      get state() { return S; },
      canWalk: canWalk,
      walkDistance: walkDistance,
      field: field,
      rng: rng,
      saveState: saveState,
      loadState: loadState,
      recFile: recFile,
      recEvent: function (e, f) { recTrack(); return ev(e, f); },
      get rec() { return R; },
      setInput: function (by, paused) { inCtx.by = by; inCtx.paused = !!paused; },
      note: note,
      setField: function (w, h) { field.w = w; field.h = h; },
      update: update,
      advance: advance,
      denNext: denNext, denNeedText: denNeedText, denPreview: denPreview, denDone: denDone,   // правка 022: лежбище и заначка
      stashPut: stashPut, stashTake: stashTake, stashReady: stashReady, stashCap: stashCap,
      setSpeed: setSpeed,
      toggleSleep: toggleSleep,
      useInv: useInv,
      unwear: unwear,
      gearStats: gearStats,
      refreshGear: refreshGear,
      capacity: capacity,
      heroFeels: heroFeels,
      outdoorLoss: outdoorLoss,
      shopInfo: shopInfo,
      statList: statList,
      itemName: itemName,
      forecastLines: forecastLines,
      dropFromInv: dropFromInv,
      invFull: invFull,
      order: order,
      setMoveDir: setMoveDir,
      act: act,
      nearby: nearby,
      walkSeconds: walkSeconds,
      walkSpeed: walkSpeed,
      standPoint: standPoint,
      buy: buy,
      bars: bars,
      isNight: isNight,
      dayNo: dayNo,
      clockHour: clockHour,
      calDay: calDay,
      fmtHour: fmtHour,
      rhythm: rhythm,
      rhythmAt: rhythmAt,
      rhythmDur: rhythmDur,
      sunrise: sunrise,
      sunset: sunset,
      nightLen: nightLen,
      opensAt: opensAt,
      closeMenu: function () { if (S.menuOpen) { S.menuOpen = false; return true; } return false; },
      phaseLen: phaseLen,
      placeClosed: placeClosed,
      entranceBlocked: entranceBlocked,
      dayDiv: dayDiv,
      dayLen: dayLen,
      goals: goals,
      findItem: findItem,
      spawnItemAt: spawnItemAt,
      findNpc: findNpc,
      heat: heat,
      describe: describe,
      setWeather: setWeather,
      spawnWalker: spawnWalker,
      spawnGranny: spawnGranny,
      intercept: intercept,
      catchInfo: catchInfo,
      warnings: warnings,
      frostLevel: frostLevel,
      shiverLevel: shiverLevel,
      noteWarnings: noteWarnings,
      doorWindow: doorWindow,
      spawnPassenger: spawnPassenger,
      walkerMods: walkerMods,
      walkerSpeed: walkerSpeed,
      giveChance: giveChance,
      begView: begView, playBegCard: playBegCard,
      npcName: npcName,
      talkable: talkable,
      entranceMood: entranceMood
    };
  }

  /* Запись строкой: читается в сыром виде — по событию на строку (правка 017) */
  function recText(f) {
    if (!f) return '';
    var out = '{"format":' + JSON.stringify(f.format) + ',"formatVersion":' + f.formatVersion + ',\n"head":' + JSON.stringify(f.head) + ',\n"events":[\n';
    out += f.events.map(function (e) { return JSON.stringify(e); }).join(',\n');
    out += '\n],\n"lost":' + JSON.stringify(f.lost) + ',\n"end":' + JSON.stringify(f.end) + ',\n"tele":' + JSON.stringify(f.tele) + '}\n';
    return out;
  }

  global.BomzhCore = { createGame: createGame, makeRng: makeRng, recText: recText };

  /* =====================================================================
   *  ИНТЕРФЕЙС (только в браузере)
   * ===================================================================== */
  if (typeof document === 'undefined') return;

  function $(id) { return document.getElementById(id); }

  function initUI() {
    var elField = $('field');
    var busEl = null, trafficEl = null;
    var elPlaces = $('layer-places');
    var elTiles = $('layer-tiles');
    var elBars = $('layer-bars');
    var elMenu = $('shop-menu');
    var dialoguePanel = $('dialogue-panel'), dialogueCards = $('dialogue-cards');
    var dialogueResult = $('dialogue-result'), dialogueSig = '';
    var elMenuGoods = $('shop-goods'), elMenuTitle = $('shop-title'), menuSig = null;
    var elGearSlots = $('gear-slots'), elGearSum = $('gear-sum'), elInvMark = $('inv-mark'), gearSlotEls = {}, gearSig = null;
    var elLog = $('log');
    var elPhase = $('phase-label');
    var elClock = $('clock');
    var elClockDial = $('clock-dial');
    var clockSegs = [], clockHand = null, clockSig = null;
    var elGoals = $('goals');
    var elStash = document.createElement('div'), stashSig = null;          // правка 022: заначка в лежбище (панель на поле)
    elStash.id = 'stash'; elField.appendChild(elStash);
    var goalsSig = null;
    var elStart = $('start-screen');
    var started = false;       // пока открыта стартовая карточка, время не идёт
    var elMoney = $('money-value');
    var elPauseBtn = $('pause-btn');
    var elPauseBanner = $('pause-banner'), elPauseNote = $('pause-note');
    var awayPaused = false;                     // пауза поставлена сама, когда окно потеряло фокус / вкладка скрыта
    var elEnd = $('end-screen');
    var elEndTitle = $('end-title');
    var elEndCause = $('end-cause');
    var elEndLived = $('end-lived');
    var elRestart = $('restart-btn');
    var stats = {
      satiety: { fill: $('stat-satiety-fill'), val: $('stat-satiety-value'), box: $('stat-satiety') },
      warmth: { fill: $('stat-warmth-fill'), val: $('stat-warmth-value'), box: $('stat-warmth') },
      health: { fill: $('stat-health-fill'), val: $('stat-health-value'), box: $('stat-health') },
      energy: { fill: $('stat-energy-fill'), val: $('stat-energy-value'), box: $('stat-energy') }
    };
    var elWeather = $('weather');
    var elWeatherIcon = $('weather-icon');
    var elWeatherTemp = $('weather-temp');
    var elWeatherWind = $('weather-wind');
    var elWeatherPrecip = $('weather-precip');
    var elWeatherFeels = $('weather-feels');
    var elWeatherCaption = $('weather-caption');
    var elWarmthRate = $('warmth-rate');
    var elTip = $('tooltip');
    var elTipTitle = $('tooltip-title');
    var elTipLines = $('tooltip-lines');
    var weatherSig = null;
    var tip = null;            // {kind, id, x, y} — над чем висит указатель
    var tipSig = null;
    var elInv = $('inventory');
    var elInvTitle = $('inv-title');
    var elInvCount = $('inv-count');
    var elInvSlots = $('inv-slots');
    var invSlotEls = [];
    var invSig = null;
    var invDrag = null;
    var elSpeedBtns = $('speed-btns');
    var speedBtnEls = [];

    var game = null;
    var paused = false;
    var elMarker = null;       // метка цели, к которой идёт герой
    var elWarn = null;         // ряд значков над героем: шкала ниже порога
    var warnSig = null, warnOff = 0, shivering = false, lastFrost = -1;
    var catchCache = {};       // id прохожего -> {ts, info}: «успею / не успею» считаем не чаще catchZone.recalcMs
    var lastPt = null;         // последний указатель {x, y, target}: подсветка прохожего под курсором
    var hotId = 0;
    var elActHint = null;      // подсказка «E — действие» над ближайшим объектом
    var nearEl = null;
    var keysDown = {};
    var placeEls = {};
    var tileEls = {};          // key -> element
    var barEls = {};
    var heroEl = null;
    var lastLogSeq = -1;
    var endShown = false;
    var lastTs = 0;
    var L = D.layout;

    function fieldSize() {
      var r = elField.getBoundingClientRect();
      game.setField(r.width, r.height);
      return r;
    }

    /* ---------- построение ---------- */
    function makeTile(kind, id, emoji, label, cls) {
      var el = document.createElement('div');
      el.className = 'tile ' + cls;
      el.dataset.kind = kind;
      el.dataset.id = String(id);
      var e = document.createElement('span');
      e.className = 'tile-emoji';
      e.textContent = emoji;
      var l = document.createElement('span');
      l.className = 'tile-label';
      l.textContent = label;
      el.appendChild(e);
      el.appendChild(l);
      elTiles.appendChild(el);
      return el;
    }

    function buildStatic() {
      elPlaces.innerHTML = '';
      placeEls = {};
      for (var id in D.places) {
        var P = D.places[id];
        var el = document.createElement('div');
        el.className = 'place place-' + id;
        el.id = 'place-' + id;
        el.innerHTML = '<span class="place-emoji"></span><span class="place-label"></span><span class="place-sub"></span>';
        el.children[0].textContent = P.emoji;
        el.children[1].textContent = P.name;
        elPlaces.appendChild(el);
        placeEls[id] = el;
      }
      /* автобусная остановка: декорация на тротуаре, не кликается */
      var stopEl = document.createElement('div');
      stopEl.className = 'decor bus-stop';
      stopEl.id = 'bus-stop';
      stopEl.innerHTML = '<span class="decor-emoji"></span>';
      stopEl.children[0].textContent = D.walkers.bus.stopEmoji;
      stopEl.style.left = (D.walkers.bus.stop.x * 100) + '%';
      stopEl.style.top = ((D.walkers.bus.stop.y + D.walkers.bus.stopShelterDy) * 100) + '%';
      elPlaces.appendChild(stopEl);
      /* правка 022: заначка — картонка рядом с лежбищем; видна, когда герой в лежбище и заначка построена */
      elStash.className = 'hidden';
      elStash.innerHTML = '<div class="stash-head"></div><div class="stash-slots"></div><div class="stash-hint"></div>';
      elStash.children[0].textContent = D.den.stashTitle;
      elStash.children[2].textContent = D.den.stashHint;
      stashSig = null;
      elInvTitle.textContent = D.inventory.name;
      elInvMark.textContent = D.inventory.handlesMark;
      elInvSlots.innerHTML = '';
      invSlotEls = [];                                     // слоты пакета строит renderInventory: их число зависит от карманов
      $('gear-title').textContent = D.gear.title;
      elGearSlots.innerHTML = '';
      gearSlotEls = {};
      D.gear.slots.forEach(function (sl) {                 // семь слотов «Надето»: клик — снять
        var g = document.createElement('div');
        g.className = 'gear-slot';
        g.dataset.slot = sl.id;
        g.innerHTML = '<span class="gear-ico"></span><span class="gear-name"></span>';
        g.children[1].textContent = sl.name;
        g.addEventListener('click', function () { if (game && started && !game.state.over) { game.unwear(sl.id); render(); } });
        elGearSlots.appendChild(g);
        gearSlotEls[sl.id] = g;
      });
      elSpeedBtns.innerHTML = '';
      speedBtnEls = [];
      D.speed.options.forEach(function (v) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'speed-btn';
        b.dataset.speed = String(v);
        b.textContent = '×' + v;
        b.setAttribute('aria-label', 'Скорость ×' + v);
        b.addEventListener('click', function () { chooseSpeed(v); b.blur(); });
        elSpeedBtns.appendChild(b);
        speedBtnEls.push(b);
      });
      elMenuGoods.innerHTML = '';                          // карточки товаров строит renderMenu: свои у ларька и у палатки
      var mc = $('shop-close');                            // правка 016: кнопка «закрыть» у меню ларька и палатки
      if (!mc) {
        mc = document.createElement('button'); mc.type = 'button'; mc.id = 'shop-close'; mc.className = 'shop-close';
        elMenu.insertBefore(mc, elMenu.firstChild);
      }
      mc.textContent = D.ui.menu.close; mc.title = D.ui.menu.closeTitle; mc.setAttribute('aria-label', D.ui.menu.closeTitle);
      mc.onclick = function (e) { e.stopPropagation(); if (game) { game.closeMenu(); render(); } mc.blur(); };
      var mn = elMenu.querySelector('.shop-note'); if (mn) mn.textContent = D.ui.menu.note;
      elMenuGoods.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('.shop-btn') : null;
        e.stopPropagation();                               // меню перерисуется: клик не должен уйти в поле как приказ «иди»
        if (!b || !game || b.disabled) return;
        game.buy(b.dataset.type);
        render();
      });
    }
    /* Значки характеристик: только ненулевые, со знаком. Рисунок подставляет art.js по data-s, запасной вид — эмодзи из data.js. */
    function chipsHtml(list) {
      return list.map(function (q) {
        var st = D.gear.stats[q.key];
        return '<span class="chip' + (q.v < 0 ? ' neg' : '') + '" data-s="' + q.key + '" title="' + st.name + '"><i class="st-ico" data-s="' + q.key + '">' + st.emoji + '</i>' +
          (q.v < 0 ? '−' : '+') + Math.abs(q.v) + '</span>';
      }).join('');
    }
    function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
    /* Меню ларька и палатки: одно окно, содержимое — по месту, где стоит герой */
    function renderMenu() {
      var S = game.state, pid = S.hero.at, on = S.menuOpen && !S.over && D.places[pid] && D.places[pid].goods;
      elMenu.classList.toggle('hidden', !on);
      if (!on) { menuSig = null; return; }
      var list = game.shopInfo(pid), W = D.tips.wear, stall = pid === 'stall';
      var sig = pid + '|' + list.map(function (g) { return g.type + (g.canBuy ? 1 : 0) + (g.worn ? 'w' : '') + (g.diff ? g.diff.name : ''); }).join(',');
      if (stall) { elMenu.style.left = ''; elMenu.style.top = ''; } else place(elMenu, D.places[pid].x, D.places[pid].y);
      if (sig === menuSig) return;
      menuSig = sig;
      elMenu.classList.toggle('menu-stall', stall);
      elMenu.classList.toggle('menu-kiosk', !stall);
      elMenuTitle.textContent = D.places[pid].title || D.places[pid].name;
      elMenuGoods.innerHTML = list.map(function (g) {
        var vs = '';
        if (g.worn) vs = '<span class="shop-vs">' + esc(W.worn) + '</span>';
        else if (g.diff) vs = '<span class="shop-vs">' + (g.diff.list.length ? esc(W.vs.split('{name}').join(g.diff.name).split('{diff}').join('')) + chipsHtml(g.diff.list) : esc(W.vsSame.split('{name}').join(g.diff.name))) + '</span>';
        return '<button type="button" class="shop-btn' + (g.canBuy ? '' : ' off') + (g.worn ? ' worn' : '') + '" data-type="' + g.type + '"' + (g.canBuy ? '' : ' disabled') + '>' +
          '<span class="shop-emoji">' + g.emoji + '</span>' +
          '<span class="shop-body">' +
          '<span class="shop-head"><span class="shop-name">' + esc(g.name) + '</span><span class="shop-price">' + g.price + ' ₽</span></span>' +
          '<span class="shop-stats">' + chipsHtml(g.stats) + (g.slot ? '<span class="shop-slot">' + esc(g.slot) + '</span>' : '') + (g.once ? '<span class="shop-slot">' + esc(W.once) + '</span>' : '') + '</span>' +
          (g.special.length ? '<span class="shop-special">' + esc(g.special.join('; ')) + '</span>' : '') + vs +
          '<span class="shop-joke">' + esc(g.joke) + '</span>' +
          '</span></button>';
      }).join('');
    }
    /* Блок «Надето»: семь слотов и строка-итог (нули не показываются) */
    function renderGear() {
      var S = game.state, gs = game.gearStats(), parts = [], id, w;
      for (id in gearSlotEls) parts.push(S.worn[id] ? S.worn[id].type : '');
      var sig = parts.join(',') + '|' + gs.slots;
      if (sig === gearSig) return;
      gearSig = sig;
      for (id in gearSlotEls) {
        w = S.worn[id];
        gearSlotEls[id].classList.toggle('filled', !!w);
        if (w) { gearSlotEls[id].dataset.type = w.type; gearSlotEls[id].children[0].textContent = D.items[w.type].emoji; }
        else { delete gearSlotEls[id].dataset.type; gearSlotEls[id].children[0].textContent = ''; }
      }
      var sum = [];
      ['warmth', 'weather', 'charisma'].forEach(function (k) { if (gs[k]) sum.push({ key: k, v: gs[k] }); });
      elGearSum.innerHTML = chipsHtml(sum) + (gs.slots !== D.inventory.slots ? '<span class="chip plain" data-s="slots"><i class="st-ico" data-s="slots">' + D.gear.stats.slots.emoji + '</i>' + gs.slots + '</span>' : '');
      elInvMark.classList.toggle('hidden', !S.bagHandles);
    }

    function gameOpts(r) {
      return { w: r.width, h: r.height, now: function () { return Date.now(); },
        record: D.record.on ? { window: { w: global.innerWidth, h: global.innerHeight } } : null };
    }
    function newGame(sv, stored, branch) {
      var r = elField.getBoundingClientRect();
      var previous = game;
      game = createGame(gameOpts(r));
      if (sv) {
        var freshId = game.rec && game.rec.head.id;
        try {
          if (!game.loadState(sv, stored)) throw new Error('save');
          if (branch && freshId && game.rec) {
            game.rec.head.parentId = game.rec.head.id;
            game.rec.head.id = freshId;
          }
        } catch (error) {
          game = previous;
          return false;
        }
      }
      if (global.BomzhSound && global.BomzhSound.resetScene) global.BomzhSound.resetScene();
      store.flushed = 0; store.overDone = false; store.broken = false; store.lastAutoState = null; store.lastPhase = game.state.phase;
      menuSig = null; gearSig = null;
      dialogueSig = '';
      dialogueResult.hidden = true;
      elTiles.innerHTML = '';
      busEl = null;
      trafficEl = null;
      elBars.innerHTML = '';
      tileEls = {};
      barEls = {};
      endInvDrag();
      keysDown = {};
      invSig = null;
      weatherSig = null;
      clockSig = null;
      goalsSig = null;
      tip = null;
      nearEl = null;
      elMarker = null; elActHint = null; elWarn = null;        // слои выше очищены: метки пересоздаст render
      catchCache = {}; warnSig = null; warnOff = 0; shivering = false; lastFrost = -1; hotId = 0;
      elField.style.setProperty('--frost', '0');
      heroEl = makeTile('hero', 0, D.hero.emoji, D.hero.name, 'hero');
      var sb = document.createElement('button');
      sb.type = 'button';
      sb.className = 'sleep-btn';
      sb.id = 'sleep-btn';
      sb.textContent = D.hero.sleepEmoji;
      sb.setAttribute('aria-label', 'Спать / проснуться');
      sb.addEventListener('click', function (e) {
        e.stopPropagation();
        game.toggleSleep();
        sb.blur();
        render();
      });
      heroEl.appendChild(sb);
      lastLogSeq = -1;
      endShown = false;
      elEnd.classList.add('hidden');
      setPaused(false);
      render();
      return true;
    }

    function setPaused(v, why) {
      if (game && started && why && v !== paused) game.recEvent('pause', { on: v ? 1 : 0, why: why });   // правка 017: в запись
      paused = v;
      if (!v) awayPaused = false;
      elPauseNote.textContent = D.ui.awayNote;
      elPauseNote.classList.toggle('hidden', !(v && awayPaused));
      elPauseBanner.classList.toggle('hidden', !paused);
      elPauseBtn.classList.toggle('active', paused);
    }
    function chooseSpeed(v) {
      if (!game || game.state.over) return;
      game.setSpeed(v);
      setPaused(false, 'speed');
      render();
    }

    /* ---------- отрисовка ---------- */
    function place(el, x, y) {
      el.style.left = (x * game.field.w) + 'px';
      el.style.top = (y * game.field.h) + 'px';
    }
    function fadeOut(el) {
      el.classList.add('gone');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, D.ui.removeFadeMs);
    }
    function fmtTime(sec) {
      sec = Math.floor(sec);
      var m = Math.floor(sec / 60), s = sec % 60;
      return m + ':' + (s < 10 ? '0' : '') + s;
    }
    function phaseName(phase) {
      return (phase % 2 === 1 ? 'Ночь ' : 'День ') + (Math.floor(phase / 2) + 1);
    }

    /* ---------- перехват без меткости: зоны вокруг прохожих, кольцо, подсветка ---------- */
    function catchOf(n) {
      var now = global.performance.now(), c = catchCache[n.id];
      if (!c || now - c.ts >= D.ui.catchZone.recalcMs) { c = catchCache[n.id] = { ts: now, info: game.catchInfo(n) }; }
      return c.info;
    }
    function behindForeground(el, cx, cy) {
      if (el.dataset.kind !== 'npc' && el.dataset.kind !== 'hero') return false;
      return global.BomzhArt && global.BomzhArt.foregroundCoversPoint(cx, cy, parseFloat(el.style.top) / game.field.h);
    }
    /* Прохожий, в чью зону попала точка экрана (ближайший к курсору), или null. Зона — круг вокруг фигурки радиусом catchZone.factor × её радиус.
       score — расстояние до центра в долях радиуса зоны (0 — в центре, 1 — на границе): им зона спорит с местами, см. pickAt. */
    function walkerAt(cx, cy) {
      var best = null, bd = 1e9, bs = 0, Z = D.ui.catchZone, key, el, n, r, sh, R, d;
      for (key in tileEls) {
        el = tileEls[key];
        if (!el.classList.contains('walker') || el.classList.contains('gone')) continue;
        n = game.findNpc(parseInt(el.dataset.id, 10));
        if (!n || !game.talkable(n)) continue;
        r = el.getBoundingClientRect();
        sh = el.children[0].offsetHeight || 60;                     // фигурка — вверху плитки
        R = Math.max(Z.minRadiusPx, sh / 2 * Z.factor);
        d = Math.sqrt(Math.pow(cx - (r.left + r.width / 2), 2) + Math.pow(cy - (r.top + sh / 2), 2));
        if (d <= R && d < bd && !behindForeground(el, cx, cy)) { bd = d; best = n; bs = d / R; }
      }
      return best ? { n: best, score: bs } : null;
    }
    /* Место под точкой: score — эллиптическое расстояние от центра плашки до точки (0 — центр, ~1 — край, до 1,4 — угол) */
    function placeAt(cx, cy) {
      var best = null, bs = 1e9, id, r, s;
      for (id in placeEls) {
        r = placeEls[id].getBoundingClientRect();
        if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) continue;
        s = Math.sqrt(Math.pow((cx - (r.left + r.width / 2)) / (r.width / 2), 2) + Math.pow((cy - (r.top + r.height / 2)) / (r.height / 2), 2));
        if (s < bs) { bs = s; best = id; }
      }
      return best ? { id: best, score: bs } : null;
    }
    /* Что взять по точке экрана (если прямой клик не попал в мелкую плитку вроде предмета): прохожего по зоне или место.
       Зона прохожего и плашка места состязаются: выигрывает тот, к чьему центру точка ближе в долях своего размера,
       поэтому у двери подъезда клик по двери открывает дверь, а клик по человеку в дверях ловит человека. */
    function pickAt(cx, cy) {
      var w = walkerAt(cx, cy), pl = placeAt(cx, cy);
      if (w && (!pl || w.score <= pl.score)) return { kind: 'npc', n: w.n };
      if (pl) return { kind: 'place', id: pl.id };
      return null;
    }
    function directTile(target, cx, cy) {
      var el = target && target.closest ? target.closest('.tile') : null;
      return el && !el.classList.contains('gone') && !behindForeground(el, cx, cy) ? el : null;
    }
    function updateHot() {
      var hot = null, t = lastPt && lastPt.target, el;
      if (lastPt && lastPt.inField && started && !invDrag && !game.state.over && !(t.closest && t.closest('.sleep-btn, #shop-menu'))) {
        el = directTile(t, lastPt.x, lastPt.y);
        if (!el || el.classList.contains('walker') || el.dataset.kind === 'hero') { var pk = pickAt(lastPt.x, lastPt.y); hot = pk && pk.kind === 'npc' ? pk.n : null; }
      }
      var id = hot ? hot.id : 0;
      if (id === hotId) return;
      var old = hotId ? tileEls['npc' + hotId] : null;
      if (old) old.classList.remove('hot');
      hotId = id;
      if (hot && tileEls['npc' + id]) tileEls['npc' + id].classList.add('hot');
      elField.style.cursor = hot ? 'pointer' : '';
    }

    /* ---------- предупреждения над героем, иней, дрожь ---------- */
    function rectsHit(a, b) { return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t; }
    function renderWarn() {
      var S = game.state, W = D.ui.warn, list = S.over ? [] : game.warnings(), sig = list.map(function (w) { return w.key + w.level; }).join(',');
      if (!elWarn) { elWarn = document.createElement('div'); elWarn.className = 'warn-row hidden'; elWarn.id = 'warn-row'; elBars.appendChild(elWarn); warnSig = null; }
      if (sig !== warnSig) {
        warnSig = sig;
        elWarn.innerHTML = '';
        list.forEach(function (w) {
          var ic = document.createElement('span');
          ic.className = 'warn-ico';
          ic.dataset.w = w.key;                                // по этому атрибуту art.js подставляет рисунок
          ic.dataset.lvl = String(w.level);
          ic.setAttribute('role', 'img');
          ic.setAttribute('aria-label', D.tips.stats[W.items[w.key].stat].title);
          elWarn.appendChild(ic);
        });
        elWarn.classList.toggle('hidden', !list.length);
      }
      if (!list.length) return;
      var fw = game.field.w, fh = game.field.h, px = S.hero.x * fw, py = S.hero.y * fh;
      var rw = list.length * W.iconPx + (list.length - 1) * W.gapPx, rh = W.iconPx;
      /* не наезжаем на подпись действия и полоски прогресса: если ряд упирается в них, поднимаем его выше */
      var obs = [], key, el, w, wo = 0;
      if (elActHint && !elActHint.classList.contains('hidden')) {
        w = elActHint.offsetWidth;
        wo = elActHint.classList.contains('for-place') ? -80 : -66;
        obs.push({ l: parseFloat(elActHint.style.left) - w / 2, r: parseFloat(elActHint.style.left) + w / 2, t: parseFloat(elActHint.style.top) + wo, b: parseFloat(elActHint.style.top) + wo + elActHint.offsetHeight });
      }
      for (key in barEls) {
        el = barEls[key];
        w = el.offsetWidth + 44;                              // справа ещё счётчик «×N»
        var isTalkBar = el.classList.contains('bar-talk');
        wo = isTalkBar ? -30 : el.classList.contains('bar-place') ? -84 : -62;
        obs.push({ l: parseFloat(el.style.left) - el.offsetWidth / 2, r: parseFloat(el.style.left) - el.offsetWidth / 2 + w, t: parseFloat(el.style.top) + wo, b: parseFloat(el.style.top) + (isTalkBar ? 0 : wo + el.offsetHeight) });
      }
      var atlasHeight = heroEl.classList.contains('hero-atlas') && !S.hero.asleep ? heroEl.offsetHeight + 8 : 0;
      var bottom = py - Math.max(W.baseOffsetPx, atlasHeight), pad = 4, i, hit, tries;
      for (tries = 0; tries < 5; tries++) {
        hit = null;
        var rc = { l: px - rw / 2 - pad, r: px + rw / 2 + pad, t: bottom - rh - pad, b: bottom + pad };
        for (i = 0; i < obs.length; i++) if (rectsHit(rc, obs[i])) { hit = obs[i]; break; }
        if (!hit) break;
        bottom = hit.t - 2 * pad;
      }
      var target = Math.max(bottom, W.minTopPx + rh) - py;     // смещение нижнего края ряда от центра героя
      warnOff += (target - warnOff) * 0.35;
      if (Math.abs(target - warnOff) < 0.5) warnOff = target;
      elWarn.style.left = px + 'px';
      elWarn.style.top = (py + warnOff) + 'px';
    }
    function renderFrostShiver() {
      var S = game.state, W = D.ui.warn, fl = game.frostLevel();
      if (S.over) fl = 0;
      if (Math.abs(fl - lastFrost) > 0.002) { lastFrost = fl; elField.style.setProperty('--frost', fl.toFixed(3)); }
      var sv = (!paused && !S.over) ? game.shiverLevel() : 0, spr = heroEl.children[0];
      if (sv) {
        var b = Math.floor(global.performance.now() / W.shiver.stepMs), amp = sv === 2 ? W.shiver.amplitudeCriticalPx : W.shiver.amplitudePx;
        var r1 = Math.sin(b * 12.9898) * 43758.5453, r2 = Math.sin(b * 78.233) * 12345.6789;
        r1 -= Math.floor(r1); r2 -= Math.floor(r2);
        spr.style.translate = ((r1 - 0.5) * 2 * amp).toFixed(2) + 'px ' + ((r2 - 0.5) * amp).toFixed(2) + 'px';
        shivering = true;
      } else if (shivering) { spr.style.translate = ''; shivering = false; }
      heroEl.classList.toggle('shiver', sv > 0);
    }

    function renderStat(st, v) {
      var shown = Math.ceil(v);
      st.fill.style.width = Math.max(0, Math.min(100, v / D.hero.max * 100)) + '%';
      st.val.textContent = String(shown);
      st.box.classList.toggle('low', v < D.hero.lowThreshold);
    }

    function placeTalkBar(bar, hero, partner) {
      // Общая подпись беседы находится над графикой двора. На невысоком экране помещаем её ниже собеседников.
      var half = bar.offsetWidth * .5, w = game.field.w, h = game.field.h;
      var x = Math.min(w - half - 3, Math.max(half + 3, (hero.x + partner.x) * .5 * w));
      var heroHeight = heroEl.classList.contains('hero-atlas') ? heroEl.offsetHeight : 62;
      var y = Math.min(hero.y * h - heroHeight, partner.y * h - 62) - 16;
      if (y - 30 < $('hud').offsetHeight + 4) {
        var top = Math.max(hero.y, partner.y) * h + 17;
        Object.keys(placeEls).forEach(function (id) {
          var el = placeEls[id], label = el.children[1].getBoundingClientRect();
          var sub = el.children[2].getBoundingClientRect();
          var bottom = Math.max(label.bottom, sub.bottom);
          if (label.right >= x - half && label.left <= x + half && label.top < top + 30 && bottom > top - 8) top = bottom + 5;
        });
        y = Math.min(h - 2, top + 30);
      }
      bar.style.left = x + 'px'; bar.style.top = y + 'px';
      var left = hero.x <= partner.x ? D.hero.name : game.npcName(partner);
      var right = hero.x <= partner.x ? game.npcName(partner) : D.hero.name;
      var names = bar.children[2];
      if (names.firstChild.textContent !== left) names.firstChild.textContent = left;
      if (names.lastChild.textContent !== right) names.lastChild.textContent = right;
    }

    function render() {
      var S = game.state, id, i, el, key, seen;
      var night = game.isNight();

      /* HUD */
      renderStat(stats.satiety, S.hero.satiety);
      renderStat(stats.warmth, S.hero.warmth);
      renderStat(stats.health, S.hero.health);
      renderStat(stats.energy, S.hero.energy);
      renderWeather();
      for (i = 0; i < speedBtnEls.length; i++) {
        speedBtnEls[i].classList.toggle('active', !paused && D.speed.options[i] === S.speed);
      }
      elMoney.textContent = String(S.money);
      renderClock();
      renderGoals();
      renderStash();
      elField.classList.toggle('night', night);

      /* места */
      for (id in placeEls) {
        el = placeEls[id];
        place(el, D.places[id].x, D.places[id].y);
        var closed = game.placeClosed(id);
        el.classList.toggle('closed', closed);
        var sub = '', SUB = D.tips.sub;
        if (id === 'entrance') {
          var blk = game.entranceBlocked();
          if (blk === 'cop') sub = SUB.cop;
          else if (blk === 'lock') sub = SUB.lock.split('{n}').join(Math.ceil(S.entranceLock));
          else if (S.entranceLock > 0 && S.doorOpen > 0 && S.hero.at !== 'entrance') sub = SUB.doorOpen;
          else if (S.hero.at === 'entrance') sub = SUB.mood[game.entranceMood()];
          el.classList.toggle('door-open', S.doorOpen > 0);        // art.js рисует приоткрытую дверь с тёплым светом
        } else if (closed) sub = SUB.closed.split('{t}').join(game.opensAt(id));
        else if (id === 'bin') sub = S.binStock > 0 ? 'внутри: ' + S.binStock : 'пусто';
        else if (id === 'den') {                           // правка 022: ступень лежбища; art.js рисует её по классу stage-N
          var dnx = game.denNext();
          sub = dnx && dnx.ok ? SUB.denReady : S.den.stage ? SUB.den.split('{n}').join(S.den.stage).split('{m}').join(D.den.stages.length) : SUB.denBare;
          for (var dsi = 0; dsi <= D.den.stages.length; dsi++) el.classList.toggle('stage-' + dsi, dsi === S.den.stage);
          el.classList.toggle('ready', !!(dnx && dnx.ok));
        }
        el.children[2].textContent = sub;
      }

      /* У разговаривающих есть свои игровые координаты. Если они совпали, в кадре разводим собеседников. */
      var partner = S.hero.task && S.hero.task.kind === 'talk' ? game.findNpc(S.hero.task.npcId) : null;
      var heroShift = 0;
      if (partner && Math.abs(S.hero.y - partner.y) * game.field.h < 64) {
        var gap = (S.hero.x - partner.x) * game.field.w;
        heroShift = (gap <= 0 ? -1 : 1) * Math.max(0, (76 - Math.abs(gap)) * 0.5);
      }
      /* герой */
      place(heroEl, S.hero.x, S.hero.y);
      heroEl.style.marginLeft = heroShift ? heroShift + 'px' : '';
      heroEl.classList.toggle('talking', !!partner);
      heroEl.classList.toggle('busy', !!S.hero.task);
      heroEl.classList.toggle('asleep', !!S.hero.asleep);
      heroEl.classList.toggle('walking', !!S.hero.walking);      // по этим классам art.css рисует шаг и поворот
      heroEl.classList.toggle('face-left', S.hero.dir < 0);
      var heroLabel = S.hero.asleep ? D.hero.sleepName : D.hero.name, mv = S.hero.move, Wk = D.hero.walk;
      if (mv) {
        var goName = '';
        if (mv.target && mv.target.kind === 'place') goName = D.places[mv.target.id].name;
        else if (mv.target && mv.target.kind === 'npc') goName = mv.target.name || D.npcs[mv.target.type].name;
        else if (mv.target && mv.target.kind === 'item') { var gi = game.findItem(mv.target.id); goName = gi ? D.items[gi.type].name : ''; }
        heroLabel = goName ? Wk.labelGo.split('{name}').join(goName) : Wk.labelGoPoint;
      }
      heroEl.children[1].textContent = heroLabel;
      /* метка цели маршрута */
      if (!elMarker) { elMarker = document.createElement('div'); elMarker.className = 'walk-marker hidden'; elMarker.id = 'walk-marker'; elTiles.appendChild(elMarker); }
      elMarker.classList.toggle('hidden', !mv);
      if (mv) {
        var mx = mv.x, my = mv.y;
        if (paused && mv.target && mv.target.kind === 'npc') {     // на паузе путь ещё не пересчитан: метку ставим в расчётную точку встречи
          var tn = game.findNpc(mv.target.id), ci = tn ? game.catchInfo(tn) : null;
          if (ci && ci.status === 'ok') { var cp = game.standPoint(null, ci.x, ci.y); mx = cp.x; my = cp.y; }
        }
        place(elMarker, mx, my);
      }
      /* что рядом: подсветка и подсказка клавиши действия */
      var nb = game.nearby(), nbEl = null;
      if (nb) nbEl = nb.kind === 'place' ? placeEls[nb.id] : tileEls[nb.kind + nb.id];
      if (nearEl !== nbEl) { if (nearEl) nearEl.classList.remove('near'); nearEl = nbEl || null; if (nearEl) nearEl.classList.add('near'); }
      if (!elActHint) { elActHint = document.createElement('div'); elActHint.className = 'act-hint hidden'; elActHint.id = 'act-hint'; elBars.appendChild(elActHint); }
      elActHint.classList.toggle('hidden', !nbEl);
      if (nbEl) {
        var hintText = Wk.actionKey + ' — ' + nb.label;
        if (elActHint.textContent !== hintText) elActHint.textContent = hintText;
        elActHint.classList.toggle('for-place', nb.kind === 'place');
        elActHint.style.left = nbEl.style.left;
        elActHint.style.top = Math.min(parseFloat(nbEl.style.top), S.hero.y * game.field.h - 18) + 'px';
      }

      /* предметы и встречные */
      seen = {};
      for (i = 0; i < S.items.length; i++) {
        var it = S.items[i];
        key = 'item' + it.id;
        seen[key] = true;
        el = tileEls[key];
        if (!el) {
          el = makeTile('item', it.id, D.items[it.type].emoji, game.itemName(it), 'item item-' + it.type + (it.read ? ' read' : ''));
          if (it.type === 'fire') {
            var ring = document.createElement('span');
            ring.className = 'fire-ring';
            el.appendChild(ring);
          }
          tileEls[key] = el;
        }
        if (it.type === 'fire') {            // радиус тепла задан в долях поля — пересчитываем в пиксели
          el.children[2].style.width = (D.fire.radiusX * 2 * game.field.w) + 'px';
          el.children[2].style.height = (D.fire.radiusY * 2 * game.field.h) + 'px';
        }
        if (it.type === 'fire') el.children[1].textContent = D.items.fire.name + ' ' + Math.max(0, Math.ceil(it.timeLeft / game.heat().fireBurn)) + ' с';
        el.classList.toggle('locked', !!it.locked);
        place(el, it.x, it.y);
      }
      for (i = 0; i < S.npcs.length; i++) {
        var n = S.npcs[i];
        key = 'npc' + n.id;
        seen[key] = true;
        el = tileEls[key];
        if (!el) {
          var walker = n.type === 'passerby' || n.type === 'granny';
          var nd = n.kind ? D.npcs.passerby.kinds[n.kind] : D.npcs[n.type];
          el = makeTile('npc', n.id, nd.emoji, nd.name, 'npc npc-' + (n.kind || n.type) + (walker ? ' walker' : ''));
          if (walker) { var cring = document.createElement('span'); cring.className = 'catch-ring'; el.appendChild(cring); }   // кольцо «успею / не успею»
          if (walker) { var tbag = document.createElement('span'); tbag.className = 'trash-bag'; el.appendChild(tbag); }      // пакет с мусором в руке (виден, пока несёт)
          tileEls[key] = el;
        }
        if (el.classList.contains('walker')) {            // по этим классам art.css рисует шаг, поворот и пометку «уже просил»
          el.classList.toggle('walking', !!n.walking);
          el.classList.toggle('face-left', n.dir < 0);
          el.classList.toggle('sitting', n.pose === 'sit');
          el.classList.toggle('at-counter', n.pose === 'atCounter');
          el.classList.toggle('trash', !!n.trash);
          var cst = catchOf(n).status;
          if (el.dataset.catch !== cst) el.dataset.catch = cst;
          if ((n.asked || n.spoken) && !el.classList.contains('asked')) { el.classList.add('asked'); el.children[1].textContent = game.npcName(n) + ' · ' + D.tips.askedMark; }
        } else {
          el.classList.toggle('flip', n.dir === 1);
        }
        var swayK = n.kind && D.npcs.passerby.kinds[n.kind] ? D.npcs.passerby.kinds[n.kind].sway : 0;
        el.style.marginLeft = partner && n.id === partner.id && heroShift ? -heroShift + 'px' : '';
        el.classList.toggle('talking', !!partner && n.id === partner.id);
        if (swayK && n.walking) place(el, n.x + Math.sin(n.x * 90 + n.id) * swayK * 0.3, n.y + Math.sin(n.x * 55 + n.id * 1.7) * swayK);   // подвыпивший идёт нетвёрдо — только вид, логика идёт по прямой
        else place(el, n.x, n.y);
      }
      /* автобус */
      if (S.bus) {
        if (!busEl) {
          busEl = document.createElement('div');
          busEl.className = 'bus';
          busEl.id = 'bus';
          busEl.innerHTML = '<span class="bus-body"></span>';
          busEl.children[0].textContent = D.walkers.bus.emoji;
          elTiles.appendChild(busEl);
        }
        busEl.classList.toggle('stopped', S.bus.state === 'stop');
        place(busEl, S.bus.x, D.walkers.bus.y);
      } else if (busEl) { if (busEl.parentNode) busEl.parentNode.removeChild(busEl); busEl = null; }
      if (S.traffic) {
        if (!trafficEl) {
          trafficEl = document.createElement('div');
          trafficEl.id = 'road-traffic';
          trafficEl.setAttribute('aria-hidden', 'true');
          trafficEl.innerHTML = '<span class="traffic-body"></span>';
          elTiles.appendChild(trafficEl);
        }
        trafficEl.dataset.kind = S.traffic.kind;
        trafficEl.dataset.dir = S.traffic.dir;
        place(trafficEl, S.traffic.x, S.traffic.y);
      } else if (trafficEl) {
        trafficEl.remove();
        trafficEl = null;
      }
      for (key in tileEls) {
        if (!seen[key]) {
          if (nearEl === tileEls[key]) nearEl = null;
          if (key.indexOf('npc') === 0) delete catchCache[key.slice(3)];
          fadeOut(tileEls[key]);
          delete tileEls[key];
        }
      }

      /* полоски */
      var bars = game.bars();
      seen = {};
      for (i = 0; i < bars.length; i++) {
        var b = bars[i];
        var pos = anchorPos(b.anchor);
        if (!pos) continue;
        seen[b.key] = true;
        el = barEls[b.key];
        if (!el) {
          el = document.createElement('div');
          el.className = 'bar';
          el.innerHTML = '<div class="bar-fill"></div><span class="bar-count"></span>';
          elBars.appendChild(el);
          barEls[b.key] = el;
        }
        el.style.left = (pos.x * game.field.w) + 'px';
        el.style.top = (pos.y * game.field.h) + 'px';
        var talkBar = partner && b.anchor.kind === 'npc' && b.anchor.id === partner.id;
        el.classList.toggle('bar-talk', !!talkBar);
        if (talkBar) {
          if (!el.children[2]) {
            var names = document.createElement('span');
            names.className = 'talk-names'; names.innerHTML = '<span></span><span></span>'; el.appendChild(names);
          }
          placeTalkBar(el, S.hero, partner);
        }
        el.classList.toggle('bar-place', b.anchor.kind === 'place');
        el.children[0].style.width = Math.max(0, Math.min(100, b.p * 100)) + '%';
        el.children[1].textContent = b.count && b.count > 1 ? '×' + b.count : '';
      }
      for (key in barEls) {
        if (!seen[key]) { elBars.removeChild(barEls[key]); delete barEls[key]; }
      }

      /* меню ларька / палатки, блок «Надето» */
      renderMenu();
      renderDialogue();
      renderGear();

      renderWarn();
      renderFrostShiver();
      updateHot();

      /* пакет */
      renderInventory();
      renderTip();

      /* лог */
      if (S.logSeq !== lastLogSeq) {
        lastLogSeq = S.logSeq;
        elLog.innerHTML = '';
        for (i = 0; i < S.log.length; i++) {
          var line = document.createElement('div');
          line.className = 'log-line';
          line.style.opacity = String(0.45 + 0.55 * (i + 1) / S.log.length);
          line.textContent = S.log[i];
          elLog.appendChild(line);
        }
      }

      /* конец */
      if (S.over && !endShown) showEnd();
    }

    /* ---------- циферблат: один оборот стрелки за сутки, тёмный сектор — ночь ---------- */
    function svgEl(tag, attrs) {
      var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (var k in attrs) el.setAttribute(k, attrs[k]);
      return el;
    }
    var clockMoon = null, clockSun = null, clockDay = null, CLOCK = { c: 50, seg: 33, rim: 39, icon: 45.5 };
    function buildClock() {
      var n = D.time.divisions, cx = CLOCK.c, cy = CLOCK.c, r = CLOCK.seg, i, a;
      var svg = svgEl('svg', { viewBox: '0 0 100 100', 'class': 'clock-svg' });
      svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: CLOCK.rim, 'class': 'clock-rim' }));
      clockSegs = [];
      for (i = 0; i < n; i++) {
        var a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
        var seg = svgEl('path', {
          d: 'M' + cx + ' ' + cy + 'L' + (cx + Math.cos(a0) * r).toFixed(2) + ' ' + (cy + Math.sin(a0) * r).toFixed(2) +
            'A' + r + ' ' + r + ' 0 0 1 ' + (cx + Math.cos(a1) * r).toFixed(2) + ' ' + (cy + Math.sin(a1) * r).toFixed(2) + 'Z',
          'class': 'clock-seg'
        });
        seg.setAttribute('class', 'clock-seg night');
        svg.appendChild(seg);
        clockSegs.push(seg);
      }
      for (i = 0; i < n; i++) {                           // деления на ободе
        a = (i / n) * Math.PI * 2 - Math.PI / 2;
        svg.appendChild(svgEl('line', {
          x1: (cx + Math.cos(a) * (r + 1)).toFixed(2), y1: (cy + Math.sin(a) * (r + 1)).toFixed(2),
          x2: (cx + Math.cos(a) * (CLOCK.rim - 1)).toFixed(2), y2: (cy + Math.sin(a) * (CLOCK.rim - 1)).toFixed(2), 'class': 'clock-tick'
        }));
      }
      svg.appendChild(svgEl('path', { d: 'M22 66q13 9 26 2M58 22q11 4 17 15', 'class': 'clock-scratch' }));
      clockDay = svgEl('path', { d: '', 'class': 'clock-seg day clock-daylight' });   // светлый сектор поверх ночных делений
      svg.insertBefore(clockDay, clockSegs.length ? clockSegs[clockSegs.length - 1].nextSibling : null);
      /* солнце — у рассвета, луна — у заката (ставит renderClock) */
      var sun = clockSun = svgEl('g', { 'class': 'clock-sun', transform: 'translate(' + cx + ' ' + (cy - CLOCK.icon) + ')' });
      sun.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 3.4 }));
      sun.appendChild(svgEl('path', { d: 'M0-5.6V-7.4M0 5.6V7.4M-5.6 0H-7.4M5.6 0H7.4M-4-4L-5.2-5.2M4-4L5.2-5.2M-4 4L-5.2 5.2M4 4L5.2 5.2' }));
      svg.appendChild(sun);
      clockMoon = svgEl('g', { 'class': 'clock-moon' });
      clockMoon.appendChild(svgEl('path', { d: 'M1.2-4.6a4.8 4.8 0 1 0 3.6 7.6a4 4 0 0 1-3.6-7.6z' }));
      svg.appendChild(clockMoon);
      clockHand = svgEl('g', { 'class': 'clock-hand' });
      clockHand.appendChild(svgEl('line', { x1: cx, y1: cy + 8, x2: cx, y2: cy - 29, 'class': 'clock-hand-edge' }));
      clockHand.appendChild(svgEl('line', { x1: cx, y1: cy + 8, x2: cx, y2: cy - 29, 'class': 'clock-hand-line' }));
      svg.appendChild(clockHand);
      svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: 4.2, 'class': 'clock-cap' }));
      elClockDial.innerHTML = '';
      elClockDial.appendChild(svg);
    }
    /* Циферблат (правка 016): 24 часа, полночь сверху. Светлый сектор — от рассвета до заката этих суток, солнце у рассвета, луна у заката. */
    function renderClock() {
      var S = game.state, phase = Math.min(S.phase, D.time.days * 2 - 1);
      var day = Math.floor(phase / 2) + 1, rhName = game.rhythm().name;
      var sig = phase + '|' + rhName;
      if (sig !== clockSig) {
        clockSig = sig;
        var a0 = game.sunrise(day) / 24 * Math.PI * 2, a1 = game.sunset(day) / 24 * Math.PI * 2, r = CLOCK.seg, cx = CLOCK.c;
        var pt = function (a, rr) { return (cx + Math.sin(a) * rr).toFixed(2) + ' ' + (cx - Math.cos(a) * rr).toFixed(2); };
        clockDay.setAttribute('d', 'M' + cx + ' ' + cx + 'L' + pt(a0, r) + 'A' + r + ' ' + r + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 1 ' + pt(a1, r) + 'Z');
        clockSun.setAttribute('transform', 'translate(' + pt(a0, CLOCK.icon) + ')');
        clockMoon.setAttribute('transform', 'translate(' + pt(a1, CLOCK.icon) + ')');
        elPhase.textContent = phaseName(phase) + ' из ' + D.time.days + ' · ' + rhName;
        elClock.classList.toggle('night', phase % 2 === 1);
        elClock.dataset.rhythm = game.rhythm().id;
      }
      var h = (S.over && S.over.win) ? game.sunrise(D.time.days + 1) : game.clockHour();
      // Гражданские минуты дают фасаду те же часы при паузе, ускорении и загрузке.
      var minute = Math.floor(h * 1200) / 20;
      var calendarDay = day + (game.isNight() && h < game.sunset(day) ? 1 : 0);
      var facadeMinute = String(calendarDay * 1440 + minute);
      if (elClock.dataset.minute !== facadeMinute) elClock.dataset.minute = facadeMinute;
      clockHand.setAttribute('transform', 'rotate(' + (h / 24 * 360).toFixed(2) + ' ' + CLOCK.c + ' ' + CLOCK.c + ')');
    }

    /* ---------- строка задач (data.js: goals) ---------- */
    function renderGoals() {
      var list = game.goals(), sig = list.map(function (q) { return q.id + ':' + q.done + ':' + q.progress + ':' + (q.ready ? 1 : 0); }).join(',');
      if (sig === goalsSig) return;
      goalsSig = sig;
      elGoals.innerHTML = '';
      list.forEach(function (q) {
        var row = document.createElement('div');
        row.className = 'goal goal-' + q.id + (q.complete ? ' complete' : '') + (q.ready ? ' ready' : '');
        var title = document.createElement('span'); title.className = 'goal-title'; title.textContent = (q.title || D.goalsTitle) + ':';
        var text = document.createElement('span'); text.className = 'goal-text'; text.textContent = q.text;
        var pips = document.createElement('span'); pips.className = 'goal-pips';
        for (var i = 0; i < q.total; i++) {
          var p = document.createElement('span');
          p.className = 'pip' + (i < q.done ? ' done' : '');
          pips.appendChild(p);
        }
        var prog = document.createElement('span'); prog.className = 'goal-progress'; prog.textContent = q.progress;
        row.appendChild(title); row.appendChild(text); row.appendChild(pips); row.appendChild(prog);
        elGoals.appendChild(row);
      });
    }

    /* ---------- стартовая карточка ---------- */
    function buildStartCard() {
      var C = D.startCard;
      $('start-title').textContent = C.title;
      $('start-how-title').textContent = C.howTitle;
      $('start-btn').textContent = C.button;
      $('start-note').textContent = C.note;
      var intro = $('start-intro'), how = $('start-how');
      intro.innerHTML = ''; how.innerHTML = '';
      C.intro.forEach(function (s) { var p = document.createElement('p'); p.textContent = s; intro.appendChild(p); });
      C.how.forEach(function (s) { var li = document.createElement('li'); li.textContent = s; how.appendChild(li); });
      $('continue-btn').textContent = C.continueBtn;
      $('continue-btn').classList.remove('hidden');
      $('continue-btn').addEventListener('click', function () { openSlots('load', this); });
      $('start-btn').addEventListener('click', function () {
        if (started) return;
        started = true;
        elStart.classList.add('hidden');
        flushRec();
      });
    }

    function deg(v) { return (v < 0 ? '−' : (v > 0 ? '+' : '')) + Math.abs(v) + '°'; }
    function renderWeather() {
      var S = game.state, Wt = S.weather, WD = D.weather;
      var feels = Math.round(game.heroFeels());            // для героя: одежда от непогоды срезает поправку ветра и осадков
      var sig = S.phase + '|' + Wt.temp + '|' + Wt.wind + '|' + Wt.windMs + '|' + Wt.precip + '|' + feels;
      if (sig !== weatherSig) {
        weatherSig = sig;
        var precipName = '';
        for (var i = 0; i < WD.precips.length; i++) if (WD.precips[i].id === Wt.precip) precipName = WD.precips[i].name;
        elWeather.dataset.type = Wt.type;       // по этим атрибутам art.js рисует значок, снег, ветер
        elWeather.dataset.wind = String(Wt.wind);
        elWeather.dataset.precip = Wt.precip;
        var iconType = (Wt.type === 'calm' && S.phase % 2 === 0) ? 'calmday' : Wt.type;   // ясным днём — бледное солнце, ночью — полумесяц
        elWeatherIcon.dataset.type = iconType;
        elWeatherIcon.textContent = WD.types[iconType].emoji;
        elWeatherTemp.textContent = deg(Wt.temp);
        elWeatherWind.textContent = WD.labels.wind.split('{name}').join(WD.winds[Wt.wind].name).split('{ms}').join(Wt.windMs);
        elWeatherPrecip.textContent = precipName;
        elWeatherFeels.textContent = WD.labels.feels.split('{f}').join(deg(feels));
        elWeatherCaption.textContent = Wt.caption;
      }
      var net = game.heat().net;
      if (S.hero.warmth >= D.hero.max && net > 0) net = 0;
      if (S.hero.warmth <= 0 && net < 0) net = 0;
      var a = Math.abs(net), txt = a < 0.005 ? '0' : (a < 1 ? a.toFixed(2).replace(/0$/, '') : a.toFixed(1)).replace(/\.0$/, '').replace('.', ',');
      elWarmthRate.textContent = (net > 0.005 ? '▲ ' : (net < -0.005 ? '▼ ' : '● ')) + txt + '/с';
      elWarmthRate.classList.toggle('up', net > 0.005);
      elWarmthRate.classList.toggle('down', net < -0.005);
      elWarmthRate.classList.toggle('fast', net <= -D.ui.warmthFastLoss);
    }

    /* ---------- подсказки при наведении ---------- */
    function hideTip() {
      if (tipSig !== null) { elTip.classList.add('hidden'); tipSig = null; }
    }
    function tipFromEvent(e) {
      tip = null;
      if (invDrag || !game || game.state.over || e.pointerType === 'touch') return;
      var t = e.target, el = t && t.closest ? t.closest('.inv-item') || directTile(t, e.clientX, e.clientY) : null;
      if (t && t.closest && t.closest('#clock')) { tip = { kind: 'clock', id: 0, x: e.clientX, y: e.clientY }; return; }
      var wr = elWeather.getBoundingClientRect();           // плашка погоды мышь не ловит (pointer-events), поэтому по прямоугольнику
      if (e.clientX >= wr.left && e.clientX <= wr.right && e.clientY >= wr.top && e.clientY <= wr.bottom) { tip = { kind: 'weather', id: 0, x: e.clientX, y: e.clientY }; return; }
      var gsl = t && t.closest ? t.closest('.gear-slot') : null;
      if (gsl) { tip = { kind: 'gear', id: gsl.dataset.slot, x: e.clientX, y: e.clientY }; return; }
      if (t && t.closest && t.closest('#gear-sum, #gear-title')) { tip = { kind: 'gearsum', id: 0, x: e.clientX, y: e.clientY }; return; }
      if (t && t.closest && t.closest('#shop-menu, #hud, #end-screen, #start-screen, .sleep-btn')) return;
      var stEl = t && t.closest ? t.closest('.stat') : null;
      if (stEl) { tip = { kind: 'stat', id: stEl.id.replace('stat-', ''), x: e.clientX, y: e.clientY }; return; }
      if (t && t.closest && t.closest('#field') && (!el || el.classList.contains('walker'))) {      // крупная зона вокруг прохожего: подсказка и там
        var zw = pickAt(e.clientX, e.clientY);
        if (zw && zw.kind === 'npc') { tip = { kind: 'npc', id: zw.n.id, x: e.clientX, y: e.clientY }; return; }
      }
      if (el && el.classList.contains('inv-item')) tip = { kind: 'inv', id: parseInt(el.dataset.id, 10) };
      else if (el && !el.classList.contains('gone')) tip = { kind: el.dataset.kind, id: el.dataset.kind === 'hero' ? 0 : parseInt(el.dataset.id, 10) };
      else {
        var r = elField.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          for (var pid in placeEls) {
            var pr = placeEls[pid].getBoundingClientRect();
            if (e.clientX >= pr.left && e.clientX <= pr.right && e.clientY >= pr.top && e.clientY <= pr.bottom) tip = { kind: 'place', id: pid };
          }
        }
      }
      if (tip) { tip.x = e.clientX; tip.y = e.clientY; }
    }
    function renderTip() {
      if (!tip || invDrag || game.state.over) { hideTip(); return; }
      var d = game.describe(tip.kind, tip.id);
      if (!d) { hideTip(); return; }
      var sig = d.title + '\n' + d.lines.join('\n');
      if (sig !== tipSig) {
        tipSig = sig;
        elTipTitle.textContent = d.title;
        elTipLines.innerHTML = '';
        for (var i = 0; i < d.lines.length; i++) {
          var ln = document.createElement('div');
          ln.className = 'tooltip-line';
          ln.textContent = d.lines[i];
          elTipLines.appendChild(ln);
        }
        elTip.classList.remove('hidden');
      }
      var off = D.ui.tipOffsetPx, w = elTip.offsetWidth, hgt = elTip.offsetHeight;
      var x = tip.x + off, y = tip.y + off;
      if (x + w > global.innerWidth - 6) x = tip.x - off - w;
      if (y + hgt > global.innerHeight - 6) y = tip.y - off - hgt;
      elTip.style.left = Math.max(6, x) + 'px';
      elTip.style.top = Math.max(6, y) + 'px';
    }
    document.addEventListener('pointermove', function (e) {
      var r = elField.getBoundingClientRect();
      lastPt = { x: e.clientX, y: e.clientY, target: e.target, inField: e.pointerType !== 'touch' && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom };
      tipFromEvent(e);
    });
    document.documentElement.addEventListener('pointerleave', function () { lastPt = null; });
    document.addEventListener('pointerdown', function () { tip = null; hideTip(); });
    document.addEventListener('pointerleave', function () { tip = null; hideTip(); });

    function renderInventory() {
      var S = game.state, i, parts = [], cap = game.capacity();
      for (i = 0; i < S.inv.length; i++) parts.push(S.inv[i].id + ':' + S.inv[i].type + (S.inv[i].read ? 'r' : ''));
      var sig = parts.join(',') + '|' + (invDrag && invDrag.moved ? invDrag.id : '') + '|' + cap;
      if (sig === invSig) return;
      invSig = sig;
      elInvCount.textContent = S.inv.length + '/' + cap;
      elInv.classList.toggle('full', game.invFull());
      if (invSlotEls.length !== cap) {                     // карманы и пакет с ручками добавляют места: больше шести — в два ряда
        elInvSlots.innerHTML = '';
        invSlotEls = [];
        for (i = 0; i < cap; i++) { var ns = document.createElement('div'); ns.className = 'inv-slot'; elInvSlots.appendChild(ns); invSlotEls.push(ns); }
        elInvSlots.classList.toggle('many', cap > D.inventory.slots);
        elInvSlots.style.setProperty('--inv-cols', String(cap > D.inventory.slots ? Math.ceil(cap / 2) : cap));
      }
      for (i = 0; i < invSlotEls.length; i++) {
        var slot = invSlotEls[i], it = S.inv[i];
        slot.innerHTML = '';
        if (!it) continue;
        var def = D.items[it.type];
        var el = document.createElement('div');
        el.className = 'inv-item' + (def.use || def.wear ? ' usable' : '') + (it.read ? ' read' : '');
        el.dataset.id = String(it.id);
        el.dataset.type = it.type;            // тип предмета — по нему art.js подставляет спрайт
        if (invDrag && invDrag.moved && invDrag.id === it.id) el.classList.add('lifting');
        var e = document.createElement('span');
        e.className = 'inv-emoji';
        e.textContent = def.emoji;
        var l = document.createElement('span');
        l.className = 'inv-label';
        l.textContent = def.short || def.name;             // в пакете — короткое имя, полное — в подсказке
        el.appendChild(e);
        el.appendChild(l);
        slot.appendChild(el);
      }
    }

    /* правка 022: заначка в лежбище. Клик по вещи — забрать в пакет; положить — перетащить вещь из пакета на картонку */
    function renderStash() {
      if (!elStash) return;
      var S = game.state, on = game.stashReady(), cap = game.stashCap();
      var sig = on ? cap + '|' + S.den.stash.map(function (q) { return q.id + ':' + q.type + (q.read ? 'r' : ''); }).join(',') + '|' + (invDrag && invDrag.moved ? 1 : 0) : '';
      if (sig === stashSig) return;
      stashSig = sig;
      elStash.classList.toggle('hidden', !on);
      elStash.classList.toggle('drop', !!(on && invDrag && invDrag.moved));
      if (!on) return;
      var P = D.places.den;
      elStash.style.right = ((1 - P.x) * 100) + '%';
      elStash.style.top = ((P.y + 0.10) * 100) + '%';
      var box = elStash.children[1];
      box.innerHTML = '';
      for (var i = 0; i < cap; i++) {
        var slot = document.createElement('div'), it = S.den.stash[i];
        slot.className = 'inv-slot';
        if (it) {
          var def = D.items[it.type], el = document.createElement('div');
          el.className = 'inv-item usable' + (it.read ? ' read' : '');
          el.dataset.id = String(it.id); el.dataset.type = it.type;
          el.innerHTML = '<span class="inv-emoji"></span><span class="inv-label"></span>';
          el.children[0].textContent = def.emoji;
          el.children[1].textContent = def.short || def.name;
          slot.appendChild(el);
        }
        box.appendChild(slot);
      }
    }

    function anchorPos(a) {
      var S = game.state;
      if (a.kind === 'place') return { x: D.places[a.id].x, y: D.places[a.id].y };
      if (a.kind === 'hero') return { x: S.hero.x, y: S.hero.y };
      if (a.kind === 'item') { var it = game.findItem(a.id); return it ? { x: it.x, y: it.y } : null; }
      if (a.kind === 'npc') { var n = game.findNpc(a.id); return n ? { x: n.x, y: n.y } : null; }
      return null;
    }

    function dialogueSkillBars(name, skill, gained, levels) {
      if (!gained) return '';
      var ui = D.ui.dialogue, before = skill.xp - gained;
      var html = '<div class="dialogue-xp"><div class="dialogue-xp-heading"><strong>' + esc(name) +
        '</strong><b>' + esc(ui.experience) + ' +' + gained + '</b></div>';
      // Завершённая шкала остаётся видна рядом с остатком опыта на новом уровне.
      for (var level = 1; level < levels.length; level++) {
        var floor = levels[level - 1], threshold = levels[level];
        if (before >= threshold || skill.xp < floor) continue;
        var capacity = threshold - floor, previous = Math.max(0, before - floor);
        var current = Math.min(capacity, skill.xp - floor);
        var interval = ui.level + ' ' + level + ' → ' + (level + 1);
        html += '<div class="dialogue-xp-labels"><span>' + esc(interval) + '</span><span>' + current + ' / ' + capacity +
          '</span></div><div class="dialogue-xp-track" role="progressbar" aria-label="' + esc(name + ' · ' + interval) +
          '" aria-valuemin="0" aria-valuenow="' + current + '" aria-valuemax="' + capacity + '">' +
          '<span class="dialogue-xp-before" style="width:' + (100 * previous / capacity) + '%"></span>' +
          '<span class="dialogue-xp-gain" style="width:' + (100 * (current - previous) / capacity) + '%"></span></div>';
      }
      if (skill.nextLevelXp === null) {
        html += '<div class="dialogue-xp-labels">' + esc(ui.maxLevel) + ' · ' + skill.level + '</div>';
      }
      return html + '</div>';
    }

    function dialoguePercent(chance) {
      if (chance > 0 && chance < .001) return '<0,1%';
      if (chance < 1 && chance > .999) return '>99,9%';
      return (chance * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + '%';
    }

    function renderDialogue() {
      if (!started || game.state.over || (!game.state.begging.dialog && dialogueResult.hidden) || gameMenuOpen || slotMode) {
        if (dialoguePanel.open) dialoguePanel.close();
        dialogueSig = '';
        return;
      }
      if (!dialogueResult.hidden) return;
      var state = game.state.begging, sig = [state.dialog.npcId, state.dialog.used, state.dialog.question, state.xp, state.socialXp].join('|');
      if (sig === dialogueSig) return;
      var view = game.begView();
      dialogueSig = sig;
      var ui = D.ui.dialogue;
      $('dialogue-context').textContent = ui.context;
      $('dialogue-title').textContent = view.name;
      $('dialogue-observation').textContent = view.observation;
      var rows = { student: 0, worker: 3, coat: 6, fat: 9, drunk: 12, granny: 15 };
      dialoguePanel.style.setProperty('--portrait-row', ((rows[view.kind] || 0) * 100 / 21) + '%');
      var feedback = $('dialogue-feedback');
      if (view.exchange) {
        feedback.innerHTML = '<strong>' + esc(D.hero.name) + '</strong> — ' + esc(view.exchange.line) +
          '<br><strong>' + esc(view.name) + '</strong> — ' + esc(view.exchange.reply);
        if (view.feedback !== view.exchange.reply) {
          feedback.innerHTML += '<br><strong>' + esc(view.name) + '</strong> — ' + esc(view.feedback);
        }
      } else feedback.textContent = view.feedback;
      var outcome = view.lastOutcome, summary = '';
      if (outcome) {
        var before = dialoguePercent(outcome.before), after = dialoguePercent(outcome.after);
        summary = (outcome.ok ? ui.moodYes : ui.moodNo) + ' · ' + ui.helpChance + ' ' +
          (before === after ? '' : before + ' → ') + after;
      }
      $('dialogue-outcome').textContent = summary;
      var endings = { ask: 1, goodbye: 2 };
      var cards = view.cards.sort(function (a, b) { return (endings[a.id] || 0) - (endings[b.id] || 0); });
      dialogueCards.innerHTML = cards.map(function (card) {
        var odds = '';
        if (card.enabled && card.chance != null) {
          odds = '<span class="dialogue-odds">' + esc(card.id === 'ask' ? ui.helpChance : ui.chance) +
            ' ' + esc(dialoguePercent(card.chance)) + '</span>';
        }
        var description = card.description;
        if (card.id === 'ask' && view.kind === 'granny') {
          description = ui.moneyOdds + ' ' + dialoguePercent(view.moneyChance) + ' · ' + ui.foodOdds + ' ' + dialoguePercent(view.foodChance);
        }
        return '<button type="button" data-dialogue-card="' + esc(card.id) + '"' + (card.enabled ? '' : ' disabled') +
          '><strong>' + esc(card.label) + '</strong>' + (card.line ? '<small>' + esc(card.line) + '</small>' : '') +
          '<small>' + esc(description) + '</small>' + odds + '</button>';
      }).join('');
      if (!dialoguePanel.open) {
        dialogueResult.hidden = true;
        endInvDrag(); keysDown = {}; game.setMoveDir(0, 0);
        tip = null; hideTip();
        dialoguePanel.showModal();
        $('dialogue-title').focus({ preventScroll: true });
      } else {
        $('dialogue-feedback').focus({ preventScroll: true });
      }
    }

    function chooseDialogueCard(id) {
      var result = game.playBegCard(id);
      if (result && typeof result === 'object') {
        var ui = D.ui.dialogue;
        var summary = $('dialogue-exchange');
        if (result.exchange) {
          summary.innerHTML = '<b>' + esc(D.hero.name) + '</b> — ' + esc(result.exchange.line) +
            '<br><b>' + esc(result.exchange.name) + '</b> — ' + esc(result.exchange.reply) +
            (result.text ? '<br><b>' + esc(result.text) + '</b>' : '');
        } else summary.textContent = result.text;
        $('dialogue-growth').innerHTML =
          dialogueSkillBars(ui.social, result.skills.social, result.socialGain, D.begging.socialLevels) +
          dialogueSkillBars(ui.skill, result.skills.begging, result.xpGain, D.begging.levels);
        $('dialogue-unlocked').textContent = result.unlocked.length ? ui.unlocked + ' «' + result.unlocked.join('», «') + '»' : '';
        dialogueResult.hidden = false;
        $('dialogue-context').textContent = ui.resultTitle;
        dialoguePanel.scrollTop = 0;
        $('dialogue-result-close').focus({ preventScroll: true });
      }
      render();
    }
    function closeDialogueResult() {
      dialogueResult.hidden = true;
      dialoguePanel.close();
      dialogueSig = '';
    }
    $('dialogue-result-close').addEventListener('click', closeDialogueResult);
    dialoguePanel.addEventListener('click', function (e) {
      if (dialogueResult.hidden || e.target !== dialoguePanel) return;
      var box = dialoguePanel.getBoundingClientRect();
      if (e.clientX < box.left || e.clientX >= box.right || e.clientY < box.top || e.clientY >= box.bottom) closeDialogueResult();
    });
    dialoguePanel.addEventListener('cancel', function (e) {
      e.preventDefault();
      if (dialogueResult.hidden) chooseDialogueCard('goodbye');
      else closeDialogueResult();
    });
    dialogueCards.addEventListener('click', function (e) {
      var card = e.target.closest('button[data-dialogue-card]');
      if (card && !card.disabled && dialoguePanel.open) chooseDialogueCard(card.dataset.dialogueCard);
    });

    function showEnd() {
      var S = game.state, o = S.over, E = D.endTexts;
      endShown = true;
      onOver();
      endInvDrag();
      keysDown = {};
      var dayLen = D.time.cycleSeconds;                   // «прожил N суток» считаем от начала игры, а не от рассвета
      var full = Math.floor(o.total / dayLen);
      var rest = o.total - full * dayLen;
      elEnd.classList.toggle('win', o.win);
      elEnd.classList.toggle('lose', !o.win);
      if (o.win) {
        elEndTitle.textContent = E.winTitle;
        elEndCause.textContent = E.winText;
        elEndLived.textContent = 'Прожил: ' + D.time.days + ' суток из ' + D.time.days;
      } else {
        elEndTitle.textContent = E.loseTitle;
        elEndCause.textContent = E.causes[o.cause] || E.causes.other;
        elEndLived.textContent = 'Прожил: ' + full + ' сут. ' + fmtTime(rest) + ' из ' + D.time.days + ' суток' +
          ' (умер: ' + phaseName(o.phase) + ', ' + fmtTime(o.phaseTime) + ' от её начала)';
      }
      elEnd.classList.remove('hidden');
    }

    /* ---------- управление кликом: герой идёт к тому, по чему кликнули ----------
       (чтобы убрать этот способ — удалить этот обработчик; ходьба и клавиатура останутся) */
    elField.addEventListener('click', function (e) {
      if (!game || game.state.over || !started || invDrag) return;      // на паузе клик принимается: приказ выполнится, когда пауза снимется
      var t = e.target;
      if (t.closest && t.closest('.sleep-btn, #shop-menu, #stash')) return;
      if (game.state.menuOpen) { game.closeMenu(); render(); return; }  // клик мимо открытого меню — только закрыть его, бомж стоит где стоял
      var el = directTile(t, e.clientX, e.clientY);
      /* Прямой клик по предмету или менту — как раньше. Всё остальное сначала отдаём зоне прохожего: ближайший к курсору. */
      if (el && !el.classList.contains('walker') && el.dataset.kind !== 'hero') { game.order({ kind: el.dataset.kind, id: parseInt(el.dataset.id, 10) }); render(); return; }
      var pk = pickAt(e.clientX, e.clientY);
      if (pk && pk.kind === 'npc') { game.order({ kind: 'npc', id: pk.n.id }); render(); return; }
      if (el && el.dataset.kind === 'hero') return;                    // клик по самому герою ничего не делает (даже внутри плашки места)
      if (pk && pk.kind === 'place') { game.order({ kind: 'place', id: pk.id }); render(); return; }     // в том числе когда человек стоит у самой двери, а целились в дверь
      if (el) { game.order({ kind: el.dataset.kind, id: parseInt(el.dataset.id, 10) }); render(); return; }     // уже просивший: подойти к нему
      var r = elField.getBoundingClientRect();
      game.order(null, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      render();
    });

    /* ---------- пакет: клик — употребить, вытащить на поле — выложить ---------- */
    function endInvDrag() {
      if (!invDrag) return;
      if (invDrag.ghost && invDrag.ghost.parentNode) invDrag.ghost.parentNode.removeChild(invDrag.ghost);
      try { elInvSlots.releasePointerCapture(invDrag.pid); } catch (err) { /* уже отпущен */ }
      invDrag = null;
      invSig = null;
    }
    function invFieldPos(e) {
      var r = elField.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, inside: inside };
    }
    elInvSlots.addEventListener('pointerdown', function (e) {
      if (invDrag || !game || game.state.over) return;
      if (e.button !== undefined && e.button !== 0) return;
      var el = e.target.closest ? e.target.closest('.inv-item') : null;
      if (!el) return;
      invDrag = { id: parseInt(el.dataset.id, 10), pid: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, ghost: null };
      try { elInvSlots.setPointerCapture(e.pointerId); } catch (err) { /* не критично */ }
      e.preventDefault();
    });
    document.addEventListener('pointermove', function (e) {
      if (!invDrag || e.pointerId !== invDrag.pid) return;
      if (!invDrag.moved) {
        var dx = e.clientX - invDrag.sx, dy = e.clientY - invDrag.sy;
        if (dx * dx + dy * dy < D.ui.dragThresholdPx * D.ui.dragThresholdPx) return;
        var S = game.state, it = null;
        for (var i = 0; i < S.inv.length; i++) if (S.inv[i].id === invDrag.id) it = S.inv[i];
        if (!it) { endInvDrag(); return; }
        invDrag.moved = true;
        var g = document.createElement('div');
        g.className = 'tile item drag-ghost item-' + it.type;   // item-<тип> — по нему art.js подставляет спрайт
        g.innerHTML = '<span class="tile-emoji"></span><span class="tile-label"></span>';
        g.children[0].textContent = D.items[it.type].emoji;
        g.children[1].textContent = game.itemName(it);
        $('game').appendChild(g);
        invDrag.ghost = g;
      }
      invDrag.ghost.style.left = e.clientX + 'px';
      invDrag.ghost.style.top = e.clientY + 'px';
      invDrag.ghost.classList.toggle('cancel', !invFieldPos(e).inside);
      render();
      e.preventDefault();
    });
    document.addEventListener('pointerup', function (e) {
      if (!invDrag || e.pointerId !== invDrag.pid) return;
      var d = invDrag;
      if (!d.moved) {
        endInvDrag();
        game.useInv(d.id);
      } else {
        var p = invFieldPos(e), sr = elStash && !elStash.classList.contains('hidden') ? elStash.getBoundingClientRect() : null;
        endInvDrag();
        if (sr && e.clientX >= sr.left && e.clientX <= sr.right && e.clientY >= sr.top && e.clientY <= sr.bottom) game.stashPut(d.id);   // правка 022: на картонку заначки — в заначку
        else if (p.inside) game.dropFromInv(d.id);          // куда бы ни отпустили — предмет ложится у ног героя
      }
      render();
    });
    /* правка 022: клик по вещи в заначке — забрать в пакет */
    elStash.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!game || game.state.over) return;
      var el = e.target.closest ? e.target.closest('.inv-item') : null;
      if (el) { game.stashTake(parseInt(el.dataset.id, 10)); render(); }
    });
    document.addEventListener('pointercancel', function (e) {
      if (!invDrag || e.pointerId !== invDrag.pid) return;
      endInvDrag();
      render();
    });

    /* ---------- управление клавиатурой: WASD/стрелки — идти, E — действие, Z — сон ----------
       (чтобы убрать этот способ — удалить MOVE_KEYS/applyMoveKeys и ветки KeyE/KeyZ ниже) */
    var MOVE_KEYS = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
    function applyMoveKeys() {
      var dx = 0, dy = 0;
      for (var k in keysDown) { dx += MOVE_KEYS[k][0]; dy += MOVE_KEYS[k][1]; }
      game.setMoveDir(Math.max(-1, Math.min(1, dx)), Math.max(-1, Math.min(1, dy)));
    }

    /* ---------- управление ---------- */
    elPauseBtn.addEventListener('click', function () {
      if (game.state.over) return;
      setPaused(!paused, 'button');
      elPauseBtn.blur();
    });
    document.addEventListener('keydown', function (e) {
      if (gameMenuOpen || slotMode || !started || game.state.over || document.querySelector('dialog[open]')) return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (!e.repeat && !game.state.over) setPaused(!paused, 'key');
        return;
      }
      if (e.code === 'Escape' && game.state.menuOpen) { e.preventDefault(); game.closeMenu(); render(); return; }
      if (e.code === 'Escape' && !e.repeat) { e.preventDefault(); openGameMenu(); return; }
      if (MOVE_KEYS[e.code]) {
        e.preventDefault();
        if (!keysDown[e.code]) { keysDown[e.code] = true; applyMoveKeys(); }
        return;
      }
      if (e.code === 'KeyE' && !e.repeat) { e.preventDefault(); game.act(); render(); return; }      // E и русская У — одна клавиша
      if (e.code === 'KeyZ' && !e.repeat) { e.preventDefault(); game.toggleSleep(); render(); return; }   // Z и русская Я
      var m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || '');
      var idx = m ? parseInt(m[1], 10) - 1 : -1;
      if (idx >= 0 && idx < D.speed.options.length && !e.repeat) {
        e.preventDefault();
        chooseSpeed(D.speed.options[idx]);
      }
    });
    document.addEventListener('keyup', function (e) {
      if (MOVE_KEYS[e.code] && keysDown[e.code]) { delete keysDown[e.code]; applyMoveKeys(); }
    });
    /* Окно потеряло фокус или вкладка скрыта — пауза. Возврат паузу НЕ снимает: игрок снимает её сам. */
    function awayPause() {
      if (menuWasRunning) {
        menuWasRunning = false;
        awayPaused = true;
        setPaused(true, 'away');
      }
      if (!game || !started || game.state.over || paused) return;       // не начата, кончилась или уже на паузе — не трогаем
      awayPaused = true;
      setPaused(true, 'away');
    }
    global.addEventListener('blur', function () { if (game && started) game.recEvent('blur', { hidden: document.hidden ? 1 : 0 }); keysDown = {}; if (game) game.setMoveDir(0, 0); awayPause(); flushRec(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) { if (game && started) game.recEvent('blur', { hidden: 1 }); keysDown = {}; if (game) game.setMoveDir(0, 0); awayPause(); persistOnExit(); } });
    elRestart.addEventListener('click', function () { newGame(); });
    global.addEventListener('resize', function () { fieldSize(); render(); });

    var RD = D.record, RK = RD.keys;
    var store = { flushed: 0, lastTs: 0, broken: false, lastAutoState: null, overDone: false, lastPhase: 0 };
    function lsGet(k) { try { return global.localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet(k, v) { try { global.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
    function lsDel(k) { try { global.localStorage.removeItem(k); } catch (e) { /* нет хранилища */ } }
    function lsJson(k) { try { return JSON.parse(lsGet(k)); } catch (e) { return null; } }
    function recIndex() { var l = lsJson(RK.index); return Array.isArray(l) ? l : []; }
    function runKey(id, part) { return RK.run + id + '.' + part; }
    function dropRun(id) {
      var m = lsJson(runKey(id, 'h')), n = m && m.chunks ? m.chunks : 0, i;
      for (i = 0; i < Math.max(n, 1) + 2; i++) lsDel(runKey(id, 'c' + i));
      lsDel(runKey(id, 'h'));
      var l = recIndex().filter(function (r) { return r.id !== id; });
      lsSet(RK.index, JSON.stringify(l));
    }
    function curId() { return game && game.rec ? game.rec.head.id : null; }
    function evictOldest() {
      var l = recIndex(), cur = curId();
      for (var i = l.length - 1; i >= 0; i--) if (l[i].id !== cur) { dropRun(l[i].id); return true; }
      return false;
    }
    function putRetry(k, v) {
      for (var i = 0; i <= RD.keepRuns + 1; i++) {
        if (lsSet(k, v)) return true;
        if (!evictOldest()) return false;
      }
      return false;
    }
    /* Сбросить запись в хранилище: переписываются только куски, где появились новые события, и шапка */
    function flushRec() {
      if (!game || !game.rec || !started || store.broken || !RD.on) return;
      var R = game.rec, id = R.head.id, CH = RD.chunk, n = R.events.length, ok = true, c;
      var from = Math.floor(store.flushed / CH), to = Math.floor(Math.max(0, n - 1) / CH);
      for (c = from; c <= to && ok; c++) ok = putRetry(runKey(id, 'c' + c), JSON.stringify(R.events.slice(c * CH, (c + 1) * CH)));
      var f = game.recFile();
      if (ok) ok = putRetry(runKey(id, 'h'), JSON.stringify({ head: f.head, lost: f.lost, end: f.end, tele: f.tele, chunks: to + 1, n: n }));
      if (!ok) { store.broken = true; return; }
      store.flushed = n;
      var l = recIndex().filter(function (r) { return r.id !== id; });
      l.unshift({ id: id, started: f.head.started, day: f.head.day, end: f.end, n: n });
      while (l.length > RD.keepRuns) { var old = l.pop(); dropRun(old.id); }
      lsSet(RK.index, JSON.stringify(l));
    }
    function readRun(id) {
      var m = lsJson(runKey(id, 'h'));
      if (!m) return null;
      var evs = [];
      for (var c = 0; c < m.chunks; c++) { var part = lsJson(runKey(id, 'c' + c)); if (part) evs = evs.concat(part); }
      return { format: RD.format, formatVersion: RD.formatVersion, head: m.head, events: evs.slice(0, m.n), lost: m.lost || [], end: m.end, tele: m.tele };
    }
    /* Старый ключ сохраняет роль автослота. Каждая ручная ячейка записывается целиком одним setItem. */
    function slotKey(id) { return id === 'auto' ? RK.save : RK.save + '.' + id; }
    function slotName(id) { return id === 'auto' ? 'Автосохранение' : 'Ячейка ' + id; }
    function readSlot(id) {
      var raw, sv;
      try { raw = global.localStorage.getItem(slotKey(id)); }
      catch (e) { return { error: 'Хранилище браузера недоступно', blocked: true }; }
      if (raw === null) return {};
      try { sv = JSON.parse(raw); } catch (e) { /* покажем повреждённую ячейку */ }
      if (!sv || sv.kind !== 'bomzh-save') return { error: 'Повреждённая запись' };
      if (sv.build !== D.build || sv.formatVersion !== D.save.formatVersion) return { error: 'Другая версия игры' };
      var s = sv.S;
      if (!s || !s.hero || !s.weather || !s.den || !s.worn || !s.tele ||
          !Array.isArray(s.inv) || !Array.isArray(s.items) || !Array.isArray(s.npcs) ||
          !Number.isInteger(s.phase) || !Number.isFinite(s.phaseTime) || !Number.isInteger(sv.nextId) ||
          (sv.rec && (!sv.rec.head || !sv.rec.head.id || !sv.rec.w || !Number.isInteger(sv.rec.n))) ||
          (id !== 'auto' && sv.rec && (!sv.history || !Array.isArray(sv.history.events) || sv.history.events.length !== sv.rec.n))) {
        return { error: 'Повреждённая запись' };
      }
      return { save: sv };
    }
    function writeSave() {
      if (!D.save.on || !started || !game || game.state.over || game.state.total <= 0 || slotMode === 'load') return;
      var state = JSON.stringify(Object.assign({}, game.state, { sfx: [] }));
      if (state === store.lastAutoState) return;
      var sv = game.saveState();
      flushRec();
      if (putRetry(RK.save, JSON.stringify(sv))) store.lastAutoState = state;
    }
    function persistOnExit() {
      writeSave();
      if (game && game.rec && game.rec.events.length !== store.flushed) flushRec();
    }
    function onOver() {
      if (store.overDone) return;
      store.overDone = true;
      flushRec();
      if (!D.save.keepAfterDeath) {
        var auto = readSlot('auto').save;
        if (auto && auto.rec && auto.rec.head.id === curId()) lsDel(RK.save);
      }
    }
    /* Продолжить сохранённый забег: игра пересоздаётся и встаёт на паузу. Хвост записи после сохранения уходит в lost. */
    function continueGame(sv, manual) {
      flushRec();
      var m = !manual && sv.rec ? lsJson(runKey(sv.rec.head.id, 'h')) : null;
      var stored = manual ? sv.history : (sv.rec ? readRun(sv.rec.head.id) : null);
      if (!newGame(sv, stored, manual)) return false;
      if (sv.rec && m && m.chunks) for (var c = Math.floor(sv.rec.n / RD.chunk) + 1; c < m.chunks; c++) lsDel(runKey(sv.rec.head.id, 'c' + c));
      if (!manual) store.flushed = Math.min(game.rec ? game.rec.events.length : 0, Math.floor((sv.rec ? sv.rec.n : 0) / RD.chunk) * RD.chunk);
      started = true;
      elStart.classList.add('hidden');
      flushRec();
      game.note('saveLoaded');
      setPaused(true, 'load');
      render();
      return true;
    }

    var gameMenu = $('game-menu-modal'), menuBtn = $('game-menu-btn'), resumeBtn = $('game-menu-resume');
    var gameMenuOpen = false, menuWasRunning = false;
    function focusAfterLayout(button) { queueMicrotask(function () { button.focus(); }); }
    function openGameMenu() {
      if (!started || game.state.over || gameMenuOpen || slotMode || document.querySelector('dialog[open]')) return;
      gameMenuOpen = true;
      menuWasRunning = !paused;
      if (menuWasRunning) setPaused(true, 'menu');
      keysDown = {};
      game.setMoveDir(0, 0);
      gameMenu.classList.remove('hidden');
      focusAfterLayout(resumeBtn);
    }
    function closeGameMenu(loaded) {
      if (!gameMenuOpen) return;
      gameMenuOpen = false;
      gameMenu.classList.add('hidden');
      if (menuWasRunning && !loaded && !document.hidden && !awayPaused) setPaused(false, 'menu');
      menuWasRunning = false;
      if (!loaded) focusAfterLayout(menuBtn);
    }
    menuBtn.addEventListener('click', openGameMenu);
    resumeBtn.addEventListener('click', function () { closeGameMenu(false); });
    gameMenu.addEventListener('click', function (e) { if (e.target === gameMenu) closeGameMenu(false); });

    var slotModal = $('save-modal'), slotList = $('save-list'), slotStatus = $('save-status');
    var slotMode = '', slotOpener = null, slotConfirm = null;
    function openSlots(mode, opener) {
      if (slotMode || (mode === 'save' && (!started || game.state.over))) return;
      slotMode = mode; slotOpener = opener; slotConfirm = null;
      if (started && Object.keys(keysDown).length) { keysDown = {}; game.setMoveDir(0, 0); }
      $('save-title').textContent = mode === 'save' ? 'Сохранить игру' : 'Загрузить игру';
      slotStatus.textContent = '';
      slotModal.classList.remove('hidden');
      drawSlots();
      focusAfterLayout(slotList.querySelector('button:not(:disabled)') || $('save-close'));
    }
    function closeSlots(loaded) {
      slotModal.classList.add('hidden');
      slotMode = ''; slotConfirm = null;
      if (loaded) closeGameMenu(true);
      focusAfterLayout(loaded ? elPauseBtn : slotOpener);
      slotOpener = null;
    }
    function drawSlots() {
      slotList.textContent = '';
      var ids = slotMode === 'load' ? ['auto'] : [], any = false, errors = false;
      for (var i = 1; i <= D.save.manualSlots; i++) ids.push(String(i));
      ids.forEach(function (id) {
        var entry = readSlot(id), b = document.createElement('button'), sv = entry.save;
        b.type = 'button'; b.className = 'save-slot'; b.dataset.slot = id;
        var detail = entry.error || 'Пусто';
        if (sv) {
          any = true;
          detail = 'Сутки ' + sv.day + ', ' + sv.hour + ' · ' + new Date(sv.savedAt).toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
        }
        if (entry.error) errors = true;
        b.textContent = slotName(id) + ' — ' + detail;
        b.disabled = !!entry.blocked || (slotMode === 'load' && !sv);
        slotList.appendChild(b);
      });
      if (slotMode === 'load' && !any) slotStatus.textContent = errors ? 'Доступных сохранений нет.' : 'Сохранений пока нет.';
    }
    function chooseSlot(id) {
      var entry = readSlot(id), sv = entry.save, saving = slotMode === 'save';
      if (entry.blocked || (!saving && !sv)) { drawSlots(); slotStatus.textContent = entry.error || 'Ячейка пуста.'; return; }
      // Привязываем согласие к снимку: если другая вкладка успела сохранить, подтверждение понадобится заново.
      var revision = sv ? sv.savedAt : entry.error;
      if ((saving ? sv || entry.error : started && !game.state.over) &&
          (!slotConfirm || slotConfirm.id !== id || slotConfirm.revision !== revision)) {
        slotConfirm = { id: id, revision: revision };
        slotStatus.textContent = saving ? 'Ещё раз нажмите «' + slotName(id) + '», чтобы заменить сохранение.' :
          'Текущий прогресс после сохранения будет потерян. Нажмите «' + slotName(id) + '» ещё раз, чтобы загрузить.';
        return;
      }
      slotConfirm = null;
      if (!saving) {
        if (continueGame(sv, id !== 'auto')) closeSlots(true);
        else slotStatus.textContent = 'Не удалось прочитать состояние игры.';
        return;
      }
      var snapshot = game.saveState();
      if (game.rec) snapshot.history = { events: game.rec.events, lost: game.rec.lost };
      if (!lsSet(slotKey(id), JSON.stringify(snapshot))) {
        slotStatus.textContent = 'Не удалось сохранить игру. Проверьте свободное место и доступ к хранилищу браузера.';
        return;
      }
      flushRec();
      drawSlots();
      slotStatus.textContent = 'Игра сохранена. ' + slotName(id) + '.';
      slotList.querySelector('[data-slot="' + id + '"]').focus();
    }
    $('manual-save-btn').addEventListener('click', function () { openSlots('save', this); });
    $('manual-load-btn').addEventListener('click', function () { openSlots('load', this); });
    $('end-load-btn').addEventListener('click', function () { openSlots('load', this); });
    $('save-close').addEventListener('click', function () { closeSlots(false); });
    slotList.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-slot]');
      if (b && !b.disabled) chooseSlot(b.dataset.slot);
    });
    slotModal.addEventListener('click', function (e) { if (e.target === slotModal) closeSlots(false); });
    document.addEventListener('keydown', function (e) {
      if (!slotMode && !gameMenuOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!e.repeat) {
          if (slotMode) closeSlots(false);
          else closeGameMenu(false);
        }
      }
      else if (e.key === 'Tab') {
        var buttons = (slotMode ? slotModal : gameMenu).querySelectorAll('button:not(:disabled)'), first = buttons[0], last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      e.stopImmediatePropagation();
    }, true);

    /* Кто отдаёт приказ — мышь или клавиатура, и на паузе ли (для записи). Ставится до любых обработчиков. */
    document.addEventListener('pointerdown', function () { if (game) game.setInput('mouse', paused); }, true);
    document.addEventListener('click', function () { if (game) game.setInput('mouse', paused); }, true);
    document.addEventListener('keydown', function (e) {
      if (game) game.setInput('key', paused);
    }, true);

    global.addEventListener('pagehide', persistOnExit);
    global.addEventListener('focus', function () { if (game && started) game.recEvent('focus'); });

    /* ---------- цикл ---------- */
    function frame(ts) {
      var dt = lastTs ? (ts - lastTs) / 1000 : 0;
      lastTs = ts;
      if (dt > D.ui.maxFrameDt) dt = D.ui.maxFrameDt;
      if (started && !paused && !game.state.over && !game.state.begging.dialog && dialogueResult.hidden && dt > 0) { game.advance(dt); game.noteWarnings(); }
      if (started && game.state.phase !== store.lastPhase) {
        store.lastPhase = game.state.phase;
        if (game.state.phase % 2 === 0 && !game.state.over) writeSave();
      }
      if (started && ts - store.lastTs > D.record.flushSec * 1000) { store.lastTs = ts; flushRec(); }
      /* звук: снимок состояния и события кадра (sound.js может отсутствовать) */
      var SS = game.state, evs = SS.sfx.splice(0, SS.sfx.length);
      if (global.BomzhSound && global.BomzhSound.available) {
        var hasFire = false;
        for (var fi = 0; fi < SS.items.length; fi++) if (SS.items[fi].type === 'fire') hasFire = true;
        global.BomzhSound.frame({
          paused: paused || !started || !!SS.begging.dialog || !dialogueResult.hidden, speed: SS.speed, night: game.isNight(),
          wind: SS.weather.wind, precip: SS.weather.precip, type: SS.weather.type,
          bus: SS.bus, listenerX: SS.hero.x, listenerY: SS.hero.y,
          walking: SS.hero.walking, walkSpeed: game.walkSpeed(), at: SS.hero.at,
          task: SS.hero.task ? SS.hero.task.kind : null, asleep: SS.hero.asleep,
          fire: hasFire, fireNear: hasFire && game.heat().parts.some(function (p) { return p.key === 'fire'; }),
          over: SS.over ? (SS.over.win ? 'win' : 'lose') : null
        }, evs);
      }
      render();
      global.requestAnimationFrame(frame);
    }

    buildStatic();
    buildClock();
    buildStartCard();
    newGame();
    global.requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI);
  else initUI();
})(typeof window !== 'undefined' ? window : globalThis);
