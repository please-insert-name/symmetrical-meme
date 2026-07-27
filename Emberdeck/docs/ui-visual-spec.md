# Emberdeck — UI & Visual Spec

Single source of truth for everything drawn on screen: canvas-rendered game world (player, enemies, tiles, chests, shrines) and DOM-rendered HUD/menu overlays. Every value below is either a concrete canvas pixel (at the internal 320×180 resolution) or a CSS value on the DOM overlays. All colors are referenced **by palette name only** — see `assets/palette.md` for hex values. Do not invent new colors; if a color need isn't covered, reuse the closest existing palette entry (call it out in a code comment, don't add a new hex).

## 0. Base Assumptions

`docs/game-design-doc.md` does not exist yet at the time this spec was written. The following are assumed and MUST be reconciled with the Game-Logic doc when it lands — if it specifies different tile/grid values, those win and this doc's pixel numbers should be scaled accordingly by the Code agent.

- Internal canvas resolution: **320×180px**, upscaled via CSS `image-rendering: pixelated` (confirmed already in `index.html`/`css/style.css`).
- Tile size: **16×16px**. This gives 20 tiles horizontally per screen; vertically 180/16 = 11.25, so the bottom row of tiles is a partial (10px) strip — treat row index 11 as a half-height strip reserved for ground tiles only (never place platform-through or hazard tiles there), or let the camera/level design keep the play area within 11 full tile rows (176px) plus a 4px letterboxed strip at the bottom drawn as `void`. The Code agent should pick one and note it in `game-design-doc.md`; this spec's HUD layout assumes the visible canvas is the full 320×180 regardless.
- Enemy types assumed (per plan default): **grunt** (melee) and **thrower** (ranged). If Game-Logic doc defines additional/different enemy types, extend this doc's enemy section additively using the same shape-spec method.
- Camera: side-scrolling, follows player horizontally (and vertically if levels have verticality); all coordinates below are **local/screen-space** (i.e., relative to the player's or object's own drawing origin), not world-space, unless stated otherwise.

All `ctx.fillRect(x, y, w, h)` calls below use **top-left origin** convention. All shape origins are given relative to the entity's own `(x, y)` position, where `(x, y)` is defined as the **top-left of the entity's collision box** unless noted.

---

## 1. Player Silhouette

### Collision box
- **12px wide × 20px tall.** This is the AABB used for physics/collision, constant across all states except crouch (see below).
- Origin `(x, y)` = top-left of this box.

### Idle state (drawn shapes, relative to box origin `(x, y)`)
- **Torso**: `bone`-colored rect, `fillRect(x+2, y+7, 8, 10)` (8px wide, 10px tall, centered horizontally in the 12px box).
- **Head**: `bone`-colored circle, `arc(x+6, y+4, 4, 0, 2π)` (4px radius, centered at 4px from top).
- **Legs**: two `stone-dark` rects (boots/base), `fillRect(x+2, y+17, 3, 3)` and `fillRect(x+7, y+17, 3, 3)` (left/right foot blocks).
- **Outline**: every shape gets a 1px `ink` stroke (`ctx.strokeStyle = ink; ctx.lineWidth = 1`) traced around its fill, so the silhouette reads against any background.
- **Belt/accent**: 1px-tall `ember` line at `fillRect(x+2, y+13, 8, 1)` — a small warm accent breaking up the bone silhouette (reads as a belt).

### Run state
- Same shapes as Idle, but legs animate as a 2-frame alternation on a fixed 120ms timer while `|vx| > 0` and grounded:
  - Frame A: left foot `fillRect(x+1, y+17, 3, 3)`, right foot `fillRect(x+8, y+16, 3, 2)` (right foot lifted 1px).
  - Frame B: mirror — left foot lifted (`fillRect(x+1, y+16, 3, 2)`), right foot planted (`fillRect(x+8, y+17, 3, 3)`).
- Torso and head unchanged from Idle.

### Jump/fall state (airborne, `vy != 0`)
- Torso and head unchanged.
- Legs collapse to a single tucked shape: `stone-dark` rect `fillRect(x+3, y+16, 6, 4)` (both feet drawn together, tucked under torso — no separate left/right).
- Optional: on the ascending half (`vy < 0`), draw a 2px `bone` "reach" — nothing extra required beyond the tucked legs; keep it simple per the bold-silhouette style.

### Crouch state (grounded, S held)
- Collision box **shrinks to 12×12px**, anchored to the same bottom edge (i.e., `y` for collision purposes shifts down by 8px so feet stay planted).
- Torso: `bone` rect `fillRect(x+2, y+3, 8, 6)` (squashed).
- Head: `bone` circle, `arc(x+6, y+2, 3, 0, 2π)` (radius reduced to 3px).
- Legs: single `stone-dark` rect `fillRect(x+2, y+9, 8, 3)`.
- Same 1px `ink` outline convention.

### Attack state (dagger/card use — any of the 4 IJKL slots)
- Base body draws as Idle (or Run, if moving while attacking — attack shape overlays either).
- **Attack tell**: an `ember`-colored slash arc drawn in front of the torso, sweeping from the character's facing side:
  - `ctx.beginPath(); ctx.arc(x+6, y+9, 9, startAngle, endAngle); ctx.strokeStyle = ember; ctx.lineWidth = 2; ctx.stroke();`
  - Facing right: `startAngle = -0.9` rad, `endAngle = 0.6` rad (arc sweeps front-upper to front-lower on the right side).
  - Facing left: mirror — `startAngle = π+0.6`, `endAngle = π-0.9`, or equivalently flip the arc horizontally around `x+6`.
  - Arc is drawn for exactly **4 render frames** (~66ms at 60Hz) starting on the attack-input frame, then removed — a quick "slash flash," not a sustained animation.
  - A secondary 1px `ember-light` inner arc (radius 6px, same angles) drawn simultaneously gives the slash a brighter core, reinforcing readability at small scale.
- If the active card is not the default dagger (i.e., a non-melee card in I/J/K), the same slash-arc tell is still used for any melee-range card; ranged/utility cards instead spawn their own `CardEffect` entity per `combat.js` (out of scope for this doc — visual spec for generic projectile/effect shapes: a 3px-radius `ember-light` circle for simple projectiles, unless Game-Logic doc specifies otherwise).

### Facing direction
- All above shapes are symmetric enough to not require left/right mirroring except the attack arc. Player sprite does not need a directional flip for torso/head/legs given the flat-color-block style (no asymmetric details like a nose/hand called out); Code agent may skip a `ctx.scale(-1,1)` flip entirely for the body and only mirror the attack arc.

---

## 2. Enemy Silhouettes

Both enemies use `blood`/`stone` family tones (never `bone`/`ember`, which are reserved for the player) so enemies read as visually distinct from the player and from each other at a glance.

### Grunt (melee)
- Collision box: **14×18px** (slightly wider/shorter than player, reads as squat and heavy).
- **Body**: `stone`-colored rect, `fillRect(x+1, y+6, 12, 10)` (broad torso block).
- **Head**: `stone-dark` rect (not circle — angular, distinct from player's round head), `fillRect(x+4, y+1, 6, 6)`.
- **Legs**: `stone-dark` rect, `fillRect(x+3, y+16, 8, 2)` (single wide stump, no per-foot detail — grunts read as blocky/simple).
- **Eyes**: two 1px `blood` dots at `fillRect(x+5, y+3, 1, 1)` and `fillRect(x+8, y+3, 1, 1)` — the only warm-color accent, signals "hostile."
- **Outline**: 1px `ink` stroke on all shapes, same convention as player.
- **Attack tell** (grunt melee swing): a `blood`-colored slash arc, same geometry formula as the player's attack arc (radius 9px inner / not doubled — single arc only, no ember-light inner core, since grunts are cruder), drawn for 6 frames (slightly slower tell than player, telegraphing the hit).
- **Windup tell** (optional but recommended): 1 frame of the body rect tinted to `stone-light` immediately before the attack arc appears, giving players a reaction window.

### Thrower (ranged)
- Collision box: **10×20px** (taller/thinner than grunt — visually a "ranger" silhouette, distinct from both grunt and player).
- **Body**: `stone-light`-colored rect (lighter tone than grunt to differentiate at a glance), `fillRect(x+2, y+8, 6, 9)`.
- **Head**: `stone-light` circle, `arc(x+5, y+4, 3, 0, 2π)`.
- **Hood/cloak accent**: `stone-dark` rect layered over the top of the torso, `fillRect(x+1, y+6, 8, 4)`, giving a cloaked silhouette read.
- **Legs**: `stone-dark` rect, `fillRect(x+2, y+17, 6, 3)`.
- **Eyes**: single 1px `blood` dot at `fillRect(x+4, y+3, 1, 1)` (thrower is a lone-eye/cyclops-style read, distinct from grunt's two dots).
- **Outline**: 1px `ink` stroke, same convention.
- **Projectile**: `blood`-colored circle, 3px radius, `arc(px, py, 3, 0, 2π)` with 1px `ink` outline — travels in a straight line at a fixed speed defined by Game-Logic doc. This is the enemy-side counterpart to the player's `ember-light` card projectile — kept a different color family (blood vs ember-light) so players can distinguish incoming enemy threats from their own outgoing effects at a glance.
- **Windup tell**: for 8 frames before a throw, the body rect pulses to `blood` briefly (flash on frames 1, 3, 5, 7 of the windup) — a readable "about to fire" signal.

---

## 3. Tile Rendering

Each tile is a 16×16px cell drawn as a flat fill plus a 1px `ink` outline/edge treatment so tiles read clearly against the `sky`/`sky-light` background.

### Solid (collidable on all sides — ground/wall)
- Fill: `stone` (`fillRect(tx*16, ty*16, 16, 16)`).
- Top edge highlight: 2px `stone-light` strip along the top (`fillRect(tx*16, ty*16, 16, 2)`) — reads as a lit top surface.
- Bottom/side shadow: 2px `stone-dark` strip along the bottom (`fillRect(tx*16, ty*16+14, 16, 2)`).
- Outline: 1px `ink` `strokeRect(tx*16+0.5, ty*16+0.5, 15, 15)` around the full cell (crisp grid lines between adjacent solid tiles).
- Ground variant (top-of-world / grass-capped solid tiles, i.e. solids with open air directly above): replace the top 4px with `moss-light` and the next 2px with `moss` before the `stone` body continues below — gives a "dirt block with grass cap" read using only flat rects, no dedicated grass sprite needed.

### Platform-through (one-way — collide from above only, pass through from below/side)
- Fill: only the **top 4px** of the cell are drawn: `fillRect(tx*16, ty*16, 16, 4)` in `moss-light`.
- 1px `ink` outline on that 4px strip only (`strokeRect` around the 16×4 region).
- The remaining 12px of the cell are left fully transparent (not drawn) — visually a thin ledge, distinct from solid ground, and telegraphs "you can jump up through this" at a glance since there's no wall below it.
- Optional 1px `moss` shadow line at the strip's bottom edge (`fillRect(tx*16, ty*16+3, 16, 1)`) for a touch of depth.

### Hazard (spikes/damage tile)
- Base: `fillRect(tx*16, ty*16+10, 16, 6)` in `stone-dark` (a short base block so hazards still read as sitting "in" the ground).
- Danger tell — **ember spike pattern**: 3 triangles drawn with `ember` fill across the top of the base, each 16/3≈5px wide, pointing up:
  - Triangle 1: `moveTo(tx*16, ty*16+10); lineTo(tx*16+2.5, ty*16); lineTo(tx*16+5, ty*16+10); closePath(); fill()`
  - Triangle 2: same pattern shifted +5px on x (`tx*16+5` → `tx*16+10`, apex at `tx*16+7.5`).
  - Triangle 3: shifted +10px (`tx*16+10` → `tx*16+16`, apex at `tx*16+12.5`).
  - Each triangle gets a 1px `ember-light` stroke outline (brighter than the fill) so spikes pop against both `stone` solids and `sky` background.
- Outline: 1px `ink` `strokeRect` around the full 16×16 cell, matching solid tiles' grid convention.
- Hazard tiles are visually unmistakable at a glance: `ember`/`ember-light` is used **nowhere else** in tile rendering, reserved exclusively for danger.

### Background (non-collidable, decorative)
- `sky` fill for far background, `sky-light` for a secondary parallax layer (drawn as flat rects/bands, no per-tile outline — background tiles don't need the `ink` grid treatment since they're not interactive).

---

## 4. HUD Layout (`#hud-overlay`)

The overlay is a DOM layer positioned exactly over the canvas (already wired in `css/style.css`: same `min(100vw,177.78vh)` / `min(56.25vw,100vh)` sizing as `#game-canvas`, `left:50%; transform:translateX(-50%)`). Because overlay and canvas share identical box dimensions, **all HUD element positions are specified in percentages of the overlay's own width/height**, computed from the canonical 320×180 canvas-equivalent px values given here (`px / 320 * 100%` for x/width, `px / 180 * 100%` for y/height). The Code agent should compute the CSS `%` (or `vw`/`vh`-relative) values from these canvas-space numbers; absolute CSS px must NOT be used directly since the overlay scales with viewport.

All HUD text uses the existing `"system-mono"` font stack already declared in `css/style.css`. Font size at native 320×180 scale: treat 5px-tall glyphs as the base unit (i.e. `font-size: 5px` in canvas-equivalent units, scaled up with the overlay — in practice set via a `%`/`vh`-based `font-size` that resolves to ~5 canvas-px at native resolution, e.g. `font-size: calc(180 * 0.0278 * (100vh-equivalent-unit))`; simplest implementation is `font-size: 2.78vh` given the overlay height maps 1:1 to 180 canvas px — Code agent should verify against the overlay's actual rendered height).

### Health bar (top-left)
- Box position: canvas-equivalent `x=6, y=6`, size `w=64, h=8` (in 320×180 space) → CSS `left: 1.875%; top: 3.33%; width: 20%; height: 4.44%`.
- Border: 1px solid `bone`.
- Background (empty portion): `blood-dark` fill across the full box.
- Fill (current HP): `blood`-colored inner bar, left-aligned, width = `(hp/maxHp) * (innerWidth)`, where inner box is the border box inset by 1px on all sides (i.e., inner box `x=7,y=7,w=62,h=6`).
- No text label overlaid on the bar itself (keep it a clean silhouette read); optional numeric `HP` text can sit immediately to the right of the bar at `x=74, y=6` in `bone` if the Code agent wants a precise readout, but it's not required.

### Gold counter
- Position: directly below the health bar, canvas-equivalent `x=6, y=16`, i.e. CSS `left: 1.875%; top: 8.9%`.
- Icon: small filled circle, 5px diameter, `gold`-colored, with 1px `ink` outline — drawn as an actual small `<span>`/CSS circle (`border-radius:50%; width/height` in overlay-relative units) or as a tiny inline SVG; either is acceptable since this is DOM not canvas.
- Number: `gold`-colored text immediately to the right of the icon, 2px gap, format `x{amount}` (e.g. `x120`), same 5px-tall font as health readout.

### Card-slot icons (bottom-center, I/J/K/L order left-to-right)
- 4 slots, each a square box **20×20px** (canvas-equivalent), laid out left-to-right in fixed I, J, K, L order, horizontally centered as a group on the canvas.
- Group total width: `4*20 + 3*4 (gaps) = 92px`. Group left edge: `x = (320-92)/2 = 114`. Group bottom edge: `y = 180-6-20 = 154` (6px margin from bottom of canvas).
- Slot positions (canvas-equivalent, top-left of each box):
  - Slot I: `x=114, y=154`
  - Slot J: `x=138, y=154` (114+20+4)
  - Slot K: `x=162, y=154`
  - Slot L: `x=186, y=154`
- CSS conversion: `left: (x/320*100)%`, `top: (y/180*100)%`, `width: 6.25%` (20/320), `height: 11.11%` (20/180).
- Per-slot visual composition (each box, all in DOM/CSS since this is the overlay layer):
  - Border: 1px solid `bone`, box background `void` at 70% opacity (`rgba` derived from `void` hex) so the icon area is legibly boxed against gameplay behind it.
  - **Slot letter**: the key label (`I`/`J`/`K`/`L`) drawn in the top-left corner of the box, small (3px-equivalent font), `bone` color, always visible regardless of slot state — this is the primary "which key does what" readout.
  - **Icon area**: centered 12×12px sub-region within the box reserved for the card's icon glyph (drawn per-card by `cards.js`/`hud.js`; this doc does not define individual card icons — treat as a placeholder filled `stone` square with a 1px `ink` border until card-specific icons are specced separately). The default dagger in slot L specifically: a simple vertical `ember` line (blade) over a short horizontal `bone` line (guard) — a minimal dagger glyph, e.g. two small divs or a tiny inline SVG.
  - **Empty slot state** (no card equipped, applies to I/J/K before level pickups — L is never empty): icon area rendered as flat `void`-on-`stone-dark` with a 1px `ink` dashed border (CSS `border-style: dashed`) instead of the solid card glyph — visually reads as "nothing here."
  - **Cooldown-dim overlay**: when a slot's card is on cooldown, overlay the entire box with a semi-transparent `void` layer (`rgba(void, 0.6)`) that shrinks from full-coverage down to none as cooldown elapses — implemented as a CSS element with `height` (or `clip-path`) driven by `cooldownRemaining/cooldownTotal`, wiped from bottom to top (so the icon "reveals" upward as it becomes ready again). Slot letter stays fully visible/undimmed at all times (drawn as a layer above the cooldown overlay) so players can always read the keybinding.
  - **Ready state** (off cooldown, has a card): 1px border color changes from `bone` to `leaf` briefly is NOT used (would conflict with Character Building's leaf cursor meaning); instead ready slots simply show the plain `bone`-border/full-brightness icon with no overlay — the *absence* of the dim overlay is the "ready" signal.

---

## 5. Tutorial Prompt Bubble

- Container: `#prompt-overlay` (already present in `index.html`), fixed position, **bottom of screen, horizontally centered** (chosen over "above trigger zone" for implementation simplicity and to avoid overlapping variable level geometry).
- Box: canvas-equivalent `x=40, y=140, w=240, h=32` → CSS `left: 12.5%; top: 77.8%; width: 75%; height: 17.8%`.
- Style: rounded-rect (`border-radius` ~6% of box height, e.g. `2px`-equivalent radius at native scale), `void` background at ~90% opacity, 1px solid `bone` border, `bone` text, same 5px-tall monospace font as HUD.
- Padding: 4px-equivalent (canvas-space) on all sides inside the box.
- Text wrapping: max text width = box width minus padding = `240 - 8 = 232px` canvas-equivalent (`72.5%` of overlay width); wrap normally (CSS `white-space: normal; overflow-wrap: break-word`), max 3 lines — if content would exceed 3 lines, the Game-Logic/content author should shorten the prompt text rather than growing the box.
- Appearance: fades in over 200ms (CSS `opacity` transition 0→1) when the player enters the trigger zone.
- Dismissal: **press-to-continue via J** (consistent with J's contextual "confirm/interact" role outside combat). On J press while a prompt is visible, fade out over 150ms and remove. A small `bone`-colored "J" glyph in a 8×8px rounded box sits in the bottom-right corner of the prompt box (inset 4px from the box's right/bottom edges) as a persistent affordance hint, mirroring the card-slot letter treatment for visual consistency.
- Only one prompt is visible at a time; if a new trigger fires while one is showing, the old one is replaced immediately (no queueing).

---

## 6. Character Building Screen (`#menu-overlay`)

Full-screen overlay, already wired with `pointer-events:auto` and a `rgba(void,0.85)` dimming background in `css/style.css`.

### Overall layout
- **Header** (top, canvas-equivalent `x=20,y=10,w=280,h=16`): title text "CHARACTER BUILDING" or similar, `bone`, larger font (7px-equivalent).
- **Gold total** (top-right, canvas-equivalent `x=250,y=10,w=50,h=10`): same gold-icon + number treatment as the in-game HUD gold counter, `gold` color, right-aligned within its box.
- **Owned-card list** (vertical list, canvas-equivalent region `x=20, y=30, w=280, h=130`): one row per owned card, scrollable if it overflows (scroll handled by keyboard cursor moving past visible rows, shifting a viewport window — no mouse scroll needed).
  - Row height: **16px** (canvas-equivalent). Visible rows in the 130px-tall list area: 8 rows (`130/16 ≈ 8`); if more than 8 cards are owned, the list scrolls to keep the cursor row visible.
  - Row content, left-to-right within each row (row box `x=20,y=(30+i*16),w=280,h=16`):
    - Small icon area: 12×12px, left-inset 2px — same placeholder-icon convention as HUD card slots (`stone` fill / `ink` border until card art is specced).
    - Card name: `bone` text, starts at `x+18` within the row, vertically centered.
    - **Sell affordance**: right-aligned sub-box, label `SELL {price}g`, positioned at row's right portion (canvas-equivalent `x_offset = 170` within the 280-wide row, `w=50`).
    - **Persist affordance**: further right, label `KEEP {price}g`, positioned at `x_offset = 225, w=50`.
    - (`SELL` converts the card to gold and removes it from the run's available pool; `KEEP`/persist spends gold to add it to `meta.persistedCardIds` so it's pre-equipped in all future runs — matches the plan's data model.)

### Keyboard-cursor navigation (IJKL-only, no mouse)
Two-axis selection is required (row selection AND sell-vs-persist choice within a row) using only W/S (row nav, per the plan's menu convention) and I/K repurposed as the row's internal left/right sub-cursor, with J confirming:

- **W/S**: move the row cursor up/down through the owned-card list (wraps at top/bottom, or stops at bounds — stopping is simpler and preferred to avoid disorientation).
- **I/K** (while a row is selected): move the **sub-cursor** left/right between the row's two actions — I moves focus to `SELL`, K moves focus to `KEEP`/persist. Default sub-cursor focus when a new row is selected: `SELL` (leftmost action, i.e. pressing W/S resets sub-focus to `SELL` each time the row changes).
- **J**: confirm the currently-focused action on the currently-selected row (execute sell or persist, per whichever sub-action has focus).
- **Escape**: back out of Character Building to whatever screen opened it (pause menu or hub).
- This scheme keeps every input on I/J/K/L + W/S/Escape, consistent with the locked keybinding scheme — no new keys introduced. (L is unused within this specific screen's row-navigation grammar, which is fine; it doesn't need to map to anything here.)

### Highlight states (exact style)
- **Row highlight** (row cursor, regardless of sub-focus): entire row background tinted to `stone-dark` at ~40% opacity, plus a 1px `leaf` left-edge accent bar (2px wide, full row height) at the row's left edge (`x=20` to `x=22`) — `leaf` is reserved for "this is the currently selected row."
- **Sub-cursor highlight** (which action — SELL or KEEP — is focused): the focused action's label box gets a 1px `ember` border and its text brightens to `ember-light` (from default `bone`); the unfocused action label stays plain `bone` text, no border. Using `ember`/`ember-light` here (rather than another `leaf` accent) deliberately separates "which row" (leaf) from "which action within the row" (ember) so the two cursor axes are never visually ambiguous.
- On J confirm: the confirmed action's label flashes `gold` for 150ms (brief feedback flash) before the row updates (removed if sold, or its `KEEP` label changes to a `bone`-dimmed "KEPT" static state if persisted and no longer sellable-post-persist — exact post-persist row behavior is a Game-Logic/Code decision; visually, a persisted card's row should show `KEEP` replaced with a non-interactive `KEPT` label in `stone-light` color, no longer focusable by the sub-cursor).

---

## 7. Save-Point ("Schrine") Visual

- Drawn as a **totem/altar silhouette**, collision-irrelevant decoration (trigger zone is a separate invisible interact box, e.g. 24×32px centered on the totem).
- Shape (canvas-space, relative to the shrine's anchor point `(x,y)` = base-center-bottom):
  - Base: `stone`-colored rect, `fillRect(x-8, y-6, 16, 6)` (a wide plinth).
  - Column: `stone-dark` rect, `fillRect(x-3, y-22, 6, 16)` (narrow shaft rising from the plinth).
  - Crown/brazier bowl: `stone-light` rect, `fillRect(x-6, y-26, 12, 4)` (a wider cap at the top holding the flame).
  - Flame: `ember` triangle, apex up: `moveTo(x, y-34); lineTo(x-4, y-26); lineTo(x+4, y-26); closePath(); fill()`, with an inner smaller `ember-light` triangle (apex `y-33`, base `y-27`, half-width 2px) layered on top for a two-tone flame read.
  - 1px `ink` outline on all rects (not the flame — flame stays soft/glowless-outlined to read as "energy" rather than "solid").
- **Idle glow animation**: the flame's `ember-light` inner triangle pulses in size on a slow sine cycle — alternate between two draw states every ~500ms (2-frame flicker, matching the game's flat-color-block low-frame-count animation style elsewhere): Frame A draws the inner triangle at the size given above; Frame B draws it 1px larger on each side (half-width 3px, apex 1px higher) — a simple two-frame flicker is sufficient, no true sine interpolation needed given the low-res aesthetic.
- Additionally, a faint `ember` radial pulse: every ~1.5s, briefly draw a 1px `ember` `strokeRect`/circle outline expanding outward from the brazier bowl and fading (achievable as a 3-frame sequence: radius 6px full opacity → radius 10px 50% → radius 14px ~0% then removed) — a lightweight "the shrine is alive" cue without particle systems.

### "Saved" confirmation HUD flash
- On activating a shrine (J while in its interact zone): display text **"SAVED"** in `leaf` color (matches the "success" semantic already assigned to `leaf` in the palette), centered horizontally, canvas-equivalent `y=20` (near-top, clear of the health bar/gold counter which live at `y=6..24` on the left — SAVED text is centered so it doesn't overlap them), font size matching the header-level 7px-equivalent used elsewhere.
- Duration: visible for **1200ms**, with a 200ms fade-in and 300ms fade-out (700ms fully opaque in the middle). Implemented as a transient DOM node appended to `#hud-overlay` (or a dedicated always-present `#save-flash` element toggled visible), not a canvas draw, for simplicity of the fade transition.

---

## 8. Chest Visual + Open Feedback

Collision box: 16×12px (sits low, doesn't block full tile height).

### Closed state
- Body: `stone-dark` rect, `fillRect(x, y+2, 16, 10)`.
- Lid: `stone` rect, `fillRect(x, y, 16, 4)` (slightly overlapping the body's top edge for a hinged-lid read).
- Lock/clasp: 2px `gold` square centered on the seam between lid and body, `fillRect(x+7, y+3, 2, 2)`.
- 1px `ink` outline on body and lid separately (so the seam between them is visible as a line, reinforcing "this opens").

### Open state
- Body unchanged (`stone-dark` rect as above).
- Lid rotates open: drawn as a `stone` rect displaced upward/back, `fillRect(x-2, y-6, 16, 4)` (shifted up 6px and left 2px to suggest it flipped backward on a hinge at the body's top-left corner) — simple discrete swap, no actual rotation transform needed.
- Lock/clasp removed (no longer drawn).
- Interior: a `gold`-colored rect visible inside the now-gapped body, `fillRect(x+3, y+4, 10, 6)`, representing visible treasure.

### Reward-reveal feedback (on the open transition, one-shot)
- **Flash**: the chest's own silhouette briefly flashes full `bone`-white-equivalent (use `bone`, the brightest neutral in-palette) for 2 frames at the moment of opening, then resolves to the Open-state colors above.
- **Particle-ish effect** (simple canvas shapes, no particle system needed): spawn 5–6 small `gold` squares (2×2px each) at the chest's top-center, each given a short upward-and-outward linear trajectory (random-ish but deterministic spread, e.g. angles spaced across `-120°` to `-60°` from straight up) and a fixed lifetime of ~500ms, fading (or simply disappearing at end of life — fading via opacity if trivial, hard-cutoff otherwise is acceptable given the low-fi style). These represent "gold burst."
- **Popup text**: a `bone`-bordered, `void`-background small text box (same rounded-rect style as the tutorial prompt bubble but smaller — canvas-equivalent `w=100, h=24`, anchored just above the chest, `x = chestX-42, y = chestY-30`) listing what was gained, e.g. two lines: `+{gold} GOLD` in `gold` color and `+{card name}` in `leaf` color (leaf reused here for "new item gained," consistent with its "success/acquisition" semantic elsewhere). Box appears with the same 200ms fade-in as the tutorial prompt, persists ~2000ms, then fades out over 300ms — no player input required to dismiss (auto-dismiss, since chest-opening isn't a blocking interaction like a tutorial prompt).

---

## 9. Title Screen and Pause Menu

Both reuse the same keyboard-cursor list convention (W/S move, J/Enter confirm) established for Character Building's row cursor (minus the sub-cursor complexity — these are single-axis lists).

### Title screen
- Rendered into `#menu-overlay` (shown at boot, before any level loads).
- **Game title**: "EMBERDECK", large text (canvas-equivalent 12px-tall glyphs), `ember` color (the game's signature accent color, appropriate for a title treatment), centered horizontally, canvas-equivalent `y=40`.
- Optional subtitle/flavor line beneath in `bone`, smaller (5px-tall), `y=56`.
- **Menu options list**, centered horizontally, starting `y=100`, each option a row **14px tall** with **4px vertical gap** between rows (row pitch 18px):
  - `NEW GAME`
  - `CONTINUE` (only rendered/selectable if a save exists in `localStorage`; if no save exists, render it in `stone` color and skip it during W/S navigation — never fully hidden, so the keybinding-consistent list length doesn't jump, but visually and functionally inert)
  - Row highlight (currently selected): same `leaf` left-edge accent bar treatment as Character Building's row cursor (2px wide `leaf` bar at the option's left edge, plus text color shifts from `bone` to `leaf` for the selected row) — reusing the established "leaf = currently selected" convention for consistency across all menu screens in the game.
- J or Enter confirms the highlighted option. No Escape behavior on the title screen (nothing to back out to).

### Pause menu
- Triggered by Escape during gameplay. Does **not** replace the game view — `#menu-overlay` becomes visible on top of the (still-rendered-but-frozen) canvas, using its existing `rgba(void,0.85)` dim background from `css/style.css` (dims the game beneath it, per the requirement).
- **Header**: "PAUSED", `bone`, canvas-equivalent `y=50`, same 7px-equivalent size as other headers in this doc.
- **Menu options list**, same row treatment (14px rows, 4px gap, `leaf` selection highlight) as the title screen, starting `y=80`:
  - `RESUME`
  - `CHARACTER BUILDING` (jumps to that overlay/screen)
  - `SAVE` (only if standing in/near a shrine — otherwise same dimmed-`stone`/skip-in-navigation treatment as title screen's conditional `CONTINUE`; if shrine-proximity isn't tracked by pause-time, Code agent may instead always show `SAVE` and no-op with a brief `blood`-colored "must be at a shrine" flash on J if invalid — pick whichever the Game-Logic doc's save-trigger model supports)
  - `QUIT TO TITLE`
- Escape while paused: resumes gameplay (same as selecting `RESUME`), consistent with Escape's "back" role everywhere else.
- J/Enter confirms the highlighted option, identical convention to title screen and Character Building's row-level (W/S axis) selection.

---

## Cross-Cutting Conventions (summary, applies everywhere above)

- **Outline rule**: every canvas-drawn gameplay shape (player, enemies, tiles, chest, shrine) gets a 1px `ink` stroke around its fill shapes — this is what makes flat color blocks read as distinct silhouettes against the `sky`/`sky-light` background, per the Downwell/Thomas Was Alone reference style.
- **Color-semantic reservations** (do not break these elsewhere in the game):
  - `ember`/`ember-light` = danger, player attack tell, fire/energy (shrine flame, hazard tiles, title text) — never used for neutral UI chrome.
  - `blood`/`blood-dark` = damage/HP/enemy attacks and projectiles.
  - `leaf` = "currently selected/successful" cursor and acquisition state, consistent across every menu (title, pause, character building) and the chest reward popup.
  - `gold` = currency, exclusively.
  - `bone` = default UI text/borders/player skin — the neutral "readable" color.
  - `stone` family = structural/enemy neutral tones.
- **Animation frame-count discipline**: nothing in this spec requires more than 2–3 discrete draw states per animated element (run cycle: 2 frames; shrine flicker: 2 frames; chest burst: one-shot; attack arcs: single-frame flash held a few ticks) — consistent with a flat-color procedural-canvas approach with no sprite sheets and minimal per-frame authoring burden for the Code agent.
- **DOM vs canvas boundary**: HUD, prompts, and menus are DOM (`#hud-overlay`, `#prompt-overlay`, `#menu-overlay`), positioned via percentage-based CSS matching the canvas's own responsive sizing rules already in `css/style.css`. Player, enemies, tiles, chest, and shrine are canvas-drawn. Nothing in this spec should require canvas-drawn text for gameplay-critical UI (all such text lives in the DOM overlays), keeping font rendering crisp regardless of canvas upscaling.
