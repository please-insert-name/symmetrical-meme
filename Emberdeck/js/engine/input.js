// Emberdeck — input.js
// Single source of truth for keybindings. Bound to physical KeyboardEvent.code,
// never to typed characters, so layout (QWERTZ/AZERTY/etc.) never breaks a binding.
(function () {
  var ED = (window.ED = window.ED || {});

  var BINDINGS = {
    left: 'KeyA',
    right: 'KeyD',
    jump: 'KeyW',
    crouch: 'KeyS',
    slot1: 'KeyI', // I
    slot2: 'KeyJ', // J
    slot3: 'KeyK', // K
    slot4: 'KeyL', // L
    confirm: 'KeyJ', // same physical key as slot2; gated by mode, see isConfirmPressed()
    pause: 'Escape',
  };

  var codeToAction = {};
  Object.keys(BINDINGS).forEach(function (action) {
    var code = BINDINGS[action];
    codeToAction[code] = codeToAction[code] || [];
    codeToAction[code].push(action);
  });

  var down = {}; // code -> bool
  var pressedThisFrame = {}; // code -> bool (edge, cleared after poll)
  var releasedThisFrame = {};

  window.addEventListener('keydown', function (e) {
    if (!down[e.code]) {
      pressedThisFrame[e.code] = true;
    }
    down[e.code] = true;
    // Prevent page scroll on space/arrow keys etc. Only relevant bound keys.
    if (codeToAction[e.code]) e.preventDefault();
  });

  window.addEventListener('keyup', function (e) {
    down[e.code] = false;
    releasedThisFrame[e.code] = true;
  });

  window.addEventListener('blur', function () {
    down = {};
  });

  var Input = {
    BINDINGS: BINDINGS,

    isDown: function (action) {
      var code = BINDINGS[action];
      return !!down[code];
    },

    wasPressed: function (action) {
      var code = BINDINGS[action];
      return !!pressedThisFrame[code];
    },

    wasReleased: function (action) {
      var code = BINDINGS[action];
      return !!releasedThisFrame[code];
    },

    // J is contextual: card-slot-2 while an arena encounter is active (combatActive),
    // confirm/interact otherwise (shrines, chests, tutorial prompts, menus).
    isConfirmPressed: function () {
      var gs = ED.Core && ED.Core.gameState;
      if (gs && gs.combatActive) return false;
      return this.wasPressed('confirm');
    },

    isSlot2CardPressed: function () {
      var gs = ED.Core && ED.Core.gameState;
      if (!gs || gs.mode !== 'level' || !gs.combatActive) return false;
      return this.wasPressed('slot2');
    },

    // Called once per tick after all systems have polled the frame's edges.
    endFrame: function () {
      pressedThisFrame = {};
      releasedThisFrame = {};
    },
  };

  ED.Input = Input;
})();
