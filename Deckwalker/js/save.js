const SAVE_PREFIX = 'deckwalker_slot_';
const META_KEY = 'deckwalker_meta';
const SAVE_VERSION = 1;

function loadMeta() {
  const raw = localStorage.getItem(META_KEY);
  if (!raw) return { permanentCards: ['rostklinge'], totalGoldEarned: 0 };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.permanentCards.includes('rostklinge')) parsed.permanentCards.push('rostklinge');
    return parsed;
  } catch (e) {
    return { permanentCards: ['rostklinge'], totalGoldEarned: 0 };
  }
}

function saveMeta(meta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function listSaveSlots() {
  const slots = [];
  for (let i = 1; i <= 3; i++) {
    const raw = localStorage.getItem(SAVE_PREFIX + i);
    if (!raw) {
      slots.push({ slot: i, empty: true });
      continue;
    }
    try {
      const data = JSON.parse(raw);
      slots.push({ slot: i, empty: false, timestamp: data.timestamp, levelId: data.levelId, gold: data.gold });
    } catch (e) {
      slots.push({ slot: i, empty: true });
    }
  }
  return slots;
}

function saveToSlot(slot, state) {
  const payload = {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    levelId: state.levelId,
    checkpointIndex: state.checkpointIndex || 0,
    gold: state.gold,
    hp: state.hp,
    maxHp: state.maxHp,
    deck: state.deck,
    bindings: state.bindings,
    completedLevels: state.completedLevels
  };
  localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(payload));
  return payload;
}

function loadFromSlot(slot) {
  const raw = localStorage.getItem(SAVE_PREFIX + slot);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function deleteSlot(slot) {
  localStorage.removeItem(SAVE_PREFIX + slot);
}
