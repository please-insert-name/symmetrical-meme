// Emberdeck — entity.js
// Minimal shared base for anything that lives in a level: position/velocity,
// an AABB hitbox, and update/render hooks. No full ECS — a flat array of these
// is enough for the vertical slice.
(function () {
  var ED = (window.ED = window.ED || {});

  function Entity(opts) {
    opts = opts || {};
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.vx = 0;
    this.vy = 0;
    this.w = opts.w || 16;
    this.h = opts.h || 16;
    this.dead = false;
    this.type = opts.type || 'entity';
  }

  Entity.prototype.aabb = function () {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  };

  Entity.prototype.centerX = function () {
    return this.x + this.w / 2;
  };

  Entity.prototype.centerY = function () {
    return this.y + this.h / 2;
  };

  Entity.prototype.update = function (dt, level) {
    // overridden by subclasses
  };

  Entity.prototype.render = function (ctx, renderer) {
    // overridden by subclasses
  };

  function aabbOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  ED.Entity = Entity;
  ED.aabbOverlap = aabbOverlap;
})();
