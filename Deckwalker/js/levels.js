const GROUND_Y = 230;

function groundRun(xStart, xEnd, y = GROUND_Y, h = 40) {
  return { x: xStart, y, w: xEnd - xStart, h };
}

const LEVELS = [
  {
    id: 'tutorial',
    name: 'Erste Schritte',
    theme: 'plains',
    width: 1500,
    killY: 420,
    playerStart: { x: 40, y: 150 },
    platforms: [
      groundRun(0, 1500),
      { x: 520, y: 190, w: 90, h: 16 },
      { x: 720, y: 160, w: 90, h: 16 }
    ],
    checkpoints: [{ x: 700, y: GROUND_Y }],
    enemies: [
      { type: 'moosling', x: 380, y: 190 },
      { type: 'moosling', x: 900, y: 190 },
      { type: 'wurzelschreck', x: 1150, y: 190 }
    ],
    tutorialHints: [
      { x: 120, y: 150, text: 'A / D bewegen, W springen' },
      { x: 420, y: 150, text: 'I: gebundene Waffe angreifen' },
      { x: 1050, y: 150, text: 'Fernkämpfer meiden oder ausweichen' }
    ],
    chest: { x: 1420, y: 190, gold: [15, 25], guaranteedCard: 'schattenschritt' }
  },
  {
    id: 'level1',
    name: 'Verwitterte Ebenen',
    theme: 'plains',
    width: 2600,
    killY: 420,
    playerStart: { x: 40, y: 150 },
    platforms: [
      groundRun(0, 520),
      groundRun(565, 1000),
      { x: 700, y: 175, w: 80, h: 16 },
      groundRun(1045, 1500),
      { x: 1260, y: 190, w: 90, h: 16 },
      groundRun(1545, 2600)
    ],
    checkpoints: [{ x: 1000, y: GROUND_Y }],
    enemies: [
      { type: 'moosling', x: 300, y: 190 },
      { type: 'moosling', x: 620, y: 190 },
      { type: 'wurzelschreck', x: 900, y: 190 },
      { type: 'knochenwicht', x: 1200, y: 190 },
      { type: 'knochenwicht', x: 1650, y: 190 },
      { type: 'moosling', x: 1900, y: 190 },
      { type: 'wurzelschreck', x: 2200, y: 190 }
    ],
    chest: { x: 2520, y: 190, gold: [30, 45] }
  },
  {
    id: 'level2',
    name: 'Die Wurzelfeste',
    theme: 'root',
    width: 3000,
    killY: 420,
    playerStart: { x: 40, y: 150 },
    platforms: [
      groundRun(0, 520),
      groundRun(565, 1400),
      { x: 620, y: 195, w: 90, h: 16 },
      { x: 820, y: 165, w: 90, h: 16 },
      groundRun(1445, 1900),
      { x: 1650, y: 190, w: 100, h: 16 },
      groundRun(1945, 3000)
    ],
    checkpoints: [{ x: 940, y: GROUND_Y }, { x: 2000, y: GROUND_Y }],
    enemies: [
      { type: 'knochenwicht', x: 320, y: 190 },
      { type: 'pilzsporling', x: 440, y: 190 },
      { type: 'nebelschleicher', x: 1000, y: 190 },
      { type: 'knochenwicht', x: 1250, y: 190 },
      { type: 'steinwaechter', x: 1550, y: 190 },
      { type: 'pilzsporling', x: 1800, y: 190 },
      { type: 'nebelschleicher', x: 2150, y: 190 },
      { type: 'knochenwicht', x: 2400, y: 190 },
      { type: 'rootmother', x: 2820, y: 174, boss: true }
    ],
    chest: { x: 2940, y: 190, gold: [50, 70] }
  },
  {
    id: 'level3',
    name: 'Die Aschekathedrale',
    theme: 'ash',
    width: 3400,
    killY: 420,
    playerStart: { x: 40, y: 150 },
    platforms: [
      groundRun(0, 480),
      groundRun(525, 1300),
      { x: 620, y: 180, w: 90, h: 16 },
      { x: 800, y: 140, w: 90, h: 16 },
      groundRun(1345, 1900),
      { x: 1550, y: 165, w: 100, h: 16 },
      groundRun(1945, 3400)
    ],
    checkpoints: [{ x: 1400, y: GROUND_Y }, { x: 2400, y: GROUND_Y }],
    enemies: [
      { type: 'aschewisp', x: 400, y: 150 },
      { type: 'nebelschleicher', x: 620, y: 190 },
      { type: 'steinwaechter', x: 950, y: 190 },
      { type: 'aschewisp', x: 1200, y: 140 },
      { type: 'knochenwicht', x: 1500, y: 190 },
      { type: 'nebelschleicher', x: 1960, y: 190 },
      { type: 'steinwaechter', x: 2150, y: 190 },
      { type: 'aschewisp', x: 2550, y: 140 },
      { type: 'knochenwicht', x: 2700, y: 190 },
      { type: 'ashking', x: 3200, y: 160, boss: true }
    ],
    chest: { x: 3340, y: 190, gold: [80, 110] },
    finalLevel: true
  }
];

function getLevel(id) {
  return LEVELS.find(l => l.id === id);
}

function nextLevelId(id) {
  const idx = LEVELS.findIndex(l => l.id === id);
  if (idx === -1 || idx === LEVELS.length - 1) return null;
  return LEVELS[idx + 1].id;
}
