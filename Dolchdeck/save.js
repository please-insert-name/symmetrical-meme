/* ============================================================
   DOLCHDECK — Speicherstand (localStorage, rein lokal, kein Internet)
   ============================================================ */

const SAVE_KEY = "dolchdeck_save_v1";

function defaultSave() {
  return {
    gold: 0,
    startDeck: ["dolch"],       // dauerhaftes Startdeck (persistiert)
    currentLevel: 0,            // Index in LEVELS
    highestUnlocked: 0,
    runDeck: [],                 // Karten, die im aktuellen Run gefunden wurden
    equipped: { I: null, J: null, K: null, L: "dolch" }
  };
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    // Fallback-Absicherung falls Struktur älter/unvollständig ist
    return Object.assign(defaultSave(), parsed);
  } catch (e) {
    console.warn("Speicherstand beschädigt, setze zurück.", e);
    return defaultSave();
  }
}

function writeSave(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function resetSave() {
  localStorage.removeItem(SAVE_KEY);
  return defaultSave();
}
