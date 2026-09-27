# BAT-89 preliminary audit — mechanics specification missing

> Historical checkpoint retained from before Linear's specification repair. The statements below describe that earlier state. The completed implementation and final evidence are documented in [bat-89-shaman-balance.md](bat-89-shaman-balance.md).

Work is on `dev`, starting from `c33440f`. **BAT-89 is not complete.** Production spells, talents, combat, encounters and gear have not been changed. The added policy is a diagnostic draft, not a replacement for the shipped BAT-87 harness.

## Blocking information

Linear BAT-89 currently starts with the literal text `undefined`, followed only by the intended priority/play-pattern guidance. That guidance refers to **Cascading Stream and its summon burst**, while production has **Restorative Stream**, a two-rank 15%/30% periodic Totem healing increase. It supplies no replacement mechanic, target count, ranks, values or migration rules.

The recent planning chat **“BAT-76 investigation plan”** confirms the priority-system guidance, but the accessible turns do not contain the missing mechanics specification. The missing section needs restoring before implementing the talent redesign. Numerical candidates below are investigations, not an inferred approved specification.

## Concrete findings

- **Ancestral Echo:** production copies 100% of the primary Wave's effective healing, including its Crit/Unleash/Momentum bonuses. This conflicts with the stated partial-cleave role. A normal base Wave into two sufficiently wounded allies produces 125 primary + 125 secondary healing. A primary with only 10 missing Health produces 10 + 10; primary overheal does not create an echo.
- **Healing Tide:** at zero Spell Power, no Crit and no Haste, current Tide heals 36 per ally each second for 12s: 432 per ally. Into five 300-Health wounds it restores all 1,500 missing Health by itself for 50 Mana. Adding two Chain casts restores the same 1,500 effective healing for 180 Mana: overlap is wasteful in this isolated case. This demonstrates the role conflict without relying on an optimal-play heuristic.
- **Chain Heal:** its current baseline already has a useful 4+ target efficiency niche. With zero Spell Power and 150 missing Health on each useful target, four useful targets produce 310 effective healing plus 1 healing into the fifth scratched target: 4.78 HPM. Five useful targets produce 352.97 / 65 = 5.43 HPM. Base Wave's direct ceiling is 125 / 32 = 3.91. Counting nearly-full targets would inflate apparent group value; the draft policy requires at least 40 currently useful direct healing per counted target.
- **Unleash packages:** its value varies by talents. At 100 Spell Power, two Wave casts with Earthliving into two 700-Health wounds produce 658 effective healing / 64 Mana = 10.28 HPM. Adding Unleash produces 913.8 / 88 = 10.38; Double Current raises this to 979.6 / 88 = 11.13. The analogous Ancestral package changes 14.06 → 13.41 HPM with one empowerment, or 14.09 with two. These are finite wound/tick fixtures, not encounter-wide balance claims. All actual Mana debits, including cast completion, are counted.

Exploratory half-strength Ancestral Echo and 18-per-second Tide probes remain in ignored `.tmp` files. **Those values have not been applied to production.** Cascade values have not been invented.

## Simulator work prepared

`scripts/shaman-priority.mjs` adds an injury-aware diagnostic policy with explicit `adaptive`, `efficiency` and `reserve` Unleash modes. It accounts for imminent periodic healing, Tide coverage, useful Chain targets and the visible encounter schedule. Random target forecasts use announced targets only and consume no combat RNG. Paid Surge is evaluated with Earthliving rather than rejected by talent flag; maintenance targets low remaining banks rather than the 18s cap.

`scripts/shaman-revalidation.mjs` separates:

1. `before`: BAT-87 numbers and the existing policy;
2. `policy`: BAT-87 numbers and the diagnostic priority policy;
3. `adaptive`/`efficiency`/`reserve`: current numbers and the selected policy.

Priest and Druid retain their existing policies. Controlled parties use identical equipment-derived stats; no permanent gear is granted. The existing route runner also accepts a policy override while preserving live Health/Mana carry.

### 30-seed diagnostic comparison

Chapter 4, equivalent stats, pressure scale 2, actual Combat at 1/60s. Survival requires all five living at the 90s horizon (140s for long). HPM counts actual Mana debits, without subtracting regeneration. No production tuning is included.

| Build | Profile | Previous policy survival | Draft policy survival | Previous HPM | Draft HPM |
| --- | --- | ---: | ---: | ---: | ---: |
| Earthliving | Burst | 36.7% | 33.3% | 5.04 | 4.78 |
| Earthliving | Long | 40.0% | 46.7% | 4.92 | 4.75 |
| Healing Tide | Burst | 26.7% | 36.7% | 4.85 | 4.98 |
| Healing Tide | Long | 36.7% | 40.0% | 4.75 | 4.86 |
| Ancestral / Momentum | Burst | 20.0% | 16.7% | 4.81 | 5.05 |
| Ancestral / Momentum | Long | 16.7% | 0% | 4.74 | 4.70 |

Reference Priest/Druid burst survival is 66.7%/73.3%; long is 36.7%/73.3%. These small samples are diagnostic: they do not establish an optimal policy or justify balancing around the draft. Its Ancestral long-fight regression specifically requires investigation before tuning. HPS can rise when a policy loses allies or dies earlier; the JSONL includes survival, elapsed time, deaths and depletion alongside throughput.

### Remaining policy work

The draft estimates one empowered follow-up cast; its decision estimate does not yet model the complete two-cast Double Current package or jointly allocate secondary wounds between successive casts. Smart Stream healing is not subtracted from individual pending-heal estimates. Expected-damage forecasts approximate defense and ongoing DoTs; they do not model every add/shard/future debuff. The complete priority guidance therefore still requires policy refinement before the final balance pass.

After the mechanic specification is restored: implement the specified talent changes and saved-allocation migration, refine these estimates, verify tooltips and browser behavior, run legal 0/1/3/5/7/8-point progression and actual Chapter 1–4 routes, and use approximately 300 seeds for close final comparisons. Preserve the BAT-87 report/evidence as historical results.

## Reproduction and validation

From the repository root in PowerShell:

```powershell
$env:SHAMAN_TUNING = '{}'
node scripts/shaman-package-probes.mjs | Set-Content -Encoding utf8 docs/bat-89-package-audit.jsonl
$env:SCENARIOS = 'before,policy,adaptive'
$env:CHAPTERS = '4'
$env:HEALERS = 'priest,druid,shaman'
$env:PROFILES = 'focused,split,three,aoe,attrition,burst,long,groupBurst'
$env:PRESSURE_SCALE = '2'
$env:BUILD_FILTER = '7-earth,7-tide,7-ancestral-wave,7-fourfold,7-blooming'
node scripts/shaman-revalidation.mjs 30 controlled | Set-Content -Encoding utf8 docs/bat-89-policy-audit.jsonl
npm.cmd test
git diff --check
```

Evidence: [package audit](bat-89-package-audit.jsonl), [policy audit](bat-89-policy-audit.jsonl). Controlled data includes casts, empowered casts, source raw/effective healing, overheal, resource use, deaths, depletion, Surge/HoT coverage and Totem overlap. These are preliminary fixtures; no final route/progression acceptance is claimed.

Validation: **232/232 automated tests pass**, including six priority/snapshot regressions. `git diff --check` passes. Changes remain uncommitted; no issue completion, push or `dev → main` merge has been performed.
