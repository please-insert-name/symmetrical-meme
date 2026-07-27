const CARD_DB = {
  rostklinge: {
    id: 'rostklinge', name: 'Rostklinge', type: 'weapon', rarity: 'starter',
    desc: 'Verlässliche Nahkampfklinge. Schnell gezückt, moderater Schaden.',
    dmg: 8, cooldown: 350, kind: 'melee', range: 26, persistCost: 0, icon: 'rostklinge'
  },
  splitterbogen: {
    id: 'splitterbogen', name: 'Splitterbogen', type: 'weapon', rarity: 'common',
    desc: 'Feuert Holzsplitter über Distanz ab.',
    dmg: 6, cooldown: 550, kind: 'projectile', speed: 6.5, persistCost: 80, icon: 'splitterbogen'
  },
  aschestab: {
    id: 'aschestab', name: 'Aschestab', type: 'weapon', rarity: 'uncommon',
    desc: 'Ein trägen Glutball, der Gegner durchschlägt.',
    dmg: 10, cooldown: 700, kind: 'projectile', speed: 4, pierce: true, persistCost: 120, icon: 'aschestab'
  },
  wurzelpeitsche: {
    id: 'wurzelpeitsche', name: 'Wurzelpeitsche', type: 'weapon', rarity: 'uncommon',
    desc: 'Weiter Schwung, zieht Gegner näher heran.',
    dmg: 5, cooldown: 500, kind: 'melee', range: 44, pull: true, persistCost: 100, icon: 'wurzelpeitsche'
  },
  donnerhammer: {
    id: 'donnerhammer', name: 'Donnerhammer', type: 'weapon', rarity: 'rare',
    desc: 'Langsam, aber verheerend. Stößt Gegner zurück.',
    dmg: 18, cooldown: 1100, kind: 'melee', range: 30, knockback: 60, persistCost: 150, icon: 'donnerhammer'
  },
  nebelklingen: {
    id: 'nebelklingen', name: 'Nebelklingen', type: 'weapon', rarity: 'uncommon',
    desc: 'Zwei rasche Hiebe in kurzer Folge.',
    dmg: 4, hits: 2, cooldown: 250, kind: 'melee', range: 22, persistCost: 110, icon: 'nebelklingen'
  },
  kernschmelze: {
    id: 'kernschmelze', name: 'Kernschmelze', type: 'weapon', rarity: 'rare',
    desc: 'Explosion im Umkreis. Selten, aber mächtig.',
    dmg: 22, cooldown: 1800, kind: 'aoe', radius: 60, persistCost: 220, icon: 'kernschmelze'
  },
  frostlanze: {
    id: 'frostlanze', name: 'Frostlanze', type: 'weapon', rarity: 'uncommon',
    desc: 'Verlangsamt getroffene Gegner spürbar.',
    dmg: 7, cooldown: 650, kind: 'projectile', speed: 5, slow: 0.5, slowDuration: 2000, persistCost: 130, icon: 'frostlanze'
  },
  schattenschritt: {
    id: 'schattenschritt', name: 'Schattenschritt', type: 'ability', rarity: 'uncommon',
    desc: 'Kurzer Sprint mit kurzzeitiger Unverwundbarkeit.',
    cooldown: 1200, kind: 'dash', distance: 80, invulnMs: 300, persistCost: 140, icon: 'schattenschritt'
  },
  wurzelschild: {
    id: 'wurzelschild', name: 'Wurzelschild', type: 'ability', rarity: 'uncommon',
    desc: 'Absorbiert die nächsten Treffer für kurze Zeit.',
    cooldown: 2500, kind: 'shield', absorb: 15, durationMs: 4000, persistCost: 130, icon: 'wurzelschild'
  },
  lebensblüte: {
    id: 'lebensblüte', name: 'Lebensblüte', type: 'ability', rarity: 'rare',
    desc: 'Heilt eine kleine Menge Lebenspunkte.',
    cooldown: 3000, kind: 'heal', amount: 15, persistCost: 160, icon: 'lebensblüte'
  },
  sturmschritt: {
    id: 'sturmschritt', name: 'Sturmschritt', type: 'ability', rarity: 'common',
    desc: 'Gewährt einen zusätzlichen Sprung in der Luft.',
    cooldown: 1500, kind: 'airjump', persistCost: 90, icon: 'sturmschritt'
  },
  zaehe_haut: {
    id: 'zaehe_haut', name: 'Zähe Haut', type: 'passive', rarity: 'common',
    desc: '+20 maximale Lebenspunkte.', maxHpBonus: 20, persistCost: 100, icon: 'zaehe_haut'
  },
  goldader: {
    id: 'goldader', name: 'Goldader', type: 'passive', rarity: 'common',
    desc: '+30% Gold aus Belohnungskisten.', goldMult: 0.3, persistCost: 90, icon: 'goldader'
  },
  wutrausch: {
    id: 'wutrausch', name: 'Wutrausch', type: 'passive', rarity: 'uncommon',
    desc: '+40% Schaden, solange Leben unter 30%.', lowHpDmgMult: 0.4, persistCost: 120, icon: 'wutrausch'
  },
  kartenglueck: {
    id: 'kartenglueck', name: 'Kartenglück', type: 'passive', rarity: 'rare',
    desc: 'Belohnungskisten bieten eine zusätzliche Kartenwahl.', extraCardChoice: 1, persistCost: 140, icon: 'kartenglueck'
  }
};

const ALL_CARD_IDS = Object.keys(CARD_DB);
const BINDABLE_TYPES = ['weapon', 'ability'];

function getCard(id) {
  return CARD_DB[id];
}

function rollCardReward(ownedIds, extraChoices) {
  const pool = ALL_CARD_IDS.filter(id => !ownedIds.includes(id) && CARD_DB[id].rarity !== 'starter');
  const rarityWeight = { common: 5, uncommon: 3, rare: 1 };
  const weighted = [];
  pool.forEach(id => {
    const w = rarityWeight[CARD_DB[id].rarity] || 1;
    for (let i = 0; i < w; i++) weighted.push(id);
  });
  const results = [];
  const count = 2 + (extraChoices || 0);
  for (let i = 0; i < count && weighted.length > 0; i++) {
    const pick = weighted[Math.floor(Math.random() * weighted.length)];
    if (!results.includes(pick)) {
      results.push(pick);
      for (let j = weighted.length - 1; j >= 0; j--) if (weighted[j] === pick) weighted.splice(j, 1);
    } else {
      i--;
    }
  }
  return results;
}
