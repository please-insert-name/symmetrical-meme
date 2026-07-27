// Emberdeck — meta.js
// Game-rule layer on top of ED.Meta's raw storage: seeding a new run's deck
// from persisted cards, and the persist-purchase flow. Per
// docs/game-design-doc.md §10: persistedCardIds is capped at 4; slot L is
// always the dagger; the first 3 persisted ids (in persist order) auto-equip
// into I/J/K at run start; a 4th persisted id is banked but not auto-equipped.
(function () {
  var ED = (window.ED = window.ED || {});

  var MAX_PERSISTED = 4;
  var AUTO_EQUIP_COUNT = 3;

  var MetaLogic = {
    MAX_PERSISTED: MAX_PERSISTED,

    // Returns a fresh 4-slot deck array, index-aligned to I(0)/J(1)/K(2)/L(3).
    seedDeckForNewRun: function () {
      var meta = ED.Meta.load();
      var deck = [null, null, null, 'card_dagger'];
      var persisted = meta.persistedCardIds.slice(0, AUTO_EQUIP_COUNT);
      for (var i = 0; i < persisted.length; i++) {
        deck[i] = persisted[i];
      }
      return deck;
    },

    canPersist: function (meta, cardId, playerGold) {
      var card = ED.Cards.get(cardId);
      if (!card || card.price.persist === null) return false;
      if (meta.persistedCardIds.indexOf(cardId) !== -1) return false;
      if (meta.persistedCardIds.length >= MAX_PERSISTED) return false;
      if (playerGold < card.price.persist) return false;
      return true;
    },

    // Mutates and persists meta + returns the gold cost spent (or null if not allowed).
    persistCard: function (cardId, playerGold) {
      var meta = ED.Meta.load();
      if (!this.canPersist(meta, cardId, playerGold)) return null;
      var card = ED.Cards.get(cardId);
      meta.persistedCardIds.push(cardId);
      meta.totalGoldEverEarned = meta.totalGoldEverEarned || 0;
      ED.Meta.save(meta);
      return card.price.persist;
    },
  };

  ED.MetaLogic = MetaLogic;
})();
