# BAT-80 Priest healing expectations

These are spell-math baselines for the redesigned Priest kit, for BAT-82 to use as simulation starting points. They assume the current spell values in `src/data.js`, zero Spell Power, zero Haste and Crit, no healing received modifiers, full Mana costs, and no overhealing unless stated. Effective HPS falls when healing overheals; party totals assume every named target is alive and injured enough to receive the full amount.

## Throughput and efficiency

| Spell / situation | Healing over a cast | Cast time | Mana | Expected HPS | Expected HPM |
| --- | ---: | ---: | ---: | ---: | ---: |
| Flash Heal, one target | 90 | 1.5s | 30 | 60 | 3.00 |
| Flash Heal with Binding Light rank 1, both heals effective | 103.5 | 1.5s | 30 | 69 | 3.45 |
| Flash Heal with Binding Light rank 2, both heals effective | 117 | 1.5s | 30 | 78 | 3.90 |
| Greater Heal, one target | 200 | 3s | 45 | 66.7 | 4.44 |
| Prayer of Healing, one target | 100 | 3s | 75 | 33.3 | 1.33 |
| Prayer of Healing, five targets | 500 | 3s | 75 | 166.7 party-wide | 6.67 party-wide |
| Prayer of Healing, five targets all eligible for Lingering Prayer | Up to 650 total, including 30 per target over 6s | 3s, then HoT ticks | 75 | 166.7 during the cast; 50 additional party healing per 2s tick | Up to 8.67 party-wide |
| Penance, two healing bolts on one target | 120 | 2s channel | 30 | 60 | 4.00 |
| Fourfold Penance, three main bolts plus a smart bolt | 180 main-target + 60 other-target | 2s channel | 30 | 120 party-wide | 8.00 party-wide |

Binding Light uses 15% / 30% of Flash Heal's *effective* primary heal, so primary-target overhealing lowers its extra healing. The secondary target is the lowest-health eligible other living ally after the primary heal.

Early Mercy does not change Greater Heal's total healing, Mana cost, or cast duration. It delivers 30% / 50% halfway through the cast and the remainder at completion. The current interrupt rule charges the full 45 Mana at cast start; interrupting before halfway produces no heal, while interrupting after halfway keeps the provisional heal and does not refund Mana.

Lingering Prayer adds up to 30% of each qualifying target's direct Prayer heal across the six-second effect. It is applied only when the target is still below 70% Health after the direct heal. The configured HoT keeps its total healing fixed at 30% when Haste changes its tick interval.

Light Unspent redistributes 40% of Prayer's direct overhealing evenly across allies who remain injured after all direct heals. It does not increase healing when Prayer has no overheal or no injured recipients.

## Talent and cooldown context

- Conservation of Faith adds 10% / 20% of the Priest's base Mana regeneration. At the current 2 Mana per second, that is +0.2 / +0.4 Mana per second, before Mana caps.
- Focused Penance subtracts 2 / 4 seconds from the spell's configured base cooldown. With today's 12-second base, the results are 10 / 8 seconds. Twin Penance stores two charges and recharges each at that resulting cooldown.
- Sanctuary reduces all party damage by 20% for 12 seconds on a 60-second cooldown. At continuous maximum-uptime use, its theoretical long-run reduction averages 4% across affected incoming damage.
- Divine Fervor grants the Priest 20% Haste and 20% lower spell Mana costs for 15 seconds on a 60-second cooldown. Its maximum-use uptime is 25%; while active, a spell's Mana efficiency increases by 25%. The cost reduction multiplies with Post-Haste's 20% reduction, for a combined 36% reduction on a stack-consuming Greater Heal or Prayer.

## Questions for BAT-82

- Measure Binding Light's secondary-target value when the primary heal is partly or fully overhealing, including the chance its smart target caps before the extra heal lands.
- Measure Early Mercy's value under boss burst timing and interrupted casts. Its retained provisional healing and non-refunded start cost are deliberate; its potential to rescue an ally before a lethal hit needs encounter testing.
- Measure Lingering Prayer proc rates at real party damage levels. The below-70% check happens after Prayer resolves, so targets that Prayer lifts to 70% or more receive no HoT.
- Measure Light Unspent with realistic overheal distributions and uneven damage across the party.
- Compare Fourfold Penance's smart bolt and the two-charge Penance cooldown across healer builds; these changes increase practical multi-target throughput beyond the old baseline.
- Measure Sanctuary and Divine Fervor timing in actual boss phases. Their 60-second cooldowns and the existing one-cast-at-a-time flow constrain usable uptime.

These are initial expectations, not encounter retuning targets. BAT-80 leaves encounter and boss values unchanged for later combined simulation and balance work.
