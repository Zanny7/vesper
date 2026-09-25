# BAT-82 healer talent number pass

This pass uses BAT-79's provisional encounter and gear state, plus the completed BAT-80/81 mechanics. It changes three Druid numbers: Natural Regeneration to **20% / 40%** of current gear-inclusive Mana regeneration (was 10% / 20%); Abundant Nourishment to **20 / 40 healing per qualifying HoT type** (was 10 / 20); and Wild Growth to **12 per tick, 96 per ally** (was 10, 80). No enemy, gear, Priest, or talent mechanic changed.

## Reproduction and assumptions

`scripts/talent-balance.mjs` runs five controlled profiles: focused tank pressure, two-target split pressure, party AoE, periodic tank burst mixed with split/AoE, and longer mixed attrition. Each starts from average BAT-79 recursive inherited gear plus three sampled clears of the current chapter. A short real Combat warmup carries actual Health and Mana into the measured fight. The profile uses the chapter boss's provisional HP and strike as a base, then replaces only its incoming damage pattern for isolation. Chapter 3–4 profiles use 1.3 times the reference strike damage; the stress matrix multiplies that by a further 1.6. The attrition profile extends enemy HP to 1.6 times the boss reference. The normal Combat engine handles mitigation, regeneration, cast costs, HoT pools, deaths, and the 150-second enrage. There is no resource refill between warmup and measurement.

The scripted policy makes a decision every 0.12 seconds, matching the existing `veryGood` headless interval. It uses health and active HoT coverage, including queued healing before another Nourish. It may cast 1–2 core HoTs per target and sometimes three. It uses Penance, Greater Heal, Prayer, Swiftmend, Wild Growth, Nourish, Genesis, Tranquility, Sanctuary, and Divine Fervor when appropriate. It arms Ward near low Health; the real route/stress matrix rarely crosses its 50% trigger before another heal. A deterministic test separately verifies Ward arming above 50%, triggering at exactly 50%, immediate triggering below 50%, charges and its effect indicator (`tests/druid-talents.test.mjs`). Other deterministic tests cover Nourish pooling/extension, Overgrowth transfer, Penance, Prayer, Atonement, Sanctuary, and Divine Fervor. Offensive Atonement is not part of the auto-healing policy, so this pass does not claim a combat-balance estimate for it.

The legal point paths are 0, 1, 3, 5, and 7 at the corresponding chapter stages. Eight-point builds are evaluated with chapter 4 pre-boss gear as a controlled post-boss talent comparison; the eighth point is earned on clearing that boss. Alternatives at the same point count isolate row choices. `BALANCE_VERSION=original` reproduces the three original numbers in the runner while keeping the final decision policy and fixed seeds. The JSONL files report each healer/build/profile's raw healing, effective healing, overheal, party damage, burst and sustained HPS, HPM, Mana spend/remaining/depletion, completion/deaths, cast counts and effective healing by source.

Run:

```powershell
$env:BALANCE_VERSION='original'; node scripts/talent-balance.mjs 100 > docs/bat-82-before-standard.jsonl
Remove-Item Env:BALANCE_VERSION; node scripts/talent-balance.mjs 100 > docs/bat-82-after-standard.jsonl
$env:CHAPTERS='4'; $env:PRESSURE_SCALE='1.6'; $env:BALANCE_VERSION='original'; node scripts/talent-balance.mjs 100 > docs/bat-82-before-stress.jsonl
Remove-Item Env:BALANCE_VERSION; node scripts/talent-balance.mjs 100 > docs/bat-82-after-stress.jsonl
$env:CHAPTERS='1,2,3,4'; $env:BALANCE_VERSION='original'; node scripts/talent-route-balance.mjs 100 > docs/bat-82-before-routes.jsonl
Remove-Item Env:BALANCE_VERSION; node scripts/talent-route-balance.mjs 100 > docs/bat-82-after-routes.jsonl
$env:CHAPTERS='4'; $env:PROFILES='burst,attrition'; $env:BUILD_FILTER='7-fourfold,7-blooming'; $env:PRESSURE_SCALE='1.6'; node scripts/talent-balance.mjs 300 > docs/bat-82-close-comparisons.jsonl
node scripts/talent-route-balance.mjs 300 > docs/bat-82-close-routes.jsonl
```

The full outputs are [standard before](bat-82-before-standard.jsonl), [standard after](bat-82-after-standard.jsonl), [stress before](bat-82-before-stress.jsonl), and [stress after](bat-82-after-stress.jsonl). The standard profiles mostly reach 100% completion by chapters 2–4, so the stress and real-route results are more discriminating. Effective healing is constrained by damage received and fight duration; higher raw output often appears as overheal rather than a proportional effective-healing increase.

## Paired 100-seed results

The following are selected seven-point chapter 4 stress results. Values are original → tuned; Priest values provide the unchanged reference. HPM is effective healing divided by Mana spent, and Mana is the mean end-of-fight balance.

| Profile | Build | Completion | Effective healing | Overheal | HPM | Mana remaining |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Focused | Priest Fourfold | 97 → 97% | 5,083 → 5,083 | 1,312 → 1,312 | 4.83 → 4.83 | 114 → 114 |
| Focused | Druid Blooming | 91 → 97% | 4,903 → 5,099 | 2,101 → 2,362 | 4.27 → 4.37 | 27 → 104 |
| Split | Priest Fourfold | 98 → 98% | 5,090 → 5,090 | 1,597 → 1,597 | 4.83 → 4.83 | 115 → 115 |
| Split | Druid Blooming | 95 → 98% | 4,636 → 4,913 | 2,894 → 3,603 | 4.02 → 3.99 | 22 → 41 |
| AoE | Priest Fourfold | 99 → 99% | 5,411 → 5,411 | 2,282 → 2,282 | 5.16 → 5.16 | 120 → 120 |
| AoE | Druid Blooming | 97 → 99% | 5,022 → 5,261 | 2,443 → 3,200 | 4.38 → 4.33 | 29 → 59 |
| Burst | Priest Fourfold | 87 → 87% | 5,885 → 5,885 | 1,150 → 1,150 | 5.22 → 5.22 | 35 → 35 |
| Burst | Druid Blooming | 80 → 94% | 5,465 → 5,921 | 1,977 → 2,683 | 4.76 → 4.76 | 20 → 26 |
| Attrition | Priest Fourfold | 95 → 95% | 6,054 → 6,054 | 1,347 → 1,347 | 5.07 → 5.07 | 59 → 59 |
| Attrition | Druid Blooming | 91 → 97% | 5,649 → 6,055 | 2,335 → 3,078 | 4.53 → 4.49 | 21 → 33 |

With **300 independent final seeds** for the closest burst/attrition comparisons, burst completion is Priest 84% and Druid 93%; attrition is Priest 93% and Druid 95%. The [300-seed results](bat-82-close-comparisons.jsonl) also report burst HPS 49/52, sustained HPS 57/56, HPM 5.21/4.76, and end Mana 33/26 for Priest/Druid in burst. Attrition's two-point completion difference is within sampling noise; exact parity is not claimed.

## Actual route and boss persistence

`scripts/talent-route-balance.mjs` uses the post-BAT-78 normal encounter set and provisional BAT-79 bosses. It carries Health/Mana and sampled loot along each randomly chosen route, then enters the boss without recovery. With 100 fixed seeds per listed path, paired before → after completion is:

| Chapter | Priest core route → full | Druid core route → full | Mean tuned boss-entry Mana, Priest / Druid |
| --- | --- | --- | ---: |
| 1 | 77→77% / 0→0% | 71→70% / 0→0% | 18 / 18 |
| 2 | 86→86% / 10→10% | 64→77% / 9→31% | 26 / 19 |
| 3 | 60→60% / 33→33% | 46→80% / 20→52% | 23 / 19 |
| 4 | 81→81% / 63→63% | 46→86% / 7→51% | 21 / 22 |

The chapter 4 Druid Ward path improves from 44% to 77% route completion and 7% to 38% full completion. Detailed [route before](bat-82-before-routes.jsonl) and [route after](bat-82-after-routes.jsonl) files include route damage/healing and conditional boss results. On [300 additional chapter 4 seeds](bat-82-close-routes.jsonl), Priest/Druid route completion is 85%/84%, while full completion is 66%/50%; boss-entry Mana averages 22 for both. This isolates a remaining boss result gap despite similar route readiness. Boss entry remains close to empty for both healers. Chapter 1 bosses remain at **0% full completion for both** in the 100-seed sampler; that is encounter/resource-curve evidence for BAT-83, not a reason to change Chapter 1 enemies here.

## Choice value and limits

- At one point, Nourishing Touch gives Druid higher focused HPM (4.17 versus 3.84 for Empowered Rejuvenation); Empowered Rejuvenation gives an AoE edge. Binding Light adds value in Priest burst (86% baseline to 92%) but little under purely focused pressure; Early Mercy is a timing choice that the current policy rarely exploits at Chapter 1.
- At three and five points, the larger Natural Regeneration has the strongest route-level impact because Mana persists. At five points, Abundant Nourishment and Ward are close in the standard controlled profiles, where Ward rarely triggers. Ward's value remains timing-dependent.
- At seven points in chapter 4 stress, Druid Blooming, Overgrowth and Living Rejuvenation all clear at least 93% in burst and 96% in attrition. Overgrowth has the better split HPM (4.13 versus Blooming's 3.99); Living Rejuvenation has the better AoE HPM (4.49 versus 4.33). Priest Fourfold has a clearer route advantage over Echo of Grace (63% versus 23% full chapter 4 completion), though the paths have different smart-target strengths.
- At eight points, Genesis/Tranquility each offer Druid 93% burst completion, while Twin Rejuvenation has 78% with this policy. Priest Twin Penance/Sanctuary/Divine Fervor each reach 92%. The eighth point is a controlled post-boss comparison and cannot be used to claim readiness for the Chapter 4 boss itself.

The numbers preserve Druid's delayed, overlapping healing and Priest's direct response. The large apparent change in early exploratory runs came from a headless Druid policy that cast Nourish without considering healing already queued on the target; that policy was corrected before the paired final runs. A lower Nourish Mana cost was also tried and reverted because it encouraged more low-value casts and worsened route completion. Neither exploratory change is in production. Cenarion Ward timing, Twin Rejuvenation's value under a human policy, offensive Atonement, and boss readiness at near-empty Mana remain uncertain. BAT-83 should evaluate the final normal/boss curve with these talent values rather than broad enemy changes in BAT-82.

Validation: `npm test` passes all 166 tests. The local browser displayed the 20%/40% Natural Regeneration and 20/40 Abundant Nourishment talent text, plus Wild Growth's 12-per-second, 96-per-ally spell text. A temporary local fixture rendered the actual Wild Growth, Nourish, and Ward effect icons and countdowns in the browser. The existing Druid effect tests also check the updated Wild Growth pool and Ward/Nourish/Genesis/Overgrowth indicators.
