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
