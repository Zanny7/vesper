# BAT-84 Chapter 4 progression investigation (open)

## Checkpoint and decision

The tested checkpoint was committed on `dev` as `3169e28` and pushed to `origin/dev`. It includes the successful Chapter 2 Elder changes, the BAT-83 baseline, the Druid rank-allocation regression test, and the complete 300-seed validation described in `bat-84-balance-follow-up.md`.

No Chapter 4 gameplay change is retained from this investigation. The tested probes did not substantially suppress weak-Druid first-run boss access while preserving completion across the existing geared/readiness scenarios. This is evidence against the tested approaches, not proof that every possible encounter design is infeasible. BAT-84 remains open; the existing 300-seed Chapter 4 first-run Druid access of 38.67% remains unresolved.

## Method

All probes compare the same first 100 deterministic seeds, both healers, all three play policies, and first/one-clear/ready equipment stages: 18 scenarios per probe. Boss access means completing the normal route, independent of winning the boss fight. The diagnostic runner records actual encounter entry power, carried Health/Mana, fight-duration distributions, and timed Mana snapshots without changing the healing policy or combat rules.

`node scripts/ch4-progression.mjs 100` produces `bat-84-ch4-progression-baseline.jsonl`. Removing its diagnostic fields yields **exactly the same summaries in all 18 Chapter 4 scenarios** as the prior `bat-84-baseline-100.jsonl`. This verifies that instrumentation did not alter the fixed-seed results. Baseline gear uses recursive prior-chapter loot, actual equip rules, and persistent resources; no synthetic full-resource reset was added.

Placement probes hold equipment from previous clears fixed, then reorder the played encounters and their in-run loot. They screen placement effects rather than estimate a completed map redesign, which would also need validation of gear acquired on the redesigned prior clears. Neither placement probe warranted that next step.

## Why simple progression gates overlap

- The weak policy inherits gear from more prior-chapter clears than the very-good policy. A weak first attempt therefore has substantial inherited equipment, despite having no Chapter 4 clears. It is not uniformly weaker than every ready scenario.
- At Chapel, weak-first Druid averages 22.43 Spell Power and 5.57 Mana regeneration, compared with very-good ready Druid's 22.89 and 5.06. Their median winning Chapel time is identical at 59.02 seconds. A late timer or a broad stat threshold therefore also catches intended geared runs.
- Weak-ready Druid is more distinct: 30.45 Spell Power and a 53.82-second median Chapel win. Preserving only that profile would conceal harm to very-good and average readiness.
- Mana separates some Chapel attempts, but not enough to provide a clean gate. Median Druid Mana after a Chapel win is 53 for weak first, 126 for very-good ready, 160 for average ready, and 218 for weak ready. First attempts that already fail should not be counted as opportunities to reduce boss access: their resources overstate the selectivity of additional pressure.
- Among **baseline boss-access survivors**, 29% of weak-first Druid runs are still fighting Chapel at 54.9 seconds with less than 120 Mana; so are 7% of very-good and 12% of average ready survivors. Raising that cutoff to 240 catches 88% of weak-first survivors, but also 33% and 39% of those ready survivors. These are diagnostic exposure fractions, not simulated losses from a new Mana mechanic. No conditional Mana penalty was implemented.
- Both final branches contribute to first access: in the 100-seed weak-Druid baseline, Garden-route access is 22/54 (41%) and Crypt-route access is 19/46 (41%). There is no single permissive branch that can be closed without testing both readiness curves. At the final fights, median entry Mana is roughly 18–24 for weak-first, very-good ready, and average ready Druids, so late attrition catches already depleted geared runs too.

## Paired probe results

Percentages below are route completion on the same 100 seeds. Ready columns list very-good / average / weak policies. Full 18-scenario results, including one-clear runs and boss results, are in each named JSONL file.

| Probe | Weak Druid first | Druid ready (VG / avg / weak) | Priest ready (VG / avg / weak) | Decision |
| --- | ---: | ---: | ---: | --- |
| Baseline | 41% | 46% / 74% / 96% | 49% / 63% / 89% | Preserve |
| Chapel late burst | 20% | 39% / 65% / 93% | 44% / 60% / 89% | Reject geared losses |
| Chapel fourth | 32% | 40% / 66% / 95% | 44% / 63% / 94% | Reject geared losses and insufficient first-run suppression |
| Chapel last | 61% | 49% / 81% / 100% | 64% / 79% / 98% | First access increases |
| Larger, slower final strikes | 41% | 47% / 76% / 96% | 47% / 62% / 88% | No first-run improvement |
| Final group-pressure shift | 37% | 43% / 73% / 94% | 55% / 78% / 99% | Insufficient first-run suppression; Druid readiness losses |

The earlier middle-fight escalation reached 8% weak-Druid first access but reduced weak-ready Druid completion from 96% to 77% and Priest from 89% to 58%. That rejection remains in force.

### Reproduction settings

Run `node scripts/holistic-balance.mjs 100` with `CHAPTERS=4` and the setting below. Leave healer, profile, and stage filters unset. Each probe should run in a fresh environment without another probe's overrides.

- `bat-84-ch4-late-burst-probe.jsonl`: `ENCOUNTER_TUNING={"chapel":{"extraMechanic":{"id":"last-hymn","name":"Last Hymn","first":57,"every":150,"warning":3,"target":"party","damage":150,"damageType":"Magic","iconCategory":"aoe","color":"#b8c98a"}}}`. Adds a warned late hit, testing duration and healing reserve together.
- `bat-84-ch4-chapel-fourth-probe.jsonl`: `ROUTE_ORDER=[0,1,3,2,4]`. Moves Leech/Procession ahead of Chapel.
- `bat-84-ch4-chapel-last-probe.jsonl`: `ROUTE_ORDER=[0,1,4,3,2]`. Moves Garden/Crypt to third and Chapel to last.
- `bat-84-ch4-heavy-strikes-probe.jsonl`: `ENCOUNTER_TUNING={"garden":{"strikeDamage":184,"strikeEvery":5.4,"strikeFirst":5.4},"cryptkeeper":{"strikeDamage":130,"strikeEvery":4,"strikeFirst":4}}`. Doubles each final branch's strike damage and interval, preserving nominal strike damage per second while allowing longer recovery windows.
- `bat-84-ch4-pressure-shift-probe.jsonl`: `ENCOUNTER_TUNING={"garden":{"strikeDamage":70,"mechanicDamage":{"shears":180}},"cryptkeeper":{"strikeDamage":50,"mechanicDamage":{"petals":110}}}`. Reduces continuous tank pressure and strengthens the existing branch-specific group hits. This is a pattern probe, not an exact total-damage equivalence.

## Validation and remaining scope

No candidate passed the targeted screen, so there is no new gameplay tuning to send through a full balance rerun or browser playthrough. Production combat, talent, equipment, loot, and encounter definitions remain at the pushed checkpoint; the successful Chapter 2 results and other scenarios are preserved. The existing full 72-scenario, 300-seed result remains `bat-84-current.jsonl`.

The automated suite passes 167/167 after the diagnostic tooling changes. The diagnostics and rejected probe outputs are retained for review and future work. A broader change to inherited progression or readiness definitions would need its own scope and cross-chapter validation; it is not silently substituted for the requested Chapter 4 encounter tuning.
