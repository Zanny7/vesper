# Vesper — A Healer's Vigil

A playable browser encounter about keeping a five-person dungeon party alive. The first healer is a Priest; the first boss is the Hollow Warden. No movement, account, installation of packages, or backend service is required.

## Run

Requires Node.js 20.11 or newer.

```sh
npm start
```

Open **http://localhost:5173**. The server binds to localhost only. To stop it, press Ctrl+C in its terminal. If PowerShell blocks npm.ps1, use `npm.cmd start`.

```sh
npm test
```

The 13 Node test cases cover spell timing, resource costs, Post-Haste consumption, separate Penance launches/impacts, cancellation, cooldowns, overheal, death, encounter schedules, damage-over-time, pause, outcomes, reset, and full encounter feasibility.

## Play

- Click **Begin encounter**. Tank and DPS fight automatically.
- Hover a party frame and press **1–4** to heal that ally. Without a hovered frame, your selected ally receives the spell.
- Click a frame or use **↑ / ↓** to change the selected ally. Clicking a spell also casts it on the selected ally.
- **1: Flash Heal** — 100 healing, 1.5s, 30 mana; grants one Post-Haste charge, capped at two.
- **2: Greater Heal** — 200 healing, 3s, 45 mana.
- **3: Prayer of Healing** — 100 healing to every living party member, 3s, 75 mana.
- **4: Penance** — three bolts totaling 250 healing over 2s, 36 mana, 10s cooldown. Healing lands at 0.5s, 1.25s, and 2s, after a 0.3s visual flight.
- Greater Heal or Prayer consumes exactly one Post-Haste charge at cast start and takes 1.8s.
- **Esc** cancels a spell. Mana, cooldown, and consumed Post-Haste are not refunded. A cancelled Penance stops future healing ticks.
- **Space** pauses/resumes. Losing window focus or hiding the tab pauses the encounter; return and explicitly resume.
- **?** opens the field guide and pauses combat. Closing the guide leaves the encounter paused.

Targets lock when a cast begins. Striped health segments preview incoming healing; they do not grant health early. The two gold diamonds show Post-Haste. Withering Mark appears on affected party frames. The Priest can take damage and must be healed too.

Win by defeating the Warden. Lose if the tank or Priest dies, fewer than three allies remain, or 150 seconds elapse. No resurrection in this slice. If a fatal boss hit and fatal party damage occur on the same simulation tick, defeat takes precedence.

## Encounter and balance

All initial values live in `src/data.js`:

| Mechanic | First hit | Repeat | Effect |
| --- | --- | --- | --- |
| Basic strike | 2.4s | 2.4s | 32 tank damage |
| Shard | 7s | 9s | 55 damage to a rotating non-tank ally |
| Crushing Blow | 10s | 18s | 105 tank damage; 3s warning |
| Hollow Nova | 18s | 22s | 80 damage to every living ally; 4s warning |
| Withering Mark | 25s | 20s | Four 18-damage ticks over 8s; 2s warning |

Mana: 1,200 pool, base unit 30, passive regeneration 4/second. Boss: 4,200 health. A full living party deals approximately 47 damage/second. Damage patterns are deterministic and learnable. Current tuning is a starting point, not a claim of finished balance.

## Project map

| File | Responsibility |
| --- | --- |
| `src/data.js` | Abilities, party archetypes, encounter schedule, balance values |
| `src/combat.js` | Browser-independent combat state and fixed-step rules |
| `src/renderer.js` | Canvas environment, articulated characters, spells and impact feedback |
| `src/main.js` | Input, party-frame UI, event forwarding and game loop |
| `src/style.css` | Responsive UI and visual tokens |
| `tests/combat.test.mjs` | Deterministic combat and encounter tests |
| `server.mjs` | Dependency-free local static server |

See [architecture decisions and research](docs/architecture.md) and [validation notes](docs/validation.md).

## Assets and scope

Character, environment, and spell artwork is original procedural Canvas/SVG art. No third-party character packs or generated bitmaps are bundled. Fonts use Google Fonts (DM Sans and Cormorant Garamond) with local system fallbacks; the game works without the font service. No sound or saved progression yet.

Desktop keyboard and mouse are the primary control scheme. The layout also reflows for narrow screens, where selecting a party frame and tapping a spell is supported. It is not yet a dedicated mobile game UI.

The combat/rendering boundary supports replacing the prototype art without rewriting healing rules. New direct/channel healing abilities and scheduled boss damage can be configured in data. Shields, HoTs, smart targeting, and damage-to-healing will need new effect handlers; they are deliberately not prebuilt speculative systems.
