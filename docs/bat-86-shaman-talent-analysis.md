# BAT-86 analytical review and simulation handoff

## Review completed before implementation

Canonical inputs: current `src/data.js`, `src/stats.js`, `src/combat.js`, `src/priest-talents.js` and `src/druid-talents.js`, including the uncommitted BAT-85 baseline. BAT-85 is Done in Linear. The pre-change suite passes 188/188. No encounter simulations are used for this review.

Numbers below assume zero gear, Haste and Crit, five living allies, unlimited useful wounds and no scheduling losses. HPS for a direct cast is healing/cast time; periodic HPS is healing/duration, and cooldown throughput is healing/cooldown. Instant spells have no finite cast-limited HPS: this game has no GCD. HPM uses actual Mana. Effective healing may be far lower than raw ceilings. Spell Power contributes once to each spell's configured budget (per ally for party spells); Haste increases direct throughput and normal HoT tick frequency; Crit is independently 1.5x. These conventions make gear-level simulation necessary later.

## Baseline comparison

| Spell | Healing | Mana | HPM | HPS / timing |
| --- | ---: | ---: | ---: | --- |
| Priest Flash Heal | 90 | 30 | 3.00 | 60, 1.5s response |
| Greater Heal | 200 | 45 | 4.44 | 66.67, 3s response |
| Prayer | 500 party | 75 | 6.67 | 166.67 party, 3s response |
| Penance | 120 | 30 | 4.00 | 60 while channeling; 10 per cooldown second |
| Smite | 2.5 Atonement | 4 | .625 | 1.67; also enemy damage |
| Holy Fire | 10 total Atonement | 8 | 1.25 | 1.67 per cooldown second, with pending DoT carry |
| Druid Rejuvenation | 150 | 30 | 5.00 | 10 passive per ally for 15s |
| Regrowth | 60 + 120 | 40 | 4.50 | 40 immediate cast HPS; 6.67 periodic |
| Swiftmend | 130 | 35 | 3.71 | Instant; 8.67 per cooldown second; requires HoT |
| Wild Growth | 480 party | 70 | 6.86 | 60 party for 8s; 48 per cooldown second |
| Nourish | 80/110/140/170 at 0/1/2/3 core HoTs | 30 | 2.67/3.67/4.67/5.67 | 40/55/70/85 sustained pooled throughput, 2s casts |
| Shaman Surge | 132 per 6s contribution | 24 | 5.50 | 22 passive; 1.5s application; 18s bank cap |
| Wave | 110 | 28 | 3.93 | 44, 2.5s response |
| Riptide | 40 + 162 | 32 | 6.31 | 9 periodic per active ally; instant 40; 6s cooldown |
| Chain Heal | 352.968 | 65 | 5.43 | 141.19 party; 2.5s response; smart distinct jumps |
| Unleash Life | 90 + one empowerment | 24 | 3.75 before empowerment | Instant; 6 direct per cooldown second |
| Stream | 192 | 35 | 5.49 | 16 smart while active; 12.8 per cooldown second |

Shaman tank maintenance, without refresh clipping:

| Rotation/window | Raw HPS | Mana/s or window cost | HPM |
| --- | ---: | ---: | ---: |
| Riptide every 18s + Wave filler | 55.22 | 12.98/s | 4.26 |
| Riptide + Surge every 6s + Wave filler | 66.22 | 14.18/s | 4.67 |
| Surge maintenance + Wave | 55.00 | 12.40/s | 4.44 |
| Pre-banked Surge + Wave, while bank lasts | 66.00 | 11.20/s, excluding prepaid bank | 5.89 excluding prepaid bank |
| Unleash + Wave burst | 222 in 2s = 111 | 52 | 4.27 |
| Unleash every 15s + Wave filler | 52.93 | 13.17/s | 4.02 |
| Normal Chain | 352.968 in 2.5s = 141.19 | 65 | 5.43 |
| Empowered Chain | 423.562 in 2s = 211.78 | 65, plus prior Unleash | 6.52 excluding Unleash |
| Unleash + Chain burst | 513.562 in 2s = 256.78 | 89 | 5.77 |
| Stream added every 15s | +12.80 | +2.33/s | 5.49 incremental |

Pre-banking moves actions and expenditure earlier; it cannot generate free sustained healing. Maintaining single-target Riptide every 6s replaces pending healing and is substantially worse than its full-budget HPM unless Flowing Riptide is learned. Riptide can maintain three allies with the baseline cooldown, but that consumes 5.33 Mana/s. All instant-spell estimates permit casting between filler casts without a GCD.

Comparison tank ceilings: Greater Heal spam is 66.67 HPS at 15 Mana/s; Penance every 12s with Greater filler is 65.56 HPS at 15 Mana/s. Rejuvenation + Regrowth every full duration + two-HoT Nourish filler gives about 84.17 HPS at 17.97 Mana/s (4.68 HPM), excluding refresh/tick losses. Druid must prepare delayed pools, Shaman banks periodic healing, and Priest delivers more immediate direct healing. Shaman Stream is smart and passive while Prayer is immediate party recovery and Wild Growth distributes passive healing even to allies who do not need it.

Mana: with 600 capacity and 2/s regeneration, the 66.22 HPS Shaman rotation depletes in about 49.27s at full demand; Greater spam in 46.15s; the prepared Druid rotation in 37.57s. These are pressure ceilings, not recommended automatic rotations. Waiting, overheal avoidance and gear change them substantially. Shaman's weaker standalone Wave does not justify a baseline numeric change because its layered tank ceiling already matches Priest efficiency.

## Every node: proposed versus final and marginal value

All provisional numbers are retained except Healing Tide's tick healing, reduced from 16 to 14. No baseline values change. Every row has three nodes; rank sums are 6/5/3/3 = 17; 8 points and total-spent gates 0/2/4/6 remain shared with Priest/Druid.

| Node (row/ranks) | Final configuration | Marginal raw/effective value, economy and peers |
| --- | --- | --- |
| Tidal Reserves (1/2) | +10/20% all Shaman regeneration | +.2/.4 Mana/s naked, +12/24 per minute; no direct healing/action gain. At maintenance HPM 4.67, +.93/1.87 sustainable HPS. Matches Priest 10/20%; below Druid 20/40%. Gear regeneration scales too. |
| Deep Riptide (1/2) | +10/20% periodic only | +16.2/+32.4 full healing, total 218.2/234.4; HPM 6.82/7.33; +.9/1.8 HPS per maintained ally. Each second rank adds another 16.2. Direct remains 40. Similar to Rejuvenation +15/+30; strongest with Flowing's saved budget. |
| Tidal Momentum (1/2) | Wave +10/20% on own Surge target | +11/+22 direct, Wave 48.4/52.8 HPS, 4.32/4.71 HPM. Conditional at completion. Competes with Deep's efficient periodic gain versus urgent tank healing; Priest Binding Light adds 13.5/27 effective spill on Flash, but to another ally. |
| Tidal Waves (2/1) | Riptide replaces stored state with 2 charges; next two Waves/Chains -20% cast | 2.5s becomes 2s, +25% eligible cast HPS, no HPM change. Saves 1s per two casts (44 Wave or 141.19 Chain filler healing per saved second). Unlike Post-Haste there is no Mana discount. Successful completions consume; cancellation/dead primary preserve. |
| High Tide (2/2) | jump loss 17.5/15%, first hit unchanged | Chain totals 370.691/389.406: +17.723/+36.438 (+5.02/+10.32%); HPS 148.28/155.76; HPM 5.70/5.99. Second rank adds 18.715. Weak with only one or two wounds, stronger on later injured jumps. Modest compared with Lingering Prayer's conditional +150 party healing. |
| Restorative Stream (2/2) | Stream +15/30% | +28.8/+57.6 per cast, HPM 6.31/7.13; +1.92/+3.84 cooldown HPS. Each rank adds 28.8. Passive smart healing, but full-health ticks are lost. Does not buff Tide. Ward adds a new 180-heal/45-Mana action (4 HPM), rather than modifying a baseline cooldown. |
| Flowing Riptide (3/1) | 2 sequential 6s charges, move remainder above 90%, release old remainder on recast | No new healing budget on movement/recast: recovers otherwise lost pending healing. Refresh after 6s can preserve 108 baseline periodic healing; effective instant burst becomes 40+108. Charge storage improves opening coverage, not long-run 1/6s recharge. Similar to Overgrowth's pending-budget recovery, but no Mana discount or cooldown-bypass cast. |
| Echoing Surge (3/1) | 50% of effective primary tick to other wounded living ally | Up to +22/tick, +66/full extension; total 198, HPM 8.25; +11 periodic HPS per fully useful Surge. Zero when primary overheals fully; no recursion and no second Crit roll. Effective semantics match Binding Light and prevent full-health bank farming. Raw semantics would allow +11 HPS even on a full-health bank owner, so are rejected. |
| Double Current (3/1) | Unleash stores 2 full empowerments, replacing prior state | Extra Wave +22 and .5s saved (about another 22 filler); extra Chain +70.594 and .5s saved (about 70.594 filler); +2.93 or +9.41 HPS per 15s use if both are useful. No cost discount, expiry or additive Unleash stacking. Competes with Echo's sustained multiple-target value and Flowing's budget recovery. |
| Earthliving (4/1) | Wave +6s Surge; each Chain target +2s, common 18s cap | At empty banks Wave adds 132, total 242 (8.64 HPM); Chain adds 220 over five targets, total 572.968 (8.82 HPM). These are contribution ceilings, not permanent throughput: repeated Waves fill the bank, so sustained single-target addition remains 22 HPS. One-tick Chain contributions use full-kit Surge tick scaling once, not a fresh full Spell Power budget on every target. Compared with Nourishing Touch rank 2, prepared Druid adds 100 from Rejuvenation+Regrowth or 124 with Wild Growth every 2s, uncapped. |
| Healing Tide (4/1) | **14** per ally each 1s, 8s, 80 Mana, instant, 60s CD | 560 party total, 70 active party HPS, 7 HPM; 9.33 cooldown HPS. Proposed 16 gives 640/8 HPM and excessive efficiency plus full casting freedom relative to Tranquility 750/7.5 HPM with 5s occupied. Final 8s Tide+Wave window = 912 versus Tranquility+3s Wave = 882. Different delivery curves and two talents' cost make this an estimate, not equality. |
| Ancestral Echo (4/1) | 40% Wave effective heal to other injured ally | Up to +44, Wave 154 total (61.6 HPS, 5.5 HPM). No primary healing gain; no independent Crit because effective input already includes Crit. Priest Echo of Grace is 20% raw on both Flash/Greater: +18/+40 (72/80 combined HPS), so Shaman needs the larger percentage on its weaker Wave. |

Every throughput modifier has an overheal/availability condition, except Mana regeneration. Charge/timing nodes chiefly shift actions and coverage; assigning infinite instant-cast HPS would obscure their value. Spell Power on adjusted periodic-only Riptide changes the shared proportional direct/periodic distribution slightly: base direct stays 40, but at nonzero power the total-budget factor is recalculated by the existing shared rule. This is not a separate direct-heal talent bonus.

## Major cooldown comparison

### Current Priest/Druid rank benchmarks

These are implemented mechanics, including conditional value and rank-2 storage effects. They contextualize each Shaman row without changing either existing tree.

| Priest node | Implemented marginal value at zero gear |
| --- | --- |
| Conservation (row 1, 2 ranks) | +10/20% regeneration = +12/24 Mana per minute naked. |
| Binding Light (1, 2) | +15/30% effective Flash healing: up to +13.5/+27 per cast; combined 69/78 HPS and 3.45/3.90 HPM if a secondary is wounded. |
| Early Mercy (1, 2) | Moves 60/100 Greater healing to halfway (1.5s), leaving 140/100 at completion. No complete-cast raw/HPM gain; cancellation preserves the delivered portion but loses the full 45 Mana charged at start. |
| Post-Haste (2, 2) | Flash generates up to 1/2 stored stacks, each -20% cast and cost for Greater/Prayer. Empowered Greater 83.33 HPS / 5.56 HPM; Prayer 208.33 party HPS / 8.33 HPM. Flash+Greater rotation 74.36 HPS / 4.39 HPM, including setup. Rank 2 adds storage, not a second reduction. |
| Focused Penance (2, 2) | Cooldown 12→10→8s; 120-heal cooldown throughput 10→12→15 HPS. Replacing Greater filler with baseline Penance actually slightly lowers total raw HPS (Penance's cast HPS is 60 versus Greater's 66.67); extra value comes from fast bolts, cheaper individual actions, damage flexibility and Fourfold synergy. |
| Lingering Prayer (2, 1) | Up to +30 per ally still below 70% after direct Prayer, +150 over 6s on five qualifying allies. 650 total / 75 Mana = 8.67 HPM ceiling. |
| Fourfold Penance (3, 1) | Three main healing bolts plus one smart 60-heal bolt = 240 rather than 120 in the same 2s and 30 Mana: up to +120, 120 cast HPS, 8 HPM. Offensive use has 45 main damage/Atonement plus a smart heal. |
| Echo of Grace (3, 1) | +20% raw Flash/Greater: +18/+40 when another ally is wounded, combined 72/80 HPS and 3.6/5.33 HPM. Early Mercy also triggers it. |
| Light Unspent (3, 1) | Redistributes 40% Prayer direct overheal, limited by remaining wounds. Example four full allies and one missing 300: 100 direct + 160 spill = 260 effective instead of 100, not 500+160 raw useful healing. |
| Twin Penance (4, 1) | Two sequential-recharge charges; adds one opening/held 120-heal baseline cast or 240 with Fourfold, not a doubled sustained recharge rate. |
| Sanctuary (4, 1) | Free .2 × actual incoming party damage over 12s; 60s cooldown; examples below. |
| Divine Fervor (4, 1) | Free 20% Haste and 20% lower Mana cost for 15s; 60s cooldown; examples below. |

| Druid node | Implemented marginal value at zero gear |
| --- | --- |
| Natural Regeneration (row 1, 2 ranks) | +20/40% all regeneration = +24/48 Mana per minute naked. |
| Empowered Rejuvenation (1, 2) | +15/+30 over 15s: +1/+2 passive HPS per ally, total HPM 5.5/6. |
| Nourishing Touch (1, 2) | Each Nourish adds 1/2 normal-strength ticks to every active qualifying HoT, uncapped. Rejuvenation+Regrowth add 50/100; adding Wild Growth gives 62/124; triggered Ward adds another 30/60. Rejuvenation rank-2 ticks make the two-HoT gain 56/112. No extra action/Mana cost; potentially very strong on prepared allies. |
| Passing Bloom (2, 1) | Regrowth refresh moves old periodic effect to a qualifying other ally refreshed to 9s = 60 healing at normal strength, irrespective of its old remainder; no destination means zero. Same 40-Mana Regrowth action. |
| Cenarion Ward (2, 2) | Adds 1/2 sequential 30s charges, each 45 Mana for 180 healing after trigger (4 HPM, 30 active HPS, 6 cooldown HPS). Second rank adds opening/storage coverage, not recharge throughput. |
| Abundant Nourishment (2, 2) | +20/+40 per core HoT type: +40/+80 with two types (Nourish 180/220, 90/110 cast-throughput HPS, 6/7.33 HPM), +60/+120 with three (230/290, 115/145 HPS, 7.67/9.67 HPM), before extensions. |
| Blooming Swiftmend (3, 1) | +39 each to up to two other allies = +78, total 208/35 = 5.94 HPM; +5.2 cooldown HPS. Requires primary HoT but preserves it. Secondary amounts use raw primary base scaling. |
| Overgrowth (3, 1) | Wild Growth 70→56 Mana (HPM 6.86→8.57) and 1s recast during cooldown with pending budget carried; transfers 50% of remainder above 90% after tick. Recovers wasted healing, can preserve nearly 480 party healing on an early recast, but repeated new applications spend Mana rapidly. |
| Living Rejuvenation (3, 1) | 20% faster ticks below 50% and HoT movement at full Health. From scratch at zero gear, low-health interval 2.5s fits six 30-heal ticks in 15s (180 rather than 150); raw benefit depends on time below threshold. Movement improves effectiveness rather than intentionally adding a new pool. |
| Genesis (4, 1) | Free restore-full-duration core HoTs plus 15% faster ticks for 8s, preparation-dependent budget; examples below. |
| Twin Rejuvenation (4, 1) | Two independent paid HoTs on one ally: +150 opening budget for +30 Mana and sustained single-target Rejuvenation 20 rather than 10 HPS for twice the maintenance Mana. Amplifies Nourishing Touch because both instances extend. |
| Tranquility (4, 1) | 750 party healing / 100 Mana over 5s, 60s cooldown; 150 party channel HPS / 7.5 HPM, caster occupied. |

Current Priest Binding Light/Echo of Grace and Druid secondary heals can independently Crit again. Shaman's effective-input echoes intentionally do not: the primary already includes Crit, and a second roll would multiply their expected gain again. BAT-87 must account for this difference instead of assuming all spillover implementations have identical gear scaling.

Sanctuary is free: prevents .2 times actual incoming damage for 12s, not a fixed heal. For 100/200/300 incoming party DPS its ceilings are 240/480/720 prevented; it can prevent lethal damage. Divine Fervor is free: 15s at 20% Haste and 20% less Mana. Greater spam changes 66.67 to 80 HPS and 15 to 14.4 Mana/s while active, about +200 raw healing and 9 Mana saved over 15s; Prayer adds about +500 raw party healing. Post-Haste reductions multiply with it. Benefits cease when cast time or wounds are not the bottleneck.

Genesis is free and depends on active core HoTs: nearly expired Rejuvenation+Regrowth on one ally can recover about 270 healing before faster ticks; five such preparations about 1350, plus near-expired Wild Growth up to another 480. Early refreshes add little. Nourish/Ward are excluded. Tranquility gives 750 party healing over 5s for 100 Mana, 150 channel HPS, 7.5 HPM, interrupted channels lose unlanded ticks. Tide gives less party healing and slower delivery but allows normal casting, has no preparation requirement, and persists alongside Stream. It cannot be compared to Genesis by a single preparation-independent total.

## Multiplicative interactions and safeguards

- Deep+Flowing: remaining 4 ticks at 6s are 108/118.8/129.6. Recast releases only those ticks and adds the new 40 direct + 162/178.2/194.4 periodic budget. Movement keeps its object, next tick, expiry and pending total; no new direct event. Strictly above 90% after a tick, destination wounded and without Riptide, no recursive transfer in that tick.
- Momentum+Earthliving: first unprepared Wave stays 110 and installs Surge; subsequent Wave is 132. With maintained Surge, sustained tank ceiling is 52.8+22=74.8 HPS, not (132+132)/2.5=105.6 forever. The latter clips heavily at 18s.
- Waves+two charges: two instant Riptides still replace Waves with 2 charges, never 4. Recharge stays one per 6s. With Unleash, eligible cast reductions multiply: 2.5*.8*.8=1.6s; Surge receives only Unleash and remains 1.2s.
- High Tide+Unleash+Double: rank-2 Chain is 389.406; empowered 467.288 in 2s (233.64 HPS) or 1.6s with Waves (292.06 HPS). Two empowerments total 934.575/130 Mana (7.19 HPM excluding prior 24-Mana Unleash). One stored state, not repeated additive grants.
- Stream+Tide: rank-2 Stream 249.6 + Tide 560 = 809.6 for 115 Mana (7.04 HPM) over their individual schedules. Independent active instances; Stream remains single-target smart while Tide ticks all living allies. Stream talent never applies to Tide.
- Echo+Earthliving: empty Wave bank adds at most 132+66=198 periodic healing if primary and other ally are both wounded; five Chain banks add 220+110=330. Each contribution uses the normal Surge tick profile once; Unleash gives newly created ticks 52.8, not 63.36. Existing queued values never rescale. Effective echo gives no healing from overheal, crit is already included in its input, no secondary Crit and no recursion.
- Ancestral+Unleash: 132 useful Wave generates 52.8 echo; Momentum rank 2 gives 158.4 and 63.36 echo. With Waves, total 221.76/1.6=138.6 direct+echo HPS, excluding bank. Earthliving uses Surge strength (52.8 empowered), independent of Momentum's direct-only bonus. All echo targets exclude the primary and dead/full-health allies.

These examples can combine more than the allowed eight points. They are upper-bound pairwise checks, not legal recommended complete builds. BAT-87 must compare valid eight-point allocations.

## Implementation and remaining validation

Implement the reviewed values using the shared tree/progression/settings conventions. Preserve baseline ability order and saved bindings, append Tide on key 7, persist inactive talent ability settings through refund/relearn. Existing v1 talent save supports a new healer tree without schema changes; previously earned Shaman milestones must survive. No encounter or Priest/Druid changes are warranted here.

BAT-87 uncertainties: useful wounds and echo effectiveness, instant-action policy, Riptide redistribution under gear Haste, cap clipping from rapid empowered casts, Stream/Tide overlap, legal build opportunity costs, long-run Mana exhaustion, chapter resource carry and missing Shaman class gear catalogue. Seeded encounter and gear parity tuning remain deferred to that BAT.

## Implementation and validation results

- Implemented all twelve nodes, 17 ranks, independent eight-point progression and unchanged shared gates/refund conventions. Numerical configuration is in `src/data.js`; loadout adaptation is in `src/shaman-talents.js`; combat remains independent of rendering.
- Existing talent-save v1 schema accepts the new tree without an incompatible version bump. Regression tests cover previously earned Shaman milestones, other-healer allocations, and baseline ability settings. Tide remains in the settings catalogue when refunded, preserving its order and binding on relearn.
- Flowing transfers one HoT object, keeps its expiry/next tick, and preserves pending periodic healing through Haste changes. A per-step processed-effect guard prevents movement into a later party slot from processing the same tick twice. Recast releases old pending healing before the fresh direct heal and HoT; the release rolls one normal Crit for the aggregate budget (same expected value as independent future ticks, different variance).
- Earthliving calls the normal full-kit Surge healing profile with a separate contribution duration. This prevents treating a one-tick Chain segment as a fresh full Spell Power budget. Both Unleash and Tidal Waves reserve stored stacks at cast start and consume only after successful completion on living targets.
- Automated suite: **211/211 passed**, including all prior 188 tests and 23 focused Shaman talent tests. Coverage includes every rank, source immutability, gates/budget/respec, persistence, sequential charges, strict thresholds, exclusions, remaining-budget conservation, mixed empowered banks/caps, no recursive echo/second Crit, Totem coexistence/final ticks/replacement, death/end/reset and pause.
- Browser QA on separate local port 5174: production Team page shows all 12 nodes and correct row rank counts; gates unlock at 2/4/6 points; eight points disables further learning; refund all restores eight unspent points and removes Tide; relearning restores it. Reordered Tide before Stream and bound it to `Shift+T`; both preferences and allocations survive reload/refund/relearn. Checked configured spellbook/tooltips including Riptide 2/2 charges, 90% threshold, Deep rank-2 periodic budget and Tide 14/1s/8s/80 Mana/60s cooldown.
- Live Briar Threshold QA via normal keyboard input: spent both Riptide charges (0/2 displayed), cast Unleash, Stream and custom-bound Tide, cancelled a doubly accelerated Wave and verified both buffs retained two available stacks. Completed the next Wave; both buffs fell to one, empowered Earthliving bank showed 105.6 remaining healing in two ticks, and both Totems continued while casting. Verified paused timers and effects in panel and immersive views. Browser console reported no warnings or errors. Screenshots are local ignored QA artifacts under `.tmp/`.
- No encounter retuning or seeded balance sweep performed. BAT-87 owns the valid-build simulation pass; this report records analytical ceilings and uncertainty, not demonstrated encounter parity.

Git: the user authorized committing and pushing the combined BAT-85 baseline and BAT-86 talent implementation on `dev`, after the combined 211-test suite, browser QA and Git diff checks passed. BAT-87 simulation tuning follows this checkpoint.
