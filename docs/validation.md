# Validation — first vertical slice

## BAT-10 — Main character Equipment view

- Equipment toggles a three-column inspection panel: Head, Chest, Legs, Boots, and Weapon on the left, the existing priest artwork in the center, and Health, Mana, Haste, and Crit on the right. All five slots remain visibly empty; no equipment system or item bonuses were invented.
- Browser-verified Health 400, Mana 1,200, Haste 0, and Crit 0. Missing/non-finite values fall back to zero. Values represent starting stats before encounter effects.
- Checked opening from Adventures and Team, button toggling, keyboard opening, Escape dismissal and focus return, and switching between Equipment and Inventory.
- Checked desktop and 390×844 layouts. Fixed scrollbar-related clipping on mobile and verified the final panel stays within the viewport without horizontal overflow.
- Started and paused an encounter: Equipment remained disabled and its panel hidden in both states. After abandoning, Equipment became available again.
- All 17 tests pass. Browser warning/error logs were empty. No cross-browser matrix was performed.

## BAT-9 — Team roster and character inspection

- Team displays all five party members with the same procedural character artwork used in combat, plus name, class, role, maximum health, and attack damage or mana.
- Selected each character in the browser and verified detailed values against PARTY / CONFIG / SPELLS. Priest details show all four spells, healing, mana costs, base cast or channel times, and Penance cooldown. The page labels these as starting stats before encounter effects.
- Checked desktop and 390×844 layouts, including priest spell details, with no horizontal page overflow. Enter selected Nyx, updated the selected card, and moved focus to the detail heading.
- Verified Inventory still opens and closes from Team; navigating to Adventures and back preserves character selection. Adventures remains the landing screen after reload.
- All 17 existing Node tests pass. Syntax and whitespace checks pass; browser warning/error logs were empty. Combat rules and party configuration are unchanged. No cross-browser matrix was performed.

## BAT-8 — Adventures progression map

- Adventures remains the landing screen. Replaced the encounter card with a data-driven connected map: one released boss, two future normal routes, and a future converging boss. Future content is explicitly locked / coming soon.
- Browser-checked selection, selected state, compact preview, Cancel with focus restoration, confirmed start directly into combat, Panel / Immersive switching, and guarded navigation back to Adventures. Abandoning an attempt did not grant completion.
- Checked the map and confirmation at a 390×844 viewport: vertical branching routes, readable labels, and no horizontal page overflow. Verified Enter opens the preview and Escape dismisses it.
- Completed state is earned on victory and saved locally, with an in-memory fallback when storage is unavailable. Automated progression tests cover completion state, unavailable content remaining locked, and either incoming route unlocking a future released encounter. Full victory and save/reload were not manually played through in the browser.
- All 17 Node tests pass, including existing combat tests. Browser warning/error logs were empty. No cross-browser matrix was performed.

## BAT-7 — navigation and utility controls

- Verified Adventures opens by default, encounter entry resets to a fresh ready state, and layout controls appear only inside the encounter.
- Opened and toggled both utility panels outside combat; confirmed both buttons remain visible but disabled in running and paused encounters.
- Navigated during Greater Heal: cancel preserved the cast and mana. Cancel from an already paused encounter kept it paused. Confirm abandoned the attempt and opened the selected hub screen.
- Checked the persistent header and utility controls in immersive mode at 1280×720 and a narrow 390×844 viewport. The narrow viewport had no horizontal content overflow; the ability bar and utility group remained separate.
- Restored the normal viewport and left Adventures ready for review. Browser warning/error logs were empty.
- All 15 Node tests pass. Shell interactions were checked manually in the browser; no cross-browser matrix was performed.

## Automated

`npm test`: 13 passing test cases using Node's built-in test runner.

Coverage includes exact casts and resource costs, Post-Haste generation/cap/one-charge consumption, party healing including the Priest and excluding dead units, sequential Penance launches and 83/83/84 healing events, channel cancellation, cooldown expiration, rejected actions, capped health/overheal accounting, dead cast targets, warning/repeat timing, four DoT ticks, pause, all defeat conditions, victory, and restart.

A complete deterministic simulation also verifies both an unattended loss and a win using a basic triage policy. It checks that meaningful healing occurs and that mana is spent. This establishes feasibility, not finished human difficulty tuning.

Syntax checks were run for simulation, input/UI and renderer modules.

## Actual browser checks

Opened the local game in the Codex browser and checked the rendered encounter and controls:

- Began an encounter and cast Flash Heal with key 1; mana and cast time updated.
- Observed a generated Post-Haste charge and 1.8s eligible spell labels.
- Cast Penance with key 4; channel and cooldown displayed, followed by 250 effective healing in the UI.
- Observed Hollow Nova damage across all five party frames and the expanding battlefield effect.
- Cast Prayer with key 3 using Post-Haste; striped incoming healing and party-wide target label displayed, then effective healing increased.
- Changed selected ally with the arrow key, began a heal, cancelled with Esc, and paused with Space. The journal showed cancellation and the paused overlay appeared.
- Checked browser warning/error logs: empty during the tested session.
- Inspected the narrow 390px layout: frames and spell cards reflowed without horizontal content overflow. Desktop remains the preferred play format.

Full victory/defeat and timing edge cases were checked by simulation tests, not a claim of a complete manual browser playthrough. No cross-browser matrix or GPU/frame-time benchmark was performed. Further human playtesting should assess triage pressure, spell efficiency, and learning the timeline.

## Immersive layout

- Checked the full-window battlefield with party, mechanics, and ability overlays at desktop, 1280×720, and 390×844 viewport sizes.
- Switched from immersive to panel view during Greater Heal and paused immediately: the same cast, target, remaining cast time, and spent mana persisted. Switched back with that cast still paused.
- Confirmed hidden spell statistics appear in a tooltip, including while the spell is unavailable. Tooltips are also wired to keyboard focus.
- Verified Penance's visible channel, cooldown, incoming-healing stripes, and boss warning in immersive mode.
- Reloaded and confirmed the saved immersive preference was restored; checked narrow-screen canvas sizing and no horizontal overflow.
- Restored the browser viewport and restarted the encounter, leaving the immersive preview ready to play. Browser warning/error logs were empty.
- All 13 existing combat tests passed after the layout implementation. This UI change does not modify the combat simulation.

## BAT-6 — shared ability bar

- Browser-checked panel and immersive layouts at 1280×720: a single shared container, four equally sized icons, and no permanent ability names/details.
- Measured every desktop icon at 64×64 and every key badge at 30×18, anchored at icon offset (0, 0).
- Cast Penance and paused during its cooldown. Computed styles showed grayscale/brightness on only its icon; all buttons remained opacity 1 with no filter, and key badges remained unfiltered. The centered countdown contained no unit suffix.
- Verified a spell tooltip by pointer interaction and then Tab navigation to Prayer of Healing, which exposed its name, cast time, cost, healing, and effect.
- At 390×844, measured all icons at 54×54 and all badges at 30×18; no horizontal overflow.
- Added formatter tests for modifier aliases, combined modifiers, fractional seconds, the 60-second boundary, padded seconds, and multi-minute cooldowns. These cover long cooldowns and modifier labels without changing actual ability balance or keybindings. All 15 tests pass.
## BAT-11 — Introductory Home and logo navigation

- Added a dedicated Home landing screen with a lightweight Vesper welcome, identity copy, and one clear route into Adventures. It contains no progression map, team management, inventory, or encounter controls.
- Home is now the default after reload. The main header keeps Adventures and Team as separate destinations; the Vesper logo/name takes the player to Home from Team and other non-blocked views.
- Browser-checked Home → Adventures, Team → logo → Home, and the welcome layout. During an active encounter, clicking the logo continues to show the existing abandon-confirmation dialog; confirming returns to Home.
- All 17 Node tests pass. Syntax and whitespace checks pass. No cross-browser matrix was performed.
## BAT-12 — Adventures chapter selection

- Adventures now presents a data-driven chapter-selection screen instead of the encounter map. It shows Chapter 1: The Forsaken Catacombs as available, plus two locked future chapter cards with titles, atmospheric descriptions, and explicit states.
- Opening Chapter 1 leads to its dedicated encounter-map screen. The map keeps the existing encounter state, preview/confirmation step, and encounter launch behavior; an All chapters control returns to chapter selection.
- Browser-checked Home → Adventures → Chapter 1 → encounter preview → active encounter, map → All chapters, and guarded navigation away from an active encounter. Locked chapters are disabled and convey their state in the accessibility tree.
- All 18 Node tests pass, including chapter-state coverage. Syntax and whitespace checks pass. No cross-browser matrix was performed.

## BAT-13 — Four-fight Chapter I

- Replaced the branching placeholder with four required encounters in order: Silent Threshold, Ashen Gallery, Sunken Ossuary, and Hollow Sanctum (Chapter Boss). The compact map and selected-encounter panel include Encounter Mechanics and an empty Encounter Rewards section.
- Added independent encounter tuning in src/data.js: steady tank damage, then one and two weak random-target archers, then a stronger guardian with two archers. The party focuses the guardian; archers flee on its defeat. The original encounter remains as a simulation regression fixture, not a Chapter I fight.
- All 23 Node tests pass. New coverage includes sequential unlocks, all-four completion, invalid/old saved progress, no rewards for defeat or mismatched encounters, live random targets including tank/healer, paused add timers, encounter-preserving restart, and 30 seeded triage wins per fight without deaths. Idle parties lose every fight.
- Played all four encounters through victory using actual browser party/spell controls (approximately 32, 37, 42, and 54 seconds). Checked confirmation/cancel, locked-node inspection, exactly one next unlock, two rendered archers, immersive boss play, defeat without progress, replay, pause, and guarded abandonment.
- Reloaded after completion: all four clears and the chapter card's Completed / Replay state persisted; future chapters remained locked. The development browser now contains this completed test progress, so all four fights are available for replay.
- Inspected desktop and 390×844 mobile map/combat layouts, with no horizontal overflow. Compacted immersive attack timers after finding their descriptions obscured the mobile battlefield. Browser warning/error logs were empty. Restored the normal viewport after testing.
- Syntax and whitespace checks pass. Balance is an initial playable baseline; no cross-browser matrix or final human difficulty tuning was performed.
- Map presentation follow-up: removed encounter-card backgrounds/borders and moved selection, hover, and keyboard-focus emphasis onto the framed icons. Routes now measure icon edges and redraw on layout changes; mobile curves sweep beside the labels. Browser-checked desktop and 390px layouts, selection, and returning to the map; no browser errors.
- Global background follow-up: replaced the page-level fading radial with a single full-viewport dark green canvas. Browser-checked Home, Adventures, Team, and the Chapter I map; their content backgrounds now remain consistent beneath and beyond the content area. Combat retains its separate intentional battlefield treatment.

## BAT-14 — Chapters 2–4

- Added 24 encounters across three branching chapters: 6/9/9 nodes with 4/6/6 fights on a successful route. Each chapter has one final boss; defeating it unlocks the next chapter without requiring skipped branches. Existing Chapter 1 saves migrate into the validated campaign save.
- Added party-wide pulses, distinct warned split targets, and timed heal-through bleeds. Encounter timing, damage, target counts, enemy compositions, and appearance are defined in src/data.js. Later bosses combine the new lesson with earlier pressures. Added themed creature silhouettes and chapter atmosphere.
- All 31 tests pass, including every alternative route, save validation, target selection, pause/restart behavior, bleed duration/refresh/overlap, and 480 seeded wins across the 24 new encounters. Future party-power injection leaves incoming encounter damage fixed.
- Browser-played one complete route through each new chapter (16 fights, including all three bosses), with all five allies surviving each successful run. Chapter 2 used Mothlight/Root Choir; Chapter 3 used Scorched Aerie/Hall of Judgment/Broken Belfry; Chapter 4 used Weeping Arbor/Vein Loom/Severed Garden. Boss durations were approximately 62, 68, and 73 seconds.
- Verified fork unlocks, skipped branches remaining optional, chapter gating, completed states after reload, replay, paused combat, guarded abandonment, and visible bleed duration/tick details. An unattended first attempt lost without granting progress before a successful retry.
- Inspected desktop panel/immersive layouts and 390×844 map/combat layouts. Long maps scroll inside their own region; compacted mobile boss timers after finding they covered too much battlefield. Restored the normal viewport and immersive preference. Browser warning/error logs were empty.
- The development browser now has completed routes for all four chapters, leaving optional fights available and completed fights replayable. Balance remains an initial baseline for human review; no cross-browser matrix was performed. Changes remain uncommitted on dev.

## BAT-15 — Healer selection

- Added a persistent Priest/Druid selector beside the Team heading. It rebuilds the player-healer card and details while preserving the companion cards and inspection behavior.
- Added a healer registry, active-healer persistence, and party/loadout factories. Combat now receives the selected five-person party and spell kit rather than assuming a fixed priest. The renderer similarly resolves the active healer for portraits, casting effects, and battlefield placement.
- Priest keeps the existing healing kit. Druid has a distinct character record and an intentionally empty Team Spell Book until the dedicated Druid-kit issue; encounters retain the existing shared training controls so the selection is playable without defining Druid mechanics early.
- Browser-checked desktop Team layout, Priest → Druid selection, Druid’s card/details, starting an encounter as Druid, guarded abandonment, and selection persistence after reload. The renderer portrait fallback was corrected after the initial reload error; no new browser errors occurred afterward.
- All 33 Node tests pass, including active-healer save validation and combat composition checks for both healers. No cross-browser matrix was performed. Changes remain uncommitted on dev.

## BAT-16 — Team ability configuration

- Team now places the selected healer's configurable Ability Bar below character cards/stats and above Spell Book. Companion inspection preserves the healer configuration sections. Team and encounter bars share icon markup, styling, compact key labels, and the same saved configuration model.
- Added pointer dragging within each ability section, with drop highlighting and cancellation outside the bar. Right-click or click/Enter opens key capture and accessible move controls; Alt + left/right moves a focused spell. Team interactions never call combat casting.
- Keybind collisions swap bindings. Letter/number keys, Shift combinations, and Ctrl + Alt combinations use one normalization/matching function in configuration and combat; navigation/game controls and browser shortcuts are reserved. Settings persist separately per healer, validate old/invalid saves, and retain session changes when storage is unavailable.
- All 38 tests pass, covering independent persisted orders/bindings, deterministic swaps, malformed save recovery, section boundaries, unavailable storage, input matching, and unchanged healing mechanics after configuring a key.
- Browser-tested right-most → far-left drag and the reverse, outside-bar cancellation, Enter after dragging, right-click capture, occupied-key swapping, Shift+Q, reserved Space rejection, Escape cancellation, keyboard/dialog movement, and separate Priest/Druid settings after reload.
- Entered an encounter as Druid and confirmed its saved order, compact SQ badge, and Shift+Q casting Flash Heal with the expected mana cost. Team configuration left combat idle and mana full. Checked desktop and 390×844 Team layouts and mobile move controls; no horizontal page overflow or browser warning/error logs. Restored normal viewport and both healers' original order/bindings after QA, leaving Druid selected as before.
- BAT-15 and BAT-16 remain uncommitted on dev for review. Druid continues using the existing temporary combat kit pending its separate kit issue.


## BAT-17 — Druid baseline kit

- Replaced the temporary Priest kit with Rejuvenation, Regrowth, Swiftmend, Wild Growth, and Nourish. All starting tuning lives in src/data.js; Priest values are unchanged.
- Each party member exposes hots with source, name, icon, color, applied/expiry times, next tick, remaining ticks, interval, and healing. Same-source refresh replaces the instance and restarts timing. HoTs stop during pause and clear on death/reset.
- Swiftmend validates before spending resources and consumes the shortest remaining eligible effect on its target only. Nourish counts eligible HoTs at cast completion. Due HoT ticks resolve before a finishing cast on the same simulation step.
- Added shared healing summaries, five nature icons, instant-cast labels, Druid guidance, and green healing effects. Priest-only Post-Haste controls are hidden for Druid. Detailed party-frame effect visuals remain for the separate effect-display issue.
- All 45 tests pass, including exact costs/tick totals, refresh timing, non-stacking/coexistence, Swiftmend rejection/consumption/cooldowns, Wild Growth target isolation, Nourish scaling/expiry, cancellation, pause, death, and reset. Existing Priest tests remain green.
- Browser-tested all five Druid spells in an encounter, Swiftmend rejection without a HoT, both cooldown displays, Team Spell Book, panel/immersive layouts, and a 390x844 Team layout with five icons and no horizontal overflow. Verified Priest Flash Heal still grants Post-Haste; browser error logs were empty. Restored the normal viewport and left Druid selected for review.
- Changes remain uncommitted on dev. No balance tuning beyond the issue's requested starting values.


## BAT-18 — Party-frame effect indicators

- Centered the existing two-line health readout. Names/classes stay on the left; helpful effects occupy the bottom-right and debuffs the top-right, inside the existing frame bounds.
- Added reusable party-effect adapters/rendering with shared spell glyphs. HoTs retain Rejuvenation/Regrowth/Wild Growth order. Optional future helpfulEffects/debuffs support icon, color, expiry, display order, dispellability and priority, including indefinite effects.
- Negative effects show at most two entries: dispellable first, explicit priority next, then damage per second and stable source ID. Countdown values derive from combat timestamps, with no UI timer. Accessible frame descriptions include the visible effects and remaining durations.
- All 48 tests pass. Added coverage for live HoT display order, refresh, expiry, consumption, Wild Growth target isolation, deterministic priority selection, indefinite effects and escaped descriptions.
- Browser-tested all three HoTs plus Rending Maul in Kennels of Sorrow. Verified Swiftmend removes Wild Growth only from Aldric, other targets retain it, refresh updates durations and expiry removes icons. Inspected desktop panel/immersive and 390x844 immersive layouts. Effect bounds stayed inside frames; percentage and numeric health centers matched to within 0.01px. No browser console errors.
- Restored the normal viewport and left the encounter paused with effects visible for review. BAT-17 and BAT-18 remain uncommitted on dev.

## BAT-19 — Persistent chapter resources and core stats

- Priest and Druid now start with 400 health, 600 mana and 2 mana per second during active combat only. Chapter attempts save actual party health and mana between fights, separately from permanent completion/unlocks. Map, Team and equipment visits provide no recovery.
- Defeat, abandonment and reloading an unfinished encounter end the attempt. Restart Chapter restores full resources and returns to the first encounter; cleared encounters cannot be replayed for recovery inside an attempt. Completed checkpoints survive reloads.
- Added Spell Power distribution across direct healing, channels, mixed spells and per-target HoTs; flat Armor/Resistance mitigation with a minimum of one for positive matching damage; Bleed/Chaos bypass mitigation. Production damage sources are typed in src/data.js. New stats default to zero until gear/talents supply them.
- Added maximum-resource adjustment rules: increases add only the maximum's delta, decreases clamp current resources, and repeated reconciliation cannot refill resources. Gear and talent content is not part of this issue.
- All 58 Node tests pass, including actual spell delivery, damage types, resource persistence, healer switching, failure/restart, chapter isolation and maximum changes. The old campaign triage regression explicitly uses its former 1200-mana/4-per-second budget to check unchanged enemy pressure; it does not establish campaign viability under the new resource budget. Enemy damage and timing were not retuned.
- Browser-tested a Chapter 1 victory carrying Aldric's 20 health into the next encounter, Team/map navigation without recovery, defeat resetting temporary progress, and manual restart locking later fights. A separate victory's 593/600 mana checkpoint survived map reload. Checked resource/stat displays and the map at 390x844; no browser console errors. Tests used a separate local origin to preserve the user's paused encounter, and the normal viewport was restored.
- No full-chapter playthrough under the new persistent budget or cross-browser matrix was performed. Later encounter balance remains for the planned gear/talent balance pass. Changes remain uncommitted on dev for review.

## BAT-20 — Full-party equipment management (updated specification)

- Simplified roster cards to role, portrait, one large name, class and selection state. Portrait rendering suppresses its small duplicate name without changing battlefield labels.
- Team now has a character sheet with a larger portrait and square equipment slots on the left, and detailed stats on the right. Head/Chest/Legs sit on the left of every portrait; character-specific weapon, offhand and trinket slots sit on the right. Five-slot companions have no artificial sixth slot. Healers expose all eight stats, including zero Haste and Crit.
- Replaced equipment selects with adjacent item pickers, immediate equip, Unequip, keyboard focus restoration, Escape/outside-click dismissal, and shared item tooltips. The same icon renderer supports item-provided image URLs in equipment, pickers and Inventory; slot silhouettes and provisional colored glyphs are the fallback until BAT-21 supplies actual item art. Item-level display defaults to 1 for the provisional kit; itemLevel and optional flavor metadata are supported without defining loot progression here.
- Inventory shows a 5 × 4 bag grid with faint bag silhouettes in empty cells, equipped markers, and hover/focus/click details. The existing provisional 33-item kit spans two 20-slot pages. Gear tuning and slots now live in src/data.js; ownership remains the provisional starting collection pending BAT-21.
- Gear persists separately for each character/healer, supplies combat party templates, and reconciles preserved chapter resources on equipment and healer changes through BAT-19 rules. Both the mutation API and UI reject gear changes during running/paused combat. The Equipment shortcut selects the active healer in Team; the retired standalone equipment view is gone.
- All 66 Node tests pass. Additional regression coverage checks rejected combat-time equip/unequip, invalid saved assignments, real companion weapon damage and Physical/Magic mitigation, persistent gear, and maximum-resource changes. Existing combat and ability-configuration tests remain green.
- Browser-checked all six character sheets, exact slot sets, zero-value healer stats, equip/unequip, Spell Power and Armor updates, gear surviving reload, active-healer shortcut, item tooltips, ability configuration, inventory paging and empty slots. Desktop sheet halves both measured 451 px high. Inspected the rendered desktop and 390 × 844 layouts; no equipment selects or horizontal page overflow. Fixed the narrow picker boundary to account for the scrollbar; Escape returns focus to its slot.
- Browser-tested running and paused combat locks and guarded Team navigation on vesper.localhost:5173, separate from the existing localhost save. No console warnings/errors in that session. Restored the normal viewport and removed temporary gear from the earlier localhost UI checks, leaving its original Druid selection. No cross-browser matrix or campaign rebalance was performed.
- Changes remain uncommitted on dev for review.

## BAT-25 — Item-model foundation (BAT-21 sub-issue 1)

### Follow-up: retire pre-BAT-21 items

- At user request, removed all 33 provisional item definitions from the production catalogue. It is intentionally empty pending BAT-26/BAT-27. Retired IDs must not be reused. Existing v1/v2 saved references are filtered out on load and confer no equipment bonuses; unrelated progress and settings are untouched.
- Equipment regression tests use an injected, synthetic test-only catalogue, not gameplay items. The BAT-25 model, shared slot icon assets and Team/Inventory UI remain available. This supersedes the provisional-catalogue and migration-preservation notes below for retired items.
- All 71 tests pass, including rejection of retired items from both save formats. No commit or push performed.

- Fixed item definitions remain in src/data.js with explicit chapter, item level, character, slot, stats, name, flavor and icon references. Chapter bands are design metadata, not stat multipliers. Existing provisional item values are unchanged; full chapter authoring and distinctive per-item art are deferred to BAT-26/BAT-27. Referenced slot SVGs preserve the existing visual vocabulary meanwhile.
- Added catalogue validation, explicit supported healer/companion stats and owners, character-slot eligibility, ID lookup, unowned filtering and average equipped item level (empty slots count as zero). No encounter tables, probabilities or bonus rolls were added.
- Replaced implicit catalogue-wide ownership with versioned unique owned IDs. Acquisition rejects unknown/duplicate IDs; only owned compatible items may be equipped. Valid v1 equipped items migrate to owned v2 items, without granting the rest of the catalogue. The old save remains untouched. Fresh saves have empty bags until acquisition is connected by the later loot issue; this supersedes BAT-20's provisional starting collection.
- All 70 tests pass, including metadata/icon references, every supported healer stat, ownership persistence, duplicate rejection, legacy migration, damaged storage and unchanged combat/resource regressions. Item level 3 still grants the authored 12 Spell Power, not 36.
- Browser-checked the fresh Team/empty picker and 20-slot empty Inventory on a separate local origin. An isolated in-memory fixture using the real shared UI verified migrated equipment, a second acquired item, compatible filtering, item-level/flavor tooltips and unequipping (Spell Power 12 to 0 while retaining two owned items). SVG references loaded; no console warnings/errors. No campaign or cross-browser balance validation was attempted for this data-model-only issue.
- BAT-25 is the review checkpoint; BAT-26 and BAT-27 remain unimplemented. No commit or push performed.

## BAT-26 — Chapter 1–2 catalogue and icons

- Added 66 new authored items (33 per chapter), covering every defined slot for both healers and all four companions. New IDs are chapter-prefixed; none of the retired BAT-20 items return. Chapter 1 uses ilvl 1–3 and catacomb themes; Chapter 2 uses ilvl 4–6 and Verdant Wilds themes. Complete sets average approximately ilvl 2 and 5 respectively.
- Exact stats remain explicit in src/data.js, with no random affixes or item-level multipliers. Chapter 2 improves full-set output, health and combined defenses; individual slots include Physical/Magic defense and sustain/throughput tradeoffs. No Haste/Crit bonuses are authored while their combat effects remain unimplemented. No encounter tuning, loot tables, drop rolls or hidden boss items were added. Fresh player inventories remain empty pending BAT-28.
- Added 66 distinct static SVG icons with type silhouettes, character motifs and chapter details. The existing shared icon renderer uses each item's reference in sheet slots, picker and bag. All assets load, and tests reject duplicate artwork even when filenames/titles differ.
- Maintained development review page lives at /dev/catalogue.html, linked from the home screen on loopback hosts in a separate tab. It automatically lists all authored chapters and uses real equipment/Inventory presentation against an isolated in-memory collection. No player save reads/writes or production item grants. It replaces the temporary artifacts/bat26-gallery.html as the durable review URL.
- Browser-tested 32px thumbnails, equipment-size icons, Priest weapon choice/equip/unequip, Aldric shield filtering and defensive bonuses, multi-stat/flavor tooltips, and Inventory page 4 of 4. At 390×844 the picker remains within the viewport, images load and the page has no horizontal overflow. Normal game Inventory remains empty. No browser warnings/errors in those checks; no full-campaign balance or cross-browser pass performed.
- Automated checks cover all chapter/owner/slot combinations, stat validity, unique assets and shared references, chapter progression, ownership isolation, and loopback-only development-link visibility. Final test count is 75. Changes remain uncommitted on dev for review; BAT-27 is next.

## BAT-27 — Chapter 3–4 catalogue and icons

- Added 66 fixed items, 33 per chapter, covering every slot for Priest, Druid and the four companions. Ember Citadel items use ilvl 7–9; Thornveiled Court items use ilvl 10–12. Complete sets average approximately 8 and 11. All Chapter 1–2 definitions remain unchanged, and retired prototype IDs stay retired.
- Every new item has two explicit supported stat bonuses and individual name/flavor text. Full-set output, health, sustain and combined defenses grow by tier, while each character has individual slot tradeoffs in both later chapters. For example, the Priest trades the lantern's Mana for the scepter's Health, and Druid chest pieces alternate Resistance and Armor. Haste/Crit remain unauthored pending combat support. No encounter balancing, drops, loot tables or hidden bonuses were added.
- Added 66 distinct SVGs using warmer forge/ember materials in Chapter 3 and pale moon/silver motifs in Chapter 4. Weapons, shields, books and trinkets have distinct forms; armor uses character silhouettes and tier details. Canonical icon references feed existing shared presentation without UI changes.
- The maintained /dev/catalogue.html automatically displays all 132 items in four chapter sections and a seven-page sandbox inventory. Browser checks verified all images loaded; inspected the new chapter artwork at slot and 32px thumbnail sizes. Tested the four-tier Priest weapon picker, changing authored bonuses, Aldric-only shields, and the final Inventory page and multi-stat tooltip. At 390×844, the four-option picker fit within the viewport and there was no horizontal overflow. No browser warnings/errors. Restored the default viewport; player saves were not touched by the sandbox.
- All 77 tests pass, including four-chapter coverage and bands, distinct SVG content, full-set growth, actual per-slot tradeoffs and mixed-tier ownership/equipment persistence with no automatic grants. git diff --check passes. No full-campaign or cross-browser balance pass was performed.
- BAT-27 is ready for review on dev, not committed or pushed. BAT-28 (normal encounter loot tables and weighted drops) is next.

## BAT-28 — Normal encounter loot tables and weighted drops

- Every Chapter 1–4 encounter now exposes a six-item normal loot table in its map detail, using the canonical catalogue records and item icons. Tables contain one option for each healer plus Aldric, Nyx, Sera and Theron; only the currently active healer's option is eligible.
- Accepted victories roll 50% no item / 35% one item / 15% two items. Each item independently uses 30% active-healer weight and 17.5% for each companion, renormalizing only when an owner's listed item is already owned.
- Awards enter the persistent equipment collection once, after chapter-run victory validation. Owned items and an earlier item in the same two-drop result are excluded; exhausted tables safely award fewer items. The result overlay reports acquired canonical items or that no gear was found.
- Hidden Chapter Boss bonus drops remain unimplemented for BAT-29. Item stats and encounter combat tuning were not changed for BAT-28.

## BAT-29 — Hidden Chapter Boss bonus drops

- Each Chapter 1–4 boss now grants one additional weighted item, when an eligible item remains. The bonus pool is chapter-local and excludes that boss's displayed normal loot table, so it remains unrevealed until the victory overlay.
- The active healer receives the same 30% owner weight as normal loot; each companion receives 17.5%. Already-owned rewards and normal rewards rolled in that same victory are excluded. The normal 50% / 35% / 15% behavior is unchanged.
- The persistent collection, result overlay, Team sheet and Inventory receive the boss bonus through the existing acquisition flow. No item stats, encounter tuning, map reward preview, or run/progression rules changed.
- `node --test tests/*.test.mjs` passes all 82 tests; `git diff --check` passes. The local `npm test` launcher could not run because its configured global npm CLI is missing on this machine.
- `npm test` passes all 81 tests. Browser QA at `127.0.0.1:5173` confirmed the Chapter 1 encounter detail renders all six named icons legibly without crowding the map or action area.

## BAT-30 — Per-healer talent state and progression framework

- Added a reusable four-row talent-tree model with exactly three nodes per row, one- and two-rank validation, 0/2/4/6-point row gates, independent healer allocations, safe save restoration, and free spend/refund/respec operations.
- Talent changes use the same active-combat lock as equipment. Refunds cannot leave invested talents in a row whose spent-point requirement is no longer met, and respeccing only changes talent allocations; chapter Health and Mana remain untouched.
- Accepted victories permanently award the active healer once for each chapter's first encounter and boss. Milestones live outside chapter-run attempts, so defeat/restart cannot remove or farm them. Four chapters currently expose eight points per healer, while milestone keys and healer records remain open-ended.
- Existing valid campaign progress migrates once to the healer active when the upgraded save first loads. The one-time marker prevents account-wide historical clears from being duplicated onto a different healer after switching or reloading.
- `npm test` passes all 88 tests and `git diff --check` passes. Browser smoke testing at `127.0.0.1:5173` confirmed the app loads, chapter navigation works, and no browser warnings/errors are emitted. BAT-31's Team talent UI and concrete healer talent effects remain intentionally out of scope.
