# BAT-94 — Chapter 4 encounter pressure

Implemented on dev. **20% normal-victory Mana recovery, 3 Mana/sec base Regen and 1.5× BAT-92 item Regen remain fixed.** Gear, Shaman spells/talents/costs, Max Mana, Chapters 1–3 and Duchess are unchanged. Only five Chapter 4 normals changed.

## Targeted changes

- **Huntsman:** medium arrow now rotates through non-tanks from 6s, every 10s, lasting 12s. A separate weak tank snare starts at 8s, every 16s. Tank strikes stay fixed. Two brief medium-arrow overlaps compete with the tank wound.
- **Roses:** its three weak bleeds stay fixed; a warned 75-damage Rosefall arrives at 15s and every 18s while they tick.
- **Procession:** sequential weak bleeds and acolyte stay fixed; warned 120-damage split hits on two targets start at 16s, every 20s.
- **Garden:** one strong bleed renews every 14s rather than 16s; two-target shears increase from 190 to 220 and recur every 20s rather than 22s. There is still a six-second wound recovery window.
- **Cryptkeeper:** three weak wounds tick for 34 rather than 30 every 2s; petals increase from 100 to 135 and recur every 22s rather than 26s. The tank/add pressure stays fixed.

The first three correct passive or one-cast clears. The last two improve route attrition after the early corrections: the initial three-encounter pass still erased opening inefficiency in 98 of 121 matched boss-reaching pairs; final tuning reduces this to 44 of 116. Hounds, Chapel and Leech already required healing and retain their authored values. No enemy HP, global multiplier or anti-waiting rule changed.

## Huntsman witness

Same BAT-93 witness: prepared gear, path 0, 7-earth, seed 950000, full Health and 415/830 Mana. Before: natural **36.317s victory, 0 casts, 0 healing, 0 deaths**, ending at 830 after recovery. After: **28.033s defeat, 0 casts, 1 death**; Aldric falls while Nyx and Sera are at 62/470 and 32/440. No victory recovery is awarded. A single Riptide or Wave also fails the safe-clear check. Active play clears this state with all five alive.

## Passive audit

Safe clear means natural victory with zero deaths. Single-cast probes are deliberately stricter than the BAT-93 ≤5%-of-party-Health screen: one Riptide at the pull, or one Wave when the tank is below 65%, then no further casting. They can include talent healing. Counts below include path/build repetitions and are not independent human clear-rate estimates.

| Prepared encounter | Zero casts before → after | One Riptide before → after | One Wave before → after |
|---|---:|---:|---:|
| huntsman | 16 → 0 | 32 → 0 | 32 → 0 |
| hounds | 0 → 0 | 0 → 0 | 0 → 0 |
| roses | 0 → 0 | 0 → 0 | 12 → 0 |
| chapel | 0 → 0 | 0 → 0 | 0 → 0 |
| leech | 0 → 0 | 0 → 0 | 0 → 0 |
| procession | 0 → 0 | 2 → 0 | 10 → 0 |
| garden | 0 → 0 | 0 → 0 | 0 → 0 |
| cryptkeeper | 0 → 0 | 0 → 0 | 0 → 0 |

**No safe idle or single-cast clear in either first-visit or prepared samples.** All eight prepared encounters also clear safely under the active independent probes. Negative net Mana cost on a failed idle fight is capped in-combat regeneration before defeat, not a persisted victory refill.

## Active pressure before → after

Prepared, efficient persistent routes; all attempted normals, including rare failures. Effective healing is delivered healing; Regen is actual capped combat gain. Net cost is entry minus post-victory-recovery Mana, with no award on defeat. Health and Mana carry between fights; loot capacity changes are reconciled on next entry.

| Encounter | Casts | Effective healing | Mana spent | Combat Regen | Net Mana cost | Deaths / near-deaths |
|---|---:|---:|---:|---:|---:|---:|
| huntsman | 8.5 → 13.1 | 1673 → 2553 | 275 → 420 | 236 → 282 | 0.0 → 23.0 | 0.0/0.0 → 0.00/0.00 |
| roses | 7.5 → 10.8 | 1828 → 2752 | 261 → 398 | 236 → 314 | 0.0 → 0.6 | 0.0/0.0 → 0.00/0.00 |
| procession | 10.9 → 13.9 | 2808 → 3352 | 396 → 502 | 349 → 394 | -5.2 → 15.1 | 0.0/0.0 → 0.00/0.00 |
| garden | 17.6 → 19.3 | 3553 → 3827 | 558 → 610 | 461 → 459 | -3.9 → 17.2 | 0.0/0.1 → 0.05/0.42 |
| cryptkeeper | 16.2 → 18.9 | 4318 → 4856 | 600 → 695 | 467 → 471 | 27.0 → 54.4 | 0.0/0.0 → 0.06/0.16 |

Roses remains approximately Mana-neutral **with about eleven casts and 2,752 effective healing**. Neutral/gaining fights are allowed; the resource model does not impose a loss on every encounter. In independent half-Mana probes, all prepared normals require roughly 9–19 casts; bleeds supply 32–65% of emitted incoming damage. Weak simultaneous, medium sequential and single strong wounds retain distinct shapes.

## Persistent routes

128 attempts per stage/policy. Completion includes the unchanged boss. Boss-entry means include only boss-reaching routes; they are affected by survival selection.

| Stage / policy | Normals before → after | Full route before → after | Boss-entry Mana before → after | Normal OOM before → after |
|---|---:|---:|---:|---:|
| first / conservative | 90.6% → 68.8% | 58.6% → 51.6% | 612 → 575 | 21.9% → 42.2% |
| first / wasteful | 53.1% → 39.1% | 17.2% → 10.2% | 227 → 211 | 86.7% → 99.2% |
| first / mistake | 82.0% → 62.5% | 57.0% → 46.9% | 623 → 566 | 29.7% → 48.4% |
| ready / conservative | 100.0% → 97.7% | 95.3% → 89.8% | 825 → 799 | 1.6% → 9.4% |
| ready / wasteful | 89.8% → 82.0% | 64.1% → 55.5% | 449 → 357 | 27.3% → 40.6% |
| ready / mistake | 99.2% → 90.6% | 90.6% → 87.5% | 819 → 831 | 4.7% → 12.5% |

All four prepared paths clear with every reference build at seed 950000 with no deaths. Full prepared completion by build ranges from 87.5% to 96.9%. First visits have more attrition and can require acquired normal rewards before a complete run; preparation is intended gear, not overgearing.

Matched prepared boss-reaching pairs avoid interpreting the mistake policy's higher conditional Mana average as an improvement. Wasteful play enters with **508 less Mana** across 105 pairs. An inefficient opening alone loses 14.3 Mana on average across 116 pairs; 46 retain more than one Mana of penalty and 44 erase it, versus 92/127 before. Some pairs improve because spending changes Health, spell choices and combat RNG. **Remaining limit:** strong/current-chapter loadouts can still recover an opening mistake; the correction improves persistence and normal completion penalties without guaranteeing every mistake persists. Prepared normal completion drops from 97.7% efficient to 90.6% after a wasteful opening.

## Browser QA and checks

All eight normals: zero-cast defeats, reference-assisted victories with zero deaths. Manual Huntsman target changes, Roses Unleash/Chain recovery and Procession tank recovery confirmed visible triage choices. At 18s in Roses, Aldric is at 30% while Nyx and Theron carry weak wounds; manual Unleash + Chain raises them to 58%/75%/78% at 20s. Garden and Cryptkeeper were revisited after final tuning.

QA used bat94.localhost and a temporary copy of production input/rendering/combat with controlled-clock buttons and real seeded prepared loadouts. Fights start at half Mana with full Health; this is assisted/manual encounter QA, not an uninterrupted human route clear or a production-save test. The user's usual origin is separate. The existing npm-start server was reused after npm.cmd start reported port 5173 already occupied.

![Rosefall overlapping three weak wounds](bat-94-browser.png)

**256/256 tests pass; git diff --check passes.** New regression coverage verifies the original witness, passive/single-cast pressure across all paths/reference builds/stages, death-free carried-resource prepared clears, and unchanged tuning/gear/Shaman/other encounters. Existing bleed-duration coverage now selects the explicit tank wound and uses its full authored duration. The BAT-93 Mana guard retains its spell/talent/item assertions; the BAT-94 scope guard covers encounter changes.

## Method and reproduction

- Eight seeds per path/build/stage; four legal paths and four legal reference builds (7-earth, 7-tide, 7-ancestral-wave, 7-earth-echo), not every possible talent allocation. Real Combat and BAT-93 conservation policy (45% Health or three-second forecast below 65%, including pending healing).
- Seed 950000 + index; combat seed adds position × 100000. Loot RNG is separate. First has inherited prior-chapter gear; ready adds three acquired current-chapter normal reward passes. Acquisition assumes wins, not proof that farming runs were cleared.
- 5,120 independent encounter probes and 768 persistent routes **per scenario**. The independent loadouts cover all normals even if a persistent route fails before reaching them. Normal OOM means below the cheapest spell cost for over one cumulative second; it does not establish why every failure happened.
- Gear selection is frozen to BAT-92 Regen scores as in BAT-93, with selected 1.5× Regen restored on the party. Before and after receive identical loadouts and loot. Report loadouts are deduplicated; join row.loadout to loadouts for stats/items/allocations. Health maps use the stable healer resource key.
- Frozen pre-change encounters and fixed systems: scripts/fixtures/bat94-pressure.json. Full accounting, Health, casts, damage/healing by member, deaths and near-deaths: bat-94-before.json / bat-94-after.json. UI checks: bat-94-browser-checks.json.

```powershell
node scripts/chapter4-pressure.mjs before 8 docs/bat-94-before.json
node scripts/chapter4-pressure.mjs after 8 docs/bat-94-after.json
node scripts/chapter4-pressure-report.mjs
npm.cmd test
git diff --check
```

Tested checkpoint on dev. Recommend committing and pushing BAT-91/BAT-93/BAT-94 together after reviewing the existing uncommitted work, then a dev → main milestone PR. No commit, push or merge performed.
