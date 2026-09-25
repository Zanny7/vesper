# BAT-77 chapter balance benchmarks

These are readiness inputs for the next encounter and boss passes, measured from the current game data. They do not change loot, talents, or encounter values. [Machine-readable results](chapter-benchmarks.json) contain every Priest and Druid representative equipment map, inherited map, exact stat totals, talent preset, and sample mean. [Combat checks](chapter-benchmark-combat.jsonl) contain the seeded route and boss outcomes.

## Progression definition and sampling

The active party has **27 equipment slots**: healer 6, tank 6, rogue 5, mage 5, ranger 5 (`SLOTS` and `slotsForOwner`). Readiness is the number of those slots *equipped with current-chapter items*, divided by 27. An owned but unequipped item does not count. Older gear stays equipped in other slots and contributes its actual stats. Mean party item level uses all 27 slots, with empty slots contributing zero; it validates power but does not define readiness.

A clear is one valid route of normal encounters before the boss. The graph has 4/4/6/6 nodes per complete boss route, so the normal-only route lengths are **3/3/5/5**. Branches give 1/2/4/4 valid normal routes. Normal rolls remain 50% zero, 35% one, 15% two items: 0.65 expected items per encounter before eligible pools deplete. That gives 1.95/1.95/3.25/3.25 nominal drops per route. Current loot tables yield 16–17 distinct eligible items across a Chapter 1–2 route and 22–26 across a Chapter 3–4 route, depending on branch and active healer. Ownership filtering, category weights, active-healer compatibility, and one unique copy per item use `src/loot.js`; equipment uses the BAT-68 greedy, stat-weighted, legal-slot assignment. The authored item-level bands are 1–3, 4–6, 7–9, and 10–12.

Inheritance is now **recursive by skill profile**. In each earlier chapter, very good completes two normal-only clears before the required boss approach, defeats the boss, collects its normal and hidden bonus rewards, and advances with **zero** post-boss clears. Average reaches that boss after three clears, then makes **zero or one** extra normal-only clear before advancing. Weak reaches it after four or five clears, then makes **one or two** extra clears. The alternatives split evenly across deterministic seeds and alternate by prior chapter. Each chapter continues with the same resulting owned and equipped gear; it does not reconstruct an independent historical loadout. Prior boss rewards can enter later chapters, while the current chapter boss rewards never enter its own readiness state. Boss victory in prior chapters is assumed for loot sampling; combat success is evaluated separately in the diagnostics below.

Current-chapter gear is sampled after the listed normal-only readiness clears, before the next boss approach. The approach can grant further normal loot during combat simulation. Each healer/tier uses 300 fixed seeds; weak alternates four and five readiness clears. Percentages below are rounded from the two healer median equipped counts, so they are practical whole-item thresholds rather than guaranteed drops.

| Chapter | Valid normal routes | Nominal drops / route | Very good: ~2 clears | Average: ~3 clears | Weak: ~4–5 clears |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 × 3 fights | 1.95 | **4/27 = 14.8%** | **5/27 = 18.5%** | **8/27 = 29.6%** |
| 2 | 2 × 3 fights | 1.95 | **4/27 = 14.8%** | **6/27 = 22.2%** | **9/27 = 33.3%** |
| 3 | 4 × 5 fights | 3.25 | **7/27 = 25.9%** | **10/27 = 37.0%** | **14/27 = 51.9%** |
| 4 | 4 × 5 fights | 3.25 | **6/27 = 22.2%** | **9/27 = 33.3%** | **13/27 = 48.1%** |

Chapter 4's current-gear count is a little below Chapter 3's at the same clear count despite equal route lengths: more slots already hold Chapter 1–3 gear, and some new drops replace those items or stay in the bag. This is why raw drop count or owned-catalogue percentage is not a substitute for equipped chapter gear.

## Inherited gear and actual power

The inherited samples enter Chapter 1 empty. The table shows mean equipped older items and party item level **upon entering** each later chapter, Priest / Druid. Every profile starts from its own recursively completed earlier chapters. The JSON records each representative loadout's prior-chapter history, inherited item IDs, and final equipped item IDs.

| Chapter / profile | Inherited occupied slots P/D | Inherited party ilvl P/D |
| --- | ---: | ---: |
| 2 / very good | 7.36 / 7.54 | .60 / .60 |
| 2 / average | 10.17 / 9.96 | .82 / .78 |
| 2 / weak | 13.43 / 13.12 | 1.05 / 1.00 |
| 3 / very good | 13.34 / 13.05 | 1.85 / 1.80 |
| 3 / average | 17.65 / 17.61 | 2.45 / 2.44 |
| 3 / weak | 23.13 / 22.31 | 3.37 / 3.19 |
| 4 / very good | 20.97 / 20.66 | 4.75 / 4.66 |
| 4 / average | 24.85 / 24.41 | 5.96 / 5.88 |
| 4 / weak | 26.57 / 26.21 | 7.06 / 6.98 |

For example, a representative Chapter 3 Priest loadout still carries a Chapter 1 tank weapon and seal alongside Chapter 2 tank armor and Priest gear. The Chapter 4 Priest example still uses a Chapter 1 tome and tank weapon alongside Chapter 2–3 gear. Older gear contributes its actual stats in every row.

The following values are **sample means** after the listed farming clears, Priest / Druid. `HP`, `Armor`, and `Resist` sum all five characters; `Damage` sums companion attack damage, not DPS. `Mana`, `Regen`, and `SP` are the active healer's values. Exact stats for one near-median legal loadout in every row are recorded under `representative.stats` in the JSON.

| Ch / tier | Mean equipped current items P/D | Party ilvl P/D | HP P/D | Armor P/D | Resist P/D | Damage P/D | Healer Mana P/D | Regen P/D | SP P/D |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 / very good | 4.05 / 4.01 | .33 / .32 | 2235 / 2237 | 1.4 / 1.5 | 1.5 / 1.3 | 48.5 / 48.6 | 614 / 614 | 2.19 / 2.24 | 2.4 / 0 |
| 1 / average | 5.58 / 5.52 | .46 / .44 | 2251 / 2252 | 1.8 / 2.0 | 2.2 / 2.2 | 49.6 / 49.5 | 618 / 618 | 2.28 / 2.35 | 3.7 / 0 |
| 1 / weak | 8.53 / 8.34 | .69 / .64 | 2283 / 2283 | 3.2 / 3.1 | 3.4 / 3.8 | 51.1 / 51.2 | 629 / 628 | 2.40 / 2.47 | 5.9 / 0 |
| 2 / very good | 3.81 / 3.66 | 1.26 / 1.22 | 2341 / 2345 | 8.6 / 8.3 | 6.3 / 6.4 | 54.6 / 54.8 | 627 / 636 | 2.42 / 2.49 | 6.9 / 1.0 |
| 2 / average | 5.39 / 5.67 | 1.71 / 1.71 | 2407 / 2415 | 11.8 / 12.5 | 9.2 / 9.7 | 55.9 / 57.0 | 646 / 651 | 2.63 / 2.60 | 10.4 / 1.6 |
| 2 / weak | 8.92 / 8.42 | 2.46 / 2.31 | 2502 / 2494 | 17.3 / 17.2 | 14.3 / 13.8 | 59.7 / 59.5 | 656 / 666 | 2.78 / 2.77 | 13.3 / 2.5 |
| 3 / very good | 6.59 / 6.22 | 3.50 / 3.37 | 2549 / 2550 | 23.3 / 23.2 | 21.4 / 20.0 | 65.6 / 65.0 | 670 / 675 | 2.81 / 2.87 | 15.6 / 6.1 |
| 3 / average | 9.69 / 9.85 | 4.71 / 4.71 | 2683 / 2691 | 32.5 / 32.6 | 29.4 / 28.6 | 69.1 / 69.7 | 693 / 698 | 3.00 / 3.25 | 20.5 / 9.0 |
| 3 / weak | 14.01 / 13.72 | 6.07 / 5.91 | 2797 / 2797 | 42.2 / 42.4 | 38.9 / 35.8 | 73.6 / 73.3 | 719 / 714 | 3.24 / 3.48 | 25.3 / 11.5 |
| 4 / very good | 6.30 / 6.13 | 6.52 / 6.41 | 2828 / 2828 | 44.9 / 45.4 | 39.1 / 37.5 | 77.7 / 78.0 | 703 / 702 | 3.28 / 3.47 | 26.4 / 11.3 |
| 4 / average | 9.52 / 8.99 | 8.05 / 7.93 | 2953 / 2942 | 57.8 / 57.1 | 47.1 / 47.7 | 82.2 / 81.7 | 725 / 724 | 3.50 / 3.86 | 31.7 / 15.6 |
| 4 / weak | 13.10 / 12.16 | 9.18 / 8.98 | 3027 / 3007 | 69.6 / 69.2 | 51.6 / 50.0 | 86.3 / 86.2 | 752 / 724 | 3.75 / 4.10 | 34.9 / 20.1 |

The Chapter 1 Druid SP mean is zero because its current pre-boss normal tables and sampled routes do not award the Druid spell-power weapon; this is a real loot-table constraint, not an omitted stat. Item level itself adds no stats beyond each item's authored budget.

## Play profiles and talent presets

`SKILL_PROFILE` selects a deterministic policy in `scripts/boss-balance.mjs`; all profiles use the same seeded combat engine, gear sampling, spellbook, target rules, and basic mechanics. **Very good** uses the BAT-68 triage policy: chooses high-throughput or efficient casts when injuries justify them, generally avoids overheal, uses group spells for group damage, Swiftmend with an existing HoT, and only spends Mana on Holy Fire above 80% Mana. It decides every 0.12 seconds. **Average** decides every 0.20 seconds, starts healing at 80% of those injury thresholds, and holds offensive Mana until 90%; its earlier casts cause more overhealing and lower Mana efficiency. **Weak** decides every 0.30 seconds, starts at 75% of thresholds, and sometimes prioritizes Flash Heal or Nourish over the more efficient option for a sufficiently wounded ally. It still heals the lowest-health ally and responds to basic group mechanics. These are reproducible policy approximations, not a model of every human error.

Talent points are the BAT-68 **1/3/5/7** pre-boss progression, awarded after the current chapter's first encounter; the early encounter uses the preceding point count. Both Chapter 4 seventh-point variants are present:

| Chapter | Priest | Druid |
| --- | --- | --- |
| 1 | Conservation of Faith 1/2 | Preserved Growth |
| 2 | Conservation of Faith 2/2; Post-Haste 1/2 | Preserved Growth; Empowered Rejuvenation 2/2 |
| 3 | Previous Priest talents with Post-Haste 2/2; Lingering Prayer | Previous Druid talents; Passing Bloom; Blooming Swiftmend |
| 4 | Previous Priest talents; Threefold Penance; **Twin Penance or Sanctuary** | Previous Druid talents; Living Rejuvenation; **Twin Rejuvenation or Tranquility** |

The named talents, rank caps, row unlocks, and point totals match current code; no substitute was needed. The combat simulation carries exact surviving Health and Mana from each normal fight to the next and into the boss with `Combat.resources()` and `reset()`. It adds no automatic recovery; dead companions remain at zero Health. Equipment upgrades between fights use the existing resource-maximum adjustment rule.

As a profile check, 300 seeded boss approaches per row used the same recursive inherited-gear model. Each listed win percentage includes any route failure. These are **diagnostics, not new tuning targets**. All route-completion rates in this sample were 100%; the wins below therefore reflect the boss fights for these seeded states.

| Chapter | Very good at 2 clears, P/D | Average at 3 clears, P/D | Weak at 4–5 clears, P/D |
| --- | ---: | ---: | ---: |
| 1 | 70% / 71% | 77% / 52% | 64–74% / 49–61% |
| 2 | 99% / 90% | 98% / 87% | 100% / 91–93% |
| 3 | 93% / 74% | 98% / 93% | 99–100% / 93–97% |
| 4, Twin variant | 98% / 95% | 100% / 100% | 100% / 97–98% |
| 4, Sanctuary / Tranquility | 99% / 95% | 100% / 99% | 100% / 95–97% |

### Change from the flat two-clear inheritance model

The previous benchmark gave every profile two farming clears plus the required approach in **each** prior chapter. Under the requested progression, very-good's prior route count is exactly the same, so its inherited gear and combat results are unchanged. Average and weak spend more time in their earlier chapters before defeating each boss and sometimes clear afterward. Thus the specified recursive rules actually **increase** their inherited gear relative to the old flat baseline. These are measured changes, not encounter tuning.

| Chapter / profile | Change in inherited occupied slots P/D | Change in inherited party ilvl P/D |
| --- | ---: | ---: |
| 2 / very good | 0 / 0 | 0 / 0 |
| 2 / average | +2.63 / +2.66 | +.20 / +.20 |
| 2 / weak | +6.09 / +5.80 | +.45 / +.42 |
| 3 / very good | 0 / 0 | 0 / 0 |
| 3 / average | +4.08 / +4.30 | +.56 / +.61 |
| 3 / weak | +9.90 / +9.22 | +1.52 / +1.38 |
| 4 / very good | 0 / 0 | 0 / 0 |
| 4 / average | +4.27 / +3.92 | +1.34 / +1.30 |
| 4 / weak | +6.11 / +5.56 | +2.47 / +2.28 |

| Chapter / profile | Boss win rate before → after, P/D |
| --- | --- |
| 2 / very good | 99/90 → 99/90% |
| 2 / average | 97/80 → 98/87% |
| 2 / weak, 4–5 clears | 97–98/77–79 → 100/91–93% |
| 3 / very good | 93/74 → 93/74% |
| 3 / average | 96/88 → 98/93% |
| 3 / weak, 4–5 clears | 95–99/83–94 → 99–100/93–97% |
| 4 / very good, both variants | 98–99/95 → 98–99/95% |
| 4 / average, both variants | 100/93–96 → 100/99–100% |
| 4 / weak, both variants | 98–100/84–92 → 100/95–98% |

The raw JSONL also records boss-entry Mana, route completion, duration, and talent IDs. The recursive model exposes the large sensitivity of later chapters to earlier progression; no encounter or boss values were changed for this BAT.

## Reproduce

Run `node scripts/chapter-benchmarks.mjs 300` for the equipment and stat JSON. For the combat rows, set `INHERITANCE_MODEL=recursive` and run `node scripts/boss-balance.mjs 300` with `SKILL_PROFILE` / `CLEAR_POINTS` set to `veryGood` / `2`, `average` / `3`, or `weak` / `4,5` (use PowerShell environment-variable syntax on Windows). The simulator's legacy inheritance mode remains available for reproducing BAT-68 results. All outputs are deterministic for unchanged code and data. The automated test checks graph lengths, 27 slots, legal unique equipment, recursive progression, deterministic extra-clear splits, benchmark reproducibility, and talent point budgets.
