# BAT-92 — Chapters 1–4 role gear

Implemented locally on `dev`, preserving the uncommitted BAT-89/BAT-90 work.
Gear values and category weights live in `src/data.js`; combat rules, spells,
talents and encounter definitions are unchanged by this issue.

## Catalogue and eligibility

The catalogue changes from 156 to 138 items. Character owners are removed from
shared items; only Sword/Staff/Bow retain their character restriction. Eligibility
uses an explicit `role` and the character's existing slot set. Healers and Tank
keep six slots; the three Damage companions retain their existing five slots.

| Slot | Before | Now |
| --- | --- | --- |
| Head / Chest / Legs | Class-authored items, cross-equippable; some Mana | Role: All; Health / Armor / Resistance only |
| Healer Weapon / Tome | Class-specific progressions | Role: Healer; shared SP / Mana / Regen |
| Healer Trinket | Class-authored; defensive extras | Role: Healer; shared SP / Mana / Regen |
| Tank Weapon | Damage with occasional defense | Role: Tank; Damage only |
| Shield | Defensive | Role: Tank; Armor first, Health and small Resistance |
| Tank Trinket | Defensive, occasionally Damage; cross-equippable | Role: Tank; defensive only |
| Damage Weapon | Damage with incidental defense | Role: Damage; Damage only, existing weapon/character restriction |
| Damage Trinket | Mixed offensive/defensive, cross-equippable | Role: Damage; Damage only, shared by all three Damage companions |

Armor retains its 84 existing IDs/artworks: seven variants for each armor slot
per chapter. They are authored as universal choices with Health-heavy,
Armor-heavy, Resistance-heavy and mixed budgets, with no character owner or
authored-owner equipment preference. Keeping enough distinct armor IDs lets
all five party members equip armor without sharing one item simultaneously.
Damage Trinkets likewise keep three distinct, shared items per chapter so
all three companions can fill the slot under unique ownership.

Chapters 1–2 have one shared healer item per throughput slot. Chapters 3–4
have two shared choices per slot, using the retained Priest/Druid artwork;
these are stat alternatives available to **every** healer, not class duplicates.

## Representative healer distribution

Entries below are **Spell Power / Max Mana / Mana Regen per second**.
Old values use the live pre-BAT-92 Shaman catalogue, captured in
`scripts/fixtures/bat91-gear.json`; all three old healer catalogues are retained
in the machine-readable probe report. New values show the primary shared items.

| Chapter | Old Weapon | Old Tome | Old Trinket | New Weapon | New Tome | New Trinket |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 9 / 0 / 0, +8 Health | 0 / 50 / .1 | 0 / 8 / .55 | 6 / 30 / .1 | 4 / 60 / .3 | 3 / 20 / .65 |
| 2 | 16 / 0 / .25 | 3 / 90 / 0 | 0 / 0 / .95, +10 Health / 1 Resistance | 11 / 45 / .15 | 8 / 85 / .5 | 6 / 30 / 1.05 |
| 3 | 24 / 10 / 0, +10 Health | 0 / 120 / .15, +1 Resistance | 4 / 0 / 1.45 | 17 / 60 / .2, +1% Haste | 12 / 115 / .7, +1% Crit | 9 / 40 / 1.5, +1.5% Crit |
| 4 | 33 / 0 / 0, +15 Health / 1 Resistance | 5 / 155 / 0 | 0 / 0 / 2, +15 Health / 1 Armor | 23 / 80 / .3, +2% Haste | 17 / 150 / .95, +2% Crit | 13 / 55 / 2, +2.5% Crit |

Weapon remains highest SP, medium Mana, lowest Regen. Tome is medium SP,
highest Mana, medium Regen. Trinket is lowest SP, lowest Mana, highest Regen.
The hierarchy also holds across the alternative items, not just this table.
The primary Chapter 4 package is 53 SP / 285 Mana / 3.25 Regen, with 2% Haste
and 4.5% Crit. Its Weapon contributes 43% of package SP, versus 87% before.

Late alternatives trade 1–2 SP for a little more Mana, sometimes Regen, and
the other secondary. Individual secondaries are 1–2.5%; there are none in
Chapters 1–2 or on Damage gear. Alternative capacity is 96.9–104.2% of the
primary item across the tested healers and lengths. Each slot has cases where
either alternative leads. Mixed-pressure results, Mana spent and Mana remaining
are included as well; capacity alone does not measure the value of completing
a heal just before a hit or accelerating periodic healing.

## Budget discipline

Item level describes an authored budget; it is not a stat multiplier.

| Chapter | Item-level band | Healer throughput level | Head / Legs defense index | Chest defense index | Shield Armor / Health / Resistance |
| --- | --- | --- | --- | --- | --- |
| 1 | 1–3 | 3 | ~3 | ~5 | 6 / 10 / 0 |
| 2 | 4–6 | 6 | ~5 | ~8 | 10 / 20 / 1 |
| 3 | 7–9 | 9 | ~7 | ~11 | 13 / 30 / 2 |
| 4 | 10–12 | 12 | ~9 | ~14 | 16 / 40 / 2 |

The armor authoring index is `Health / 10 + Armor + Resistance`, with rounding
within roughly one point. It controls similar-tier budgets, not equal combat
value: real Physical/Magic mitigation is `100 / (100 + defense)`, while
Bleed/Chaos bypass it and Health remains useful. Chest is stronger than every
same-chapter Head/Legs variant. Shields legitimately carry a larger defensive
budget; Tank Trinkets trade some Armor for Health/Resistance.

Healer budgets use measured casting/resource contribution rather than a fixed
SP-to-Mana conversion. SP adds one distributed budget per spell, not a flat
amount to every Chain target/tick. Max Mana is available at chapter entry;
Regen accumulates while fighting and resources persist between encounters.
Haste changes timing/tick schedules and can increase spending speed; Crit adds
probabilistic healing with the existing 1.5× multiplier. These effects depend
on spell choice, overhealing, fight duration and talents. The equipment sampler's
historical scalar score remains a selection heuristic, not the balance proof.

## Practical slot value

`node scripts/gear-value-probes.mjs 30 > docs/bat-92-gear-value.json`
reproduces the evidence. Thirty fixed seeds compare no throughput gear,
Weapon-only, Tome-only, Trinket-only and the full package for **all three
healers and all four chapters**. The capacity assay repeatedly casts the real
baseline Flash Heal / Nourish / Healing Wave with unlimited recipient wounds,
using production cast times, Mana, regeneration, Haste and Crit. No talents,
extra Mana refills or encounter retuning are introduced.

Shown here: **additional Shaman healing over the no-gear capacity baseline**.

| Chapter | 40s Weapon / Tome / Trinket | 75s Weapon / Tome / Trinket | 130s Weapon / Tome / Trinket | 130s full package |
| --- | --- | --- | --- | --- |
| 1 | 96 / 64 / 48 | 269 / 350 / 325 | 287 / 491 / 462 | 1,442 |
| 2 | 176 / 128 / 96 | 389 / 583 / 531 | 558 / 873 / 811 | 2,450 |
| 3 | 272 / 224 / 184 | 675 / 1,007 / 803 | 868 / 1,182 / 1,237 | 3,726 |
| 4 | 368 / 322 / 263 | 973 / 1,321 / 1,217 | 1,190 / 1,661 / 1,817 | 5,534 |

Previously the Shaman's 40s gains were 144 / 0 / 0 in Chapter 1 and
528 / 80 / 0 in Chapter 4. New single-slot gains are positive for all healers
at every chapter; short-capacity slot gains are within 3×, with Shaman's long
gains within 2×. Weapon remains the strongest immediate Shaman gain, while
Tome/Trinket can lead during Mana-limited longer fights. This materially reduces
dependence on a Weapon drop without making the slots interchangeable.

The report also runs unchanged production bosses, 75s/130s mixed attrition
profiles, and real routes with persistent Health/Mana and no mid-route gear
grants. The capacity assay is not a claim about encounter completion. For
example, an unarmored, untalented Chapter 4 party with no companion gear still
hits enrage even with the new three-slot package. In isolated Shaman routes,
mean completed fights rise from 3.1 to 4.0 in Chapter 1 and 2.0 to 2.8 in
Chapter 4; these stripped-down runs are ablations, not intended progression.

**Overall package power increases**, particularly sustainable capacity. Gear
alone cannot be treated as an encounter balance result. BAT-91 must tune against
this catalogue and real loot/talents; no encounter numbers were changed here.

## Loot changes and progression

Normal drop counts remain **50% zero / 35% one / 15% two**. A validated Chapter
Boss victory still adds exactly one bonus item if its eligible unowned pool
is nonempty. Rolls sample without duplicates and normalize among categories
that still have eligible items.

| Category | Old nominal weighting | New weighting |
| --- | --- | --- |
| Healer | 30%, also absorbed compatible defensive armor/trinkets | 30%, healer throughput only |
| Universal armor | No separate category | 30% |
| Tank | 17.5%, often absorbed by healer compatibility | 17.5% |
| Damage | 17.5% each for Rogue/Mage/Ranger | 22.5% shared category |

These are explicit probability changes. The old nominal bands were not stable
actual role odds: universal defensive items were classified as healer drops,
so companion categories sometimes disappeared. The new four role categories
separate armor from throughput; 21 armor variants cannot dilute the 30% healer
category. Available items within a selected category are sampled uniformly.

Every normal node offers one healer throughput item, three armor items, a
Tank item and three Damage choices. Weapon/Tome/Trinket rotate by route depth;
the two branches of a fork offer the same healer slot. Unlike the old six-slot
healer rotation, later route nodes also offer throughput upgrades. Item count
and category membership are intentional; no roll grants gear automatically.
All catalogue items are reachable through normal nodes or the boss bonus pool.

20,000 seeded category rolls validate weights within one percentage point.
Separate 30-seed loot-only routes validate acquisition and guaranteed bonuses.
256-seed progression snapshots cover inherited equipment plus 0–5 current
chapter farming routes, using actual acquisition and one-item equip rules.
All healer identities produce identical stat distributions and slot access.
At three current-chapter clears, mean healer SP is 5.9 / 16.5 / 31.8 / 44.6 for
Chapters 1–4; this is sampled progression, not a full catalogue grant.

## Save migration and shared equipment

The existing `vesper-equipment-v2` key now stores **schema version 4** and reads
versions 2/3/4 plus the legacy v1 equipment format. Eighteen obsolete healer IDs
map deterministically to the same chapter/slot primary shared replacement in
`GEAR_ID_MIGRATIONS`. Retained IDs receive the revised budgets/roles. Retired
prototype IDs remain rejected.

Owned IDs coalesce after mapping; equipment is validated after mapping; bag
duplicates and equipment/bag overlaps are removed. When old healer loadouts
collapse onto one shared ID, the selected healer wins, followed by saved
assignment order. One replacement is never assigned to multiple characters.
Items whose old assignment is no longer role-compatible remain owned in the
bag. Armor IDs are preserved, so party armor does not collapse.

Switching healer transfers the current healer's shared equipment to the new
healer, with displaced destination items returned to the bag. Unfilled source
slots retain the destination's existing selection. Ownership, ordinary
equip/unequip/swap/discard behavior and combat locks remain enforced; chapter
resource reconciliation uses the existing rules. Other saves are untouched.

## Boss presentation and validation

Boss normal and bonus pools are displayed before entering, including locked
boss inspection. Bonus items have their own section, a visible **♜ Boss Bonus**
badge on every card, accented borders and explanatory reward text. The label
is not “Exclusive”: the existing pool can include items from other route nodes.
Owned items are filtered exactly as for reward rolls; exhausted pools explain
that all eligible rewards are owned. Desktop details scroll to contain the
larger pool; narrow layouts wrap without horizontal page overflow.

Role labels appear in item tooltips, equipment choices, comparisons, discard
details, loot accessibility labels, the catalogue and victory rewards. Weapon
restrictions remain visible through the slot label. Comparisons show gained
and lost stats, including removed Haste/Crit with percentage units.

Validation: **246/246 automated tests pass**; `git diff --check` passes. Tests
cover illegal stats/roles, every character slot, hierarchy/budgets, late
secondaries, all old ID mappings, migration collisions, active-healer priority,
bag deduplication, movement/swaps, healer transfer/locks, loot boundaries,
exhaustion, reachability, identical healer progression and boss markup.

Browser QA uses an ignored copy of the real game with in-memory storage, so
player saves are preserved. Verified migrated Shaman gear, transfer through
Druid and Priest with unchanged gear totals, equipment comparisons/tooltips,
owned-filtered Chapter 1/4 boss pools, desktop scroll containment and 390×844
badge readability with no horizontal page overflow. A Chapter 4 Priest
encounter using the shared package completed via UI healing: five living
members, 2,043 effective healing, loot awarded and chapter progression retained.
Screenshots/fixture are ignored in `.tmp`; no app warning/error logs were found.

Changes remain uncommitted. Recommend a tested BAT-89/BAT-90/BAT-92 commit and
push before BAT-91 encounter experiments, then a `dev` → `main` milestone PR
when the resulting gameplay milestone is ready for acceptance.
