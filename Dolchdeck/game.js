/* ============================================================
   DOLCHDECK — Hauptsteuerung / Screen-Wechsel
   Start-Screen ⇄ Sidescroller-Level ⇄ Charakteransicht (Deckbuilder)
   ============================================================ */

let currentScreen = "start";

function showScreen(name) {
  currentScreen = name;
  document.querySelectorAll(".screen").forEach(el => el.classList.add("hidden"));
  document.getElementById("reward-panel").classList.add("hidden");

  if (name === "start") {
    renderStartScreen();
    document.getElementById("screen-start").classList.remove("hidden");
  } else if (name === "sidescroller") {
    document.getElementById("screen-sidescroller").classList.remove("hidden");
    const save = loadSave();
    initSidescroller(save.currentLevel, null);
  } else if (name === "deckbuilder") {
    document.getElementById("screen-deckbuilder").classList.remove("hidden");
    initDeckbuilder();
  }
}

// Wird von sidescroller.js aufgerufen, sobald ein Level (inkl. Belohnung) abgeschlossen ist
function onSidescrollerFinished() {
  showScreen("deckbuilder");
}

function renderStartScreen() {
  const save = loadSave();
  const hasProgress = save.currentLevel > 0 || save.runDeck.length > 0 || save.startDeck.length > 1;
  const root = document.getElementById("screen-start");
  root.innerHTML = `
    <div class="title-box">
      <h1>🗡 DOLCHDECK</h1>
      <p class="subtitle">Ein Sidescroller trifft auf einen Deckbuilder</p>
      <div class="menu-buttons">
        <button id="btn-continue" class="primary-btn big">${hasProgress ? "Fortsetzen" : "Neues Spiel starten"}</button>
        ${hasProgress ? `<button id="btn-new" class="danger-btn">Neues Spiel (Fortschritt löschen)</button>` : ""}
      </div>
      <div class="controls-info">
        <h3>Steuerung</h3>
        <p><strong>A / D</strong> — Bewegen &nbsp; <strong>W</strong> — Springen &nbsp; <strong>S</strong> — Ducken</p>
        <p><strong>L</strong> — Dolch (Standardangriff) &nbsp; <strong>I / J / K</strong> — Kartenfähigkeiten</p>
      </div>
    </div>
  `;
  document.getElementById("btn-continue").onclick = () => showScreen("sidescroller");
  const newBtn = document.getElementById("btn-new");
  if (newBtn) {
    newBtn.onclick = () => {
      if (confirm("Wirklich einen neuen Spielstand beginnen? Der alte Fortschritt geht verloren.")) {
        resetSave();
        showScreen("start");
      }
    };
  }
}

window.addEventListener("DOMContentLoaded", () => {
  showScreen("start");
});
