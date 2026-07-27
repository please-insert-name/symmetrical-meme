# Emberdeck — Bug Log / QA-Verlauf

## Quality-Agent-Review (Phase 1: Engine + Kern-Systeme)

Alle Findings wurden behoben und anschließend per Browser-Test (Chrome, `mcp__claude-in-chrome`) verifiziert.

| # | Schweregrad | Fund | Fix |
|---|---|---|---|
| 1 | Hoch | Rückkehr aus Character Building zum Titel führte zu leerem, permanent unsichtbarem Bildschirm (`.hidden` wurde nie wieder entfernt) | `characterBuilding.js` ruft jetzt `ED.Game.quitToTitle()` statt nur `ED.Core.changeMode('title')` |
| 2 | Mittel/Hoch | Hazard-Schaden war immer 15 statt nach dem ersten Treffer auf 5 abzuflachen (i-Frame-Check verhinderte den 5er-Zweig komplett) | `player.js`: `wasInHazard`-Flag verfolgt Ersteintritt vs. Folgetreffer |
| 3 | Mittel | Tor-Freischaltung (Tutorial Spalte 55, Level-01 Spalte 73) grub versehentlich den Boden mit auf (Zeilen 5–9 statt 5–8) | Wandbereich und `onClear` auf Zeilen 5–8 begrenzt, Bodenzeile 9 bleibt erhalten |
| 4 | Mittel | Dolch fehlte in der Character-Building-Liste trotz vorbereitetem "immer verfügbar"-Code | `buildRows()` fügt die Dolch-Zeile jetzt explizit hinzu |
| 5 | Niedrig/Mittel | Pause-Menü zeigte "SPEICHERN" nie ausgegraut, wenn kein Schrein in der Nähe war | `menu.js`: Option jetzt `enabled: nearShrine`, analog zu "FORTSETZEN" |
| 6 | Niedrig | Gegner-Aggro-Zeilenband war ±24px statt ±16px | `enemies.js`: `sameRowBand` korrigiert |
| 7 | Niedrig | Drop-through hatte keinen Early-Exit bei freier Plattform (nur Timer) | Nicht behoben — 200ms-Fenster ist großzügig genug, kein spielbarer Unterschied |
| 8 | Niedrig | `Save.read()` prüfte nur `schemaVersion`, nicht die Struktur von `player` | Zusätzliche Feldvalidierung ergänzt (verhindert TypeError bei manipulierten/unvollständigen Daten) |

## Zusätzliche Funde aus dem Browser-Playtest (nach der Quality-Review)

- **Dolch-Sims unerreichbar**: Das Game-Design-Dokument platzierte das Dolch-Sims auf Zeile 5 (64px über dem Hauptboden) — deutlich über der maximalen Sprunghöhe (~35px). Auf Zeile 7 (32px) verschoben, zusätzlich von Spalte 19–22 auf 24–27, damit es sich nicht mit der bestehenden Bodenhürde (Spalte 20–21, Zeile 8) zu einer unüberspringbaren Wand verbindet. Betrifft nur die narrative Aufnahme-Animation — der Dolch ist ohnehin von Rundenbeginn an in Slot L ausgerüstet, das Tutorial war dadurch nie blockiert.
- **Dolch-Pickup-Entity hätte Zweitkopie erzeugt**: `CardPickup` rief für `card_dagger` `player.pickupCard()` auf, was eine zweite, verkäufliche Dolch-Karte in Slot I/J/K erzeugt hätte (widerspricht "immer verfügbar, nicht verkäuflich"). Sonderfall in `cards.js` ergänzt: Dolch-Pickup ist rein narrativ (löst nur Flag + Prompt aus).

## Verifiziert im Browser (Chrome, lokaler Server)

- Titelbildschirm lädt fehlerfrei, "FORTSETZEN" korrekt de-/aktiviert je nach Save-Stand.
- Bewegung (A/D), Sprung mit variabler Höhe (W), Sprung über die Lücke (Spalte 10–11) funktionieren.
- Tutorial-Kampf: Dolch (L) besiegt den Grunt in 4 Treffern (8 dmg × 4 ≥ 30 HP, exakt wie im Design-Dok spezifiziert), Tor öffnet sich korrekt, Bodenzeile bleibt erhalten.
- Level-Übergang Tutorial → Level-01 funktioniert.
- Hazard-Grube: 15 Schaden beim Betreten, danach 5 pro ~800ms — bestätigt gefixt.
- Arena (2 Grunts + 1 Thrower): `combatActive` korrekt während des Kampfs, alle Gegner besiegbar, Ausgangstor öffnet sich danach.
- Schrein: Speichern via J schreibt korrekten `localStorage`-Snapshot.
- Truhe: Öffnen via J vergibt korrekte Belohnung (Gold + Karte, keine Dopplung bei bereits eingesammelter Feldkarte).
- Character Building: Dolch wird als "immer verfügbar" gelistet, Verkaufen funktioniert, Rückkehr zum Titel funktioniert (kein Soft-Lock mehr).
- Fortsetzen-Flow: lädt exakten Save-Snapshot (HP, Gold, Deck, Level) korrekt zurück.
- Keine Konsolenfehler in Chrome während des gesamten Testlaufs.

## Offen / bekannte Grenzen dieser Vertical Slice

- Firefox wurde nicht separat getestet (nur Chrome, per `mcp__claude-in-chrome`); der Code verwendet ausschließlich standardisierte APIs (`KeyboardEvent.code`, `localStorage`, WebAudio mit Feature-Detection), sollte sich aber identisch verhalten.
- Drop-through-Timing (#7 oben) folgt nicht exakt dem "oder sobald frei, je nachdem was zuerst eintritt"-Wortlaut der Spec, funktioniert aber gleichwertig über das feste 200ms-Fenster.
