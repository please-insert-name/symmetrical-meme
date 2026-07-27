const PALETTE = {
  '.': null,
  k: '#1b1b2b', w: '#f2e9da',
  s: '#d9a066', e: '#b97a56',
  h: '#4a3b52', i: '#332a3a',
  c: '#35506b', d: '#26394d',
  m: '#9aa5b1', n: '#6b7480',
  g: '#4f7942', f: '#33532c',
  b: '#e8e0c9', o: '#b8ae94',
  r: '#d94f3d', a: '#a5301f',
  p: '#7a5c9e', q: '#52406b',
  y: '#e8c547', z: '#b89328',
  u: '#7d8494', v: '#565c68',
  x: '#eef3f7'
};

function mirrorRows(halfRows) {
  return halfRows.map(row => row + row.split('').reverse().join(''));
}

const SPRITES = {
  player: mirrorRows([
    '...kk',
    '..khi',
    '.khsw',
    '.ksse',
    'kcccc',
    'kcccd',
    '.kcmn',
    '..kmn',
    '..knk'
  ]),
  moosling: mirrorRows([
    '.kk',
    'kgf',
    'kgw',
    'kgf',
    '.kk'
  ]),
  wurzelschreck: mirrorRows([
    '.kk.k',
    'kffgg',
    '.kgwr',
    '.kgfg',
    '..kkk'
  ]),
  knochenwicht: mirrorRows([
    '.kbb',
    'kbwb',
    'kbob',
    '.kbk',
    'kk.k'
  ]),
  pilzsporling: mirrorRows([
    '.kpq',
    'kpwp',
    'kpqp',
    '.kbk',
    '.kbk'
  ]),
  steinwaechter: mirrorRows([
    '.kuu',
    'kuwu',
    'kuuu',
    'kfuu',
    '.kuf'
  ]),
  nebelschleicher: mirrorRows([
    '.kp',
    'kqp',
    'kpw',
    '.kk'
  ]),
  aschewisp: mirrorRows([
    '.kr',
    'krw',
    'kar',
    '.kk'
  ]),
  rootmother: mirrorRows([
    '.kff',
    'kgwg',
    'kgrg',
    'kgfg',
    'kfff',
    '.kbk'
  ]),
  ashking: mirrorRows([
    '.kyy',
    'khwh',
    'khhh',
    'kaaw',
    'kmmm',
    '.kmk'
  ])
};

let spriteRowsValid = true;
Object.keys(SPRITES).forEach(key => {
  const rows = SPRITES[key];
  const w = rows[0].length;
  rows.forEach(r => {
    if (r.length !== w) {
      console.error('Sprite row length mismatch in', key, JSON.stringify(r), 'expected', w, 'got', r.length);
      spriteRowsValid = false;
    }
    for (const ch of r) {
      if (!(ch in PALETTE)) {
        console.error('Unknown palette char', ch, 'in sprite', key);
        spriteRowsValid = false;
      }
    }
  });
});

const spriteCache = new Map();

function renderSpriteToCanvas(key, px) {
  const cacheKey = key + '_' + px;
  if (spriteCache.has(cacheKey)) return spriteCache.get(cacheKey);
  const rows = SPRITES[key];
  if (!rows) return null;
  const h = rows.length;
  const w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w * px;
  c.height = h * px;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      const color = PALETTE[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * px, y * px, px, px);
    }
  }
  spriteCache.set(cacheKey, c);
  return c;
}

function drawSprite(ctx, key, x, y, opts = {}) {
  const px = opts.px || 3;
  const canvas = renderSpriteToCanvas(key, px);
  if (!canvas) return;
  const flip = opts.flip || false;
  const flash = opts.flash || false;
  const bob = opts.bob || 0;
  ctx.save();
  ctx.translate(x, y + bob);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(canvas, flip ? -canvas.width : 0, 0);
  if (flash) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillRect(flip ? -canvas.width : 0, 0, canvas.width, canvas.height);
  }
  ctx.restore();
}

function spriteSize(key, px) {
  const rows = SPRITES[key];
  if (!rows) return { w: 0, h: 0 };
  return { w: rows[0].length * px, h: rows.length * px };
}

function drawTilePlatform(ctx, x, y, w, h, theme) {
  const top = theme === 'root' ? '#3d5a3d' : theme === 'ash' ? '#5a4a4a' : '#4a5a3d';
  const body = theme === 'root' ? '#2b3d2b' : theme === 'ash' ? '#3a2f2f' : '#332f22';
  ctx.fillStyle = body;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = top;
  ctx.fillRect(x, y, w, 4);
  ctx.strokeStyle = '#1b1b2b';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawChest(ctx, x, y, open) {
  ctx.fillStyle = '#1b1b2b';
  ctx.fillRect(x - 1, y - 1, 18, 15);
  ctx.fillStyle = '#8a5a2c';
  ctx.fillRect(x, y + (open ? 4 : 0), 16, 13 - (open ? 4 : 0));
  ctx.fillStyle = '#6b3f1c';
  ctx.fillRect(x, y + (open ? 4 : 6), 16, 2);
  ctx.fillStyle = '#e8c547';
  ctx.fillRect(x + 7, y + 6, 2, 3);
  if (open) {
    ctx.fillStyle = 'rgba(232,197,71,0.55)';
    ctx.fillRect(x - 3, y - 10, 22, 10);
  }
}

function drawCheckpoint(ctx, x, y, active) {
  ctx.fillStyle = '#1b1b2b';
  ctx.fillRect(x, y - 20, 3, 22);
  ctx.fillStyle = active ? '#9adfe0' : '#4a5a6a';
  ctx.beginPath();
  ctx.moveTo(x + 1.5, y - 26);
  ctx.lineTo(x + 8, y - 20);
  ctx.lineTo(x + 1.5, y - 14);
  ctx.closePath();
  ctx.fill();
}

function drawProjectile(ctx, kind, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle || 0);
  if (kind === 'projectile') {
    ctx.fillStyle = '#e8c547';
    ctx.fillRect(-4, -1, 8, 2);
  } else {
    ctx.fillStyle = '#d94f3d';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
