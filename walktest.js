/* Примерка походки. Обычный рендер двора и героя, отдельная симуляция без записи и сохранений. */
(function () {
  'use strict';
  if (!document.documentElement.classList.contains('walk-preview')) return;
  var field = document.getElementById('field'), tiles = document.getElementById('layer-tiles');
  var controls = document.getElementById('walk-controls'), label = document.getElementById('walk-stage');
  var normal = document.getElementById('walk-normal'), slow = document.getElementById('walk-slow');
  var pause = document.getElementById('walk-pause');
  var route = [[.435,.876], [.435,.805], [.396,.735], [.396,.567], [.397,.385], [.416,.318], [.458,.318], [.458,.269]];
  var speed = 1, paused = false, stage, index, wait, last = 0, game, actor;
  var stageNames = { loading: 'Загрузка двора…', missing: 'Не удалось загрузить рисунки', start: 'У остановки',
    outbound: 'К подъезду', door: 'У подъезда', inbound: 'К остановке', done: 'У остановки' };

  function setStage(next) {
    stage = next; controls.dataset.stage = next;
    label.textContent = stageNames[next];
    pause.disabled = next === 'done' || next === 'loading' || next === 'missing';
  }
  function setSpeed(value) {
    speed = value; controls.dataset.speed = String(value);
    normal.setAttribute('aria-pressed', String(value === 1));
    slow.setAttribute('aria-pressed', String(value === .65));
  }
  function nextPoint(step) {
    index += step;
    game.order(null, route[index][0], route[index][1]);
  }
  function restart() {
    game = window.BomzhCore.createGame({ w: 1808, h: 870, rng: window.BomzhCore.makeRng(29) });
    index = 0; wait = 1.2; last = 0; paused = false; pause.textContent = 'Пауза';
    game.state.hero.x = route[0][0]; game.state.hero.y = route[0][1];
    if (actor) actor.remove();
    actor = document.createElement('div');
    actor.className = 'tile hero'; actor.dataset.kind = 'hero';
    actor.innerHTML = '<span class="tile-emoji"></span><span class="tile-label">Бомж</span>';
    tiles.appendChild(actor);
    setStage('loading');
    render();
  }
  function render() {
    var h = game.state.hero;
    actor.style.left = h.x * field.clientWidth + 'px';
    actor.style.top = h.y * field.clientHeight + 'px';
    actor.classList.toggle('walking', !!h.walking);
    actor.dataset.gaitPaused = String(paused);
  }
  function advance(dt) {
    if (stage === 'loading') {
      if (field.classList.contains('walk-art-unavailable')) { setStage('missing'); return; }
      if (!field.classList.contains('painted-courtyard') || !actor.classList.contains('hero-atlas')) return;
      setStage('start');
    }
    if (stage === 'start' || stage === 'door') {
      wait -= dt;
      if (wait > 0) return;
      var outbound = stage === 'start';
      setStage(outbound ? 'outbound' : 'inbound');
      nextPoint(outbound ? 1 : -1);
    }
    game.update(dt * speed / window.GAME_DATA.hero.walk.heroMult);
    if (game.state.hero.move) return;
    if (stage === 'outbound' && index === route.length - 1) { wait = 3.2; setStage('door'); }
    else if (stage === 'inbound' && index === 0) setStage('done');
    else nextPoint(stage === 'outbound' ? 1 : -1);
  }
  function frame(t) {
    var dt = last ? Math.min((t - last) / 1000, .08) : 0;
    last = t;
    if (!paused && stage !== 'done' && stage !== 'missing') advance(dt);
    render();
    requestAnimationFrame(frame);
  }
  normal.addEventListener('click', function () { setSpeed(1); });
  slow.addEventListener('click', function () { setSpeed(.65); });
  pause.addEventListener('click', function () {
    paused = !paused; pause.textContent = paused ? 'Продолжить' : 'Пауза';
  });
  document.getElementById('walk-repeat').addEventListener('click', function () {
    if (stage === 'missing') location.reload(); else restart();
  });
  document.title = 'Бомж — проверка походки';
  var weather = document.getElementById('weather');
  weather.dataset.type = 'calm'; weather.dataset.precip = 'none'; weather.dataset.wind = '0';
  setSpeed(.65);
  restart();
  requestAnimationFrame(frame);
})();
