(function () {
  'use strict';
  if (document.documentElement.classList.contains('walk-preview')) return;

  var start = document.getElementById('start-screen');
  var dialog = document.getElementById('menu-info-dialog');
  var panels = ['menu-help', 'menu-about', 'menu-exit'];

  function bindPanel(buttonId, panelId, title) {
    document.getElementById(buttonId).addEventListener('click', function () {
      if (panelId === 'menu-exit' && window.opener) window.close();
      panels.forEach(function (id) { document.getElementById(id).hidden = id !== panelId; });
      document.getElementById('menu-info-title').textContent = title;
      dialog.showModal();
      document.getElementById('menu-info-close').focus();
    });
  }
  bindPanel('menu-help-btn', 'menu-help', 'Как играть');
  bindPanel('menu-about-btn', 'menu-about', 'О разработчиках');
  bindPanel('menu-exit-btn', 'menu-exit', 'Выход из игры');
  document.getElementById('menu-info-close').addEventListener('click', function () { dialog.close(); });

  // Пока меню открыто, Tab не должен переходить к элементам двора под иллюстрацией.
  var records = document.getElementById('rec-screen');
  var saves = document.getElementById('save-modal');
  function syncLayers() {
    var layer = [saves, records, start].find(function (el) { return !el.classList.contains('hidden'); });
    Array.from(document.getElementById('game').children).forEach(function (el) {
      el.inert = !!layer && el !== layer && !el.classList.contains('hidden');
    });
    if (layer && !layer.contains(document.activeElement)) {
      var first = layer.querySelector('button:not(:disabled):not(.hidden)');
      if (first) first.focus({ preventScroll: true });
    }
  }
  var observer = new MutationObserver(syncLayers);
  [records, saves, start].forEach(function (el) {
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
  });
  syncLayers();

  // Пробел на кнопке главного меню должен активировать её штатное действие.
  start.addEventListener('keydown', function (event) {
    if (event.key === ' ' && event.target.closest('button')) event.stopPropagation();
  });
})();
