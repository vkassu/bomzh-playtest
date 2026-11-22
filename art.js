/* «Бомж» — отрисовка: спрайты (SVG кодом), двор, свет, снег, пар.
   Логику игры не трогает: читает только DOM, который строит game.js. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  /* =====================================================================
   *  Спрайты (SVG кодом) -> CSS-правила
   * ===================================================================== */
  var O = ' stroke="#12161a" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';
  function svg(w, h, body) {
    return 'url("data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '">' + body + '</svg>') + '")';
  }
  function sh(cx, cy, rx, ry) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="#000" opacity=".35"/>'; }

  /* ---------------------------------------------------------------------
   *  ТАБЛИЦА СПРАЙТОВ: «вид:тип» -> функция отрисовки (возвращает SVG как CSS url).
   *  Чтобы нарисовать новый предмет, место или персонажа — добавь сюда строку:
   *    'item:<тип из data.js>', 'place:<id места>', 'npc:<тип встречного>'.
   *  Правило проекта: если строки для типа нет, игра показывает его эмодзи
   *  из data.js, приглушённый под палитру (см. art.css, «запасной путь»).
   * --------------------------------------------------------------------- */
  /* Лежбище (правка 022): короб теплотрассы сверху, одна плита сдвинута — слева чернеет лаз. Ступень n дорисовывает обустройство. */
  function denSprite(n) {
    /* короб: две плиты, между ними щель-лаз (тёмная, с тёплым отсветом); слева в боковой стенке — вход */
    var b = '<rect x="37" y="0" width="46" height="88" fill="#7f8a91"' + O + '/>' +
      '<path d="M78 0V88" stroke="#5c666d" stroke-width="4"/>' +
      '<path d="M38 2h40M38 62h40" stroke="#9aa5ab" stroke-width="2" opacity=".7"/>' +
      '<rect x="36" y="30" width="48" height="26" fill="#0d1013"' + O + '/>' +
      '<path d="M40 52q20-10 40 0" fill="none" stroke="#ffb860" stroke-width="2" opacity=".35"/>' +
      '<path d="M14 30h24v26H14q-6-13 0-26z" fill="#0d1013"' + O + '/>' +
      '<path d="M37 30v26" stroke="#12161a" stroke-width="2"/>';
    if (n === 0) b += '<path d="M16 34l6 3M18 52l7-2M50 36l8 2" stroke="#c9d3d8" stroke-width="2" opacity=".55"/>';
    if (n >= 1) b += '<path d="M6 46l30-6 46 2v12l-46 2-30-4z" fill="#b8935a"' + O + '/>' +
      '<path d="M20 47l14-2M48 47h26" stroke="#8a6a3a" stroke-width="1.6"/>';
    if (n >= 2) b += '<path d="M44 34q8-5 16 0q-2 8-9 9q-6-2-7-9z" fill="#6d5a78"' + O + '/>' +
      '<path d="M62 34l14 1-1 9-13-1z" fill="#d8d2bd"' + O + '/><path d="M64 37.5h9M64 40.5h7" stroke="#8e8a7c" stroke-width="1"/>' +
      '<path d="M18 36q6-4 12 0l-2 6h-9z" fill="#6d5a78"' + O + '/>';
    if (n >= 3) b += '<path d="M8 26l3 34" stroke="#12161a" stroke-width="8" stroke-linecap="round"/><path d="M8 26l3 34" stroke="#7a5a3a" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M16 25l2 34" stroke="#12161a" stroke-width="8" stroke-linecap="round"/><path d="M16 25l2 34" stroke="#8b6a44" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M5 36l15-1M7 51l14-1" stroke="#4d3b26" stroke-width="1.6"/>' +
      '<path d="M38 27h44v4H38z" fill="#aac4cf" opacity=".55"/>';
    if (n >= 4) b += '<rect x="88" y="6" width="24" height="17" fill="#b8935a"' + O + '/><path d="M88 11h24M100 6v17" stroke="#8a6a3a" stroke-width="1.5"/>' +
      '<rect x="92" y="1" width="16" height="7" rx="1" fill="#9a4a36"' + O + '/>';
    return svg(120, 88, b);
  }

  var SPRITES = {
    /* места, 120x88 */
    'place:bin': function () { return svg(120, 88,
      sh(60, 81, 48, 6) +
      '<path d="M20 30L34 8H104L96 30Z" fill="#40564a"' + O + '/>' +
      '<path d="M42 30q3-15 15-12q9-9 18 0q11-2 11 12z" fill="#20252a"' + O + '/>' +
      '<path d="M57 18l3-6M75 18l-2-5" fill="none"' + O + '/>' +
      '<path d="M18 30H100L94 76H24Z" fill="#4f6b59"' + O + '/>' +
      '<path d="M18 30H100L99 40H19Z" fill="#394f43"' + O + '/>' +
      '<path d="M30 46l9 2-3 22-7-1zM68 44h13l-2 12-10-2zM52 62l8 1-1 10-8-1z" fill="#8b5a37"/>' +
      '<path d="M86 60l6 1-1 10-6-1z" fill="#6b4630"/>' +
      '<path d="M40 44v26M82 44l-2 26" stroke="#394f43" stroke-width="2" fill="none"/>' +
      '<rect x="28" y="74" width="12" height="7" rx="3" fill="#1a1e22"' + O + '/>' +
      '<rect x="78" y="74" width="12" height="7" rx="3" fill="#1a1e22"' + O + '/>'); },
    'place:kiosk': function () { return svg(120, 88,
      sh(60, 81, 52, 6) +
      '<path d="M14 26H106V78H14Z" fill="#3d4e63"' + O + '/>' +
      '<path d="M14 66H106V78H14Z" fill="#313f52"' + O + '/>' +
      '<path d="M8 27L16 13H104L112 27Z" fill="#29333f"' + O + '/>' +
      '<path d="M16 13q22-5 44-2q24-4 44 2z" fill="#aeb9c0"/>' +
      '<rect x="22" y="1" width="76" height="14" rx="2" fill="#a8342a"' + O + '/>' +
      '<text x="60" y="12" font-size="10.5" font-weight="700" text-anchor="middle" fill="#ffd98a" font-family="Arial,Helvetica,sans-serif">ЛАРЁК 24</text>' +
      '<rect x="22" y="33" width="52" height="27" fill="#f6cb6c"' + O + '/>' +
      '<path d="M22 33h52v8H22z" fill="#ffe7a8" opacity=".6"/>' +
      '<path d="M28 60v-9h6v9M38 60v-13h5v13M48 60v-8h8v8M60 60v-11h5v11" fill="#b0752c" stroke="#7a4b1c" stroke-width="1.5"/>' +
      '<rect x="20" y="60" width="56" height="5" fill="#1f2731"' + O + '/>' +
      '<rect x="82" y="34" width="18" height="44" fill="#29333f"' + O + '/>' +
      '<circle cx="86" cy="57" r="1.6" fill="#c9a24a"/>' +
      '<path d="M18 70h20M52 72h18" stroke="#8b5a37" stroke-width="2" opacity=".7"/>'); },
    'place:recycle': function () { return svg(120, 88,
      sh(60, 81, 50, 6) +
      '<path d="M14 14H106V78H14Z" fill="#5a626c"' + O + '/>' +
      '<path d="M14 14H106V23H14Z" fill="#464d56"' + O + '/>' +
      '<path d="M14 14q24-6 46-2q26-5 46 2z" fill="#aeb9c0"/>' +
      '<path d="M20 60h14M22 70h8M88 28h12" stroke="#454c55" stroke-width="2"/>' +
      '<circle cx="84" cy="32" r="9" fill="#ffc75a" opacity=".28"/>' +
      '<path d="M84 23v5" stroke="#12161a" stroke-width="2"/>' +
      '<circle cx="84" cy="31" r="3.4" fill="#ffd98a"' + O + '/>' +
      '<rect x="30" y="27" width="34" height="11" rx="1" fill="#2f5d46"' + O + '/>' +
      '<text x="47" y="35.5" font-size="8.5" font-weight="700" text-anchor="middle" fill="#dfe8d8" font-family="Arial,Helvetica,sans-serif">ТАРА</text>' +
      '<rect x="30" y="42" width="34" height="22" fill="#dba24e"' + O + '/>' +
      '<path d="M30 53H64M41 42V64M53 42V64" stroke="#12161a" stroke-width="2"/>' +
      '<rect x="28" y="64" width="38" height="4" fill="#2d3238"' + O + '/>' +
      '<rect x="72" y="48" width="28" height="14" fill="#7a5a3a"' + O + '/>' +
      '<rect x="76" y="62" width="28" height="15" fill="#6b4e32"' + O + '/>' +
      '<path d="M72 55h28M76 69.5h28" stroke="#12161a" stroke-width="1.5"/>' +
      '<path d="M76 48v-8h4v8M84 48v-10h4v10M92 48v-8h4v8" fill="#3f7a55" stroke="#12161a" stroke-width="1.5"/>'); },
    'place:entrance': function () { return svg(120, 88,
      sh(60, 83, 46, 5) +
      '<rect x="18" y="6" width="84" height="74" fill="#56626c"' + O + '/>' +
      '<path d="M18 30h84M18 56h84" stroke="#47525b" stroke-width="2"/>' +
      '<path d="M24 62q6-6 10 0t8-2" fill="none" stroke="#7fa0b8" stroke-width="2" opacity=".6"/>' +
      '<circle cx="60" cy="28" r="12" fill="#ffc75a" opacity=".32"/>' +
      '<rect x="42" y="33" width="36" height="47" fill="#6b3a2a"' + O + '/>' +
      '<path d="M60 33V80" stroke="#12161a" stroke-width="2"/>' +
      '<rect x="46" y="39" width="10" height="15" fill="#ecbc5c"' + O + '/>' +
      '<rect x="64" y="39" width="10" height="15" fill="#4d2a1f"' + O + '/>' +
      '<rect x="81" y="50" width="7" height="10" rx="1" fill="#9aa3a8"' + O + '/>' +
      '<path d="M10 23H110L101 12H19Z" fill="#363f47"' + O + '/>' +
      '<path d="M19 12q20-7 41-3q22-5 41 3z" fill="#aeb9c0"/>' +
      '<circle cx="60" cy="27" r="4" fill="#ffe08a"' + O + '/>' +
      '<rect x="34" y="79" width="52" height="6" fill="#7d8890"' + O + '/>'); },
    /* подъезд с приоткрытой дверью: кто-то только что вошёл или вышел, дверь ещё не захлопнулась (класс door-open ставит game.js) */
    'placeOpen:entrance': function () { return svg(120, 88,
      sh(60, 83, 46, 5) +
      '<rect x="18" y="6" width="84" height="74" fill="#56626c"' + O + '/>' +
      '<path d="M18 30h84M18 56h84" stroke="#47525b" stroke-width="2"/>' +
      '<circle cx="60" cy="28" r="14" fill="#ffc75a" opacity=".45"/>' +
      '<rect x="42" y="33" width="36" height="47" fill="#2a1a14"' + O + '/>' +
      '<path d="M44 35h32v43H44z" fill="#ffcf7a"/><path d="M52 35h18v43H52z" fill="#ffe6a8" opacity=".75"/>' +
      '<path d="M44 66h32M44 72h32" stroke="#d9a550" stroke-width="1.5"/>' +
      '<path d="M42 33l-10 5v42h10z" fill="#6b3a2a"' + O + '/><circle cx="38" cy="58" r="1.6" fill="#c9a24a"/>' +
      '<rect x="81" y="50" width="7" height="10" rx="1" fill="#9aa3a8"' + O + '/><circle cx="84.5" cy="53" r="1.4" fill="#7fe08a"/>' +
      '<path d="M10 23H110L101 12H19Z" fill="#363f47"' + O + '/>' +
      '<path d="M19 12q20-7 41-3q22-5 41 3z" fill="#aeb9c0"/>' +
      '<circle cx="60" cy="27" r="4" fill="#ffe08a"' + O + '/>' +
      '<rect x="34" y="79" width="52" height="6" fill="#7d8890"' + O + '/>' +
      '<path d="M44 80h32l12 7H32z" fill="#ffd98a" opacity=".42"/>'); },
    'place:bench': function () { return svg(120, 88,
      sh(60, 78, 50, 6) +
      '<path d="M26 60v16M94 60v16M30 30v14M90 30v14" stroke="#12161a" stroke-width="6" stroke-linecap="round"/>' +
      '<rect x="20" y="20" width="80" height="9" rx="2" fill="#6d5438"' + O + '/>' +
      '<rect x="20" y="31" width="80" height="8" rx="2" fill="#5e4830"' + O + '/>' +
      '<rect x="14" y="46" width="92" height="8" rx="2" fill="#7b6040"' + O + '/>' +
      '<rect x="14" y="55" width="92" height="8" rx="2" fill="#6d5438"' + O + '/>' +
      '<rect x="14" y="64" width="92" height="8" rx="2" fill="#7b6040"' + O + '/>' +
      '<path d="M15 47q12-7 26-1q8 4 2 8q-4 3-12 1H15z" fill="#b7c2c9"/>' +
      '<path d="M21 21q10-5 22 0v3H21z" fill="#b7c2c9"/>' +
      '<path d="M70 50l10 3M62 67h14" stroke="#4d3b26" stroke-width="1.5"/>'); },
    /* правка 022: теплотрасса — бетонный короб из плит (сам короб тянется по двору на фоне, см. drawHeatMain);
       тут — место «греться»: одна плита сдвинута, внутри трубы в стекловате и тряпье, из щели тянет теплом */
    'place:pipe': function () { return svg(120, 88,
      '<rect x="37" y="0" width="46" height="88" fill="#6f7a82"' + O + '/>' +
      '<rect x="37" y="0" width="46" height="88" fill="#7f8a91"/>' +
      '<path d="M37 0V88M83 0V88" stroke="#12161a" stroke-width="2"/>' +
      '<path d="M78 0V88" stroke="#5c666d" stroke-width="4"/>' +
      '<path d="M37 20H83M37 70H83" stroke="#4b545a" stroke-width="2.5"/>' +
      '<rect x="40" y="22" width="40" height="46" fill="#1b1f23"/>' +
      '<rect x="44" y="22" width="13" height="46" fill="#c9a24e"' + O + '/>' +
      '<rect x="63" y="22" width="13" height="46" fill="#7a4a30"' + O + '/>' +
      '<path d="M46 32h9M46 44h9M46 56h9" stroke="#8f7232" stroke-width="2"/>' +
      '<path d="M65 30h9M65 41h9M65 52h9M65 62h9" stroke="#56331f" stroke-width="2"/>' +
      '<path d="M84 30l26 6-6 34-26-6z" fill="#8d979e"' + O + '/>' +
      '<path d="M88 38l16 4M86 52l16 4" stroke="#6b757c" stroke-width="2"/>' +
      '<path d="M86 31l20 5" stroke="#bcc5ca" stroke-width="3" opacity=".6"/>' +
      '<path d="M38 2h44M38 72h44" stroke="#9aa5ab" stroke-width="2" opacity=".7"/>'); },
    /* правка 022: лежбище — щель между плитами короба, по ступеням: голый лаз → подстилка → утепление → заслон → заначка */
    'place:den': function () { return denSprite(0); },
    'placeStage:den-0': function () { return denSprite(0); },
    'placeStage:den-1': function () { return denSprite(1); },
    'placeStage:den-2': function () { return denSprite(2); },
    'placeStage:den-3': function () { return denSprite(3); },
    'placeStage:den-4': function () { return denSprite(4); },
    /* предметы, 64x64 */
    'item:bottle': function () { return 'url("loot-bottle.png")'; },
    'item:can': function () { return 'url("loot-can.png")'; },
    'item:scraps': function () { return 'url("loot-scraps.png")'; },
    'item:cardboard': function () { return 'url("loot-cardboard.png")'; },
    'item:boards': function () { return svg(64, 64,
      sh(32, 52, 27, 5) +
      '<g transform="rotate(-27 32 32)">' +
      '<path d="M8 18h46v10H8z" fill="#bd9465"' + O + '/>' +
      '<path d="M4 30h50v10H4z" fill="#906641"' + O + '/>' +
      '<path d="M12 42h46v9H12z" fill="#c59b69"' + O + '/>' +
      '<path d="M13 23h14m7 1q6-4 14-1M9 35h18m6 1h14M17 47q8-3 16-1m7 1h12" fill="none" stroke="#6a492e" stroke-width="1.7"/>' +
      '<path d="M11 21v4m40-4v4M7 33v4m47 7v4" stroke="#49382f" stroke-width="2"/></g>'); },
    'item:rags': function () { return svg(64, 64,
      sh(31, 53, 25, 5) +
      '<path d="M6 40l12-17 22-4 17 22-4 7-7-1-5 6-8-3-7 5-5-5-8 1z" fill="#77858b"' + O + '/>' +
      '<path d="M10 37l9-17 14-6 12 7 7 19-9-2-4 5-6-4-7 3-3-5-6 3z" fill="#ab7974"' + O + '/>' +
      '<path d="M20 33l7-12m3 14l3-13m9 13l-5-11M15 46l6-5m21 6l4-5" fill="none" stroke="#65565b" stroke-width="2.4"/>'); },
    'item:film': function () { return svg(64, 64,
      sh(32, 54, 25, 5) +
      '<path d="M16 26l29-13 7 12q-7 11 6 17L26 55Q10 47 16 26z" fill="#9ecdd4" fill-opacity=".78"' + O + '/>' +
      '<path d="M20 34l20-9-5 10 12 4-18 9" fill="none" stroke="#edfaff" stroke-width="2.4"/>' +
      '<path d="M11 24l34-15q7-2 10 6t-3 11L18 41z" fill="#bedce1"' + O + '/>' +
      '<path d="M20 26l28-12" stroke="#f4ffff" stroke-width="3"/>' +
      '<ellipse cx="15" cy="32" rx="7" ry="10" transform="rotate(-22 15 32)" fill="#81a6b1"' + O + '/>' +
      '<ellipse cx="15" cy="32" rx="2.5" ry="5" transform="rotate(-22 15 32)" fill="#514c43"/>'); },
    'item:shawarma': function () { return svg(64, 64,
      sh(32, 55, 18, 5) +
      '<g transform="rotate(-24 32 34)"><path d="M18 21h28l-4 33q-10 5-20 0z" fill="#d9d4c4"' + O + '/>' +
      '<path d="M21 36l22 3M22 45l19 2" stroke="#a9a493" stroke-width="1.5"/>' +
      '<path d="M18 21q14-13 28 0q-14 9-28 0z" fill="#d8a45a"' + O + '/>' +
      '<circle cx="26" cy="19" r="3" fill="#7fae5a"/><circle cx="33" cy="16.5" r="3.2" fill="#b5523a"/>' +
      '<circle cx="39" cy="19.5" r="2.6" fill="#efe4c8"/><circle cx="30" cy="21.5" r="2" fill="#8a4a2a"/></g>'); },
    'item:vodka': function () { return svg(64, 64,
      sh(32, 57, 15, 4) +
      '<rect x="21" y="23" width="22" height="33" rx="4" fill="#b8ccd6"' + O + '/>' +
      '<rect x="27" y="11" width="10" height="13" fill="#b8ccd6"' + O + '/>' +
      '<rect x="26" y="6" width="12" height="6" rx="1" fill="#a8342a"' + O + '/>' +
      '<rect x="21" y="33" width="22" height="14" fill="#ece7d6"' + O + '/>' +
      '<path d="M25 38h14" stroke="#a8342a" stroke-width="3"/><path d="M26 43h12" stroke="#5a5a5a" stroke-width="1.5"/>' +
      '<path d="M24.5 27v4M24.5 49v4" stroke="#fff" stroke-width="2" opacity=".6"/>'); },
    'item:matches': function () { return svg(64, 64,
      sh(32, 54, 22, 5) +
      '<g transform="rotate(-12 32 38)"><rect x="12" y="28" width="40" height="24" rx="2" fill="#3d5f86"' + O + '/>' +
      '<rect x="12" y="28" width="40" height="6" fill="#5a3a2a"' + O + '/>' +
      '<rect x="18" y="37" width="28" height="11" fill="#e6d9a8"' + O + '/>' +
      '<path d="M22 42.5h20" stroke="#a8342a" stroke-width="2.5"/></g>' +
      '<path d="M38 26l15-13" stroke="#12161a" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M38 26l15-13" stroke="#dcc88c" stroke-width="2.5" stroke-linecap="round"/>' +
      '<circle cx="54" cy="12" r="3.6" fill="#8a3326"' + O + '/>'); },
    'item:fire': function () { return 'url("fire-embers.png")'; },

    /* палатка с одеждой: днём — прилавок и вешалка, ночью — под брезентом */
    'place:stall': function () { return svg(120, 88,
      sh(60, 82, 52, 5) +
      '<path d="M14 80V14M106 80V14" stroke="#12161a" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M8 12h104l-6 17H14z" fill="#4f6b7d"' + O + '/>' +
      '<path d="M25 13l-3 15M43 13l-2 15M60 13v15M77 13l2 15M95 13l3 15" stroke="#cfd8de" stroke-width="6"/>' +
      '<path d="M8 12h104l-6 17H14z" fill="none"' + O + '/>' +
      '<path d="M18 36h84" stroke="#12161a" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M26 37l-7 5 3 5 3-2v14h12V45l3 2 3-5-7-5q-5 3-10 0z" fill="#5d6b4f"' + O + '/>' +
      '<path d="M50 37l-7 5 3 5 3-2v17h12V45l3 2 3-5-7-5q-5 3-10 0z" fill="#3a4654"' + O + '/>' +
      '<path d="M53 38l3 6 3-6z" fill="#e9e3d2"/>' +
      '<path d="M73 37h14l2 24h-6l-3-14-3 14h-6z" fill="#4f6b86"' + O + '/>' +
      '<path d="M94 37h8l1 15h-10z" fill="#7d93a3"' + O + '/><path d="M93.5 44h9" stroke="#a8342a" stroke-width="2.5"/>' +
      '<path d="M10 64h100v15H10z" fill="#6d5438"' + O + '/>' +
      '<path d="M10 64h100v5H10z" fill="#8a6a45"' + O + '/>' +
      '<path d="M18 64q1-8 10-8t10 8z" fill="#7d93a3"' + O + '/><circle cx="28" cy="55" r="3" fill="#cfd8de"' + O + '/>' +
      '<path d="M76 64q0-6 6-6l6 3q4 3 12 3z" fill="#cfd8de"' + O + '/>' +
      '<rect x="44" y="70" width="32" height="7" fill="#e9e3d2" stroke="#12161a" stroke-width="1.5"/><path d="M48 73.5h24" stroke="#a8342a" stroke-width="2"/>'); },
    'placeClosed:stall': function () { return svg(120, 88,
      sh(60, 82, 52, 5) +
      '<path d="M14 80V14M106 80V14" stroke="#12161a" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M8 13h104l-3 62q-49 9-98 0z" fill="#3d4f5e"' + O + '/>' +
      '<path d="M30 15l-4 60M57 15l-1 64M84 15l3 61" stroke="#2c3a46" stroke-width="2.5" fill="none"/>' +
      '<path d="M10 38q50 9 100 0M10 58q50 9 100 0" fill="none" stroke="#12161a" stroke-width="2.5"/>' +
      '<path d="M9 14q18-8 40-3t44-2q10 1 18 5z" fill="#b7c2c9"/>' +
      '<path d="M40 44l8 3M70 64l10-2" stroke="#52687a" stroke-width="2"/>'); },

    /* новые товары ларька и газета, 64x64 */
    'item:tea': function () { return svg(64, 64,
      sh(32, 57, 14, 4) +
      '<path d="M26 19q-4-5 0-9M33 19q-4-6 0-11M40 19q-3-4 0-8" fill="none" stroke="#cfd8de" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M19 25h26l-4 31H23z" fill="#d9d4c4"' + O + '/>' +
      '<path d="M19 25h26l-1 7H20z" fill="#7d8890"' + O + '/>' +
      '<path d="M26 40h12M27 47h10" stroke="#a9a493" stroke-width="1.6"/>' +
      '<path d="M43 29l8 8" stroke="#12161a" stroke-width="1.6"/><rect x="48" y="36" width="8" height="9" fill="#b5523a"' + O + '/>'); },
    'item:coffee': function () { return svg(64, 64,
      sh(32, 57, 14, 4) +
      '<path d="M27 18q-4-5 0-9M37 18q-4-5 0-9" fill="none" stroke="#cfd8de" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M20 25h24l-3 31H23z" fill="#6b4630"' + O + '/>' +
      '<ellipse cx="32" cy="25" rx="12" ry="4" fill="#33251b"' + O + '/>' +
      '<path d="M21.5 36h21l-.8 9H22.3z" fill="#e9e3d2" stroke="#12161a" stroke-width="1.5"/>' +
      '<circle cx="27" cy="40.5" r="1.8" fill="#6b4630"/><circle cx="32" cy="40.5" r="1.8" fill="#6b4630"/><circle cx="37" cy="40.5" r="1.8" fill="#6b4630"/>'); },
    'item:bread': function () { return svg(64, 64,
      sh(32, 55, 25, 5) +
      '<path d="M8 40q0-18 24-18t24 18v9q0 4-4 4H12q-4 0-4-4z" fill="#a87a48"' + O + '/>' +
      '<path d="M8 40q0-18 24-18t24 18q-24 7-48 0z" fill="#c9995a"' + O + '/>' +
      '<path d="M20 27l4 12M31 24l2 15M42 26l-1 13" stroke="#8a6238" stroke-width="2.6" stroke-linecap="round"/>'); },
    'item:noodles': function () { return svg(64, 64,
      sh(32, 57, 18, 4) +
      '<path d="M41 24l10-17" stroke="#12161a" stroke-width="5.5" stroke-linecap="round"/><path d="M41 24l10-17" stroke="#b8ccd6" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M14 27h36l-5 29H19z" fill="#e9e3d2"' + O + '/>' +
      '<path d="M15.4 35h33.2l-1.4 8H16.8z" fill="#a8342a" stroke="#12161a" stroke-width="1.5"/>' +
      '<ellipse cx="32" cy="27" rx="18" ry="5.5" fill="#cdb46a"' + O + '/>' +
      '<path d="M19 27q3.5-4 7 0t7 0t7 0t5-1" fill="none" stroke="#8f7a3a" stroke-width="1.6"/>'); },
    'item:newspaper': function () { return svg(64, 64,
      sh(32, 55, 25, 5) +
      '<g transform="rotate(-9 32 36)"><rect x="9" y="20" width="46" height="32" rx="1" fill="#cfd3cf"' + O + '/>' +
      '<rect x="13" y="24" width="38" height="6" fill="#3d4f5e"/>' +
      '<path d="M13 35h17M13 40h17M13 45h17M34 35h17M34 40h17M34 45h11" stroke="#7d8890" stroke-width="2"/></g>'); },
    'item:handles': function () { return svg(64, 64,
      sh(32, 57, 20, 4) +
      '<path d="M22 25q0-15 10-15t10 15" fill="none" stroke="#12161a" stroke-width="6.5" stroke-linecap="round"/>' +
      '<path d="M22 25q0-15 10-15t10 15" fill="none" stroke="#b8ccd6" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M12 24h40l-4 32H16z" fill="#d6dee3"' + O + '/>' +
      '<path d="M12 24h40l-1 8H13z" fill="#a9b6bf"' + O + '/>' +
      '<path d="M24 41h16M26 47h12" stroke="#5f7486" stroke-width="2.6" stroke-linecap="round"/>'); },

    /* одежда, 64x64 */
    'item:hat': function () { return 'url("clothes/hat.png")'; },
    'item:ushanka': function () { return 'url("clothes/ushanka.png")'; },
    'item:scarf': function () { return 'url("clothes/scarf.png")'; },
    'item:jacket': function () { return 'url("clothes/jacket.png")'; },
    'item:vatnik': function () { return 'url("clothes/vatnik.png")'; },
    'item:coatGood': function () { return 'url("clothes/coatGood.png")'; },
    'item:raincoat': function () { return 'url("clothes/raincoat.png")'; },
    'item:trackpants': function () { return 'url("clothes/trackpants.png")'; },
    'item:jeans': function () { return 'url("clothes/jeans.png")'; },
    'item:gloves': function () { return 'url("clothes/gloves.png")'; },
    'item:workGloves': function () { return 'url("clothes/workGloves.png")'; },
    'item:sneakers': function () { return 'url("clothes/sneakers.png")'; },

    /* значки характеристик, 24x24 (на тёмной плашке .chip) */
    'stat:warmth': function () { return svg(24, 24,
      '<path d="M12 2q7.5 7 6 13q-1.2 6.5-6 6.5q-5.6 0-6.2-6q-.4-4.4 3.2-7.2q0 3 2 3q-1.6-4.6 1-9.300z" fill="#f08a2a" stroke="#12161a" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M12 12q3.4 3.6 2.6 6.2q-.6 2-2.600 2q-2.800 0-2.800-2.800q0-2 2.800-5.400z" fill="#ffd96a"/>'); },
    'stat:weather': function () { return svg(24, 24,
      '<path d="M12 11.500v7.500a2.300 2.300 0 0 1-4.600 0" fill="none" stroke="#12161a" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M12 11.500v7.500a2.300 2.300 0 0 1-4.600 0" fill="none" stroke="#d6e2ea" stroke-width="1.700" stroke-linecap="round"/>' +
      '<path d="M2 12.500a10 10 0 0 1 20 0q-2.500-2.400-5 0q-2.500-2.400-5 0q-2.500-2.400-5 0q-2.500-2.400-5 0z" fill="#9fc4e0" stroke="#12161a" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M12 2.500v-1.500" stroke="#12161a" stroke-width="2.200" stroke-linecap="round"/>'); },
    'stat:charisma': function () { return svg(24, 24,
      '<circle cx="12" cy="12" r="9.500" fill="#d6e2ea" stroke="#12161a" stroke-width="1.600"/>' +
      '<circle cx="8.600" cy="9.800" r="1.500" fill="#12161a"/><circle cx="15.400" cy="9.800" r="1.500" fill="#12161a"/>' +
      '<path d="M7 14q5 5.500 10 0" fill="none" stroke="#12161a" stroke-width="1.900" stroke-linecap="round"/>'); },
    'stat:pockets': function () { return svg(24, 24,
      '<path d="M3.500 4h17v10.500q0 6.500-8.500 6.500t-8.500-6.500z" fill="#7d93a3" stroke="#12161a" stroke-width="1.600" stroke-linejoin="round"/>' +
      '<path d="M3.500 8.500h17" stroke="#12161a" stroke-width="1.600"/>' +
      '<path d="M6.500 11.500v3q0 3.800 5.500 3.800t5.500-3.800v-3" fill="none" stroke="#d6e2ea" stroke-width="1.200" stroke-dasharray="2 1.600"/>'); },
    'stat:slots': function () { return svg(24, 24,
      '<path d="M8.500 9q0-6.500 3.500-6.500t3.500 6.500" fill="none" stroke="#12161a" stroke-width="3.800" stroke-linecap="round"/>' +
      '<path d="M8.500 9q0-6.500 3.500-6.500t3.500 6.500" fill="none" stroke="#b8ccd6" stroke-width="1.600" stroke-linecap="round"/>' +
      '<path d="M4 9h16l-1.600 12.500h-12.800z" fill="#d6dee3" stroke="#12161a" stroke-width="1.600" stroke-linejoin="round"/>'); },
    'stat:energy': function () { return svg(24, 24,
      '<path d="M14 1.500L4.500 13.500h5.500L8.500 22.500l10.500-12.500h-6z" fill="#9fc4e0" stroke="#12161a" stroke-width="1.600" stroke-linejoin="round"/>'); },

    /* герой, 64x76 */
    'hero': function () { return svg(64, 76,
    sh(32, 71, 21, 4.5) +
    '<path d="M24 55v13h7V55M34 55v13h7V55" fill="#2f353b"' + O + '/>' +
    '<path d="M21 68h11v4H20zM33 68h10l2 4H33z" fill="#1c1f22"' + O + '/>' +
    '<path d="M49 53l-4 17h13l-2-17z" fill="#c9d3da"' + O + '/>' +
    '<path d="M49 60h8M48 65h9" stroke="#8fa0ab" stroke-width="1.2"/>' +
    '<path d="M15 35q0-9 17-9t17 9l3 21q-20 8-40 0z" fill="#4a5a4c"' + O + '/>' +
    '<path d="M14 44q18 5 36 0M13 51q19 6 38 0M32 27v32" stroke="#33403a" stroke-width="1.6" fill="none"/>' +
    '<path d="M16 34q-7 8-5 20l7 1 1-15z" fill="#425144"' + O + '/>' +
    '<path d="M48 34q7 8 6 19l-7 1-1-15z" fill="#425144"' + O + '/>' +
    '<path d="M36 45l5 3-4 4z" fill="#8b5a37"/>' +
    '<circle cx="32" cy="20" r="10" fill="#c99872"' + O + '/>' +
    '<path d="M22 20q0 15 10 15t10-15q-5 4-10 4t-10-4z" fill="#6e6258"' + O + '/>' +
    '<path d="M27 30q5 3 10 0" fill="none" stroke="#4d443d" stroke-width="1.5"/>' +
    '<path d="M21 17q0-13 11-13t11 13q-11-4-22 0z" fill="#7d3830"' + O + '/>' +
    '<rect x="20" y="13.5" width="24" height="5.5" rx="2" fill="#632b25"' + O + '/>' +
    '<circle cx="32" cy="4" r="3" fill="#b9b3a5"' + O + '/>' +
    '<circle cx="28" cy="21.5" r="1.3" fill="#12161a"/><circle cx="36" cy="21.5" r="1.3" fill="#12161a"/>' +
    '<circle cx="32" cy="24" r="2.2" fill="#c9624e"/>'); },
    'hero:asleep': function () { return svg(64, 76,
    sh(32, 68, 28, 5) +
    '<path d="M4 58l54-7 3 12-54 8z" fill="#8a6a45"' + O + '/>' +
    '<path d="M14 61l40-5" stroke="#6b5136" stroke-width="1.5"/>' +
    '<path d="M50 50l-2 12h11l-2-12z" fill="#c9d3da"' + O + '/>' +
    '<path d="M12 58q-2-22 22-23q22-1 24 15q1 9-8 11H18q-5 0-6-3z" fill="#4a5a4c"' + O + '/>' +
    '<path d="M24 38q-3 10 0 22M36 36q-2 12 1 25M47 39q-1 10 1 20" stroke="#33403a" stroke-width="1.6" fill="none"/>' +
    '<circle cx="17" cy="48" r="9.5" fill="#c99872"' + O + '/>' +
    '<path d="M9 52q4 9 13 6l3-7q-9 4-16 1z" fill="#6e6258"' + O + '/>' +
    '<path d="M6 46q1-13 12-13q9 1 9 9q-11-4-21 4z" fill="#7d3830"' + O + '/>' +
    '<circle cx="9" cy="35" r="3" fill="#b9b3a5"' + O + '/>' +
    '<path d="M13 48h5" stroke="#12161a" stroke-width="1.6" stroke-linecap="round"/>' +
    '<circle cx="12" cy="51" r="2" fill="#c9624e"/>'); },

    /* встречные, 64x64 */
    /* прохожие: тип узнаётся по силуэту — студент узкий с рюкзаком, работяга широкий в ушанке, пальто длинное со шляпой */
    'npc:student': function () { return svg(64, 64,
      sh(32, 59, 14, 3.5) +
      '<path d="M26 45v14h5V45M33 45v14h5V45" fill="#2b3644"' + O + '/>' +
      '<path d="M24 59h8v3h-9zM33 59h8l1 3h-9z" fill="#dfe7ec"' + O + '/>' +
      '<rect x="13" y="25" width="13" height="19" rx="4.5" fill="#4f7a80"' + O + '/>' +
      '<path d="M16 31h7" stroke="#33565b" stroke-width="1.6"/>' +
      '<path d="M21 26q11-6 22 0l2 21H19z" fill="#8fb3c4"' + O + '/>' +
      '<path d="M20 33q12 4 24 0M20 40q12 4 25 0" stroke="#6f93a5" stroke-width="1.5" fill="none"/>' +
      '<path d="M43 28q6 5 4 14l-5 1z" fill="#7fa3b5"' + O + '/>' +
      '<rect x="42" y="38" width="6" height="9" rx="1" fill="#cfe6ff"' + O + '/>' +
      '<circle cx="32" cy="16" r="7.5" fill="#d0a480"' + O + '/>' +
      '<path d="M24 15q0-11 8-11t8 11q-8-3-16 0z" fill="#3f6f78"' + O + '/>' +
      '<path d="M23 16q-1-13 9-13t9 13" fill="none" stroke="#12161a" stroke-width="2"/>' +
      '<rect x="20.5" y="13" width="4.5" height="7" rx="2" fill="#dfe7ec"' + O + '/><rect x="39" y="13" width="4.5" height="7" rx="2" fill="#dfe7ec"' + O + '/>' +
      '<circle cx="29.5" cy="17.5" r="1.1" fill="#12161a"/><circle cx="34.5" cy="17.5" r="1.1" fill="#12161a"/>'); },
    'npc:worker': function () { return svg(64, 64,
      sh(32, 59, 20, 4) +
      '<path d="M21 48v11h9V48M34 48v11h9V48" fill="#2a2f36"' + O + '/>' +
      '<path d="M19 59h12v3H18zM33 59h11l2 3H33z" fill="#15191d"' + O + '/>' +
      '<rect x="47" y="45" width="14" height="10" rx="1.5" fill="#3a4753"' + O + '/>' +
      '<path d="M50 45q4-6 8 0" fill="none"' + O + '/><path d="M47 49h14" stroke="#12161a" stroke-width="1.4"/>' +
      '<path d="M13 28q19-9 38 0l3 24H10z" fill="#536476"' + O + '/>' +
      '<path d="M20 27v25M26 26v26M38 26v26M44 27v25" stroke="#40505f" stroke-width="1.5"/>' +
      '<path d="M12 40h40" stroke="#c3d0d8" stroke-width="3.5"/><path d="M32 26v26" stroke="#2f3b47" stroke-width="2"/>' +
      '<path d="M13 30q-7 8-5 19l7 1 1-14z" fill="#4a5a6b"' + O + '/>' +
      '<path d="M51 30q7 8 5 17l-7 1-1-12z" fill="#4a5a6b"' + O + '/>' +
      '<circle cx="32" cy="18" r="8.5" fill="#c99872"' + O + '/>' +
      '<path d="M24 22q8 7 16 0v3q-8 5-16 0z" fill="#7b6a5c"/>' +
      '<path d="M21 15q0-12 11-12t11 12q-11-4-22 0z" fill="#7d8992"' + O + '/>' +
      '<rect x="18.5" y="12" width="6" height="11" rx="2.5" fill="#6b7680"' + O + '/><rect x="39.5" y="12" width="6" height="11" rx="2.5" fill="#6b7680"' + O + '/>' +
      '<path d="M25 10h14" stroke="#5a656e" stroke-width="2"/>' +
      '<circle cx="28.5" cy="18.5" r="1.2" fill="#12161a"/><circle cx="35.5" cy="18.5" r="1.2" fill="#12161a"/>'); },
    'npc:coat': function () { return svg(64, 64,
      sh(32, 60, 14, 3.5) +
      '<path d="M26 55v5h5v-5M33 55v5h5v-5" fill="#12161a"' + O + '/>' +
      '<rect x="45" y="43" width="14" height="10" rx="1.5" fill="#39465a"' + O + '/>' +
      '<path d="M49 43q3-5 6 0" fill="none"' + O + '/><rect x="50.5" y="46" width="3" height="2.5" fill="#c9d3da"/>' +
      '<path d="M22 21q10-5 20 0l5 35H17z" fill="#34415a"' + O + '/>' +
      '<path d="M32 23l-6 9 6 6 6-6z" fill="#27324a"' + O + '/>' +
      '<path d="M32 38v18" stroke="#232d42" stroke-width="2"/><circle cx="35" cy="43" r="1.2" fill="#c9d3da"/><circle cx="35" cy="49" r="1.2" fill="#c9d3da"/>' +
      '<path d="M22 22q-6 9-4 20l5 1 1-14z" fill="#2e3a52"' + O + '/>' +
      '<path d="M42 22q6 8 6 20l-5 1-2-14z" fill="#2e3a52"' + O + '/>' +
      '<path d="M26 21q6 4 12 0l-1 5q-5 3-10 0z" fill="#d6e2ea"' + O + '/>' +
      '<circle cx="32" cy="14" r="7" fill="#d0a480"' + O + '/>' +
      '<path d="M25 9q0-8 7-8t7 8z" fill="#27324a"' + O + '/>' +
      '<ellipse cx="32" cy="9" rx="13" ry="2.8" fill="#27324a"' + O + '/>' +
      '<path d="M25.5 7h13" stroke="#c9d3da" stroke-width="1.6"/>' +
      '<circle cx="29.5" cy="14.5" r="1" fill="#12161a"/><circle cx="34.5" cy="14.5" r="1" fill="#12161a"/>' +
      '<path d="M29.5 18.5h5" stroke="#12161a" stroke-width="1.2"/>'); },
    'npc:fat': function () { return svg(64, 64,
      sh(32, 59, 23, 4) +
      '<path d="M22 50v9h8v-9M34 50v9h8v-9" fill="#2a2f36"' + O + '/>' +
      '<path d="M20 59h11v3H19zM33 59h10l2 3H33z" fill="#15191d"' + O + '/>' +
      '<ellipse cx="32" cy="38" rx="20" ry="16" fill="#7a5f86"' + O + '/>' +
      '<path d="M32 23v27" stroke="#5e476b" stroke-width="2"/>' +
      '<circle cx="36" cy="33" r="1.3" fill="#d6d0e0"/><circle cx="36" cy="40" r="1.3" fill="#d6d0e0"/><circle cx="36" cy="47" r="1.3" fill="#d6d0e0"/>' +
      '<path d="M14 30q-7 7-5 15l6 1 2-13z" fill="#6c5379"' + O + '/>' +
      '<path d="M50 30q7 7 5 15l-6 1-2-13z" fill="#6c5379"' + O + '/>' +
      '<path d="M52 45l8-3 2 7-8 3z" fill="#e3bd7e"' + O + '/><path d="M54 47l6-2" stroke="#9a6a2a" stroke-width="1.4"/>' +
      '<circle cx="32" cy="17" r="9" fill="#d0a480"' + O + '/>' +
      '<path d="M22 14q1-11 10-11t10 11q-10-3-20 0z" fill="#a8342a"' + O + '/>' +
      '<path d="M22 14h20" stroke="#12161a" stroke-width="2"/>' +
      '<path d="M26 24q6 4 12 0" fill="none" stroke="#b58660" stroke-width="2"/>' +
      '<circle cx="28.5" cy="18.5" r="1.2" fill="#12161a"/><circle cx="35.5" cy="18.5" r="1.2" fill="#12161a"/>' +
      '<path d="M29 21.5q3 2 6 0" fill="none" stroke="#12161a" stroke-width="1.3"/>'); },
    /* правка 016: подвыпивший — ночной прохожий. Ушанка набекрень, пальто нараспашку, ноги врозь, бутылка в руке, нос — единственное тёплое место */
    'npc:drunk': function () { return svg(64, 64,
      sh(32, 59, 17, 3.5) +
      '<path d="M26 46l-4 13h6l3-12M34 46l4 13h6l-3-13" fill="#2b3036"' + O + '/>' +
      '<path d="M19 59h9v3H18zM37 59h9l1 3H37z" fill="#15191d"' + O + '/>' +
      '<path d="M20 27q12-7 24 1l3 21H17z" fill="#59624f"' + O + '/>' +
      '<path d="M29 27l3 20 4-20z" fill="#9aa6ad"' + O + '/>' +
      '<path d="M31 31v13" stroke="#6c777e" stroke-width="1.4"/>' +
      '<path d="M20 29q-7 8-6 18l6 1 2-13z" fill="#4b5444"' + O + '/>' +
      '<path d="M44 29q8 2 9 10l-5 3-5-8z" fill="#4b5444"' + O + '/>' +
      '<path d="M49 31l3-9h3.5l-1 10z" fill="#4f7a5c"' + O + '/>' +
      '<path d="M52.6 22l.4-4.5h2.2l-.3 4.5z" fill="#33503d"' + O + '/>' +
      '<path d="M51 26l3 .5" stroke="#9cc4a6" stroke-width="1.2"/>' +
      '<circle cx="31" cy="17" r="8" fill="#cf9f7c"' + O + '/>' +
      '<g transform="rotate(-16 31 11)"><path d="M21.5 13q1-10 10-10t10 10q-10-4-20 0z" fill="#6b6f63"' + O + '/>' +
      '<rect x="20" y="11.5" width="5" height="9" rx="2" fill="#5b5f55"' + O + '/><path d="M24 7.5h14" stroke="#555a50" stroke-width="1.8"/></g>' +
      '<path d="M26.8 16.6h3.2M32.6 16.2h3.2" stroke="#12161a" stroke-width="1.5" stroke-linecap="round"/>' +
      '<circle cx="33" cy="19.4" r="2.3" fill="#c9624e" stroke="#12161a" stroke-width="1.2"/>' +
      '<path d="M27.5 22.4q3 2.2 6.5 0" fill="none" stroke="#6e4f3c" stroke-width="1.4" stroke-linecap="round"/>'); },
    /* правка 016: пакет с мусором в руке жильца (рисуется отдельно поверх фигурки, пока несёт) */
    'npcbag:trash': function () { return 'url("walker-trash-bag.png")'; },
    'npc:granny': function () { return svg(64, 64,
      sh(32, 59, 18, 4) +
      '<path d="M22 52v7h8v-7M34 52v7h8v-7" fill="#3a3632"' + O + '/>' +
      '<path d="M17 29q15-8 30 0l4 25H13z" fill="#6a5f58"' + O + '/>' +
      '<path d="M32 30v24M24 38h3M24 45h3" stroke="#4d453f" stroke-width="2"/>' +
      '<rect x="45" y="41" width="14" height="14" rx="2" fill="#4a6a8a"' + O + '/>' +
      '<path d="M47 41q5-9 10 0" fill="none"' + O + '/><path d="M45 46h14M45 51h14M50 41v14M55 41v14" stroke="#2f4862" stroke-width="1"/>' +
      '<path d="M21 21q-2-16 11-16t11 16q-2 5-5 8H26q-3-3-5-8z" fill="#7a4a6a"' + O + '/>' +
      '<circle cx="27" cy="11" r="1.4" fill="#c9a0b8"/><circle cx="38" cy="10" r="1.4" fill="#c9a0b8"/><circle cx="33" cy="7" r="1.2" fill="#c9a0b8"/>' +
      '<circle cx="32" cy="19" r="6.5" fill="#d0a480"' + O + '/>' +
      '<path d="M29 27l3 4 3-4z" fill="#643b56"' + O + '/>' +
      '<circle cx="29.5" cy="18.5" r="1" fill="#12161a"/><circle cx="34.5" cy="18.5" r="1" fill="#12161a"/>' +
      '<path d="M29.5 22q2.5 1.5 5 0" fill="none" stroke="#12161a" stroke-width="1.2"/>'); },
    'npc:cop': function () { return svg(64, 64,
      sh(32, 59, 17, 4) +
      '<path d="M24 50v9h6v-9M34 50v9h6v-9" fill="#1c232d"' + O + '/>' +
      '<path d="M48 34l7 17" stroke="#12161a" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M18 27q14-7 28 0l2 26H16z" fill="#2f3d52"' + O + '/>' +
      '<path d="M17 41h30" stroke="#12161a" stroke-width="3.5"/><rect x="29" y="39" width="6" height="4.5" fill="#c9b458"/>' +
      '<path d="M32 28v11" stroke="#222d3e" stroke-width="2"/>' +
      '<circle cx="39" cy="33" r="2.2" fill="#c9b458"/>' +
      '<path d="M20 28l6-2v5zM44 28l-6-2v5z" fill="#a8362c"/>' +
      '<circle cx="32" cy="17" r="8" fill="#d0a480"' + O + '/>' +
      '<path d="M19 12q13-11 26 0l-2 5H21z" fill="#2f3d52"' + O + '/>' +
      '<rect x="21.5" y="13.5" width="21" height="3.6" fill="#a8362c"' + O + '/>' +
      '<path d="M22 17.5h20l3 3.5H19z" fill="#12161a"/>' +
      '<circle cx="32" cy="9.5" r="1.8" fill="#c9b458"/>' +
      '<path d="M28 24h8" stroke="#12161a" stroke-width="1.5"/>'); },
    'bus': function () { return 'url("courtyard-bus.png")'; },
    /* остановка, 120x88: павильон со скамейкой и табличкой */
    'decor:busstop': function () { return svg(120, 88,
      sh(56, 82, 48, 5) +
      '<rect x="14" y="26" width="76" height="50" fill="#5e7686" opacity=".5"' + O + '/>' +
      '<path d="M40 27v48M64 27v48" stroke="#12161a" stroke-width="1.5" opacity=".7"/>' +
      '<path d="M20 70l14-40M46 66l12-34" stroke="#b9d0de" stroke-width="2" opacity=".35"/>' +
      '<rect x="20" y="60" width="64" height="6" rx="1.5" fill="#4a545c"' + O + '/><path d="M26 66v10M78 66v10" stroke="#12161a" stroke-width="3"/>' +
      '<path d="M14 26v54M90 26v54" stroke="#12161a" stroke-width="6"/><path d="M14 26v54M90 26v54" stroke="#55626c" stroke-width="2.5"/>' +
      '<path d="M6 18h92l-3 9H9z" fill="#3b4852"' + O + '/><path d="M8 18h88" stroke="#dbe5ea" stroke-width="3"/>' +
      '<path d="M106 30v52" stroke="#12161a" stroke-width="5"/><path d="M106 30v52" stroke="#7d8890" stroke-width="2"/>' +
      '<rect x="97" y="10" width="18" height="18" rx="3" fill="#3f6f9a"' + O + '/>' +
      '<path d="M101.5 24l4.5-11 4.5 11M103 20.5h6" fill="none" stroke="#e6f0f6" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>'); },

    /* погода, 32x32: ключ — тип погоды из data.js (weather.types) */
    'weather:calm': function () { return svg(32, 32,
      '<path d="M19 5a10 10 0 1 0 8 15a8.5 8.5 0 0 1-8-15z" fill="#e6dfc0" stroke="#12161a" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle cx="7" cy="8" r="1.2" fill="#e6dfc0"/><circle cx="12" cy="4" r=".9" fill="#e6dfc0"/><circle cx="5" cy="17" r=".9" fill="#e6dfc0"/>'); },
    'weather:calmday': function () { return svg(32, 32,      // бледное зимнее солнце в дымке
      '<circle cx="16" cy="14" r="10.5" fill="#e9dca6" opacity=".28"/>' +
      '<circle cx="16" cy="14" r="6.5" fill="#efe2ac" stroke="#12161a" stroke-width="1.5"/>' +
      '<path d="M16 2v3M16 23v3M4 14h3M25 14h3M7.5 5.5l2 2M22.5 20.5l2 2M24.5 5.5l-2 2M9.5 20.5l-2 2" stroke="#e9dca6" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M3 24h20M9 28h18" stroke="#b9c6ce" stroke-width="2.2" stroke-linecap="round" opacity=".75"/>'); },
    'weather:windy': function () { return svg(32, 32,
      '<path d="M3 11h15a4 4 0 1 0-4-4M3 17h22a4 4 0 1 1-4 4M3 23h10" fill="none" stroke="#12161a" stroke-width="4.5" stroke-linecap="round"/>' +
      '<path d="M3 11h15a4 4 0 1 0-4-4M3 17h22a4 4 0 1 1-4 4M3 23h10" fill="none" stroke="#c6d3dc" stroke-width="2.2" stroke-linecap="round"/>'); },
    'weather:snow': function () { return svg(32, 32,
      '<path d="M8 18a6 6 0 0 1 1-12a8 8 0 0 1 15 2a5 5 0 0 1 0 10z" fill="#8f9eaa" stroke="#12161a" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle cx="9" cy="24" r="1.8" fill="#eef3f6"/><circle cx="16" cy="27" r="1.8" fill="#eef3f6"/><circle cx="23" cy="24" r="1.8" fill="#eef3f6"/><circle cx="13" cy="21.5" r="1.2" fill="#eef3f6"/><circle cx="20" cy="21.5" r="1.2" fill="#eef3f6"/>'); },
    'weather:sleet': function () { return svg(32, 32,
      '<path d="M8 17a6 6 0 0 1 1-12a8 8 0 0 1 15 2a5 5 0 0 1 0 10z" fill="#6f7d89" stroke="#12161a" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M11 20l-3 8M18 20l-3 8M25 20l-3 8" stroke="#9fc4e0" stroke-width="2.2" stroke-linecap="round"/>' +
      '<circle cx="12" cy="29" r="1.3" fill="#eef3f6"/><circle cx="20" cy="24" r="1.3" fill="#eef3f6"/>'); },
    'weather:frost': function () { return svg(32, 32,
      '<path d="M10 4a3 3 0 0 1 6 0v13a6 6 0 1 1-6 0z" fill="#dfe8ee" stroke="#12161a" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle cx="13" cy="22" r="3.4" fill="#5f9fd0"/><path d="M13 22v-5" stroke="#5f9fd0" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M25 8v12M20 11l10 6M30 11l-10 6" stroke="#9fc4e0" stroke-width="2" stroke-linecap="round"/>'); },
    'weather:blizzard': function () { return svg(32, 32,
      '<path d="M8 15a6 6 0 0 1 1-12a8 8 0 0 1 15 2a5 5 0 0 1 0 10z" fill="#5d6a76" stroke="#12161a" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M2 20h17M9 24.5h20M3 29h14" stroke="#dfe8ee" stroke-width="2.2" stroke-linecap="round"/>' +
      '<circle cx="24" cy="20" r="1.5" fill="#eef3f6"/><circle cx="5" cy="24.5" r="1.5" fill="#eef3f6"/><circle cx="22" cy="29" r="1.5" fill="#eef3f6"/>'); },

    /* значки интерфейса */
    'ui:money': function () { return svg(32, 32,
      '<ellipse cx="16" cy="26" rx="12" ry="4" fill="#000" opacity=".35"/>' +
      '<ellipse cx="17" cy="22" rx="10" ry="4.5" fill="#9a7a34"' + O + '/>' +
      '<ellipse cx="17" cy="19" rx="10" ry="4.5" fill="#c9a24a"' + O + '/>' +
      '<ellipse cx="15" cy="14" rx="10" ry="4.5" fill="#9a7a34"' + O + '/>' +
      '<ellipse cx="15" cy="11" rx="10" ry="4.5" fill="#dcb85a"' + O + '/>' +
      '<path d="M12 11h6M13 9.5v3.5" stroke="#7a5c1f" stroke-width="1.6" fill="none"/>'); },
    'ui:sound': function () { return svg(24, 24,
      '<path d="M4 9h4l5-4.5v15L8 15H4z" fill="#d6e2ea" stroke="#12161a" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M16 9q2.2 3 0 6M18.6 6.4q4.4 5.6 0 11.2" fill="none" stroke="#ffc56a" stroke-width="1.8" stroke-linecap="round"/>'); },
    'ui:mute': function () { return svg(24, 24,
      '<path d="M4 9h4l5-4.5v15L8 15H4z" fill="#8a949b" stroke="#12161a" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="#ff6c5e" stroke-width="2" stroke-linecap="round"/>'); },
    /* значки над героем: шкала ниже порога (24x24, рисунок на тёмной плашке .warn-ico) */
    'warn:cold': function () {
      var arms = '', i;
      for (i = 0; i < 3; i++) arms += '<g transform="rotate(' + (i * 60) + ' 12 12)"><path d="M12 2.5v19M9.1 5.2L12 8l2.9-2.8M9.1 18.8L12 16l2.9 2.8"/></g>';
      return svg(24, 24,
        '<g fill="none" stroke="#12161a" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">' + arms + '</g>' +
        '<g fill="none" stroke="#bfe0f2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + arms + '</g>'); },
    'warn:hunger': function () { return svg(24, 24,
      '<g fill="none" stroke="#12161a" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M5 3v5.5a3 3 0 0 0 6 0V3M8 3v18"/><path d="M17.5 21V3q3.6 2.4 .6 9.2h-.6"/></g>' +
      '<g fill="none" stroke="#e2d8b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M5 3v5.5a3 3 0 0 0 6 0V3M8 3v18"/><path d="M17.5 21V3q3.6 2.4 .6 9.2h-.6"/></g>'); },
    'warn:sleep': function () { return svg(24, 24,
      '<path d="M13 3.5a8.6 8.6 0 1 0 7.6 12.6a7.2 7.2 0 0 1-7.6-12.6z" fill="#d6e2ea" stroke="#12161a" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M14.5 4h5.5l-5.5 5.5h5.5" fill="none" stroke="#12161a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M14.5 4h5.5l-5.5 5.5h5.5" fill="none" stroke="#9fc4e0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'); },
    'warn:health': function () { return svg(24, 24,
      '<path d="M12 21.2C6 16.6 2.6 13.2 2.6 9.2a4.7 4.7 0 0 1 9.4-1.3a4.7 4.7 0 0 1 9.4 1.3c0 4-3.4 7.4-9.4 12z" fill="#c8483c" stroke="#12161a" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<path d="M12 8.6v6.2M8.9 11.7h6.2" fill="none" stroke="#f1dfda" stroke-width="2.2" stroke-linecap="round"/>'); },
    'ui:sleep': function () { return svg(24, 24,
      '<path d="M14 4a8.5 8.5 0 1 0 7 12.5a7 7 0 0 1-7-12.5z" fill="#d6e2ea" stroke="#12161a" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M15 5h5l-5 5h5" fill="none" stroke="#d6e2ea" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>'); }
  };

  SPRITES['stat:satiety'] = SPRITES['warn:hunger'];        // сытость и здоровье — те же рисунки, что у значков над героем
  SPRITES['stat:health'] = SPRITES['warn:health'];

  /* Куда какой вид спрайта попадает: первый селектор — плитка на поле, остальные — мелкие копии. */
  var SPRITE_TARGETS = {
    place: function (t) { return ['.place-' + t + ' .place-emoji']; },
    placeOpen: function (t) { return ['#place-' + t + '.door-open .place-emoji']; },
    placeClosed: function (t) { return ['#place-' + t + '.closed .place-emoji']; },
    placeStage: function (t) { var q = t.split('-'); return ['#place-' + q[0] + '.stage-' + q[1] + ' .place-emoji']; },   // правка 022: ступени лежбища
    item: function (t) { return ['.tile.item-' + t + ' .tile-emoji', '.inv-item[data-type="' + t + '"] .inv-emoji', '.shop-btn[data-type="' + t + '"] .shop-emoji', '.gear-slot[data-type="' + t + '"] .gear-ico']; },
    stat: function (t) { return [null, '.st-ico[data-s="' + t + '"]']; },
    npc: function (t) { return ['.tile.npc-' + t + ' .tile-emoji']; },
    npcbag: function () { return [null, '.tile.walker .trash-bag']; },
    bus: function () { return ['.bus .bus-body']; },
    decor: function (t) { return ['.decor.' + (t === 'busstop' ? 'bus-stop' : t) + ' .decor-emoji']; },
    hero: function (t) {
      return t === 'asleep' ? ['.tile.hero.asleep .tile-emoji', '#end-screen.lose #end-card::before']
        : ['.tile.hero .tile-emoji', '#end-screen.win #end-card::before', '#start-card::before'];
    },
    weather: function (t) { return [null, '#weather-icon[data-type="' + t + '"]']; },
    warn: function (t) { return [null, '.warn-ico[data-w="' + t + '"]']; },
    ui: function (t) { return { money: [null, '#money-icon'], sleep: [null, '.sleep-btn'], sound: [null, '#sound-btn'], mute: [null, '#sound-btn.off'] }[t] || []; }
  };

  function buildSpriteCss() {
    var css = [], key;
    var on = 'font-size:0!important;line-height:0!important;';
    for (key in SPRITES) {
      var parts = key.split(':'), target = SPRITE_TARGETS[parts[0]];
      if (!target) continue;
      var sels = target(parts[1] || ''), img = 'background-image:' + SPRITES[key]() + '!important;';
      if (sels[0]) css.push(sels[0] + '{' + img + on + 'filter:drop-shadow(0 4px 2px rgba(0,0,0,.45))}');
      if (sels.length > 1) css.push(sels.slice(1).join(',') + '{' + img + on + 'filter:none}');
    }
    var st = document.createElement('style');
    st.id = 'art-sprites';
    st.textContent = css.join('\n');
    document.head.insertBefore(st, document.head.firstChild);   // раньше art.css: его правила состояний сильнее
  }

  /* =====================================================================
   *  Двор (статичный canvas) и эффекты (свет, снег, пар)
   * ===================================================================== */
  var field, bg, fx, bc, fc, frostCv = null, W = 0, H = 0, raf = 0, lastT = 0;
  var courtyard = null;
  var catPupils, catTail;
  // Центральная створка широкого окна справа от подъезда на фоне 1808×870.
  var catPane = { x: 1308, y: 47, w: 36, h: 38 };

  function mountWindowCat() {
    var cat = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    cat.id = 'window-cat';
    cat.setAttribute('aria-hidden', 'true');
    cat.setAttribute('viewBox', '0 0 36 38');
    cat.setAttribute('preserveAspectRatio', 'none');
    Object.assign(cat.style, {
      position: 'absolute', pointerEvents: 'none', overflow: 'hidden',
      left: (100 * catPane.x / courtyard.width) + '%', top: (100 * catPane.y / courtyard.height) + '%',
      width: (100 * catPane.w / courtyard.width) + '%', height: (100 * catPane.h / courtyard.height) + '%'
    });
    cat.innerHTML =
      '<defs><linearGradient id="window-cat-fur" x2=".78" y2="1">' +
        '<stop stop-color="#69635f"/><stop offset=".48" stop-color="#4d4948"/><stop offset="1" stop-color="#302f34"/>' +
      '</linearGradient></defs>' +
      '<g opacity=".92">' +
        '<path class="cat-tail" fill="none" stroke="#4e4947" stroke-width="3" stroke-linecap="round"/>' +
        '<path fill="url(#window-cat-fur)" stroke="#35353a" stroke-width=".65" d="M6 37 Q3 33 5 26 Q6 21 10 20 Q8 18 8 15 L7.2 7.2 Q9.6 7.6 13.3 11 Q16 10 19 11 L23 6.8 L22.7 15 Q23.2 18.8 20.8 21 Q22.7 24 23.3 27.8 Q25.5 29.5 26 34.8 Q26.6 37.4 23.6 38 L7 38Z"/>' +
        '<path fill="#81716c" opacity=".6" d="M8.6 9.3L11.5 12L9 13.2ZM20.3 12L22.1 9L21.9 13.5Z"/>' +
        '<path fill="#8d8278" opacity=".36" d="M10 18.1Q13.6 19.2 14.6 20.5Q15.8 19 19.9 18Q19.6 21 16.2 22.6L15.2 24L14.5 22.7L13.3 23L13.2 21.8Q11.3 21.1 10 18.1Z"/>' +
        '<path fill="none" stroke="#8c8176" stroke-width=".55" opacity=".6" d="M7 27Q10 23 13 26 M10 35Q12 33 13 29 M17 26Q16 31 16.8 36L18 36.5 M20 28Q19.8 33 20 36L21.2 36.5"/>' +
        '<path fill="none" stroke="#2e3033" stroke-width=".8" opacity=".62" d="M13 11.6L13.8 13.6M15.4 11.4L15.7 13.1M17.2 11.4L16.8 13.5M7.7 29Q9.2 27.5 11.8 28M7.2 31Q8.5 29.7 10.4 30"/>' +
        '<path fill="#ada57b" d="M9.7 16.1Q12 14.4 14.1 16Q12.3 18.2 9.7 16.1ZM16.5 16Q18.8 14.2 21.1 15.6Q19.6 17.8 16.5 16Z"/>' +
        '<g class="cat-pupils" fill="#272b2c"><ellipse cx="12" cy="16.2" rx=".55" ry=".95"/><ellipse cx="18.8" cy="15.95" rx=".55" ry=".95"/></g>' +
        '<path fill="#9a8179" d="M14 18.2L16.3 18L15.3 19.4Z"/>' +
        '<path stroke="#a3978b" opacity=".56" fill="none" stroke-width=".45" d="M12.4 18.9L6.9 18.3M12.3 19.8L7.6 20.5M17.4 18.5L23.3 17.4M17.5 19.2L23 19.4"/>' +
      '</g><path fill="#b8c7ce" opacity=".055" d="M5 0H8L2 38H0ZM21 0H22L16 38H14.5Z"/>';
    field.insertBefore(cat, stepsCv);
    catPupils = cat.querySelector('.cat-pupils');
    catTail = cat.querySelector('.cat-tail');
  }

  function animateWindowCat(hero, time) {
    if (!catTail || !hero) return;
    var dx = parseFloat(hero.style.left) - W * (catPane.x + 15) / courtyard.width;
    var dy = parseFloat(hero.style.top) - H * (catPane.y + 16) / courtyard.height;
    var length = Math.hypot(dx, dy) || 1;
    catPupils.setAttribute('transform', 'translate(' + (dx / length * 1.1) + ' ' + (dy / length * .45) + ')');
    var sway = Math.sin(time * .0014) * 2.1;
    catTail.setAttribute('d', 'M23 35 Q31 37 30 30 C29 26 ' + (30 + sway) + ' 25 ' + (32 + sway) + ' 23');
  }
  var walkAtlasReady = false, npcAtlasReady = false;
  var actorGaits = new WeakMap();
  // Порядок трёхракурсных полос в npc-walk.webp. Последняя строка — бабушка на лавке.
  var npcBodies = [
    ['student', .97], ['worker', 1.02], ['coat', 1.08], ['fat', 1],
    ['drunk', .94], ['granny', .86], ['cop', 1.05]
  ];

  function drawActorGait(el, now, hero) {
    if (!el || !(hero ? walkAtlasReady : npcAtlasReady)) return;
    var x = parseFloat(el.style.left) / W, y = parseFloat(el.style.top) / H;
    if (!isFinite(x) || !isFinite(y)) return;
    var gait = actorGaits.get(el);
    if (!gait) {
      var type = hero ? -1 : npcBodies.findIndex(function (body) { return el.classList.contains('npc-' + body[0]); });
      if (!hero && type < 0) return;
      gait = { x: x, y: y, facing: 'front', phase: 0, movedAt: -1000, type: type };
      actorGaits.set(el, gait);
      el.classList.add(hero ? 'hero-atlas' : 'npc-atlas');
    }
    // У двери 96 пикселей высоты. У остановки сиденье в 29 пикселях над землёй.
    var depth = Math.max(0, Math.min(1.2, (y - 0.265) / 0.599));
    var bodyH = (82 + depth * 31) * H / 870 * (hero ? 1 : npcBodies[gait.type][1]);
    var cellH = bodyH * 160 / 146;
    var dx = (x - gait.x) * W, dy = (y - gait.y) * H, distance = Math.hypot(dx, dy);
    var sitting = !hero && el.classList.contains('sitting');
    var walking = !sitting && !el.classList.contains('asleep') && !el.classList.contains('talking') &&
      (el.classList.contains('walking') || el.classList.contains('npc-cop'));
    if (walking && distance > 0.03 && distance < bodyH * 1.15) {
      // Выбираем ракурс по игровому направлению независимо от пропорций окна.
      var sx = (x - gait.x) * window.GAME_DATA.layout.logicalAspect, sy = y - gait.y;
      var side = Math.abs(sx) > Math.abs(sy) * (gait.facing === 'left' || gait.facing === 'right' ? .9 : 1.12);
      gait.facing = side ? (sx < 0 ? 'left' : 'right') : (sy < 0 ? 'back' : 'front');
      gait.phase = (gait.phase + distance / (bodyH * 1.05)) % 1;
      gait.movedAt = now;
    }
    if (!hero && el.classList.contains('at-counter')) gait.facing = 'back';
    gait.x = x; gait.y = y;
    var frame = walking && now - gait.movedAt < 120 ? 1 + Math.floor(gait.phase * 4) : 0;
    if (el.dataset.gaitPaused === 'true') frame = Number(el.dataset.gaitFrame || 0);
    var row = gait.facing === 'front' ? 0 : gait.facing === 'back' ? 1 : 2;
    if (sitting) row = 21;
    else if (!hero) row += gait.type * 3;
    var facing = sitting ? 'front' : gait.facing;
    if (el.dataset.facing !== facing) el.dataset.facing = facing;
    if (gait.row !== row) {
      gait.row = row;
      el.style.setProperty('--gait-row', (row * (hero ? 50 : 100 / 21)) + '%');
    }
    if (el.dataset.gaitFrame !== String(frame)) {
      el.dataset.gaitFrame = String(frame);
      el.style.setProperty('--gait-col', (frame * 25) + '%');
    }
    if (gait.bodyH !== bodyH) {
      gait.bodyH = bodyH;
      el.style.setProperty(hero ? '--hero-height' : '--npc-height', bodyH.toFixed(2) + 'px');
      el.style.setProperty('--cell-height', cellH.toFixed(2) + 'px');
    }
  }
  var postMask = null, postLayer = null, tiles = null;
  var closedShopArt = null;
  var openDoorArt = null, doorWasOpen = null;
  var benchPatch = { x: 920, y: 110, image: null,
    outline: 'M61 110L61 105Q62 102 66 101Q71 99 78 102Q87 100 96 101Q106 98 113 101Q130 100 141 101Q154 98 160 100Q166 100 171 99Q176 99 177 104L177 110Z M61 112H177V116.6H61Z M69 109H73V121H69Z M163 109H166V121H163Z M62 122Q69 119 75 120L165 120Q174 118 176 122L180 126Q182 129 180 130H60L59.5 127Z M68 129H72V147.5H68Z M72 129H74V142H72Z M162 129H166V141H162Z M171 129H175V148H171Z' };
  // Левый верхний угол фрагмента в координатах иллюстрации 1808×870.
  var doorPatch = { x: 795, y: 126 };

  function paintBench() {
    if (!courtyard || !benchPatch.image) return;
    var sx = W / courtyard.width, sy = H / courtyard.height;
    bc.drawImage(benchPatch.image, benchPatch.x * sx, benchPatch.y * sy,
      benchPatch.image.width * sx, benchPatch.image.height * sy);
  }

  function paintEntrance(force) {
    if (!courtyard || !openDoorArt) return;
    var entrance = document.getElementById('place-entrance');
    var open = !!entrance && entrance.classList.contains('door-open');
    if (!force && open === doorWasOpen) return;
    doorWasOpen = open;
    var x = doorPatch.x * W / courtyard.width, y = doorPatch.y * H / courtyard.height;
    var w = openDoorArt.width * W / courtyard.width, h = openDoorArt.height * H / courtyard.height;
    bc.save();
    bc.beginPath();
    bc.rect(Math.floor(x), Math.floor(y), Math.ceil(x + w) - Math.floor(x), Math.ceil(y + h) - Math.floor(y));
    bc.clip();
    bc.drawImage(courtyard, 0, 0, W, H);
    if (open) bc.drawImage(openDoorArt, x, y, w, h);
    bc.restore();
  }
  // Координаты фрагмента в атласе, размеры и положение на рисунке двора 1808×870.
  var shopFronts = [
    { id: 'stall', sx: 0, sy: 0, w: 360, h: 178, x: 790, y: 282 },
    { id: 'kiosk', sx: 0, sy: 178, w: 220, h: 144, x: 392, y: 554 },
    { id: 'recycle', sx: 224, sy: 178, w: 100, h: 85, x: 1282, y: 566 }
  ];
  // Отдельные вырезы с картинки закрывают часть персонажа, когда он стоит за мебелью.
  var benchFront = { id: 'bench', x: 960, y: 155, w: 170, h: 114, patch: benchPatch,
    outline: 'M14 25 Q17 14 31 18 Q40 14 53 18 Q60 14 74 18 L95 16 Q102 12 112 16 Q139 9 143 23 L143 52 L132 53 L132 58 L143 59 L154 71 L153 77 L144 77 L143 100 L137 102 L135 77 L40 77 L38 102 L31 102 L31 78 L27 85 L27 77 L18 77 L15 64 L18 60 L28 59 L28 53 L15 53 Z' };
  var tableFront = { id: 'table', x: 790, y: 282, w: 360, h: 178,
    shop: shopFronts[0],
    outline: 'M33 42 Q51 40 69 32 Q88 24 103 15 Q110 12 118 16 Q154 27 181 20 Q198 17 214 9 Q222 6 234 10 Q254 13 282 8 Q290 5 295 15 L306 39 L308 50 L307 153 L303 161 L298 129 L286 122 L131 125 L124 151 L96 156 L91 164 L70 158 L70 145 L46 151 L45 157 L38 161 L39 58 Z ' +
      'M33 49 L37 57 L20 115 L17 136 L10 137 L9 118 L16 112 L23 88 Z M306 44 L310 43 L329 117 L325 119 Z M318 119 L325 110 Q330 105 343 110 Q352 110 354 121 L352 142 L327 146 L320 142 Z ' +
      'M125 121 L136 119 Q139 109 162 114 Q169 107 175 115 L186 117 Q194 107 214 113 L225 116 Q230 109 241 113 L250 116 Q257 105 280 111 L288 116 L304 129 L307 164 L301 165 L299 135 L284 136 L282 166 L277 166 L276 137 L193 140 L192 171 L187 172 L186 141 L143 142 L139 173 L135 174 L135 143 L129 143 L128 164 L125 165 Z',
    closedOutline: 'M14 137 L34 41 Q76 35 109 14 Q170 31 212 8 Q242 13 286 6 L310 40 L329 126 L343 159 L325 163 L319 170 Q163 179 44 169 L25 169 Z' };
  var kioskFront = { id: 'kiosk-front', x: 380, y: 485, w: 245, h: 218, shop: shopFronts[1],
    outline: 'M15 60 Q14 45 34 42 Q49 37 72 41 L71 31 Q69 16 83 16 Q124 9 170 14 Q188 14 188 34 L185 42 Q212 40 218 48 L230 73 L228 81 L229 178 L221 183 L220 196 Q196 209 168 202 L65 203 L64 196 Q45 191 36 198 L35 186 L18 178 Z' };
  var recycleFront = { id: 'recycle-front', x: 1196, y: 495, w: 274, h: 209, shop: shopFronts[2],
    outline: 'M25 42 Q26 24 36 19 Q89 15 123 19 Q166 12 216 18 Q228 21 229 43 L226 69 L226 123 L230 121 L233 126 L237 124 L242 120 L245 131 L250 120 L258 141 L262 146 L261 190 L249 192 L243 187 L228 188 L208 195 L199 192 L195 188 Q151 197 117 191 L91 192 L82 188 L77 196 L59 191 L47 195 L33 191 L22 193 L21 156 Q20 145 30 144 L28 68 Z' };
  // Сохраняем прорези стёкол между перекладинами и стойками.
  var stopFront = { id: 'bus-stop-front', x: 800, y: 598, w: 230, h: 170,
    outline: 'M15 43 Q16 35 20 30 Q21 22 27 19 Q37 14 48 17 Q59 14 70 16 Q85 19 97 16 Q111 12 122 17 Q134 18 147 17 Q155 13 164 16 Q174 15 183 17 Q191 13 200 18 Q207 19 209 28 Q212 32 213 42 L212 49 L17 49 Z ' +
      'M23 48 H31 V148 L33 153 L23 155 L21 152 L23 145 Z M34 49 H40 V141 L35 144 L34 139 Z M197 48 H207 V154 L198 156 L196 153 Z M190 49 H196 V143 H191 Z ' +
      'M89 49 H95 V116 H89 Z M144 49 H149 V116 H144 Z M39 105 H192 V110 H39 Z M30 126 H199 V132 H30 Z ' +
      'M45 121 Q45 117 51 116 H182 Q190 116 189 123 L186 126 H46 Z M51 125 H56 V147 H51 Z M89 125 H94 V146 H89 Z M144 125 H149 V145 H144 Z M176 125 H182 V148 H176 Z' };
  var binFront = { id: 'bin-front', block: 'bin', x: 1380, y: 322, w: 144, h: 88,
    outline: 'M5 32L11 10Q15 1 36 4L106 4Q134 0 137 13L140 30L143 39L137 47L135 72L128 76Q128 85 122 85L116 82L115 76L34 76Q34 85 27 85L21 76L10 74L7 46L3 43Z' };
  var foregroundOccluders = [tableFront, kioskFront, recycleFront, stopFront, binFront];
  var foreground = [benchFront].concat(foregroundOccluders);

  function paintFurniture(cutout) {
    if (!cutout.canvas) {
      var canvas = document.createElement('canvas');
      canvas.id = 'art-' + cutout.id;
      canvas.className = 'art-layer furniture-front';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.width = cutout.w; canvas.height = cutout.h;
      canvas.style.left = (cutout.x / courtyard.width * 100) + '%';
      canvas.style.top = (cutout.y / courtyard.height * 100) + '%';
      canvas.style.width = (cutout.w / courtyard.width * 100) + '%';
      canvas.style.height = (cutout.h / courtyard.height * 100) + '%';
      cutout.canvas = canvas;
    }
    var ctx = cutout.canvas.getContext('2d');
    var shop = cutout.shop;
    var closed = shop && closedShopArt && shop.closed;
    var replacement = cutout.patch && cutout.patch.image ? cutout.patch : null;
    ctx.clearRect(0, 0, cutout.w, cutout.h);
    ctx.save();
    if (replacement) {
      ctx.translate(replacement.x - cutout.x, replacement.y - cutout.y);
      ctx.clip(new Path2D(replacement.outline));
      ctx.drawImage(replacement.image, 0, 0);
    } else {
      cutout.mask = new Path2D(closed && cutout.closedOutline || cutout.outline);
      ctx.clip(cutout.mask);
      ctx.drawImage(courtyard, cutout.x, cutout.y, cutout.w, cutout.h, 0, 0, cutout.w, cutout.h);
      if (closed) ctx.drawImage(closedShopArt, shop.sx, shop.sy, shop.w, shop.h,
        shop.x - cutout.x, shop.y - cutout.y, shop.w, shop.h);
    }
    ctx.restore();
  }

  function foregroundCoversPoint(clientX, clientY, footY) {
    return foregroundOccluders.some(function (part) {
      if (!part.mask || footY >= part.frontY) return false;
      var r = part.canvas.getBoundingClientRect();
      if (clientX < r.left || clientX >= r.right || clientY < r.top || clientY >= r.bottom) return false;
      return part.canvas.getContext('2d').isPointInPath(part.mask,
        (clientX - r.left) * part.w / r.width, (clientY - r.top) * part.h / r.height);
    });
  }

  function paintShopFronts(force) {
    if (!courtyard || !closedShopArt) return;
    shopFronts.forEach(function (shop) {
      var el = document.getElementById('place-' + shop.id);
      var closed = !!el && el.classList.contains('closed');
      if (!force && closed === shop.closed) return;
      shop.closed = closed;
      var x = shop.x * W / courtyard.width, y = shop.y * H / courtyard.height;
      var w = shop.w * W / courtyard.width, h = shop.h * H / courtyard.height;
      bc.drawImage(courtyard, shop.x, shop.y, shop.w, shop.h, x, y, w, h);
      if (closed) {
        bc.drawImage(closedShopArt, shop.sx, shop.sy, shop.w, shop.h, x, y, w, h);
        if (shop.id === 'stall') drawPostSilhouettes(bc);
      }
      var cutout = foreground.find(function (part) { return part.shop === shop; });
      if (cutout) paintFurniture(cutout);
    });
  }
  var NIGHT = 0.72;                // плотность темноты ночью
  var dark = 0, lastBandDark = '';
  var windows = [], winTimer = 0, houseH = 0, houseW = 0, roadY = 0;
  // Координаты стекла и пятки каждого столба на иллюстрации, в долях игрового поля.
  var streetLamps = [
    { x: 0.4126, y: 0.5287, footX: 0.3684, footY: 0.8644 },
    { x: 0.6067, y: 0.5287, footX: 0.6466, footY: 0.8655 }
  ];
  // Контур столбов, дуг и плафонов на исходном холсте. Один и тот же срез
  // сохраняет их перед закрытой палаткой и перекрывает идущую за столбом фигуру.
  function drawPostSilhouettes(ctx) {
    if (!courtyard) return;
    if (!postMask) {
      postMask = new Path2D();
      var outline = new Path2D('M12 328 L13 318 17 314 21 272 21 72 19 70 19 61 21 59 22 45 Q22 14 57 14 L88 14 Q99 15 107 19 L106 25 Q124 25 126 34 Q124 46 104 46 Q85 45 85 35 Q85 27 101 25 L101 22 Q90 19 79 20 L57 20 Q29 20 29 45 L30 60 32 61 32 70 30 72 30 270 34 314 39 319 40 326 Q26 333 12 328 Z');
      postMask.addPath(outline, new DOMMatrix().translate(640, 425));
      // Арматура справа имеет зеркальный вынос и немного другую ширину дуги.
      postMask.addPath(outline, new DOMMatrix().translate(1193, 426).scale(-0.93, 1));
    }
    ctx.save();
    ctx.scale(W / 1808, H / 870);
    ctx.clip(postMask);
    ctx.drawImage(courtyard, 0, 0, 1808, 870);
    ctx.restore();
  }

  function refreshPostLayer() {
    if (!postLayer) {
      postLayer = document.createElement('canvas');
      postLayer.id = 'art-posts'; postLayer.className = 'art-layer';
      postLayer.setAttribute('aria-hidden', 'true');
    }
    postLayer.width = W; postLayer.height = H;
    drawPostSilhouettes(postLayer.getContext('2d'));
  }
  var flakes = [], puffs = [], breathT = 0, kioskDim = 0, tNow = 0;
  var weatherEl = null, flakeN = 0, lastWind = -1;
  var stepsCv = null, sc = null, steps = [], lastStep = null, stepSide = 1, stepsDirty = false;
  var STEP_PX = 17, STEP_MAX = 90;      // шаг между следами и сколько их держим
  /* Как погода из game.js (атрибуты #weather) выглядит на экране */
  var WIND_PX = [16, 90, 340];          // снос частиц, px/с: штиль / слабый / сильный
  var STEAM_PUSH = [0, 36, 130];        // снос пара
  var FLAME_LEAN = ['0deg', '9deg', '22deg'];
  var CLEAR_NIGHT = 0.64;               // тихая ясная ночь чуть светлее
  var MAX_FLAKES = 220;

  function rngFrom(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function blob(c, r, cx, cy, rx, ry, fill, n) {
    n = n || 14;
    var pts = [], i;
    for (i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2, k = 0.86 + r() * 0.22;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    c.beginPath();
    c.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (i = 0; i < n; i++) {
      var q = pts[(i + 1) % n];
      c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + q[0]) / 2, (pts[i][1] + q[1]) / 2);
    }
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  }
  function snowPatch(c, r, cx, cy, rx, ry) {
    /* подтаявшая кромка, тень с подветренной стороны, тело сугроба, свет сверху-слева */
    var seed = r() * 1e9;
    function shape(dx, dy, kx, ky, fill) {
      var rr = rngFrom(seed);
      blob(c, rr, cx + dx, cy + dy, rx * kx, ry * ky, fill, 22);
    }
    shape(0, 2, 1.07, 1.1, 'rgba(22,28,35,.55)');
    shape(3, 4, 1.0, 1.0, '#6f7c8a');
    shape(0, 0, 0.97, 0.95, '#9eabb8');
    shape(-rx * 0.05, -ry * 0.07, 0.84, 0.8, '#b3bfca');
    shape(-rx * 0.12, -ry * 0.16, 0.6, 0.55, '#c6d0d9');
    for (var i = 0; i < rx * ry / 700; i++) {
      var a = r() * 6.28, d = 0.55 + r() * 0.4;
      c.fillStyle = 'rgba(72,78,80,' + (0.18 + r() * 0.2) + ')';
      c.beginPath();
      c.ellipse(cx + Math.cos(a) * rx * d * 0.85, cy + Math.sin(a) * ry * d * 0.85, 1 + r() * 3.5, 1 + r() * 2, r() * 3, 0, 6.28);
      c.fill();
    }
  }

  function drawWindow(w) {
    var c = bc;
    c.fillStyle = '#aab3b8';
    c.fillRect(w.x - 2, w.y - 2, w.w + 4, w.h + 4);
    if (w.lit) {
      var g = c.createLinearGradient(0, w.y, 0, w.y + w.h);
      g.addColorStop(0, w.tone ? '#ffdc8c' : '#f9d27a');
      g.addColorStop(1, w.tone ? '#e9a24a' : '#e08f3a');
      c.fillStyle = g;
      c.fillRect(w.x, w.y, w.w, w.h);
      c.fillStyle = w.tone ? 'rgba(190,90,70,.45)' : 'rgba(255,240,200,.5)';
      c.fillRect(w.x, w.y, w.w * (w.tone ? 0.32 : 0.24), w.h);
      if (w.tone) c.fillRect(w.x + w.w * 0.72, w.y, w.w * 0.28, w.h);
      c.fillStyle = 'rgba(60,40,20,.55)';
      if (w.plant) { c.fillRect(w.x + w.w * 0.55, w.y + w.h - 8, 7, 8); c.fillRect(w.x + w.w * 0.52, w.y + w.h - 13, 13, 6); }
    } else {
      c.fillStyle = '#161d25';
      c.fillRect(w.x, w.y, w.w, w.h);
      c.fillStyle = 'rgba(120,150,175,.13)';
      c.beginPath();
      c.moveTo(w.x, w.y + w.h * 0.7); c.lineTo(w.x + w.w * 0.6, w.y); c.lineTo(w.x + w.w * 0.85, w.y); c.lineTo(w.x, w.y + w.h);
      c.fill();
    }
    c.fillStyle = '#2a3138';
    c.fillRect(w.x + w.w * 0.5 - 1, w.y, 2, w.h);
    c.fillRect(w.x, w.y + w.h * 0.36, w.w, 1.5);
    c.fillStyle = '#b9c4ca';
    c.fillRect(w.x - 3, w.y + w.h + 2, w.w + 6, 3);
  }

  // Пар выходит из открытой секции двух труб и ближайшего шва бетонных плит.
  var heatVents = [];
  // Полоса бесшовного шума движется вверх внутри расширяющейся струи.
  // Кадры рисуем один раз; в цикле двора остаётся по одному drawImage на щель.
  var steamFrames;
  function makeSteamFrames() {
    var frames = [], grid = [], random = 3719;
    for (var i = 0; i < 256; i++) {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      grid.push(random / 4294967296);
    }
    function noise(x, y) {
      var ix = Math.floor(x), iy = Math.floor(y), u = x - ix, v = y - iy;
      u *= u * (3 - 2 * u); v *= v * (3 - 2 * v);
      var row = (iy & 15) * 16, next = ((iy + 1) & 15) * 16;
      var l = ix & 15, r = (ix + 1) & 15;
      return (grid[row+l]*(1-u) + grid[row+r]*u)*(1-v) + (grid[next+l]*(1-u) + grid[next+r]*u)*v;
    }
    for (var frame = 0; frame < 48; frame++) {
      var canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 80;
      var ctx = canvas.getContext('2d'), pixels = ctx.createImageData(64, 80);
      var phase = frame / 48, angle = phase * 2 * Math.PI;
      for (var y = 0; y < 80; y++) {
        var h = (79 - y) / 79, drift = h * (8 * Math.sin(h*8-angle) + 4*Math.sin(h*13-2*angle));
        for (var x = 0; x < 64; x++) {
          var billow = noise(x/11, y/10 + phase*16);
          var curl = noise(x/6 + billow*2, y/5 + phase*32);
          var offset = (x - 32 - drift - (billow-.5)*13*h) / (2.8 + 13*h);
          var density = Math.exp(-offset*offset*1.55) * Math.pow(1-h, .8) * Math.min(1,h*35);
          var alpha = density * (60 + 170*billow) * (.35 + .65*curl);
          var p = (y*64+x)*4;
          pixels.data[p] = 224; pixels.data[p+1] = 229; pixels.data[p+2] = 232; pixels.data[p+3] = alpha;
        }
      }
      ctx.putImageData(pixels, 0, 0);
      frames.push(canvas);
    }
    return frames;
  }
  function drawVentSteam(wind, darkness) {
    if (!heatVents.length) return;
    if (!steamFrames) steamFrames = makeSteamFrames();
    var scale = Math.min(W/1500, H/750);
    heatVents.forEach(function (vent, i) {
      var pulse = Math.sin(tNow * .85 + i * 2.3);
      var height = (49 + Math.min(vent.w/scale, 48)*.7 + 5*pulse) * scale;
      var width = height * .78;
      var lean = (.12 + wind*.55) * (1 + .14*Math.sin(tNow + i));
      var frame = Math.floor(tNow*(10+i*.6) + i*13) % steamFrames.length;
      fc.save();
      fc.translate(vent.x, vent.y);
      fc.transform(1, 0, -lean, wind === 2 ? .76 : 1, 0, 0);
      fc.globalAlpha = (.81 + .13*pulse) * (1 - .28*darkness);
      fc.drawImage(steamFrames[frame], -width/2, -height, width, height);
      fc.restore();
    });
  }
  var facadeArt = new Image(), roomLight = {};
  function prepareFacade() {
    // Свет проходит сквозь тюль и стекло, тёмная мебель и цветы остаются силуэтами.
    var tints = { amber: '#ffac61', honey: '#ffd49b', tv: '#87b9ff' };
    Object.keys(tints).forEach(function (kind) {
      var c = document.createElement('canvas');
      c.width = facadeArt.width; c.height = facadeArt.height;
      var ctx = c.getContext('2d');
      ctx.filter = 'grayscale(1) brightness(2.6)';
      ctx.drawImage(facadeArt, 0, 0);
      ctx.filter = 'none'; ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = tints[kind]; ctx.fillRect(0, 0, c.width, c.height);
      roomLight[kind] = c;
    });
    if (courtyard && W && H) drawBg();
  }

  function drawBg() {
    if (courtyard) {
      // Изображение и точки взаимодействия растягиваются в одних и тех же долях игрового поля.
      bc.drawImage(courtyard, 0, 0, W, H);
      if (roomLight.amber) bc.drawImage(facadeArt, 0, 0, W, H * facadeArt.height / courtyard.height);
      paintBench();
      refreshPostLayer();
      foreground.forEach(paintFurniture);
      paintShopFronts(true);
      paintEntrance(true);
      // Границы стёкол фасада на исходном холсте 1808×870. Рамы и снег остаются поверх света.
      var glazed = [[29, 24, 50, 56, 78, 80], [200, 24, 221, 228, 252, 80],
        [303, 24, 322, 330, 353, 77], [498, 21, 519, 526, 552, 78],
        [607, 23, 627, 636, 656, 79], [927, 22, 946, 956, 978, 77],
        [1032, 23, 1052, 1062, 1084, 79], [1145, 23, 1165, 1175, 1200, 80]];
      windows = glazed.map(function (g, index) {
        return { x: g[0] * W / 1808, y: g[1] * H / 870, w: (g[4] - g[0]) * W / 1808, h: (g[5] - g[1]) * H / 870,
          source: g, pane1: (g[2] - g[0]) * W / 1808, pane2: (g[3] - g[0]) * W / 1808, lit: index % 3 !== 0, tone: index % 2 === 0 };
      });
      heatVents = [[.861, .198, .014], [.851, .202, .008]].map(function (point) {
        return { x: point[0] * W, y: point[1] * H, w: point[2] * W };
      });
      return;
    }
    var c = bc, r = rngFrom(20261117), i, x, y;
    houseH = Math.max(84, H * 0.15);
    houseW = W * 0.8;
    var ST = (window.GAME_DATA && window.GAME_DATA.walkers && window.GAME_DATA.walkers.street) || { sidewalkTop: 0.862, roadTop: 0.915 };
    var swY = H * ST.sidewalkTop;           // тротуар: полоса между двором и дорогой, по ней ходят прохожие
    roadY = H * ST.roadTop;
    var roadH = H - roadY;

    /* мокрый асфальт */
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3e4852'); g.addColorStop(1, '#333c45');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (i = 0; i < W * H / 420; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.09)';
      c.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2);
    }
    for (i = 0; i < 26; i++) {              // заплатки и потёки
      c.fillStyle = 'rgba(18,22,27,' + (0.08 + r() * 0.1) + ')';
      c.beginPath();
      c.ellipse(r() * W, houseH + r() * (roadY - houseH), 30 + r() * 110, 14 + r() * 40, r() * 3, 0, 6.28);
      c.fill();
    }
    /* трещины */
    c.lineCap = 'round';
    for (i = 0; i < 9; i++) {
      x = r() * W; y = houseH + 20 + r() * (roadY - houseH - 40);
      var a = r() * 6.28;
      c.beginPath(); c.moveTo(x, y);
      for (var s = 0; s < 9; s++) {
        a += (r() - 0.5) * 1.3;
        x += Math.cos(a) * (16 + r() * 26); y += Math.sin(a) * (10 + r() * 18);
        c.lineTo(x, y);
      }
      c.strokeStyle = 'rgba(8,10,12,.55)'; c.lineWidth = 1 + r() * 1.4; c.stroke();
    }
    /* лужи */
    var pud = [[0.64, 0.6, 70, 26], [0.2, 0.74, 54, 18], [0.4, 0.36, 46, 16], [0.84, 0.56, 60, 22], [0.52, 0.8, 40, 13], [0.12, 0.3, 38, 14]];
    for (i = 0; i < pud.length; i++) {
      x = pud[i][0] * W; y = pud[i][1] * H;
      blob(c, r, x, y, pud[i][2], pud[i][3], 'rgba(13,18,25,.82)', 16);
      c.strokeStyle = 'rgba(150,175,195,.16)'; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(x - 6, y - 3, pud[i][2] * 0.6, pud[i][3] * 0.5, 0, 3.5, 5.4); c.stroke();
      c.fillStyle = 'rgba(120,145,165,.1)';
      c.beginPath(); c.ellipse(x + pud[i][2] * 0.2, y + 2, pud[i][2] * 0.35, pud[i][3] * 0.3, 0, 0, 6.28); c.fill();
    }

    /* грязный снег: газоны, края, под домом */
    snowPatch(c, r, W * 0.27, H * 0.51, W * 0.105, H * 0.125);
    snowPatch(c, r, W * 0.75, H * 0.5, W * 0.085, H * 0.11);
    for (x = -20; x < W + 40; x += 90 + r() * 60) snowPatch(c, r, x, swY - 8, 60 + r() * 40, 12 + r() * 8);
    for (y = houseH + 40; y < roadY; y += 70 + r() * 50) {
      snowPatch(c, r, -6, y, 26 + r() * 22, 40 + r() * 20);
      snowPatch(c, r, W + 6, y + 30, 26 + r() * 22, 40 + r() * 20);
    }
    for (x = 20; x < houseW - 20; x += 110 + r() * 80) {
      if (Math.abs(x - W * 0.46) < 120) continue;
      snowPatch(c, r, x, houseH + 16, 50 + r() * 34, 9 + r() * 5);
    }
    snowPatch(c, r, W * 0.9, houseH * 0.55, W * 0.1, houseH * 0.5);
    /* следы по снегу и к подъезду */
    function steps(x0, y0, x1, y1, n) {
      var dx = x1 - x0, dy = y1 - y0, len = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dy, dx);
      for (var k = 0; k < n; k++) {
        var t = k / n, side = (k % 2 ? 1 : -1) * 6;
        c.fillStyle = 'rgba(62,72,82,.75)';
        c.beginPath();
        c.ellipse(x0 + dx * t - dy / len * side, y0 + dy * t + dx / len * side, 7, 3.6, ang, 0, 6.28);
        c.fill();
      }
    }
    steps(W * 0.19, H * 0.41, W * 0.345, H * 0.62, 20);
    steps(W * 0.7, H * 0.42, W * 0.8, H * 0.59, 13);
    /* голое дерево в углу (вид сверху) */
    (function tree(tx, ty) {
      c.strokeStyle = 'rgba(22,24,24,.85)';
      for (var b = 0; b < 11; b++) {
        var a = b / 11 * 6.28 + r() * 0.4, l = 34 + r() * 44;
        var ex = tx + Math.cos(a) * l, ey = ty + Math.sin(a) * l * 0.8;
        c.lineWidth = 3; c.beginPath(); c.moveTo(tx, ty); c.lineTo(ex, ey); c.stroke();
        for (var q = 0; q < 3; q++) {
          var a2 = a + (r() - 0.5) * 1.6, l2 = 10 + r() * 22;
          c.lineWidth = 1.3; c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex + Math.cos(a2) * l2, ey + Math.sin(a2) * l2); c.stroke();
        }
      }
      c.fillStyle = '#1b1c1b'; c.beginPath(); c.arc(tx, ty, 7, 0, 6.28); c.fill();
    })(W * 0.905, Math.max(70, houseH * 0.62));
    /* ворона на снегу */
    (function crow(cx, cy) {
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(cx + 2, cy + 7, 11, 3, 0, 0, 6.28); c.fill();
      c.fillStyle = '#14171a';
      c.beginPath(); c.ellipse(cx, cy, 10, 6, -0.3, 0, 6.28); c.fill();
      c.beginPath(); c.arc(cx - 8, cy - 5, 4.5, 0, 6.28); c.fill();
      c.beginPath(); c.moveTo(cx + 8, cy + 1); c.lineTo(cx + 19, cy + 5); c.lineTo(cx + 9, cy + 5); c.fill();
      c.fillStyle = '#3b4046'; c.beginPath(); c.moveTo(cx - 12, cy - 6); c.lineTo(cx - 18, cy - 4); c.lineTo(cx - 12, cy - 3); c.fill();
      c.fillStyle = '#c9ced2'; c.fillRect(cx - 9.5, cy - 6.5, 1.6, 1.6);
    })(W * 0.235, H * 0.455);
    /* люк */
    x = W * 0.57; y = H * 0.71;
    c.fillStyle = 'rgba(12,16,20,.5)'; c.beginPath(); c.ellipse(x, y + 2, 31, 25, 0, 0, 6.28); c.fill();
    c.fillStyle = '#2c3136'; c.strokeStyle = '#101316'; c.lineWidth = 2.5;
    c.beginPath(); c.ellipse(x, y, 24, 19, 0, 0, 6.28); c.fill(); c.stroke();
    c.lineWidth = 1.5; c.strokeStyle = '#1a1e22';
    for (i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x - 18, y + i * 6); c.lineTo(x + 18, y + i * 6); c.stroke(); }
    c.beginPath(); c.ellipse(x, y, 15, 12, 0, 0, 6.28); c.stroke();

    /* тротуар: плитка чуть светлее асфальта, расчищен */
    c.fillStyle = '#4b5660'; c.fillRect(0, swY, W, roadY - swY);
    g = c.createLinearGradient(0, swY, 0, roadY);
    g.addColorStop(0, 'rgba(0,0,0,.22)'); g.addColorStop(0.3, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(160,185,205,.07)');
    c.fillStyle = g; c.fillRect(0, swY, W, roadY - swY);
    c.fillStyle = 'rgba(16,20,24,.42)';
    for (x = 0; x < W; x += 38) c.fillRect(x + ((x / 38) % 2 ? 0 : 6), swY, 1.5, roadY - swY);
    c.fillRect(0, swY + (roadY - swY) * 0.5, W, 1.5);
    c.fillStyle = 'rgba(14,18,22,.7)'; c.fillRect(0, swY, W, 2);
    for (i = 0; i < W / 9; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.12)'; c.fillRect(r() * W, swY + r() * (roadY - swY), 2 + r() * 5, 1 + r() * 2); }
    for (x = 40; x < W; x += 150 + r() * 190) blob(c, r, x, swY + 6 + r() * (roadY - swY - 16), 16 + r() * 22, 4 + r() * 4, 'rgba(168,180,188,.42)', 10);
    /* дорога */
    c.fillStyle = '#1b2026'; c.fillRect(0, roadY, W, roadH);
    g = c.createLinearGradient(0, roadY, 0, H);
    g.addColorStop(0, 'rgba(110,130,150,.10)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.25)');
    c.fillStyle = g; c.fillRect(0, roadY, W, roadH);
    for (i = 0; i < W / 3; i++) { c.fillStyle = 'rgba(255,255,255,.03)'; c.fillRect(r() * W, roadY + r() * roadH, 2 + r() * 14, 1); }
    c.fillStyle = 'rgba(205,202,184,.72)';
    for (x = -10; x < W; x += 98) c.fillRect(x, roadY + roadH * 0.55, 46 - r() * 8, 4);
    c.fillStyle = '#7a858d'; c.fillRect(0, roadY - 6, W, 7);
    c.fillStyle = '#525b63'; c.fillRect(0, roadY + 1, W, 2);
    c.fillStyle = 'rgba(20,24,28,.6)';
    for (x = 0; x < W; x += 64) c.fillRect(x, roadY - 6, 1.5, 7);
    for (x = 0; x < W; x += 30 + r() * 50) blob(c, r, x, roadY + 7 + r() * 5, 14 + r() * 22, 3 + r() * 4, 'rgba(140,152,160,.5)', 10);

    /* дом */
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, houseH, houseW + 10, 16);
    g = c.createLinearGradient(0, houseH, 0, houseH + 84);
    g.addColorStop(0, 'rgba(6,10,16,.5)'); g.addColorStop(0.4, 'rgba(6,10,16,.2)'); g.addColorStop(1, 'rgba(6,10,16,0)');
    c.fillStyle = g; c.fillRect(0, houseH, houseW + 30, 84);
    g = c.createRadialGradient(W * 0.36, H * 0.42, 0, W * 0.36, H * 0.42, W * 0.62);
    g.addColorStop(0, 'rgba(168,196,220,.13)'); g.addColorStop(1, 'rgba(168,196,220,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    g = c.createRadialGradient(W * 0.5, H * 0.5, H * 0.45, W * 0.5, H * 0.5, W * 0.72);
    g.addColorStop(0, 'rgba(4,8,14,0)'); g.addColorStop(1, 'rgba(4,8,14,.42)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = '#56626c'; c.fillRect(0, 0, houseW, houseH);
    for (x = 0; x < houseW; x += 148) {
      c.fillStyle = 'rgba(0,0,0,' + (0.03 + r() * 0.07) + ')'; c.fillRect(x, 0, 148, houseH);
      c.fillStyle = 'rgba(18,22,26,.5)'; c.fillRect(x, 0, 2, houseH);
    }
    for (i = 0; i < 40; i++) {             // потёки
      x = r() * houseW; c.fillStyle = 'rgba(20,26,30,.16)'; c.fillRect(x, 40 + r() * 30, 2 + r() * 4, 20 + r() * (houseH - 60));
    }
    c.fillStyle = '#7d8890'; c.fillRect(0, houseH - 7, houseW, 7);
    c.fillStyle = '#39424a'; c.fillRect(0, houseH - 9, houseW, 3);
    c.fillStyle = '#2f373e'; c.fillRect(houseW - 3, 0, 5, houseH);
    /* водосточная труба */
    c.fillStyle = '#39434b'; c.fillRect(houseW * 0.335, 40, 7, houseH - 44);
    c.fillStyle = '#242b31'; c.fillRect(houseW * 0.335 - 2, houseH * 0.6, 11, 3);

    /* окна */
    windows = [];
    var top = 52, avail = houseH - top - 14, rows = avail >= 70 ? 2 : 1;
    var wh = Math.min(32, (avail - (rows - 1) * 14) / rows), ww = 40, stepX = 74;
    for (var row = 0; row < rows; row++) {
      for (x = 26; x + ww < houseW - 14; x += stepX) {
        if (Math.abs(x + ww / 2 - W * 0.46) < 62) continue;      // стояк подъезда
        if (Math.abs(x + ww / 2 - houseW * 0.335) < 30) continue; // водосток
        windows.push({ x: x, y: top + row * (wh + 14), w: ww, h: wh, lit: r() < 0.2, tone: r() < 0.4, plant: r() < 0.3 });
      }
    }
    /* окна лестничной клетки над подъездом */
    for (row = 0; row < rows; row++) {
      windows.push({ x: W * 0.46 - 11, y: top + row * (wh + 14), w: 22, h: wh, lit: true, tone: false, plant: false, fixed: true });
    }
    for (i = 0; i < windows.length; i++) drawWindow(windows[i]);

    /* Резервный нарисованный столб имеет ту же высоту и тот же вынос плафона, что и на иллюстрации. */
    streetLamps.forEach(function (post) {
      var x = post.x * W, y = post.y * H, footX = post.footX * W, footY = post.footY * H;
      c.beginPath(); c.moveTo(footX, footY); c.lineTo(footX, y + H * 0.035);
      c.quadraticCurveTo(footX, y - H * 0.02, x, y - H * 0.008);
      c.lineWidth = Math.max(2, H * 0.009); c.strokeStyle = '#252c31'; c.stroke();
      c.lineWidth *= 0.45; c.strokeStyle = '#687478'; c.stroke();
      c.fillStyle = '#3d464b'; c.beginPath(); c.ellipse(x, y, W * 0.009, H * 0.006, 0, 0, 6.28); c.fill();
    });
  }

  /* Иней по краям поля: рисуется один раз на размер окна, дальше им управляет только прозрачность и масштаб (--frost, задаёт game.js).
     Дымка у кромки + папоротниковые кристаллы, растущие от краёв внутрь. Центр остаётся чистым — двор и прохожие читаются. */
  function drawFrost() {
    var top = (document.getElementById('hud') || { offsetHeight: 0 }).offsetHeight, w = field.clientWidth, h = Math.max(1, field.clientHeight - top);
    frostCv.width = w; frostCv.height = h;
    var c = frostCv.getContext('2d'), r = rngFrom(20261118), i, k, g, depth = Math.min(w, h) * 0.2;
    c.clearRect(0, 0, w, h);
    function edge(x0, y0, x1, y1, a) {           // дымка: плотная у кромки, к центру сходит на нет
      g = c.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(196,224,242,' + a + ')'); g.addColorStop(0.4, 'rgba(176,208,230,' + (a * 0.42) + ')'); g.addColorStop(1, 'rgba(176,208,230,0)');
      c.fillStyle = g;
    }
    edge(0, 0, 0, depth, 0.62); c.fillRect(0, 0, w, depth);
    edge(0, h, 0, h - depth, 0.7); c.fillRect(0, h - depth, w, depth);
    edge(0, 0, depth, 0, 0.62); c.fillRect(0, 0, depth, h);
    edge(w, 0, w - depth, 0, 0.62); c.fillRect(w - depth, 0, depth, h);
    [[0, 0], [w, 0], [0, h], [w, h]].forEach(function (p) {     // углы смерзаются сильнее
      g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], depth * 2.4);
      g.addColorStop(0, 'rgba(214,236,250,.62)'); g.addColorStop(0.5, 'rgba(184,214,234,.26)'); g.addColorStop(1, 'rgba(184,214,234,0)');
      c.fillStyle = g; c.fillRect(p[0] - depth * 2.4, p[1] - depth * 2.4, depth * 4.8, depth * 4.8);
    });
    for (i = 0; i < w * h / 520; i++) {          // морозная крупа у кромки
      var sx = r() * w, sy = r() * h, de = Math.min(sx, w - sx, sy, h - sy) / depth;
      if (r() > Math.pow(Math.max(0, 1 - de), 1.6)) continue;
      c.fillStyle = 'rgba(236,246,255,' + (0.25 + r() * 0.45) + ')';
      c.fillRect(sx, sy, 1 + r() * 2.2, 1 + r() * 2.2);
    }
    function fern(x, y, ang, len, lvl) {         // ветка с боковыми побегами
      var ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
      c.lineWidth = lvl === 0 ? 2.2 : (lvl === 1 ? 1.5 : 1);
      c.strokeStyle = 'rgba(' + (lvl === 0 ? '238,248,255' : '222,240,252') + ',' + (0.8 - lvl * 0.14) + ')';
      c.beginPath(); c.moveTo(x, y); c.lineTo(ex, ey); c.stroke();
      if (lvl >= 3 || len < 7) return;
      for (var t = 0.35; t < 0.95; t += 0.3) {
        var bx = x + (ex - x) * t, by = y + (ey - y) * t;
        fern(bx, by, ang + 1.05 + (r() - 0.5) * 0.3, len * 0.42, lvl + 1);
        fern(bx, by, ang - 1.05 + (r() - 0.5) * 0.3, len * 0.42, lvl + 1);
      }
    }
    c.lineCap = 'round';
    function grow(x, y, inward) {
      var near = Math.min(x, w - x, y, h - y), len = 26 + r() * depth * 0.62 * (1 - Math.min(0.5, near / (depth * 3)));
      fern(x, y, inward + (r() - 0.5) * 0.9, len, 0);
    }
    for (k = -10; k < w; k += 30 + r() * 26) { grow(k, 0, Math.PI / 2); grow(k + 12, h, -Math.PI / 2); }
    for (k = -10; k < h; k += 30 + r() * 26) { grow(0, k, 0); grow(w, k + 12, Math.PI); }
    for (i = 0; i < 26; i++) {                   // в углах — гуще
      var cx = r() < 0.5 ? 0 : w, cy = r() < 0.5 ? 0 : h, a0 = Math.atan2(h / 2 - cy, w / 2 - cx);
      fern(cx + (r() - 0.5) * 50, cy + (r() - 0.5) * 50, a0 + (r() - 0.5) * 1.1, 36 + r() * depth * 0.8, 0);
    }
  }
  function resize() {
    W = field.clientWidth; H = field.clientHeight;
    if (!W || !H) return;
    if (frostCv) drawFrost();
    bg.width = fx.width = stepsCv.width = W; bg.height = fx.height = stepsCv.height = H;
    steps = []; lastStep = null;
    drawBg();
    setWindowsFor(field.classList.contains('night'), true);
    flakes = [];
    for (var i = 0; i < MAX_FLAKES; i++) {
      flakes.push({ x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 2.1, vy: 26 + Math.random() * 46, ph: Math.random() * 6.28 });
    }
  }
  function setWindowsFor(night, all) {
    if (courtyard) return;
    var target = night ? 0.6 : 0.14;
    var list = all ? windows : [windows[Math.floor(Math.random() * windows.length)]];
    for (var i = 0; i < list.length; i++) {
      var w = list[i];
      if (!w || w.fixed) continue;
      var lit = Math.random() < target;
      if (lit !== w.lit || all) { w.lit = lit; drawWindow(w); }
    }
  }

  // Сутки фасада начинаются в шесть утра: полуночный телевизор продолжает тот же вечер.
  var smokerArt = new Image(), facadeDay = -1, householdOrder = [], smokeBreaks = [];
  smokerArt.src = 'window-smoker.png';
  function updateApartments(stamp) {
    var day = Math.floor((stamp - 360) / 1440), minute = stamp - day * 1440;
    if (day !== facadeDay) {
      facadeDay = day;
      var roll = rngFrom(8371 + day * 137);
      householdOrder = windows.map(function (_, i) { return i; });
      for (var i = householdOrder.length - 1; i > 0; i--) {
        var j = Math.floor(roll() * (i + 1)), swap = householdOrder[i];
        householdOrder[i] = householdOrder[j]; householdOrder[j] = swap;
      }
      smokeBreaks = [540 + Math.floor(roll()*240), 1020 + Math.floor(roll()*240)];
    }
    householdOrder.forEach(function (id, rank) {
      var w = windows[id];
      var daytime = rank === 0 && minute >= 500 && minute < 930;
      var evening = minute >= 900 + rank * 38 && minute < 1300 + ((rank * 43 + day * 13) % 195);
      w.tv = rank === 2 && minute >= 1450 && minute < 1770;
      w.lit = daytime || evening || w.tv;
      w.smoke = -1;
      var start = rank === 0 ? smokeBreaks[0] : rank === 3 ? smokeBreaks[1] : -100;
      if (minute >= start && minute < start + 44) w.smoke = (minute - start) / 44;
    });
  }

  function drawResident(w, wind, minute) {
    var progress = w.smoke;
    var opening = Math.min(1, progress * 12, (1-progress)*12);
    var x = w.x + w.pane2, width = w.w - w.pane2, height = w.h * .74;
    var y = w.y + w.h - height;
    fc.save();
    fc.translate(x, y); fc.scale(width, height);
    fc.fillStyle = 'rgba(21,22,25,' + .85 * opening + ')';
    fc.fillRect(0, 0, 1, 1);
    fc.save(); fc.beginPath(); fc.rect(0, 0, 1, 1); fc.clip();
    if (smokerArt.naturalWidth) {
      fc.globalAlpha = opening;
      var spriteWidth = height / width * smokerArt.naturalWidth / smokerArt.naturalHeight;
      fc.filter = 'brightness(1.32)';
      fc.drawImage(smokerArt, .20 + .35*(1-opening), .12, spriteWidth, 1);
    }
    fc.restore();
    // Кромка поворачивающейся створки и тёмное стекло в перспективе.
    var edge = 1 - .82 * opening;
    fc.beginPath(); fc.moveTo(0,0); fc.lineTo(edge, .09*opening);
    fc.lineTo(edge, 1-.08*opening); fc.lineTo(0,1); fc.closePath();
    fc.fillStyle = 'rgba(118,133,145,.22)'; fc.fill();
    fc.strokeStyle = '#746e65'; fc.lineWidth = .047; fc.stroke();
    if (opening > .85) {
      var puff = ((minute + progress * 15) % 13) / 13;
      fc.fillStyle = 'rgba(247,145,75,' + (.42 + .46*(1-puff)) + ')';
      fc.fillRect(.20,.49,.075,.035);
      if (!steamFrames) steamFrames = makeSteamFrames();
      fc.translate(.21, .50);
      fc.transform(1, 0, .24 + wind*.18, 1, 0, 0);
      fc.globalAlpha = .16 + .44*Math.sin(Math.PI*puff);
      fc.drawImage(steamFrames[Math.floor(minute*5)%steamFrames.length], -.67, -1.05, 1.34, 1.05);
    }
    fc.restore();
  }

  function centerOf(el, fr) {
    var r = el.getBoundingClientRect();
    return { x: r.left - fr.left + r.width / 2, y: r.top - fr.top + r.height / 2 };
  }
  function cut(x, y, rad, a) {
    var g = fc.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(0,0,0,' + (0.96 * a) + ')');
    g.addColorStop(0.45, 'rgba(0,0,0,' + (0.72 * a) + ')');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    fc.fillStyle = g;
    fc.beginPath(); fc.arc(x, y, rad, 0, 6.28); fc.fill();
  }
  function glow(x, y, rad, a, col) {
    var g = fc.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(' + col + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + col + ',0)');
    fc.fillStyle = g;
    fc.beginPath(); fc.arc(x, y, rad, 0, 6.28); fc.fill();
  }

  // Плафон светится на высоте, а свет ложится широким овалом на тротуар под его выносом.
  function drawStreetLighting(k, cutDarkness) {
    streetLamps.forEach(function (post) {
      var x = post.x * W, y = post.y * H;
      var height = post.footY - post.y;
      fc.save();
      fc.translate(x, (post.footY + 0.022) * H);
      fc.scale(W * height * 0.41, H * height * 0.18);
      if (cutDarkness) cut(0, 0, 1, 0.86);
      else glow(0, 0, 1, 0.28 * k, '255,200,124');
      fc.restore();
      if (cutDarkness) return;
      var halo = Math.max(6, Math.min(W * 0.036, H * 0.066));
      glow(x, y, halo, 0.44 * k, '255,205,136');
      glow(x, y, halo * 0.35, 0.65 * k, '255,229,179');
      fc.fillStyle = 'rgba(255,239,197,' + 0.92 * k + ')';
      fc.beginPath(); fc.ellipse(x, y, W * 0.0053, H * 0.0028, 0, 0, Math.PI * 2); fc.fill();
    });
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016);
    lastT = t; tNow += dt;
    if (field.clientWidth !== W || field.clientHeight !== H) resize();
    if (!W) return;
    paintShopFronts(false);
    paintEntrance(false);
    if (postLayer) {
      if (postLayer.parentNode !== tiles) {
        tiles.appendChild(postLayer);
        foreground.forEach(function (cutout) { tiles.appendChild(cutout.canvas); });
      }
      for (var child = tiles.firstElementChild; child; child = child.nextElementSibling) {
        if (!child.classList.contains('tile') && !child.classList.contains('bus')) continue;
        var x = parseFloat(child.style.left) / W;
        var post = x < 0.5 ? streetLamps[0] : streetLamps[1];
        var shop = x < 0.5 ? kioskFront : recycleFront;
        var footY = parseFloat(child.style.top) / H;
        var streetY = x >= stopFront.depthLeft && x <= stopFront.depthRight ? stopFront.frontY : post.footY;
        var depth = footY >= streetY ? 'street' : footY >= shop.frontY ? 'pavement' :
          footY >= tableFront.frontY ? 'yard' : footY >= 0.294 || child.classList.contains('sitting') ? 'path' : 'back';
        if (x > .745 && x < .86 && footY >= binFront.frontY && depth === 'path') depth = 'yard';
        if (child.dataset.depth !== depth) child.dataset.depth = depth;
      }
    }
    var night = field.classList.contains('night');
    if (!weatherEl) weatherEl = document.getElementById('weather');
    var wind = weatherEl ? Math.min(2, +weatherEl.dataset.wind || 0) : 0;
    var precip = weatherEl && weatherEl.dataset.precip ? weatherEl.dataset.precip : 'snow';
    var clear = weatherEl && weatherEl.dataset.type === 'calm';
    if (wind !== lastWind) { lastWind = wind; document.body.style.setProperty('--lean', FLAME_LEAN[wind]); }
    dark += ((night ? (clear ? CLEAR_NIGHT : NIGHT) : 0) - dark) * Math.min(1, dt * 0.5);
    var bandDark = dark.toFixed(2);
    if (bandDark !== lastBandDark) {
      field.parentElement.style.setProperty('--facade-night', bandDark);
      lastBandDark = bandDark;
    }
    var k = Math.min(1, dark / NIGHT), i, p;
    var fr = field.getBoundingClientRect();

    var clock = document.getElementById('clock');
    var facadeMinute = Number(clock.dataset.minute || 1920);
    if (courtyard) updateApartments(facadeMinute);
    winTimer -= dt;
    if (winTimer <= 0) { winTimer = 0.8 + Math.random() * 2.4; setWindowsFor(night, false); }
    if (kioskDim > 0) kioskDim -= dt; else if (Math.random() < dt * 0.35) kioskDim = 0.07 + Math.random() * 0.12;

    /* источники света */
    var lights = [];
    var doorEl = document.getElementById('place-entrance');
    var doorOpen = doorEl && doorEl.classList.contains('door-open');
    var el;
    if (doorEl) {
      p = courtyard ? { x: W * 828 / 1808, y: H * 183 / 870 } : centerOf(doorEl, fr);
      lights.push({ x: p.x, y: p.y, r: doorOpen ? 174 : 115, a: doorOpen ? 1 : 0.95, w: doorOpen ? 0.17 : 0.10 });
    }
    el = document.getElementById('place-kiosk');
    if (el) { p = centerOf(el, fr); lights.push({ x: p.x - 6, y: p.y - 8, r: el.classList.contains('closed') ? 100 : 150, a: kioskDim > 0 ? 0.5 : (el.classList.contains('closed') ? 0.8 : 0.95), w: el.classList.contains('closed') ? 0.07 : 0.12 }); }
    /* слабый собственный свет мест: темнота остаётся, но место и подпись находятся сразу */
    el = document.getElementById('place-recycle');
    if (el) { p = centerOf(el, fr); lights.push({ x: p.x, y: p.y + 2, r: 136, a: 0.78, w: 0.075 }); }
    el = document.getElementById('place-bin');
    if (el) { p = centerOf(el, fr); lights.push({ x: p.x, y: p.y, r: 132, a: 0.58, w: 0.035 }); }
    el = document.getElementById('place-pipe');
    if (el) { p = centerOf(el, fr); lights.push({ x: p.x, y: p.y, r: 136, a: 0.58, w: 0 }); }
    el = document.getElementById('place-bench');
    if (el) { p = centerOf(el, fr); lights.push({ x: p.x, y: p.y, r: 120, a: 0.4, w: 0 }); }
    el = document.getElementById('place-den');      // правка 022: лаз чуть различим ночью; обустроенный — с тёплой щелью
    if (el) { p = centerOf(el, fr); lights.push({ x: p.x - 20, y: p.y - 10, r: 110, a: 0.5, w: el.classList.contains('stage-0') ? 0 : 0.05 }); }
    el = document.getElementById('place-stall');
    if (el) { p = centerOf(el, fr); lights.push({ x: p.x, y: p.y, r: 124, a: 0.45, w: 0 }); }
    /* герой виден всегда; предметы и встречные на земле различимы */
    var heroEl = document.querySelector('.tile.hero');
    animateWindowCat(heroEl, t);
    drawActorGait(heroEl, t, true);
    var people = tiles.querySelectorAll('.walker:not(.gone), .npc-cop:not(.gone)');
    for (i = 0; i < people.length; i++) drawActorGait(people[i], t, false);
    if (heroEl) { p = centerOf(heroEl, fr); lights.push({ x: p.x, y: p.y, r: 104, a: 0.62, w: 0.03 }); }
    /* прохожие: своё слабое пятно света, как у героя, но меньше — ночью их видно и типы различимы */
    var walkers = document.querySelectorAll('.tile.walker:not(.gone)');
    for (i = 0; i < walkers.length && i < 12; i++) {
      p = centerOf(walkers[i], fr);
      lights.push({ x: p.x, y: p.y, r: 80, a: 0.6, w: 0.012 });
    }
    el = document.getElementById('bus-stop');
    if (el) { p = centerOf(el, fr); lights.push({ x: p.x, y: p.y + 4, r: 122, a: 0.74, w: 0.07 }); }
    el = document.getElementById('bus');
    if (el) {                               // автобус: салон виден, фары светят вперёд
      p = centerOf(el, fr);
      lights.push({ x: p.x, y: p.y, r: 150, a: 0.8, w: 0.03 });
      lights.push({ x: p.x - el.offsetWidth * 0.58, y: p.y + el.offsetHeight * 0.17, r: 170, a: 0.9, w: 0.2 });
    }
    el = document.getElementById('road-traffic');
    if (el) {
      p = centerOf(el, fr);
      var isBus = el.dataset.kind === 'bus';
      if (isBus) lights.push({ x: p.x, y: p.y, r: 150, a: 0.8, w: 0.03 });
      lights.push({ x: p.x + Number(el.dataset.dir) * el.offsetWidth * 0.58, y: p.y + el.offsetHeight * 0.17,
        r: isBus ? 170 : 85, a: 0.9, w: 0.2 });
    }
    var small = document.querySelectorAll('.tile.item:not(.item-fire):not(.gone), .tile.npc:not(.walker):not(.gone)');
    for (i = 0; i < small.length && i < 28; i++) {
      p = centerOf(small[i], fr);
      lights.push({ x: p.x, y: p.y + 4, r: 58, a: 0.5, w: 0 });
    }
    var fires = document.querySelectorAll('.tile.item-fire:not(.gone)');
    for (i = 0; i < fires.length; i++) {
      p = centerOf(fires[i], fr);
      var fl = 0.9 + 0.07 * Math.sin(tNow * 13 + i) + 0.05 * Math.sin(tNow * 31.7) + Math.random() * 0.04;
      lights.push({ x: p.x, y: p.y, r: 190 * fl, a: 1, w: 0.24, fire: true });
    }

    /* следы героя: остаются на снегу и асфальте, тают; в метель заметает быстрее. Плюс пунктир к цели маршрута */
    var foot = heroEl ? centerOf(heroEl, fr) : null, wetNow = precip === 'sleet';
    if (foot) {
      foot.y += heroEl.classList.contains('hero-atlas') && !heroEl.classList.contains('asleep') ? heroEl.offsetHeight / 2 : 30;
      if (!lastStep) lastStep = { x: foot.x, y: foot.y };
      var sdx = foot.x - lastStep.x, sdy = foot.y - lastStep.y, sd = Math.sqrt(sdx * sdx + sdy * sdy);
      if (sd > 90) lastStep = { x: foot.x, y: foot.y };
      else if (sd >= STEP_PX) {
        var ang = Math.atan2(sdy, sdx);
        stepSide = -stepSide;
        steps.push({ x: foot.x - Math.sin(ang) * 5 * stepSide, y: foot.y + Math.cos(ang) * 4 * stepSide, a: ang, t: 0 });
        if (steps.length > STEP_MAX) steps.shift();
        lastStep = { x: foot.x, y: foot.y };
      }
    }
    var stepLife = precip === 'none' ? (wind === 2 ? 7 : 16) : (wind === 2 ? 4 : (wetNow ? 8 : 10));
    var markerEl = document.getElementById('walk-marker');
    var markerOn = markerEl && !markerEl.classList.contains('hidden') && foot;
    if (steps.length || markerOn || stepsDirty) {
      sc.clearRect(0, 0, W, H);
      stepsDirty = steps.length > 0 || !!markerOn;
      for (i = steps.length - 1; i >= 0; i--) {
        var st = steps[i];
        st.t += dt;
        if (st.t >= stepLife) { steps.splice(i, 1); continue; }
        sc.fillStyle = 'rgba(16,22,28,' + (0.5 * (1 - st.t / stepLife)) + ')';
        sc.beginPath(); sc.ellipse(st.x, st.y, 6, 3, st.a, 0, 6.28); sc.fill();
      }
      if (markerOn) {
        var mp = centerOf(markerEl, fr);
        sc.strokeStyle = 'rgba(255,200,120,.5)'; sc.lineWidth = 2; sc.setLineDash([7, 8]); sc.lineDashOffset = -tNow * 24;
        sc.beginPath(); sc.moveTo(foot.x, foot.y); sc.lineTo(mp.x, mp.y); sc.stroke();
        sc.setLineDash([]);
      }
    }

    fc.clearRect(0, 0, W, H);
    if (dark > 0.004) {
      fc.globalCompositeOperation = 'source-over';
      fc.fillStyle = 'rgba(5,9,20,' + dark + ')';
      fc.fillRect(0, 0, W, H);
      fc.globalCompositeOperation = 'destination-out';
      for (i = 0; i < lights.length; i++) cut(lights[i].x, lights[i].y, lights[i].r, lights[i].a);
      drawStreetLighting(k, true);
      fc.fillStyle = 'rgba(0,0,0,.93)';
      for (i = 0; i < windows.length; i++) {
        var w = windows[i];
        if (w.lit) fc.fillRect(w.x, w.y, w.w, w.h);
      }
      fc.fillStyle = 'rgba(0,0,0,.16)';   // свет из окон на стену и под дом
      for (i = 0; i < windows.length; i++) {
        w = windows[i];
        if (w.lit) fc.fillRect(w.x - 9, w.y - 7, w.w + 18, w.h + 22);
      }
    }
    /* тёплый свет поверх */
    fc.globalCompositeOperation = 'lighter';
    if (courtyard) {
      windows.forEach(function (win) {
        if (!win.lit) return;
        var tint = win.tv ? '102,164,235' : win.tone ? '255,167,85' : '255,204,137';
        var power = win.tv ? .32 + .09*Math.sin(facadeMinute*1.9) + .06*Math.sin(facadeMinute*.81) : .26 + .52*k;
        glow(win.x + win.w / 2, win.y + win.h / 2, win.w * 1.15, 0.25 * power, tint);
        var surface = roomLight[win.tv ? 'tv' : win.tone ? 'amber' : 'honey'];
        if (!surface) return;
        var g = win.source;
        fc.save();
        fc.beginPath();
        fc.rect(win.x, win.y, win.pane1, win.h * .31);
        fc.rect(win.x, win.y + win.h * .38, win.pane1, win.h * .62);
        fc.rect(win.x + win.pane2, win.y, win.w - win.pane2, win.h);
        fc.clip(); fc.globalAlpha = power;
        fc.drawImage(surface, g[0], g[1], g[4]-g[0], g[5]-g[1], win.x, win.y, win.w, win.h);
        fc.restore();
      });
    }
    for (i = 0; i < lights.length; i++) {
      var L = lights[i], aa = L.w * L.a * (L.fire ? Math.max(0.45, k) : k);
      if (L.w > 0 && aa > 0.004) glow(L.x, L.y, L.r * 0.95, aa, L.fire ? '255,150,60' : '255,184,96');
    }
    if (doorOpen && k > 0.03) {
      // Полоса тёплого света начинается на пороге, под полотном за наличник не заходит.
      var dp = centerOf(doorEl, fr);
      var gx = courtyard ? W * 828 / 1808 : dp.x - 4, gy = courtyard ? H * 230 / 870 : dp.y + 22;
      var halfGap = courtyard ? W * 14 / 1808 : 12, spill = courtyard ? H * 0.105 : 85;
      var gr = fc.createLinearGradient(0, gy, 0, gy + spill);
      gr.addColorStop(0, 'rgba(255,204,127,' + 0.23 * k + ')'); gr.addColorStop(1, 'rgba(255,204,127,0)');
      fc.fillStyle = gr;
      fc.beginPath(); fc.moveTo(gx - halfGap, gy); fc.lineTo(gx + halfGap, gy);
      fc.lineTo(gx + 3.5 * halfGap, gy + spill); fc.lineTo(gx - 2.5 * halfGap, gy + spill); fc.closePath(); fc.fill();
    }
    if (k > 0.01) drawStreetLighting(k, false);
    fc.globalCompositeOperation = 'source-over';

    /* пар: теплотрасса, люк, дыхание героя */
    if (courtyard) windows.forEach(function (w) {
      if (w.smoke >= 0) drawResident(w, wind, facadeMinute);
    });
    drawVentSteam(wind, k);
    if (!courtyard && Math.random() < dt * 3) puffs.push({ x: W * 0.57 - 10 + Math.random() * 20, y: H * 0.71 - 4, vx: 8 + Math.random() * 6, vy: -12 - Math.random() * 8, t: 0, max: 2 + Math.random(), r0: 4, r1: 18, a: 0.12 });
    breathT -= dt;
    var hero = document.querySelector('.tile.hero');
    var warmEl = document.getElementById('stat-warmth-value');
    if (hero && warmEl && breathT <= 0) {
      var warmth = parseInt(warmEl.textContent, 10);
      breathT = 2.4 + Math.random() * 1.2;
      if (warmth < 50) {
        p = centerOf(hero, fr);
        var asleep = hero.classList.contains('asleep');
        for (i = 0; i < 3; i++) {
          puffs.push({ x: p.x + (asleep ? -22 : 9) + i * 3, y: p.y + (asleep ? 2 : -18), vx: (asleep ? -8 : 12) + Math.random() * 6, vy: -7 - Math.random() * 5, t: -i * 0.12, max: 1.1 + Math.random() * 0.4, r0: 2.5, r1: 9 + Math.random() * 3, a: 0.34 });
        }
      }
    }
    for (i = puffs.length - 1; i >= 0; i--) {
      var f = puffs[i];
      f.t += dt;
      if (f.t >= f.max) { puffs.splice(i, 1); continue; }
      if (f.t < 0) continue;
      f.x += (f.vx + STEAM_PUSH[wind]) * dt; f.y += f.vy * (wind === 2 ? 0.45 : 1) * dt;
      var q = f.t / f.max;
      fc.fillStyle = 'rgba(206,216,224,' + (f.a * (1 - q) * (1 - 0.35 * k) * (wind === 2 ? 0.6 : 1)) + ')';
      fc.beginPath(); fc.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * q, 0, 6.28); fc.fill();
    }

    /* осадки и ветер: нет осадков — чисто (в сильный ветер метёт позёмку), снег — хлопья,
       мокрый снег — тяжёлые косые штрихи, сильный ветер — почти горизонтально */
    var blow = wind === 2, wet = precip === 'sleet', dry = precip === 'none';
    var target = dry ? (blow ? 60 : 0) : (blow ? MAX_FLAKES : (wet ? 170 : 120 + 50 * k));
    flakeN += (target - flakeN) * Math.min(1, dt * 1.5);
    var n = Math.min(flakes.length, Math.round(flakeN));
    var windV = WIND_PX[wind] * (1 + 0.25 * Math.sin(tNow * 0.7)) + 6 * Math.sin(tNow * 0.23);
    var vyMul = wet ? 1.9 : (blow ? 1.2 : 1);
    var lr = Math.min(W * 0.065, H * 0.13), lr2 = lr * lr, s, vx, vy;
    if (blow || wet) {
      fc.beginPath();
      for (i = 0; i < n; i++) {
        s = flakes[i];
        vx = windV + Math.sin(tNow * 1.3 + s.ph) * 14; vy = s.vy * vyMul * (dry ? 0.25 : 1);
        s.x += vx * dt; s.y += vy * dt;
        if (s.y > H + 4) { s.y = -4; s.x = Math.random() * W; }
        if (s.x > W + 4) { s.x = -4; s.y = Math.random() * H; }
        fc.moveTo(s.x, s.y);
        fc.lineTo(s.x - vx * (wet ? 0.03 : 0.045), s.y - vy * (wet ? 0.03 : 0.045));
      }
      fc.strokeStyle = wet ? 'rgba(186,204,220,' + (0.62 - 0.2 * k) + ')' : 'rgba(228,236,242,' + ((dry ? 0.3 : 0.62) - 0.18 * k) + ')';
      fc.lineWidth = wet ? 1.6 : 1.3;
      fc.lineCap = 'round';
      fc.stroke();
    } else {
      for (i = 0; i < n; i++) {
        s = flakes[i];
        s.y += s.vy * dt;
        s.x += (windV + Math.sin(tNow * 1.3 + s.ph) * 14) * dt;
        if (s.y > H + 4) { s.y = -4; s.x = Math.random() * W; }
        if (s.x > W + 4) { s.x = -4; s.y = Math.random() * H; }
        var nearestLamp = s.x < W / 2 ? streetLamps[0] : streetLamps[1];
        var dx = s.x - nearestLamp.x * W, dy = s.y - nearestLamp.y * H;
        if (k > 0.2 && dx * dx + dy * dy < lr2) fc.fillStyle = 'rgba(255,228,176,' + (0.55 + 0.4 * k) + ')';
        else fc.fillStyle = 'rgba(226,234,240,' + (0.78 - 0.4 * k) + ')';
        fc.beginPath(); fc.arc(s.x, s.y, s.r, 0, 6.28); fc.fill();
      }
    }
  }

  function init() {
    field = document.getElementById('field');
    if (!field) return;
    tiles = document.getElementById('layer-tiles');
    var blocks = window.GAME_DATA.navigation.blocks;
    foregroundOccluders.forEach(function (part) {
      var id = part.shop ? part.shop.id : part.block || 'busStop';
      var box = blocks.find(function (block) { return block.id === id; });
      part.frontY = box.bottom;
      if (part === stopFront) {
        var side = (box.right - box.left) / 2;
        part.depthLeft = box.left - side;
        part.depthRight = box.right + side;
      }
    });
    window.BomzhArt = { foregroundCoversPoint: foregroundCoversPoint };
    buildSpriteCss();
    bg = document.createElement('canvas'); bg.id = 'art-bg'; bg.className = 'art-layer';
    fx = document.createElement('canvas'); fx.id = 'art-fx'; fx.className = 'art-layer';
    stepsCv = document.createElement('canvas'); stepsCv.id = 'art-steps'; stepsCv.className = 'art-layer';
    frostCv = document.createElement('canvas'); frostCv.id = 'art-frost'; frostCv.className = 'art-layer';
    field.insertBefore(stepsCv, field.firstChild);
    field.insertBefore(bg, field.firstChild);
    sc = stepsCv.getContext('2d');
    field.appendChild(fx);
    field.appendChild(frostCv);
    bc = bg.getContext('2d'); fc = fx.getContext('2d');
    resize();
    var plate = new Image();
    var atlas = new Image();
    atlas.onload = function () {
      walkAtlasReady = atlas.naturalWidth === 640 && atlas.naturalHeight === 480;
      if (!walkAtlasReady) field.classList.add('walk-art-unavailable');
    };
    atlas.onerror = plate.onerror = function () { field.classList.add('walk-art-unavailable'); };
    atlas.src = 'hero-walk.webp?v=029';
    var npcAtlas = new Image();
    npcAtlas.onload = function () { npcAtlasReady = npcAtlas.naturalWidth === 640 && npcAtlas.naturalHeight === 3520; };
    npcAtlas.src = 'npc-walk.webp';
    plate.onload = function () {
      courtyard = plate;
      mountWindowCat();
      if (W && H) drawBg();
      field.classList.add('painted-courtyard');
    };
    facadeArt.onload = prepareFacade;
    facadeArt.src = 'facade-windows.webp?v=040-yard';
    plate.src = 'courtyard.webp?v=040-pipe-seat';
    var benchImage = new Image();
    benchImage.onload = function () {
      benchPatch.image = benchImage;
      field.classList.add('lowered-bench');
      if (courtyard && W && H) {
        paintBench();
        paintFurniture(benchFront);
      }
    };
    benchImage.src = 'courtyard-bench.png';
    var shutters = new Image();
    shutters.onload = function () { closedShopArt = shutters; if (W && H) paintShopFronts(true); };
    shutters.src = 'shops-closed.webp';
    var openDoor = new Image();
    openDoor.onload = function () { openDoorArt = openDoor; if (W && H) paintEntrance(true); };
    openDoor.src = 'entrance-open.webp?v=028';
    dark = field.classList.contains('night') ? NIGHT : 0;
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
