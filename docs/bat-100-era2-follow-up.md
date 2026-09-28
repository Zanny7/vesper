# BAT-100 — Era II playtest follow-up

## Normal pressure and Mana

Only Chapter 5–8 normal encounters received numerical changes. Opening normals have 5% stronger tank strikes. Later normals have 8–15% stronger tank strikes, repeat their existing mechanics 8–18% sooner, and keep existing wounds active for one or two additional ticks. Individual split and party hit sizes are unchanged. Elite and boss encounter values, healer values, global Mana settings, and gear/reward tables are unchanged.

The deterministic check used real BAT-98 acquisition and equipped gear, four seeds, three eight-point Shaman builds, six gear checkpoints, isolated encounters, and carried Health/Mana routes. The first two normals of every chapter cleared with inherited previous-chapter gear in all **48/48** sampled attempts per chapter. Across 16,920 isolated probes, no idle or single-heal policy had a safe clear. These counts are diagnostics, not human success probabilities.

| Chapter | Average current gear slots / 27 | Normal route clears | Damage / effective healing, normal route plus boss | Mana spent / combat regen / post-fight recovery | Boss-entry Mana, conservative / deliberately wasteful |
| --- | --- | --- | --- | --- | --- |
| 5 | 18–19 | 12/12 | 35,427 / 34,535 | 4,672 / 3,705 / 269 | 951 / 585 |
| 6 | 18–19 | 12/12 | 49,482 / 48,913 | 6,246 / 5,199 / 257 | 1,005 / 699 |
| 7 | 18–19 | 12/12 | 73,311 / 72,898 | 8,836 / 7,543 / 527 | 1,054 / 671 |
| 8 | 18 | 12/12 | 101,816 / 100,917 | 11,734 / 10,138 / 805 | 1,101 / 637 |

Values are means across four seeds and three builds. Conservative normal routes finished with no deaths; near-deaths averaged 0, 0, 1, and 2 respectively. At roughly 13 current slots, normal route completion was 10/12, 12/12, 12/12, and 10/12. At near-complete gear, all three route types cleared 12/12 in every chapter, retaining farming as a safety valve. At average gear, elite route completion was 12/12, 11/12, 9/12, and 12/12; shrine route completion was 12/12, 12/12, 10/12, and 11/12. The failures were confined to the Healing Tide reference build at the unchanged chapter boss after the harder route. Skipping the elite remains viable.

Efficient Shaman play still tends to recover most Mana between normal encounters. Deliberately wasteful casts now produce substantially lower boss-entry Mana, so efficiency matters without requiring an OOM on every route. A fresh human playtest is still needed to judge whether that difference is noticeable enough in play.

## Special nodes and reward choice

Shrine and optional-elite forks now occur at 59%, 65%, 69%, and 72% of the Chapter 5–8 map length. Every fork follows several normal encounters and has at least one normal combat stage before the boss. Stable node IDs preserve saves and authored loot tables. Optional elites use a crown icon inside the existing square footprint, including while locked; shrines retain their circular symbol.

The elite reward dialog shows six gear icons in a compact grid. Hover, keyboard focus, and tap/selection show the existing item details one at a time. Claiming still requires a separate confirmation. In browser QA, one item was added, the pending choice disappeared after reload, and Inventory contained exactly that item. The 60% reward roll and duplicate-claim protection remain in the existing equipment model.

## Music and icon observation

The reported silent next encounter after a Chapter 6 elite could not be reproduced deterministically. The transition did leave an unfinished fade active while navigating to the map; map navigation now releases audio immediately, so the next encounter starts from a clean playback state. A regression test covers elite completion, map exit, a following normal, shrine navigation, and boss playback. This is a narrow state-reset fix, not a change to track selection.

Gear icons loaded in the healthy local server throughout the Chapter 5–8 desktop and mobile checks and in the elite reward dialog. The playtest observation did not reproduce, so no shared icon rendering code was changed.

## Validation

`npm.cmd test`: 282/282 pass. The four-seed harness produced 16,920 isolated probes, 2,592 carried-resource routes, and 192 foothold attempts. At 1280×800 and 390×844, all four chapter maps showed later special forks, a following normal step, no page-wide horizontal overflow, and no broken gear images. The reward dialog was checked at both sizes; keyboard detail, tap/selection detail, one-item claim, and reload persistence were exercised. See [machine-readable balance evidence](bat-100-balance.json) for encounter, route, loadout, and Mana details.
