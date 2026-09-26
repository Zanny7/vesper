# BAT-84 balance follow-up (open)

## Method and scope

The starting point is the uncommitted BAT-83 implementation and its 300-seed result in `bat-83-final.jsonl`. `node scripts/holistic-balance.mjs 300 > docs/bat-84-current.jsonl` reruns all 72 chapter, healer, play-policy, and readiness scenarios with the same deterministic seeds. The runner uses the live combat rules, normal-route branches, recursive inherited equipment, actual loot and equip rules, and persistent Health and Mana. `bat-84-current.jsonl` includes encounter and boss resource diagnostics. Probe comparisons below used the same first 100 seeds on both sides; they were used to reject changes, not as final estimates.

## Diagnosis

The BAT-83 weak Priest ready parties entered the Chapter 1–3 bosses with only 16–21 healer Mana on average. In 100-seed casts diagnostics, weak Priest made roughly 2–3 Penance and 1–3 Flash Heal casts per boss attempt, with almost no Greater Heal or Prayer of Healing. Druid's cheaper HoT sequence produces more effective healing at this low Mana level. That is a resource and encounter-pattern interaction, not a missing talent rank in the simulator. Delaying healing globally or adding offensive Holy Fire at low Mana damaged route completion and was rejected. Increasing Priest trinket Mana regeneration substantially improved ready outcomes, but also made later first attempts much too easy because those trinkets are inherited; that gear change was reverted.

Chapter 4 weak Druid's first-attempt route usually reached its final Garden or Crypt branch. On BAT-83's 300 seeds, the first-run win rate for those final encounters was 43% and 36%, respectively. Its prior-chapter equipment is stronger than the very-good profile's prior equipment, even before any Chapter 4 clear. Stronger middle or final normal fights reduced first-run boss access, but also consumed enough resources to damage already-correct geared readiness.

The production Druid tree already defines `maxRank: 2` for both Empowered Rejuvenation and Nourishing Touch in the committed `dev` tree. The allocation system honors those caps. BAT-83's default Druid builds use rank 2 Empowered Rejuvenation; they do not select Nourishing Touch. Its rank 2 alternative build is valid. The reported rank-cap omission therefore does not change the BAT-83/BAT-84 simulations. A direct two-rank allocation regression test was added.

## Retained Chapter 2 change

The Elder of the Hollow Grove now strikes for the same 43 damage every 3.3 seconds instead of 2.4, while Hollow Bloom deals 55 party damage instead of 32 every 13 seconds. HP and add damage are unchanged. This trades continuous tank pressure for a warned group-healing window, improving Priest's boss feasibility without changing the normal route, gear, loot, talents, or persistent resources. The encounter lesson was updated to match.

Final 300-seed outcomes below are boss victories conditional on reaching it, Priest / Druid. Full one-clear wins include route failure.

| Chapter 2 measure | BAT-83 | BAT-84 current |
| --- | ---: | ---: |
| Very-good ready boss win | 28% / 51% | 46% / 55% |
| Average ready boss win | 30% / 54% | 49% / 65% |
| Weak ready boss win | 55% / 81% | 75% / 86% |
| Very-good first-attempt full boss win | 0% / 0% | 2% / 0% |
| Very-good one-clear full boss win | 5% / 10% | 13% / 11% |
| Weak one-clear full boss win | 3% / 19% | 6% / 22% |

Chapter 2 normal-route completion is identical before and after for every scenario. The weak ready healer gap narrowed from 26 to 11 percentage points, but one-clear wins increased; that remains a pacing deviation.

## Rejected Chapter 4 tradeoff

One fixed-seed 100-sample probe lengthened and modestly strengthened the Chapel, Leech, and Procession fights. The table compares the same 100 seeds before and after the probe. Route completion means boss access.

| Weak route | Baseline | Probe |
| --- | ---: | ---: |
| Druid first attempt | 41% | 8% |
| Druid ready | 96% | 77% |
| Priest first attempt | 16% | 0% |
| Priest ready | 89% | 58% |

The probe achieved outlier first-run Druid access but lost too much geared route completion. Other probes with final-branch HP, strike, bleed, or one-time burst changes had the same tradeoff. No Chapter 4 change was retained. The user chose to preserve geared route completion and keep BAT-84 open.

## Remaining deviations and validation

On final 300 seeds, Chapters 1, 3, and 4 have exactly the same route and boss rates as BAT-83. Weak Priest Chapter 1 and 3 boss wins on reach remain 31% and 57%; Chapter 3 weak Druid remains 91%, a 34-point healer gap. Chapter 4 weak Druid first-run boss access remains 39%. These deviations are material and **not accepted as BAT-84 completion**. No broad gear, talent, loot, or global enemy tuning was retained to hide them.

The full automated suite passes: 167/167. In the browser, the Chapter 2 Elder details show the revised 43-damage strike every 3.3 seconds and the updated encounter lesson. The selected boss was previewed without starting or resetting the saved chapter.
