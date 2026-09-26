# BAT-87 Shaman simulation and numerical tuning

The numerical pass is implemented on **dev**. Acceptance is reviewed against the final comparisons below. Completing a simulation does not itself prove that every balance criterion passes. Earthliving retains its 6s/3-tick Wave contribution, 2s/1-tick contribution per Chain target, 18s cap and existing tick timing. Its newly added ticks heal at 50% strength; paid Surge remains full strength.

**BAT-86 design exception:** full-strength Earthliving continued to lead tank, group and route comparisons after other capstone buffs and policy corrections. Increasing Wave's cost penalized all capstones. The user was asked about tuning only Earthliving-created tick strength and replied “Can you continue?”; work continued with that proposed exception. This changes the explicit full-strength rule, not the duration or bank mechanics. The original comparison restores full strength.

## Every production numerical change

Before means the committed BAT-86 values, restored in immutable loadouts. The earlier uncommitted checkpoint used Wave 32 Mana, Echoing Surge 50%, Tide 18/8s/60 Mana and Ancestral 60%; those are superseded below.

| Configured value | Before | Final | Reason |
| --- | ---: | ---: | --- |
| Recurring Surge healing/tick | 44 | 36 | Correct the no-talent Chapter 1 passive-healing outlier |
| Healing Wave direct healing | 110 | 125 | Retain active tank recovery after reducing Surge |
| Healing Wave Mana | 28 | 32 | Retain competitive paid filler while limiting its baseline efficiency |
| Riptide Mana | 32 | 36 | Reduce cheap instant/periodic layering |
| Echoing Surge effective ratio | 50% | 30% | Limit the strong Earthliving/secondary-healing combination |
| Earthliving-created tick strength | 100% | 50% | Tune free banks independently of paid Surge and alternative capstones |
| High Tide jump loss, rank 1 / 2 | 17.5% / 15% | 12.5% / 5% | Give the smart group-heal specialization meaningful marginal healing |
| Healing Tide healing/ally/tick | 14 | 36 | Make party recovery meaningful |
| Healing Tide duration | 8s | 12s | Recover across successive group hits |
| Healing Tide Mana | 80 | 50 | Make useful cooldown ticks competitive with paid fillers |
| Ancestral Echo effective ratio | 40% | 100% | Reward useful split-target Wave casts; primary overheal still yields zero |

Tuning is centralized in src/data.js and drives loadouts and tooltips. Surge's paid base budget changes 132 → 108 (raw HPM 5.5 → 4.5). Wave changes 3.93 → 3.91 direct HPM and 44 → 50 uninterrupted base HPS. Maintaining paid Surge takes 25% of cast time: 37.5 + 18 = 55.5 base HPS before other spells/talents, versus 55 originally. Earthliving's continuous unempowered ceiling is 50 + 9 = 59 HPS, with the finite bank and overheal limiting realization. Its grant is not three immediate heals per Wave. Tide's theoretical five-ally budget changes 560 → 2160; only 12s of each 60s cooldown are active. Useful source healing, overheal and survival—not that raw ceiling—determine measured value.

The baseline change is justified by the no-talent/early-chapter outlier, which talents cannot correct. The smaller effective Surge echo and reduced Earthliving ticks address sustained layering. Buffing cooldown/secondary-target talents before broadly strengthening baseline healing preserves healer identities. Exploratory cheaper Surge/stronger Wave candidates recreated the early advantage; large baseline reductions instead weakened alternative late builds. Wave 36 Mana with full-strength Earthliving still favored that capstone; 32/34 Mana and 40/50/65% Earthliving candidates exposed the tradeoff. Final evidence contains no exploratory overrides.

## Method and reproduction

Run from the repository root (Node 20.11+):

```powershell
node scripts/shaman-evidence.mjs
node scripts/shaman-report.mjs
npm.cmd test
```

The evidence command clears simulator filters/overrides and runs **30 matrix seeds and 300 close-comparison seeds**. Optional positional counts permit smaller development runs. Outputs are UTF-8 JSONL, replaced after successful nonempty generation. A SHA-256 [manifest](bat-87-evidence-manifest.json) records the runtime, source snapshot and evidence files; generation rejects changes to simulation sources during the run, and the report rejects stale or edited evidence. The report also fails on missing pairs. Original loadouts restore all changed values, including Tide duration, both echoes and Earthliving tick strength, without mutating production.

Real Combat runs at the live fixed 1/60s step with seeded randomness. Controlled parties have identical pre-talent stats sampled from actual Priest equipment at three chapter clears, including recursively inherited earlier gear. Only healer identity/spellbook changes. These fixtures never grant permanent gear. Real routes use each healer's actual BAT-88 loot, earlier normal/hidden boss rewards, shared greedy equipment scoring, live approach drops and live maximum-stat resource adjustments. Earlier gear assumes earlier victories; this is not a campaign win-rate estimate. Identical class seed labels need not produce identical loot draw positions.

Seven profiles cover focused tank, two-target random split, three-target random split, frequent party AoE, attrition, burst and long efficiency. Split/three hit distinct random allies every 6s. Most measure 90s; long measures 140s before 150s enrage. Controlled enemy HP is unlimited, so completion is zero by construction. Survival requires all five alive at the horizon. Defeat ends measurement early, which can bias observed HPS; survival, Mana and depletion accompany it.

All 0/1/3/5/7/8-point builds obey rank caps and 2/4/6 gates. Seven-point capstones are legal. Point eight is earned after the Chapter 4 boss, so eight-point results are post-boss evidence. Ablations remove a rank only when the remainder is legal. Isolated mechanic probes use explicitly diagnostic allocations, not progression claims.

Priest/Druid retain the existing BAT-82 healing policy and cooldowns. Shaman uses the same 0.12/0.2/0.3s veryGood/average/weak cadence. Policy corrections use Tide on useful two-target/tank pressure, avoid paying again for healing queued by Tide, choose useful Ancestral primaries before Riptide removes the wound, avoid clipping Flowing cash-outs, and avoid buying Surge when its raw efficiency is worse than Wave. These are reproducible heuristics, not optimal human play. No offensive Atonement policy or artificial instant global cooldown is modeled.

First/one/ready stages mean zero/one/readiness farming clears. Ready uses 2 veryGood, 3 average and 4–5 weak clears, as in the existing model. Compare classes within each skill/stage; cross-skill comparisons also change gear. A fresh approach starts with the previous point count, then earns the chapter point. Exact Health/Mana carry; only live maximum-stat gear adjustments apply. Buffs/cooldowns reset as in Combat. Boss entry receives no refill; recorded entry Mana includes the live gear adjustment.

HPS = total effective healing / observed time; HPM = effective healing / actual Mana debits, including instant casts/channels. Regeneration is not subtracted from spending. Depletion means first below 30 Mana, not literal zero. JSONL retains overheal, raw/effective source healing, Mana, deaths, casts/cooldown uses, empowered/Waves casts, bank/HoT coverage, Totem uptime/overlap, movement and per-route/per-encounter outcomes. Smart Totem ticks with no injured destination emit no raw heal.

Controlled seeds: 87000 + chapter*10000 + index (combat +999). Route seeds: 187000 + chapter*100000 + index. Close runs extend the matrix seed schedule. Before/after use the same final policy and seed schedule to isolate numerical changes. At 300 samples, a single survival/completion estimate has at most about ±5.7 percentage points of 95% sampling uncertainty (normal approximation); at 30 it is about ±18 points. Small differences are not evidence of superiority. Seed pairing alone does not establish an optimal policy or remove systematic model bias.

## Controlled comparisons

No-talent Chapter 1, equivalent stats, 30 paired seeds, before → final. This isolates the baseline justification from talent power:

| Healer | Build | Profile | Survival | HPS | HPM |
| --- | --- | --- | --- | --- | --- |
| priest | 0-base | focused | 0.0% → 0.0% | 45.2 → 45.2 | 4.28 → 4.28 |
| priest | 0-base | burst | 0.0% → 0.0% | 54.1 → 54.1 | 4.37 → 4.37 |
| priest | 0-base | long | 0.0% → 0.0% | 38.4 → 38.4 | 3.55 → 3.55 |
| druid | 0-base | focused | 0.0% → 0.0% | 44.9 → 44.9 | 4.04 → 4.04 |
| druid | 0-base | burst | 0.0% → 0.0% | 52.6 → 52.6 | 4.03 → 4.03 |
| druid | 0-base | long | 0.0% → 0.0% | 40.0 → 40.0 | 4.01 → 4.01 |
| shaman | 0-base | focused | 0.0% → 0.0% | 46.0 → 45.3 | 4.65 → 4.34 |
| shaman | 0-base | burst | 0.0% → 0.0% | 53.3 → 52.5 | 4.63 → 4.21 |
| shaman | 0-base | long | 0.0% → 0.0% | 41.1 → 39.7 | 4.67 → 4.20 |

Equivalent-stat core builds, Chapter 4, scale 1.6, 30 seeds. Sources: [before matrix](bat-87-before-controlled.jsonl), [final matrix](bat-87-after-controlled.jsonl).

| Healer/build | Profile | Survival | Effective | Overheal | HPS | HPM | End Mana | Low-Mana time |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| priest/7-fourfold | focused | 100.0% | 4137 | 1172 | 46.0 | 4.76 | 270.0 | — |
| priest/7-fourfold | split | 100.0% | 3684 | 1817 | 40.9 | 4.76 | 349.4 | — |
| priest/7-fourfold | three | 100.0% | 3624 | 1248 | 40.3 | 4.80 | 354.1 | — |
| priest/7-fourfold | aoe | 100.0% | 4402 | 1812 | 48.9 | 5.69 | 324.1 | — |
| priest/7-fourfold | attrition | 100.0% | 4764 | 1064 | 52.9 | 5.25 | 217.1 | 83.2 |
| priest/7-fourfold | burst | 96.7% | 5501 | 977 | 61.2 | 5.27 | 87.1 | 81.5 |
| priest/7-fourfold | long | 100.0% | 6564 | 1723 | 46.9 | 5.08 | 65.6 | 123.8 |
| druid/7-blooming | focused | 100.0% | 4189 | 2068 | 46.5 | 4.21 | 212.4 | 88.9 |
| druid/7-blooming | split | 100.0% | 3763 | 2613 | 41.8 | 4.15 | 288.8 | 85.2 |
| druid/7-blooming | three | 100.0% | 3705 | 1647 | 41.2 | 4.89 | 430.5 | — |
| druid/7-blooming | aoe | 100.0% | 4403 | 1055 | 48.9 | 5.99 | 432.6 | — |
| druid/7-blooming | attrition | 100.0% | 4838 | 2771 | 53.8 | 4.48 | 128.3 | 79.6 |
| druid/7-blooming | burst | 100.0% | 5508 | 2536 | 61.2 | 4.84 | 69.1 | 76.7 |
| druid/7-blooming | long | 100.0% | 6438 | 3527 | 46.0 | 4.41 | 20.4 | 113.5 |
| shaman/7-earth | focused | 100.0% | 4202 | 2163 | 46.7 | 4.20 | 140.3 | 81.8 |
| shaman/7-earth | split | 100.0% | 3777 | 1978 | 42.0 | 4.36 | 261.6 | — |
| shaman/7-earth | three | 100.0% | 3714 | 1409 | 41.3 | 4.81 | 356.2 | — |
| shaman/7-earth | aoe | 100.0% | 4393 | 1204 | 48.8 | 5.34 | 283.0 | — |
| shaman/7-earth | attrition | 100.0% | 4851 | 2196 | 53.9 | 4.57 | 78.2 | 81.6 |
| shaman/7-earth | burst | 100.0% | 5507 | 1964 | 61.2 | 4.97 | 31.4 | 78.1 |
| shaman/7-earth | long | 100.0% | 6427 | 2769 | 45.9 | 4.77 | 25.7 | 114.5 |

Hard burst/long, scale 2, **300 paired seeds**, before → final. Includes capstones with/without Echoing Surge and the Momentum-focused Ancestral alternative:

| Healer | Build | Profile | Survival | HPS | HPM |
| --- | --- | --- | --- | --- | --- |
| priest | 7-fourfold | burst | 74.7% → 74.7% | 71.7 → 71.7 | 5.71 → 5.71 |
| priest | 7-fourfold | long | 36.7% → 36.7% | 52.2 → 52.2 | 5.25 → 5.25 |
| druid | 7-blooming | burst | 67.0% → 67.0% | 68.7 → 68.7 | 5.14 → 5.14 |
| druid | 7-blooming | long | 66.0% → 66.0% | 52.1 → 52.1 | 4.95 → 4.95 |
| shaman | 7-earth | burst | 92.7% → 37.3% | 73.4 → 65.9 | 5.92 → 5.14 |
| shaman | 7-earth | long | 95.3% → 41.0% | 55.8 → 49.3 | 5.81 → 4.98 |
| shaman | 7-tide | burst | 30.0% → 23.0% | 64.1 → 64.4 | 4.94 → 4.92 |
| shaman | 7-tide | long | 37.0% → 32.0% | 48.7 → 48.9 | 4.83 → 4.85 |
| shaman | 7-ancestral | burst | 56.0% → 24.0% | 66.5 → 65.1 | 5.24 → 4.95 |
| shaman | 7-ancestral | long | 46.3% → 21.0% | 50.3 → 49.7 | 5.06 → 4.89 |
| shaman | 7-ancestral-wave | burst | 49.0% → 21.7% | 65.9 → 64.8 | 5.15 → 4.91 |
| shaman | 7-ancestral-wave | long | 38.3% → 15.0% | 49.7 → 49.3 | 4.98 → 4.81 |
| shaman | 7-earth-echo | burst | 99.0% → 52.7% | 76.8 → 66.7 | 6.22 → 5.25 |
| shaman | 7-earth-echo | long | 98.7% → 54.3% | 58.7 → 50.3 | 6.13 → 5.13 |
| shaman | 7-tide-echo | burst | 48.3% → 32.0% | 67.7 → 65.6 | 5.29 → 5.09 |
| shaman | 7-tide-echo | long | 53.0% → 45.3% | 53.0 → 51.1 | 5.36 → 5.15 |
| shaman | 7-ancestral-echo | burst | 68.7% → 35.7% | 70.1 → 66.8 | 5.58 → 5.17 |
| shaman | 7-ancestral-echo | long | 63.0% → 35.0% | 54.5 → 51.6 | 5.59 → 5.15 |

Eight-point post-boss comparisons at the same hard pressure, 300 seeds:

| Healer | Build | Profile | Survival | HPS | HPM | End Mana |
| --- | --- | --- | --- | --- | --- | --- |
| priest | 8-twin | burst | 82.7% | 72.2 | 5.78 | 20.6 |
| priest | 8-twin | long | 58.7% | 53.4 | 5.45 | 18.0 |
| priest | 8-sanctuary | burst | 90.7% | 69.3 | 5.60 | 23.5 |
| priest | 8-sanctuary | long | 53.7% | 51.4 | 5.27 | 21.4 |
| priest | 8-fervor | burst | 87.7% | 74.3 | 6.00 | 25.8 |
| priest | 8-fervor | long | 59.7% | 53.8 | 5.52 | 19.8 |
| druid | 8-twin | burst | 33.3% | 65.8 | 4.73 | 18.1 |
| druid | 8-twin | long | 52.3% | 49.2 | 4.59 | 20.4 |
| druid | 8-genesis | burst | 75.3% | 70.4 | 5.30 | 22.9 |
| druid | 8-genesis | long | 74.7% | 53.1 | 5.08 | 21.6 |
| druid | 8-tranquility | burst | 66.3% | 68.4 | 5.10 | 23.5 |
| druid | 8-tranquility | long | 68.3% | 51.8 | 4.93 | 21.4 |
| shaman | 8-earth | burst | 49.3% | 66.1 | 5.21 | 29.1 |
| shaman | 8-earth | long | 46.0% | 49.6 | 5.03 | 28.7 |
| shaman | 8-tide | burst | 24.7% | 64.3 | 4.92 | 27.8 |
| shaman | 8-tide | long | 35.3% | 49.5 | 4.96 | 26.8 |
| shaman | 8-ancestral | burst | 10.7% | 64.0 | 4.80 | 25.8 |
| shaman | 8-ancestral | long | 20.3% | 49.4 | 4.80 | 28.2 |
| shaman | 8-ancestral-double | burst | 24.0% | 64.9 | 4.93 | 26.2 |
| shaman | 8-ancestral-double | long | 24.0% | 49.8 | 4.90 | 27.7 |
| shaman | 8-earth-echo | burst | 52.0% | 67.0 | 5.28 | 26.3 |
| shaman | 8-earth-echo | long | 52.7% | 50.5 | 5.14 | 26.1 |
| shaman | 8-earth-tide | burst | 55.3% | 67.1 | 5.32 | 27.4 |
| shaman | 8-earth-tide | long | 62.0% | 51.6 | 5.32 | 26.8 |
| shaman | 8-earth-ancestral | burst | 78.0% | 71.6 | 5.74 | 24.3 |
| shaman | 8-earth-ancestral | long | 78.0% | 55.6 | 5.76 | 25.3 |

Hard distributed niches, scale 2.8, **300 seeds**. This is diagnostic pressure, not an encounter retune:

| Healer | Build | Profile | Survival | HPS | HPM |
| --- | --- | --- | --- | --- | --- |
| priest | 7-fourfold | split | 90.0% | 65.6 | 5.31 |
| priest | 7-fourfold | three | 98.3% | 63.3 | 5.17 |
| priest | 7-fourfold | aoe | 97.0% | 69.4 | 5.80 |
| druid | 7-blooming | split | 80.7% | 61.6 | 4.65 |
| druid | 7-blooming | three | 99.0% | 63.5 | 4.85 |
| druid | 7-blooming | aoe | 99.3% | 80.9 | 6.37 |
| shaman | 7-earth | split | 75.3% | 61.1 | 4.90 |
| shaman | 7-earth | three | 96.0% | 61.7 | 5.01 |
| shaman | 7-earth | aoe | 95.0% | 68.3 | 5.65 |
| shaman | 7-tide | split | 61.7% | 58.9 | 4.69 |
| shaman | 7-tide | three | 97.7% | 62.0 | 5.02 |
| shaman | 7-tide | aoe | 70.0% | 63.7 | 5.25 |
| shaman | 7-ancestral | split | 82.7% | 61.9 | 4.99 |
| shaman | 7-ancestral | three | 98.7% | 63.2 | 5.12 |
| shaman | 7-ancestral | aoe | 66.0% | 63.7 | 5.23 |
| shaman | 7-ancestral-wave | split | 85.0% | 61.8 | 4.98 |
| shaman | 7-ancestral-wave | three | 98.3% | 61.8 | 5.01 |
| shaman | 7-ancestral-wave | aoe | 53.0% | 62.1 | 5.07 |
| shaman | 7-earth-echo | split | 81.7% | 62.2 | 4.99 |
| shaman | 7-earth-echo | three | 96.3% | 62.2 | 5.05 |
| shaman | 7-earth-echo | aoe | 97.3% | 69.1 | 5.73 |
| shaman | 7-tide-echo | split | 71.7% | 60.7 | 4.86 |
| shaman | 7-tide-echo | three | 99.0% | 64.4 | 5.21 |
| shaman | 7-tide-echo | aoe | 81.0% | 65.6 | 5.41 |
| shaman | 7-ancestral-echo | split | 85.0% | 63.3 | 5.09 |
| shaman | 7-ancestral-echo | three | 99.7% | 64.6 | 5.23 |
| shaman | 7-ancestral-echo | aoe | 65.7% | 64.8 | 5.31 |

## Progression and talent marginal value

Long-profile results at each chapter's equivalent stats. No-talent rows repeat because gear changes. Ranges span legal alternatives, not confidence intervals. All seven profiles and action distributions remain in the matrix.

| Healer | Chapter | Points | Builds | HPM range | End Mana range |
| --- | --- | --- | --- | --- | --- |
| priest | 1 | 0 | 1 | 3.55 to 3.55 | 19.42 to 19.42 |
| priest | 1 | 1 | 2 | 3.55 to 4.02 | 19.35 to 19.42 |
| priest | 2 | 0 | 1 | 4.03 to 4.03 | 25.67 to 25.67 |
| priest | 2 | 3 | 2 | 4.03 to 4.15 | 44.98 to 59.98 |
| priest | 3 | 0 | 1 | 4.62 to 4.62 | 18.69 to 18.69 |
| priest | 3 | 5 | 3 | 4.66 to 4.80 | 26.01 to 41.01 |
| priest | 4 | 0 | 1 | 4.37 to 4.37 | 20.08 to 20.08 |
| priest | 4 | 7 | 6 | 4.60 to 5.09 | 22.53 to 83.10 |
| priest | 4 | 8 | 3 | 4.98 to 5.33 | 66.58 to 108.88 |
| druid | 1 | 0 | 1 | 4.01 to 4.01 | 18.43 to 18.43 |
| druid | 1 | 1 | 2 | 4.12 to 4.37 | 18.44 to 20.85 |
| druid | 2 | 0 | 1 | 3.94 to 3.94 | 19.82 to 19.82 |
| druid | 2 | 3 | 2 | 4.07 to 4.16 | 65.90 to 82.74 |
| druid | 3 | 0 | 1 | 4.26 to 4.26 | 16.03 to 16.03 |
| druid | 3 | 5 | 3 | 4.36 to 4.40 | 23.96 to 26.63 |
| druid | 4 | 0 | 1 | 4.15 to 4.15 | 22.67 to 22.67 |
| druid | 4 | 7 | 7 | 4.07 to 4.47 | 20.28 to 26.12 |
| druid | 4 | 8 | 4 | 4.16 to 4.50 | 17.62 to 33.28 |
| shaman | 1 | 0 | 1 | 4.20 to 4.20 | 23.96 to 23.96 |
| shaman | 1 | 1 | 3 | 4.19 to 4.24 | 24.04 to 25.36 |
| shaman | 2 | 0 | 1 | 4.07 to 4.07 | 18.81 to 18.81 |
| shaman | 2 | 3 | 5 | 3.98 to 4.06 | 36.43 to 49.10 |
| shaman | 3 | 0 | 1 | 4.49 to 4.49 | 19.94 to 19.94 |
| shaman | 3 | 5 | 6 | 4.43 to 4.78 | 17.52 to 28.96 |
| shaman | 4 | 0 | 1 | 4.53 to 4.53 | 20.31 to 20.31 |
| shaman | 4 | 7 | 13 | 4.52 to 4.86 | 14.94 to 25.70 |
| shaman | 4 | 8 | 8 | 4.55 to 5.18 | 15.57 to 74.44 |

Legal one-rank ablations, Chapter 4, scale 2, 30 paired seeds. Negative changes can reflect decisions/nonlinear depletion, not intrinsic negative healing. [Full marginals](bat-87-talent-marginals.jsonl) also measure Priest/Druid at equivalent progression.

| Shaman talent | Legal paired cases | HPM change range | Survival change range (points) |
| --- | --- | --- | --- |
| tidal-reserves | 77 | -0.07 to 0.07 | -3.33 to 20.00 |
| deep-riptide | 70 | -0.09 to 0.17 | -13.33 to 20.00 |
| tidal-waves | 63 | -0.41 to 0.18 | -33.33 to 0.00 |
| restorative-stream | 63 | -0.05 to 0.16 | -13.33 to 16.67 |
| flowing-riptide | 42 | -0.20 to 0.29 | -26.67 to 23.33 |
| echoing-surge | 14 | 0.00 to 0.37 | 0.00 to 16.67 |
| double-current | 21 | -0.03 to 0.08 | -6.67 to 10.00 |
| earthliving | 56 | 0.04 to 0.96 | 0.00 to 73.33 |
| healing-tide-totem | 28 | -0.19 to 0.93 | -23.33 to 40.00 |
| ancestral-echo | 42 | -0.05 to 0.82 | -3.33 to 46.67 |
| high-tide | 14 | -0.01 to 0.05 | 0.00 to 0.00 |
| tidal-momentum | 7 | 0.00 to 0.02 | 0.00 to 6.67 |

Comparable rank-removal ranges by healer/row:

| Healer | Row | Legal cases | HPM change range | Survival change range (points) |
| --- | --- | --- | --- | --- |
| priest | 1 | 84 | -0.04 to 0.25 | -3.33 to 26.67 |
| priest | 2 | 42 | -0.08 to 0.22 | -10.00 to 26.67 |
| priest | 3 | 42 | 0.00 to 0.81 | 0.00 to 66.67 |
| priest | 4 | 42 | -0.39 to 0.42 | -6.67 to 40.00 |
| druid | 1 | 112 | -0.09 to 0.15 | -6.67 to 56.67 |
| druid | 2 | 56 | -0.06 to 0.28 | -6.67 to 20.00 |
| druid | 3 | 56 | 0.00 to 0.67 | -6.67 to 23.33 |
| druid | 4 | 49 | -1.35 to 0.27 | -40.00 to 20.00 |
| shaman | 1 | 154 | -0.09 to 0.17 | -13.33 to 20.00 |
| shaman | 2 | 140 | -0.41 to 0.18 | -33.33 to 16.67 |
| shaman | 3 | 77 | -0.20 to 0.37 | -26.67 to 23.33 |
| shaman | 4 | 126 | -0.19 to 0.96 | -23.33 to 73.33 |

Supplemental large party bursts at scale 3.2, 300 seeds, legal seven-point group specializations: a party hit every 12s at 75% of the scaled strike, with light tank pressure. This diagnostic supplements the seven standard profiles without changing live encounters. [Group rank evidence](bat-87-group-rank-marginals.jsonl) avoids interpreting negligible Chain usage in mild profiles as a talent defect:

| Build | Removed rank | Chain casts with rank | HPM with → without | Survival with → without |
| --- | --- | --- | --- | --- |
| 7-flow | tidal-waves | 4.43 | 5.179 → 5.226 | 100.0% → 99.0% |
| 7-flow | restorative-stream | 4.43 | 5.179 → 5.154 | 100.0% → 99.3% |
| 7-flow | flowing-riptide | 4.43 | 5.179 → 5.231 | 100.0% → 99.7% |
| 7-double | tidal-waves | 6.02 | 5.269 → 5.319 | 99.0% → 99.0% |
| 7-double | restorative-stream | 6.02 | 5.269 → 5.252 | 99.0% → 98.3% |
| 7-double | double-current | 6.02 | 5.269 → 5.231 | 99.0% → 99.7% |
| 7-high-tide | high-tide | 4.81 | 5.455 → 5.336 | 100.0% → 99.7% |
| 7-high-tide | flowing-riptide | 4.81 | 5.455 → 5.698 | 100.0% → 100.0% |
| 7-stream | restorative-stream | 4.68 | 5.241 → 5.226 | 99.3% → 99.0% |
| 7-stream | flowing-riptide | 4.68 | 5.241 → 5.316 | 99.3% → 99.3% |

Momentum requires maintained Surge; Deep requires periodic Riptide; High Tide requires useful jumps; echoes require another wounded ally. Zero tank-only echo is expected. Conversely, group-niche success does not establish tank-route parity. Alternative routes below avoid treating only the strongest Shaman capstone as representative.

## Explicit interaction measurements

At 30 SP, zero Haste/Crit unless stated. [Full interaction probes](bat-87-interactions.jsonl):

- Tidal Reserves with gear-inclusive base regeneration 3 recovers 180/198/216 Mana over 60s at ranks 0/1/2; the matrix measures realized depletion/sustainability.
- High Tide ranks 0/1/2 emit 382.968/439.156/505.060 Chain healing for 65 Mana, with unchanged first-target base healing; the same 30 total SP is spread across the larger Chain. Stream emits 222.0/250.8/279.6 for 35 Mana; six ticks/12s permit at most 80% uptime over its 15s cooldown.
- Maintained Surge + Momentum gives 155.0/170.5/186.0 direct Wave healing. Double Current + Waves gives two 1.6s Waves, 372 direct healing, and consumes both stored pairs. Two Riptides replace Waves with two stacks, not four.
- Deep rank 2 + Flowing releases exactly 146.187 old periodic healing after 6s. Movement preserves the same effect, next tick and expiry, moving 182.734 remaining healing without duplication.
- Clipped Surge emits 138 raw but only 30 effective healing, producing 9 echo; subsequent overheal produces none. Earthliving installs [23.00,23.00,23.00] after Wave and [23.00] per Chain target. Empowered new ticks are 27.60; old budgets remain unchanged and clip at the 18s cap. Paid Surge appended before or after these ticks retains its full budget.
- Normal/empowered Ancestral Wave gives 155.0 primary + 155.0 echo / 186.0 primary + 186.0 echo. Echo excludes the primary and cannot Crit or recurse; no injured secondary means zero value.
- Tide/Stream/Chain overlap emits 2310.0/279.6/382.968 useful healing for 150 Mana, with 60 party Tide events and 6 Stream events. All use shared SP scaling. These wounded probes are ceilings; real profiles measure clipped/unused ticks, overheal and pending-heal overlap.

## Persistent routes

Ready/veryGood, actual Chapters 1–4, 30 paired seeds. Approach completion means reaching the boss; full completion includes winning it. No refill:

| Healer | Build | Chapter/stage | Route before → final | Full before → final |
| --- | --- | --- | --- | --- |
| priest | 1-binding | 1/ready | 76.7% → 76.7% | 36.7% → 36.7% |
| druid | 1-rejuvenation | 1/ready | 76.7% → 76.7% | 30.0% → 30.0% |
| shaman | 1-reserves | 1/ready | 96.7% → 83.3% | 80.0% → 30.0% |
| priest | 3-binding | 2/ready | 76.7% → 76.7% | 40.0% → 40.0% |
| druid | 3-rejuvenation | 2/ready | 56.7% → 56.7% | 43.3% → 43.3% |
| shaman | 3-waves | 2/ready | 73.3% → 63.3% | 40.0% → 30.0% |
| priest | 5-penance | 3/ready | 30.0% → 30.0% | 13.3% → 13.3% |
| druid | 5-nourishment | 3/ready | 40.0% → 40.0% | 30.0% → 30.0% |
| shaman | 5-flow | 3/ready | 33.3% → 23.3% | 20.0% → 10.0% |
| priest | 7-fourfold | 4/ready | 60.0% → 60.0% | 36.7% → 36.7% |
| druid | 7-blooming | 4/ready | 60.0% → 60.0% | 6.7% → 6.7% |
| shaman | 7-earth | 4/ready | 93.3% → 40.0% | 66.7% → 16.7% |

Chapter 1/4 close results, **300 paired seeds**, including the fresh-run red flag:

| Healer | Build | Chapter/stage | Route before → final | Full before → final |
| --- | --- | --- | --- | --- |
| priest | 1-binding | 1/first | 8.3% → 8.3% | 0.0% → 0.0% |
| priest | 1-binding | 1/ready | 78.0% → 78.0% | 16.3% → 16.3% |
| druid | 1-rejuvenation | 1/first | 1.3% → 1.3% | 0.0% → 0.0% |
| druid | 1-rejuvenation | 1/ready | 63.0% → 63.0% | 16.7% → 16.7% |
| shaman | 1-reserves | 1/first | 62.7% → 7.3% | 2.7% → 0.0% |
| shaman | 1-reserves | 1/ready | 98.0% → 72.0% | 69.0% → 25.0% |
| priest | 7-fourfold | 4/first | 1.3% → 1.3% | 0.0% → 0.0% |
| priest | 7-fourfold | 4/ready | 45.0% → 45.0% | 18.7% → 18.7% |
| druid | 7-blooming | 4/first | 4.7% → 4.7% | 0.0% → 0.0% |
| druid | 7-blooming | 4/ready | 44.7% → 44.7% | 12.0% → 12.0% |
| shaman | 7-earth | 4/first | 38.7% → 1.3% | 12.3% → 0.0% |
| shaman | 7-earth | 4/ready | 87.0% → 40.7% | 62.3% → 8.3% |

Chapter 4 alternative seven-point builds, ready/veryGood, **300 paired seeds**, actual class loot. Within-class equipment seeds are identical; Priest/Druid alternatives are measured too:

| Healer | Build | Chapter/stage | Route before → final | Full before → final |
| --- | --- | --- | --- | --- |
| priest | 7-fourfold | 4/ready | 45.0% → 45.0% | 18.7% → 18.7% |
| priest | 7-sanctuary | 4/ready | 10.3% → 10.3% | 0.7% → 0.7% |
| priest | 7-fervor | 4/ready | 16.7% → 16.7% | 2.3% → 2.3% |
| druid | 7-blooming | 4/ready | 44.7% → 44.7% | 12.0% → 12.0% |
| druid | 7-genesis | 4/ready | 45.3% → 45.3% | 11.0% → 11.0% |
| druid | 7-tranquility | 4/ready | 32.7% → 32.7% | 6.3% → 6.3% |
| shaman | 7-earth | 4/ready | 87.0% → 40.7% | 62.3% → 8.3% |
| shaman | 7-tide | 4/ready | 28.7% → 18.7% | 1.3% → 1.0% |
| shaman | 7-ancestral | 4/ready | 38.3% → 21.0% | 9.3% → 14.7% |
| shaman | 7-ancestral-wave | 4/ready | 37.0% → 16.7% | 8.0% → 12.3% |
| shaman | 7-earth-echo | 4/ready | 94.7% → 52.7% | 88.7% → 16.7% |
| shaman | 7-tide-echo | 4/ready | 66.7% → 40.0% | 39.3% → 7.3% |
| shaman | 7-ancestral-echo | 4/ready | 72.7% → 37.0% | 51.0% → 26.7% |

Final mean boss-entry Mana ranges 15.8–25.1 across these cohorts. Low entries/fresh failures do not authorize retuning enemies. Chapter 2–3 and average/weak policies remain in [before routes](bat-87-before-routes.jsonl) and [final routes](bat-87-after-routes.jsonl). Weak ready samples have more farming; this does not show weaker play outperforming stronger play at equal gear.

## Limits and acceptance review

Priest retains direct response/strong burst; Druid retains prepared multi-HoT recovery; Shaman retains banked sustain, smart Chain/Stream, Tide recovery and effective split echoes. Specialization is expected. The evidence must still support competitive alternatives rather than hiding systematic deficits behind one Earthliving build.

Actual Shaman gear removes placeholder-gear uncertainty. Greedy allocation, assumed prior victories, alternate/human policies, burst timing, rare Haste/Crit gear and campaign farming remain limitations. Results describe this snapshot; low-pressure survival and raw ceilings do not prove universal balance. No permanent gear, encounter, Priest or Druid numerical changes were made.

**Acceptance: pass for this implemented balance scope, subject to the stated policy/sampling limits and the documented Earthliving design exception.** Exact win-rate parity and universally optimal builds are not claimed.

- Baseline: the Chapter 1 fresh-route approach outlier falls from 62.7% to 7.3%, versus Priest 8.3% and Druid 1.3%. Ready Shaman completes 25.0% of full routes versus 16.3%/16.7%; that early sustain strength does not extend to dominance across later chapters. Fresh boss wins remain zero for every class.
- Comparable healing: standard Chapter 4 core builds survive all seven profiles; hard long survival for Earth/Echo is 54.3%, between Priest 36.7% and Druid 66.0%. Shaman retains a hard-burst weakness: Earth/Echo survives 52.7% versus 74.7%/67.0%, with 66.7 HPS versus 71.7/68.7. This gap is recorded, not hidden by averaging it into easier profiles. Other standard profiles and actual routes do not show a broad class deficit.
- Capstones: ready Chapter 4 Earth/Echo reaches the boss in 52.7% and completes 16.7% of routes; Ancestral/Echo reaches it in 37.0% but completes 26.7%; Tide/Echo reaches it in 40.0% and completes 7.3%. Ancestral without Echo still completes 14.7%, so Echo is not required for a competitive route build. Tank-oriented routing does not represent Tide's group niche: its hard three-target survival is 99.0%, versus Earth/Echo 96.3%; standard AoE Tide HPM exceeds Earth. Earth wins the steady AoE survival niche, Ancestral the split niche. No capstone wins every measure/profile.
- Rows: Reserves/Deep/Momentum reward sustain/periodic/direct choices; Waves/High Tide/Stream reward timing/large group wounds/smart passive recovery; Flowing/Echo/Double reward retained periodic budget/secondary effective healing/burst windows. High Tide's old weak marginal prompted the final numerical buff; the supplemental paired second-rank result adds 0.119 HPM and 3.95 effective Chain HPS. All ranks retain useful mechanics and no row is numerically required across all niches.
- Mana/timing limitations: faster Waves and Flowing can lower measured sustained HPM or survival when this aggressive policy spends faster or cashes out into changing wounds. Faster casting has no intrinsic Mana surcharge, and the interaction probes verify its timing advantage. Negative heuristic ablations are reported; they do not justify weakening the talent simply to slow this policy. Human timing remains an uncertainty.
- Progression and scaling: legal 1/3/5/7/8-point alternatives, capstone combinations, source budgets and paid/generated banks are measured. Finite banks, cooldowns, effective-only echoes and resource costs retain limits on passive/direct layering. Chain's stronger specialized jumps preserve base first-target healing and its 65 Mana cost. No live encounter, Priest/Druid, gear or progression changes were used to obtain parity.

The automated evidence supports a tested numerical checkpoint. Further player feedback can refine burst timing and specialized allocation; no unresolved implementation defect or required gear integration blocks this issue.

## Validation and checkpoint

**226/226 automated tests pass**, covering legal builds, equal stats, exact instant Mana debits, complete immutable original restoration, deterministic combat/routes, exact resource carry, two-target Tide/queued healing, useful Ancestral targeting and nonempty CLI filter behavior. Existing tests retain bank caps, cancellation, charge replacement, death/pause, effective echoes, SP/Crit and independent Totem behavior. Combat adds a multiplier only to newly generated Earthliving ticks after shared SP/Unleash calculation. Mixed paid/generated banks are tested in both insertion orders; old budgets are never rescaled.

Browser: started npm start on port 5173 and inspected the production Team page in a fresh tab. Verified Surge 36/tick, Wave 125/32 Mana, Riptide 36 Mana, Echoing Surge 30%, Earthliving 50%/3 and 1 ticks/18s cap, High Tide jump loss 12.5%/5%, Tide 36/1s/12s/50 Mana and Ancestral 100%. No warning/error console entries. This verifies displayed configuration, not manual full-route/capstone wins. git diff --check passes. Recommend committing/pushing this coherent checkpoint after user authorization; no commit/push/merge is assumed. Keep dev→main contingent on acceptance review.
