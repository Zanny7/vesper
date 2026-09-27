# BAT-98 — Era II gear and rewards

Implemented on `dev`. **BAT-97 still owns final encounter tuning.** No Chapter
1–4 item, spell, talent or numerical encounter value was changed.

## Catalogue and budgets

Chapters 5–8 each have **27 items** with stable IDs and local SVG artwork:
15 universal armor pieces, three shared healer pieces, three tank pieces,
three character weapons and three shared Damage trinkets. The slight increase
over the requested 20–26 range is necessary for 27 uniquely equipped items;
the inventory permits one copy of an item. Five distinct armor profiles per
slot offer Health, Physical defense, Magic defense and mixed alternatives.
Chest remains strongest. Era II borders are green; details say **Era II**.

All budgets are explicit in `src/data.js`; item level never scales stats.
Healer slots retain Weapon → Tome → Trinket Spell Power, Tome → Weapon →
Trinket Mana, and Trinket → Tome → Weapon regeneration ordering. Weapons and
Damage trinkets remain offensive; tank Shield/Trinket remain defensive.
Armor budgets use actual effective Health, rather than treating one Armor as
ten Health. Adjacent Era II raw budgets generally grow about 12–14%; actual
impact depends on the character and damage type.

| Chapter | Item levels | Healer Spell Power / Mana / Regen totals | Tank Shield Armor | Damage weapon / trinket |
| --- | --- | --- | --- | --- |
| 5 | 13–15 | 61 / 360 / 5.85 | 18 | 12.5 / 4.5 |
| 6 | 16–18 | 69 / 410 / 6.65 | 20.5 | 14 / 5.1 |
| 7 | 19–21 | 78 / 460 / 7.55 | 23 | 16 / 5.8 |
| 8 | 22–24 | 88 / 520 / 8.55 | 26 | 18 / 6.6 |

Baseline-spell, 130-second Combat capacity assays confirm growth without
imposing equal multipliers: Chapter 4 → 8 effective healing is **9,081 →
15,731 Priest**, **8,370 → 11,383 Druid**, **9,456 → 11,755 Shaman**. These
unlimited-wound assays measure capacity, not chapter difficulty. Shaman/Druid
retain more Mana late in the curve; BAT-97 must audit pacing and active-healing
pressure with actual equipped builds.

## Loot and choice persistence

All **47 combat encounters** have explicit, chapter-local tables. Each normal
pool has one healer piece, six universal pieces, one tank piece, three Damage
weapons and one Damage trinket. Category weights and **50% zero / 35% one /
15% two** normal drops remain unchanged: 0.65 requested items per victory.
Every legal pre-boss route covers all 27 items, including shrine routes and
routes that skip elites. No item requires its chapter boss or elite.

Each elite has six targeted items, including all three healer slots, a Shield,
a defensive Chest and a Damage trinket. Its independent **60% success roll**
opens a choice of one unowned eligible item. No item is randomly awarded by
that roll. Normal drops still apply independently. Bosses keep their existing
normal rewards plus one additional eligible **Boss Bonus** when available;
the bonus catalogue stays behind the existing mystery tile.

The choice dialog shows full item details, selection and explicit confirmation.
Choose later and Escape retain the reward; a persistent button reopens it.
The roll and choices are stored in equipment version 5 under the existing
storage key. A per-attempt victory ID prevents repeat awards. Claiming saves
the chosen inventory item and spent claim together. Replay creates a new
attempt. Owned items disappear from pending choices; exhausted rewards finish
without duplicates. Hard reset clears choices with inventory. Versions 1–4
remain compatible. The launcher is disabled during combat.

## Acquisition evidence

[`bat-98-acquisition.json`](bat-98-acquisition.json) contains 64 seeded campaigns
per healer/route policy, real inherited inventory, role/slot counts, stat changes,
route acquisition, owned-pool suppression, unused inventory and representative
loadouts. Armor assignment maximizes actual effective Health with unique items;
role items use the established throughput/Mana score. Targets are measured by
**equipped useful current-chapter slots**, never catalogue ownership.
Seeds use a 104729 stride to distribute initial loot rolls. The first two normal
victories grant a mean **1.27–1.33 upgrades**, close to the expected 1.30.

| Chapter | Normal victories to ~13 slots | Normal victories to ~18 slots | Elite-route victories to ~18 slots | Normal victories to 26–27 slots |
| --- | ---: | ---: | ---: | ---: |
| 5 | 20.7 | 27.7 | 24.0 | 44.4 |
| 6 | 21.0 | 29.3 | 25.1 | 46.5 |
| 7 | 20.4 | 27.8 | 25.2 | 44.8 |
| 8 | 19.7 | 28.1 | 26.4 | 42.8 |

Observed strong states have **13–15 / 27**, average states **18–20 / 27**;
high-farm diagnostics have **26–27 / 27**. These are acquisition stopping
points, not boss-clear requirements. Elite choices contribute about **1.7–2.4
items** before the average stopping point, reducing required victories modestly.
The 60% target is retained. Harder fights may take longer or fail, so victory
counts do not establish time savings. Shrine routes reach the same slot targets.

Duplicate and incompatible grants are zero under production filtering. Unused
current-chapter rewards are also zero at these sampled stopping states. The
report counts inventory separately from upgraded slots and records rewards
suppressed by exhausted tables. No route or
role coverage bottleneck was found. At ~18 equipped upgrades, the healer still
has about 2.8–3.1 carried slots and companions about 0.8–2.3 each; their exact
item IDs and stat changes are retained for tuning. Carried slots can contain
gear from more than one earlier chapter.

Acquisition **assumes victories**. Chapter 5 inheritance uses actual recursive
Era I average farming and boss rewards; subsequent inheritance uses an observed
~18-slot previous-chapter state plus its real boss rewards, preserving inventory.
No temporary stats or fake items are used. Disabling elite choices consumes
fewer RNG draws, so its comparison is between seeded distributions, not identical
normal drop sequences.

## Validation and BAT-97 handoff

- **277 automated tests pass**; Era I items match the BAT-94 fixture exactly.
- Desktop **1280×800** and mobile **390×844** pass 15 browser checks: all four
  chapter reward previews, green identity, six-item selection, later/reload,
  one-item claim, replay, repeat-result protection, failed roll and Boss Bonus.
  Screenshots were reviewed; no page overflow or JavaScript errors. Temporary
  QA runs in an isolated browser context and never alters the user's saved game.
- [`bat-98-footholds.json`](bat-98-footholds.json) verifies the inherited Chapter
  4 Shaman loadouts clear its boss **24/24**, and every distinct normal entrance
  prefix clears both fights without current-chapter gear: **48/48 Chapter 5**,
  **96/96 each Chapters 6–8**. Health/Mana carry with production recovery.
  Eight seeds and three existing builds use the conservative forecast policy;
  these are deterministic diagnostics, not human win probabilities.
- `git diff --check` passes.

Reproduce:

```powershell
npm.cmd test
node scripts/era2-gear.mjs 64 docs/bat-98-acquisition.json
node scripts/era2-gear-footholds.mjs 8 docs/bat-98-footholds.json
```

BAT-97 can import `progressionWitness(seed, healer, strategy)` and
`equipmentForSnapshot(state, healer)` from `scripts/era2-gear.mjs`. States are
`previous`, `early`, `partial` (~6), `veryGood` (~13), `average` (~18), and
`nearComplete` (26–27). Saved representative loadouts are also in the evidence
JSON. Validate Priest/Druid/Shaman build/seed distributions, carried-resource
boss approaches, 11–15 and 15–20 boss thresholds, durations and passive clears.
Perform human pacing/triage playtesting. **Retune Era II encounters where
needed; keep Era I gear fixed.** Chapter flags now read `rewardsStatus: authored`
and `balanceStatus: awaiting-tuning`. BAT-97 remains open.
