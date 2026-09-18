# Validation — first vertical slice

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
