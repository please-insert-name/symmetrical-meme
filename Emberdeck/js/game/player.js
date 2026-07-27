// Emberdeck — player.js
// Player entity: movement FSM (idle/run/jump/fall/crouch), combat card
// dispatch on IJKL, i-frames/knockback. Numbers per docs/game-design-doc.md §1.
(function () {
  var ED = (window.ED = window.ED || {});

  var MOVE_SPEED = 90;
  var CROUCH_SPEED = 40;
  var JUMP_VELOCITY = -190;
  var GRAVITY_ASCEND = 520;
  var GRAVITY_FALL = 760;
  var TERMINAL_FALL = 300;
  var JUMP_CUTOFF_VY = -60;
  var MAX_JUMP_HOLD_MS = 300;
  var COYOTE_MS = 80;
  var JUMP_BUFFER_MS = 80;
  var DROP_THROUGH_MS = 200;
  var IFRAME_MS = 800;
  var KNOCKBACK_MS = 150;
  var HITBOX_W = 10,
    HITBOX_H_STAND = 14,
    HITBOX_H_CROUCH = 8;
  var SPRITE_W = 12,
    SPRITE_H_STAND = 16,
    SPRITE_H_CROUCH = 10;
  var ATTACK_ARC_FRAMES_MS = (4 * 1000) / 60;

  function Player(x, y) {
    ED.Entity.call(this, { x: x, y: y, w: HITBOX_W, h: HITBOX_H_STAND, type: 'player' });
    this.maxHp = 100;
    this.hp = 100;
    this.gold = 0;
    this.deck = ED.MetaLogic.seedDeckForNewRun();
    this.cardCooldowns = [0, 0, 0, 0];
    this.facing = 1;
    this.grounded = false;
    this.crouching = false;
    this.jumping = false;
    this.jumpHoldMs = 0;
    this.timeSinceGrounded = 0;
    this.jumpBufferMs = -1;
    this.dropThroughTimer = 0;
    this.invulnTimer = 0;
    this.knockbackTimer = 0;
    this.attackFlashTimer = 0;
    this.attackFlashSlot = -1;
    this.haste = { active: false, timer: 0 };
    this.blockTimer = 0;
    this.blockReduction = 0;
    this.wasInHazard = false;
    this.dead = false;
    this.checkpointId = null;
  }
  Player.prototype = Object.create(ED.Entity.prototype);
  Player.prototype.constructor = Player;

  Player.HITBOX_W = HITBOX_W;
  Player.HITBOX_H_STAND = HITBOX_H_STAND;

  Player.prototype.slotIndexForAction = function (action) {
    return { slot1: 0, slot2: 1, slot3: 2, slot4: 3 }[action];
  };

  Player.prototype.update = function (dt, level) {
    if (this.dead) return;
    var Input = ED.Input;
    var dtMs = dt * 1000;

    if (this.invulnTimer > 0) this.invulnTimer -= dtMs;
    if (this.knockbackTimer > 0) this.knockbackTimer -= dtMs;
    if (this.attackFlashTimer > 0) this.attackFlashTimer -= dtMs;
    if (this.blockTimer > 0) this.blockTimer -= dtMs;
    for (var i = 0; i < 4; i++) if (this.cardCooldowns[i] > 0) this.cardCooldowns[i] -= dtMs;
    if (this.haste.active) {
      this.haste.timer -= dtMs;
      if (this.haste.timer <= 0) this.haste.active = false;
    }

    var overridden = this.knockbackTimer > 0;

    // --- crouch state ---
    var wantsCrouch = Input.isDown('crouch') && this.grounded && !overridden;
    if (wantsCrouch !== this.crouching) {
      var prevBottom = this.y + this.h;
      this.crouching = wantsCrouch;
      this.h = wantsCrouch ? HITBOX_H_CROUCH : HITBOX_H_STAND;
      this.y = prevBottom - this.h;
    }

    // --- drop-through ---
    if (this.dropThroughTimer > 0) this.dropThroughTimer -= dtMs;
    if (
      this.crouching &&
      this.grounded &&
      this.dropThroughTimer <= 0 &&
      ED.Collision.isStandingOnPlatform(this, level.tilemap)
    ) {
      this.dropThroughTimer = DROP_THROUGH_MS;
    }

    // --- horizontal movement ---
    if (!overridden) {
      var speed = this.crouching ? CROUCH_SPEED : MOVE_SPEED;
      if (this.haste.active) speed *= 1.5;
      var left = Input.isDown('left');
      var right = Input.isDown('right');
      if (left && !right) {
        this.vx = -speed;
        this.facing = -1;
      } else if (right && !left) {
        this.vx = speed;
        this.facing = 1;
      } else {
        this.vx = 0;
      }
    }

    // --- jump buffering / coyote time ---
    this.timeSinceGrounded = this.grounded ? 0 : this.timeSinceGrounded + dtMs;
    if (Input.wasPressed('jump')) this.jumpBufferMs = JUMP_BUFFER_MS;
    else if (this.jumpBufferMs >= 0) this.jumpBufferMs -= dtMs;

    var canJump = !this.crouching && this.timeSinceGrounded <= COYOTE_MS;
    if (this.jumpBufferMs >= 0 && canJump && !this.jumping) {
      this.vy = JUMP_VELOCITY;
      this.jumping = true;
      this.jumpHoldMs = 0;
      this.jumpBufferMs = -1;
      this.timeSinceGrounded = COYOTE_MS + 1;
      if (ED.Audio) ED.Audio.jump();
    }

    if (this.jumping) {
      this.jumpHoldMs += dtMs;
      var holding = Input.isDown('jump') && this.jumpHoldMs <= MAX_JUMP_HOLD_MS;
      var gravity = this.vy < 0 && holding ? GRAVITY_ASCEND : GRAVITY_FALL;
      if (Input.wasReleased('jump') && this.vy < JUMP_CUTOFF_VY) {
        this.vy = JUMP_CUTOFF_VY;
      }
      this.vy += gravity * dt;
    } else {
      this.vy += GRAVITY_FALL * dt;
    }
    if (this.vy > TERMINAL_FALL) this.vy = TERMINAL_FALL;

    // resolve collision
    ED.Collision.resolve(this, level.tilemap, dt);
    if (this.grounded) this.jumping = false;

    // hazard damage: 15 on first entry, then 5 per subsequent hit once i-frames
    // have expired (each hit re-triggers the 800ms i-frame window, so it can
    // never fire faster than once per 800ms while standing in the hazard).
    var inHazardNow = ED.Collision.hazardOverlap(this, level.tilemap);
    if (inHazardNow) {
      if (!this.wasInHazard) {
        this.takeDamage(15, this.x);
      } else if (this.invulnTimer <= 0) {
        this.takeDamage(5, this.x);
      }
    }
    this.wasInHazard = inHazardNow;

    // --- combat input ---
    this.handleCombatInput(level);

    // out-of-bounds safety (shouldn't happen, catch-floors exist)
    if (this.y > level.tilemap.heightPx() + 200) {
      this.takeDamage(this.hp, this.x);
    }
  };

  Player.prototype.handleCombatInput = function (level) {
    var Input = ED.Input;
    var pressedSlot = -1;
    if (Input.wasPressed('slot1')) pressedSlot = 0;
    else if (Input.isSlot2CardPressed()) pressedSlot = 1;
    else if (Input.wasPressed('slot3')) pressedSlot = 2;
    else if (Input.wasPressed('slot4')) pressedSlot = 3;

    if (pressedSlot === -1) return;
    var cardId = this.deck[pressedSlot];
    if (!cardId) return;
    if (this.cardCooldowns[pressedSlot] > 0) return;

    var card = ED.Cards.get(cardId);
    if (!card) return;

    this.cardCooldowns[pressedSlot] = card.cooldownMs;
    this.attackFlashTimer = ATTACK_ARC_FRAMES_MS;
    this.attackFlashSlot = pressedSlot;
    ED.Combat.playerUseCard(this, card, level);
  };

  Player.prototype.takeDamage = function (amount, sourceX) {
    if (this.invulnTimer > 0 || this.dead) return;
    if (this.blockTimer > 0) {
      amount = Math.floor(amount * (1 - this.blockReduction));
    }
    this.hp -= amount;
    this.invulnTimer = IFRAME_MS;
    this.knockbackTimer = KNOCKBACK_MS;
    this.vx = sourceX <= this.x ? 120 : -120;
    this.vy = -80;
    if (ED.Audio) ED.Audio.hit();
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
  };

  Player.prototype.pickupCard = function (cardId) {
    for (var i = 0; i < 3; i++) {
      if (!this.deck[i]) {
        this.deck[i] = cardId;
        if (ED.Audio) ED.Audio.pickup();
        return true;
      }
    }
    return false; // Kartenfach voll
  };

  Player.prototype.render = function (renderer) {
    var P = renderer.PALETTE;
    var sx = renderer.worldToScreenX(this.x) - 1;
    var sy = this.y - (this.crouching ? 2 : 2);
    var spriteH = this.crouching ? SPRITE_H_CROUCH : SPRITE_H_STAND;
    var ctx = renderer.getCtx();

    var alpha = 1;
    if (this.invulnTimer > 0) {
      alpha = Math.floor(this.invulnTimer / 80) % 2 === 0 ? 0.35 : 1;
    }
    ctx.save();
    ctx.globalAlpha = alpha;

    if (this.crouching) {
      renderer.rectOutlined(sx + 2, sy + 3, 8, 6, P.bone, P.ink);
      renderer.circle(sx + 6, sy + 2, 3, P.bone);
      renderer.rect(sx + 2, sy + 9, 8, 3, P.stoneDark);
    } else {
      renderer.rectOutlined(sx + 2, sy + 6, 8, 8, P.bone, P.ink);
      renderer.circle(sx + 6, sy + 3, 4, P.bone);
      renderer.rect(sx + 2, sy + 10, 8, 1, P.ember);
      if (!this.grounded) {
        renderer.rect(sx + 3, sy + 14, 6, 2, P.stoneDark);
      } else if (Math.abs(this.vx) > 0) {
        var frame = Math.floor(performance.now() / 120) % 2;
        if (frame === 0) {
          renderer.rect(sx + 1, sy + 14, 3, 2, P.stoneDark);
          renderer.rect(sx + 8, sy + 13, 3, 2, P.stoneDark);
        } else {
          renderer.rect(sx + 1, sy + 13, 3, 2, P.stoneDark);
          renderer.rect(sx + 8, sy + 14, 3, 2, P.stoneDark);
        }
      } else {
        renderer.rect(sx + 2, sy + 14, 3, 2, P.stoneDark);
        renderer.rect(sx + 7, sy + 14, 3, 2, P.stoneDark);
      }
    }

    if (this.attackFlashTimer > 0) {
      var cx = sx + 6,
        cy = sy + 8;
      var start = this.facing >= 0 ? -0.9 : Math.PI - 0.6;
      var end = this.facing >= 0 ? 0.6 : Math.PI + 0.9;
      renderer.arcStroke(cx, cy, 9, start, end, P.ember, 2);
      renderer.arcStroke(cx, cy, 6, start, end, P.emberLight, 1);
    }

    ctx.restore();
  };

  ED.Player = Player;
})();
