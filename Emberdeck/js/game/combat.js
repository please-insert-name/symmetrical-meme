// Emberdeck — combat.js
// Card-use resolution (melee hit-check, ranged projectile spawn, utility
// buffs), enemy projectile spawning, thrower line-of-sight, and arena
// lock/unlock state (drives gameState.combatActive, which gates whether J is
// a card slot or the contextual interact/confirm key — see input.js).
(function () {
  var ED = (window.ED = window.ED || {});

  function Projectile(opts) {
    ED.Entity.call(this, { x: opts.x, y: opts.y, w: 6, h: 6, type: 'projectile' });
    this.vx = opts.vx;
    this.vy = 0;
    this.owner = opts.owner; // 'player' | 'enemy'
    this.damage = opts.damage;
    this.pierce = opts.pierce || 0;
    this.hitIds = [];
    this.lifetimeMs = opts.lifetimeMs;
  }
  Projectile.prototype = Object.create(ED.Entity.prototype);
  Projectile.prototype.constructor = Projectile;

  Projectile.prototype.update = function (dt, level) {
    this.lifetimeMs -= dt * 1000;
    if (this.lifetimeMs <= 0) {
      this.dead = true;
      return;
    }
    this.x += this.vx * dt;
    var tile = level.tilemap.getTileAtPx(this.centerX(), this.centerY());
    if (tile === ED.Tilemap.SOLID) {
      this.dead = true;
      return;
    }

    if (this.owner === 'player') {
      for (var i = 0; i < level.entities.length; i++) {
        var e = level.entities[i];
        if (!(e instanceof ED.Enemy) || e.dead) continue;
        if (this.hitIds.indexOf(e) !== -1) continue;
        if (ED.aabbOverlap(this.aabb(), e.aabb())) {
          e.takeDamage(this.damage, e.staggerDuration || 300);
          this.hitIds.push(e);
          this.dead = true;
          return;
        }
      }
    } else if (this.owner === 'enemy') {
      if (level.player && !level.player.dead && ED.aabbOverlap(this.aabb(), level.player.aabb())) {
        level.player.takeDamage(this.damage, this.x);
        this.dead = true;
      }
    }
  };

  Projectile.prototype.render = function (renderer) {
    var P = renderer.PALETTE;
    var sx = renderer.worldToScreenX(this.centerX());
    var color = this.owner === 'player' ? P.emberLight : P.blood;
    renderer.circle(sx, this.centerY(), 3, color);
    var ctx = renderer.getCtx();
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, this.centerY(), 3, 0, Math.PI * 2);
    ctx.stroke();
  };

  var Combat = {
    Projectile: Projectile,

    playerUseCard: function (player, card, level) {
      if (card.rangeType === 'melee') {
        var reach = card.reach;
        var box = {
          x: player.facing >= 0 ? player.x + player.w : player.x - reach,
          y: player.centerY() - 5,
          w: reach,
          h: 10,
        };
        for (var i = 0; i < level.entities.length; i++) {
          var e = level.entities[i];
          if (!(e instanceof ED.Enemy) || e.dead) continue;
          if (ED.aabbOverlap(box, e.aabb())) {
            e.takeDamage(card.damage, e.staggerDuration || 300);
          }
        }
        if (card.blockWindowMs) {
          player.blockTimer = card.blockWindowMs;
          player.blockReduction = card.blockReduction;
        }
      } else if (card.rangeType === 'ranged') {
        level.entities.push(
          new Projectile({
            x: player.facing >= 0 ? player.x + player.w : player.x - 6,
            y: player.centerY() - 3,
            vx: player.facing * card.projectileSpeed,
            owner: 'player',
            damage: card.damage,
            lifetimeMs: card.projectileLifetimeMs,
          })
        );
      } else if (card.rangeType === 'self') {
        if (card.id === 'card_haste') {
          player.haste.active = true;
          player.haste.timer = card.durationMs;
        }
      }
    },

    spawnEnemyProjectile: function (level, thrower, player) {
      var dir = player.centerX() >= thrower.centerX() ? 1 : -1;
      level.entities.push(
        new Projectile({
          x: dir > 0 ? thrower.x + thrower.w : thrower.x - 6,
          y: thrower.centerY() - 3,
          vx: dir * thrower.projectileSpeed,
          owner: 'enemy',
          damage: thrower.attackDamage,
          lifetimeMs: thrower.projectileLifetimeMs,
        })
      );
    },

    threadThrowerLOS: function (thrower, player) {
      if (!thrower._level) return true;
      return ED.Collision.horizontalLineOfSight(
        thrower._level.tilemap,
        thrower.centerX(),
        player.centerX(),
        thrower.centerY()
      );
    },

    // Locks/unlocks arena gates and toggles gameState.combatActive based on
    // whether the player is standing inside an unfinished arena zone.
    updateArenaState: function (level, player) {
      var inActiveArena = false;
      (level.arenas || []).forEach(function (arena) {
        if (!arena.cleared) {
          var allDead = arena.enemies.every(function (e) {
            return e.dead;
          });
          if (allDead) {
            arena.cleared = true;
            if (level.flags) level.flags[arena.clearFlag] = true;
            if (arena.onClear) arena.onClear(level);
          }
        }
        var col = Math.floor(player.centerX() / ED.Tilemap.TILE_SIZE);
        if (!arena.cleared && col >= arena.colStart && col <= arena.colEnd) {
          inActiveArena = true;
        }
      });
      ED.Core.gameState.combatActive = inActiveArena;
    },
  };

  ED.Combat = Combat;
})();
