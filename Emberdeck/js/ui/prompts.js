// Emberdeck — prompts.js
// Tutorial prompt bubble (#prompt-overlay): fires from level.promptZones on
// first overlap, or via direct ED.Prompts.show() calls from level scripts
// (e.g. dagger pickup, gate-unlock message). Dismissed by J (contextual
// confirm) or by walking 24px away from where it appeared.
(function () {
  var ED = (window.ED = window.ED || {});

  var el = null;
  var visible = false;
  var originX = 0;

  var Prompts = {
    init: function () {
      el = document.getElementById('prompt-overlay');
      var P = ED.Renderer.PALETTE;
      el.innerHTML =
        '<div id="prompt-box" style="position:absolute;left:12.5%;top:77.8%;width:75%;min-height:17.8%;' +
        'background:rgba(13,10,20,0.9);border:1px solid ' + P.bone + ';border-radius:4px;color:' + P.bone +
        ';font-size:1.4vh;padding:4px 8px;box-sizing:border-box;opacity:0;transition:opacity 0.2s;pointer-events:none;">' +
        '<div id="prompt-text"></div>' +
        '<div style="position:absolute;right:4px;bottom:4px;font-size:1vh;border:1px solid ' + P.bone + ';border-radius:2px;padding:1px 4px;">J</div>' +
        '</div>';
    },

    show: function (text) {
      var box = document.getElementById('prompt-box');
      var textEl = document.getElementById('prompt-text');
      if (!box) return;
      textEl.textContent = text;
      box.style.opacity = '1';
      visible = true;
      var player = ED.Core.gameState.player;
      originX = player ? player.x : 0;
    },

    hide: function () {
      var box = document.getElementById('prompt-box');
      if (box) box.style.opacity = '0';
      visible = false;
    },

    update: function (dt, level, player) {
      if (!visible) {
        this.checkZones(level, player);
        return;
      }
      if (ED.Input.isConfirmPressed()) {
        this.hide();
        return;
      }
      if (Math.abs(player.x - originX) > 24) {
        this.hide();
      }
    },

    checkZones: function (level, player) {
      var zones = level.promptZones || [];
      var footRow = Math.floor((player.y + player.h + 1) / 16);
      var col = Math.floor(player.centerX() / 16);
      for (var i = 0; i < zones.length; i++) {
        var z = zones[i];
        var flagKey = 'tutorial.prompt.' + z.id + '.seen';
        if (level.flags[flagKey]) continue;
        if (footRow === z.row && col >= z.colStart && col <= z.colEnd) {
          level.flags[flagKey] = true;
          this.show(z.text);
          return;
        }
      }
    },
  };

  ED.Prompts = Prompts;
})();
