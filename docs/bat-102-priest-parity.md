# BAT-102 — Priest numerical balance against Shaman

## Result and stopping point

Two Priest-only numerical iterations were completed against the fixed shared cohorts below. The final equal-weight Chapters 1–8 ready/~13-slot result is **88.5% Priest vs 73.9% Shaman route progress** and **55.6% Priest vs 47.8% Shaman full completion**. Shaman outcomes were identical in every iteration. The full-completion gap is 7.8 percentage points; the route-progress gap is 14.6 points, beyond the approximate 10-point guide. Chapter 2–4 Priest advantages still exceed 20 points in places because the unchanged Shaman reference is particularly weak there. Weakening Priest's direct-heal play to match those failures would conflict with the issue's playability constraint. **Do not mark BAT-102 Done on this evidence alone.** Keep it In Progress pending review and human playtest.

At ~13 current gear slots, Chapter 7/8 full completion improved from **8/12 and 2/12** to **11/12 and 8/12** for Priest; Shaman remained **12/12 and 7/12** in this paired cohort. At ~18 slots Priest clears Chapter 8 **10/12**, Shaman **12/12**. These are deterministic bot diagnostics, not estimates of player win probability. The small late cohorts cannot establish a fine ranking.

## Numeric production changes

Only existing Priest spell and talent numerical values in `src/data.js` changed. The corresponding spell descriptions reflect the new numbers. Costs, cast and cooldown times, durations, targeting, effects, mechanics, Shaman/Druid, encounters, gear, loot, progression, and global resources retain their committed values.

| Existing field | Before | Final | Iteration |
| --- | ---: | ---: | ---: |
| `SPELLS.flash.heal` | 90 | 110 | 1 |
| `SPELLS.prayer.heal` | 100 | 110 | 1 |
| `SPELLS.penance.heal` | 120 | 150 | 1 |
| `SPELLS.penance.ticks[0].heal` | 60 | 75 | 1 |
| `SPELLS.penance.ticks[1].heal` | 60 | 75 | 1 |
| `PRIEST_TALENT_VALUES.sanctuary.reduction` | 0.20 | 0.30 | 2 |
| `PRIEST_TALENT_VALUES.divineFervor.speed` | 0.20 | 0.30 | 2 |

Iteration 1 increased direct and group healing while retaining the same Mana cost and cast cadence. Iteration 2 improved the two defensive eight-point talents to target late-boss failures while leaving Chapters 1–4 unchanged from iteration 1. The Twin Penance build keeps its two charges and existing mechanics.

## Reproducible comparison

Run `node scripts/bat-102-comparison.mjs 30 4 tmp/bat-102-comparison.json` to recreate the complete row-level JSON. The script includes its exact selections and seed schedules. All three local iterations used this identical script, cohort, builds, policy, and stages. The ignored raw outputs are `tmp/bat-102-baseline.json`, `tmp/bat-102-iteration-1.json`, and `tmp/bat-102-iteration-2.json` in this worktree.

* **Chapters 1–4:** Existing `routeTrial` with real seeded class-eligible gear and carried Health/Mana; 30 indices per chapter/build/skill. Route seed is `187000 + chapter * 100000 + index`, with combat/loot draws from that seed. Ready stage prepares two current-chapter route clears for veryGood and three for average. C1–3 use the legal progression pair Priest `1-binding`/Shaman `1-reserves`, Priest `3-binding`/Shaman `3-waves`, and Priest `5-penance`/Shaman `5-flow`. C4 uses three legal seven-point builds each: Priest `7-fourfold`, `7-sanctuary`, `7-echo`; Shaman `7-earth`, `7-tide`, `7-ancestral`. The established adaptive Shaman policy and existing Priest triage policy run at the same skill cadence. Both veryGood and average are retained: **720 routes** total.
* **Chapters 5–8:** BAT-98 production acquisition seeds `980000 + 104729 * index`, indices 0–3, for both classes; actual class-eligible gear at inherited previous, approximately 13-slot veryGood, and approximately 18-slot average checkpoints. The normal representative path is the first normal path from `representativePaths`; Health/Mana carry, and production 20% maximum Mana recovery follows non-boss wins. Three legal eight-point builds each: Priest `8-twin`, `8-sanctuary`, `8-fervor`; Shaman `8-earth`, `8-ancestral`, `8-tide`. Combat seed is acquisition seed plus route position times 1000 for both classes. The Shaman conservative public-warning gate calls its current priority policy; Priest uses its existing triage policy. **288 routes** total, 12 per class/chapter/checkpoint.
* **Equal-weight summary:** Each chapter contributes one eighth, regardless of build count or route length. For Chapters 1–4 it uses veryGood/ready; for Chapters 5–8 it uses veryGood/~13-slot normal routes. Route progress means reaching the boss; full completion includes the boss. Per-fight survival and depletion are first averaged within a chapter, then equally across chapters. Effective healing, overheal, and Mana spent are per attempted route, so earlier failures and different fight counts affect their means.

Actual class gear uses the same seed labels but may consume loot RNG differently. Acquisition checkpoints assume earlier farming victories. Decisions are deterministic heuristics, not optimal play. For a 30-attempt cell, the worst-case approximate 95% binomial half-width is 18 percentage points; for 12 attempts it is 28 points. These sample sizes identify large patterns and support paired scenario inspection, not precise class rankings.

## Fixed-cohort iterations

| State | Priest route progress | Priest full completion | Shaman route progress | Shaman full completion | Priest deaths / route | Priest boss-entry Mana / max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 80.6% | 38.8% | 73.9% | 47.8% | 0.99 | 46.0% |
| Iteration 1 | 88.5% | 50.1% | 73.9% | 47.8% | 0.79 | 51.3% |
| Iteration 2, retained | 88.5% | 55.6% | 73.9% | 47.8% | 0.74 | 51.7% |

Final equal-weight Priest/Shaman comparisons: safe full completion **51.9%/45.5%**; per-fight death-free survival **90.1%/86.0%**; effective healing **38,100/37,392** and overheal **13,785/3,688** per attempted route; Mana spent **5,723/5,079**; per-fight below-30-Mana incidence **19.2%/28.1%**; boss-entry Mana fraction **51.7%/51.3%** among routes reaching a boss. Priest spends more Mana and overheals more while retaining its direct-heal identity. The pooled Mana fraction hides a late-chapter difference: Priest/Shaman boss-entry fractions at ~13 slots are C5 **79%/97%**, C6 **86%/100%**, C7 **96%/100%**, C8 **99%/96%**. Late boss deaths usually occur with Mana still available.

| Chapter, ready or ~13 slots | Priest baseline route/full | Priest iteration 1 route/full | Priest final route/full | Shaman unchanged route/full |
| --- | ---: | ---: | ---: | ---: |
| 1 (30 attempts/class) | 22/0 | 26/4 | 26/4 | 29/4 |
| 2 (30 attempts/class) | 24/2 | 29/7 | 29/7 | 8/0 |
| 3 (30 attempts/class) | 2/0 | 10/0 | 10/0 | 0/0 |
| 4 (90 attempts/class) | 76/41 | 82/58 | 82/60 | 61/25 |
| 5 (12 attempts/class) | 12/9 | 12/9 | 12/10 | 12/10 |
| 6 (12 attempts/class) | 12/12 | 12/12 | 12/12 | 12/12 |
| 7 (12 attempts/class) | 12/8 | 12/10 | 12/11 | 12/12 |
| 8 (12 attempts/class) | 12/2 | 12/5 | 12/8 | 12/7 |

At Chapter 4, the Shaman `7-earth` reference alone reproduces **27/30 boss reaches and 17/30 full clears**, matching the issue's 90%/57% veryGood figure; C1–3 reproduce the issue's 97%/13%, 27%/0%, and 0%/0%. The table pools three Chapter 4 builds, including weaker Tide and Ancestral alternatives. The Chapter 5–7 ~13-slot Shaman results match the BAT-100 10/12, 12/12, 12/12 reference; Chapter 8 is **7/12** here versus **10/12** there. This independent paired comparison uses a different position-varying combat seed schedule and generic telemetry loop, so the BAT-100 result is contextual rather than an exact rerun. The class comparison above is internally paired on the new schedule.

Average-skill ready Chapters 1–4 and ~18-slot Chapters 5–8 were also retained. Final Priest/Shaman full completion is C1 **0/30 vs 4/30**, C2 **14/30 vs 0/30**, C3 **0/30 vs 0/30**, C4 **62/90 vs 26/90**; C5 **12/12 vs 12/12**, C6 **12/12 vs 12/12**, C7 **11/12 vs 12/12**, C8 **10/12 vs 12/12**. The sizable early class gaps persist in the secondary cohort.

## Controlled equal-stat pressure

Separate Chapter 4 real-Combat fixtures use identical pre-talent Priest-derived equipment stats and 30 common seeds `87000 + 4 * 10000 + index` (combat seed plus 999), scale-2 pressure, 90 seconds except long at 140 seconds. These are controlled survival probes, **not actual route outcomes**. The same seven-point focused/AoE/burst/long cohort was run at baseline and after each iteration. Priest `7-fourfold` survival moved from **67/100/13/73%** to **83/100/50/83%** after iteration 1 and remained there after iteration 2. Shaman `7-earth` remained **100/97/80/83%**; `7-tide` remained **97/93/20/20%**; `7-ancestral` remained **97/97/60/47%**. The final additional eight-point controlled probes show Priest `8-twin`, `8-sanctuary`, and `8-fervor` at **33%, 70%, and 77% burst survival** and **100% AoE survival**. Shaman Earth/Ancestral/Tide burst survival is **80%/67%/20%**. Twin has a weaker burst niche but retains charge throughput. In the controlled burst profile Priest capstone builds depleted Mana in 0–10% of attempts while Shaman builds did so in 90–100%; survival limits there are timing/pressure, not solely Mana.

## Validation and remaining limits

`npm.cmd test`: **282/282 pass**. `git diff --check` passes. The historical BAT-93 and BAT-99 healer snapshots are checked after reconstructing only the seven approved Priest value changes, so those tests continue guarding the older Mana, gear, other healer, and encounter scope. Tooltip and combat assertions now check the new numeric healing and mitigation values. With `npm.cmd start`, the local browser Team view displayed Flash 110, Prayer 110, Penance 75 per bolt, Sanctuary 30%, and Fervor 30% Haste; the preexisting Shaman selection was restored after this readout. No commit or push was made.

The largest unresolved gap is Priest's early route advantage at Chapters 2–4, especially Chapter 2 (97% versus 27% reach), while both classes still fail the Chapter 3 boss in this cohort. Altering only Priest numbers cannot repair weak Shaman routes; cutting Priest's direct healing enough to align them would sacrifice its intended play and likely undo late-boss gains. Chapter 8 average-gear full completion remains 10/12 versus 12/12, and four seeds are too few to claim equivalence. A human playtest is needed to judge whether the stronger direct heals, higher overheal, and remaining boss risk feel appropriate.
