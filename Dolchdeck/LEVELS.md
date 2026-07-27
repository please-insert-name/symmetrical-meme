# DOLCHDECK — Level & Belohnungen

Alle Level werden nacheinander durchlaufen. Nach dem letzten Level (Level 4) beginnt der Zyklus erneut ab Level 1, jedoch mit **+25 % Gegner-HP und -Schaden pro vollständigem Durchlauf** (Schwierigkeits-Multiplikator).

| # | Level | Typ | Gegner | Gold-Belohnung | Karten-Belohnung |
|---|---|---|---|---|---|
| 1 | **Verwunschener Wald** | Tutorial | 2× Schleim (schwach) | 20 | Wahl aus 2 zufälligen Karten (ohne „Starter") |
| 2 | **Ruinen von Aschgard** | Standard | 2× Schleim, 2× Skelett | 35 | Wahl aus 2 zufälligen Karten |
| 3 | **Nebelmoor-Sümpfe** | Standard | 2× Schleim, 3× Skelett | 50 | Wahl aus 2 zufälligen Karten (höhere Rare-Chance) |
| 4 | **Drachenfeste** | Boss | 2× Skelett + 1× Drache (Boss, hohe HP) | 100 | Wahl aus 2 Karten, bevorzugt Rarität „epic" |

## Kartenpool (`cards.js`)

| Karte | Typ | Effekt | Rarität | Kaufpreis (Startdeck) | Verkaufswert |
|---|---|---|---|---|---|
| Dolch | Angriff (Nahkampf) | 8 Schaden, fest auf `L`, nicht verkäuflich | Starter | — | — |
| Feuerball | Angriff (Fernkampf) | 16 Schaden, Projektil | Gewöhnlich | 40 | 20 |
| Schild | Verteidigung | Kurzzeitig unverwundbar | Gewöhnlich | 45 | 22 |
| Heilkraut | Heilung | +20 HP | Gewöhnlich | 35 | 17 |
| Blitzschlag | Angriff (Flächenschaden) | 11 Schaden an allen Gegnern in Reichweite | Selten | 65 | 32 |
| Dornenhaut | Verteidigung | Reflektiert Schaden kurzzeitig | Selten | 60 | 30 |
| Giftklinge | Angriff (Nahkampf + DoT) | 6 Schaden + Gift über Zeit | Selten | 55 | 27 |
| Windstoß | Verstärkung | Erhöhte Sprunghöhe kurzzeitig | Episch | 80 | 40 |

Belohnungskarten aus Levels werden dem **Run-Deck** hinzugefügt (nur für die aktuelle Sitzung nutzbar/verkaufbar). Erst ein Kauf im „Schrein der Beständigkeit" (Charakteransicht) überführt eine Karte dauerhaft ins **Startdeck**, das ab dann bei jedem neuen Run automatisch verfügbar ist.
