/* ============================================================
   DOLCHDECK — Charakteransicht / Deckbuilder-Screen
   - Karten den Tasten I/J/K zuordnen (L ist fest der Dolch)
   - Karten aus dem Run-Deck verkaufen (Gold)
   - Karten im Shop dauerhaft ins Startdeck kaufen (Persistenz)
   ============================================================ */

function initDeckbuilder() {
  renderDeckbuilder();
}

function ownedCardIds(save) {
  return Array.from(new Set([...save.startDeck, ...save.runDeck]));
}

function renderDeckbuilder() {
  const save = loadSave();
  const root = document.getElementById("screen-deckbuilder");
  root.innerHTML = "";

  const header = document.createElement("div");
  header.className = "deck-header";
  header.innerHTML = `
    <h1>⚔ Charakteransicht</h1>
    <div class="gold-display">💰 ${save.gold} Gold</div>
  `;
  root.appendChild(header);

  // --- Ausrüstungs-Slots ---
  const slotSection = document.createElement("section");
  slotSection.className = "panel";
  const slotTitle = document.createElement("h2");
  slotTitle.textContent = "Ausgerüstete Karten (I / J / K / L)";
  slotSection.appendChild(slotTitle);

  const slotRow = document.createElement("div");
  slotRow.className = "slot-row";
  ["I", "J", "K", "L"].forEach(slot => {
    const cardId = save.equipped[slot];
    const card = cardId ? getCardById(cardId) : null;
    const box = document.createElement("div");
    box.className = "slot-box";
    box.style.borderColor = card ? card.color : "#444";
    box.innerHTML = `
      <div class="slot-key">${slot}</div>
      ${card ? `<strong>${card.name}</strong><p>${card.desc}</p>` : `<em>leer</em>`}
      ${slot === "L" ? `<span class="locked-tag">fest</span>` : (card ? `<button data-unequip="${slot}">Entfernen</button>` : "")}
    `;
    slotRow.appendChild(box);
  });
  slotSection.appendChild(slotRow);
  root.appendChild(slotSection);

  // --- Dein Deck (Zuordnung) ---
  const deckSection = document.createElement("section");
  deckSection.className = "panel";
  deckSection.innerHTML = `<h2>Dein Deck — Karten zuordnen &amp; verkaufen</h2>`;
  const deckGrid = document.createElement("div");
  deckGrid.className = "card-grid";

  const owned = ownedCardIds(save);
  if (owned.filter(id => id !== "dolch").length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Noch keine weiteren Karten. Schließe ein Level ab, um Belohnungen zu erhalten.";
    deckGrid.appendChild(empty);
  }

  owned.forEach(id => {
    const card = getCardById(id);
    if (!card || card.locked) return; // Dolch wird nicht separat gelistet
    const inStartDeck = save.startDeck.includes(id);
    const equippedSlot = Object.keys(save.equipped).find(s => save.equipped[s] === id);

    const el = document.createElement("div");
    el.className = "card-tile";
    el.style.borderColor = card.color;
    el.innerHTML = `
      <strong>${card.name}</strong>
      <span class="rarity">${card.rarity}${inStartDeck ? " · Startdeck" : ""}</span>
      <p>${card.desc}</p>
      <div class="card-actions"></div>
    `;
    const actions = el.querySelector(".card-actions");

    ["I", "J", "K"].forEach(slot => {
      const btn = document.createElement("button");
      btn.textContent = equippedSlot === slot ? `✓ ${slot}` : `→ ${slot}`;
      btn.disabled = equippedSlot === slot;
      btn.onclick = () => equipCard(id, slot);
      actions.appendChild(btn);
    });

    if (!inStartDeck) {
      const sellBtn = document.createElement("button");
      sellBtn.className = "sell-btn";
      sellBtn.textContent = `Verkaufen (+${card.sellValue}G)`;
      sellBtn.onclick = () => sellCard(id);
      actions.appendChild(sellBtn);
    }

    deckGrid.appendChild(el);
  });
  deckSection.appendChild(deckGrid);
  root.appendChild(deckSection);

  // --- Shop: Karten dauerhaft ins Startdeck kaufen ---
  const shopSection = document.createElement("section");
  shopSection.className = "panel";
  shopSection.innerHTML = `<h2>Schrein der Beständigkeit — Karten dauerhaft freischalten</h2>
    <p class="muted">Gekaufte Karten wandern ins <strong>Startdeck</strong> und sind ab sofort in jedem neuen Run von Beginn an verfügbar.</p>`;
  const shopGrid = document.createElement("div");
  shopGrid.className = "card-grid";

  CARD_POOL.filter(c => !c.locked && !save.startDeck.includes(c.id)).forEach(card => {
    const el = document.createElement("div");
    el.className = "card-tile shop-tile";
    el.style.borderColor = card.color;
    const affordable = save.gold >= card.cost;
    el.innerHTML = `
      <strong>${card.name}</strong>
      <span class="rarity">${card.rarity}</span>
      <p>${card.desc}</p>
      <button class="${affordable ? "primary-btn" : ""}" ${affordable ? "" : "disabled"}>
        Kaufen (${card.cost}G)
      </button>
    `;
    el.querySelector("button").onclick = () => buyCard(card.id);
    shopGrid.appendChild(el);
  });
  if (shopGrid.children.length === 0) {
    const all = document.createElement("p");
    all.className = "muted";
    all.textContent = "Alle Karten sind bereits im Startdeck freigeschaltet!";
    shopGrid.appendChild(all);
  }
  shopSection.appendChild(shopGrid);
  root.appendChild(shopSection);

  // --- Weiter-Button ---
  const nav = document.createElement("div");
  nav.className = "nav-row";
  const nextLevel = LEVELS[save.currentLevel % LEVELS.length];
  const nextBtn = document.createElement("button");
  nextBtn.className = "primary-btn big";
  nextBtn.textContent = `⚔ Level starten: ${nextLevel.name} →`;
  nextBtn.onclick = () => goToNextLevel();
  nav.appendChild(nextBtn);

  const resetBtn = document.createElement("button");
  resetBtn.className = "danger-btn";
  resetBtn.textContent = "Spielstand zurücksetzen";
  resetBtn.onclick = () => {
    if (confirm("Spielstand wirklich vollständig zurücksetzen?")) {
      resetSave();
      renderDeckbuilder();
    }
  };
  nav.appendChild(resetBtn);

  root.appendChild(nav);

  // Unequip-Buttons verdrahten
  root.querySelectorAll("[data-unequip]").forEach(btn => {
    btn.onclick = () => unequipSlot(btn.getAttribute("data-unequip"));
  });
}

function equipCard(cardId, slot) {
  const save = loadSave();
  // Karte ggf. aus anderem Slot entfernen
  Object.keys(save.equipped).forEach(s => {
    if (s !== "L" && save.equipped[s] === cardId) save.equipped[s] = null;
  });
  save.equipped[slot] = cardId;
  writeSave(save);
  renderDeckbuilder();
}

function unequipSlot(slot) {
  if (slot === "L") return; // Dolch ist fest
  const save = loadSave();
  save.equipped[slot] = null;
  writeSave(save);
  renderDeckbuilder();
}

function sellCard(cardId) {
  const save = loadSave();
  const idx = save.runDeck.indexOf(cardId);
  if (idx === -1) return;
  const card = getCardById(cardId);
  save.runDeck.splice(idx, 1);
  save.gold += card.sellValue;
  Object.keys(save.equipped).forEach(s => {
    if (s !== "L" && save.equipped[s] === cardId) save.equipped[s] = null;
  });
  writeSave(save);
  renderDeckbuilder();
}

function buyCard(cardId) {
  const save = loadSave();
  const card = getCardById(cardId);
  if (save.gold < card.cost || save.startDeck.includes(cardId)) return;
  save.gold -= card.cost;
  save.startDeck.push(cardId);
  writeSave(save);
  renderDeckbuilder();
}

function goToNextLevel() {
  const save = loadSave();
  save.currentLevel += 1;
  save.highestUnlocked = Math.max(save.highestUnlocked, save.currentLevel);
  writeSave(save);
  showScreen("sidescroller");
}
