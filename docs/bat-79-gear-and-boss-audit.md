# BAT-79 provisional gear and boss audit

BAT-79 cannot meet its full boss readiness targets with the current normal-route and healer-talent baselines. This pass fixes the demonstrable healer loot-access defect and records reproducible outcomes. Boss combat values, gear stats, talent values, and drop probabilities remain at their current values pending a compatible route/talent pass.

## Gear and loot audit

The party has 27 equipment slots. Both healer catalogues contain one Chapter 1–4 item in each of Weapon, Tome, Trinket, Head, Chest, and Legs. Priest/Druid item-level pairs match in every chapter: Weapon and Trinket 3/6/9/12, Tome 2/5/8/11, Head and Legs 1/4/7/10, Chest 2/5/8/11. The [slot audit](gear-parity-audit.json) lists every item's heuristic stat-budget score, full stat vector, pre-boss table eligibility, route coverage, and boss-only availability. Budget scores use the same stat weights as the benchmark equip sampler; they are comparison scores, not combat multipliers. Neither catalogue has Crit or Haste on authored healer gear. Priest generally trades for slightly more Mana and Spell Power; Druid gets slightly more regeneration or defensive stats. Every item uses its authored stats directly in combat.

The original encounter-index rotation offered the Priest weapon on every Chapter 1–2 route but the Druid weapon on **no** such route. This made Druid Spell Power remain zero in the Chapter 1 BAT-77 samples. Normal loot tables now rotate Priest and Druid items by route depth, yielding the same pre-boss slot opportunities:

| Chapter | Weapon | Tome | Trinket | Head | Chest | Legs |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1/1 | 1/1 | 1/1 | 0/1 | 0/1 | 0/1 |
| 2 | 2/2 | 2/2 | 2/2 | 0/2 | 0/2 | 0/2 |
| 3 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 0/4 |
| 4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 0/4 |

Each cell is the number of valid pre-boss routes offering that slot, identical for Priest and Druid. The boss's normal reward table also offers the same healer slot to each class. The other healer slots are available from boss rewards or later routes, but hidden current-boss bonus loot is never used for that boss. Universal Head/Chest/Legs items from companion tables can also be equipped by either healer. Eligibility code applies the same owner filtering, category weights, and ownership rule to both healers. The audit found **zero companion reward-table differences** in any Chapter 1–4 encounter, including chapter bosses. The five-class drop weights and 50/35/15 item-count distribution were not changed.

With 300 fixed gear-sampling seeds per healer/tier, Chapter 1 Druid Spell Power is now 2.0/2.7/4.4 at very-good/average/weak readiness, up from zero in BAT-77. Chapter 2 Druid Spell Power is 6.6/9.3/12.9. The complete equipped item maps and party stat totals are in [the updated benchmark](bat-79-gear-benchmarks.json). Rounded representative means follow; each cell is Priest/Druid.

| Chapter / tier (clears) | Current gear / 27 | Party ilvl | Party HP | Companion damage | Healer Mana | Regen | Spell Power |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 very good (2) | 4.0/4.0 | .34/.34 | 2233/2238 | 48.5/48.6 | 617/613 | 2.19/2.22 | 2.4/2.0 |
| 1 average (3) | 5.6/5.6 | .47/.46 | 2248/2253 | 49.6/49.5 | 623/617 | 2.29/2.31 | 3.7/2.7 |
| 1 weak (4–5) | 8.4/8.4 | .69/.68 | 2278/2281 | 51.1/51.2 | 635/627 | 2.37/2.46 | 5.9/4.4 |
| 2 very good (2) | 3.8/3.6 | 1.25/1.24 | 2333/2337 | 54.6/54.8 | 638/633 | 2.54/2.59 | 7.3/6.6 |
| 2 average (3) | 5.2/5.6 | 1.67/1.74 | 2389/2400 | 56.0/57.0 | 657/641 | 2.78/2.81 | 10.7/9.3 |
| 2 weak (4–5) | 8.7/8.3 | 2.40/2.33 | 2479/2470 | 59.6/59.7 | 667/658 | 2.93/3.04 | 14.1/12.9 |
| 3 very good (2) | 6.6/6.1 | 3.47/3.36 | 2545/2547 | 65.7/65.0 | 677/652 | 3.00/3.19 | 15.3/13.0 |
| 3 average (3) | 9.6/9.6 | 4.67/4.69 | 2682/2690 | 69.3/69.7 | 695/675 | 3.24/3.50 | 19.9/17.2 |
| 3 weak (4–5) | 13.8/13.4 | 6.00/5.92 | 2801/2806 | 73.4/73.2 | 719/692 | 3.43/3.71 | 25.3/19.4 |
| 4 very good (2) | 6.2/6.2 | 6.46/6.42 | 2828/2835 | 77.9/77.9 | 710/679 | 3.49/3.65 | 22.6/19.2 |
| 4 average (3) | 9.6/9.2 | 8.05/7.96 | 2966/2958 | 82.3/81.7 | 734/704 | 3.73/3.97 | 29.4/25.2 |
| 4 weak (4–5) | 13.4/12.8 | 9.19/9.08 | 3038/3028 | 86.6/86.0 | 751/718 | 3.86/4.19 | 33.7/27.2 |

The equipped counts remain close to BAT-77's chapter-specific 2/3/4–5 clear pacing thresholds. The changed loot rotation, not a gear-stat increase, closes the largest access hole. The largest authored healer budget-score difference is the Chapter 3 trinket (Priest 13.6, Druid 11.2), mostly 0.3 Mana regeneration; no slot lacks a counterpart or has a different item level. Remaining higher-chapter Spell Power gaps reflect different authored budgets and acquisition paths; they are much smaller than the original zero-SP defect.

## Normal-route revalidation

The [100-seed route revalidation](bat-79-normal-revalidation.jsonl) uses the same fixed BAT-78 simulation rules and both healers. First-run full-route completion remains uncommon: Chapter 1 13%/0%, Chapter 2 16%/6%, Chapter 3 0%/0%, Chapter 4 12–20%/0–2% for very-good Priest/Druid. At 2/3/5 clears, Priest/Druid completion is respectively Chapter 1 83/71, 77/66, 87/84%; Chapter 2 80/54, 89/33, 97/64%; Chapter 3 40/9, 49/37, 80/35%; Chapter 4 Twin variants 68/23, 87/46, 94/2%. Other Chapter 4 talent variants are in the JSONL. The first-run route shape remains broadly consistent with BAT-78, so no normal enemy change was made.

The Druid gap remains material in later chapters despite improved weapon access. Weak Druid completes only 2–4% of Chapter 4 routes after five clears, while Weak Priest completes 92–94%. This is a route and current-talent problem before a boss can be evaluated as easy for that tier. The Chapter 4 Twin Rejuvenation/Tranquility divergence is also pronounced. These findings belong in BAT-80/81/82 and the final holistic BAT-83; changing boss damage cannot repair route completion.

## Boss validation and tuning limit

The [100-seed baseline outputs](bat-79-boss-verygood.jsonl), [average outputs](bat-79-boss-average.jsonl), and [weak outputs](bat-79-boss-weak.jsonl) use recursive inherited gear, BAT-68 talents, real route resource persistence, and the BAT-77 skill policies. Win rate includes normal-route failures. The table gives route/boss win percentages, followed by mean boss-entry tank HP / healer HP / Mana among route completers. The 4th-chapter rows use Twin Penance / Twin Rejuvenation; both other variants are in the machine results.

| Chapter / tier | Priest route→boss win | Druid route→boss win | Priest entry T/H/M | Druid entry T/H/M |
| --- | ---: | ---: | ---: | ---: |
| 1 very good, 2 clears | 74→0% | 72→0% | 268/350/18 | 224/349/17 |
| 1 average, 3 clears | 83→0% | 68→0% | 302/357/19 | 254/359/18 |
| 1 weak, 5 clears | 87→0% | 88→0% | 280/363/22 | 257/369/19 |
| 2 very good, 2 clears | 78→11% | 50→3% | 389/381/35 | 273/334/20 |
| 2 average, 3 clears | 81→6% | 34→0% | 368/391/21 | 177/308/20 |
| 2 weak, 5 clears | 99→16% | 63→0% | 475/420/32 | 256/346/20 |
| 3 very good, 2 clears | 33→13% | 14→4% | 310/377/31 | 265/362/16 |
| 3 average, 3 clears | 61→21% | 26→5% | 299/388/23 | 202/330/18 |
| 3 weak, 5 clears | 86→38% | 40→1% | 340/413/23 | 137/348/26 |
| 4 very good, 2 clears | 69→34% | 24→2% | 446/430/42 | 254/225/18 |
| 4 average, 3 clears | 85→57% | 60→1% | 438/455/22 | 196/251/17 |
| 4 weak, 5 clears | 92→25% | 5→0% | 461/480/25 | 136/262/23 |

Mean Chapter 1 boss attempts end after 10–16 seconds with zero wins. At Chapter 2 readiness, baseline boss attempts last 15–42 seconds; the few wins last about 59–64 seconds and end with 12–20 Mana. Chapter 3 attempts last 18–42 seconds; wins last about 52–56 seconds and end near 17–39 Mana. Chapter 4 attempts last 18–71 seconds depending on healer and tier; Priest wins take about 75–80 seconds with 19–25 Mana at average/weak readiness, while Druid has almost no wins. Exact duration, final Mana, talent variant, and loadout results are in the JSONL. Mana is roughly 600–750 at full resources but usually **17–43 at boss entry**; no recovery was inserted.

At the one-clear state, baseline Chapter 4 Priest already wins 16% with Twin Penance or 26% with Sanctuary across all attempts. Chapters 1–3 are much less permissive. The existing bosses therefore miss the readiness curve in different directions even before any tuning.

The current boss values, all unchanged, are:

| Chapter boss | HP | Armor/resistance | Primary strike | Mechanics and adds |
| --- | ---: | --- | --- | --- |
| Hollow Warden | 1,700 | none | 70 Physical / 2.3s | Two Pale Archers, 23 Physical / 4.5s each. |
| Elder of the Hollow Grove | 2,050 | none | 54 Physical / 2.4s | Hollow Bloom 40 Magic party / 13s; Thorn Slinger 23 Physical / 5s. |
| Cinder Regent | 2,200 | none | 50 Physical / 2.4s | Sundering Decree 65 Physical to three / 14s; Crown of Embers 35 Magic party / 25s; Regent Guard 16 Physical / 6s. |
| Thornveiled Duchess | 3,600 | none | 60 Physical / 2.4s | Bleeding Veil 16 Bleed ×6 to two / 17s; Cruel Court 70 Physical to three / 19s; Scarlet Requiem 40 Magic party / 29s; Thornbound Attendant 25 Magic / 6s. |

A diagnostic sweep at **90% boss HP and 60% boss damage** did not solve the curve ([very-good](bat-79-boss-sweep-verygood.jsonl), [average](bat-79-boss-sweep-average.jsonl), [weak](bat-79-boss-sweep-weak.jsonl)). Chapter 1 very-good boss wins were only 3–6% after two clears; weak boss wins were only 1–4% after five. Chapter 3 Priest then won 17% after **one** clear and 31% after two; conditional on reaching the boss, those were 100% and 94%. Chapter 4 Priest won 49–54% after one clear, and almost every reached boss at average/weak readiness. The sweep would also make several bosses weaker than the last normal encounter in raw damage. These values were **diagnostic only** and were not committed to game data.

The simultaneous targets of exceptional one-clear kills, viable two-clear kills, medium three-clear fights, easy four-to-five-clear fights, and boss as largest chapter jump cannot be reached cleanly by boss-only tuning with the current route-entry resources and small power difference between adjacent gear states. Further gear stat increases large enough to separate those states would distort the BAT-78 normal-route curve. Druid's later route deficit would remain. This is the concrete blocker for finishing BAT-79's boss portion under its enemy > gear > talents priority and its ban on talent rebalancing. Re-evaluate Chapter 1–4 route resource budgets and redesigned talents before final boss tuning in BAT-83.

## Reproduce

Run `node scripts/gear-parity.mjs` for the slot audit, `node scripts/chapter-benchmarks.mjs 300` for gear sampling, and `node scripts/normal-balance.mjs 100` with `CLEAR_COUNTS=0,2,3,5` for route validation. Run `node scripts/boss-balance.mjs 100` with `INHERITANCE_MODEL=recursive` and `SKILL_PROFILE` / `CLEAR_POINTS` set to `veryGood` / `1,2`, `average` / `3`, or `weak` / `4,5`. The diagnostic sweep also sets `BOSS_HP_SCALE=.9` and `BOSS_DAMAGE_SCALE=.6`. The only production change in this pass is the pre-boss healer loot-table rotation; no material normal-encounter adjustment was necessary.
