// Emberdeck — characterBuilding.js
// Between-level screen: sell cards for gold, or spend gold to persist a card
// into the cross-run meta store. Keyboard-only per docs/ui-visual-spec.md §6:
// W/S moves the row cursor, I/K move a sub-cursor between SELL and KEEP
// (persist) within the selected row, J confirms, Escape exits to the title
// screen with a short run summary.
(function () {
  var ED = (window.ED = window.ED || {});

  var rootEl = null;
  var rows = []; // { slotIndex, cardId, persistedThisVisit }
  var selectedRow = 0;
  var subFocus = 'sell'; // 'sell' | 'persist'
  var persistedThisSession = 0;

  function buildRows(player) {
    rows = [];
    rows.push({ slotIndex: 3, cardId: 'card_dagger' });
    for (var i = 0; i < 3; i++) {
      if (player.deck[i]) rows.push({ slotIndex: i, cardId: player.deck[i] });
    }
    rows.push({ continueRow: true });
    if (selectedRow >= rows.length) selectedRow = rows.length - 1;
  }

  function renderDom(player) {
    var meta = ED.Meta.load();
    var P = ED.Renderer.PALETTE;
    var html = '';
    html += '<div style="width:87.5%;max-width:87.5%;font-family:inherit;color:' + P.bone + ';">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:2%;">';
    html += '<div style="font-size:1.6vh;">CHARAKTER-AUSBAU</div>';
    html += '<div style="font-size:1.6vh;color:' + P.gold + ';">Gold: ' + player.gold + '</div>';
    html += '</div>';
    html += '<div>';

    rows.forEach(function (row, idx) {
      var isSelected = idx === selectedRow;
      var rowBg = isSelected ? 'rgba(90,78,110,0.4)' : 'transparent';
      var borderLeft = isSelected ? '2px solid ' + P.leaf : '2px solid transparent';
      html += '<div style="display:flex;align-items:center;padding:0.6vh 4px;background:' + rowBg + ';border-left:' + borderLeft + ';font-size:1.4vh;">';

      if (row.continueRow) {
        html += '<div style="flex:1;">' + (isSelected ? '&gt; ' : '') + 'Weiter</div>';
      } else {
        var card = ED.Cards.get(row.cardId);
        var isDagger = row.cardId === 'card_dagger';
        var persisted = meta.persistedCardIds.indexOf(row.cardId) !== -1;
        html += '<div style="flex:1;">' + card.name + '</div>';
        if (isDagger) {
          html += '<div style="color:' + P.stoneLight + ';">immer verfügbar</div>';
        } else {
          var sellFocused = isSelected && subFocus === 'sell';
          var persistFocused = isSelected && subFocus === 'persist';
          var sellStyle = sellFocused
            ? 'border:1px solid ' + P.ember + ';color:' + P.emberLight + ';'
            : 'border:1px solid transparent;color:' + P.bone + ';';
          html += '<div style="width:22%;text-align:center;' + sellStyle + '">VERKAUFEN ' + card.price.sell + 'g</div>';
          if (persisted) {
            html += '<div style="width:22%;text-align:center;color:' + P.stoneLight + ';">BEHALTEN</div>';
          } else {
            var persistStyle = persistFocused
              ? 'border:1px solid ' + P.ember + ';color:' + P.emberLight + ';'
              : 'border:1px solid transparent;color:' + P.bone + ';';
            html += '<div style="width:26%;text-align:center;' + persistStyle + '">DAUERHAFT ' + card.price.persist + 'g</div>';
          }
        }
      }
      html += '</div>';
    });

    html += '</div>';
    html += '<div style="margin-top:2%;font-size:1.2vh;color:' + P.stoneLight + ';">W/S wählen · I/K Aktion wählen · J bestätigen · Escape zurück</div>';
    html += '</div>';
    rootEl.innerHTML = html;
  }

  var CharacterBuilding = {
    enter: function (player) {
      rootEl = document.getElementById('menu-overlay');
      rootEl.classList.remove('hidden');
      selectedRow = 0;
      subFocus = 'sell';
      persistedThisSession = 0;
      buildRows(player);
      renderDom(player);
    },

    exit: function () {
      rootEl.classList.add('hidden');
      rootEl.innerHTML = '';
    },

    update: function (dt) {
      var player = ED.Core.gameState.player;
      var Input = ED.Input;
      var changed = false;

      if (Input.wasPressed('jump') /* W */) {
        selectedRow = Math.max(0, selectedRow - 1);
        subFocus = 'sell';
        changed = true;
        if (ED.Audio) ED.Audio.menuMove();
      } else if (Input.wasPressed('crouch') /* S */) {
        selectedRow = Math.min(rows.length - 1, selectedRow + 1);
        subFocus = 'sell';
        changed = true;
        if (ED.Audio) ED.Audio.menuMove();
      } else if (Input.wasPressed('slot1') /* I */) {
        subFocus = 'sell';
        changed = true;
      } else if (Input.wasPressed('slot3') /* K */) {
        subFocus = 'persist';
        changed = true;
      } else if (Input.wasPressed('confirm') /* J */) {
        this.confirmSelection(player);
        changed = true;
        if (ED.Audio) ED.Audio.menuConfirm();
      } else if (Input.wasPressed('pause') /* Escape */) {
        ED.Core.gameState.runSummary = { gold: player.gold, cardsPersisted: persistedThisSession };
        this.exit();
        ED.Game.quitToTitle();
        return;
      }

      if (changed) {
        buildRows(player);
        renderDom(player);
      }
    },

    confirmSelection: function (player) {
      var row = rows[selectedRow];
      if (!row) return;
      if (row.continueRow) {
        ED.Core.gameState.runSummary = { gold: player.gold, cardsPersisted: persistedThisSession };
        this.exit();
        ED.Game.quitToTitle();
        return;
      }
      if (row.cardId === 'card_dagger') return;

      var card = ED.Cards.get(row.cardId);
      if (subFocus === 'sell') {
        player.gold += card.price.sell;
        player.deck[row.slotIndex] = null;
      } else {
        var meta = ED.Meta.load();
        var cost = ED.MetaLogic.persistCard(row.cardId, player.gold);
        if (cost !== null) {
          player.gold -= cost;
          persistedThisSession++;
        }
      }
    },
  };

  ED.CharacterBuilding = CharacterBuilding;
})();
