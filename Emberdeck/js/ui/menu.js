// Emberdeck — menu.js
// Title screen and pause menu: keyboard-only (W/S move, J/Enter confirm,
// Escape resumes from pause), per docs/ui-visual-spec.md §9. Actual actions
// (new game, continue, quit) are delegated to ED.Game, assembled in main.js.
(function () {
  var ED = (window.ED = window.ED || {});

  var rootEl = null;
  var selected = 0;
  var screen = null; // 'title' | 'pause'

  function optionsFor(screenName) {
    if (screenName === 'title') {
      var hasSave = ED.Save.exists(ED.Core.gameState.saveSlot);
      return [
        { id: 'new', label: 'NEUES SPIEL', enabled: true },
        { id: 'continue', label: 'FORTSETZEN', enabled: hasSave },
      ];
    }
    var nearShrine = ED.Game.isPlayerNearShrine ? ED.Game.isPlayerNearShrine() : false;
    return [
      { id: 'resume', label: 'WEITER', enabled: true },
      { id: 'characterBuilding', label: 'CHARAKTER-AUSBAU', enabled: true },
      { id: 'save', label: nearShrine ? 'SPEICHERN' : 'SPEICHERN (nur am Schrein)', enabled: nearShrine },
      { id: 'quit', label: 'ZUM TITEL', enabled: true },
    ];
  }

  function render() {
    var P = ED.Renderer.PALETTE;
    var opts = optionsFor(screen);
    var summary = ED.Core.gameState.runSummary;
    var html = '<div style="text-align:center;color:' + P.bone + ';font-family:inherit;">';
    if (screen === 'title') {
      html += '<div style="font-size:4vh;color:' + P.ember + ';margin-bottom:2vh;">EMBERDECK</div>';
      if (summary) {
        html +=
          '<div style="font-size:1.4vh;color:' + P.gold + ';margin-bottom:2vh;">Letzter Lauf: ' +
          summary.gold + ' Gold · ' + summary.cardsPersisted + ' Karte(n) dauerhaft freigeschaltet</div>';
      }
    } else {
      html += '<div style="font-size:2.2vh;margin-bottom:2vh;">PAUSE</div>';
    }
    opts.forEach(function (opt, idx) {
      var isSel = idx === selected;
      var color = !opt.enabled ? P.stoneLight : isSel ? P.leaf : P.bone;
      html +=
        '<div style="font-size:1.6vh;padding:0.4vh;color:' + color + ';">' +
        (isSel ? '&gt; ' : '') + opt.label + '</div>';
    });
    html += '</div>';
    rootEl.innerHTML = html;
  }

  var Menu = {
    openTitle: function () {
      rootEl = document.getElementById('menu-overlay');
      rootEl.classList.remove('hidden');
      screen = 'title';
      selected = 0;
      render();
    },

    openPause: function () {
      rootEl = document.getElementById('menu-overlay');
      rootEl.classList.remove('hidden');
      screen = 'pause';
      selected = 0;
      render();
    },

    close: function () {
      if (rootEl) {
        rootEl.classList.add('hidden');
        rootEl.innerHTML = '';
      }
    },

    update: function () {
      var Input = ED.Input;
      var opts = optionsFor(screen);
      var changed = false;

      if (Input.wasPressed('jump')) {
        selected = Math.max(0, selected - 1);
        changed = true;
        if (ED.Audio) ED.Audio.menuMove();
      } else if (Input.wasPressed('crouch')) {
        selected = Math.min(opts.length - 1, selected + 1);
        changed = true;
        if (ED.Audio) ED.Audio.menuMove();
      } else if (Input.wasPressed('confirm')) {
        this.confirm(opts[selected]);
        return;
      } else if (screen === 'pause' && Input.wasPressed('pause')) {
        ED.Game.resumeFromPause();
        return;
      }

      if (changed) render();
    },

    confirm: function (opt) {
      if (!opt || !opt.enabled) return;
      if (ED.Audio) ED.Audio.menuConfirm();
      if (screen === 'title') {
        if (opt.id === 'new') ED.Game.startNewGame();
        else if (opt.id === 'continue') ED.Game.continueGame();
      } else {
        if (opt.id === 'resume') ED.Game.resumeFromPause();
        else if (opt.id === 'characterBuilding') ED.Game.goToCharacterBuildingFromPause();
        else if (opt.id === 'save') ED.Game.saveFromPause();
        else if (opt.id === 'quit') ED.Game.quitToTitle();
      }
    },
  };

  ED.Menu = Menu;
})();
