# BAT-90 — Combat presentation

Implemented on `dev`, preserving the existing uncommitted BAT-89 work.

## Effect audit

Classification uses combat meaning rather than source/owner. Player cooldowns,
stored stacks and procs use the buff bar; statuses on an individual unit use its
frame. The player-effect registry is shared by both display adapters. Explicit
`displayScope: 'player' | 'unit'` supports future effects without class-specific
frame exceptions. Combat storage and mechanics are unchanged.

| Class / effect | Display | Reason |
| --- | --- | --- |
| Shaman Recurring Surge, including Earthliving-generated duration | Recipient frame | Actual per-target HoT |
| Shaman Riptide, including transferred Flowing Riptide | Current recipient frame | Actual per-target HoT |
| Shaman Tidal Waves, Unleash Life | Buff bar only | Stored player charges / empowerment, including cast reservations |
| Shaman Healing Stream / Healing Tide Totem | Buff bar only | Active player totems, independent of current heal recipients |
| Earthliving, Cascading Stream, Ancestral Echo, Tidal Momentum, High Tide | No extra status icon | Passive or instant effects; generated Surge stays on its actual recipient |
| Priest Lingering Prayer | Recipient frame | Per-target HoT |
| Priest Post-Haste, Divine Fervor | Buff bar only | Stored proc / self cooldown |
| Priest Sanctuary | Buff bar only | One active party-wide player cooldown |
| Druid Rejuvenation, Regrowth, Wild Growth, Nourish pool | Recipient frame | Per-target healing / stored healing pool |
| Druid armed Cenarion Ward and triggered Ward HoT | Recipient frame | Target-specific trigger and HoT |
| Druid Genesis | Buff bar only | Active acceleration, derived from affected living recipients' existing HoTs |
| Druid Swiftmend, Tranquility and passive talents | No extra status icon | Immediate healing / channel / passive modifiers |
| Encounter DoTs, debuffs and unit defense modifiers | Affected unit frame | Per-unit statuses, with existing debuff ordering preserved |

Lifebloom is not in the current spell kit. A future Lifebloom HoT would follow the
same default per-unit classification. No new passive Earthliving self buff is
invented or duplicated.

## Cooldowns and combat numbers

- Clockwise clearing conic wipe within the existing icon dimensions. Covered
  pixels retain the previous 48% brightness via a 52% black mask. Unavailable
  icons keep grayscale; usable charge abilities retain color. Text stays above
  the wipe and key/charge labels retain their existing placement.
- Overlay visibility follows recharge, independently of usability. The numeric
  label, tooltip and sweep all use the same next-charge timer and recharge
  duration. At full charges there is no timer or sweep. Overgrowth remains usable.
- Cooldown numbers use ceiling seconds, then `m:ss` at 60 seconds or longer.
  Near-integer floating-point drift is normalized within the combat clock's
  existing 1e-8 tolerance; positive timers never display zero.
- Healing/damage quantities round at presentation only: floating combat text,
  resolved spell tooltips, pending/banked healing, encounter damage summaries
  and Health totals. General timers/percentages retain their own formatter.
- No BAT-90 changes to combat rules, spell tuning, budgets or simulation math.

## Validation

- `npm.cmd test`: **241/241 passed**. Existing precision tests retained; new tests
  exercise the real 2 → 1 → 0 → 1 → 2 recharge sequence, ordinary cooldowns,
  Overgrowth availability, shared effect placement and fractional combat values.
- `git diff --check`: passed.
- Browser QA used the running local server and an ignored in-memory fixture at
  `.tmp/bat-90-qa.html` with production Combat, icons, CSS and render adapters.
  Verified Riptide usable at 1/2 with countdown/sweep, unavailable at 0/2,
  usable again at 1/2 with next timer reset; ordinary Totem cooldowns; correct
  Shaman buff/target separation; Priest Sanctuary/Fervor buff-only placement
  with Lingering Prayer on recipients; Druid Ward/Rejuvenation on target and
  Genesis in buff bar; integer resolved quantities and `1:00` long timers.
- Main-game Druid encounter smoke test verified production ability-bar
  integration, Wild Growth cooldown and target-frame effects, integer Health
  values and rounded Nourish tooltip values. No browser warning/error logs.
- Local QA captures are ignored: `.tmp/bat-90-shaman.png` and
  `.tmp/bat-90-main.png`.

Changes are uncommitted. Recommend a commit/push checkpoint for BAT-89 and
BAT-90, then review a `dev` → `main` milestone PR.
