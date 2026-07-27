// Emberdeck — main.js
// Bootstraps the engine and assembles ED.Game: the mode dispatcher that
// core.js's fixed-timestep loop drives every tick. Owns level (re)loading,
// death/respawn, and the title/pause/character-building transitions that the
// UI modules (menu.js, characterBuilding.js) call into.
(function () {
  var ED = (window.ED = window.ED || {});
  var gameState = ED.Core.gameState;

  var currentLevel = null;

  function setOverlaysVisible(mode) {
    var hud = document.getElementById('hud-overlay');
    var menu = document.getElementById('menu-overlay');
    var prompt = document.getElementById('prompt-overlay');
    hud.style.display = mode === 'level' || mode === 'paused' || mode === 'dead' ? 'block' : 'none';
    prompt.style.display = mode === 'level' ? 'block' : 'none';
    if (mode === 'title' || mode === 'paused' || mode === 'characterBuilding') {
      menu.classList.remove('hidden');
    } else if (mode !== 'characterBuilding') {
      // characterBuilding.js / menu.js manage their own show/hide explicitly;
      // for level/dead we make sure it's hidden.
      if (mode === 'level' || mode === 'dead') menu.classList.add('hidden');
    }
  }

  function reconcileLevelWithFlags(level) {
    level.entities.forEach(function (e) {
      if (e instanceof ED.CardPickup && gameState.player.deck.indexOf(e.cardId) !== -1) {
        e.dead = true;
      }
    });
    (level.arenas || []).forEach(function (arena) {
      if (level.flags[arena.clearFlag]) {
        arena.enemies.forEach(function (en) {
          en.dead = true;
        });
      }
    });
  }

  function loadLevel(levelId, spawnOverride) {
    var builder = ED.Levels.registry[levelId];
    var level = builder();
    level.player = gameState.player;
    var spawn = spawnOverride || level.playerSpawn;
    gameState.player.x = spawn.x;
    gameState.player.y = spawn.y;
    gameState.player.vx = 0;
    gameState.player.vy = 0;
    currentLevel = level;
    gameState.currentLevelId = levelId;
    gameState.combatActive = false;
    ED.Prompts.hide();
    ED.HUD.clear();
  }

  function respawnAfterDeath() {
    var save = ED.Save.read(gameState.saveSlot);
    if (save) {
      gameState.player.hp = save.player.maxHp;
      gameState.player.maxHp = save.player.maxHp;
      gameState.player.gold = save.player.gold;
      gameState.player.deck = save.player.deck.slice();
      loadLevel(save.player.levelId, { x: save.player.x, y: save.player.y });
      Object.assign(currentLevel.flags, save.flags || {});
      reconcileLevelWithFlags(currentLevel);
    } else {
      gameState.player.hp = gameState.player.maxHp;
      loadLevel('level-tutorial');
    }
    gameState.player.dead = false;
  }

  function updateLevel(dt) {
    var player = gameState.player;
    var level = currentLevel;

    if (!player.dead && ED.Input.wasPressed('pause')) {
      gameState.mode = 'paused';
      setOverlaysVisible('paused');
      ED.Menu.openPause();
      return;
    }

    if (player.dead) {
      level.deathTimer = (level.deathTimer || 0) + dt * 1000;
      if (level.deathTimer >= 600 && !level._respawning) {
        level._respawning = true;
        respawnAfterDeath();
        level.deathTimer = 0;
      }
      return;
    }

    player.update(dt, level);
    level.entities.forEach(function (e) {
      if (!e.dead) e.update(dt, level, player);
    });
    level.entities = level.entities.filter(function (e) {
      return !e.dead;
    });
    ED.Combat.updateArenaState(level, player);
    ED.Prompts.update(dt, level, player);

    var exit = level.exit;
    var col = Math.floor(player.centerX() / 16);
    if (col >= exit.colStart && col <= exit.colEnd) {
      if (!exit.requiresFlag || level.flags[exit.requiresFlag]) {
        if (exit.target === 'characterBuilding') {
          gameState.mode = 'characterBuilding';
          setOverlaysVisible('characterBuilding');
          ED.CharacterBuilding.enter(player);
        } else {
          loadLevel(exit.target);
        }
      }
    }

    ED.HUD.update(dt * 1000, player);
  }

  function renderDeathFade(renderer, level) {
    var alpha = Math.min(1, (level.deathTimer || 0) / 600);
    var ctx = renderer.getCtx();
    ctx.fillStyle = 'rgba(13,10,20,' + alpha + ')';
    ctx.fillRect(0, 0, renderer.WIDTH, renderer.HEIGHT);
  }

  var Game = {
    update: function (dt) {
      switch (gameState.mode) {
        case 'title':
          ED.Menu.update();
          break;
        case 'paused':
          ED.Menu.update();
          break;
        case 'characterBuilding':
          ED.CharacterBuilding.update(dt);
          break;
        case 'level':
          updateLevel(dt);
          break;
      }
    },

    render: function () {
      var renderer = ED.Renderer;
      var mode = gameState.mode;
      if (mode === 'level' || mode === 'paused') {
        renderer.clear(renderer.PALETTE.sky);
        var player = gameState.player;
        renderer.setCameraTarget(player.centerX(), currentLevel.tilemap.widthPx());
        currentLevel.tilemap.render(renderer);
        currentLevel.entities.forEach(function (e) {
          e.render(renderer);
        });
        player.render(renderer);
        if (player.dead) renderDeathFade(renderer, currentLevel);
      } else {
        renderer.clear(renderer.PALETTE.void);
      }
    },

    // --- called by menu.js / characterBuilding.js ---
    startNewGame: function () {
      ED.Menu.close();
      gameState.player = new ED.Player(0, 0);
      gameState.saveSlot = 1;
      loadLevel('level-tutorial');
      gameState.mode = 'level';
      setOverlaysVisible('level');
    },

    continueGame: function () {
      var save = ED.Save.read(gameState.saveSlot);
      if (!save) return;
      ED.Menu.close();
      gameState.player = new ED.Player(0, 0);
      gameState.player.hp = save.player.hp;
      gameState.player.maxHp = save.player.maxHp;
      gameState.player.gold = save.player.gold;
      gameState.player.deck = save.player.deck.slice();
      loadLevel(save.player.levelId, { x: save.player.x, y: save.player.y });
      Object.assign(currentLevel.flags, save.flags || {});
      reconcileLevelWithFlags(currentLevel);
      gameState.mode = 'level';
      setOverlaysVisible('level');
    },

    resumeFromPause: function () {
      ED.Menu.close();
      gameState.mode = 'level';
      setOverlaysVisible('level');
    },

    goToCharacterBuildingFromPause: function () {
      ED.Menu.close();
      gameState.mode = 'characterBuilding';
      setOverlaysVisible('characterBuilding');
      ED.CharacterBuilding.enter(gameState.player);
    },

    saveFromPause: function () {
      var player = gameState.player;
      if (!this.isPlayerNearShrine()) return;
      var shrine = currentLevel.entities.filter(function (e) {
        return e instanceof ED.Shrine;
      })[0];
      ED.Save.write(
        gameState.saveSlot,
        {
          hp: player.hp,
          maxHp: player.maxHp,
          levelId: currentLevel.id,
          x: shrine.x,
          y: shrine.y - player.h,
          gold: player.gold,
          deck: player.deck,
        },
        currentLevel.flags
      );
      ED.HUD.showSavedFlash();
      if (ED.Audio) ED.Audio.save();
    },

    quitToTitle: function () {
      ED.Menu.close();
      currentLevel = null;
      gameState.mode = 'title';
      setOverlaysVisible('title');
      ED.Menu.openTitle();
    },

    isPlayerNearShrine: function () {
      if (!currentLevel || !gameState.player) return false;
      var player = gameState.player;
      return currentLevel.entities.some(function (e) {
        if (!(e instanceof ED.Shrine)) return false;
        var dx = Math.abs(e.centerX() - player.centerX());
        var dy = Math.abs(e.centerY() - player.centerY());
        return dx < 40 && dy < 60;
      });
    },
  };

  ED.Game = Game;

  window.addEventListener('DOMContentLoaded', function () {
    ED.Core.init();
    ED.HUD.init();
    ED.Prompts.init();
    gameState.mode = 'title';
    setOverlaysVisible('title');
    ED.Menu.openTitle();
    ED.Core.start();

    var unlock = function () {
      ED.Audio.unlock();
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('keydown', unlock);
  });
})();
