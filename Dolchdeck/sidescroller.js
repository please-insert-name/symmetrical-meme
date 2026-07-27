/* ============================================================
   DOLCHDECK — Sidescroller-Engine (Canvas, keine Abhängigkeiten)
   Steuerung: A/D Bewegung, W Springen, S Ducken
              I/J/K Kartenslots, L Dolch (Standardangriff)
   ============================================================ */

const LEVELS = [
  {
    name: "Verwunschener Wald",
    tutorial: true,
    bg: "#1b3a2f",
    ground: "#2f5d3a",
    accent: "#4f8f5f",
    length: 2400,
    platforms: [
      { x: 500, y: 250, w: 140, h: 20 },
      { x: 900, y: 200, w: 160, h: 20 },
      { x: 1400, y: 240, w: 140, h: 20 },
      { x: 1850, y: 190, w: 160, h: 20 }
    ],
    enemies: [
      { type: "schleim", x: 700, min: 650, max: 820, hp: 18, dmg: 6, speed: 40 },
      { type: "schleim", x: 1500, min: 1450, max: 1650, hp: 18, dmg: 6, speed: 45 }
    ],
    goldReward: 20,
    cardChoices: 2
  },
  {
    name: "Ruinen von Aschgard",
    bg: "#2a2438",
    ground: "#4a3f63",
    accent: "#7c6ba0",
    length: 3200,
    platforms: [
      { x: 400, y: 260, w: 120, h: 20 },
      { x: 750, y: 210, w: 140, h: 20 },
      { x: 1150, y: 250, w: 120, h: 20 },
      { x: 1550, y: 190, w: 160, h: 20 },
      { x: 2000, y: 240, w: 140, h: 20 },
      { x: 2450, y: 200, w: 160, h: 20 }
    ],
    enemies: [
      { type: "schleim", x: 600, min: 550, max: 700, hp: 20, dmg: 7, speed: 50 },
      { type: "skelett", x: 1200, min: 1120, max: 1320, hp: 30, dmg: 10, speed: 55 },
      { type: "schleim", x: 1900, min: 1850, max: 2050, hp: 20, dmg: 7, speed: 55 },
      { type: "skelett", x: 2600, min: 2500, max: 2750, hp: 32, dmg: 11, speed: 60 }
    ],
    goldReward: 35,
    cardChoices: 2
  },
  {
    name: "Nebelmoor-Sümpfe",
    bg: "#1c2f2e",
    ground: "#2e4a44",
    accent: "#3f8f7a",
    length: 3600,
    platforms: [
      { x: 350, y: 250, w: 120, h: 20 },
      { x: 700, y: 190, w: 140, h: 20 },
      { x: 1100, y: 260, w: 120, h: 20 },
      { x: 1500, y: 210, w: 160, h: 20 },
      { x: 1950, y: 250, w: 120, h: 20 },
      { x: 2350, y: 190, w: 160, h: 20 },
      { x: 2800, y: 230, w: 140, h: 20 }
    ],
    enemies: [
      { type: "skelett", x: 500, min: 430, max: 620, hp: 30, dmg: 10, speed: 60 },
      { type: "schleim", x: 1050, min: 980, max: 1200, hp: 22, dmg: 8, speed: 60 },
      { type: "skelett", x: 1700, min: 1600, max: 1850, hp: 34, dmg: 12, speed: 65 },
      { type: "schleim", x: 2300, min: 2200, max: 2450, hp: 22, dmg: 8, speed: 65 },
      { type: "skelett", x: 3000, min: 2900, max: 3150, hp: 36, dmg: 13, speed: 70 }
    ],
    goldReward: 50,
    cardChoices: 2
  },
  {
    name: "Drachenfeste",
    boss: true,
    bg: "#3a1c1c",
    ground: "#5c2b2b",
    accent: "#c0392b",
    length: 2600,
    platforms: [
      { x: 500, y: 240, w: 140, h: 20 },
      { x: 950, y: 200, w: 160, h: 20 },
      { x: 1500, y: 240, w: 140, h: 20 }
    ],
    enemies: [
      { type: "skelett", x: 900, min: 820, max: 1000, hp: 30, dmg: 10, speed: 55 },
      { type: "skelett", x: 1300, min: 1220, max: 1420, hp: 30, dmg: 10, speed: 55 },
      { type: "drache", x: 2100, min: 1950, max: 2300, hp: 110, dmg: 18, speed: 70, boss: true }
    ],
    goldReward: 100,
    cardChoices: 2,
    guaranteedRarity: "epic"
  }
];

const CANVAS_W = 960;
const CANVAS_H = 360;
const GRAVITY = 1400;
const GROUND_Y = 300;

let ss = null; // aktueller Sidescroller-Zustand
let rafId = null;
let lastTime = 0;
const keys = {};

function initSidescroller(levelIndex, onLevelComplete) {
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const level = LEVELS[levelIndex % LEVELS.length];
  const cycle = Math.floor(levelIndex / LEVELS.length); // Schwierigkeits-Skalierung nach vollem Zyklus
  const diffMult = 1 + cycle * 0.25;

  const save = loadSave();
  const equipped = save.equipped;

  ss = {
    canvas, ctx, level, onLevelComplete, diffMult,
    player: {
      x: 60, y: GROUND_Y - 48, w: 28, h: 48, vx: 0, vy: 0,
      onGround: false, ducking: false, facing: 1,
      hp: 100, maxHp: 100,
      invulnUntil: 0,
      jumpBoostUntil: 0
    },
    camX: 0,
    enemies: level.enemies.map(e => ({
      ...e,
      hp: Math.round(e.hp * diffMult),
      maxHp: Math.round(e.hp * diffMult),
      dmg: Math.round(e.dmg * diffMult),
      dir: 1,
      alive: true,
      dot: 0,
      dotTicksLeft: 0,
      dotTimer: 0
    })),
    projectiles: [],
    floatingTexts: [],
    cooldowns: { I: 0, J: 0, K: 0, L: 0 },
    state: "playing", // playing | reward | done
    reward: null,
    equipped
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  lastTime = performance.now();
  rafId = requestAnimationFrame(loop);
}

function stopSidescroller() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("keyup", handleKeyUp);
  ss = null;
}

function handleKeyDown(e) {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (!ss || ss.state !== "playing") return;
  if (k === "i") useSlot("I");
  if (k === "j") useSlot("J");
  if (k === "k") useSlot("K");
  if (k === "l") useSlot("L");
}

function handleKeyUp(e) {
  keys[e.key.toLowerCase()] = false;
}

function useSlot(slot) {
  const now = performance.now();
  const cardId = ss.equipped[slot];
  if (!cardId) return;
  const card = getCardById(cardId);
  if (!card) return;
  if (now < (ss.cooldowns[slot] || 0)) return;

  ss.cooldowns[slot] = now + card.cooldown;
  const p = ss.player;

  switch (card.type) {
    case "attack":
      performAttack(card);
      break;
    case "defense":
      p.invulnUntil = now + card.duration;
      addFloatingText(p.x, p.y - 10, "Schild!", card.color);
      break;
    case "heal":
      p.hp = Math.min(p.maxHp, p.hp + card.heal);
      addFloatingText(p.x, p.y - 10, "+" + card.heal, "#51cf66");
      break;
    case "buff":
      p.jumpBoostUntil = now + card.duration;
      addFloatingText(p.x, p.y - 10, "Windstoß!", card.color);
      break;
  }
}

function performAttack(card) {
  const p = ss.player;

  if (card.aoe) {
    // Flächenangriff: trifft sofort alle Gegner in Reichweite (einmalig)
    ss.enemies.forEach(en => {
      if (!en.alive) return;
      const dist = Math.abs((en.x + 16) - (p.x + p.w / 2));
      if (dist <= card.range) damageEnemy(en, card.dmg, card);
    });
    return;
  }

  if (card.range > 60) {
    // Fernkampf: Projektil spawnen
    ss.projectiles.push({
      x: p.x + p.w / 2, y: p.y + p.h / 2, dir: p.facing,
      speed: 500, dmg: card.dmg, color: card.color, life: 1.2
    });
    return;
  }

  // Nahkampf: direkte Reichweitenprüfung
  ss.enemies.forEach(en => {
    if (!en.alive) return;
    const dist = Math.abs((en.x + 16) - (p.x + p.w / 2));
    const inFront = p.facing > 0 ? (en.x + 16) > p.x : (en.x + 16) < p.x;
    if (dist <= card.range && inFront) {
      damageEnemy(en, card.dmg, card);
    }
  });
}

function damageEnemy(en, dmg, card) {
  en.hp -= dmg;
  addFloatingText(en.x, en.y - 10, "-" + dmg, "#ffe066");
  if (card && card.dot) {
    en.dot = card.dot;
    en.dotTicksLeft = card.dotTicks || 0;
    en.dotTimer = 0;
  }
  if (en.hp <= 0) {
    en.alive = false;
  }
}

function addFloatingText(x, y, text, color) {
  ss.floatingTexts.push({ x, y, text, color, life: 0.8 });
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (!ss) return;

  if (ss.state === "playing") update(dt, now);
  render();

  rafId = requestAnimationFrame(loop);
}

function update(dt, now) {
  const p = ss.player;
  const level = ss.level;

  // --- Bewegung (A/D) ---
  const speed = 210;
  p.vx = 0;
  if (keys["a"]) { p.vx = -speed; p.facing = -1; }
  if (keys["d"]) { p.vx = speed; p.facing = 1; }
  p.ducking = !!keys["s"] && p.onGround;

  // --- Springen (W) ---
  const jumpBoost = now < p.jumpBoostUntil ? 1.5 : 1;
  if (keys["w"] && p.onGround) {
    p.vy = -560 * jumpBoost;
    p.onGround = false;
  }

  // --- Physik ---
  p.vy += GRAVITY * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = Math.max(0, Math.min(level.length - p.w, p.x));

  // Boden- und Plattformkollision (einfach, von oben)
  p.onGround = false;
  const groundTop = GROUND_Y;
  if (p.y + p.h >= groundTop) {
    p.y = groundTop - p.h;
    p.vy = 0;
    p.onGround = true;
  }
  level.platforms.forEach(pl => {
    const withinX = p.x + p.w > pl.x && p.x < pl.x + pl.w;
    const wasAbove = (p.y + p.h - p.vy * dt) <= pl.y + 2;
    if (withinX && p.vy >= 0 && wasAbove && p.y + p.h >= pl.y && p.y + p.h <= pl.y + pl.h + 20) {
      p.y = pl.y - p.h;
      p.vy = 0;
      p.onGround = true;
    }
  });

  // --- Kamera folgt Spieler ---
  ss.camX = Math.max(0, Math.min(level.length - CANVAS_W, p.x - CANVAS_W / 2));

  // --- Gegner-KI ---
  ss.enemies.forEach(en => {
    if (!en.alive) return;
    en.x += en.dir * en.speed * dt;
    if (en.x < en.min) { en.x = en.min; en.dir = 1; }
    if (en.x > en.max) { en.x = en.max; en.dir = -1; }

    // Gift-Tick
    if (en.dotTicksLeft > 0) {
      en.dotTimer += dt;
      if (en.dotTimer >= 1) {
        en.dotTimer = 0;
        en.dotTicksLeft--;
        damageEnemy(en, en.dot);
      }
    }

    // Kontakt mit Spieler
    const overlap = p.x < en.x + 32 && p.x + p.w > en.x && p.y + p.h > en.y && p.y < en.y + 40;
    if (overlap && now >= p.invulnUntil) {
      p.hp -= en.dmg * dt * 2.2;
      if (p.hp < 0) p.hp = 0;
    }
  });

  // --- Projektile ---
  ss.projectiles.forEach(pr => {
    pr.x += pr.speed * pr.dir * dt;
    pr.life -= dt;
    ss.enemies.forEach(en => {
      if (!en.alive) return;
      {
        const hit = Math.abs((en.x + 16) - pr.x) < 26 && Math.abs((en.y + 20) - pr.y) < 30;
        if (hit) {
          damageEnemy(en, pr.dmg);
          pr.life = 0;
        }
      }
    });
  });
  ss.projectiles = ss.projectiles.filter(pr => pr.life > 0);

  // --- Floating Texts ---
  ss.floatingTexts.forEach(t => { t.life -= dt; t.y -= 20 * dt; });
  ss.floatingTexts = ss.floatingTexts.filter(t => t.life > 0);

  // --- Level-Ende erreicht? ---
  if (p.x >= level.length - p.w - 40) {
    triggerReward();
  }

  // --- Spieler besiegt? ---
  if (p.hp <= 0) {
    respawnPlayer();
  }
}

function respawnPlayer() {
  const p = ss.player;
  p.hp = p.maxHp;
  p.x = Math.max(0, p.x - 300);
  p.y = GROUND_Y - p.h;
  p.vy = 0;
  p.invulnUntil = performance.now() + 1500;
}

function triggerReward() {
  if (ss.state !== "playing") return;
  ss.state = "reward";
  const level = ss.level;
  let pool = CARD_POOL.filter(c => c.rarity !== "starter");
  if (level.guaranteedRarity) {
    pool = pool.filter(c => c.rarity === level.guaranteedRarity || Math.random() < 0.5);
  }
  const choiceIds = randomCardIds(level.cardChoices, true, pool.length ? pool : CARD_POOL);
  ss.reward = { gold: level.goldReward, choices: choiceIds };
  renderRewardPanel();
}

function renderRewardPanel() {
  const panel = document.getElementById("reward-panel");
  const level = ss.level;
  panel.innerHTML = "";
  panel.classList.remove("hidden");

  const title = document.createElement("h2");
  title.textContent = "🎁 Belohnungskiste — " + level.name;
  panel.appendChild(title);

  const goldLine = document.createElement("p");
  goldLine.textContent = "Gold erhalten: +" + ss.reward.gold;
  panel.appendChild(goldLine);

  const subtitle = document.createElement("p");
  subtitle.textContent = "Wähle eine Karte für dein Run-Deck:";
  panel.appendChild(subtitle);

  const cardRow = document.createElement("div");
  cardRow.className = "reward-cards";
  ss.reward.choices.forEach(id => {
    const card = getCardById(id);
    const el = document.createElement("div");
    el.className = "card-tile";
    el.style.borderColor = card.color;
    el.innerHTML = `<strong>${card.name}</strong><span class="rarity">${card.rarity}</span><p>${card.desc}</p>`;
    el.onclick = () => confirmReward(id);
    cardRow.appendChild(el);
  });
  panel.appendChild(cardRow);
}

function confirmReward(chosenCardId) {
  const save = loadSave();
  save.gold += ss.reward.gold;
  save.runDeck.push(chosenCardId);
  writeSave(save);

  const panel = document.getElementById("reward-panel");
  panel.innerHTML = "";
  const done = document.createElement("div");
  done.innerHTML = `<h2>Level abgeschlossen!</h2><p>Karte <strong>${getCardById(chosenCardId).name}</strong> und ${ss.reward.gold} Gold erhalten.</p>`;
  const btn = document.createElement("button");
  btn.textContent = "Weiter zur Charakteransicht →";
  btn.className = "primary-btn";
  btn.onclick = () => {
    panel.classList.add("hidden");
    ss.state = "done";
    stopSidescroller();
    ss && ss.onLevelComplete && ss.onLevelComplete();
    if (typeof onSidescrollerFinished === "function") onSidescrollerFinished();
  };
  done.appendChild(btn);
  panel.appendChild(done);
}

function render() {
  const { ctx, level, player: p, camX } = ss;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Hintergrund
  ctx.fillStyle = level.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Parallax-Streifen (billig, aber wirkungsvoll für Retro-Look)
  ctx.fillStyle = level.accent;
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 12; i++) {
    const x = (i * 220 - camX * 0.3) % (CANVAS_W + 220);
    ctx.fillRect(x, 40 + (i % 3) * 30, 6, 120);
  }
  ctx.globalAlpha = 1;

  // Boden
  ctx.fillStyle = level.ground;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

  // Plattformen
  ctx.fillStyle = level.accent;
  level.platforms.forEach(pl => {
    ctx.fillRect(pl.x - camX, pl.y, pl.w, pl.h);
  });

  // Ziel-Markierung (Kiste am Levelende)
  ctx.fillStyle = "#e0b83e";
  ctx.fillRect(level.length - 60 - camX, GROUND_Y - 34, 34, 34);
  ctx.strokeStyle = "#7a5a1e";
  ctx.lineWidth = 3;
  ctx.strokeRect(level.length - 60 - camX, GROUND_Y - 34, 34, 34);

  // Gegner
  ss.enemies.forEach(en => {
    if (!en.alive) return;
    const ex = en.x - camX;
    const isBoss = !!en.boss;
    ctx.fillStyle = en.type === "skelett" ? "#d8d3c4" : en.type === "drache" ? "#c0392b" : "#3f8f5a";
    const w = isBoss ? 56 : 32, h = isBoss ? 64 : 36;
    ctx.fillRect(ex, GROUND_Y - h, w, h);
    // HP-Balken
    ctx.fillStyle = "#222";
    ctx.fillRect(ex, GROUND_Y - h - 10, w, 5);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(ex, GROUND_Y - h - 10, w * Math.max(0, en.hp / en.maxHp), 5);
  });

  // Projektile
  ss.projectiles.forEach(pr => {
    ctx.fillStyle = pr.color;
    ctx.beginPath();
    ctx.arc(pr.x - camX, pr.y, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  // Spieler
  const px = p.x - camX;
  const py = p.ducking ? p.y + 16 : p.y;
  const ph = p.ducking ? p.h - 16 : p.h;
  const now = performance.now();
  const flashing = now < p.invulnUntil && Math.floor(now / 100) % 2 === 0;
  ctx.fillStyle = flashing ? "#ffffff" : "#e8c15a";
  ctx.fillRect(px, py, p.w, ph);
  // Blickrichtung
  ctx.fillStyle = "#2c2c2c";
  ctx.fillRect(p.facing > 0 ? px + p.w - 4 : px, py + 8, 4, 6);

  // Floating Texts
  ss.floatingTexts.forEach(t => {
    ctx.globalAlpha = Math.max(0, t.life);
    ctx.fillStyle = t.color;
    ctx.font = "12px monospace";
    ctx.fillText(t.text, t.x - camX, t.y);
    ctx.globalAlpha = 1;
  });

  // HUD
  drawHud();
}

function drawHud() {
  const ctx = ss.ctx;
  const p = ss.player;

  // HP-Balken
  ctx.fillStyle = "#222";
  ctx.fillRect(16, 16, 200, 18);
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(16, 16, 200 * Math.max(0, p.hp / p.maxHp), 18);
  ctx.strokeStyle = "#000";
  ctx.strokeRect(16, 16, 200, 18);
  ctx.fillStyle = "#fff";
  ctx.font = "12px monospace";
  ctx.fillText(`HP ${Math.ceil(p.hp)}/${p.maxHp}`, 22, 30);

  // Levelname
  ctx.fillStyle = "#fff";
  ctx.font = "14px monospace";
  ctx.fillText(ss.level.name, CANVAS_W - ctx.measureText(ss.level.name).width - 16, 26);

  // Kartenslots I J K L
  const slots = ["I", "J", "K", "L"];
  const now = performance.now();
  slots.forEach((slot, i) => {
    const x = 16 + i * 90;
    const y = CANVAS_H - 60;
    const cardId = ss.equipped[slot];
    const card = cardId ? getCardById(cardId) : null;

    ctx.fillStyle = "#111";
    ctx.fillRect(x, y, 78, 44);
    ctx.strokeStyle = card ? card.color : "#444";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 78, 44);

    if (card) {
      const cdLeft = Math.max(0, (ss.cooldowns[slot] || 0) - now);
      const cdFrac = cdLeft / card.cooldown;
      if (cdFrac > 0) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(x, y + 44 * (1 - cdFrac), 78, 44 * cdFrac);
      }
      ctx.fillStyle = "#fff";
      ctx.font = "10px monospace";
      ctx.fillText(card.name, x + 4, y + 16);
    }

    ctx.fillStyle = "#ffd43b";
    ctx.font = "bold 12px monospace";
    ctx.fillText(slot, x + 4, y + 40);
  });

  if (ss.level.tutorial) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(CANVAS_W / 2 - 220, 44, 440, 26);
    ctx.fillStyle = "#fff";
    ctx.font = "13px monospace";
    ctx.fillText("A/D bewegen · W springen · S ducken · L Dolch · I/J/K Karten", CANVAS_W / 2 - 210, 61);
  }
}
