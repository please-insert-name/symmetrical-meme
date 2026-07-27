# Emberdeck — Game Design Document (Vertical Slice)

Single source of truth for the Code agent. All numbers here are final. Internal render resolution: **320×180 px**. Tile size: **16 px** → grid is **20 tiles wide × 11.25 tiles tall**; the fractional row is intentional (see Tilemap Conventions below for how it's handled). Fixed update timestep: **60 Hz** (16.667 ms per tick) per the approved plan; all velocities below are expressed in **px/s** and must be multiplied by `dt` (seconds) each tick.

Keybinding scheme is LOCKED per the approved plan and repeated here for reference only (input.js is the single source of truth for bindings):
- **A/D** = move left/right, **W** = jump (variable height), **S** = crouch (grounded) / drop-through (held while standing on a platform-through tile)
- **I/J/K/L** = card slots 1–4. **L is always the dagger** (`card_dagger`), unlosable. Slots I/J/K fill in as cards are picked up.
- **J** contextually doubles as Interact/Confirm outside combat (shrines, chests, tutorial prompts, menu confirm). `input.js` gates this on `gameState.mode !== 'combat'`.
- Menus: W/S = navigate, J/Enter = confirm, Escape = back/pause.

---

## 1. Player Tuning

| Property | Value |
|---|---|
| Move speed (horizontal, walk) | **90 px/s** (both grounded and airborne; no separate air-speed penalty for this slice) |
| Ground acceleration | instantaneous within the same tick — no accel ramp for vertical-slice scope. `vx = -90` (A held), `+90` (D held), `0` (neither/both held) |
| Crouch move speed | **40 px/s** (crouch-walk allowed while grounded and crouched, S+A/D) |
| Jump initial velocity (vy at jump start) | **-190 px/s** (negative = upward, canvas Y-down convention) |
| Gravity (accel while ascending, W still held) | **520 px/s²** |
| Gravity (accel while falling, or W released early) | **760 px/s²** (stronger fall gravity for snappier arc, standard platformer feel) |
| Terminal fall speed (vy cap) | **300 px/s** |
| Variable jump height — early-release cutoff | If **W** is released while `vy < -60 px/s` (still moving upward fast), instantly clamp `vy = -60 px/s`. This produces a short hop vs. a full ~190 px/s launch when W is held through the full ascent. |
| Max jump hold duration (hard cap regardless of input) | **300 ms** from jump start — after 300 ms, ascend gravity switches to fall gravity even if W is still held (prevents infinite float from stuck keys) |
| Coyote time (grace jump after leaving a ledge) | **80 ms** |
| Jump buffer (early W press before landing) | **80 ms** |
| Approx. max jump height | ~35 px (~2.2 tiles) at full hold — enough to clear a 2-tile gap/obstacle |
| Approx. max jump horizontal distance | ~55 px (~3.4 tiles) at full hold + full run speed |
| Crouch behavior (grounded) | Hitbox height reduces from 14 px to 8 px (see hitbox table below); move speed drops to crouch speed; cannot jump while crouched (S+W does nothing while grounded-crouched) |
| Drop-through behavior | While standing on a tile-type **2 (platform-through)** and holding **S**, player's collision against that platform layer is disabled for **200 ms**, allowing the player to fall through; re-enabled after the timer or once the player is fully clear of platform tiles, whichever first |
| Start HP | **100** |
| Max HP (vertical slice) | **100** (no max-HP upgrades in this slice) |
| Invincibility frames after taking damage | **800 ms**. During i-frames: player sprite alpha flashes (visual only, UI-agent spec), player takes no further damage from any source, but retains full movement control |
| Knockback on hit | vx = ∓120 px/s away from damage source (sign depends on relative position), vy = -80 px/s (small pop-up), decays under normal gravity; knockback overrides player input for **150 ms** |
| Player death | HP ≤ 0 → `gameState.mode = 'dead'`, screen fades to `void` (#0d0a14) over 600 ms, then reload from last shrine checkpoint (full HP restore, gold/deck/flags preserved as of last save) |
| Sprite size (drawn) | 12 px wide × 16 px tall (standing), 12 px wide × 10 px tall (crouched) |
| Hitbox size (collision, standing) | 10 px wide × 14 px tall, centered horizontally under sprite, bottom-aligned to sprite bottom |
| Hitbox size (collision, crouched) | 10 px wide × 8 px tall, bottom-aligned |
| Hitbox inset from sprite | 1 px on each horizontal side (sprite 12 px → hitbox 10 px) to keep collision forgiving against wall corners |

---

## 2. Tilemap Conventions

- **Tile size: 16×16 px.**
- **Grid: 20 columns × 11.25 rows** at the 320×180 internal resolution. The 0.25-row remainder (4 px) is handled by rendering row 11 as a partial row clipped at the canvas bottom edge (tiles there still occupy a full 16 px logically for collision; only the bottom 4 px is visually cropped by the canvas boundary). In practice, levels should treat **row 11 (index 10, 0-based) as a "mostly offscreen" buffer row** and avoid placing gameplay-relevant tiles there — solid ground/floor tiles are placed at row 10 (index 9) or above so the playable floor is always fully visible. This keeps the resolution clean (320×180, a common scalable pixel-art target: ×4 = 1280×720, ×6 = 1920×1080) without forcing an off-grid tile size.
- Levels are wider than 20 columns; the camera scrolls horizontally, locked to the level's vertical extent (levels in this slice do not scroll vertically — total level height is fixed at 11 rows / 176 px, matching the visible screen height so there is no vertical camera movement in the vertical slice).
- **Tile type IDs** (stored per-cell in the level's 2D array, row-major, `tilemap[row][col]`):

| ID | Type | Behavior |
|---|---|---|
| 0 | Empty | No collision, fully passable, rendered as background/sky |
| 1 | Solid | Full AABB collision on all 4 sides — standard ground/wall/ceiling |
| 2 | Platform-through | Collision only from above (player standing on top is supported); no collision from below or sides (player can jump up through it); **S** held while standing on it triggers drop-through per Player Tuning above |
| 3 | Hazard | No physical collision blocking movement (player can walk/fall into the tile), but on entry deals **15 damage** immediately, then continues dealing **5 damage** per 500 ms while the player's hitbox overlaps the tile, subject to the player's normal invincibility-frame rules (i.e., hazard damage also triggers and respects the 800 ms i-frame window, so hazard cannot melt HP instantly — max realistic DPS while standing in hazard is one hit per 800 ms after the first) |

- Tile-to-pixel: cell `(row, col)` occupies pixel rect `x = col*16, y = row*16, w = 16, h = 16`.
- ASCII legend used in the level layouts below: `.` = 0 empty, `#` = 1 solid, `=` = 2 platform-through, `^` = 3 hazard.

---

## 3. Enemy Design

Both enemy types use the same 4-state machine: **patrol → chase → attack → stagger**, with these shared transition rules unless overridden per-type:
- `patrol → chase`: player enters aggro range (horizontal distance, same row band ±16 px vertical tolerance)
- `chase → attack`: player enters attack range while in chase state
- `attack → chase`: attack animation/cooldown finishes and player is still in aggro range but outside attack range
- `chase/attack → patrol`: player exits aggro range for a continuous **1500 ms** ("de-aggro timer")
- any state `→ stagger`: enemy takes damage (from a card); stagger locks out enemy actions and movement for its duration, then returns to `chase` if player is in aggro range, else `patrol`

### 3.1 Grunt (melee)

| Property | Value |
|---|---|
| id | `enemy_grunt` |
| HP | **30** |
| Move speed (patrol) | **25 px/s** |
| Move speed (chase) | **55 px/s** |
| Patrol radius | **40 px** from spawn point, walks back and forth, reverses at radius edge or when hitting a solid wall/ledge (will not walk off a platform edge — ledge-detection required) |
| Aggro range | **70 px** horizontal distance from player |
| Attack range | **14 px** horizontal distance (melee, must be adjacent) |
| Attack damage | **10** per hit |
| Attack cooldown | **900 ms** between attack starts |
| Attack windup | **250 ms** telegraph (sprite flashes `ember` per UI spec) before damage is applied, so an alert player can react |
| Stagger duration | **300 ms** per hit taken |
| Contact/collision damage (touching player outside of attack windup) | none — grunt only damages via its attack state, not passive body contact, to keep combat readable |
| Sprite size | 14×16 px |

### 3.2 Thrower (ranged)

| Property | Value |
|---|---|
| id | `enemy_thrower` |
| HP | **18** |
| Move speed (patrol) | **15 px/s** |
| Move speed (chase) | **0 px/s** — thrower does not close distance once it has line-of-sight and is within throw range; it holds position and backs away if player gets too close |
| Retreat behavior | if player distance < **30 px** while in `attack` or `chase` state, thrower moves away from player at **35 px/s** until distance ≥ 30 px, then resumes attacking |
| Patrol radius | **24 px** from spawn point |
| Aggro range | **110 px** horizontal, requires rough line-of-sight (no solid tile directly between thrower and player at throw height — simple horizontal raycast through the tilemap row is sufficient) |
| Attack range | **90 px** (max horizontal throw distance) |
| Attack damage | **8** per projectile hit |
| Attack cooldown | **1400 ms** between throws |
| Attack windup | **400 ms** telegraph before projectile is released |
| Projectile speed | **140 px/s** horizontal, unaffected by gravity (thrown flame flask, straight line) |
| Projectile despawn | on wall hit, player hit, or 2000 ms lifetime |
| Stagger duration | **350 ms** per hit taken |
| Sprite size | 12×14 px |

Both enemies drop no loot individually in this slice (loot is chest-based, see §6); defeating an enemy just removes it from the level and, for scripted tutorial/combat beats, sets the relevant progression flag.

---

## 4. Card Definitions

Card data lives in `js/game/cards.js`. Fields: `id, name, type, damage, cooldownMs, price.sell, price.persist`. All four cards below ship in the vertical slice.

| id | name (DE) | type | damage | range/shape | cooldownMs | effect notes | sell (gold) | persist (gold) |
|---|---|---|---|---|---|---|---|---|
| `card_dagger` | Dolch | attack | **8** | melee, 16 px reach in facing direction, 10 px vertical band | **350** | Default card, hardcoded into slot L, cannot be sold or removed. Persist price/sell price not applicable (always owned) — `price.sell = null`, `price.persist = null` in data, and the Character Building screen must render it as "immer verfügbar" (always available), not offer sell/persist controls for it. | — | — |
| `card_shieldbash` | Schildstoß | defense | **6** (damage on hit) | melee, 12 px reach, 10 px vertical band; on activation also grants the player a **250 ms** block window during which incoming damage is reduced by **75%** (rounded down) instead of full i-frame refresh | **1200** | Primarily a defensive tool: press slot key to bash (small damage + brief block window), good for interrupting an enemy's attack windup | **15** | **60** |
| `card_emberbolt` | Glutblitz | attack | **14** | ranged projectile, travels **160 px/s** horizontal in facing direction, 2000 ms lifetime, pierces 1 enemy (hits at most one target, does not chain further) | **1600** | Player's ranged fire card; consumes no separate ammo/mana resource in this slice — purely cooldown-gated | **20** | **80** |
| `card_haste` | Windschritt | utility | 0 (no damage) | self-buff, no range | **5000** | On activation: player move speed (walk and crouch) is multiplied by **1.5×** for **2000 ms**; does not affect jump velocity or gravity | **10** | **40** |

Design intent check (per requirement #9): every non-dagger card's `persist` price is **4×** its `sell` price (shieldbash 15→60, emberbolt 20→80, haste 10→40), comfortably within the specified 3–5× band, so persisting is always a meaningfully bigger investment than a one-time sell.

Card pickup: all three non-dagger cards are found as physical pickups in `level-01` (see §6); none are available in the tutorial (tutorial only grants the dagger). Picking up a card auto-fills the first empty slot among I, J, K in that fixed left-to-right order; if all three are already full, the pickup is skipped and a HUD message "Kartenfach voll" is shown instead (no forced swap in this slice).

---

## 5. Tutorial Level Layout (`level-tutorial`)

Grid: 11 rows tall (rows 0–10, row 10 treated as the visual-buffer row per §2 — no gameplay tiles placed there except as noted), **60 columns wide** (3 camera-screens). Row 9 (0-indexed) is the main ground floor line for most of the level.

```
col:      0         1         2         3         4         5
          0123456789012345678901234567890123456789012345678901234567890
row 0     ....................................................T.......
row 1     ....................................................#.......
row 2     ...................................E.................#.......
row 3     ...................................#.................#.......
row 4     ....................D...............#.................#.......
row 5     ....................#.......==........#.................#.......
row 6     ...................................................#.......
row 7     ....................................................#.......
row 8     .......^^^..........................................#.......
row 9     ##########..######################################.########
row 10    ##########..######################################.########
```

The ASCII block above is illustrative of feature placement; the **authoritative tile-by-tile grid** the Code agent must build is specified by these exact zones (all coordinates are `(row, col)`, 0-indexed, tile units):

- **Ground floor**: `row 9` solid (`#`) for all columns **0–59** except a **2-tile gap at columns 10–11** (both empty, tile 0) which is the jump-teaching gap. `row 10` mirrors row 9 (solid, same gap) as a safety floor lip.
- **Jump gap (W teaching)**: columns **10–11**, rows 9–10 empty (`.`). Player must jump from the platform ending at col 9 to the platform starting at col 12. Gap width = 2 tiles (32 px), well within the ~55 px max jump distance.
- **Low obstacle (alternative jump teach, right after the gap)**: at columns **20–21**, a 1-tile-tall solid block sits on the floor at `row 8` (on top of the row 9 floor), forcing a small hop over a 16 px obstacle.
- **Crouch teaching zone**: columns **30–34**, a solid ceiling overhang at `row 6` (1 tile thick, columns 30–34) sitting 3 tiles above the floor, forcing the player to crouch (reduced hitbox, 8 px tall) to pass underneath without hitting the overhang — this is a "duck under" corridor, not a drop-through.
- **Drop-through platform section**: columns **40–43**, a platform-through tile (`=`, ID 2) row at `row 7`, spanning columns 40–43, placed above a hazard-free pit in the row-9 floor directly below (row 9 columns 40–43 are empty/pit leading down to a lower solid catch-floor at `row 10` columns 40–43, which is solid so the player cannot fall out of the level — this segment teaches S = drop-through without any fail state). Player walks onto the platform at col 40 from the row-9 level via a short 1-tile-high solid step at column 39 (`row 8` solid at col 39), then presses S to drop through to row 10 and continue.
- **Dagger pickup**: a `card_dagger` pickup entity is placed at tile **(row 4, col 20)**, sitting on a small solid platform: `row 5, columns 19–22` solid (a 4-tile ledge reachable by the jump-gap teaching jump at columns 10-11 then walking right and a second small hop). Pickup is a glowing dagger sprite (UI spec) that, on player-overlap (no button press needed — auto-pickup on touch), fills slot **L** and shows the tutorial prompt from §7 zone D.
- **Practice enemy (combat teaching)**: one `enemy_grunt` spawns at tile **(row 9, col 35)** standing on the main floor, patrol radius 40 px (per §3.1) centered on that spawn, in a flat clear section of floor (columns 33–38 are open floor, no obstacles) so the fight is unambiguous. This grunt uses the standard stats from §3.1 (30 HP, 10 dmg/hit) — the dagger's 8 damage means it takes 4 hits to defeat it. The level's exit gate (see below) is locked (invisible wall trigger at column 55) until this grunt's defeat sets flag `tutorial.grunt_defeated = true`.
- **Level end**: a flag/torch marker `T` at tile **(row 0, col 54)** area is purely decorative (UI spec); the actual exit trigger is an invisible zone at **columns 57–59, row 9**, which on entry (only reachable after the grunt is defeated, since the gate at column 55 blocks earlier passage) transitions to `level-01` at its designated player-spawn point.
- **Player spawn**: tile **(row 9, col 1)**, i.e., pixel `(24, 144)`.

### Tutorial trigger zones for prompt popups (exact tile coordinates, all trigger on player-hitbox-overlap, one-shot per zone unless noted)

| Zone | Trigger tile range (row, col) | Purpose |
|---|---|---|
| A — Movement | `(row 9, col 2)` through `(row 9, col 4)` | A/D movement intro, first thing player touches after spawn |
| B — Jump | `(row 9, col 7)` through `(row 9, col 8)` | Just before the col 10–11 gap |
| C — Crouch | `(row 9, col 28)` through `(row 9, col 29)` | Just before the col 30–34 overhang corridor |
| D — Dagger pickup | triggered by the pickup itself at `(row 4, col 20)`, not a separate floor zone | Fires the moment the dagger is collected |
| E — Drop-through | `(row 8, col 38)` through `(row 8, col 39)` | Just before the platform-through section at columns 40–43 |
| F — Combat | `(row 9, col 32)` through `(row 9, col 33)` | Just before the practice-grunt clear area at columns 33–38 |

---

## 6. Level 1 Layout (`level-01`)

Grid: 11 rows tall, **90 columns wide** (4.5 camera-screens), main floor at `row 9`/`row 10` as before. Longer and harder than the tutorial: real hazard section, a drop-through shortcut, a 3-enemy combat encounter, and an end chest.

Authoritative zone-by-zone spec (row, col, 0-indexed tile units):

- **Player spawn**: tile `(row 9, col 1)` — matches the exit hand-off from `level-tutorial`.
- **Ground floor**: `row 9` and `row 10` solid across columns **0–89**, with these explicit breaks:
  - **Hazard pit**: columns **15–18**, `row 9` replaced with hazard tiles (`^`, ID 3) instead of solid; `row 10` beneath stays solid (so falling into the pit floor deals hazard damage per tick while standing in it, per §2, but does not drop the player further/kill instantly — player must jump over or through quickly). Recommended safe path: jump from the solid ledge at col 14 clear to col 19 (5-tile gap, at the edge of max jump distance — an alternate lower route exists: player can also just run through and take one hazard hit if they mistime the jump, consistent with hazard's non-instant-death design).
  - **Elevated platform run (platform-through)**: columns **25–32**, platform-through tiles (`=`, ID 2) at `row 7`, floating above the row-9 floor (which continues solid underneath, columns 25-32 row 9 stays solid) — this is a pure optional-shortcut/collectible-reach platform, not a mandatory drop-through (unlike the tutorial's mandatory one), giving the player a taste of vertical exploration. A `card_haste` pickup sits on this platform at tile `(row 6, col 28)`.
  - **Second gap (plain jump, no hazard)**: columns **45–46**, both rows 9-10 empty. Standard 2-tile jump gap.
- **Combat encounter** ("Ember Hollow" arena): columns **55–72** — this section is flanked by invisible wall triggers that lock (columns 54 and 73) until all enemies in the encounter are defeated, same locking mechanism as the tutorial gate. Floor is flat, solid `row 9`/`row 10`, columns 55–72, no hazards inside the arena so the fight is purely about combat, not platforming. Enemy spawns:
  - `enemy_grunt` #1 at `(row 9, col 59)`, patrol radius 40 px
  - `enemy_grunt` #2 at `(row 9, col 68)`, patrol radius 40 px
  - `enemy_thrower` #1 at `(row 9, col 63)`, patrol radius 24 px (positioned centrally so it has line-of-sight down the arena corridor)
  - Defeating all three sets flag `level01.arena_cleared = true`, which drops the column-73 wall trigger.
- **Card pickups in the open world** (not gated by combat):
  - `card_shieldbash` at tile `(row 8, col 21)`, on a small 1-tile solid ledge (`row 9, col 21` solid, reachable directly from the main floor by a short hop) — placed before the hazard pit so the player has a defensive tool available for the arena.
  - `card_emberbolt` at tile `(row 8, col 50)`, on a small solid ledge just after the second gap, before the arena — gives the player a ranged option for the thrower fight.
  - `card_haste` at tile `(row 6, col 28)` as noted above (on the elevated platform-through run).
- **Save shrine**: placed at tile `(row 9, col 76)`, immediately after the arena exit (post-combat, pre-chest) — see §8.
- **End-of-level reward chest**: placed at tile `(row 9, col 85)`, in a small alcove at the level's far end (columns 84–87, flat solid floor, no hazards). Opening requires walking into it and pressing **J** (same interact convention as shrines).
  - **Chest loot table (fixed, not randomized, for this vertical slice)**: **45 gold**, plus **1 copy of `card_emberbolt`** if the player has not already picked up the field copy at `(row 8, col 50)` this run (i.e., the chest checks the `cardsCollected` flag set by the field pickup and does not duplicate a card already owned) — if the emberbolt was already collected in the field, the chest instead grants an extra **20 gold** (total 65 gold) so the reward is never wasted. This keeps loot deterministic and testable while still rewarding thorough exploration.
- **Level end / exit**: invisible trigger at columns **88–89**, row 9, past the chest alcove. Transitions to the Character Building screen (per plan, levels alternate with the character-building screen between levels) rather than directly to another level, since `level-01` is the last level in the vertical slice.

---

## 7. Tutorial Prompt Content (German)

All prompts render as a HUD-anchored dialogue/tooltip bubble (UI-agent owns exact visual styling, position, and the corresponding UI spec key). Each prompt is dismissed by pressing **J** (contextual confirm, per locked keybinding scheme) or auto-dismisses after the player moves **24 px** away from the trigger zone, whichever comes first. Each zone fires once per playthrough (tracked via a `tutorial.prompt.<zone>.seen` flag so re-entering the zone does not re-trigger it).

| Zone (from §5) | Trigger tiles | German prompt text |
|---|---|---|
| A — Movement | `(row 9, col 2–4)` | "Bewege dich mit A und D nach links und rechts." |
| B — Jump | `(row 9, col 7–8)` | "Drücke W zum Springen. Halte W länger für einen höheren Sprung." |
| C — Crouch | `(row 9, col 28–29)` | "Halte S zum Ducken. So passt du unter niedrige Durchgänge." |
| D — Dagger pickup | fires at `(row 4, col 20)` on pickup | "Dolch gefunden! Drücke L, um den Dolch anzugreifen." |
| E — Drop-through | `(row 8, col 38–39)` | "Halte S auf einer Plattform, um hindurchzufallen." |
| F — Combat | `(row 9, col 32–33)` | "Ein Gegner! Drücke L, um mit dem Dolch anzugreifen und ihn zu besiegen." |

An additional non-zone-triggered prompt fires once when the tutorial-exit gate (column 55) unlocks after the grunt's defeat: "Gut gemacht! Der Weg ist frei — geh weiter nach rechts." This is triggered by the `tutorial.grunt_defeated` flag transition, not a tile zone.

---

## 8. Save-Point ("Schrein") Placement

- **Level 1 shrine**: exactly one shrine entity placed at tile **(row 9, col 76)** in `level-01`, immediately following the Ember Hollow arena exit and before the reward chest — positioned so that dying to the chest area or anything after it does not force a full arena replay.
- **Tutorial level**: no shrine in `level-tutorial` (vertical slice scope; tutorial is short enough that death simply restarts the tutorial from its spawn point, tracked separately from the shrine/checkpoint system via a level-local respawn rule, not a save-file checkpoint).
- **Interaction**: confirmed as **walk into the shrine's hitbox (a 16×16 px tile-aligned trigger matching the shrine's tile) + press J**. This is the same contextual-interact binding used for chests and tutorial-prompt dismissal, consistent with the locked keybinding scheme (§ Keybinding scheme above; J = interact/confirm outside combat).
- On activation: `Save.write()` is called with the current player snapshot (hp/maxHp, levelId=`level-01`, x/y = shrine's spawn-return position, gold, deck, inventory, flags), the shrine plays an activation visual (UI spec), and this becomes the respawn point on death for the remainder of the run (and across sessions, since it's written to `localStorage`).
- Re-activating an already-active shrine simply re-saves (idempotent, always allowed, no cooldown).

---

## 9. Character Building Screen Economy

- **Starting gold** (new save, no meta-progression yet): **0**.
- **Flow**: the Character Building screen is entered automatically at the `level-01` exit trigger (columns 88–89, per §6) — it is a distinct `gameState.mode = 'characterBuilding'`, not a level. It is keyboard-navigable only (per locked keybinding scheme, menus use W/S to move selection, J/Enter to confirm, Escape to back out/return to... in this vertical slice, Escape from Character Building returns to the title/run-summary screen, since `level-01` is the last level).
- **Layout** (content-level, exact pixel layout owned by UI-agent's `ui-visual-spec.md`):
  1. Header: current gold total (large, `gold` color per palette).
  2. A vertical list of every card the player currently owns this run (deck + inventory overflow, minus the dagger which is always listed first as "immer verfügbar" / not sellable-or-persistable), each row showing: card name, type, its `price.sell` and `price.persist` values.
  3. Selecting a card (W/S to move the list cursor) and pressing **J** opens a 2-option sub-choice: **Verkaufen** (sell — removes the card from the run's deck/inventory, grants `price.sell` gold immediately) or **Dauerhaft freischalten** (persist — spends `price.persist` gold, adds the card's id to `persistedCardIds` in the Meta save if not already present, card remains in the current run's deck too — persisting does not remove it from the active run).
  4. If the player cannot afford an option (gold < price), that option is shown grayed out/disabled (UI spec) and pressing J on it does nothing (no partial purchase, no debt).
  5. A "Weiter" (continue) row at the bottom of the list, selectable like any other row, which — in the vertical slice, since there is no level after `level-01` — ends the run and returns to the title screen, showing a short summary (gold earned, cards persisted this session).
- Selling and persisting are independent actions that can both be done to the same card in the same visit (sell it after already persisting it, or vice versa — persisting first is recommended UX since selling removes the card from the list of things you can still choose to persist).

---

## 10. Meta-Progression Rule

- `persistedCardIds` (array, stored in the `emberdeck.meta.v1` localStorage key, survives every run) is the durable list of card ids the player has permanently unlocked via "Dauerhaft freischalten."
- **Seeding a new run's starting deck**: at run start (new game / title-screen "Neues Spiel"), `player.deck` is initialized as a 4-slot array indexed to I(0)/J(1)/K(2)/L(3). **Slot L (index 3) is always `card_dagger`, unconditionally**, regardless of `persistedCardIds` contents — the dagger is not itself a persistable id and is never displaced. The remaining 3 slots (I, J, K — indices 0,1,2) are filled from `persistedCardIds` **in the order the ids appear in the array**, i.e., **first-persisted-first-equipped**, up to 3 cards. Any slot among I/J/K left unfilled (fewer than 3 persisted cards) starts empty and is filled normally by in-level pickups per §4's pickup rule.
- **Cap enforcement**: `persistedCardIds` itself is capped at **4 entries total** at the point of persisting (the Character Building screen must refuse — grayed out, per §9 — any further "Dauerhaft freischalten" action once `persistedCardIds.length === 4`, even if the player has enough gold), even though only 3 of those 4 can ever be auto-equipped into I/J/K at run start (slot L being permanently reserved for the dagger). This deliberately gives the player one "banked" persisted card beyond what auto-equips.
- Rationale/behavior for the 4th banked slot in this vertical slice: it does **not** get auto-equipped anywhere (no 5th deck slot exists — the deck is hard-fixed at 4 slots matching I/J/K/L). It exists purely as a record/investment (counts toward a future "swap which persisted card is equipped" feature) and, functionally in this slice, as insurance — if the player later sells a starting card mid-run, nothing currently lets them re-equip from the bank (no in-run deck-editing UI exists in this slice; the bank only re-applies at the *next* run's start, using the same first-persisted-first-equipped rule over whichever 3 of the up-to-4 ids are chosen — since exactly 3 slots auto-equip, use ids[0..2] and leave ids[3] (if present) banked-but-unequipped).
- **Stretch note (explicitly out of scope for this slice, do not implement)**: a "choose which persisted cards equip" screen at run start, letting the player pick 3 of up to 4 banked cards instead of always taking the first three by persist order. Flagged here only so the Code agent does not need to design for it, and so a future phase has a documented hook (`persistedCardIds` ordering is the only state that would need a UI on top of it).
