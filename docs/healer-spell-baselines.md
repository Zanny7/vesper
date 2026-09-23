# Priest and Druid Spell Baselines

Reference for planning healer spell balance in Vesper. Values below describe the base spell books with no talents, gear, temporary buffs, or spell power unless stated otherwise. They are sourced from `src/data.js` and the combat rules in `src/combat.js` / `src/stats.js`.

## Shared baseline rules

- Healers start with **600 Mana**, regenerate **2 Mana per second**, and have **0 Spell Power** before gear. `baseMana` is 30; fractional spell costs in the data are multipliers of this value.
- A spell's listed cast time is its base time. Haste can shorten casts. Instant spells complete immediately. Mana for ordinary casts is paid on completion; instant spells and channels pay at cast start. Interrupted ordinary casts do not spend Mana; channel Mana is already spent.
- Positive healing scales with Spell Power: the implementation adds Spell Power to the spell's total base healing, then scales its direct and HoT components proportionally. Druid Nourish's per-HoT bonus is added after this scaling and does not itself scale with Spell Power. Damage values currently do not scale with Spell Power.
- HoTs tick on their listed interval and stop after the listed duration. Refreshing a base Druid HoT replaces it and restarts its duration and tick timer, discarding remaining ticks. Dead allies are not healed; party spells affect each living party member, including the healer.
- Mana efficiency below uses raw potential healing/damage divided by base Mana cost. It ignores overhealing, healing wasted on full-health targets, damage mitigation, and opportunity cost unless called out.

## Priest base spell book

| Spell | Mana | Cast/channel | Direct heal | HoT / damage | Cooldown / conditions | Baseline efficiency and notes |
|---|---:|---:|---:|---|---|---|
| Flash Heal | 30 | 1.5s cast | 100 | — | — | 3.33 healing/Mana; 66.7 raw healing/s while casting. Single living ally. |
| Greater Heal | 45 | 3s cast | 200 | — | — | 4.44 healing/Mana; 66.7 raw healing/s. Single living ally. |
| Prayer of Healing | 75 | 3s cast | 100 per living ally | — | — | 1.33 healing/Mana per target; up to 500 total / 6.67 healing/Mana for five living injured allies. Total party throughput is 166.7 healing/s when all five receive the full amount. |
| Penance | 30 | 2s channel | 120 total to one ally, in two 60 heals at 1s and 2s | When cast on enemy: two 15 damage bolts, 30 total | 12s; dual-target: ally or enemy | Ally heal: 4.0 healing/Mana; 60 healing/s over the channel. Enemy mode's two bolts each trigger Atonement. |
| Smite | 4 | 1.5s cast | — | 12 enemy damage | — | 3 damage/Mana. Triggers Atonement on hit. |
| Holy Fire | 8 | Instant | — | 11 immediate damage + 25 over 10s (five 5-damage ticks); 36 total | 6s | 4.5 total damage/Mana. Initial and periodic damage each trigger Atonement. Recasting carries pending DoT damage into the refreshed 25-damage pool. |

### Priest-specific combat rules

- **Atonement** heals the currently most-injured living ally for **40% of each qualifying damage event**. It includes the Priest. Companion attacks do not trigger it. Healing is wasted if there is no injured ally.
- Thus Smite's 12 damage produces up to **4.8 Atonement healing**; enemy Penance's two 15-damage hits produce up to **12 total**; Holy Fire's 36 base damage produces up to **14.4 total** over its full duration. Actual effective healing can be lower due to overheal, target changes, or ending the fight early.
- Penance spends Mana and begins its cooldown at cast start. Its ally channel lands two healing bolts across the 2s channel; enemy mode lands two damage bolts and triggers Atonement per bolt.

## Druid base spell book

| Spell | Mana | Cast | Direct heal | HoT | Cooldown / conditions | Baseline efficiency and notes |
|---|---:|---:|---:|---|---|---|
| Rejuvenation | 30 | Instant | — | 25 every 3s for 15s; 5 ticks, 125 total | — | 4.17 healing/Mana; 8.33 raw healing/s across its full duration. Refresh replaces remaining ticks. |
| Regrowth | 40 | 1.5s | 50 on completion | 20 every 3s for 18s; 6 ticks, 120 total | — | 170 total / 4.25 healing/Mana. HoT begins 3s after application. Refresh replaces remaining ticks. |
| Swiftmend | 35 | Instant | 160 | — | 15s; requires Rejuvenation, Regrowth, or Wild Growth on target | 4.57 direct healing/Mana before accounting for the consumed HoT. Consumes the eligible HoT with the shortest remaining duration. |
| Wild Growth | 70 | Instant | — | 10 every 1s for 8s; 8 ticks, 80 per living ally | 10s | 1.14 healing/Mana per target; up to 400 total / 5.71 healing/Mana if five living allies receive all ticks. Each ally gets an independent HoT. |
| Nourish | 30 | 2s | 80 + 20 per distinct active Druid HoT on target, up to three HoT types | — | — | 80–140 total; 2.67–4.67 healing/Mana and 40–70 raw healing/s. HoTs are checked when the cast completes. |

## Talent-unlocked spells and baseline talent deltas

These are not in the base kit. They become available through their named talent. Costs are their untalented spell values; other talent effects may change the numbers or rules below.

### Priest talents

| Talent spell or change | Effect |
|---|---|
| Quick Remedy (Flash Heal) | Reduces Flash Heal cost by 3 Mana per rank (two ranks: 30 → 27 → 24). |
| Measured Casting (Greater Heal) | Reduces cast time (3.0 → 2.8 → 2.5s). |
| Post-Haste | Flash Heal grants a stack (up to talent rank). One stack reduces a subsequent Greater Heal or Prayer cast time and Mana cost by 20%; each empowered cast consumes a stack. |
| Focused Penance | Reduces Penance cooldown (12 → 10 → 8s). |
| Lingering Prayer | Prayer also applies a 6s HoT, ticking every 2s for 20% of that cast's direct heal per tick (three ticks; base 100 direct means 20 each, 60 extra per living ally). |
| Threefold Penance | Penance adds a third 60-healing main bolt and a 60-healing smart bolt at 2s. In ally mode the main target receives 180 total, plus 60 to the lowest-health other ally; in enemy mode the three main bolts deal 15 each (45 total) and the smart bolt heals an ally for 60. |
| Echo of Grace | Flash Heal and Greater Heal echo 20% of their direct heal to another wounded ally. |
| Light Unspent | Prayer redistributes half its direct overhealing evenly among injured allies. |
| Twin Penance | Adds a second Penance charge; charge recharge duration is its cooldown. |
| Sanctuary | Instant, 0 Mana, 90s cooldown. Reduces party damage taken by 20% for 10s. |
| Divine Fervor | Instant, 0 Mana, 90s cooldown. Grants the healer 20% Haste or a companion 20% attack speed for 20s. |
| Conservation of Faith | Increases Priest Mana regeneration by 10% per rank. |

### Druid talents

| Talent spell or change | Effect |
|---|---|
| Empowered Rejuvenation | Rejuvenation HoT healing increases 10% per rank (two ranks). |
| Nourishing Touch | Nourish cast time (2.0 → 1.8 → 1.6s). |
| Preserved Growth | Swiftmend no longer consumes the required HoT. |
| Passing Bloom | Regrowth can move an existing Regrowth HoT to an eligible unmarked ally before refreshing the target. |
| Cenarion Ward | Instant, 45 Mana, 30s cooldown. Ward lasts 20s; after the ally takes damage, they receive 20% increased healing for 10s. |
| Abundant Nourishment | Adds 5 healing per active HoT type to Nourish per rank (at most three types; +15 maximum at rank 2). |
| Blooming Swiftmend | Swiftmend also heals every other living party member for 20% of its direct heal (32 base each). |
| Overgrowth | Allows Wild Growth during its cooldown with a 1s cast and carries pending Wild Growth healing forward into the refreshed HoTs. |
| Living Rejuvenation | Rejuvenation ticks 20% faster while its target is below 50% Health. When its target is full, each tick can move the HoT state to the most-injured eligible ally without exceeding the Rejuvenation instance cap. |
| Genesis | Instant, 0 Mana, 60s cooldown. Extends active Druid HoTs by 10s and adds normal ticks. |
| Twin Rejuvenation | Allows two independent Rejuvenation effects on one target. |
| Tranquility | 100 Mana, 5s channel, 90s cooldown. Heals each living party member for 30 each second for 5s (150 per ally; up to 750 for five living allies). |

## Balance comparison at a glance

- Base single-target raw healing efficiency: **Swiftmend** gives 4.57 healing/Mana before counting its consumed HoT; Greater Heal gives 4.44, and Penance gives 4.0 but delivers it during a 2s channel.
- Sustained, pre-cast healing is central to Druid: Rejuvenation is efficient on one target, while Wild Growth gets substantially more efficient when multiple allies need healing. Recasting early sacrifices remaining ticks.
- Priest's efficient group heal depends on several allies actually needing its full 100 healing. Prayer's 5-target maximum is 500 for 75 Mana, while a partially useful cast retains the same cost and 3s cast time.
- Priest damage spells also provide Atonement. Compare damage efficiency and healing efficiency separately, and account for Atonement target selection/overheal; it is not equivalent to a guaranteed extra heal.
- Raw totals are upper bounds. Effective healing depends on damage timing, existing HoTs, target health caps, deaths, and how much of each DoT/HoT resolves before the encounter ends.

## Source pointers

- Base values and healer resources: `src/data.js` (`CONFIG`, `SPELLS`, `DRUID_SPELLS`, healer initialization).
- Cast, cost timing, cooldowns, ticks, Atonement, and HoT refresh behavior: `src/combat.js`.
- Spell Power healing rule: `src/stats.js` (`healingParts`).
- Talent modifications/unlocks: `src/priest-talents.js`, `src/druid-talents.js`, and `src/talent-trees.js`.
