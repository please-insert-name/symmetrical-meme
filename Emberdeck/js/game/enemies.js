// Emberdeck — enemies.js
// Grunt (melee) and Thrower (ranged) enemy types. Shared 4-state machine:
// patrol -> chase -> attack -> stagger, per docs/game-design-doc.md §3.
(function () {
  var ED = (window.ED = window.ED || {});

  var DEAGGRO_MS = 1500;

  function Enemy(opts) {
    ED.Entity.call(this, opts);
    this.spawnX = opts.x;
    this.spawnY = opts.y;
    this.state = 'patrol';
    this.patrolDir = 1;
    this.deaggroTimer = 0;
    this.staggerTimer = 0;
    this.attackCooldownTimer = 0;
    this.windupTimer = 0;
    this.windupActive = false;
  }
  Enemy.prototype = Object.create(ED.Entity.prototype);
  Enemy.prototype.constructor = Enemy;

  Enemy.prototype.horizDistanceTo = function (player) {
    return Math.abs(player.centerX() - this.centerX());
  };

  Enemy.prototype.sameRowBand = function (player) {
    return Math.abs(player.centerY() - this.centerY()) <= 16;
  };

  Enemy.prototype.takeDamage = function (amount, staggerMs) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.dead = true;
      return;
    }
    this.state = 'stagger';
    this.staggerTimer = staggerMs;
    this.windupActive = false;
    this.vx = 0;
    if (ED.Audio) ED.Audio.hit();
  };

  Enemy.prototype.commonAggroTransitions = function (dt, dtMs, player) {
    var inAggro = this.horizDistanceTo(player) <= this.aggroRange && this.sameRowBand(player) && this.hasLineOfSight(player);
    if (this.state === 'patrol') {
      if (inAggro) {
        this.state = 'chase';
        this.deaggroTimer = 0;
      }
    } else if (this.state === 'chase' || this.state === 'attack') {
      if (inAggro) {
        this.deaggroTimer = 0;
      } else {
        this.deaggroTimer += dtMs;
        if (this.deaggroTimer >= DEAGGRO_MS) {
          this.state = 'patrol';
          this.windupActive = false;
        }
      }
    }
    return inAggro;
  };

  Enemy.prototype.hasLineOfSight = function (player) {
    return true;
  };

  Enemy.prototype.patrolUpdate = function (dt, level) {
    var check = ED.Collision.groundAheadAndWallAhead(this, level.tilemap, this.patrolDir);
    if (!check.groundAhead || check.wallAhead) this.patrolDir *= -1;
    if (Math.abs(this.x - this.spawnX) >= this.patrolRadius) {
      this.patrolDir = this.x > this.spawnX ? -1 : 1;
    }
    this.vx = this.patrolDir * this.patrolSpeed;
  };

  Enemy.prototype.baseUpdate = function (dt, level) {
    var dtMs = dt * 1000;
    if (this.staggerTimer > 0) {
      this.staggerTimer -= dtMs;
      this.vx = 0;
      if (this.staggerTimer <= 0) {
        this.state = 'chase';
      }
    }
    if (this.attackCooldownTimer > 0) this.attackCooldownTimer -= dtMs;
    this.vy += 760 * dt;
    if (this.vy > 300) this.vy = 300;
    ED.Collision.resolve(this, level.tilemap, dt);
  };

  // ---------------- Grunt ----------------
  function Grunt(x, y) {
    Enemy.call(this, { x: x, y: y, w: 14, h: 16, type: 'enemy_grunt' });
    this.hp = 30;
    this.patrolSpeed = 25;
    this.chaseSpeed = 55;
    this.patrolRadius = 40;
    this.aggroRange = 70;
    this.attackRange = 14;
    this.attackDamage = 10;
    this.attackCooldown = 900;
    this.attackWindup = 250;
    this.staggerDuration = 300;
  }
  Grunt.prototype = Object.create(Enemy.prototype);
  Grunt.prototype.constructor = Grunt;

  Grunt.prototype.update = function (dt, level, player) {
    if (this.dead) return;
    var dtMs = dt * 1000;
    if (this.state === 'stagger') {
      this.baseUpdate(dt, level);
      return;
    }

    var inAggro = this.commonAggroTransitions(dt, dtMs, player);

    if (this.state === 'patrol') {
      this.patrolUpdate(dt, level);
    } else if (this.state === 'chase') {
      var dist = this.horizDistanceTo(player);
      if (dist <= this.attackRange) {
        this.state = 'attack';
        this.windupActive = true;
        this.windupTimer = this.attackWindup;
        this.vx = 0;
      } else {
        this.vx = player.centerX() > this.centerX() ? this.chaseSpeed : -this.chaseSpeed;
      }
    } else if (this.state === 'attack') {
      this.vx = 0;
      if (this.windupActive) {
        this.windupTimer -= dtMs;
        if (this.windupTimer <= 0) {
          this.windupActive = false;
          if (this.horizDistanceTo(player) <= this.attackRange + 4 && this.sameRowBand(player)) {
            player.takeDamage(this.attackDamage, this.x);
          }
          this.attackCooldownTimer = this.attackCooldown;
        }
      } else if (this.attackCooldownTimer <= 0) {
        if (this.horizDistanceTo(player) <= this.attackRange) {
          this.windupActive = true;
          this.windupTimer = this.attackWindup;
        } else {
          this.state = 'chase';
        }
      }
    }

    this.baseUpdate(dt, level);
  };

  Grunt.prototype.render = function (renderer) {
    var P = renderer.PALETTE;
    var sx = renderer.worldToScreenX(this.x);
    var sy = this.y;
    renderer.rectOutlined(sx + 1, sy + 6, 12, 10, this.windupActive ? P.stoneLight : P.stone, P.ink);
    renderer.rectOutlined(sx + 4, sy + 1, 6, 6, P.stoneDark, P.ink);
    renderer.rect(sx + 3, sy + 16, 8, 2, P.stoneDark);
    renderer.rect(sx + 5, sy + 3, 1, 1, P.blood);
    renderer.rect(sx + 8, sy + 3, 1, 1, P.blood);
    if (this.state === 'attack' && !this.windupActive) {
      var cx = sx + 7,
        cy = sy + 9;
      renderer.arcStroke(cx, cy, 9, -0.9, 0.6, P.blood, 2);
    }
  };

  // ---------------- Thrower ----------------
  function Thrower(x, y) {
    Enemy.call(this, { x: x, y: y, w: 10, h: 20, type: 'enemy_thrower' });
    this.hp = 18;
    this.patrolSpeed = 15;
    this.chaseSpeed = 0;
    this.retreatDistance = 30;
    this.retreatSpeed = 35;
    this.patrolRadius = 24;
    this.aggroRange = 110;
    this.attackRange = 90;
    this.attackDamage = 8;
    this.attackCooldown = 1400;
    this.attackWindup = 400;
    this.projectileSpeed = 140;
    this.projectileLifetimeMs = 2000;
    this.staggerDuration = 350;
  }
  Thrower.prototype = Object.create(Enemy.prototype);
  Thrower.prototype.constructor = Thrower;

  Thrower.prototype.hasLineOfSight = function (player) {
    // caller (level) supplies tilemap via ED.Combat helper at call time
    return ED.Combat.threadThrowerLOS(this, player);
  };

  Thrower.prototype.update = function (dt, level, player) {
    if (this.dead) return;
    var dtMs = dt * 1000;
    this._level = level;
    if (this.state === 'stagger') {
      this.baseUpdate(dt, level);
      return;
    }

    this.commonAggroTransitions(dt, dtMs, player);

    var dist = this.horizDistanceTo(player);
    if (this.state === 'patrol') {
      this.patrolUpdate(dt, level);
    } else if (this.state === 'chase' || this.state === 'attack') {
      if (dist < this.retreatDistance) {
        this.vx = this.centerX() > player.centerX() ? this.retreatSpeed : -this.retreatSpeed;
        this.state = 'chase';
        this.windupActive = false;
      } else if (dist <= this.attackRange) {
        this.vx = 0;
        if (this.state !== 'attack') {
          this.state = 'attack';
          this.windupActive = true;
          this.windupTimer = this.attackWindup;
        } else if (this.windupActive) {
          this.windupTimer -= dtMs;
          if (this.windupTimer <= 0) {
            this.windupActive = false;
            ED.Combat.spawnEnemyProjectile(level, this, player);
            this.attackCooldownTimer = this.attackCooldown;
          }
        } else if (this.attackCooldownTimer <= 0) {
          this.windupActive = true;
          this.windupTimer = this.attackWindup;
        }
      } else {
        this.vx = 0;
        this.state = 'chase';
      }
    }

    this.baseUpdate(dt, level);
  };

  Thrower.prototype.render = function (renderer) {
    var P = renderer.PALETTE;
    var sx = renderer.worldToScreenX(this.x);
    var sy = this.y;
    var flashOn = this.windupActive && Math.floor(this.windupTimer / 100) % 2 === 0;
    renderer.rectOutlined(sx + 2, sy + 8, 6, 9, flashOn ? P.blood : P.stoneLight, P.ink);
    renderer.rect(sx + 1, sy + 6, 8, 4, P.stoneDark);
    renderer.circle(sx + 5, sy + 4, 3, P.stoneLight);
    renderer.rect(sx + 2, sy + 17, 6, 3, P.stoneDark);
    renderer.rect(sx + 4, sy + 3, 1, 1, P.blood);
  };

  ED.Enemy = Enemy;
  ED.Grunt = Grunt;
  ED.Thrower = Thrower;
})();
