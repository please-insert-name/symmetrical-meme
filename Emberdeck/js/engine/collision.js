// Emberdeck — collision.js
// Axis-separated AABB collision against a Tilemap. X resolved first, then Y,
// which avoids corner-catching on platformer geometry. Platform-through tiles
// (ID 2) only block a downward move when the entity's bottom was at/above the
// tile's top before the move (classic one-way-platform check), and are skipped
// entirely while the entity's dropThroughTimer is active.
(function () {
  var ED = (window.ED = window.ED || {});
  var TS = ED.Tilemap.TILE_SIZE;
  var SOLID = ED.Tilemap.SOLID;
  var PLATFORM = ED.Tilemap.PLATFORM;
  var HAZARD = ED.Tilemap.HAZARD;

  function tilesInRange(minPx, maxPx) {
    return [Math.floor(minPx / TS), Math.floor((maxPx - 0.001) / TS)];
  }

  function isBlocking(tile) {
    return tile === SOLID;
  }

  var Collision = {
    // Moves entity by vx*dt, vy*dt, resolving collisions. Sets entity.grounded.
    resolve: function (entity, tilemap, dt) {
      var prevBottom = entity.y + entity.h;
      var dropping = entity.dropThroughTimer && entity.dropThroughTimer > 0;

      // --- X axis ---
      entity.x += entity.vx * dt;
      this._resolveAxisX(entity, tilemap);

      // --- Y axis ---
      entity.y += entity.vy * dt;
      entity.grounded = false;
      this._resolveAxisY(entity, tilemap, prevBottom, dropping);
    },

    _resolveAxisX: function (entity, tilemap) {
      var rowRange = tilesInRange(entity.y, entity.y + entity.h);
      if (entity.vx > 0) {
        var right = entity.x + entity.w;
        var col = Math.floor(right / TS);
        for (var row = rowRange[0]; row <= rowRange[1]; row++) {
          if (isBlocking(tilemap.getTile(row, col))) {
            entity.x = col * TS - entity.w;
            entity.vx = 0;
            break;
          }
        }
      } else if (entity.vx < 0) {
        var left = entity.x;
        var col2 = Math.floor(left / TS);
        for (var row2 = rowRange[0]; row2 <= rowRange[1]; row2++) {
          if (isBlocking(tilemap.getTile(row2, col2))) {
            entity.x = (col2 + 1) * TS;
            entity.vx = 0;
            break;
          }
        }
      }
    },

    _resolveAxisY: function (entity, tilemap, prevBottom, dropping) {
      var colRange = tilesInRange(entity.x, entity.x + entity.w);
      if (entity.vy > 0) {
        // falling
        var bottom = entity.y + entity.h;
        var row = Math.floor(bottom / TS);
        for (var col = colRange[0]; col <= colRange[1]; col++) {
          var t = tilemap.getTile(row, col);
          var blockedBySolid = isBlocking(t);
          var blockedByPlatform =
            !dropping && t === PLATFORM && prevBottom <= row * TS + 0.5;
          if (blockedBySolid || blockedByPlatform) {
            entity.y = row * TS - entity.h;
            entity.vy = 0;
            entity.grounded = true;
            break;
          }
        }
      } else if (entity.vy < 0) {
        // rising — platforms never block from below
        var top = entity.y;
        var row2 = Math.floor(top / TS);
        for (var col2 = colRange[0]; col2 <= colRange[1]; col2++) {
          if (isBlocking(tilemap.getTile(row2, col2))) {
            entity.y = (row2 + 1) * TS;
            entity.vy = 0;
            break;
          }
        }
      }
    },

    // Standing check: is there a platform or solid tile directly beneath entity's feet?
    isStandingOnPlatform: function (entity, tilemap) {
      var colRange = tilesInRange(entity.x, entity.x + entity.w);
      var row = Math.floor((entity.y + entity.h + 1) / TS);
      for (var col = colRange[0]; col <= colRange[1]; col++) {
        if (tilemap.getTile(row, col) === PLATFORM) return true;
      }
      return false;
    },

    hazardOverlap: function (entity, tilemap) {
      var colRange = tilesInRange(entity.x, entity.x + entity.w);
      var rowRange = tilesInRange(entity.y, entity.y + entity.h);
      for (var row = rowRange[0]; row <= rowRange[1]; row++) {
        for (var col = colRange[0]; col <= colRange[1]; col++) {
          if (tilemap.getTile(row, col) === HAZARD) return true;
        }
      }
      return false;
    },

    // Simple ledge/wall check used by patrol AI: is there ground ahead, and is
    // there a wall ahead, at the given facing direction (-1/1)?
    groundAheadAndWallAhead: function (entity, tilemap, dir) {
      var aheadX = dir > 0 ? entity.x + entity.w + 1 : entity.x - 1;
      var footRow = Math.floor((entity.y + entity.h + 1) / TS);
      var col = Math.floor(aheadX / TS);
      var groundTile = tilemap.getTile(footRow, col);
      var groundAhead = groundTile === SOLID || groundTile === PLATFORM;
      var bodyRow = Math.floor((entity.y + entity.h - 2) / TS);
      var wallTile = tilemap.getTile(bodyRow, col);
      var wallAhead = wallTile === SOLID;
      return { groundAhead: groundAhead, wallAhead: wallAhead };
    },

    // Simple horizontal line-of-sight check for ranged enemies: no solid tile
    // between (x1,y) and (x2,y).
    horizontalLineOfSight: function (tilemap, x1, x2, y) {
      var row = Math.floor(y / TS);
      var colA = Math.floor(Math.min(x1, x2) / TS);
      var colB = Math.floor(Math.max(x1, x2) / TS);
      for (var col = colA; col <= colB; col++) {
        if (tilemap.getTile(row, col) === SOLID) return false;
      }
      return true;
    },
  };

  ED.Collision = Collision;
})();
