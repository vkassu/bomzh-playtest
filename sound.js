/* «Бомж» — звук. Всё синтезируется через Web Audio, файлов нет. Числа — в data.js (GAME_DATA.sound).
   На симуляцию не влияет: game.js раз в кадр отдаёт сюда снимок состояния и список событий.
   Нет Web Audio — игра работает молча. */
(function (global) {
  'use strict';
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('walk-preview')) return;

  var D = global.GAME_DATA, CFG = D && D.sound;
  var AC = global.AudioContext || global.webkitAudioContext;
  function noop() {}
  var api = {
    available: !!(AC && CFG), unlock: noop, frame: noop, setEnabled: noop, setVolume: noop,
    debug: function () { return { available: false }; }, renderOffline: null
  };
  global.BomzhSound = api;
  if (!api.available) return;

  function rnd(a, b) { return a + (b - a) * Math.random(); }
  function on(layer) { return CFG.layers[layer] !== false; }

  /* =====================================================================
   *  Движок: один и тот же для живого звука и для рендера в OfflineAudioContext
   * ===================================================================== */
  function Engine(ctx) {
    var E = this, sr = ctx.sampleRate, i;
    /* выход: общий уровень -> компрессор-лимитер -> запас по уровню */
    var master = ctx.createGain(); master.gain.value = CFG.master;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = CFG.limiter.threshold; comp.knee.value = CFG.limiter.knee; comp.ratio.value = CFG.limiter.ratio;
    comp.attack.value = CFG.limiter.attack; comp.release.value = CFG.limiter.release;
    var trim = ctx.createGain(); trim.gain.value = CFG.outputTrim;
    master.connect(comp); comp.connect(trim); trim.connect(ctx.destination);
    var user = ctx.createGain(); user.gain.value = 1; user.connect(master);          // громкость игрока и «вкладка скрыта»
    var amb = ctx.createGain(); amb.gain.value = 0;
    var ambLP = ctx.createBiquadFilter(); ambLP.type = 'lowpass'; ambLP.frequency.value = CFG.day.lowpass; ambLP.Q.value = 0.3;
    amb.connect(ambLP); ambLP.connect(user);
    var sfx = ctx.createGain(); sfx.gain.value = CFG.sfx; sfx.connect(user);
    var fireBus = ctx.createGain(); fireBus.gain.value = 0; fireBus.connect(sfx);

    /* шум: белый и «коричневый» */
    var white = ctx.createBuffer(1, sr * 2, sr), wd = white.getChannelData(0);
    for (i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    var brown = ctx.createBuffer(1, sr * 2, sr), bd = brown.getChannelData(0), last = 0;
    for (i = 0; i < bd.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; }
    function loop(buf) { var s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0); return s; }
    function chain(src, type, freq, q, dest) {
      var f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      var g = ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(dest);
      return { f: f, g: g };
    }
    var wSrc = loop(white), bSrc = loop(brown);
    var wind = chain(wSrc, 'bandpass', 400, 0.6, amb);          // тело ветра
    var low = chain(bSrc, 'lowpass', 260, 0.4, amb);             // низкий напор
    var howl = chain(wSrc, 'bandpass', 600, 11, amb);            // вой
    var howl2 = chain(wSrc, 'bandpass', 900, 14, amb);           // подвывание в метель
    var sleet = chain(wSrc, 'highpass', 3200, 0.5, amb);         // мокрый снег
    var hum = chain(bSrc, 'lowpass', CFG.hum.lowpass, 0.5, amb); // городской гул днём
    var roar = chain(bSrc, 'bandpass', 320, 0.5, fireBus);       // гул костра

    E.ctx = ctx; E.user = user;
    E.stats = { plays: {}, total: 0, skipped: 0 };
    var cur = { gain: 0, freq: 400, howl: 0, howlFreq: 600, lowp: CFG.day.lowpass, ambMult: 1 };
    var gust = { v: 0.3, target: 0.3, t: 0 }, gust2 = { v: 0.3, target: 0.5, t: 0 };
    var timers = { step: 0, rummage: 0.2, crackle: 0, splat: 0, sleet: 0, param: 0 };
    var lastPlay = {}, recent = [], stepFoot = 1, hadFire = false, lastOver = null;
    E.cur = cur;

    function set(param, v, tc) { param.setTargetAtTime(v, ctx.currentTime, tc || 0.25); }

    /* ---------- кирпичики ---------- */
    function envelope(g, t0, attack, dur, peak) {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    }
    function burst(o) {            // отрезок шума через фильтр
      var t0 = ctx.currentTime + (o.at || 0), s = ctx.createBufferSource();
      s.buffer = o.brown ? brown : white;
      var f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.freq, t0); f.Q.value = o.q || 0.8;
      if (o.slideTo) f.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + o.dur);
      var g = ctx.createGain(); envelope(g, t0, o.attack || 0.004, o.dur, o.peak);
      s.connect(f); f.connect(g); g.connect(o.dest || sfx);
      s.start(t0, Math.random() * 1.6, o.dur + 0.05);
    }
    function tone(o) {             // затухающий тон
      var t0 = ctx.currentTime + (o.at || 0), osc = ctx.createOscillator();
      osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.freq, t0);
      if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + o.dur);
      var g = ctx.createGain(); envelope(g, t0, o.attack || 0.005, o.dur, o.peak);
      var dest = o.dest || sfx;
      if (o.lowpass) { var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lowpass; osc.connect(f); f.connect(g); } else osc.connect(g);
      if (o.vibrato) { var l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vibrato.rate; lg.gain.value = o.vibrato.depth; l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t0 + o.dur + 0.05); }
      g.connect(dest);
      osc.start(t0); osc.stop(t0 + o.dur + 0.05);
    }

    /* ---------- звуки событий ---------- */
    var SFX = {
      step: function (d) {                               // хруст снега + глухой удар подошвы
        var k = (d && d.foot) || 1, p = 1 + 0.07 * k + rnd(-0.05, 0.05);
        burst({ freq: 1150 * p, q: 1.1, dur: 0.07, peak: 0.34 });
        burst({ freq: 1700 * p, q: 1.4, dur: 0.05, peak: 0.2, at: 0.035 });
        burst({ type: 'lowpass', freq: 210, dur: 0.07, peak: 0.42, brown: true });
      },
      crackle: function (d) { burst({ type: 'highpass', freq: rnd(1500, 3200), dur: rnd(0.012, 0.035), peak: rnd(0.12, 0.5) * ((d && d.k) || 1), attack: 0.001, dest: fireBus }); },
      rustle: function () { burst({ freq: rnd(700, 2300), q: 0.7, dur: rnd(0.1, 0.24), peak: rnd(0.14, 0.26), attack: 0.03 }); },
      clank: function () {
        var r = rnd(0.85, 1.2);
        [311, 523, 837].forEach(function (f, n) { tone({ freq: f * r, type: 'square', lowpass: 2600, dur: 0.16 - n * 0.03, peak: 0.07 }); });
        burst({ type: 'lowpass', freq: 400, dur: 0.09, peak: 0.3, brown: true });
      },
      pop: function () { tone({ freq: 310, slideTo: 560, dur: 0.1, peak: 0.26 }); },
      clink: function (d) { var a = (d && d.at) || 0; [2093, 3136, 4699].forEach(function (f, n) { tone({ freq: f * rnd(0.99, 1.01), dur: 0.3 - n * 0.06, peak: 0.17 - n * 0.045, attack: 0.002, at: a }); }); },
      tin: function (d) {
        var a = (d && d.at) || 0;
        [690, 1140, 1710].forEach(function (f, n) { tone({ freq: f, type: 'triangle', dur: 0.11, peak: 0.16 - n * 0.04, attack: 0.002, at: a }); });
        burst({ freq: 2600, q: 2, dur: 0.05, peak: 0.16, at: a });
      },
      paper: function () { burst({ freq: 900, q: 0.6, dur: 0.16, peak: 0.2, attack: 0.03 }); },
      coins: function (d) {
        var n = Math.max(2, Math.min(5, (d && d.count) || 3)), a = (d && d.at) || 0;
        for (var k = 0; k < n; k++) tone({ freq: rnd(3700, 5400), dur: 0.17, peak: 0.12, attack: 0.002, at: a + k * 0.075 + rnd(0, 0.02) });
      },
      bill: function () { burst({ freq: 3000, q: 0.6, dur: 0.2, peak: 0.2, attack: 0.05 }); burst({ freq: 2200, q: 0.6, dur: 0.16, peak: 0.16, attack: 0.04, at: 0.17 }); },
      deny: function () { tone({ freq: 150, slideTo: 104, type: 'triangle', dur: 0.24, peak: 0.26 }); },
      munch: function () { for (var k = 0; k < 3; k++) burst({ type: 'lowpass', freq: rnd(1000, 1500), dur: 0.07, peak: 0.26, at: k * 0.17 }); },
      glug: function () { for (var k = 0; k < 3; k++) tone({ freq: 240 + k * 35, slideTo: 420 + k * 50, dur: 0.085, peak: 0.24, at: k * 0.13 }); },
      register: function () { tone({ freq: 1568, dur: 0.22, peak: 0.12, attack: 0.002 }); tone({ freq: 2093, dur: 0.3, peak: 0.1, attack: 0.002, at: 0.09 }); },
      bus: function () {                        // автобус: низкий гул мотора и вздох дверей
        burst({ type: 'lowpass', freq: 150, slideTo: 95, dur: 1.5, peak: 0.24, attack: 0.45, brown: true });
        tone({ freq: 74, slideTo: 55, type: 'triangle', dur: 1.3, peak: 0.09, attack: 0.4 });
        burst({ type: 'highpass', freq: 2600, slideTo: 1400, dur: 0.35, peak: 0.07, attack: 0.05, at: 1.1 });
      },
      thud: function () { tone({ freq: 96, slideTo: 58, dur: 0.18, peak: 0.42 }); burst({ type: 'lowpass', freq: 300, dur: 0.1, peak: 0.26, brown: true }); },
      whistle: function () {
        tone({ freq: 2350, dur: 0.42, peak: 0.085, attack: 0.02, vibrato: { rate: 27, depth: 170 } });
        burst({ freq: 2400, q: 3, dur: 0.4, peak: 0.05, attack: 0.02 });
      },
      beeps: function () { [[1040, 0, 0.09], [1040, 0.15, 0.09], [830, 0.3, 0.16]].forEach(function (b) { tone({ freq: b[0], type: 'square', lowpass: 2800, dur: b[2], peak: 0.06, at: b[1] }); }); },
      chimeDay: function () { tone({ freq: 523.25, dur: 0.7, peak: 0.1 }); tone({ freq: 783.99, dur: 0.9, peak: 0.1, at: 0.22 }); tone({ freq: 1046.5, type: 'triangle', dur: 0.5, peak: 0.03, at: 0.22 }); },
      chimeNight: function () { tone({ freq: 392, dur: 0.8, peak: 0.1 }); tone({ freq: 261.63, dur: 1.1, peak: 0.11, at: 0.26 }); },
      sleep: function () { tone({ freq: 440, slideTo: 392, dur: 0.5, peak: 0.07, attack: 0.08 }); tone({ freq: 330, slideTo: 294, dur: 0.8, peak: 0.07, attack: 0.1, at: 0.3 }); },
      wake: function () { tone({ freq: 330, dur: 0.3, peak: 0.07, attack: 0.03 }); tone({ freq: 494, dur: 0.45, peak: 0.07, attack: 0.03, at: 0.16 }); },
      alarm: function () { [0, 0.2].forEach(function (a) { tone({ freq: 311, type: 'triangle', dur: 0.13, peak: 0.13, at: a }); tone({ freq: 330, type: 'triangle', dur: 0.13, peak: 0.13, at: a }); }); },
      win: function () { [523.25, 659.25, 783.99, 1046.5].forEach(function (f, n) { tone({ freq: f, dur: n === 3 ? 0.9 : 0.3, peak: 0.12, at: n * 0.17 }); tone({ freq: f / 2, type: 'triangle', dur: 0.3, peak: 0.05, at: n * 0.17 }); }); },
      lose: function () { [440, 349.23, 293.66, 220].forEach(function (f, n) { tone({ freq: f, type: 'triangle', dur: n === 3 ? 1.1 : 0.34, peak: 0.13, at: n * 0.24 }); }); },
      tick: function () { burst({ type: 'highpass', freq: 3200, dur: 0.014, peak: 0.16, attack: 0.001 }); },
      order: function () { burst({ freq: 1800, q: 2, dur: 0.02, peak: 0.07, attack: 0.001 }); },
      strike: function () { burst({ type: 'highpass', freq: 2200, slideTo: 5000, dur: 0.3, peak: 0.2, attack: 0.01 }); },
      whoosh: function () { burst({ type: 'lowpass', freq: 380, slideTo: 900, dur: 0.6, peak: 0.3, attack: 0.18, brown: true }); },
      hiss: function () { burst({ type: 'highpass', freq: 3600, slideTo: 1500, dur: 0.8, peak: 0.18, attack: 0.02 }); },
      splat: function () { burst({ type: 'lowpass', freq: rnd(500, 900), dur: 0.05, peak: rnd(0.05, 0.12), attack: 0.002, dest: amb }); }
    };

    /* Запуск с ограничением частоты: на ×4 события не сливаются в треск */
    function play(name, data) {
      var fn = SFX[name], now = ctx.currentTime;
      if (!fn) return false;
      var gap = CFG.minGap[name] !== undefined ? CFG.minGap[name] : CFG.minGap.default;
      while (recent.length && now - recent[0] > 1) recent.shift();
      if ((lastPlay[name] !== undefined && now - lastPlay[name] < gap) || (!CFG.unlimited[name] && recent.length >= CFG.maxPerSecond)) { E.stats.skipped++; return false; }
      lastPlay[name] = now;
      if (!CFG.unlimited[name]) recent.push(now);
      E.stats.plays[name] = (E.stats.plays[name] || 0) + 1; E.stats.total++;
      fn(data);
      return true;
    }
    E.play = play;

    /* События из игры: ключ строки лога -> звуки (таблица sound.map в data.js) */
    E.event = function (ev, paused) {
      if (paused || !on('events')) return;
      var names = CFG.map[ev.key];
      if (!names) return;
      for (var k = 0; k < names.length; k++) {
        var nm = names[k], data = null;
        if (nm === 'money') { nm = ev.n >= CFG.bigMoney ? 'bill' : 'coins'; data = { count: Math.round((ev.n || 5) / 3) }; }
        if ((nm === 'coins' || nm === 'clink' || nm === 'tin') && k > 0) data = Object.assign(data || {}, { at: 0.12 * k });
        play(nm, data);
      }
    };

    function drift(gs, dt, lo, hi) {             // медленный случайный порыв
      gs.t -= dt;
      if (gs.t <= 0) { gs.target = Math.random(); gs.target *= gs.target; gs.t = rnd(lo, hi); }
      gs.v += (gs.target - gs.v) * Math.min(1, dt * 0.9);
      return gs.v;
    }

    /* Раз в кадр: снимок состояния игры -> погодный фон, шаги, костёр, бак */
    E.tick = function (dt, s) {
      if (s.over) {
        if (s.over !== lastOver) {
          set(amb.gain, 0, 0.04);
          set(fireBus.gain, 0, 0.04);
          play(s.over);
        }
        lastOver = s.over;
        return;
      }
      lastOver = null;
      var W = CFG.wind[Math.min(2, s.wind || 0)], bl = s.type === 'blizzard';
      var k = Math.min(1, dt / (CFG.transitionSeconds / 3));           // смена погоды — плавно, за transitionSeconds
      var tg = W.gain * (bl ? CFG.blizzard.gainMult : 1), th = W.howl * (bl ? CFG.blizzard.howlMult : 1);
      cur.gain += (tg - cur.gain) * k; cur.freq += (W.freq - cur.freq) * k;
      cur.howl += (th - cur.howl) * k; cur.howlFreq += (W.howlFreq - cur.howlFreq) * k;
      var indoor = s.at === 'entrance';
      var lp = indoor ? CFG.indoor.lowpass : (s.night ? CFG.night.lowpass : CFG.day.lowpass);
      var am = (indoor ? CFG.indoor.gainMult : 1) * (s.night ? CFG.night.gainMult : 1) * (s.paused ? CFG.pause.ambienceMult : 1);
      cur.lowp = lp; cur.ambMult = am; cur.indoor = indoor;
      var g1 = drift(gust, dt, 1.5, 4.5), g2 = drift(gust2, dt, 0.8, 2.6);
      timers.param -= dt;
      if (timers.param <= 0) {
        timers.param = 0.06;
        var lvl = on('wind') ? cur.gain * (1 + W.gust * (g1 - 0.35)) : 0;
        set(wind.g.gain, Math.max(0, lvl), 0.3);
        set(low.g.gain, Math.max(0, lvl * 0.9), 0.4);
        set(wind.f.frequency, cur.freq * (0.75 + 0.6 * g1), 0.4);
        set(howl.g.gain, on('wind') ? cur.howl * (0.35 + 1.3 * g2) : 0, 0.35);
        set(howl.f.frequency, cur.howlFreq * (0.82 + 0.45 * g2), 0.5);
        set(howl2.g.gain, on('wind') && bl ? cur.howl * 0.6 * (0.3 + g1) : 0, 0.5);
        set(howl2.f.frequency, cur.howlFreq * 1.5 * (0.85 + 0.35 * g1), 0.7);
        set(amb.gain, CFG.ambience * am, 0.3);
        set(ambLP.frequency, lp, 0.35);
        set(hum.g.gain, on('hum') && !s.night ? CFG.hum.gain : 0, 1.2);
        set(sfx.gain, s.paused ? 0 : CFG.sfx, 0.08);
        var fireOn = on('fire') && s.fire && !s.paused;
        set(fireBus.gain, fireOn ? (s.fireNear ? 1 : CFG.fire.farMult) : 0, 0.3);
        set(roar.g.gain, CFG.fire.gain, 0.3);
      }
      var wet = on('sleet') && s.precip === 'sleet';
      timers.sleet -= dt;
      if (timers.sleet <= 0) { timers.sleet = 0.07; set(sleet.g.gain, wet ? CFG.sleet.gain * rnd(0.55, 1.3) : 0, wet ? 0.03 : 0.8); }
      if (wet) { timers.splat -= dt; if (timers.splat <= 0) { timers.splat = rnd(0.5, 1.5) / CFG.sleet.splatsPerSecond; play('splat'); } }
      if (s.paused) { hadFire = !!s.fire; return; }
      /* шаги: темп по скорости ходьбы, но не чаще steps.minInterval */
      if (on('steps') && s.walking) {
        timers.step -= dt;
        if (timers.step <= 0) {
          timers.step = Math.max(CFG.steps.minInterval, CFG.steps.stride / Math.max(0.01, s.walkSpeed * (s.speed || 1)));
          stepFoot = -stepFoot; play('step', { foot: stepFoot });
        }
      } else timers.step = Math.min(timers.step, 0.05);
      /* бак: шорох, изредка грохот */
      if (on('events') && s.task === 'search') {
        timers.rummage -= dt;
        if (timers.rummage <= 0) { timers.rummage = rnd(CFG.rummage.minGap, CFG.rummage.maxGap); play(Math.random() < CFG.rummage.clankChance ? 'clank' : 'rustle'); }
      }
      /* костёр: потрескивание, громче рядом */
      if (on('fire') && s.fire) {
        timers.crackle -= dt;
        if (timers.crackle <= 0) { timers.crackle = rnd(0.3, 1.8) / CFG.fire.cracklesPerSecond; play('crackle', { k: 1 }); }
      }
      hadFire = !!s.fire;
    };
  }

  /* =====================================================================
   *  Живой звук: включение по первому действию, кнопка, громкость, вкладка
   * ===================================================================== */
  var ctx = null, engine = null, lastT = 0, lastSnap = null;
  var prefs = { on: CFG.enabledByDefault, vol: CFG.volume };
  try {
    var saved = JSON.parse(global.localStorage.getItem(CFG.storageKey) || 'null');
    if (saved && typeof saved.vol === 'number') { prefs.on = !!saved.on; prefs.vol = Math.max(0, Math.min(1, saved.vol)); }
  } catch (e) { /* без хранилища — настройки по умолчанию */ }
  function save() { try { global.localStorage.setItem(CFG.storageKey, JSON.stringify(prefs)); } catch (e) { /* не страшно */ } }
  /* «Окно не активно»: вкладка скрыта ИЛИ окно потеряло фокус (Alt+Tab) — звук полностью молчит, включая погоду */
  var blurred = false;
  function away() { return !!document.hidden || blurred; }
  function applyLevel() {
    if (!engine) return;
    var v = prefs.on && !away() && lastSnap && !lastSnap.paused ? prefs.vol : 0;
    if (v) engine.user.gain.setTargetAtTime(v, ctx.currentTime, 0.08);
    else engine.user.gain.setValueAtTime(0, ctx.currentTime);
  }
  function unlock() {
    try {
      if (!ctx) { ctx = new AC(); engine = new Engine(ctx); applyLevel(); }
      if (ctx.state === 'suspended' && !away()) ctx.resume();
    } catch (e) { ctx = null; engine = null; }
  }
  function syncUi() {
    var b = document.getElementById('sound-btn'), r = document.getElementById('sound-vol');
    if (b) { b.classList.toggle('off', !prefs.on); b.dataset.state = prefs.on ? 'on' : 'off'; b.textContent = prefs.on ? CFG.ui.onEmoji : CFG.ui.offEmoji; b.setAttribute('aria-pressed', prefs.on ? 'true' : 'false'); }
    if (r) r.value = String(Math.round(prefs.vol * 100));
  }
  api.unlock = unlock;
  api.setEnabled = function (v) { prefs.on = !!v; save(); applyLevel(); syncUi(); if (prefs.on && engine && on('ui')) engine.play('tick'); };
  api.setVolume = function (v) { prefs.vol = Math.max(0, Math.min(1, v)); if (prefs.vol > 0 && !prefs.on) prefs.on = true; save(); applyLevel(); syncUi(); };
  api.frame = function (snap, events) {
    var pauseChanged = !lastSnap || lastSnap.paused !== snap.paused;
    lastSnap = snap;
    if (pauseChanged) applyLevel();
    if (!engine || ctx.state !== 'running' || away() || snap.paused) return;
    var now = ctx.currentTime, dt = Math.min(0.1, lastT ? now - lastT : 0.016);
    lastT = now;
    engine.tick(dt, snap);
    if (!snap.over) for (var i = 0; i < events.length; i++) engine.event(events[i], false);
  };
  api.debug = function () {
    return {
      available: true, created: !!ctx, state: ctx ? ctx.state : 'none', on: prefs.on, volume: prefs.vol,
      wind: engine ? { gain: +engine.cur.gain.toFixed(4), freq: Math.round(engine.cur.freq), howl: +engine.cur.howl.toFixed(4) } : null,
      indoor: engine ? !!engine.cur.indoor : false, lowpass: engine ? engine.cur.lowp : 0, ambMult: engine ? +engine.cur.ambMult.toFixed(3) : 0,
      away: away(), userGain: engine ? +engine.user.gain.value.toFixed(3) : 0,
      plays: engine ? JSON.parse(JSON.stringify(engine.stats.plays)) : {}, total: engine ? engine.stats.total : 0, skipped: engine ? engine.stats.skipped : 0
    };
  };

  /* Рендер без колонок (проверка уровня и WAV для прослушивания): script(engine, t) вызывается каждые 50 мс */
  api.renderOffline = function (seconds, snapAt, eventsAt) {
    var OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext, sr = 44100;
    var oc = new OAC(1, Math.round(sr * seconds), sr), eng = new Engine(oc), step = 0.05, n = Math.floor(seconds / step);
    eng.user.gain.value = 1;
    function at(i) {
      var t = i * step;
      eng.tick(step, snapAt(t));
      var evs = eventsAt ? eventsAt(t, step) : [];
      for (var k = 0; k < evs.length; k++) { if (evs[k].play) eng.play(evs[k].play, evs[k].data); else eng.event(evs[k], false); }
    }
    at(0);
    for (var i = 1; i < n; i++) (function (j) { oc.suspend(j * step).then(function () { at(j); oc.resume(); }); })(i);
    return oc.startRendering().then(function (buf) {
      var d = buf.getChannelData(0), peak = 0, sum = 0, i2;
      for (i2 = 0; i2 < d.length; i2++) { var a = Math.abs(d[i2]); if (a > peak) peak = a; sum += d[i2] * d[i2]; }
      var rms = Math.sqrt(sum / d.length);
      var wav = new DataView(new ArrayBuffer(44 + d.length * 2));
      function str(o, s2) { for (var q = 0; q < s2.length; q++) wav.setUint8(o + q, s2.charCodeAt(q)); }
      str(0, 'RIFF'); wav.setUint32(4, 36 + d.length * 2, true); str(8, 'WAVEfmt '); wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 1, true);
      wav.setUint32(24, sr, true); wav.setUint32(28, sr * 2, true); wav.setUint16(32, 2, true); wav.setUint16(34, 16, true); str(36, 'data'); wav.setUint32(40, d.length * 2, true);
      for (i2 = 0; i2 < d.length; i2++) wav.setInt16(44 + i2 * 2, Math.max(-1, Math.min(1, d[i2])) * 32767, true);
      var bytes = new Uint8Array(wav.buffer), bin = '';
      for (i2 = 0; i2 < bytes.length; i2 += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i2, i2 + 8192));
      return { peak: peak, rms: rms, peakDb: 20 * Math.log10(peak || 1e-9), rmsDb: 20 * Math.log10(rms || 1e-9), plays: eng.stats.plays, wavBase64: global.btoa(bin) };
    });
  };

  function initUi() {
    var b = document.getElementById('sound-btn'), r = document.getElementById('sound-vol');
    if (b) b.addEventListener('click', function () { unlock(); api.setEnabled(!prefs.on); b.blur(); });
    if (r) r.addEventListener('input', function () { unlock(); api.setVolume(parseInt(r.value, 10) / 100); });
    syncUi();
    /* первое действие пользователя включает звук (кнопка старта, «Ещё раз», любая клавиша) */
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', function (e) {
      unlock();
      if (e.code === 'KeyM' && !e.repeat && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) api.setEnabled(!prefs.on);
    }, true);
    function syncAway() {
      applyLevel();
      if (ctx) { try { if (away()) ctx.suspend(); else ctx.resume(); } catch (e) { /* не критично */ } }
    }
    document.addEventListener('visibilitychange', syncAway);
    global.addEventListener('blur', function () { blurred = true; syncAway(); });
    global.addEventListener('focus', function () { blurred = false; syncAway(); });
    /* щелчки интерфейса и клик-приказ — очень тихо */
    document.addEventListener('click', function (e) {
      if (!engine || !on('ui') || !e.target.closest) return;
      if (e.target.closest('.speed-btn, #pause-btn, .shop-btn, #start-btn, #restart-btn, .sleep-btn, .inv-item')) engine.play('tick');
      else if (e.target.closest('#field') && !(lastSnap && lastSnap.paused)) engine.play('order');
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUi);
  else initUi();
})(typeof window !== 'undefined' ? window : globalThis);
