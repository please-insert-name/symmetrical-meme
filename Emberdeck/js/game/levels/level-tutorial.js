// Emberdeck — level-tutorial.js
// Grid + entities per docs/game-design-doc.md §5. Registers a builder into
// ED.Levels.registry; main.js's LevelRuntime calls this to (re)build the
// level fresh each time it's entered.
(function () {
  var ED = (window.ED = window.ED || {});
  ED.Levels = ED.Levels || { registry: {} };

  var COLS = 60,
    ROWS = 11;
  var EMPTY = ED.Tilemap.EMPTY,
    SOLID = ED.Tilemap.SOLID,
    PLATFORM = ED.Tilemap.PLATFORM;

  function buildGrid() {
    var grid = [];
    for (var r = 0; r < ROWS; r++) grid.push(new Array(COLS).fill(EMPTY));

    // main floor rows 9 & 10, gap at columns 10-11
    for (var c = 0; c < COLS; c++) {
      if (c >= 10 && c <= 11) continue;
      grid[9][c] = SOLID;
      grid[10][c] = SOLID;
    }

    // low obstacle (alt jump teach) at columns 20-21, row 8
    grid[8][20] = SOLID;
    grid[8][21] = SOLID;

    // crouch overhang, columns 30-34, row 6
    for (var c2 = 30; c2 <= 34; c2++) grid[6][c2] = SOLID;

    // dagger pickup ledge, row 7, columns 24-27 (design doc originally placed
    // this at row 5 cols 19-22, i.e. 64px above the row-9 floor — well beyond
    // the ~35px max jump height and therefore unreachable; lowered to row 7,
    // a 32px hop, reachable in a single full-height jump from the floor.
    // Shifted from cols 19-22 to 24-27 so it doesn't stack directly on top
    // of the row-8 low obstacle at cols 20-21, which would otherwise combine
    // into a single ~48px wall taller than the max jump height.)
    for (var c3 = 24; c3 <= 27; c3++) grid[7][c3] = SOLID;

    // drop-through section: pit at row 9 cols 40-43, catch floor row 10 stays solid,
    // platform-through at row 7 cols 40-43, 1-tile step at row 8 col 39
    for (var c4 = 40; c4 <= 43; c4++) {
      grid[9][c4] = EMPTY;
      grid[7][c4] = PLATFORM;
    }
    grid[8][39] = SOLID;

    // locked gate at column 55, rows 5-8 (row 9 is the floor and stays solid
    // permanently), opens when tutorial.grunt_defeated
    for (var r2 = 5; r2 <= 8; r2++) grid[r2][55] = SOLID;

    return grid;
  }

  ED.Levels.registry['level-tutorial'] = function () {
    var tilemap = new ED.Tilemap(buildGrid());
    var flags = {};
    var entities = [];

    var daggerPickup = new ED.CardPickup(25 * 16 + 3, 6 * 16, 'card_dagger', function (level) {
      flags['tutorial.prompt.D.seen'] = true;
      ED.Prompts.show('Dolch gefunden! Drücke L, um den Dolch anzugreifen.');
    });
    entities.push(daggerPickup);

    var grunt = new ED.Grunt(35 * 16, 9 * 16 - 16);
    entities.push(grunt);

    var arenas = [
      {
        colStart: 33,
        colEnd: 38,
        clearFlag: 'tutorial.grunt_defeated',
        enemies: [grunt],
        cleared: false,
        onClear: function (level) {
          for (var r = 5; r <= 8; r++) level.tilemap.setTile(r, 55, EMPTY);
          ED.Prompts.show('Gut gemacht! Der Weg ist frei — geh weiter nach rechts.');
        },
      },
    ];

    var promptZones = [
      { id: 'A', colStart: 2, colEnd: 4, row: 9, text: 'Bewege dich mit A und D nach links und rechts.' },
      { id: 'B', colStart: 7, colEnd: 8, row: 9, text: 'Drücke W zum Springen. Halte W länger für einen höheren Sprung.' },
      { id: 'C', colStart: 28, colEnd: 29, row: 9, text: 'Halte S zum Ducken. So passt du unter niedrige Durchgänge.' },
      { id: 'E', colStart: 38, colEnd: 39, row: 8, text: 'Halte S auf einer Plattform, um hindurchzufallen.' },
      { id: 'F', colStart: 32, colEnd: 33, row: 9, text: 'Ein Gegner! Drücke L, um mit dem Dolch anzugreifen und ihn zu besiegen.' },
    ];

    return {
      id: 'level-tutorial',
      tilemap: tilemap,
      entities: entities,
      arenas: arenas,
      promptZones: promptZones,
      flags: flags,
      playerSpawn: { x: 1 * 16 + 3, y: 9 * 16 - ED.Player.HITBOX_H_STAND },
      exit: { colStart: 57, colEnd: 59, row: 9, requiresFlag: 'tutorial.grunt_defeated', target: 'level-01' },
      hasShrine: false,
    };
  };
})();
