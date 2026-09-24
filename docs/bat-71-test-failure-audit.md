# BAT-71: Full-suite test failure audit

## Summary

- Full suite: **149 tests; 137 passed; 12 failed**.
- This matches BAT-71's stated 12-failure pre-existing baseline.
- BAT-69 and BAT-70 are Done. Their focused chapter-run and chapter-switch tests pass: **22/22**. The failures below are outside those test files, so the run showed no BAT-69/70 regression.
- No production code or test files were changed for this audit.

## Failure table

| Test file | Test | Expected → actual | Relevant production code | Classification | Root-cause group | Reason |
|---|---|---|---|---|---|---|
| `tests/ability-settings.test.mjs:51` | configured order and keys keep spell mechanics intact when consumed by combat | Tank HP 200 → 190 | `src/data.js:175`; `src/combat.js:331-340` | Outdated test expectation | A | Flash Heal now heals 90, per BAT-58; the test retains the earlier 100-point value. |
| `tests/ability-tooltip.test.mjs:68` | Druid tooltip tracks HoT ticks, target bonuses, and talent-added behavior | 25 per 2.5s, 6 ticks, 150 total → 30 per 2.5s, 6 ticks, 180 total | `src/data.js:184`; `src/combat.js` HoT profile/tick resolution; `src/ability-presentation.js` | Outdated test expectation | A | BAT-57 changed Rejuvenation to 30 per 3s; BAT-56 says Haste shortens the interval and allows additional full ticks. The test expects the old 25-point tick value. |
| `tests/campaign.test.mjs:122` | unchanged campaign encounters retain their legacy full-resource triage baseline | effective healing >400 → 360 on Briar, seed 1 (victory at 21.4s) | `src/data.js:175-179`; `src/combat.js:157-170, 331-340` | Outdated test expectation | B | This historical threshold predates the reduced 120-point defensive Penance in BAT-53 and the later baseline healing tuning. Victory, zero-death, and time checks pass before the stale threshold fails. |
| `tests/combat.test.mjs:75` | unattended party loses; a triage strategy can win a complete encounter | victory → defeat at 100.0s; Mana 57.83; party HP `[0, 213, 248, 248, 230]` | `src/data.js:175-180, 201-205`; `src/combat.js` cast, damage, and encounter resolution | Unclear / needs deeper investigation | B | The fixed strategy no longer wins with the current healer kit. It may be a stale scripted strategy after the BAT-53/57/58 rebalance, or it may expose an encounter/kit balance regression. The failure alone cannot distinguish those. |
| `tests/druid-talents.test.mjs:20` | Druid row 1 preserves Swiftmend HoTs and derives Rejuvenation healing and Nourish cast time by rank | Rejuvenation tick 27.5 → 33 | `src/data.js:184`; `src/druid-talents.js:27-34` | Outdated test expectation | A | The test multiplies the former 25-point baseline by the 10% talent. BAT-57 now sets the baseline tick to 30, so the same rank yields 33. |
| `tests/druid-talents.test.mjs:74` | Blooming Swiftmend uses calculated pre-overheal healing and composes with Preserved Growth | bloom raw heal 32 → 26 | `src/data.js:186`; `src/druid-talents.js:37-40`; `src/combat.js:305-309` | Outdated test expectation | A | BAT-57 sets Swiftmend to 130, and Blooming Swiftmend is 20% of that calculated heal. The test still expects 20% of the former 160-point value. |
| `tests/druid-talents.test.mjs:93` | Living Rejuvenation accelerates below half Health and jumps with remaining state instead of duplicating | target HP 125 → 130 after one tick | `src/data.js:184`; `src/druid-talents.js:27-34`; `src/combat.js` HoT tick resolution | Outdated test expectation | A | The HoT tick is now 30 under BAT-57; the test asserts the former 25-point tick. |
| `tests/loot.test.mjs:33` | drop weighting targets only the active healer and preserves companion bands | boundary roll selects tank → priest | `src/loot.js:62-74` | Real implementation bug/regression | C | At the exact 0.30 boundary, `0.3 + 4 × 0.175` sums slightly below 1 in binary floating point. Multiplying the roll by that total places it just below the healer boundary. Normalize the roll or compare against cumulative thresholds that preserve the stated bands. |
| `tests/priest-offense.test.mjs:37` | Holy Fire deals 3 plus five ticks totaling 7 and every hit triggers Atonement | boss HP 9990 → 9990.000000000002 | `src/data.js:180`; `src/combat.js:207-215, 217-230` | Outdated test expectation | D | The gameplay damage is 10 total; subtracting five fractional 1.4 ticks leaves floating-point residue. BAT-23 permits fractional internal tick values and BAT-56 says not to round intermediate calculations. The test should compare with a tolerance. |
| `tests/priest-offense.test.mjs:46` | Holy Fire rollover preserves all pending damage and redistributes the combined pool | boss HP 9992.8 → 9992.800000000001 | `src/data.js:180`; `src/combat.js:207-230` | Outdated test expectation | D | Same precision issue as the preceding Holy Fire test; the rollover preserves its damage pool, while strict equality exposes floating-point residue. |
| `tests/priest-talents.test.mjs:61` | Threefold Penance adds a third main bolt and smart-heals the current lowest-percent other ally | ally HP 79 → 106 | `src/data.js:2, 178`; `src/priest-talents.js:49-57`; `src/combat.js:202-215` | Outdated test expectation | A | Threefold's 60-point smart bolt still applies. The three offensive 15-point bolts now produce 45 Atonement healing because BAT-58 changed Atonement to 100%; the expected 79 reflects the former 40% rate. |
| `tests/stats.test.mjs:15` | Spell Power adds once to direct, channel, mixed and per-target HoT totals | Rejuvenation tick with 10 Spell Power: 27 → 32 | `src/data.js:184`; `src/stats.js:6-13` | Outdated test expectation | A | BAT-57 sets 5 baseline ticks at 30 each. BAT-19 adds Spell Power once to the total (150 + 10), distributed over those 5 ticks: 32 each. The assertion retains the old 25-point/6-tick basis. |

## Root-cause groups

### A — Test expectations lag the healer design changes

Affected tests: ability settings, Druid tooltip, Druid row 1, Blooming Swiftmend, Living Rejuvenation, Threefold Penance, and Spell Power totals.

The implementation values agree with the completed design issues: BAT-53 sets Penance healing to 60 per bolt; BAT-57 sets Rejuvenation to 30 per 3 seconds and Swiftmend to 130; BAT-58 sets Flash Heal to 90 and Atonement to 100%; BAT-19 applies Spell Power once to the whole healing contribution; BAT-56 allows Haste to add full HoT ticks. These assertions should be refreshed to current expected values. This is a focused test-only cleanup, not a production rebalance.

### B — Legacy triage simulator expectations

Affected tests: campaign legacy effective-healing threshold and the default-encounter triage strategy.

The campaign scenario still wins but no longer exceeds its historical `effective > 400` threshold. That threshold should be recalculated against current healing values. The default encounter strategy actually loses, so first check whether a reasonable strategy using the current spell kit can win. If it cannot, compare encounter pressure and class balance against the current BAT-54/BAT-66/BAT-68 intent before changing tuning. Keep this as a separate gameplay/simulator follow-up rather than lowering assertions blindly.

### C — Exact loot-weight boundary drift

Affected test: loot category weighting.

The documented 30% healer / 17.5% companion bands are not preserved at the exact 30% boundary because the summed floating-point weights are fractionally below 1. A small loot resolver fix is warranted, with boundary coverage for all category transitions.

### D — Strict equality on fractional damage

Affected tests: both Holy Fire damage and rollover tests.

Holy Fire's 7 DoT damage is distributed as five 1.4 ticks. Internal fractional values are expected by the Priest design, and the observed differences are around 1e-12. Use approximate equality for final HP while retaining exact checks for tick count and pooled damage.

## Recommended cleanup plan

1. **Update stale healer combat assertions** for BAT-53, BAT-57, BAT-58, and Spell Power/Haste behavior; include tolerant comparisons for final fractional damage values.
2. **Investigate the default encounter triage failure** and recalibrate the campaign simulator's legacy effective-healing floor using current healer values. Only change production balance if the current design target is not met.
3. **Fix loot category boundary handling** and preserve explicit tests at 0.30, 0.475, 0.65, and 0.825 transitions.

No individual follow-up issue was created during this diagnostic pass.
