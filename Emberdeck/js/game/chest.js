// Emberdeck — chest.js
// End-of-level reward chest. Opens on walk-in + J (contextual interact,
// same convention as shrines). lootFn computes the reward at open-time so it
// can check run-state flags (e.g. "already picked up this card in the field").
(function () {
  var ED = (window.ED = window.ED || {});

  function Chest(x, y, lootFn) {
    ED.Entity.call(this, { x: x, y: y, w: 16, h: 12, type: 'chest' });
    this.lootFn = lootFn;
    this.opened = false;
    this.particles = [];
    this.flashFrames = 0;
  }
  Chest.prototype = Object.create(ED.Entity.prototype);
  Chest.prototype.constructor = Chest;

  Chest.prototype.update = function (dt, level) {
    var player = level.player;
    if (!this.opened && player && ED.aabbOverlap(this.aabb(), player.aabb())) {
      if (ED.Input.isConfirmPressed()) {
        this.open(level, player);
      }
    }
    this.particles = this.particles.filter(function (p) {
      p.life -= dt * 1000;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      return p.life > 0;
    });
    if (this.flashFrames > 0) this.flashFrames--;
  };

  Chest.prototype.open = function (level, player) {
    this.opened = true;
    this.flashFrames = 2;
    var reward = this.lootFn(level, player);
    player.gold += reward.gold || 0;
    var lines = ['+' + (reward.gold || 0) + ' GOLD'];
    if (reward.cardId) {
      var added = player.pickupCard(reward.cardId);
      var card = ED.Cards.get(reward.cardId);
      lines.push('+' + (card ? card.name : reward.cardId) + (added ? '' : ' (Kartenfach voll)'));
    }
    if (ED.Audio) ED.Audio.chest();
    for (var i = 0; i < 6; i++) {
      var angle = (-120 + i * 12) * (Math.PI / 180);
      this.particles.push({
        x: this.centerX(),
        y: this.y,
        vx: Math.sin(angle) * 20,
        vy: Math.cos(angle) * -20,
        life: 500,
      });
    }
    if (ED.HUD) ED.HUD.showRewardPopup(this.centerX() - 42, this.y - 30, lines);
  };

  Chest.prototype.render = function (renderer) {
    var P = renderer.PALETTE;
    var sx = renderer.worldToScreenX(this.x);
    var sy = this.y;
    if (this.flashFrames > 0) {
      renderer.rectOutlined(sx, sy, 16, 12, P.bone, P.ink);
      return;
    }
    if (!this.opened) {
      renderer.rectOutlined(sx, sy + 2, 16, 10, P.stoneDark, P.ink);
      renderer.rectOutlined(sx, sy, 16, 4, P.stone, P.ink);
      renderer.rect(sx + 7, sy + 3, 2, 2, P.gold);
    } else {
      renderer.rectOutlined(sx, sy + 2, 16, 10, P.stoneDark, P.ink);
      renderer.rectOutlined(sx - 2, sy - 6, 16, 4, P.stone, P.ink);
      renderer.rect(sx + 3, sy + 4, 10, 6, P.gold);
    }
    this.particles.forEach(function (p) {
      renderer.rect(renderer.worldToScreenX(p.x), p.y, 2, 2, P.gold);
    });
  };

  ED.Chest = Chest;
})();
