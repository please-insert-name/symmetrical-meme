// Emberdeck — core.js
// Fixed-timestep game loop (60Hz update, decoupled from render/rAF rate) and
// the single global gameState. Actual per-mode update/render logic lives in
// ED.Game (assembled in main.js from the game/ui modules) — core.js only
// drives the clock and owns the state machine's current mode.
(function () {
  var ED = (window.ED = window.ED || {});

  var STEP_MS = 1000 / 60;
  var MAX_ACC_MS = 250; // clamp to avoid spiral-of-death after tab-switch

  var gameState = {
    mode: 'boot', // boot | title | level | characterBuilding | paused | dead
    combatActive: false,
    previousMode: null,
    currentLevelId: null,
    player: null, // set by main.js at run-start
    flags: {},
    saveSlot: 1,
    runSummary: null,
  };

  var acc = 0;
  var last = 0;
  var running = false;

  var Core = {
    gameState: gameState,

    init: function () {
      ED.Renderer.init();
    },

    changeMode: function (mode) {
      gameState.previousMode = gameState.mode;
      gameState.mode = mode;
    },

    start: function () {
      if (running) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    },
  };

  function loop(now) {
    if (!running) return;
    var frameMs = Math.min(now - last, MAX_ACC_MS);
    last = now;
    acc += frameMs;

    while (acc >= STEP_MS) {
      if (ED.Game && ED.Game.update) ED.Game.update(STEP_MS / 1000);
      ED.Input.endFrame();
      acc -= STEP_MS;
    }

    if (ED.Game && ED.Game.render) ED.Game.render();

    requestAnimationFrame(loop);
  }

  ED.Core = Core;
})();
