// Emberdeck — level-01.js
// Grid + entities per docs/game-design-doc.md §6. Registers a builder into
// ED.Levels.registry, same pattern as level-tutorial.js.
//
// Implementation note: the design doc describes the Ember Hollow arena as
// "flanked" by locks at columns 54 and 73. For the vertical slice only the
// far/exit side (column 73) is built as an actual locked wall — the entrance
// at column 54 stays open so the player can walk in to fight, matching the
// same proven lock-the-exit pattern used in level-tutorial.js.
(function () {
  var ED = (window.ED = window.ED || {});
  ED.Levels = ED.Levels || { registry: {} };

  var COLS = 90,
    ROWS = 11;
  var EMPTY = ED.Tilemap.EMPTY,
    SOLID = ED.Tilemap.SOLID,
    PLATFORM = ED.Tilemap.PLATFORM,
    HAZARD = ED.Tilemap.HAZARD;

  function buildGrid() {
    var grid = [];
    for (var r = 0; r < ROWS; r++) grid.push(new Array(COLS).fill(EMPTY));

    for (var c = 0; c < COLS; c++) {
      var inHazard = c >= 15 && c <= 18;
      var inGap = c >= 45 && c <= 46;
      if (inGap) continue; // both rows stay empty
      grid[10][c] = SOLID;
      grid[9][c] = inHazard ? HAZARD : SOLID;
    }

    // elevated platform-through run, columns 25-32, row 7 (floor stays solid beneath)
    for (var c2 = 25; c2 <= 32; c2++) grid[7][c2] = PLATFORM;

    // locked arena exit wall at column 73, rows 5-8 (row 9 is the floor and
    // stays solid permanently)
    for (var r2 = 5; r2 <= 8; r2++) grid[r2][73] = SOLID;

    return grid;
  }

  ED.Levels.registry['level-01'] = function () {
    var tilemap = new ED.Tilemap(buildGrid());
    var flags = {};
    var entities = [];

    function fieldPickup(col, row, cardId, flagName) {
      var p = new ED.CardPickup(col * 16 + 3, row * 16, cardId, function () {
        flags[flagName] = true;
      });
      entities.push(p);
      return p;
    }

    fieldPickup(21, 8, 'card_shieldbash', 'level01.shieldbash.collected');
    fieldPickup(50, 8, 'card_emberbolt', 'level01.emberbolt.collected');
    fieldPickup(28, 6, 'card_haste', 'level01.haste.collected');

    var grunt1 = new ED.Grunt(59 * 16, 9 * 16 - 16);
    var grunt2 = new ED.Grunt(68 * 16, 9 * 16 - 16);
    var thrower1 = new ED.Thrower(63 * 16, 9 * 16 - 20);
    entities.push(grunt1, grunt2, thrower1);

    var arenas = [
      {
        colStart: 55,
        colEnd: 72,
        clearFlag: 'level01.arena_cleared',
        enemies: [grunt1, grunt2, thrower1],
        cleared: false,
        onClear: function (level) {
          for (var r = 5; r <= 8; r++) level.tilemap.setTile(r, 73, EMPTY);
        },
      },
    ];

    var shrine = new ED.Shrine(76 * 16, 9 * 16 - 32, 'level-01');
    entities.push(shrine);

    var chest = new ED.Chest(85 * 16, 9 * 16 - 12, function (level, player) {
      var emberboltInField = flags['level01.emberbolt.collected'];
      if (!emberboltInField) {
        return { gold: 45, cardId: 'card_emberbolt' };
      }
      return { gold: 65, cardId: null };
    });
    entities.push(chest);

    return {
      id: 'level-01',
      tilemap: tilemap,
      entities: entities,
      arenas: arenas,
      promptZones: [],
      flags: flags,
      playerSpawn: { x: 1 * 16 + 3, y: 9 * 16 - ED.Player.HITBOX_H_STAND },
      exit: { colStart: 88, colEnd: 89, row: 9, target: 'characterBuilding' },
      hasShrine: true,
    };
  };
})();
