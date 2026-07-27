// Emberdeck — renderer.js
// Canvas setup, palette lookup, camera, and small draw-shape helpers used by
// every canvas-drawn entity/tile.
(function () {
  var ED = (window.ED = window.ED || {});

  var PALETTE = {
    void: '#0d0a14',
    ink: '#1e1730',
    stoneDark: '#3b3352',
    stone: '#5a4e6e',
    stoneLight: '#847896',
    moss: '#4c6b3a',
    mossLight: '#7fa650',
    ember: '#e8622c',
    emberLight: '#f7a24b',
    gold: '#f2c14e',
    blood: '#b5303f',
    bloodDark: '#6e1c26',
    sky: '#2b3a67',
    skyLight: '#4f6fa8',
    bone: '#ece3d0',
    leaf: '#9fd170',
  };

  var canvas = null;
  var ctx = null;
  var camera = { x: 0, y: 0 };

  var Renderer = {
    WIDTH: 320,
    HEIGHT: 180,
    PALETTE: PALETTE,
    camera: camera,

    init: function () {
      canvas = document.getElementById('game-canvas');
      ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      return ctx;
    },

    getCtx: function () {
      return ctx;
    },

    clear: function (color) {
      ctx.fillStyle = color || PALETTE.sky;
      ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
    },

    // world-space -> screen-space helpers
    worldToScreenX: function (wx) {
      return wx - camera.x;
    },
    worldToScreenY: function (wy) {
      return wy - camera.y;
    },

    setCameraTarget: function (targetX, levelWidthPx) {
      var half = this.WIDTH / 2;
      var x = targetX - half;
      if (x < 0) x = 0;
      var maxX = Math.max(0, levelWidthPx - this.WIDTH);
      if (x > maxX) x = maxX;
      camera.x = x;
      camera.y = 0;
    },

    rectOutlined: function (x, y, w, h, fill, strokeColor) {
      ctx.fillStyle = fill;
      ctx.fillRect(Math.round(x), Math.round(y), w, h);
      ctx.strokeStyle = strokeColor || PALETTE.ink;
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w - 1, h - 1);
    },

    rect: function (x, y, w, h, fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(Math.round(x), Math.round(y), w, h);
    },

    circle: function (cx, cy, r, fill) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
    },

    triangleUp: function (cx, baseY, halfWidth, height, fill) {
      ctx.beginPath();
      ctx.moveTo(cx, baseY - height);
      ctx.lineTo(cx - halfWidth, baseY);
      ctx.lineTo(cx + halfWidth, baseY);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    },

    arcStroke: function (cx, cy, r, startAngle, endAngle, color, lineWidth) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth || 1;
      ctx.stroke();
    },
  };

  ED.Renderer = Renderer;
})();
