# BAT-85 Shaman baseline spellbook

Implemented on `dev` after checking BAT-84: Linear marks it Done, its balance checkpoint and Chapter 4 investigation are committed as `3169e28` and `9f79b86`, and the working tree was clean. The historical BAT-84 reports still describe their unresolved balance deviations; this issue preserves those results and encounter values.

## Baseline kit

| Spell | Actual Mana | Base cast | Cooldown | Healing at zero Spell Power |
| --- | ---: | ---: | ---: | --- |
| Recurring Surge | 24 | 1.5s | — | 44 every 2s; each cast adds 6s, capped at 18s remaining |
| Healing Wave | 28 | 2.5s | — | 110 at completion |
| Riptide | 32 | Instant | 6s | 40 immediately + six ticks of 27 over 18s = 202 |
| Chain Heal | 65 | 2.5s | — | 105 → 84 → 67.2 → 53.76 → 43.008 = 352.968 |
| Unleash Life | 24 | Instant | 15s | 90 immediately + one stored empowerment |
| Healing Stream Totem | 35 | Instant | 15s | Six smart ticks of 32 over 12s = 192 |

All tuning is defined in `src/data.js`. Combat owns target selection, healing, scheduling, resources and empowerment. No global cooldown, talents, encounter tuning or Priest/Druid spell changes were added.

Surge keeps one effect per ally with one scheduled tick stream and a queue of each tick's original healing. Extensions append only newly scheduled ticks. Its cap is evaluated when the cast completes; clipped duration stores no hidden healing. Empowered ticks never replace or increase the existing queue. Final ticks are processed before an effect can be refreshed by a completing cast, following the existing combat order.

Unleash Life is reserved by an eligible cast but consumed only after completion on a living target. Cancellation, interruption, or losing the primary target preserves the stored empowerment. It has no timed expiration and does not reduce Mana cost. Instant spells preserve it. Healing Wave and Chain Heal cast in 2s; Surge casts in 1.2s before gear Haste.

Chain Heal resolves all jumps at completion, includes the healer, orders remaining living allies by Health percentage, and never repeats a target. Decimal healing is preserved internally. Totem has one active instance, chooses the lowest-Health-percentage injured living ally independently at each tick, and wastes full-Health ticks. It continues while casting and produces six scheduled opportunities, including the final tick at 12s.

Spell Power follows the shared proportional healing convention. Chain Heal distributes one Spell Power contribution across its full five-jump budget. Riptide distributes it between the direct heal and HoT. Surge applies it only to the new extension, and Totem distributes it across six ticks. Haste shortens cast times and Surge/Riptide tick intervals using the existing HoT convention; Totem retains its six fixed scheduled ticks. Crit rolls independently per heal or tick.

## Integration

Shaman is selectable on Team and has its own six-spell ability ordering and bindings. The character sheet and battlefield use a teal portrait and matching spell icons. Tooltips resolve values from combat, Surge frame indicators show remaining bank duration/healing, and the healer buff display distinguishes available and reserved Unleash Life empowerment. Incoming Wave/Chain healing reflects empowerment and current chain targets.

Shaman supports the existing universal equipment and healer-only trinket rules, with independent equipped slots and normal stat scaling. This baseline issue does not author a Shaman gear catalogue: class-specific Weapon/Tome items remain Priest/Druid-specific. Talent milestones can persist independently for later work, but Team clearly shows that Shaman talents are unavailable. Hard Reset includes the Shaman ability-settings key.

Pause freezes casts, ticks and cooldowns. Target death removes attached HoTs without resurrection; Shaman death cancels pending casts and clears the active Totem and empowerment immediately. Victory, defeat and encounter reset clear all Shaman encounter effects while chapter resource snapshots retain the existing persistent Health/Mana behavior.

## Validation

- `npm test`: **188/188 passing**, including all 167 pre-existing tests and 21 Shaman tests.
- Focused tests cover agreed values, completion timing, Surge extension/cap clipping/mixed empowerment/overhealing, independent banks, Riptide refresh, dynamic distinct chain targets, stored empowerment and cancellation, consecutive empowered casts, target death, Totem retargeting/wasted ticks/replacement/final ticks, Spell Power/Haste/Crit, pause, resource snapshots, reset, death and end cleanup, ability persistence, shared gear and effect/tooltips.
- Browser checks used an isolated local test origin for live combat. Verified Team selection, portrait, six-spell book/bar, empty talent state, all six spells via normal keyboard input, bank duration/effect indicators, cooldown displays, Chain Heal and Wave completion, and a cancelled empowered Wave returning to one available empowerment. Checked panel and immersive layouts; no browser errors or warnings were reported.
- No cross-healer encounter-balance sweep was performed: this is the agreed zero-talent baseline implementation, without encounter or existing healer retuning. Shaman talent design and comparative tuning belong to BAT-86/BAT-87.

The baseline was initially handed off uncommitted. After BAT-86 added the talent tree and passed the combined 211-test suite and browser QA, the user authorized committing and pushing BAT-85 and BAT-86 together on `dev`.
