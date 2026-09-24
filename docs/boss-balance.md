# BAT-68 persistent-resource boss balance

## Rules and model

Normal victories now save the exact surviving Health and Mana. There is no automatic camp recovery; a fallen companion stays down. A fresh attempt starts with full resources, while each required normal encounter in that attempt carries its outcome into the next. Loot acquired on the route can be equipped before the next fight, and equipment that raises a resource maximum follows the existing resource-reconciliation rule.

The original normal fights lasted about 60–80 seconds each. With exact carryover, the 100-seed two-clear baseline reached the Chapter 1 boss **0/100** times for either healer; later routes also usually exhausted Mana before the boss. Boss-only changes could not meet the requested readiness curve. Normal encounter Health was therefore reduced to preserve attrition while making the required route viable. Chapter 1 keeps a longer opening fight that requires healing: Sentinel has 1,100 Health and a 35-damage strike, rather than a short fight that can be won unattended. The final fixed normal Health values in `src/data.js` are:

| Chapter | Normal encounter Health in route order |
| --- | --- |
| 1 | Sentinel 1,100; Keeper 450; Watcher 500 |
| 2 | Briar 500; Moth/Boar 550; Choir/Mire 600 |
| 3 | Gatekeeper 600; Twins/Ravens 650; Furnace 700; Harrier/Tribunal 750; Bridge 800; Bells 750 |
| 4 | Huntsman 750; Hounds/Roses 800; Chapel/Leech/Procession 850; Garden/Cryptkeeper 900 |

One farming clear means one valid route of chapter normal encounters without that chapter's boss. Each trial samples the production 50%/35%/15% normal drop-count roll (0.65 expected items per encounter before unique-pool depletion), ownership and active-healer weighting, and canonical equip compatibility. It equips useful owned items by slot, including items acquired during the required approach route; no item is guaranteed. Earlier chapters contribute their mandatory route and boss rewards, but no optional prior-chapter farming in the main sample. The current boss's hidden bonus is unavailable against that boss. `PRIOR_FARMING_CLEARS=2` in `docs/boss-balance-prior-two.jsonl` measures the effect of more prior gear.

The simulator uses the live `Combat` engine, seeded loot and combat RNG, current equipment, and the specified talent path: 1/3/5/7 points at the four chapter bosses. The first current-chapter point is earned after its first normal encounter; previous boss points are available from the start. Chapter 4 runs both seventh-point variants per healer. The triage policy uses affordable single-target and group spells, and the Druid uses Swiftmend on wounded targets with a HoT. It does not use the BAT-67 playback speed setting. Run `node scripts/boss-balance.mjs 300`; set `CLEAR_POINTS`, `CHAPTERS`, `HEALERS`, `PRIOR_FARMING_CLEARS`, or `SHOW_LOADOUT` for focused comparisons.

## Final results: 300 fixed seeds per row

Each percentage is a boss victory **including approach-route failures**, at 0 / 1 / 2 / 4 / 5 local farming clears. The raw rows are in `docs/boss-balance-sample.jsonl`.

| Boss and build | Druid win rates | Priest win rates |
| --- | --- | --- |
| Warden (1 point) | 0 / 44 / 71 / 97 / 99% | 13 / 51 / 70 / 98 / 99% |
| Matriarch (3 points) | 23 / 55 / 71 / 95 / 97% | 48 / 80 / 92 / 100 / 100% |
| Regent (5 points) | 4 / 31 / 58 / 91 / 97% | 11 / 54 / 71 / 97 / 99% |
| Duchess: Twin Rejuvenation / Twin Penance | 19 / 47 / 69 / 92 / 98% | 41 / 71 / 87 / 98 / 99% |
| Duchess: Tranquility / Sanctuary | 12 / 42 / 65 / 91 / 97% | 47 / 77 / 91 / 99 / 100% |

At two clears, every tested build has a substantial chance to win, and four or five clears generally make the boss easy. Chapter 1 and 3 healer gaps are 1 and 13 points. Chapter 2 remains 21 points in Priest's favor; Chapter 4 remains 18–26 points in Priest's favor depending on seventh-point choices. These exceed the approximate 15-point parity goal. Both Chapter 4 Druid choices are viable (69% and 65% at two clears); the 7-point Priest builds are stronger (87% and 91%). The zero- and one-clear Priest results in Chapters 2 and 4 are also easier than the requested curve. More prior-chapter farming makes later bosses easier: with two optional clears in *each* previous chapter, the 100-seed two-clear sensitivity sample gives 88% Druid / 100% Priest for Matriarch, 70% / 89% for Regent, and 95–96% / 98% for Duchess. The current class-kit and talent difference should be evaluated in a dedicated healer-balance pass instead of distorting boss mechanics further for one build.

| Boss/build | Local items before approach | Equipped slots before approach | Approach duration | Boss-entry Mana | Boss-entry tank / healer Health | Winning boss duration | Mana after win |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Warden Druid | 3.7 | 3.7 | 80s | 376 | 551 / 374 | 63s | 18 |
| Warden Priest | 3.7 | 3.7 | 77s | 359 | 527 / 382 | 63s | 20 |
| Matriarch Druid | 3.9 | 6.8 | 59s | 293 | 591 / 422 | 70s | 20 |
| Matriarch Priest | 3.9 | 6.8 | 58s | 351 | 563 / 425 | 71s | 34 |
| Regent Druid | 6.3 | 12.1 | 104s | 118 | 595 / 452 | 61s | 27 |
| Regent Priest | 6.3 | 12.1 | 103s | 196 | 613 / 466 | 62s | 55 |
| Duchess Druid, Twin | 6.7 | 15.7 | 108s | 298 | 728 / 534 | 89s | 21 |
| Duchess Druid, Tranquility | 6.7 | 15.7 | 108s | 311 | 728 / 544 | 87s | 23 |
| Duchess Priest, Twin | 6.7 | 15.7 | 106s | 398 | 716 / 548 | 89s | 109 |
| Duchess Priest, Sanctuary | 6.7 | 15.7 | 106s | 413 | 718 / 545 | 89s | 121 |

Approach time includes all required normals. Entry resources average reached attempts; fight duration and final Mana average wins. Near-zero winning Mana in many Druid rows reflects an attrition challenge. `docs/boss-balance-loadouts.jsonl` contains representative two-clear equipment maps for all healer/build combinations, with the actual item IDs and allocated talents. Gear is sampled rather than prescribed.

## Final boss scaling inventory

All boss values below are **fixed** in `src/data.js`; they do not scale with chapter run count, difficulty, loot, party level, or healer choice. Boss Armor and Resistance are absent (effectively 0 in `Combat.damageEnemy`); boss Crit and Haste are also absent. Player Armor and Resistance use `100 / (100 + defense)` for nonnegative defense on matching Physical and Magic damage, while Bleed bypasses them (`src/stats.js`). Player Crit, Haste, Spell Power, and equipment affect output. All encounters share the fixed 150-second enrage. Adds flee when the boss dies. Loot probabilities are unchanged.

| Boss | Fixed Health / defenses | Fixed strike | Fixed mechanics | Fixed add |
| --- | --- | --- | --- | --- |
| Hollow Warden | 1,700 HP; 0 Armor/Resistance | 70 Physical, first/every 2.3s | None | Two Pale Archers, 23 Physical to random living targets, first 4s and 6s, then every 4.5s |
| Elder of the Hollow Grove | 2,050 HP; 0 Armor/Resistance | 54 Physical, first/every 2.4s | Hollow Bloom: 40 Magic to each living hero, first 10s, every 13s, 3s warning | Thorn Slinger, 23 Physical to a random living target, first/every 5s |
| Cinder Regent | 2,200 HP; 0 Armor/Resistance | 50 Physical, first/every 2.4s | Sundering Decree: 65 Physical to three distinct living targets, first 10s/every 14s; Crown of Embers: 35 Magic to each living hero, first 20s/every 25s; each has 3s warning | Regent Guard, 16 Physical to tank, first 5s/every 6s |
| Thornveiled Duchess | 3,600 HP; 0 Armor/Resistance | 60 Physical, first/every 2.4s | Bleeding Veil: two living targets, six 16 Bleed ticks at 2s intervals, first 9s/every 17s; Cruel Court: 70 Physical to three distinct living targets, first 16s/every 19s; Scarlet Requiem: 40 Magic to each living hero, first 25s/every 29s; each has 3s warning | Thornbound Attendant, 25 Magic to a random living target, first/every 6s |

## Verification and limits

The 300-seed sample uses the once-through prior-chapter baseline. Outcomes are estimates for one reproducible, competent triage policy and sampled gear, not guarantees for a human player. The final Chapter 2 and Chapter 4 parity gaps remain explicit above; no talent tree, base spell, or drop probability was altered to conceal them. The exact-resource chapter-run tests pass, including dead-companion persistence and reload behavior. The Chapter 1 focused combat tests also pass, including a check that the opening fight needs healing. The browser rendered the chapter map; its persisted interrupted attempt prevented a clean victory-flow check without resetting saved state. The full test suite has 121 passes and 12 failures, down from 120/13 before BAT-68; the remaining failures involve older spell, loot, and triage expectations in the shared working tree.
