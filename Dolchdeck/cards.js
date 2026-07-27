/* ============================================================
   DOLCHDECK — Kartendaten
   Jede Karte kann einer der Tasten I / J / K / L zugeordnet werden.
   "dolch" ist die Standard-Nahkampfkarte und liegt fest auf L.
   ============================================================ */

const CARD_POOL = [
  {
    id: "dolch",
    name: "Dolch",
    desc: "Schneller Stich aus der Nähe.",
    type: "attack",
    dmg: 8,
    range: 46,
    cooldown: 260,
    color: "#c9c9c9",
    rarity: "starter",
    key: "L",
    locked: true,      // fest auf L, nicht verkaufbar
    cost: 0,
    sellValue: 0
  },
  {
    id: "feuerball",
    name: "Feuerball",
    desc: "Explosiver Fernangriff, trifft auf Distanz.",
    type: "attack",
    dmg: 16,
    range: 260,
    cooldown: 1100,
    color: "#ff6b35",
    rarity: "common",
    cost: 40,
    sellValue: 20
  },
  {
    id: "schild",
    name: "Schild",
    desc: "Macht dich für kurze Zeit unverwundbar.",
    type: "defense",
    duration: 700,
    cooldown: 3200,
    color: "#4dabf7",
    rarity: "common",
    cost: 45,
    sellValue: 22
  },
  {
    id: "heilkraut",
    name: "Heilkraut",
    desc: "Stellt sofort 20 Lebenspunkte wieder her.",
    type: "heal",
    heal: 20,
    cooldown: 5000,
    color: "#51cf66",
    rarity: "common",
    cost: 35,
    sellValue: 17
  },
  {
    id: "blitzschlag",
    name: "Blitzschlag",
    desc: "Trifft alle Gegner in Reichweite gleichzeitig.",
    type: "attack",
    dmg: 11,
    range: 180,
    aoe: true,
    cooldown: 2000,
    color: "#ffd43b",
    rarity: "rare",
    cost: 65,
    sellValue: 32
  },
  {
    id: "dornenhaut",
    name: "Dornenhaut",
    desc: "Reflektiert eingehenden Schaden kurzzeitig.",
    type: "defense",
    duration: 1000,
    cooldown: 4200,
    color: "#845ef7",
    rarity: "rare",
    cost: 60,
    sellValue: 30
  },
  {
    id: "giftklinge",
    name: "Giftklinge",
    desc: "Nahkampfschlag, der zusätzlich Gift verursacht.",
    type: "attack",
    dmg: 6,
    dot: 3,
    dotTicks: 3,
    range: 50,
    cooldown: 1500,
    color: "#2f9e44",
    rarity: "rare",
    cost: 55,
    sellValue: 27
  },
  {
    id: "windstoss",
    name: "Windstoß",
    desc: "Erhöht Sprunghöhe für kurze Zeit deutlich.",
    type: "buff",
    duration: 2200,
    cooldown: 6000,
    color: "#66d9e8",
    rarity: "epic",
    cost: 80,
    sellValue: 40
  }
];

function getCardById(id) {
  return CARD_POOL.find(c => c.id === id);
}

function cloneCard(id) {
  const c = getCardById(id);
  return c ? JSON.parse(JSON.stringify(c)) : null;
}

function randomCardIds(count, excludeStarter = true, pool = CARD_POOL) {
  const source = pool.filter(c => !excludeStarter || c.rarity !== "starter");
  const picks = [];
  const copy = [...source];
  while (picks.length < count && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    picks.push(copy.splice(idx, 1)[0].id);
  }
  return picks;
}
