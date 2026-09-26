# BAT-83: Final encounter and Chapter Boss balance check

## Method

`node scripts/holistic-balance.mjs 300 > docs/bat-83-final.jsonl` reproduces the 72 final rows: four chapters, two healers, three play policies, and first attempt / one prior normal-route clear / readiness. Each row uses 300 deterministic seeds. The [JSONL](bat-83-final.jsonl) contains every route's completion rate and every encounter's reach, conditional win, duration, and ending Mana, alongside boss-entry Health/Mana, fight duration, healing, overheal, and Mana spent. The [100-seed starting sample](bat-83-baseline.jsonl) guided tuning; its first-attempt rows predate the correction to first-encounter talent-point timing, so only its ready rows are directly comparable.

The runner uses the live `Combat` engine, BAT-77 recursive inherited equipment, actual loot weights and equip rules, all valid route branches, and exact persistent Health/Mana. It awards no current boss loot before that boss. A sampled prior clear grants its normal-route drops as in the established benchmark model; it does not simulate the combat needed to obtain each earlier clear. The first encounter of a chapter's first attempt uses 0/2/4/6 talent points, then the chapter's earned point is available for the rest of that attempt. Readiness uses the final 1/3/5/7-point representative builds; the eighth point is earned after the Chapter 4 boss and is excluded. No camp recovery is modeled.

Very good / average / weak policies decide every 0.12 / 0.20 / 0.30 seconds. Average and weak start healing earlier than very good, causing more potential overheal. These are reproducible play approximations, not human skill guarantees. The policy does not use offensive Atonement or every possible active cooldown. As in BAT-77, earlier chapter boss rewards are assumed for inheritance even where the current policy's measured kill rate would make that history difficult to obtain.

## Enemy changes

| Encounter | Final change from BAT-79/82 state | Reason |
| --- | --- | --- |
| Ch 1 Bone Watcher | HP 1500 → 1450; strike 68 → 65; each archer 36 → 34. Cadences unchanged. | Keep encounter 3 as the first-run wall while leaving enough party resources for a real boss attempt after gearing. Sentinel stays at 1000 HP. |
| Ch 1 Hollow Warden | HP stays 1700; 70-damage strike every 2.3s → 5s; each archer 23 → 10 every 4.5s. | Its old sustained damage killed parties entering with depleted resources before meaningful healing decisions. The slower, heavier strike gives a response window. |
| Ch 2 Mirelight Widow | Strike 50 → 46 every 1.8s; Bog Wisp 27 → 17 every 5.5s. HP and Mist unchanged. | At average readiness, the Priest's Boar/Mire route cleared 47% versus 81% for Moth/Choir. It now clears 63% versus 81%; Druid clears 87% versus 76%. |
| Ch 2 Elder of the Hollow Grove | HP 2050 → 1800; strike 54 → 43; Hollow Bloom 40 → 32; Thorn Slinger 23 → 18. Cadences unchanged. | Both healers were usually defeated at the two-clear readiness state after reaching this boss with about 20 Mana. |
| Ch 4 Crimson Cantor / Vein Weaver / Sorrow Bearer | HP 2300 → 2500 / 2150 → 2350 / 2150 → 2350. | Keep the long routes meaningful despite inherited Chapter 1–3 gear. |
| Ch 4 Briar Executioner / Bloodroot Keeper | Each HP 2500 → 2800. | Reinforce the final normal encounter without making it as long as the Duchess. |

Chapter 3 enemies and the Chapter 4 boss are unchanged. No gear, talents, loot probabilities, armor/resistance, or enrage rules changed. All current bosses still have 0 authored Armor and Resistance. Boss inventory: Warden 1700 HP, 70 Physical/5s, two 10-damage archers/4.5s; Elder 1800 HP, 43 Physical/2.4s, 32 party Magic/13s, 18-damage add/5s; Regent 2200 HP, 50 Physical/2.4s, three-target 65/14s, 35 party Magic/25s, 16-damage tank add/6s; Duchess 3600 HP, 60 Physical/2.4s, two-target 16-damage Bleed ticks/2s, three-target 70/19s, 40 party Magic/29s, 25-damage add/6s. The unchanged Regent and Duchess retain their authored warning/first-attack timing in `src/data.js`.

## First attempts and one-clear attempts

Numbers are normal-route completion, Priest / Druid. A route win means boss access; first-attempt boss kills were 0% in Chapter 1, at most 1% in Chapters 2–3, and at most 1% in Chapter 4 for every sampled policy.

| Chapter | Very good, first | Average, first | Weak, first |
| --- | ---: | ---: | ---: |
| 1 | 12% / 3% | 1% / 0% | 1% / 0% |
| 2 | 21% / 10% | 7% / 13% | 4% / 28% |
| 3 | 0% / 1% | 0% / 2% | 0% / 4% |
| 4 | 1% / 4% | 5% / 13% | 14% / 39% |

Chapters 1–2 fail overwhelmingly at their third normal fight. Chapter 3 failures build from the Furnace onward and cluster at the final branches. Chapter 4 failures cluster at the Garden/Cryptkeeper, though its weak Druid policy still reaches the boss on 39% of first attempts. That is above the requested outlier-access target. Full one-clear boss victory rates remain nonzero, especially for recursively geared Druid in later chapters:

| Chapter | Very good after one clear | Average after one clear | Weak after one clear |
| --- | ---: | ---: | ---: |
| 1 | 6% / 5% | 1% / 4% | 0% / 1% |
| 2 | 5% / 10% | 1% / 10% | 3% / 19% |
| 3 | 1% / 6% | 2% / 9% | 3% / 14% |
| 4 | 5% / 2% | 7% / 4% | 11% / 12% |

## Readiness outcomes

Ready means about two completed normal routes for very good, three for average, and four or five for weak. Current-chapter items count only *equipped* items before the sampled approach; party item level averages across all 27 slots, including empty slots. Route and boss rates are percentages. Boss win is conditional on reaching it, so it isolates the boss jump from route failure.

| Ch | Policy | Current items P/D | Party ilvl P/D | Route P/D | Boss win when reached P/D |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | Very good | 4.0 / 4.0 | 0.34 / 0.34 | 77 / 64 | 26 / 30 |
| 1 | Average | 6.0 / 6.0 | 0.49 / 0.49 | 78 / 74 | 29 / 45 |
| 1 | Weak | 8.5 / 8.5 | 0.69 / 0.69 | 81 / 75 | 31 / 61 |
| 2 | Very good | 4.0 / 4.0 | 1.30 / 1.30 | 80 / 65 | 28 / 51 |
| 2 | Average | 5.7 / 5.7 | 1.75 / 1.74 | 72 / 82 | 30 / 54 |
| 2 | Weak | 8.2 / 8.2 | 2.33 / 2.32 | 87 / 96 | 55 / 81 |
| 3 | Very good | 6.5 / 6.4 | 3.51 / 3.51 | 25 / 40 | 22 / 50 |
| 3 | Average | 9.6 / 9.4 | 4.71 / 4.68 | 48 / 63 | 41 / 72 |
| 3 | Weak | 13.8 / 13.4 | 5.99 / 5.93 | 84 / 94 | 57 / 91 |
| 4 | Very good | 6.7 / 6.6 | 6.55 / 6.52 | 46 / 44 | 32 / 21 |
| 4 | Average | 9.5 / 9.2 | 8.06 / 8.00 | 65 / 74 | 56 / 37 |
| 4 | Weak | 13.4 / 13.0 | 9.17 / 9.09 | 90 / 95 | 81 / 66 |

Both healers can win every boss at the very-good gear state, but these are not comfortable wins. Gear visibly improves normal-route completion in Chapters 3–4. The Chapter 1 Priest route is already 77% complete at two clears and only 81% at weak readiness; the boss win rate moves just 26% → 31%. The intended weak/easy curve is therefore **not met** for that class/chapter. Weak Priest is also only 55% / 57% against Chapter 2 / 3 bosses. Druid outperforms Priest by 23–34 points against Chapters 2–3 bosses under this policy, while Priest leads Druid by 11–19 points in Chapter 4. The Chapter 3 Druid boss can be easier than completing its route, so the largest-jump target is not universal.

## Persistent resources and branch comparison

The next table gives mean *total party* Health and healer Mana on boss entry, then mean winning boss duration and remaining Mana. Values are Priest / Druid. The JSONL also has tank and healer entry Health, boss effective healing, overheal, Mana spent, and mean duration including defeats.

| Ch | Policy | Entry party HP P/D | Entry Mana P/D | Winning seconds P/D | Mana after win P/D |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | Very good | 1612 / 1515 | 17 / 17 | 62 / 62 | 18 / 18 |
| 1 | Average | 1629 / 1603 | 17 / 20 | 60 / 61 | 19 / 21 |
| 1 | Weak | 1618 / 1693 | 16 / 19 | 60 / 60 | 22 / 21 |
| 2 | Very good | 1632 / 1452 | 21 / 18 | 57 / 58 | 17 / 17 |
| 2 | Average | 1632 / 1489 | 20 / 18 | 55 / 56 | 17 / 18 |
| 2 | Weak | 1834 / 1809 | 17 / 18 | 54 / 55 | 17 / 19 |
| 3 | Very good | 1472 / 1395 | 20 / 19 | 57 / 58 | 17 / 19 |
| 3 | Average | 1669 / 1651 | 19 / 18 | 55 / 56 | 18 / 17 |
| 3 | Weak | 1835 / 1899 | 21 / 20 | 54 / 54 | 20 / 19 |
| 4 | Very good | 1539 / 1383 | 19 / 22 | 80 / 80 | 17 / 15 |
| 4 | Average | 1620 / 1518 | 20 / 22 | 78 / 78 | 19 / 20 |
| 4 | Weak | 1839 / 1795 | 20 / 21 | 76 / 76 | 18 / 21 |

Boss-entry Mana is only 16–22 in every ready row despite larger Mana pools from gear. The final normal fights are still the main resource bottleneck, and winning boss fights generally run on regeneration. At average readiness, Chapter 2's two branch completion rates are 63% / 81% for Priest and 87% / 76% for Druid (Boar/Mire versus Moth/Choir). Chapter 3's four routes span 41–54% Priest and 56–70% Druid; Chapter 4 spans 51–74% Priest and 69–77% Druid. Branches are closer after the Mire change, but Chapter 4 Priest's Cryptkeeper branches remain harder.

## Conclusion and limits

This pass improves Chapter 1–2 boss feasibility and Chapter 2 branch balance, and restores meaningful late Chapter 4 route pressure without changing gear, talents, or drop rates. Automated tests pass (166/166). The browser rendered the updated Chapter 1 Warden details, including 70 damage every 5 seconds; the saved completed chapter was inspected without resetting user progress.

BAT-83's full acceptance criteria are **not yet met**. In particular, Chapter 4 weak Druid reaches its boss too often on the first attempt; one-clear wins reach 19% for weak Druid in Chapter 2; weak Priest boss readiness is not easy in Chapters 1–3; and several boss/route outcomes have sizable healer differences. Alternative Priest builds (Chapter 2 Early Mercy and Chapter 3 Lingering Prayer) and a boss pattern with more burst and less steady damage did not remove the gaps in 100-seed probes. Further enemy-only changes that were tested traded away first-run pacing or geared route completion, so those were not retained. The remaining gaps warrant a separate review of actual healer play, build policy, and progression power before declaring the intended curve complete.
