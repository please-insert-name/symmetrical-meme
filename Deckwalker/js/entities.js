const GRAVITY = 0.55;
const MOVE_SPEED = 2.3;
const JUMP_VELOCITY = -9.5;
const GROUND_FRICTION = 0.8;

const ENEMY_TYPES = {
  moosling: { sprite: 'moosling', hp: 14, dmg: 5, speed: 0.7, kind: 'walker', px: 5, aggroRange: 90, gold: [3, 6] },
  wurzelschreck: { sprite: 'wurzelschreck', hp: 18, dmg: 6, speed: 0, kind: 'shooter', px: 5, aggroRange: 160, cooldown: 1600, gold: [4, 8] },
  knochenwicht: { sprite: 'knochenwicht', hp: 24, dmg: 8, speed: 1.0, kind: 'walker', px: 5, aggroRange: 110, gold: [5, 10] },
  pilzsporling: { sprite: 'pilzsporling', hp: 16, dmg: 7, speed: 0.6, kind: 'walker', px: 5, aggroRange: 80, gold: [5, 9], explodeOnDeath: true },
  steinwaechter: { sprite: 'steinwaechter', hp: 46, dmg: 12, speed: 0.5, kind: 'walker', px: 6, aggroRange: 100, gold: [8, 14] },
  nebelschleicher: { sprite: 'nebelschleicher', hp: 20, dmg: 9, speed: 1.8, kind: 'walker', px: 5, aggroRange: 140, gold: [6, 11] },
  aschewisp: { sprite: 'aschewisp', hp: 15, dmg: 8, speed: 1.2, kind: 'flyer', px: 5, aggroRange: 150, cooldown: 1400, gold: [6, 10] },
  rootmother: { sprite: 'rootmother', hp: 140, dmg: 14, speed: 0.6, kind: 'boss', px: 8, aggroRange: 220, cooldown: 1300, gold: [40, 60] },
  ashking: { sprite: 'ashking', hp: 200, dmg: 18, speed: 0.8, kind: 'boss', px: 8, aggroRange: 240, cooldown: 1100, gold: [60, 90] }
};

class Entity {
  constructor(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.onGround = false; this.facing = 1;
    this.flashUntil = 0;
  }
  get flashing() { return performance.now() < this.flashUntil; }
}

class Player extends Entity {
  constructor(x, y, runState) {
    super(x, y);
    this.w = 16; this.h = 24;
    this.maxHp = runState.maxHp;
    this.hp = runState.hp;
    this.gold = runState.gold;
    this.deck = runState.deck.slice();
    this.bindings = Object.assign({}, runState.bindings);
    this.cooldowns = { I: 0, J: 0, K: 0, L: 0 };
    this.invulnUntil = 0;
    this.shield = 0;
    this.shieldUntil = 0;
    this.airJumpsUsed = 0;
    this.dead = false;
  }

  passiveActive(id) {
    return this.deck.includes(id);
  }

  effectiveMaxHp() {
    let bonus = 0;
    if (this.passiveActive('zaehe_haut')) bonus += CARD_DB.zaehe_haut.maxHpBonus;
    return this.maxHp + bonus;
  }

  takeDamage(amount) {
    if (performance.now() < this.invulnUntil) return;
    if (this.shield > 0 && performance.now() < this.shieldUntil) {
      const absorbed = Math.min(this.shield, amount);
      this.shield -= absorbed;
      amount -= absorbed;
    }
    if (amount <= 0) return;
    this.hp -= amount;
    this.flashUntil = performance.now() + 120;
    this.invulnUntil = performance.now() + 400;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
  }

  damageMultiplier() {
    if (this.passiveActive('wutrausch') && this.hp / this.effectiveMaxHp() < 0.3) {
      return 1 + CARD_DB.wutrausch.lowHpDmgMult;
    }
    return 1;
  }

  update(dt, input, level, game) {
    if (this.dead) return;
    const left = input.down.has('a');
    const right = input.down.has('d');
    if (left && !right) { this.vx = -MOVE_SPEED; this.facing = -1; }
    else if (right && !left) { this.vx = MOVE_SPEED; this.facing = 1; }
    else { this.vx *= GROUND_FRICTION; if (Math.abs(this.vx) < 0.05) this.vx = 0; }

    if (input.pressed.has('w') && this.onGround) {
      this.vy = JUMP_VELOCITY; this.onGround = false;
    }

    this.vy += GRAVITY;
    if (this.vy > 12) this.vy = 12;
    this.x += this.vx;
    this.y += this.vy;

    this.onGround = false;
    for (const p of level.platforms) {
      if (this.x + this.w > p.x && this.x < p.x + p.w) {
        if (this.vy >= 0 && this.y + this.h > p.y && this.y + this.h - this.vy <= p.y + 1) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.onGround = true;
          this.airJumpsUsed = 0;
        }
      }
    }
    if (this.x < 0) this.x = 0;
    if (this.x + this.w > level.width) this.x = level.width - this.w;
    if (this.y > level.killY) {
      this.takeDamage(15);
      game.respawnAtCheckpoint();
    }

    ['I', 'J', 'K', 'L'].forEach(key => {
      if (input.pressed.has(key.toLowerCase()) && this.cooldowns[key] <= performance.now()) {
        this.useSlot(key, game);
      }
    });

    if (this.shield > 0 && performance.now() > this.shieldUntil) this.shield = 0;
  }

  useSlot(key, game) {
    const cardId = this.bindings[key];
    if (!cardId) return;
    const card = CARD_DB[cardId];
    if (!card) return;
    this.cooldowns[key] = performance.now() + card.cooldown;
    game.activateCard(this, card);
  }
}

class EnemyEntity extends Entity {
  constructor(typeId, x, y) {
    super(x, y);
    const def = ENEMY_TYPES[typeId];
    this.typeId = typeId;
    this.def = def;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.w = def.px * (typeId === 'rootmother' || typeId === 'ashking' ? 16 : 10);
    this.h = def.px * (typeId === 'aschewisp' || typeId === 'nebelschleicher' ? 6 : 8);
    this.lastAttack = 0;
    this.slowUntil = 0;
    this.slowFactor = 1;
    this.dead = false;
    this.deathHandled = false;
  }

  takeDamage(amount, source) {
    this.hp -= amount;
    this.flashUntil = performance.now() + 100;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
  }

  update(dt, player, level, game) {
    if (this.dead) return;
    const dx = player.x - this.x;
    const dist = Math.abs(dx);
    const speedMult = performance.now() < this.slowUntil ? this.slowFactor : 1;
    const speed = this.def.speed * speedMult;

    if (this.def.kind === 'walker' || this.def.kind === 'boss') {
      if (dist < this.def.aggroRange && dist > 20) {
        this.x += Math.sign(dx) * speed;
        this.facing = Math.sign(dx) || this.facing;
      }
      this.vy += GRAVITY;
      if (this.vy > 12) this.vy = 12;
      this.y += this.vy;
      for (const p of level.platforms) {
        if (this.x + this.w > p.x && this.x < p.x + p.w) {
          if (this.vy >= 0 && this.y + this.h > p.y && this.y + this.h - this.vy <= p.y + 1) {
            this.y = p.y - this.h;
            this.vy = 0;
          }
        }
      }
      if (dist < 22 && performance.now() > this.lastAttack + 700) {
        player.takeDamage(this.def.dmg);
        this.lastAttack = performance.now();
      }
    } else if (this.def.kind === 'flyer') {
      this.bobPhase = (this.bobPhase || 0) + 0.05;
      if (dist < this.def.aggroRange) {
        this.x += Math.sign(dx) * speed;
        this.facing = Math.sign(dx) || this.facing;
      }
      this.y += Math.sin(this.bobPhase) * 0.5;
      if (dist < this.def.aggroRange && performance.now() > this.lastAttack + this.def.cooldown) {
        game.spawnEnemyProjectile(this, player);
        this.lastAttack = performance.now();
      }
    } else if (this.def.kind === 'shooter') {
      if (dist < this.def.aggroRange) this.facing = Math.sign(dx) || this.facing;
      if (dist < this.def.aggroRange && performance.now() > this.lastAttack + this.def.cooldown) {
        game.spawnEnemyProjectile(this, player);
        this.lastAttack = performance.now();
      }
    }
  }
}

class Projectile {
  constructor(x, y, vx, vy, dmg, fromPlayer, kind, opts = {}) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.dmg = dmg; this.fromPlayer = fromPlayer; this.kind = kind;
    this.dead = false;
    this.pierce = opts.pierce || false;
    this.slow = opts.slow; this.slowDuration = opts.slowDuration;
    this.hitIds = new Set();
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
  }
}
