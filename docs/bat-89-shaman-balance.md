# BAT-89 — Shaman mechanics and balance revalidation

Implemented on dev from c33440f. The preliminary [audit](bat-89-audit.md), its raw probes and the BAT-87 evidence remain historical checkpoints. No encounter, loot, Priest or Druid production tuning changed.

## Selected values

| Mechanic | BAT-87 | BAT-89 |
| --- | --- | --- |
| Earthliving Wave | 6s, hidden half-strength Surge | 6s normal-strength Surge |
| Earthliving Chain | 2s half-strength on every hit | 2s normal-strength on at most two lowest post-heal HP% injured actual recipients |
| Row-three talent | Echoing Surge, 30% effective tick echo | Cascading Stream: once on summon, 50% baseline Chain curve, up to three distinct wounded living allies |
| Healing Tide | 36/ally/second ×12s; 50 Mana | 10/ally/second ×12s; 60 Mana; instant, passive, 60s cooldown |
| Ancestral Echo | 100% primary effective Wave | 50%; other wounded ally; no extra Crit/recursion |
| Chain / High Tide decay | 20% / 12.5% / 5% | unchanged |

Surge remains 36 base healing/2s, Wave 125/32 Mana, Riptide 36 Mana and Chain 105/65 Mana. Generated and paid Surge share one bank, 18s cap, scheduled phase and original queued strengths. Saved Echoing Surge points migrate to Cascading Stream; existing new identifiers take precedence. Cascade ignores High Tide, Unleash, Waves and Earthliving and retains decimals and normal baseline Chain SP scaling.

## Reproduction and interpretation

```powershell
node scripts/shaman-revalidation-evidence.mjs
node scripts/shaman-revalidation-report.mjs
npm.cmd test
```

[Manifest](bat-89-evidence-manifest.json) records allocations, commands, seeds, source/output hashes and samples. Core evidence: [progression](bat-89-progression.jsonl), [all 7/8-point builds](bat-89-builds.jsonl), [Chapters 1–4 routes](bat-89-routes.jsonl), [early routes](bat-89-earlyRoutes.jsonl), [focused](bat-89-focused.jsonl), [niches](bat-89-niches.jsonl), [stress](bat-89-stress.jsonl), [close routes](bat-89-closeRoutes.jsonl), [Unleash modes](bat-89-unleash.jsonl), [packages](bat-89-packages.jsonl).

Real fixed-step Combat (1/60s); controlled parties share identical real-loot-derived pre-talent stats. All five must live through 90s (long: 140s), with infinite enemy Health. This measures sustainable pressure, not normal encounter wins. Routes use actual class loot and live Health/Mana carry, including live maximum-stat gear adjustments; no boss refill. Fresh enters before earning the chapter's first point. Ready farming: 2 veryGood, 3 average, 4–5 weak clears. Compare skills within their gear cohort. HPM uses actual Mana debits; HPS alone does not imply success. Raw budgets below use zero SP/Crit/Haste; normal shared scaling still applies.

Thirty seeds cover progression, all builds and routes/all three skill levels. Three hundred seeds cover close early/late routes, hard pressure, capstone alternatives and Unleash modes. The 95% binomial half-width is at most about 5.7 percentage points at 300 seeds; small differences are not strict rankings. Build names ending “echo” retain historical labels: current allocations use Cascade; before allocations reconstruct Echoing Surge. The frozen BAT-87 combat fixture preserves old bank/echo behavior. Before=BAT87/legacy, policy=BAT87/refined, adaptive/efficiency/reserve=current/refined.

## Early progression: mechanics versus policy

Actual Chapter 1 loot, 300 seeds, veryGood:

| Healer / policy | Fresh approach / full route | Ready approach / full route |
| --- | --- | --- |
| Shaman / before | 7.3% / 0.0% | 72.0% / 25.0% |
| Shaman / policy | 76.7% / 2.7% | 99.0% / 72.7% |
| Shaman / adaptive | 76.7% / 2.7% | 99.0% / 72.7% |
| priest / historical | 8.3% / 0.0% | 78.0% / 16.3% |
| priest / 1-binding sensitivity | 77.7% / 0.7% | 99.7% / 55.7% |
| priest / 1-mercy sensitivity | 69.7% / 0.3% | 93.0% / 43.0% |
| druid / historical | 1.3% / 0.0% | 63.0% / 16.7% |
| druid / 1-rejuvenation sensitivity | 67.3% / 1.7% | 94.3% / 45.7% |
| druid / 1-touch sensitivity | 68.3% / 4.3% | 99.3% / 66.3% |

Every current Shaman 0/1-point controlled and first/ready route result equals BAT-87 with the same refined policy: talent revisions create **zero early numerical regression**. The policy gain is large; comparing it only to historical Priest/Druid heuristics misleadingly recreates apparent early dominance. A separate threshold-only reference sensitivity improves reference play without changing game mechanics: [grid](bat-89-reference-grid.jsonl), [300-seed results](bat-89-reference.jsonl). Parameters for both first-point choices were selected on 30 ready seeds (indices 1000–1029), then validated on separate indices 0–299. Fresh/ready and all skill levels are retained. This is a sensitivity check rather than an optimal-play proof. This evidence supports retaining BAT-87 baseline tuning; it does not establish exact healer parity.

## Controlled capstones

Each cell is **all-five survival / effective HPM**, 300 seeds. Different pressure multipliers identify niches; do not compare survival across columns as equal difficulty.

| Build | Focused ×2.8 | Split ×2.8 | Three ×2.8 | AoE ×2.8 | Burst ×2 | Long ×2 |
| --- | --- | --- | --- | --- | --- | --- |
| 7-fourfold | 5.7% / 5.44 | 90.0% / 5.31 | 98.3% / 5.17 | 97.0% / 5.80 | 74.7% / 5.71 | 36.7% / 5.25 |
| 7-blooming | 50.3% / 5.79 | 80.7% / 4.65 | 99.0% / 4.85 | 99.3% / 6.37 | 67.0% / 5.14 | 66.0% / 4.95 |
| 7-earth-cascade | 69.7% / 6.25 | 99.0% / 5.63 | 97.3% / 5.26 | 77.0% / 5.78 | 95.7% / 5.78 | 96.0% / 5.56 |
| 7-tide-cascade | 1.7% / 5.32 | 78.7% / 4.91 | 93.0% / 5.02 | 52.3% / 5.43 | 38.3% / 5.00 | 39.3% / 4.94 |
| 7-ancestral-cascade | 1.7% / 5.32 | 95.7% / 5.40 | 99.0% / 5.39 | 74.7% / 5.46 | 41.3% / 5.30 | 30.0% / 5.17 |

Same-stat before/after burst and long comparisons isolate both policy and mechanics:

| Build / profile | BAT-87 / legacy | BAT-87 / refined | Current / refined |
| --- | --- | --- | --- |
| 7-earth-cascade / burst | 52.7% / 5.25 | 54.3% / 5.23 | 95.7% / 5.78 |
| 7-earth-cascade / long | 54.3% / 5.13 | 70.7% / 5.24 | 96.0% / 5.56 |
| 7-tide-cascade / burst | 32.0% / 5.09 | 46.7% / 5.22 | 38.3% / 5.00 |
| 7-tide-cascade / long | 45.3% / 5.15 | 53.3% / 5.30 | 39.3% / 4.94 |
| 7-ancestral-cascade / burst | 35.7% / 5.17 | 29.7% / 5.29 | 41.3% / 5.30 |
| 7-ancestral-cascade / long | 35.0% / 5.15 | 15.3% / 5.21 | 30.0% / 5.17 |

Eight-point alternatives (300 seeds):

| Eight-point build | Split survival / HPM | AoE survival / HPM | Long survival / HPM |
| --- | --- | --- | --- |
| 8-earth-tide | 97.7% / 5.47 | 63.3% / 5.64 | 95.3% / 5.52 |
| 8-earth-ancestral | 99.7% / 5.92 | 95.7% / 6.05 | 96.3% / 5.93 |
| 8-ancestral-double | 86.3% / 5.16 | 28.0% / 4.96 | 4.0% / 4.72 |

Earthliving earns its focused sustain advantage while direct Wave remains necessary. Ancestral gives useful cleave; Tide improves standard AoE resource efficiency (5.58 HPM versus Earth/Cascade 5.01 at ×1.6). Hard-profile outcomes and real routes do not support a universal capstone ranking. Tide is weaker on tank-heavy routes; no compensating encounter changes were made. All tested 7/8-point allocations are legal; their full six-profile/extra group-burst results, spell usage and depletion remain in the JSONL.

Matched capstone ablation, 300 seeds, same legal six-point Cascade core with one unspent point versus each capstone:

| AoE scale | Shared core: survival / HPM | Earth | Tide | Ancestral |
| --- | --- | --- | --- | --- |
| 1.6 | 100.0% / 5.11 | 100.0% / 5.15 | 100.0% / 5.71 | 100.0% / 5.03 |
| 2.8 | 49.7% / 5.35 | 77.0% / 5.78 | 52.3% / 5.43 | 74.7% / 5.46 |

[Ablation evidence](bat-89-capstones.jsonl) also retains the three-target comparison. These separate each capstone's contribution from the common core.

## Resource routes

Ready/veryGood, 30 seeds for Chapters 1–3 here; Chapter 1 is expanded above, and Chapter 4 uses 300 seeds. All first/ready and average/weak cohorts are in the route files.

| Chapter / build | Reach boss | Complete route | Boss entry Mana | Effective HPM |
| --- | --- | --- | --- | --- |
| 1 / 1-binding | 76.7% | 36.7% | 23.16 | 3.69 |
| 1 / 1-rejuvenation | 76.7% | 30.0% | 15.05 | 3.52 |
| 1 / 1-reserves | 93.3% | 83.3% | 25.11 | 3.97 |
| 2 / 3-binding | 76.7% | 40.0% | 24.23 | 4.47 |
| 2 / 3-rejuvenation | 56.7% | 43.3% | 15.99 | 4.08 |
| 2 / 3-waves | 46.7% | 16.7% | 17.67 | 3.74 |
| 3 / 5-penance | 30.0% | 13.3% | 13.30 | 4.16 |
| 3 / 5-nourishment | 40.0% | 30.0% | 21.42 | 3.80 |
| 3 / 5-flow | 33.3% | 6.7% | 20.05 | 3.90 |
| 4 / 7-fourfold | 45.0% | 18.7% | 19.78 | 5.20 |
| 4 / 7-blooming | 44.7% | 12.0% | 21.86 | 4.43 |
| 4 / 7-earth | 63.7% | 16.3% | 27.58 | 5.43 |
| 4 / 7-tide | 15.0% | 0.0% | 28.84 | 4.42 |
| 4 / 7-ancestral | 24.0% | 12.3% | 28.24 | 4.88 |
| 4 / 7-earth-cascade | 71.7% | 25.3% | 27.27 | 5.58 |
| 4 / 7-tide-cascade | 25.3% | 0.7% | 26.28 | 4.56 |
| 4 / 7-ancestral-cascade | 37.7% | 21.7% | 28.28 | 5.14 |

Low boss-entry Mana and fresh failures remain real constraints. Healing output after deaths or early termination is not interpreted as greater balance. No permanent gear was granted.

## Whole spell packages and Unleash modes

- Five genuinely wounded baseline Chain targets: 352.97 healing /65 Mana = 5.43 HPM; High Tide ranks 1/2: 409.16 / 475.06. Four meaningful wounds plus a one-Health scratch give 4.78 HPM. One useful target is not counted as five.
- Wave into two large wounds: Ancestral package 250.00 → 187.50 effective for 32 Mana; a ten-Health primary creates only five secondary healing.
- Cascade: 52.5 → 42 → 33.6 at zero SP, 128.10 total summon recovery; zero wounded allies yields zero. Totem costs 35 Mana once; normal smart ticks are additional.
- Tide alone into five 300-Health wounds: 1500.00 → 600.00 effective. Current Tide plus two Chains: 1275.94 useful / 190.00 Mana. The large AoE is not solved by Tide alone. Base Tide 600 exceeds rank-two Stream 249.6 (377.7 including Cascade), remains below Tranquility 750, and leaves the Shaman free to cast.
- At 100 SP, two Earthliving Waves into two 700-Health wounds: 13.53 HPM unempowered; 12.87 with one empowerment; 13.86 with Double Current. Decisions include upfront healing/cost, both follow-up costs, faster casts, generated/secondary healing and a shared wound budget.

Unleash modes, 300 seeds, survival / HPM:

| Build / profile | Adaptive | Efficiency | Reserve |
| --- | --- | --- | --- |
| 7-earth-cascade / burst | 95.7% / 5.78 | 98.0% / 5.88 | 95.3% / 5.79 |
| 7-earth-cascade / long | 96.0% / 5.56 | 96.7% / 5.63 | 96.3% / 5.57 |
| 7-ancestral-cascade / burst | 41.3% / 5.30 | 58.7% / 5.52 | 42.3% / 5.31 |
| 7-ancestral-cascade / long | 30.0% / 5.17 | 41.3% / 5.29 | 29.3% / 5.17 |
| 8-earth-double / burst | 92.7% / 5.58 | 93.0% / 5.63 | 91.7% / 5.57 |
| 8-earth-double / long | 92.7% / 5.43 | 94.0% / 5.48 | 92.0% / 5.43 |
| 8-ancestral-double / burst | 10.3% / 4.98 | 24.3% / 5.14 | 12.0% / 4.98 |
| 8-ancestral-double / long | 4.0% / 4.72 | 9.3% / 4.87 | 4.0% / 4.70 |

The priority policy accounts for due Surge/Riptide/Tide ticks, assigns each forecast smart Stream tick once, counts currently meaningful Chain wounds, maintains short useful Surge banks, and uses Ancestral Wave before Riptide removes its cleave wound. It does not ban paid Surge with Earthliving. Efficiency can use Unleash outside danger; reserve holds for visible burst warnings. Generated banks across successive estimated casts are not fully virtualized, and forecasts approximate future adds/shards/debuffs and repeated mechanics. No future random targets or Crit RNG are peeked. These are reproducible heuristics, not exhaustive optimal play.

## Decisions and verification

Tested the approved 4s Earthliving fallback with 300 seeds under identical pressure/gear:

| Earth/Cascade profile | 6s survival / HPM | 4s survival / HPM |
| --- | --- | --- |
| focused | 69.7% / 6.25 | 75.3% / 6.27 |
| split | 99.0% / 5.63 | 96.0% / 5.31 |
| three | 97.3% / 5.26 | 96.3% / 5.13 |
| aoe | 77.0% / 5.78 | 74.7% / 5.69 |
| burst | 95.7% / 5.78 | 82.7% / 5.39 |
| long | 96.0% / 5.56 | 83.3% / 5.26 |

Actual Chapter 4 ready routes: reach boss 71.7% → 57.7%, full route 25.3% → 4.0%, effective HPM 5.58 → 5.16. [4s niches](bat-89-earth-four-niches.jsonl), [stress](bat-89-earth-four-stress.jsonl), [routes](bat-89-earth-four-routes.jsonl).

**Retained 6s.** Four seconds preserves focused controlled survival and curbs burst/long sustain, but severely degrades the real-loot resource route. Six seconds gives a legitimate tank/burst advantage and remains weaker than Priest/Druid under heavy AoE; Ancestral/Cascade also has competitive actual-route completion. Standard AoE Tide offers better resource efficiency. This does not support sacrificing the intended sustained-healing niche merely to flatten one controlled profile. The report retains the strong 6s results explicitly for review.

Accepted 50% Cascade/Ancestral and 10/12s/60-Mana Tide. Retained 20% Chain decay: Shaman group results do not show material overpowering, and further decay would damage the four-target efficiency niche. The conditional 25%/30% decay experiments were not needed. The preliminary half-strength Echo/Tide numerical explorations are superseded by the repaired specification. Reference threshold changes are sensitivity probes only; historical comparison policies remain intact.

Automated checks cover recipient ordering after all heals, injured/dead/full exclusions, caps/phase/paid-generated order, empowerment/stat precision, Cascade baseline changes/reordering/proc isolation, save migration, partial effective echoes and Tide timing/coexistence/casting. Full npm test: 237/237 pass. git diff --check passes.

Browser QA used the production app modules through an ignored isolated in-memory QA save, preserving the user's saved game. Verified migrated 8 spent/8 earned, talent and live spell wording, respec to 50% Ancestral, both Totems preserving charges, and an empowered Wave completing while both Totems were active; no warning/error entries. This is a UI/mechanics check, not manual full-route win evidence. [Talent screenshot](screenshots/bat-89-talents.png).

This is a coherent tested checkpoint for a commit on dev after user authorization. A dev→main milestone should follow acceptance review of this report. No commit, push or merge is assumed.
