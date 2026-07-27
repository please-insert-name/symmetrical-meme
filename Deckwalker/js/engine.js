const VIEW_W = 480;
const VIEW_H = 270;

class InputState {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this._bind();
  }
  _bind() {
    const trackedKeys = new Set(['w', 'a', 's', 'd', 'i', 'j', 'k', 'l']);
    window.addEventListener('keydown', e => {
      const key = e.key.toLowerCase();
      if (!trackedKeys.has(key)) return;
      if (!this.down.has(key)) this.pressed.add(key);
      this.down.add(key);
      e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      const key = e.key.toLowerCase();
      this.down.delete(key);
    });
  }
  endFrame() {
    this.pressed.clear();
  }
}

class Camera {
  constructor() { this.x = 0; }
  follow(target, levelWidth) {
    const desired = target.x - VIEW_W / 2;
    this.x += (desired - this.x) * 0.15;
    this.x = Math.max(0, Math.min(this.x, levelWidth - VIEW_W));
  }
}

function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
