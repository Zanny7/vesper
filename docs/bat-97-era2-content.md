# BAT-97 — Era II content and provisional pressure

**Content is authored; final numerical acceptance remains blocked.** The
repository has no Chapter 5–8 items or reward pools. These encounters must be
retuned and accepted against actual Era II progression before BAT-97 is closed.
No temporary stat multipliers or invented gear were used.

## Playable content

| Chapter | Nodes / legal routes / stops | Pressure identity | Boss |
| --- | --- | --- | --- |
| 5, Emerald Reach | 10 / 6 / 6 | Readable paired hits, tank roots, moving wounds and canopy recovery | Heartwood Sovereign: focused roots → group blooms at 48s |
| 6, Drowned Sanctuaries | 12 / 8 / 7 | Split spears, undertow wounds and staggered tide bursts; optional Tideguard | Drowned Regent: focused → group at 40s → three-target ruin at 82s |
| 7, Glassbound Spire | 14 / 8 / 8 | Sequential glass wounds, tank maintenance during group recovery, optional Prism Warden | Glass Sovereign: sequential → group at 44s → split/tank at 90s |
| 8, Eclipsed Dominion | 15 / 8 / 9 | Advanced wound/burst overlaps; demanding final approach and optional Umbral Knight | Eclipsed Sovereign: four pressure states, ending with crown/dawn/light triage |

All **47 combat nodes** now have independent authored profiles, lessons and
telegraphed mechanics. Branches offer distinct focused, group or sustained
pressure. Elites have greater strike throughput, longer fights and more overlap
than their nearby normal option. Boss Health exceeds other fights in its chapter.
Enrage is explicitly 210s for this provisional content.

The final boss changes at **36s, 76s and 116s**. Opening tank/paired pressure
gives way to moving shadow wounds, then group eclipses followed by three stars,
then a heavy tank wound competing with split recovery and staggered party hits.
Earlier casts stop repeating when their window ends; wounds already applied
finish naturally. Phase names/hints are visible beside upcoming mechanics.
Only the current state's mechanics appear in the live countdown list. Preview
details explain first/repeat times and all phase changes. Three-second warnings
lock targets, preserving learnable preparation and triage.

Era II forks now commit to **one choice per stage per run**. Earlier alternatives
stay closed after that choice; replay permits another path. Historical clears
remain valid, and Era I route rules remain unchanged. No route requires all nodes.

Shrines restore **15%, 20%, 25%, 25% of maximum Health**, respectively, to living
allies, once per run. They do not resurrect, restore Mana, grant gear or award
talent points. Choosing shelter skips the normal/elite fight and its rewards.
Elite victories are wired to the existing guaranteed extra-item roll, selecting
unowned compatible chapter gear outside their normal pool. Empty pools yield
no fabricated reward; the UI explicitly says Era II gear is not yet available.

## Fixed reference and resource model

Only Shaman was used for numerical probes: legal eight-point Earthliving,
Ancestral Echo and Healing Tide builds. No healer spell, talent, cooldown,
healing, base resource or cost value changed. Comparing exports with Git HEAD
confirmed exact equality of all healer data, all existing gear, CONFIG and every
Era I chapter/encounter. Recovery remains **20% of maximum Mana after successful
non-final combat**, base Regen **3/sec**, and existing item Regen retains BAT-93's
**1.5× BAT-92 values**.

## Deterministic evidence

Run:

```text
node scripts/era2-content.mjs 4 docs/bat-97-probes.json tmp/bat97-full-traces.json
```

The saved report contains **8,460 isolated fights and 2,160 legal route attempts**,
four seeds, all four chapters, all legal paths and all three builds. Per-encounter
results include duration, casts, effective/overhealing, damage/bleed pressure,
Mana spent, actual combat Regen, capped recovery, net Mana movement, deaths,
near-death crossings and multi-target triage time. Route evidence includes
boss-entry Mana, completion and resource totals. Loadout IDs/stats are saved.
Full traces additionally retain Health carry, shrine snapshots and reached phases.

Three **real Era I** acquisition states are tested:

- `prior-entry`: seeded acquisition through Chapter 4 completion. This is a
  Chapter 5 first-visit probe; for Chapters 6–8 it is an old-gear stress probe.
- `prior-farmed`: the same state plus four Chapter 4 farming routes.
- `prior-catalogue`: all existing Era I items, equipped by the existing scoring
  heuristic. This is a diagnostic old-gear ceiling, not intended Era II gear.

Acquisition assumes the prior Era I victories; it does not demonstrate the
success of those fights. Current-chapter acquisition is absent. Isolated active
probes start at **half Mana**; passive probes and persistent routes start full.
Routes carry Health/Mana, apply shrine utility, and award only the fixed combat
recovery. Conservative play forecasts announced pressure and pending healing;
wasteful play additionally casts Wave whenever possible, including overhealing.
Deterministic completion counts are **not human-player probabilities**.

| Chapter | Conservative routes, prior-entry | Conservative routes, prior-farmed | Wasteful routes, prior-farmed | Mean normal duration, prior-farmed |
| --- | ---: | ---: | ---: | ---: |
| 5 | 72/72 | 72/72 | 60/72 | 66s |
| 6 | 93/96 | 96/96 | 63/96 | 82s |
| 7 | 32/96 | 89/96 | 22/96 | 96s |
| 8 | 0/96 | 6/96 | 0/96 | 110s |

Chapter 5's entrance clears in **12/12** first-visit build/seed combinations at
half Mana, with multiple casts and meaningful healing. Old-gear entrances for
the other chapters also clear in 12/12, but cannot establish their actual
previous-chapter farming access. Extra Chapter 4 farming materially improves
later route survival. Chapter 5/6 efficient routes have comparatively generous
Mana margins: future prepared-Era-II tuning must revisit this, not assume these
numbers are accepted difficulty targets.

With prior-farmed gear, successful isolated bosses last approximately
**119–124s, 143–149s, 165–172s and 201–208s**. The final boss can also enrage or
kill allies with this old gear. Its actual current-era duration target remains
unverified. Boss recovery requires thousands of effective healing throughout;
longer encounters contain repeated triage and changing pressure, not only HP.

**Zero safe passive clears** were found across idle, one Riptide, one Wave and
one Stream probes, including all normal/elite nodes. This establishes pressure
with the sampled existing gear; the intended-Era-II passive audit is still due.

Route tradeoffs are visible in old-gear stress results. For Chapter 7,
prior-farmed conservative normal/shrine routes clear 24/24 each versus elite
41/48. Mean boss-entry Mana is about **711 / 757 / 459** for normal/shrine/elite
paths. In Chapter 8 the corresponding counts are **0/24 / 5/24 / 1/48**.
Elite paths branch into two downstream options, so their sample count is doubled.
These comparisons include downstream path differences, not isolated causal
estimates of a shrine or elite. Rewards cannot yet justify elite risk numerically.

## Browser and regression checks

- **269 tests passed**, including bounded schedules, pause/reset, carried wounds,
  resource reconciliation, exclusive branches, shrine persistence, compatible
  elite rewards and no safe passive clears with actual old gear.
- All four maps checked at **1280×800** and **390×844**: no overlapping node
  bounds or page overflow; each three-way fork exposes all three choices.
- Production UI checks passed for readable utility/reward copy, selecting paths,
  shrine Health going from 60% to 85% with Mana staying **690/920**, locked sibling
  choices and manual Riptide target input.
- A temporary instrumented copy of the app exercised all four final-boss states
  using the reference policy and real Chapter 4 gear. Desktop/mobile phase and
  countdown layouts were visually reviewed. A detected phase/alert overlap was
  fixed by placing phase context in the encounter panel. No console errors.
- Browser fixtures restored the original saved state. QA scripts, raw traces and
  screenshots remain in ignored `tmp/`.
- `git diff --check` passed before the BAT-97 content checkpoint commit.

## Required follow-up before acceptance

Author actual Chapter 5–8 gear/reward progression, including useful optional
elite rewards. Then validate real previous-chapter, partial-current and prepared
states across these routes/builds; retune encounter values only. Establish early
farming footholds, boss thresholds below full-catalogue completion, prepared-gear
active-healing pressure and intended-era durations. Repeat the passive audit and
full manual playtesting of pacing, learnability, triage and resource planning.
The policy-driven browser pass does not certify human difficulty or engagement.

BAT-97 remains open. Content/mechanics are reviewable, but prepared-gear balance,
current-era farming thresholds and elite reward value are not claimed complete.
