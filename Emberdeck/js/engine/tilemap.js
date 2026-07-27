// Emberdeck — tilemap.js
// 16px tile grid. Tile IDs: 0 empty, 1 solid, 2 platform-through, 3 hazard.
// Levels build a Tilemap from an ASCII map ('.', '#', '=', '^') via fromAscii().
(function () {
  var ED = (window.ED = window.ED || {});

  var TILE_SIZE = 16;
  var EMPTY = 0,
    SOLID = 1,
    PLATFORM = 2,
    HAZARD = 3;

  var ASCII_MAP = { '.': EMPTY, '#': SOLID, '=': PLATFORM, '^': HAZARD };

  function Tilemap(grid) {
    this.grid = grid; // grid[row][col]
    this.rows = grid.length;
    this.cols = grid[0] ? grid[0].length : 0;
  }

  Tilemap.TILE_SIZE = TILE_SIZE;
  Tilemap.EMPTY = EMPTY;
  Tilemap.SOLID = SOLID;
  Tilemap.PLATFORM = PLATFORM;
  Tilemap.HAZARD = HAZARD;

  Tilemap.fromAscii = function (rowsOfStrings) {
    var grid = rowsOfStrings.map(function (rowStr) {
      var row = [];
      for (var i = 0; i < rowStr.length; i++) {
        row.push(ASCII_MAP[rowStr[i]] !== undefined ? ASCII_MAP[rowStr[i]] : EMPTY);
      }
      return row;
    });
    return new Tilemap(grid);
  };

  Tilemap.prototype.widthPx = function () {
    return this.cols * TILE_SIZE;
  };
  Tilemap.prototype.heightPx = function () {
    return this.rows * TILE_SIZE;
  };

  Tilemap.prototype.getTile = function (row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return SOLID; // out of bounds = solid wall
    return this.grid[row][col];
  };

  Tilemap.prototype.getTileAtPx = function (px, py) {
    var col = Math.floor(px / TILE_SIZE);
    var row = Math.floor(py / TILE_SIZE);
    return this.getTile(row, col);
  };

  Tilemap.prototype.setTile = function (row, col, id) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    this.grid[row][col] = id;
  };

  Tilemap.prototype.render = function (renderer) {
    var ctx = renderer.getCtx();
    var P = renderer.PALETTE;
    var camX = renderer.camera.x;
    var firstCol = Math.max(0, Math.floor(camX / TILE_SIZE) - 1);
    var lastCol = Math.min(this.cols - 1, Math.ceil((camX + renderer.WIDTH) / TILE_SIZE) + 1);

    for (var row = 0; row < this.rows; row++) {
      for (var col = firstCol; col <= lastCol; col++) {
        var t = this.grid[row][col];
        if (t === EMPTY) continue;
        var x = col * TILE_SIZE - camX;
        var y = row * TILE_SIZE;
        if (t === SOLID) {
          var hasAirAbove = this.getTile(row - 1, col) === EMPTY;
          renderer.rectOutlined(x, y, TILE_SIZE, TILE_SIZE, P.stone, P.ink);
          if (hasAirAbove) {
            renderer.rect(x, y, TILE_SIZE, 4, P.mossLight);
            renderer.rect(x, y + 4, TILE_SIZE, 2, P.moss);
          } else {
            renderer.rect(x, y, TILE_SIZE, 2, P.stoneLight);
          }
          renderer.rect(x, y + TILE_SIZE - 2, TILE_SIZE, 2, P.stoneDark);
          ctx.strokeStyle = P.ink;
          ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        } else if (t === PLATFORM) {
          renderer.rect(x, y, TILE_SIZE, 4, P.mossLight);
          ctx.strokeStyle = P.ink;
          ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, 3);
          renderer.rect(x, y + 3, TILE_SIZE, 1, P.moss);
        } else if (t === HAZARD) {
          renderer.rect(x, y + 10, TILE_SIZE, 6, P.stoneDark);
          var third = TILE_SIZE / 3;
          for (var i = 0; i < 3; i++) {
            renderer.triangleUp(x + third * i + third / 2, y + 10, third / 2, 10, P.ember);
          }
          ctx.strokeStyle = P.ink;
          ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        }
      }
    }
  };

  ED.Tilemap = Tilemap;
})();
