# BAT-103 — Druid numerical parity pass

## Decision

The selected Druid values meet the approximate equal-weight Chapters 1–8 comparison guide on the fixed representative bot cohort: route progress is **83.8% Druid vs 77.9% Shaman** (5.9 percentage points), and full completion is **58.2% vs 57.1%** (1.1 points). This is diagnostic simulation evidence, not player win probability. Recommend BAT-103 Done after coordinator review, with the per-chapter and policy limitations below retained in the issue handoff.

Only existing Druid spell Mana costs changed in production:

| Spell | Before | Selected |
| --- | ---: | ---: |
| Rejuvenation | 30 | 25 |
| Wild Growth | 70 | 50 |
| Nourish | 30 | 22 |

All healing amounts, talent values, durations, cooldowns, cast times, targeting, effects, Shaman and Priest values, encounters, acquisition, progression, gear, and global rules remain unchanged.

## Fixed comparison

Run `node scripts/bat-103-parity.mjs shaman tmp/bat-103-shaman.json 30 4` and then `node scripts/bat-103-parity.mjs druid tmp/bat-103-druid.json 30 4`. The script writes full row-level evidence to ignored `tmp/`. It uses common indexed seed cohorts and records build, stage, party results, healing, overheal, Mana spent, depletion, boss-entry Mana, and each encounter.

- **Chapters 1–4:** 30 seeds × two skill policies (veryGood and average) × ready gear = 60 routes per chapter and healer. The current BAT-89 route harness supplies actual class-legal gear and loot, with builds 1-Rejuvenation / 3-Rejuvenation / 5-Nourishment / 7-Blooming for Druid and 1-Reserves / 3-Waves / 5-Flow / 7-Earth for Shaman. Its legacy carried-resource route does not award post-fight Mana recovery. Seed indices match; class-specific loot can advance the random stream and route differently.
- **Chapters 5–8:** four BAT-98 acquisition seeds × three legal eight-point builds × veryGood and average gear checkpoints = 24 fixed normal routes per chapter and healer. Druid builds are Twin, Genesis, and Tranquility; Shaman builds are Earth, Ancestral, and Tide. Each class receives its legal acquired gear. Both use the same normal path and per-position encounter seeds, carried Health/Mana, and production 20% Mana recovery. The Shaman conservative forecast gate reproduces the BAT-100 ready results: C5–8 10/12, 12/12, 12/12, 10/12; average results are 12/12 in every chapter.
- **Controlled scenarios:** 32 fresh, equal-stat pressure probes per class in each of Chapters 1–4 (four profiles × eight seeds, 90 seconds) and 24 fresh equal-stat probes per class in each of Chapters 5–8 (first normal and boss × three builds × four seeds). These isolate healing capacity from class gear. In Era II they use the same Shaman-derived party stats with healer identity swapped. They are separate from carried route outcomes.

Shaman uses its existing adaptive priority in Era I and the BAT-100 conservative gate in Era II. The Druid bot uses the existing talent-balance policy with one BAT-103 diagnostic guard: it applies Twin's optional second Rejuvenation only if a six-second forecast puts the ally below 60% Health and Mana is above 25%. The guard affects only the script's choice of casts; combat mechanics and production AI are unchanged. This guard was frozen before the recorded baseline and candidate reruns. The original generic-bot sensitivity is below.

## Iterations

Four numerical iterations were evaluated, below the six-iteration limit. Every row uses the same cohorts and frozen diagnostic policy. Percentages average the eight chapter rates equally; they do not pool the different Era I and II sample counts.

| Druid state | Changed values vs original | Route progress | Full completion |
| --- | --- | ---: | ---: |
| Original | None | 72.3% | 6.2% |
| Iteration 1 | Rejuvenation 24, Regrowth 32, Swiftmend 30, Wild Growth 50, Nourish 22 | 92.1% | 66.4% |
| Iteration 2 | Wild Growth 50, Nourish 22 | 80.2% | 44.5% |
| **Iteration 3, selected** | **Rejuvenation 25, Wild Growth 50, Nourish 22** | **83.8%** | **58.2%** |
| Iteration 4 | Rejuvenation 26, Wild Growth 50, Nourish 22 | 83.8% | 55.5% |
| Unchanged Shaman | Reference | 77.9% | 57.1% |

Iteration 1 closed late gaps but made early Druid routes much easier. Iteration 2 left material C5–8 boss deficits, especially Twin. Iteration 4 reduced C7 full completion from 92% to 79%; iteration 3 was restored and validated.

## Selected result by chapter

Route means reaching the boss; full means defeating it. Values are **Shaman / selected Druid**. Deaths are mean party deaths per route; boss-entry Mana averages only routes that reached the boss.

| Chapter | Routes | Route progress | Full completion | All-party survival | Deaths | Boss-entry Mana |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 60/class | 95% / 87% | 13% / 10% | 13% / 10% | 0.97 / 0.90 | 55 / 64 |
| 2 | 60/class | 32% / 60% | 0% / 3% | 0% / 2% | 2.93 / 1.93 | 27 / 24 |
| 3 | 60/class | 2% / 30% | 0% / 0% | 0% / 0% | 2.58 / 1.72 | 25 / 29 |
| 4 | 60/class | 95% / 93% | 60% / 82% | 30% / 72% | 1.23 / 0.48 | 52 / 395 |
| 5 | 24/class | 100% / 100% | 92% / 83% | 92% / 83% | 0.21 / 0.21 | 929 / 786 |
| 6 | 24/class | 100% / 100% | 100% / 100% | 100% / 100% | 0 / 0 | 1004 / 852 |
| 7 | 24/class | 100% / 100% | 100% / 92% | 100% / 88% | 0 / 0.12 | 1049 / 921 |
| 8 | 24/class | 100% / 100% | 92% / 96% | 92% / 96% | 0.12 / 0.04 | 1081 / 1032 |

| Chapter | Effective healing | Overheal | Mana spent | Fights depleted per route |
| --- | ---: | ---: | ---: | ---: |
| 1 | 5,371 / 5,138 | 1,292 / 1,688 | 1,411 / 1,311 | 1.72 / 1.62 |
| 2 | 5,783 / 6,606 | 1,410 / 2,118 | 1,436 / 1,513 | 1.93 / 1.97 |
| 3 | 8,468 / 10,584 | 2,366 / 4,949 | 2,027 / 2,473 | 2.48 / 2.47 |
| 4 | 21,113 / 21,329 | 6,876 / 11,795 | 3,726 / 4,004 | 2.43 / 0.72 |
| 5 | 34,607 / 34,360 | 2,716 / 22,777 | 4,759 / 6,259 | 0.25 / 0.58 |
| 6 | 49,278 / 49,206 | 3,855 / 35,078 | 6,347 / 8,618 | 0.29 / 0.75 |
| 7 | 73,235 / 73,362 | 5,362 / 48,591 | 8,933 / 11,647 | 0.33 / 0.50 |
| 8 | 102,427 / 102,594 | 6,613 / 63,921 | 11,960 / 15,199 | 0.29 / 0.25 |

Druid's HoT kit still spends more Mana and overheals much more in Era II. The selected costs let that preparation remain viable without changing its spell effects. In equal-stat controlled probes, selected Druid survival was 50%, 94%, 75%, 97%, 100%, 100%, 100%, 100% for C1–8, versus Shaman 25%, 66%, 25%, 97%, 100%, 100%, 100%, 100%. Original-value Druid controlled survival was 34%, 72%, 59%, 94%, 96%, 88%, 71%, 71%.

The persistent 20+ point differences are C2–3 boss reach in Druid's favor and C4 full completion in Druid's favor. Shaman's current C2–3 reference rarely reaches the boss. Weakening Druid enough to mirror those failures would compromise its early HoT play and conflict with BAT-103's stated constraint. Neither C5–8 full-completion gap exceeds 9 points under the representative guard.

## Original generic-bot sensitivity

The original Druid policy spends the optional second Twin Rejuvenation aggressively. At original spell values it produced only 6.2% equal-weight full completion, essentially the same as the frozen-guard original-value baseline. At the selected values, its equal-weight route/full rates are **83.2% / 46.8%**, compared with **83.8% / 58.2%** under the fixed guard. C5–8 original-bot full completion is 67%, 79%, 62%, 71%. This sensitivity is material, especially for Twin, and is a limit of the bot evidence. The guard was chosen as a general triage/Mana rule before candidate reruns and does not alter production play.

## Validation and limits

`npm.cmd test`: **282/282 pass**. Druid cost and tooltip assertions were updated. BAT-99 and BAT-93 snapshot tests still verify their historical values by reconstructing only the three pre-BAT-103 Druid costs; Shaman, Priest, gear, and global resource values remain guarded. The fixed-cohort harness was run for the Shaman baseline, original Druid, all four numeric iterations, and the selected-value original-bot sensitivity. A final identical-cohort rerun reproduced the selected summary exactly. `npm.cmd start` served this dedicated checkout successfully; browser inspection was unavailable from the subagent thread (Chrome browser control unavailable and in-app browser visibility unsupported).

These bot outcomes are not player win probabilities. Era I and Era II use different established route harnesses; absolute rates should not be pooled by attempts. The Era II sample has four acquisition seeds and one normal path, so it does not cover elite or shrine forks, every gear assignment, or human decisions. Acquisition snapshots assume earlier victories. The equal-stat probes isolate healing capacity but do not represent legal class gear. A fresh human playtest is still needed to assess the feel of HoT preparation, Mana pressure, and Twin.
