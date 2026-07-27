function freshRunState() {
  const meta = loadMeta();
  const deck = meta.permanentCards.slice();
  const bindings = { I: null, J: null, K: null, L: null };
  if (deck.includes('rostklinge')) bindings.I = 'rostklinge';
  let nextSlot = ['J', 'K', 'L'];
  deck.forEach(id => {
    const card = CARD_DB[id];
    if (id === 'rostklinge') return;
    if (BINDABLE_TYPES.includes(card.type) && nextSlot.length) {
      bindings[nextSlot.shift()] = id;
    }
  });
  return {
    levelId: 'tutorial',
    checkpointIndex: -1,
    gold: 0,
    hp: 100,
    maxHp: 100,
    deck,
    bindings,
    completedLevels: []
  };
}

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.input = new InputState();
    this.camera = new Camera();
    this.state = 'menu';
    this.currentSlot = null;
    this.meta = loadMeta();
    this.runState = null;
    this.lastTime = 0;
    this._bindDom();
    this.renderMenu();
    requestAnimationFrame(t => this.loop(t));
  }

  _bindDom() {
    document.getElementById('btn-menu-from-camp').addEventListener('click', () => {
      this.saveCurrentSlot();
      this.state = 'menu';
      this.renderMenu();
    });
    document.getElementById('btn-camp-save').addEventListener('click', () => {
      this.saveCurrentSlot();
      this.flashMessage('Gespeichert.');
    });
    document.getElementById('btn-camp-continue').addEventListener('click', () => this.startCurrentLevel());
    document.getElementById('btn-reward-continue').addEventListener('click', () => this.finishReward());
    document.getElementById('btn-gameover-checkpoint').addEventListener('click', () => this.continueFromCheckpoint());
    document.getElementById('btn-gameover-menu').addEventListener('click', () => {
      this.state = 'menu';
      this.renderMenu();
    });
    document.getElementById('btn-win-menu').addEventListener('click', () => {
      this.state = 'menu';
      this.renderMenu();
    });
  }

  flashMessage(text) {
    const el = document.getElementById('toast');
    el.textContent = text;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1800);
  }

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (id) document.getElementById(id).classList.add('active');
    document.getElementById('hud').style.display = id ? 'none' : 'flex';
  }

  // ---------- MENU ----------
  renderMenu() {
    this.showScreen('screen-menu');
    const slots = listSaveSlots();
    const list = document.getElementById('slot-list');
    list.innerHTML = '';
    slots.forEach(s => {
      const div = document.createElement('div');
      div.className = 'slot-card';
      if (s.empty) {
        div.innerHTML = `<h3>Slot ${s.slot}</h3><p>Leer</p>
          <button data-act="new" data-slot="${s.slot}">Neues Spiel</button>`;
      } else {
        const date = new Date(s.timestamp).toLocaleString('de-DE');
        div.innerHTML = `<h3>Slot ${s.slot}</h3><p>${getLevel(s.levelId) ? getLevel(s.levelId).name : s.levelId} · ${s.gold} Gold</p>
          <p class="slot-date">${date}</p>
          <button data-act="continue" data-slot="${s.slot}">Fortsetzen</button>
          <button data-act="new" data-slot="${s.slot}" class="secondary">Überschreiben</button>`;
      }
      list.appendChild(div);
    });
    list.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = parseInt(btn.dataset.slot, 10);
        if (btn.dataset.act === 'new') this.newGame(slot);
        else this.continueGame(slot);
      });
    });
    const permDiv = document.getElementById('permanent-collection');
    permDiv.innerHTML = '<h4>Permanente Sammlung</h4>' + this.meta.permanentCards.map(id => {
      const c = CARD_DB[id];
      return `<span class="chip">${c.name}</span>`;
    }).join(' ');
  }

  newGame(slot) {
    this.currentSlot = slot;
    this.meta = loadMeta();
    this.runState = freshRunState();
    this.saveCurrentSlot();
    this.renderCamp();
  }

  continueGame(slot) {
    const data = loadFromSlot(slot);
    if (!data) return this.newGame(slot);
    this.currentSlot = slot;
    this.meta = loadMeta();
    this.runState = {
      levelId: data.levelId,
      checkpointIndex: data.checkpointIndex || -1,
      gold: data.gold,
      hp: data.hp,
      maxHp: data.maxHp,
      deck: data.deck,
      bindings: data.bindings,
      completedLevels: data.completedLevels || []
    };
    this.renderCamp();
  }

  saveCurrentSlot() {
    if (!this.currentSlot || !this.runState) return;
    saveToSlot(this.currentSlot, this.runState);
  }

  // ---------- CAMP ----------
  renderCamp() {
    this.state = 'camp';
    this.showScreen('screen-camp');
    const level = getLevel(this.runState.levelId);
    document.getElementById('camp-gold').textContent = this.runState.gold;
    document.getElementById('camp-level-name').textContent = level ? ('Nächstes Level: ' + level.name) : 'Alle Level abgeschlossen';
    document.getElementById('camp-hp').textContent = `${this.runState.hp} / ${this.runState.maxHp + (this.runState.deck.includes('zaehe_haut') ? CARD_DB.zaehe_haut.maxHpBonus : 0)}`;

    const slotsDiv = document.getElementById('camp-slots');
    slotsDiv.innerHTML = '';
    ['I', 'J', 'K', 'L'].forEach(key => {
      const cardId = this.runState.bindings[key];
      const card = cardId ? CARD_DB[cardId] : null;
      const el = document.createElement('div');
      el.className = 'bind-slot';
      el.innerHTML = `<div class="key-badge">${key}</div><div class="bind-name">${card ? card.name : '— leer —'}</div>`;
      slotsDiv.appendChild(el);
    });

    const deckDiv = document.getElementById('camp-deck');
    deckDiv.innerHTML = '';
    this.runState.deck.forEach(id => {
      const card = CARD_DB[id];
      const isPermanent = this.meta.permanentCards.includes(id);
      const card_el = document.createElement('div');
      card_el.className = 'card-tile rarity-' + card.rarity;
      let bindButtons = '';
      if (BINDABLE_TYPES.includes(card.type)) {
        bindButtons = ['I', 'J', 'K', 'L'].map(k =>
          `<button class="mini-btn ${this.runState.bindings[k] === id ? 'active' : ''}" data-bind="${k}" data-card="${id}">${k}</button>`
        ).join('');
      }
      const persistBtn = isPermanent
        ? `<span class="permanent-tag">Permanent</span>`
        : `<button class="persist-btn" data-persist="${id}" ${this.runState.gold < card.persistCost ? 'disabled' : ''}>Sichern (${card.persistCost}g)</button>`;
      card_el.innerHTML = `
        <div class="card-title">${card.name} <span class="card-type">${card.type}</span></div>
        <div class="card-desc">${card.desc}</div>
        <div class="card-actions">${bindButtons}${persistBtn}</div>`;
      deckDiv.appendChild(card_el);
    });

    deckDiv.querySelectorAll('[data-bind]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.runState.bindings[btn.dataset.bind] = btn.dataset.card;
        this.renderCamp();
      });
    });
    deckDiv.querySelectorAll('[data-persist]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.persist;
        const card = CARD_DB[id];
        if (this.runState.gold >= card.persistCost) {
          this.runState.gold -= card.persistCost;
          this.meta.permanentCards.push(id);
          saveMeta(this.meta);
          this.flashMessage(card.name + ' dauerhaft freigeschaltet.');
          this.renderCamp();
        }
      });
    });

    const startBtn = document.getElementById('btn-camp-continue');
    startBtn.textContent = level ? 'Level starten' : 'Zum Hauptmenü';
    startBtn.onclick = () => level ? this.startCurrentLevel() : (this.state = 'menu', this.renderMenu());
  }

  startCurrentLevel() {
    this.saveCurrentSlot();
    const levelDef = getLevel(this.runState.levelId);
    if (!levelDef) return;
    this.level = levelDef;
    this.player = new Player(levelDef.playerStart.x, levelDef.playerStart.y, {
      hp: this.runState.hp > 0 ? this.runState.hp : this.runState.maxHp,
      maxHp: this.runState.maxHp,
      gold: this.runState.gold,
      deck: this.runState.deck,
      bindings: this.runState.bindings
    });
    this.enemies = levelDef.enemies.map(e => new EnemyEntity(e.type, e.x, e.y));
    this.projectiles = [];
    this.chestOpened = false;
    this.activeCheckpoint = null;
    this.checkpointSnapshot = null;
    this.camera.x = 0;
    this.state = 'level';
    this.showScreen(null);
  }

  respawnAtCheckpoint() {
    if (this.checkpointSnapshot) {
      const snap = this.checkpointSnapshot;
      this.player.x = snap.x;
      this.player.y = snap.y;
      this.player.vx = 0; this.player.vy = 0;
    } else {
      this.player.x = this.level.playerStart.x;
      this.player.y = this.level.playerStart.y;
      this.player.vx = 0; this.player.vy = 0;
    }
    if (this.player.hp <= 0) this.triggerGameOver();
  }

  triggerGameOver() {
    this.state = 'gameover';
    this.showScreen('screen-gameover');
  }

  continueFromCheckpoint() {
    this.player.hp = this.player.effectiveMaxHp();
    if (this.checkpointSnapshot) {
      this.player.x = this.checkpointSnapshot.x;
      this.player.y = this.checkpointSnapshot.y;
    } else {
      this.player.x = this.level.playerStart.x;
      this.player.y = this.level.playerStart.y;
    }
    this.player.vx = 0; this.player.vy = 0;
    this.player.dead = false;
    this.state = 'level';
    this.showScreen(null);
  }

  // ---------- CARD ACTIVATION ----------
  activateCard(player, card) {
    const dmgMult = player.damageMultiplier();
    if (card.kind === 'melee') {
      const hits = card.hits || 1;
      const box = {
        x: player.facing > 0 ? player.x + player.w : player.x - card.range,
        y: player.y - 4, w: card.range, h: player.h + 8
      };
      this.enemies.forEach(en => {
        if (en.dead) return;
        if (aabbOverlap(box, en)) {
          en.takeDamage(card.dmg * hits * dmgMult);
          if (card.pull) en.x += (player.x - en.x) * 0.3;
          if (card.knockback) en.x += Math.sign(en.x - player.x || 1) * card.knockback * 0.4;
        }
      });
    } else if (card.kind === 'projectile') {
      this.projectiles.push(new Projectile(
        player.facing > 0 ? player.x + player.w : player.x,
        player.y + player.h / 2,
        card.speed * player.facing, 0,
        card.dmg * dmgMult, true, card.kind === 'projectile' ? 'projectile' : 'bolt',
        { pierce: card.pierce, slow: card.slow, slowDuration: card.slowDuration }
      ));
    } else if (card.kind === 'aoe') {
      const center = { x: player.x + player.w / 2, y: player.y + player.h / 2 };
      this.enemies.forEach(en => {
        if (en.dead) return;
        const cx = en.x + en.w / 2, cy = en.y + en.h / 2;
        const dist = Math.hypot(cx - center.x, cy - center.y);
        if (dist < card.radius) en.takeDamage(card.dmg * dmgMult);
      });
    } else if (card.kind === 'dash') {
      player.x += card.distance * player.facing;
      player.invulnUntil = performance.now() + card.invulnMs;
    } else if (card.kind === 'shield') {
      player.shield = card.absorb;
      player.shieldUntil = performance.now() + card.durationMs;
    } else if (card.kind === 'heal') {
      player.hp = Math.min(player.effectiveMaxHp(), player.hp + card.amount);
    } else if (card.kind === 'airjump') {
      if (!player.onGround && player.airJumpsUsed < 1) {
        player.vy = -8.5;
        player.airJumpsUsed++;
      }
    }
  }

  spawnEnemyProjectile(enemy, player) {
    const dx = (player.x + player.w / 2) - (enemy.x + enemy.w / 2);
    const dy = (player.y + player.h / 2) - (enemy.y + enemy.h / 2);
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 3.2;
    this.projectiles.push(new Projectile(
      enemy.x + enemy.w / 2, enemy.y + enemy.h / 2,
      (dx / dist) * speed, (dy / dist) * speed,
      enemy.def.dmg, false, 'bolt'
    ));
  }

  // ---------- LEVEL UPDATE ----------
  updateLevel(dt) {
    const level = this.level;
    this.player.update(dt, this.input, level, this);

    level.checkpoints.forEach((cp, idx) => {
      if (this.activeCheckpoint === idx) return;
      if (Math.abs((this.player.x + this.player.w / 2) - cp.x) < 20) {
        this.activeCheckpoint = idx;
        this.checkpointSnapshot = { x: cp.x, y: cp.y - this.player.h };
        this.runState.hp = this.player.hp;
        this.runState.checkpointIndex = idx;
        this.saveCurrentSlot();
        this.flashMessage('Speicherpunkt erreicht.');
      }
    });

    this.enemies.forEach(en => en.update(dt, this.player, level, this));
    this.enemies.forEach(en => {
      if (en.dead && !en.deathHandled) {
        en.deathHandled = true;
        const [gMin, gMax] = en.def.gold;
        let gold = gMin + Math.floor(Math.random() * (gMax - gMin + 1));
        if (this.runState.deck.includes('goldader')) gold = Math.round(gold * (1 + CARD_DB.goldader.goldMult));
        this.player.gold += gold;
        this.runState.gold = this.player.gold;
        if (en.def.explodeOnDeath) {
          const dist = Math.hypot((en.x - this.player.x), (en.y - this.player.y));
          if (dist < 40) this.player.takeDamage(6);
        }
      }
    });
    this.enemies = this.enemies.filter(en => !en.dead);

    this.projectiles.forEach(p => {
      p.update();
      if (p.fromPlayer) {
        this.enemies.forEach(en => {
          if (en.dead || p.dead || p.hitIds.has(en)) return;
          if (Math.abs(p.x - (en.x + en.w / 2)) < en.w / 2 + 4 && Math.abs(p.y - (en.y + en.h / 2)) < en.h / 2 + 4) {
            en.takeDamage(p.dmg);
            if (p.slow) { en.slowUntil = performance.now() + p.slowDuration; en.slowFactor = p.slow; }
            p.hitIds.add(en);
            if (!p.pierce) p.dead = true;
          }
        });
      } else {
        if (aabbOverlap({ x: p.x - 3, y: p.y - 3, w: 6, h: 6 }, this.player)) {
          this.player.takeDamage(p.dmg);
          p.dead = true;
        }
      }
      if (p.x < this.camera.x - 50 || p.x > this.camera.x + VIEW_W + 50) p.dead = true;
    });
    this.projectiles = this.projectiles.filter(p => !p.dead);

    if (this.player.dead) {
      this.triggerGameOver();
      return;
    }

    if (!this.chestOpened) {
      const chest = level.chest;
      const box = { x: chest.x - 6, y: chest.y - 10, w: 32, h: 60 };
      if (aabbOverlap(box, this.player)) {
        this.openChest();
      }
    }

    this.camera.follow(this.player, level.width);
  }

  openChest() {
    this.chestOpened = true;
    const chest = this.level.chest;
    let gold = chest.gold[0] + Math.floor(Math.random() * (chest.gold[1] - chest.gold[0] + 1));
    if (this.runState.deck.includes('goldader')) gold = Math.round(gold * (1 + CARD_DB.goldader.goldMult));
    this.player.gold += gold;
    const extra = this.runState.deck.includes('kartenglueck') ? CARD_DB.kartenglueck.extraCardChoice : 0;
    let choices = rollCardReward(this.runState.deck, extra);
    if (chest.guaranteedCard && !this.runState.deck.includes(chest.guaranteedCard)) {
      choices = [chest.guaranteedCard, ...choices.filter(c => c !== chest.guaranteedCard)].slice(0, choices.length || 1);
    }
    this.rewardData = { gold, choices, levelId: this.level.id };
    this.runState.gold = this.player.gold;
    this.runState.hp = this.player.hp;
    this.runState.completedLevels.push(this.level.id);
    const next = nextLevelId(this.level.id);
    this.runState.levelId = next;
    this.runState.checkpointIndex = -1;
    this.renderReward();
  }

  renderReward() {
    this.state = 'reward';
    this.showScreen('screen-reward');
    document.getElementById('reward-gold').textContent = this.rewardData.gold;
    const list = document.getElementById('reward-cards');
    list.innerHTML = '';
    const cardElements = [];
    this.rewardData.choices.forEach(id => {
      const card = CARD_DB[id];
      const el = document.createElement('div');
      el.className = 'card-tile rarity-' + card.rarity + ' selectable';
      el.innerHTML = `<div class="card-title">${card.name} <span class="card-type">${card.type}</span></div><div class="card-desc">${card.desc}</div>`;
      el.addEventListener('click', () => {
        cardElements.forEach(c => c.classList.remove('chosen'));
        el.classList.add('chosen');
        this.rewardData.selected = id;
      });
      list.appendChild(el);
      cardElements.push(el);
    });
    if (cardElements.length && !this.rewardData.selected) {
      this.rewardData.selected = this.rewardData.choices[0];
      cardElements[0].classList.add('chosen');
    }
  }

  finishReward() {
    if (this.rewardData.selected && !this.runState.deck.includes(this.rewardData.selected)) {
      this.runState.deck.push(this.rewardData.selected);
    }
    this.saveCurrentSlot();
    if (this.level.finalLevel) {
      this.state = 'win';
      this.showScreen('screen-win');
      return;
    }
    this.renderCamp();
  }

  // ---------- RENDER ----------
  renderLevel() {
    const ctx = this.ctx;
    const level = this.level;
    const bg = { plains: '#8fb6d9', root: '#4a5a6a', ash: '#5a4550' }[level.theme] || '#8fb6d9';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.save();
    ctx.translate(-this.camera.x, 0);

    level.platforms.forEach(p => drawTilePlatform(ctx, p.x, p.y, p.w, p.h, level.theme));
    level.checkpoints.forEach((cp, idx) => drawCheckpoint(ctx, cp.x, cp.y, this.activeCheckpoint === idx));
    if (!this.chestOpened) drawChest(ctx, level.chest.x, level.chest.y, false);
    else if (this.state === 'level') drawChest(ctx, level.chest.x, level.chest.y, true);

    if (level.tutorialHints) {
      ctx.font = '8px monospace';
      ctx.fillStyle = '#1b1b2b';
      level.tutorialHints.forEach(h => {
        if (Math.abs(h.x - this.player.x) < 200) {
          ctx.fillStyle = 'rgba(20,20,30,0.6)';
          ctx.fillRect(h.x - 4, h.y - 12, ctx.measureText(h.text).width + 8, 14);
          ctx.fillStyle = '#f2e9da';
          ctx.fillText(h.text, h.x, h.y - 2);
        }
      });
    }

    this.enemies.forEach(en => {
      const bob = en.def.kind === 'flyer' ? Math.sin((en.bobPhase || 0) * 2) * 2 : 0;
      drawSprite(ctx, en.def.sprite, en.x, en.y, { px: en.def.px, flip: en.facing < 0, flash: en.flashing, bob });
      const size = spriteSize(en.def.sprite, en.def.px);
      const hpRatio = Math.max(0, en.hp / en.maxHp);
      ctx.fillStyle = '#1b1b2b';
      ctx.fillRect(en.x, en.y - 6, size.w, 4);
      ctx.fillStyle = '#d94f3d';
      ctx.fillRect(en.x + 1, en.y - 5, (size.w - 2) * hpRatio, 2);
    });

    this.projectiles.forEach(p => drawProjectile(ctx, p.kind, p.x, p.y));

    const runBob = Math.abs(this.player.vx) > 0.3 && this.player.onGround ? Math.sin(performance.now() / 60) * 1.2 : 0;
    drawSprite(ctx, 'player', this.player.x - 4, this.player.y - 4, { px: 3, flip: this.player.facing < 0, flash: this.player.flashing, bob: runBob });

    ctx.restore();

    document.getElementById('hud-hp-fill').style.width = Math.max(0, (this.player.hp / this.player.effectiveMaxHp()) * 100) + '%';
    document.getElementById('hud-hp-text').textContent = `${Math.max(0, Math.round(this.player.hp))} / ${this.player.effectiveMaxHp()}`;
    document.getElementById('hud-gold').textContent = this.player.gold;
    document.getElementById('hud-level-name').textContent = level.name;
    ['I', 'J', 'K', 'L'].forEach(key => {
      const id = this.player.bindings[key];
      const el = document.getElementById('hud-slot-' + key);
      const card = id ? CARD_DB[id] : null;
      el.querySelector('.slot-label').textContent = card ? card.name.slice(0, 10) : '-';
      const ready = card ? performance.now() >= this.player.cooldowns[key] : true;
      el.classList.toggle('cooling', !ready);
    });
  }

  loop(t) {
    const dt = Math.min(33, t - this.lastTime);
    this.lastTime = t;
    if (this.state === 'level') {
      this.updateLevel(dt);
      this.renderLevel();
    }
    this.input.endFrame();
    requestAnimationFrame(tt => this.loop(tt));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
