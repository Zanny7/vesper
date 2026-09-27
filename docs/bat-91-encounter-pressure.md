# BAT-91 — Chapters 1–4 encounter pressure

## Result

Final recovery: **50% of the victory loadout’s maximum Mana**, capped at that maximum, once after a successful non-final encounter. Health and fallen allies carry forward unchanged. Boss victories receive no recovery. The configured fraction lives in `src/data.js`; ChapterRuns awards it before subsequent loot/equipment reconciliation.

The experiment started at 20%. Stronger warned bursts, split/AoE overlap and sustained bleeds required more recovery to retain viable full routes. No Shaman spell, talent, item or combat-engine rule was retuned. Only the existing four chapters were changed.

## Method and limits

- Shaman only, unchanged BAT-89 priority policy and real post-BAT-92 loot/equipment. All legal route combinations and 2/2/3/4 relevant builds in Chapters 1/2/3/4 respectively.
- Seeds: `910000 + chapter × 10000 + index`. Final matrix: 16 seeds per route/build/stage/skill, 204 groups (3,264 route attempts). The exploratory original baseline used the first 4 seeds. The recovery and late-response comparisons use identical 8-seed gear/build states.
- `first`: no farming of the current chapter. `ready`: three current-chapter normal-route reward passes. Earlier-chapter gear comes from the shipped readiness model (normal farming plus boss rewards), not invented stat multipliers. Farming passes model acquired rewards; they are not proof that each acquisition run was cleared.
- Health and Mana persist through each simulated route; actual loot is rolled and equipment reconciled between fights. Failed routes stop. Completion permits surviving companion deaths under the game’s normal victory rules; deaths are reported separately.
- HPS is emitted damage after mitigation, including lethal overkill. “Healing required” is total emitted incoming damage, not effective healing delivered. Peak is the maximum rolling 5-second damage/5. Near-deaths count entries into living Health ≤30%. Member healing, actual Mana debits, effective healing and damage sources are in the JSON reports.
- Successful-fight duration is reported separately from failure duration. Boss-entry Mana excludes attempts stopped before the boss. Net loss = entry Mana − post-recovery Mana; combat regeneration means it is not simply spell spending minus recovery.
- Policy labels (`veryGood`, `average`, `weak`) describe automated decisions and reaction cadence, not measured human skill. Their results are not always monotonic. Cast occupancy excludes instants and player attention, so it is not an engagement score.

## Why 50% recovery

Final encounter tuning, identical eight-seed prepared routes. Each cell is full-route completion / mean boss-entry Mana.

| Recovery | Chapter 1 | Chapter 2 | Chapter 3 | Chapter 4 |
|---|---:|---:|---:|---:|
| 20% | 6% / 212 | 0% / 179 | 0% / 176 | 29% / 249 |
| 35% | 69% / 438 | 28% / 286 | 15% / 315 | 66% / 590 |
| 50% | 88% / 584 | 75% / 460 | 77% / 517 | 84% / 796 |

20% was first isolated against the original encounters in `bat-91-recovery-only.json`. Final-tuning comparisons above show that 20–35% cannot support the selected active-healing demand, especially Chapters 2–3. At 50%, later normal fights still create net loss and bosses consume substantial carried Mana. Prepared Chapter 4 often caps recovery in early fights; attrition there is concentrated in its later overlaps and long boss.

## Before/after pressure

Unfarmed opening encounters; original 4-seed vs final 16-seed samples. These openings complete consistently, avoiding misleading averages of early defeats.

| Opening encounter | Duration before → after | HPS before → after | Peak 5s HPS before → after | Mana debits before → after |
|---|---:|---:|---:|---:|
| sentinel | 42.2 → 44.6s | 20.1 → 25.7 | 30 → 33 | 238 → 321 |
| briar | 41.8 → 46.6s | 42.8 → 53.1 | 92 → 171 | 529 → 607 |
| gatekeeper | 37.9 → 47.8s | 37.8 → 54.3 | 72 → 106 | 366 → 628 |
| huntsman | 51.6 → 51.0s | 32.8 → 44.3 | 49 → 70 | 399 → 550 |

## Duration and route outcomes

Final 16-seed matrix, proactive reference policy. Normal ranges are encounter means on successful fights; the boss duration uses successful boss fights. Different build/loot states remain visible in the full matrix.

| Chapter | First-visit normals | Prepared normals | Prepared boss | Prepared route completion | Mean boss-entry Mana | Route deaths |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 44.6–63.5s | 41.5–59.4s | 73.3s | 78% | 545 | 0.22 |
| 2 | 46.6–57.9s | 40.8–49.8s | 65.7s | 83% | 484 | 0.63 |
| 3 | 47.8–58.5s | 39.9–51.2s | 67.1s | 79% | 555 | 0.65 |
| 4 | 51.0–70.4s | 42.0–58.1s | 76.6s | 92% | 830 | 0.16 |

Chapter 1 first-visit normal means are 44.6 / 51.6 / 63.5 seconds. Bosses are longer than every normal encounter mean at prepared progression. Initial unfarmed boss completion is intentionally much lower (Chapter 1/2/3/4: 6% / 3% / <1% / 23%); normal-route farming and loot remain part of boss preparation.

## Later encounter and boss pressure

Prepared, 16 seeds. Tank/non-tank and bleed columns are shares of effective healing / incoming damage respectively. Deaths/near-deaths are means per attempted fight.

| Encounter | Winning duration | Damage demand | HPS | Peak 5s | Tank / non-tank | Bleed | Deaths / near-deaths |
|---|---:|---:|---:|---:|---:|---:|---:|
| watcher | 59.4s | 2309 | 38.9 | 57 | 68% / 32% | 0% | 0.00 / 0.00 |
| warden | 73.3s | 3273 | 45.1 | 135 | 74% / 26% | 0% | 0.22 / 0.50 |
| choir | 49.1s | 3087 | 63.1 | 246 | 48% / 52% | 0% | 0.00 / 0.00 |
| mire | 49.8s | 3211 | 64.4 | 245 | 41% / 59% | 0% | 0.00 / 0.16 |
| matriarch | 65.7s | 4006 | 61.6 | 241 | 44% / 56% | 0% | 0.63 / 1.44 |
| bridge | 50.4s | 3251 | 64.1 | 227 | 59% / 41% | 0% | 0.00 / 0.05 |
| bells | 51.2s | 3548 | 69.2 | 254 | 47% / 53% | 0% | 0.00 / 0.14 |
| regent | 67.1s | 4926 | 72.5 | 282 | 51% / 49% | 0% | 0.65 / 1.54 |
| garden | 57.6s | 3460 | 60.0 | 158 | 56% / 44% | 31% | 0.05 / 0.18 |
| cryptkeeper | 58.1s | 4119 | 70.7 | 185 | 50% / 50% | 39% | 0.02 / 0.15 |
| duchess | 76.6s | 6728 | 89.4 | 221 | 41% / 59% | 29% | 0.12 / 1.04 |

| Encounter | Mana debits | Actual recovery | Net Mana loss |
|---|---:|---:|---:|
| watcher | 583 | 327 | 105 |
| warden | 717 | 0 | 518 |
| choir | 704 | 363 | 156 |
| mire | 689 | 363 | 137 |
| matriarch | 708 | 0 | 456 |
| bridge | 733 | 402 | 71 |
| bells | 781 | 404 | 113 |
| regent | 866 | 0 | 512 |
| garden | 774 | 405 | 27 |
| cryptkeeper | 821 | 421 | 56 |
| duchess | 1199 | 0 | 741 |

Pre-boss fights add overlap rather than a breather: choir/mire follow AoE with split wounds; bridge/bells follow split wounds with AoE; garden combines one strong bleed and shears; cryptkeeper combines three weak bleeds, petals and a tank add. Garden’s mean HPS is below leech’s, but its larger peak, strong wound, total demand and Mana spending make the final step more demanding.

### Healing distribution across complete attempted routes

Shares from summed effective healing, including failed attempts. The tank remains the largest individual responsibility; four non-tank frames together demand a substantial share.

| Chapter | Tank | Nyx | Sera | Theron | Shaman |
|---|---:|---:|---:|---:|---:|
| 1 | 77% | 5% | 6% | 6% | 6% |
| 2 | 47% | 13% | 13% | 14% | 13% |
| 3 | 56% | 12% | 10% | 11% | 11% |
| 4 | 49% | 13% | 13% | 13% | 12% |

Prepared route completion by build (16 seeds, mean across paths):

| Chapter | Builds and completion |
|---|---|
| 1 | 1-reserves: 81%; 1-deep: 75% |
| 2 | 3-waves: 75%; 3-tide: 91% |
| 3 | 5-flow: 73%; 5-echo: 86%; 5-double: 77% |
| 4 | 7-earth: 94%; 7-tide: 88%; 7-ancestral-wave: 94%; 7-earth-echo: 94% |

### Waiting until 30%

Paired eight-seed prepared routes; late policy waits for any living frame ≤30%, then uses the strong adaptive priority policy. This is more capable than an inattentive novice and can still win some fights.

| Chapter | Proactive completion / route deaths | Late completion / route deaths |
|---|---:|---:|
| 1 | 88% / 0.13 | 31% / 0.69 |
| 2 | 75% / 1.00 | 56% / 1.28 |
| 3 | 77% / 0.67 | 72% / 0.84 |
| 4 | 84% / 0.30 | 30% / 1.93 |

Waiting is unsafe around the warned overlap, not universally fatal on every mechanic. Chapter 3’s automated late-policy completion drops only modestly, while deaths rise. The regression test demonstrates that a real 145-damage party hit kills a 400-Health ally at 30%, but is survivable at 60%. In browser, delaying Broken Belfry recovery through its split + toll killed two companions.

## Bleed framework

128 real Chapter 4 gear/build states: Riptide periodic sustain 9.8–13.9 HPS; Riptide + Surge 30.8–42.0 HPS. These omit Riptide’s initial heal, Crit, Unleash, Totems and direct spells.

| Tier | Damage cadence | Per-target HPS / total | Application and safety |
|---|---|---|---|
| Weak | 28–30 every 2s for 12s | 14–15 / 168–180 | Roses/crypt: three together. Procession: one non-tank every 5s, up to three overlapping. Around Riptide sustain, with follow-up under tank/AoE overlap. |
| Medium | 68 every 2s for 10–12s | 34 / 340–408 | Huntsman: one; chapel/duchess: two together. Leech: one non-tank every 10s, brief two-wound overlap. Around combined Riptide + Surge, above one HoT. |
| Strong | 86 every 2s for 8s | 43 / 344 | One target at a time, tank in hounds and random living ally in garden. Above sampled combined maintenance, plus strikes/shears; direct healing supplies the margin. |

No four/five simultaneous medium wounds or multiple simultaneous strong wounds were introduced. Strong wounds alone need not kill a full frame; their priority comes from overlap and the limited response window.

## Browser/manual QA

Used a separate `bat91.localhost` origin with actual route loadouts and carried resources, preserving the user’s normal save. All 28 authored encounters were visited. Representative manual spell/target decisions and idle-danger checks were supplemented with controlled-clock BAT-89 reference-assisted traversal; this is not a claim of 28 uninterrupted human-play clears.

- Warden: manual Riptide/Surge/Totem upkeep, then Unleash + Wave after the volley/crush overlap. All five survived a 78-second clear, 17/630 Mana remaining; no boss refund.
- Gravetusk: after 12 seconds without healing, tank 33% and other frames wounded by stampede. Group recovery competed with tank healing. Victory Mana 202; next fight began at 555/705 with Health unchanged, confirming the real recovery pipeline.
- Chapter 2 later fights visibly demanded several frames; the seed-0 boss attempt failed under Mana pressure. A second actual loot state with Tidal Waves cleared the boss in 73 seconds, all five alive, 16/760 Mana.
- Broken Belfry: delaying through split/toll killed two companions. Earlier triage and manual Chain recovery produced a 51-second clear with all five alive, 224/820 Mana.
- Hounds: Riptide + Surge still left the tank at 36% after subsequent bleed/strike pressure. Wave supplied direct recovery; all five survived a 39-second clear.
- Roses: three distinct simultaneous weak wounds were visible at 12 seconds. Leech: Nyx and Sera carried sequential wounds together at 19 seconds, while tank strikes continued. Its assisted clear took 47 seconds with 500/840 Mana.
- Cryptkeeper: petals hit while three weak wounds ticked and tank/add pressure continued. Manual Chain followed by tank recovery led to a 52-second clear. Duchess then put a bleeding Ranger at 36%; targeted empowered Chain raised him to 71% before the next tick. All five survived the 71-second boss, 23/840 Mana remaining.

Automated UI traversal observations are in `bat-91-browser-checks.json`; the detailed manual observations above cover the remaining representative fights. One failed browser boss attempt is retained rather than hidden.

![Chapter 4 assisted boss clear, all five alive and 23/840 Mana](bat-91-browser.png)

## Validation and reproduction

**249/249 automated tests passed** (`npm.cmd test`); `git diff --check` passed. Recovery tests cover victory maximum, cap, exactly-once award, persistent Health/fallen allies, no final-boss award, and no award for invalid/running/paused/abandoned/mismatched finishes. The legacy Priest regression uses the frozen old fixture; no other-healer balance simulation or manual pass was run.

PowerShell, from the repository root:

```powershell
node scripts/encounter-pressure.mjs 4 before docs/bat-91-before.json
node scripts/encounter-pressure.mjs 16 after docs/bat-91-after.json
$env:STAGES='ready'; $env:SKILLS='veryGood'
# Set RECOVERY to 0.2, 0.35, then 0.5 for the paired 8-seed experiments.
$env:RECOVERY='0.5'
node scripts/encounter-pressure.mjs 8 after docs/bat-91-final-recovery50.json
$env:SKILLS='late'
node scripts/encounter-pressure.mjs 8 after docs/bat-91-late-response.json
node scripts/encounter-dot-probes.mjs docs/bat-91-dots.json
```

Unset STAGES/SKILLS/RECOVERY when returning to the default matrix. `CHAPTERS` and `BUILDS` can restrict exploratory runs. The frozen encounter fixture preserves the original baseline. Machine-readable reports contain every requested encounter resource/pressure/member metric and each route/build outcome.

This is a tested checkpoint on `dev`; commit and push for backup, then consider a `dev` → `main` milestone PR after review. No commit or push was performed as part of this BAT.
