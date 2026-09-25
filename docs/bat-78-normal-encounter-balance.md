# BAT-78: Normal encounter balance, Chapters 1–4

This pass tunes normal enemies only. Chapter bosses, talents, gear, loot, progression rules, and UI values are unchanged. Enemy armor and resistance are not authored in the normal encounter data; outgoing damage uses the existing Physical, Magic, and Bleed typing and the player's real mitigation rules.

## Tuning and route design

The difficulty comes from fight duration, sustained primary strikes, adds, and each route's mechanics. Chapter 1 Encounter 1 stays at the requested 1,000-HP soft anchor. Later route encounters add targets or overlapping damage, and Chapter 3–4 enemies keep pressure high after the player reaches the third normal fight. Branches use different pressure patterns but have similar total route difficulty.

| Chapter / encounter | HP | Primary attack | Other outgoing damage and mechanics | Relative route pressure |
| --- | ---: | --- | --- | --- |
| 1 — Sepulchral Sentinel | 1,000 | 50 Physical every 2.4s | — | Opening anchor; steady tank pressure and a manageable first fight. |
| 1 — Cinder Keeper | 1,000 | 50 Physical every 2.4s | One add deals 30 Physical every 4.8s to a random ally. | Adds a second target and random wounds after the steady opener. |
| 1 — Bone Watcher | 1,500 | 68 Physical every 2.4s | Two adds deal 36 Physical every 4.5s to random allies. | Highest Chapter 1 HP and two simultaneous sources of party pressure; the expected first-run wall. |
| 2 — Briarbound Ancient | 1,050 | 58 Physical every 2.5s | Sporefall deals 58 Magic to the party every 12s. | Route opener: moderate strike rate with a slower party-wide recovery check. |
| 2 — Mourning Moth | 1,100 | 42 Physical every 1.7s | Grave Dust deals 52 Magic to the party every 10s. | Branch adds faster strikes and more frequent party damage. |
| 2 — Gravetusk | 1,150 | 100 Physical every 3.2s | Thorn Slinger deals 36 Physical every 4.5s to a random ally. | Alternate branch tests focused tank healing and stray wounds instead of AoE. |
| 2 — Root Choir | 1,150 | 60 Physical every 2.3s | Root Lament deals 72 Magic to the party every 15s; Sapling Guard deals 20 Physical every 4s to the tank. | Combines the moth branch's party damage with added tank pressure. |
| 2 — Mirelight Widow | 1,150 | 50 Physical every 1.8s | Mire Mist deals 52 Magic to the party every 11s; Bog Wisp deals 27 Magic every 5.5s to a random ally. | Combines the boar branch's random target pressure with recurring AoE. |
| 3 — Cinder Gatekeeper | 1,250 | 62 Physical every 2.4s | Forked Cleave hits two different allies for 94 Physical every 12s. | Opening hit check before the route splits into paired-target or multi-target pressure. |
| 3 — Ashblade Captain | 1,400 | 58 Physical every 2.1s | Crosscut hits two allies for 82 Physical every 10s; Ashblade Duelist deals 28 Physical every 4.5s to a random ally. | Adds a duelist and more frequent paired wounds. |
| 3 — The Cinderwing | 1,400 | 53 Physical every 2.2s | Searing Feathers hits three allies for 100 Physical every 14s. | Alternate branch trades the add for heavier three-target volleys. |
| 3 — Furnace Colossus | 1,450 | 80 Physical every 3s | Twin Brands hit two allies for 86 Physical every 14s; Furnace Breath deals 48 Magic to the party every 22s. | Central route encounter overlaps two-target hits with party damage. |
| 3 — Ember Harrier | 1,350 | 48 Physical every 1.5s | Divided Pounce hits two allies for 75 Physical every 9s. | Fast cadence shortens healing windows after the furnace. |
| 3 — Ashen Tribunal | 1,400 | 62 Physical every 2.2s | Threefold Judgment hits three allies for 110 Physical every 16s; Cinder Witness deals 26 Magic every 6s to a random ally. | Alternate branch layers the route's heaviest multi-target hit with an add. |
| 3 — Ironwake Bulwark | 1,550 | 92 Physical every 3.1s | Shattered Iron hits two allies for 86 Physical every 12s; Shield Retainer deals 22 Physical every 4.5s to the tank. | Strongest tank strike, plus paired hits and an add before the boss approach. |
| 3 — Bellbound Shade | 1,500 | 54 Physical every 2.1s | Broken Echoes hits three allies for 78 Physical every 11s; Distant Toll deals 44 Magic to the party every 24s. | Alternate ending route combines frequent three-target wounds with occasional AoE. |
| 4 — Thorn Huntsman | 1,700 | 66 Physical every 2.2s | Barbed Arrow applies 25 Bleed damage for 5 ticks at 2s intervals to one random ally. | Fresh-resource opener introduces a long wound while raw HP and strike power step above Chapter 3's opening fights. |
| 4 — Sanguine Hound | 1,800 | 58 Physical every 2s | Rending Maul applies 28 Bleed damage for 4 ticks at 2s intervals to the tank; Hunting Whelp deals 29 Physical every 4.5s to a random ally. | Adds a tank bleed and an independent target, increasing healing overlap. |
| 4 — Weeping Rose | 1,800 | 56 Physical every 2.2s | Rain of Thorns applies 14 Bleed damage for 6 ticks at 2s intervals to three allies. | Alternate branch spreads lighter sustained wounds across the party. |
| 4 — Crimson Cantor | 2,300 | 71 Physical every 2.3s | Crimson Refrain applies 22 Bleed damage for 5 ticks at 2s intervals to two allies; Grieving Hymn deals 60 Magic to the party every 21s. | Mid-route wall: multi-target bleeds can still be ticking when the party pulse lands. |
| 4 — Vein Weaver | 2,150 | 56 Physical every 1.8s | Crimson Threads applies 18 Bleed damage for 6 ticks at 1s intervals to one random ally; Forked Fangs hits two allies for 92 Physical every 16s. | Rapid ticking bleed and paired hits compress recovery time. |
| 4 — Sorrow Bearer | 2,150 | 64 Physical every 2.3s | Endless Vigil applies 23 Bleed damage for 5 ticks at 3s intervals to two allies; Mourning Acolyte deals 34 Magic every 5s to a random ally. | Alternate branch uses slower long bleeds and persistent ranged damage. |
| 4 — Briar Executioner | 2,500 | 92 Physical every 2.7s | Severing Thorns applies 23 Bleed damage for 5 ticks at 2s intervals to two allies; Twin Shears hits two allies for 98 Physical every 17s. | Highest raw HP and primary damage; direct hits compete with active bleeds. |
| 4 — Bloodroot Keeper | 2,500 | 65 Physical every 2s | Bloodroot Bind applies 16 Bleed damage for 6 ticks at 2s intervals to three allies; Falling Petals deals 58 Magic to the party every 21s; Briar Guard deals 25 Physical every 5s to the tank. | Alternate ending combines the widest bleed spread, recurring AoE, and tank pressure. |

## Representative route results

The simulator runs all valid routes with seeded loot, benchmark-derived inherited gear, current-chapter gear from the listed number of completed routes, real resource carry between normal fights, and the BAT-77 Priest/Druid skill profiles. One route attempt starts at fresh chapter resources. Results below report the share of attempts that clear all normal encounters before reaching the Chapter Boss. Each result uses 300 seeds; Chapter 4 lists ranges across the two seventh-point variants. The separate JSONL includes per-route and per-encounter reach/failure rates, durations, mana, party health, effective healing, and deaths for every scenario.

The first-attempt rows use **zero completed routes in the current chapter** but include recursive inherited gear from prior chapters. Most first attempts that fail do so at Encounter 3 in Chapters 1–3; Chapter 4's five-fight routes more often fail at Encounters 4–5. Chapter 3 has no boss access in these samples; Chapter 1 and 4 access stays below 24%. The recursively geared Weak Priest entering Chapter 2 is the exception at 33% route completion, with the other two thirds failing at a normal encounter.

| Chapter | Very good first attempt P/D | Average first attempt P/D | Weak first attempt P/D |
| --- | ---: | ---: | ---: |
| 1 | 8% / 1% | 2% / 0% | 0% / 0% |
| 2 | 18% / 4% | 21% / 0% | 33% / 0% |
| 3 | 0% / 0% | 0% / 0% | 0% / 0% |
| 4 | 11–20% / 0% | 13–23% / 0–2% | 5–11% / 0% |

At BAT-77 readiness points, repeated gear progression improves route completion. Weak uses the 4–5-clear range.

| Chapter | Very good after 2 clears P/D | Average after 3 clears P/D | Weak after 4–5 clears P/D |
| --- | ---: | ---: | ---: |
| 1 | 81% / 68% | 78% / 63% | 78–88% / 64–78% |
| 2 | 73% / 33% | 85% / 26% | 93–96% / 46–54% |
| 3 | 27% / 11% | 47% / 21% | 63–77% / 11–25% |
| 4 | 50–65% / 8–19% | 71–77% / 7–30% | 81–89% / 0–3% |

Within each four-route Chapter 3 readiness scenario, Priest route completion spans 42–52% at average readiness; Druid spans 12–25%. Chapter 2's two routes are within 15 percentage points at average readiness. No measured Chapter 3 branch is trivial. Chapter 4 includes two different talent variants per healer; Twin Rejuvenation supports normal-route completion better than Tranquility in these simulations.

Chapter 4 evaluates both seventh-point variants for each healer. A failed normal route retains loot earned from earlier victorious encounters in the game, so repeated attempts can make progress before a full route clear; this sampling harness measures each readiness state independently and does not carry partial-attempt equipment between rows. Druid route completion is substantially lower than Priest in some later-chapter states; enemy values were tuned without changing either healer's talents or gear, as BAT-78 requires.

## Reproduction

Run `node scripts/normal-balance.mjs 300`. The script defaults to both healers, all three skill profiles, all four chapters, 0/2/3/4/5 current-chapter clear states, and both Chapter 4 seventh-point variants. Seeds are fixed. To narrow a run, set `CHAPTERS`, `HEALERS`, `PROFILES`, or `CLEAR_COUNTS` before invoking the script.
