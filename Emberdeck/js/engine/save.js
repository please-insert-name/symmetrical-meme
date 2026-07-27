// Emberdeck — save.js
// Low-level localStorage read/write for save slots and the meta store.
// Every call is wrapped in try/catch: localStorage can throw in private-mode
// Firefox or when quota is exceeded — callers get a boolean/null back instead
// of an uncaught exception.
(function () {
  var ED = (window.ED = window.ED || {});

  var SAVE_SCHEMA_VERSION = 1;
  var META_SCHEMA_VERSION = 1;
  var SAVE_KEY_PREFIX = 'emberdeck.save.v1.slot';
  var META_KEY = 'emberdeck.meta.v1';

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn('[Save] localStorage unavailable (get):', e.message);
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn('[Save] localStorage unavailable (set):', e.message);
      return false;
    }
  }

  var Save = {
    SCHEMA_VERSION: SAVE_SCHEMA_VERSION,

    write: function (slot, playerState, flags) {
      var payload = {
        schemaVersion: SAVE_SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        player: playerState,
        flags: flags || {},
      };
      return safeSet(SAVE_KEY_PREFIX + slot, JSON.stringify(payload));
    },

    read: function (slot) {
      var raw = safeGet(SAVE_KEY_PREFIX + slot);
      if (!raw) return null;
      try {
        var data = JSON.parse(raw);
        if (data.schemaVersion !== SAVE_SCHEMA_VERSION) {
          console.warn('[Save] slot', slot, 'has an old schema version, ignoring.');
          return null;
        }
        if (
          !data.player ||
          typeof data.player.hp !== 'number' ||
          typeof data.player.levelId !== 'string' ||
          !Array.isArray(data.player.deck)
        ) {
          console.warn('[Save] slot', slot, 'has malformed player data, ignoring.');
          return null;
        }
        return data;
      } catch (e) {
        console.warn('[Save] corrupt save data in slot', slot, e.message);
        return null;
      }
    },

    exists: function (slot) {
      return !!safeGet(SAVE_KEY_PREFIX + slot);
    },

    listSlots: function (maxSlots) {
      var out = [];
      for (var i = 1; i <= (maxSlots || 3); i++) {
        var data = this.read(i);
        if (data) out.push({ slot: i, data: data });
      }
      return out;
    },
  };

  var Meta = {
    SCHEMA_VERSION: META_SCHEMA_VERSION,

    load: function () {
      var raw = safeGet(META_KEY);
      if (!raw) {
        return { schemaVersion: META_SCHEMA_VERSION, persistedCardIds: [], totalGoldEverEarned: 0 };
      }
      try {
        var data = JSON.parse(raw);
        if (data.schemaVersion !== META_SCHEMA_VERSION) {
          return { schemaVersion: META_SCHEMA_VERSION, persistedCardIds: [], totalGoldEverEarned: 0 };
        }
        return data;
      } catch (e) {
        console.warn('[Save] corrupt meta data', e.message);
        return { schemaVersion: META_SCHEMA_VERSION, persistedCardIds: [], totalGoldEverEarned: 0 };
      }
    },

    save: function (metaState) {
      metaState.schemaVersion = META_SCHEMA_VERSION;
      return safeSet(META_KEY, JSON.stringify(metaState));
    },
  };

  ED.Save = Save;
  ED.Meta = Meta;

  // --- Shrine entity: the in-level save point ---
  // Kept here (not a separate file) since it's a thin wrapper directly around
  // the Save API above. Walk-in + press J (contextual interact) triggers a save.
  function Shrine(x, y, levelId) {
    ED.Entity.call(this, { x: x, y: y, w: 16, h: 32, type: 'shrine' });
    this.levelId = levelId;
    this.flashTimer = 0;
    this.pulseTimer = 0;
  }
  Shrine.prototype = Object.create(ED.Entity.prototype);
  Shrine.prototype.constructor = Shrine;

  Shrine.prototype.update = function (dt, level) {
    var player = level.player;
    this.pulseTimer += dt * 1000;
    if (this.flashTimer > 0) this.flashTimer -= dt * 1000;
    if (player && ED.aabbOverlap(this.aabb(), player.aabb()) && ED.Input.isConfirmPressed()) {
      var snapshot = {
        hp: player.hp,
        maxHp: player.maxHp,
        levelId: this.levelId,
        x: this.x,
        y: this.y - player.h,
        gold: player.gold,
        deck: player.deck,
      };
      ED.Save.write(ED.Core.gameState.saveSlot, snapshot, level.flags || {});
      this.flashTimer = 1200;
      if (ED.Audio) ED.Audio.save();
      if (ED.HUD) ED.HUD.showSavedFlash();
    }
  };

  Shrine.prototype.render = function (renderer) {
    var P = renderer.PALETTE;
    var x = renderer.worldToScreenX(this.x) + this.w / 2;
    var y = this.y + this.h;
    renderer.rectOutlined(x - 8, y - 6, 16, 6, P.stone, P.ink);
    renderer.rectOutlined(x - 3, y - 22, 6, 16, P.stoneDark, P.ink);
    renderer.rectOutlined(x - 6, y - 26, 12, 4, P.stoneLight, P.ink);
    var flicker = Math.floor(this.pulseTimer / 500) % 2 === 0;
    var hw = flicker ? 2 : 3;
    renderer.triangleUp(x, y - 26, hw, flicker ? 8 : 9, P.ember);
    renderer.triangleUp(x, y - 27, hw - 1, flicker ? 6 : 7, P.emberLight);
  };

  ED.Shrine = Shrine;
})();
