# BAT-96 — Era II framework

## Delivered

`ERAS` in `src/data.js` defines chapter groups and item border colors. Chapters
have explicit `ordinal` and `eraId` fields. `src/eras.js` owns era lookup,
unlock checks, chapter ranges and item provenance. Later eras can add groups
and colors without changing Adventures or equipment presentation.

Era II unlocks from the permanent Chapter 4 boss clear. Existing campaign
saves use the same key and route validation. No separate flag or screen visit
is required. Restarting or replaying Era I does not remove that history.
Hard Reset clears it through the existing save reset list.

Adventures has selectable eras, a milestone banner after Era I completion,
and Previous/Next Era controls. Controls sit beside the centered grid on wide
screens and above the cards at smaller widths. Returning from an older chapter
retains the era being browsed. An active run initializes the selector to its era.

| Chapter | Shell | Nodes | Stops per route |
| --- | --- | ---: | ---: |
| 5 | The Emerald Reach | 10 | 6 |
| 6 | The Drowned Sanctuaries | 12 | 7 |
| 7 | The Glassbound Spire | 14 | 8 |
| 8 | The Eclipsed Dominion | 15 | 9 |

Every map retains ordinary two-way forks and has one three-way choice between
normal, optional elite and shrine paths. Every node leads to the chapter boss.
Three-way forks narrow without a dense complete mesh of crossing edges.
Maps use measured minimum spacing, internal scrolling and vertical routes on
narrow screens. Shrine visits use `ChapterRuns.visit`, never `Combat` or a
synthetic victory. They persist once per run and leave resources unchanged.

Item chapter ownership derives the era consistently. Era I borders are silver
(`#aab2b9`); Era II borders are green (`#78be87`). Inventory, equipment, picker,
discard confirmation, loot preview, acquired loot and development catalogue
share the rule. Item details display the era in text. These colors represent
provenance, not rarity. Future Chapter 5–8 items pass catalogue validation and
use green styling without ID-specific UI logic.

## Deliberately provisional

Chapters 5–8 and their encounters carry `contentStatus: 'shell'`. Combat
profiles are independent copies of existing Chapter 4 fights with new IDs and
names. Their numerical profiles are unchanged. Era II gear and loot pools are
not authored yet; empty reward previews communicate this without implying
that the player has collected the whole catalogue.

There are **no healer balance changes**: Priest, Druid and Shaman spells,
healing, Mana costs, cooldowns, talent effects and talent point budgets remain
unchanged. Era II shells do not award extra talent milestones. The BAT-93
global Mana baseline and Chapters 1–4 tuning remain unchanged.

Chapter `modifiers: []` is an authoring slot for later affixes; no modifier
engine or affix tuning is claimed here. The duration target is 90–180 seconds.
Combat and its UI accept an optional encounter `enrageSeconds` override;
all current encounters retain the existing default. Shrine effects, elite
reward bonuses and sophisticated boss encounters require future content work.
Existing Era I balance/catalogue reports exclude shells until authored.

## Constraints for the later content BAT

- Use **Shaman alone as the numerical balance reference**. Do not rebalance
  Priest, Druid or Shaman as part of the Era II encounter pass.
- Era II is challenging by default; uncertainty should err slightly hard.
- Farming is the safety valve. Gear increases room for mistakes while active
  healing and triage remain necessary at intended current-era gear.
- Strong undergeared play may scrape through, and strong players should need
  substantially less than full chapter farming to defeat a final boss.
- Never require every item or 100% catalogue completion for normal progression.
- Useful exploratory gear targets: very good play around 40–55% of useful
  current-chapter gear, average play around 55–75%, struggling play may farm
  further. These are guidance, not a loot percentage formula.
- Layer longer fights, elites, utility effects, risk/reward, overlapping
  mechanics, affixes and advanced bosses progressively across Chapters 5–8.

## Validation

- `npm test`: **261 passed, 0 failed**.
- All chapter graphs/routes validated, including utility paths and boss unlocks.
- Existing-save migration, Chapter 4 victory unlock, replay permanence,
  hard reset, shrine persistence/resource preservation and future item styling
  have automated coverage.
- Edge browser QA at **1920×1080**, **1280×800**, and **390×844** passed.
  All Era II maps were checked for node overlaps, map-boundary clipping and
  page overflow. Navigation, locked states, the actual app victory callback,
  reload, mobile shrine visits and inventory tooltips passed.
- Computed borders verified silver for existing items and green for a synthetic
  Chapter 5 reward tile; no synthetic item is saved or added to the catalogue.
- No browser JavaScript errors. Desktop/mobile screenshots visually reviewed.
- Compared data exports against Git HEAD: all pre-existing numeric data,
  healer spells/talent values, gear and encounter profiles match exactly.
  Original chapter definitions differ only by the added ordinal/era metadata.
- `git diff --check` passed. QA scripts, saves and captures stay in ignored `tmp/`.
