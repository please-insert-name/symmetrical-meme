// Emberdeck — cards.js
// Static card data, per docs/game-design-doc.md §4. price.sell/persist are
// null for the dagger (always owned, never sellable/persistable).
(function () {
  var ED = (window.ED = window.ED || {});

  var CARDS = {
    card_dagger: {
      id: 'card_dagger',
      name: 'Dolch',
      type: 'attack',
      damage: 8,
      cooldownMs: 350,
      rangeType: 'melee',
      reach: 16,
      price: { sell: null, persist: null },
    },
    card_shieldbash: {
      id: 'card_shieldbash',
      name: 'Schildstoß',
      type: 'defense',
      damage: 6,
      cooldownMs: 1200,
      rangeType: 'melee',
      reach: 12,
      blockWindowMs: 250,
      blockReduction: 0.75,
      price: { sell: 15, persist: 60 },
    },
    card_emberbolt: {
      id: 'card_emberbolt',
      name: 'Glutblitz',
      type: 'attack',
      damage: 14,
      cooldownMs: 1600,
      rangeType: 'ranged',
      projectileSpeed: 160,
      projectileLifetimeMs: 2000,
      price: { sell: 20, persist: 80 },
    },
    card_haste: {
      id: 'card_haste',
      name: 'Windschritt',
      type: 'utility',
      damage: 0,
      cooldownMs: 5000,
      rangeType: 'self',
      speedMultiplier: 1.5,
      durationMs: 2000,
      price: { sell: 10, persist: 40 },
    },
  };

  var Cards = {
    ALL: CARDS,
    get: function (id) {
      return CARDS[id] || null;
    },
    isSellable: function (id) {
      var c = CARDS[id];
      return !!c && c.price.sell !== null;
    },
  };

  ED.Cards = Cards;

  // Physical in-level card pickup: touch to auto-collect (no button press),
  // per docs/game-design-doc.md §5/§6.
  function CardPickup(x, y, cardId, onPickup) {
    ED.Entity.call(this, { x: x, y: y, w: 10, h: 10, type: 'card_pickup' });
    this.cardId = cardId;
    this.onPickup = onPickup;
  }
  CardPickup.prototype = Object.create(ED.Entity.prototype);
  CardPickup.prototype.constructor = CardPickup;

  CardPickup.prototype.update = function (dt, level) {
    var player = level.player;
    if (player && ED.aabbOverlap(this.aabb(), player.aabb())) {
      this.dead = true;
      // card_dagger is always pre-equipped in slot L (see meta.js
      // seedDeckForNewRun) and can't be sold/persisted like other cards, so
      // this pickup is narrative-only in the tutorial — it must not also
      // try to insert a second, sellable copy into an I/J/K slot.
      if (this.cardId === 'card_dagger') {
        if (this.onPickup) this.onPickup(level, player);
        return;
      }
      var added = player.pickupCard(this.cardId);
      if (added && this.onPickup) this.onPickup(level, player);
    }
  };

  CardPickup.prototype.render = function (renderer) {
    var P = renderer.PALETTE;
    var sx = renderer.worldToScreenX(this.x);
    var bob = Math.sin(performance.now() / 250) * 2;
    renderer.rect(sx + 4, this.y + bob, 1, 8, P.bone);
    renderer.rect(sx + 2, this.y + bob, 5, 1, P.bone);
    renderer.rect(sx + 3, this.y + 1 + bob, 3, 5, P.ember);
  };

  ED.CardPickup = CardPickup;
})();
