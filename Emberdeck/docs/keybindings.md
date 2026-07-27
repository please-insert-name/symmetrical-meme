# Emberdeck — Keybindings (verbindlich)

Single source of truth ist `js/engine/input.js` (Bindung an physische `KeyboardEvent.code`-Werte, nicht an eingegebene Zeichen). Diese Tabelle muss jederzeit mit `BINDINGS` in `input.js` übereinstimmen.

| Aktion | Taste (code) | Kontext |
|---|---|---|
| links | A (`KeyA`) | Bewegung |
| rechts | D (`KeyD`) | Bewegung |
| springen | W (`KeyW`) | Bewegung — variable Sprunghöhe bei Halten, Coyote-Time 80ms, Jump-Buffer 80ms |
| ducken / durchfallen | S (`KeyS`) | Bewegung — Ducken am Boden, Durchfallen bei Halten auf Plattform-Tile |
| Karten-Slot 1 | I (`KeyI`) | Kampf |
| Karten-Slot 2 | J (`KeyJ`) | Kampf — **nur wenn `gameState.combatActive === true`** |
| Karten-Slot 3 | K (`KeyK`) | Kampf |
| Karten-Slot 4 (Dolch, immer belegt) | L (`KeyL`) | Kampf |
| Bestätigen/Interagieren | J (`KeyJ`) | Außerhalb aktivem Kampf: Schreine, Truhen, Tutorial-Hinweise, Menübestätigung |
| Menü: Auswahl bewegen | W / S | Titel, Pause, Character Building |
| Menü: Sub-Cursor (Verkaufen/Behalten) | I / K | Character Building |
| Pause / Zurück | Escape | überall außer Titelbildschirm |

Auflösung des IJKL-Konflikts: es gibt keinen separaten Basisangriff — der Dolch ist einfach die Standardkarte in Slot L. "L drücken für den Dolch" und "Slot 4 aktivieren" sind identisch.
