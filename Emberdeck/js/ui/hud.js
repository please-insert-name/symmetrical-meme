// Emberdeck — hud.js
// DOM-driven HUD overlay: health bar, gold counter, 4 card slots (I/J/K/L)
// with cooldown-dim + empty-slot states, "SAVED" flash, and reward popups.
// Positions are percentages of the overlay box, computed from the canvas-
// space (320x180) values in docs/ui-visual-spec.md §4.
(function () {
  var ED = (window.ED = window.ED || {});

  var el = {};
  var slotKeys = ['I', 'J', 'K', 'L'];
  var savedFlashTimer = 0;

  function pctX(px) {
    return (px / 320) * 100 + '%';
  }
  function pctY(px) {
    return (px / 180) * 100 + '%';
  }
  function pctW(px) {
    return (px / 320) * 100 + '%';
  }
  function pctH(px) {
    return (px / 180) * 100 + '%';
  }

  var HUD = {
    init: function () {
      var root = document.getElementById('hud-overlay');
      var P = ED.Renderer.PALETTE;
      root.innerHTML =
        '<div id="hp-box" style="position:absolute;left:' + pctX(6) + ';top:' + pctY(6) + ';width:' + pctW(64) + ';height:' + pctH(8) + ';border:1px solid ' + P.bone + ';background:' + P.bloodDark + ';">' +
        '<div id="hp-fill" style="position:absolute;left:1px;top:1px;bottom:1px;background:' + P.blood + ';"></div></div>' +
        '<div id="gold-box" style="position:absolute;left:' + pctX(6) + ';top:' + pctY(16) + ';font-size:1.4vh;color:' + P.gold + ';">x0</div>' +
        '<div id="save-flash" style="position:absolute;left:50%;top:' + pctY(20) + ';transform:translateX(-50%);font-size:1.6vh;color:' + P.leaf + ';opacity:0;transition:opacity 0.2s;">GESPEICHERT</div>' +
        '<div id="card-slots" style="position:absolute;left:' + pctX(114) + ';top:' + pctY(154) + ';width:' + pctW(92) + ';height:' + pctH(20) + ';display:flex;gap:' + pctW(4) + ';"></div>' +
        '<div id="reward-popup" style="position:absolute;display:none;background:rgba(13,10,20,0.9);border:1px solid ' + P.bone + ';color:' + P.bone + ';font-size:1.2vh;padding:4px;border-radius:2px;"></div>';

      el.hpFill = document.getElementById('hp-fill');
      el.gold = document.getElementById('gold-box');
      el.saveFlash = document.getElementById('save-flash');
      el.slotsRoot = document.getElementById('card-slots');
      el.rewardPopup = document.getElementById('reward-popup');

      el.slots = [];
      for (var i = 0; i < 4; i++) {
        var box = document.createElement('div');
        box.style.cssText =
          'position:relative;flex:1;border:1px solid ' + P.bone + ';background:rgba(13,10,20,0.7);';
        box.innerHTML =
          '<div class="slot-letter" style="position:absolute;left:2px;top:1px;font-size:1vh;color:' + P.bone + ';z-index:3;">' + slotKeys[i] + '</div>' +
          '<div class="slot-icon" style="position:absolute;left:15%;top:20%;width:60%;height:60%;background:' + P.stone + ';border:1px dashed ' + P.ink + ';"></div>' +
          '<div class="slot-cd" style="position:absolute;left:0;right:0;bottom:0;height:0%;background:rgba(13,10,20,0.6);z-index:2;"></div>';
        el.slotsRoot.appendChild(box);
        el.slots.push({
          box: box,
          icon: box.querySelector('.slot-icon'),
          cd: box.querySelector('.slot-cd'),
        });
      }
    },

    update: function (dtMs, player) {
      if (!el.hpFill) return;
      var pct = Math.max(0, player.hp / player.maxHp) * 100;
      el.hpFill.style.width = pct + '%';
      el.gold.textContent = 'x' + player.gold;

      for (var i = 0; i < 4; i++) {
        var cardId = player.deck[i];
        var slot = el.slots[i];
        if (!cardId) {
          slot.icon.style.background = 'transparent';
          slot.icon.style.borderStyle = 'dashed';
          slot.cd.style.height = '0%';
          continue;
        }
        var card = ED.Cards.get(cardId);
        slot.icon.style.borderStyle = 'solid';
        slot.icon.style.background = cardId === 'card_dagger' ? ED.Renderer.PALETTE.ember : ED.Renderer.PALETTE.stoneLight;
        var cdPct = card ? Math.max(0, Math.min(1, player.cardCooldowns[i] / card.cooldownMs)) * 100 : 0;
        slot.cd.style.height = cdPct + '%';
      }

      if (savedFlashTimer > 0) {
        savedFlashTimer -= dtMs;
        el.saveFlash.style.opacity = savedFlashTimer > 0 ? '1' : '0';
      }
    },

    showSavedFlash: function () {
      savedFlashTimer = 1200;
      if (el.saveFlash) el.saveFlash.style.opacity = '1';
    },

    showRewardPopup: function (worldX, worldY, lines) {
      if (!el.rewardPopup) return;
      var screenX = ED.Renderer.worldToScreenX(worldX);
      el.rewardPopup.style.left = pctX(screenX);
      el.rewardPopup.style.top = pctY(worldY);
      el.rewardPopup.innerHTML = lines
        .map(function (l) {
          return '<div>' + l + '</div>';
        })
        .join('');
      el.rewardPopup.style.display = 'block';
      el.rewardPopup.style.opacity = '1';
      clearTimeout(this._popupTimer);
      this._popupTimer = setTimeout(function () {
        el.rewardPopup.style.display = 'none';
      }, 2000);
    },

    clear: function () {
      if (el.rewardPopup) el.rewardPopup.style.display = 'none';
    },
  };

  ED.HUD = HUD;
})();
