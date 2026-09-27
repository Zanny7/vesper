# BAT-93 — revised Mana evaluation and map display

**Selected and implemented on dev: 20% normal-victory recovery, 3 Mana/sec base Regen, 1.5× BAT-92 item Regen.** This rerun uses the September 27 updated requirements: 27 combinations, with passive clears recorded as pressure defects rather than used to suppress global Regen. The map display is implemented and verified. Encounter tuning remains fixed.

## Choice and limits

20% is the lowest approved recovery that supports the sampled prepared normal routes without routine OOM. At equal Regen, changing 10% to 20% raises prepared full-route completion in Chapters 1–4 from **81/41/58/89% to 100/78/96/95%**. Normal-route OOM falls from **0/44/19/6% to 0/6/0/2%**. Every prepared normal route completed under the selected setting. Bosses remain resource checks; Chapter 2 still has the largest failure/OOM burden.

Lowering base Regen to 2.5 or item scaling to 1.25× at 20% materially reduces Chapter 2–3 completion and mistake recovery. The tie-break favoring lower recovery does not apply to this clear improvement. The 0% configurations were eliminated by the complete screen, which left Chapter 2–3 boss completion at zero.

This is the best approved global compromise, not a claim that all pacing goals are solved. Cold first visits in Chapters 2–3 still often fail before the boss and require gearing through early encounters. Prepared Chapter 4 can erase an opening mistake and has many Mana-neutral normal fights. Some active-healing depleted-Mana re-entry probes also gain Mana; these are residual pacing exceptions, distinct from zero-cast defects. No encounter corrections, net-gain caps, higher base Regen, spell-cost changes or other unapproved knobs were tested or shipped.

## Method and evidence

- Real Shaman Combat, authored equipment, loot and resource reconciliation; Health, dead allies and Mana carry through routes. The selected global stats apply to all healers in production, but all balance decisions use Shaman only.
- Seeds: `910000 + chapter × 10000 + index`; each fight uses `seed + position × 100000`. Loot and combat RNG are separate. Gear selection is frozen to BAT-92 item scores in the analysis process, so candidates receive paired loadouts.
- `first`: inherited earlier-chapter equipment, no current-chapter farming, opening one point short before its milestone. `ready`: three acquired current-chapter normal-route reward passes. Acquisition assumes victories; it does not prove the farming sequence is itself viable. Ready is intended prepared gear, not automatically overgeared.
- The complete 27-setting conservation screen uses two seeds per path/stage and one chapter build: **1,188 routes**. Four finalists use eight seeds, all legal paths, all 2/2/3/4 chapter builds, first/ready stages and three policies: **6,528 routes**. The gear ablation adds **816 prepared routes**.
- Conservation uses the existing priority policy when a living member is below 45% Health or forecast Health over three seconds, including pending healing, falls below 65%. Wasteful play adds Healing Wave in spare cast time, including overheal. One mistake means one entire wasteful opening, not one bad cast. These alter simulated player choices only.
- OOM: Mana below the cheapest spell cost for more than one cumulative second. OOM is not a causal diagnosis of every loss. Boss-entry means include boss-reaching routes only; survival differences can bias comparisons. These are automated-policy results, not measured human clear rates.
- Main evidence: `bat-93-conserve-screen.json`, `bat-93-conserve-final.json`, `bat-93-gear.json`, `bat-93-waiting.json`. Original proactive-policy 18-setting files `bat-93-screen.json` / `bat-93-final.json` are historical diagnostics, not the revised screen.

## Complete 27-setting screen

Prepared full-route completion, including boss. Two seeds per path; use this to screen, not estimate final clear rates.

| Recovery | Base/sec | Item scale | Ch 1 | Ch 2 | Ch 3 | Ch 4 |
|---|---:|---:|---:|---:|---:|---:|
| 0% | 2 | 1× | 0% | 0% | 0% | 38% |
| 0% | 2 | 1.25× | 50% | 0% | 0% | 88% |
| 0% | 2 | 1.5× | 50% | 0% | 0% | 100% |
| 0% | 2.5 | 1× | 50% | 0% | 0% | 75% |
| 0% | 2.5 | 1.25× | 50% | 0% | 0% | 100% |
| 0% | 2.5 | 1.5× | 50% | 0% | 0% | 100% |
| 0% | 3 | 1× | 50% | 0% | 0% | 100% |
| 0% | 3 | 1.25× | 50% | 0% | 0% | 100% |
| 0% | 3 | 1.5× | 50% | 0% | 0% | 100% |
| 10% | 2 | 1× | 50% | 0% | 0% | 100% |
| 10% | 2 | 1.25× | 50% | 0% | 0% | 100% |
| 10% | 2 | 1.5× | 50% | 0% | 0% | 100% |
| 10% | 2.5 | 1× | 50% | 0% | 0% | 100% |
| 10% | 2.5 | 1.25× | 50% | 0% | 0% | 100% |
| 10% | 2.5 | 1.5× | 50% | 50% | 0% | 100% |
| 10% | 3 | 1× | 50% | 0% | 0% | 100% |
| 10% | 3 | 1.25× | 50% | 50% | 0% | 100% |
| 10% | 3 | 1.5× | 50% | 50% | 0% | 100% |
| 20% | 2 | 1× | 50% | 0% | 0% | 100% |
| 20% | 2 | 1.25× | 50% | 50% | 0% | 100% |
| 20% | 2 | 1.5× | 50% | 50% | 0% | 100% |
| 20% | 2.5 | 1× | 50% | 50% | 0% | 100% |
| 20% | 2.5 | 1.25× | 50% | 50% | 13% | 100% |
| 20% | 2.5 | 1.5× | 50% | 50% | 50% | 100% |
| 20% | 3 | 1× | 100% | 50% | 13% | 100% |
| 20% | 3 | 1.25× | 100% | 50% | 50% | 100% |
| 20% | 3 | 1.5× | 100% | 50% | 100% | 100% |

## Deeper finalists

Prepared conservation, all paths/builds, eight seeds. Entries below are completion / boss-entry Mana.

| Recovery / base / item scale | Ch 1 | Ch 2 | Ch 3 | Ch 4 |
|---|---:|---:|---:|---:|
| 10% / 3 / 1.5× | 81% / 432 | 41% / 175 | 58% / 311 | 89% / 776 |
| 20% / 2.5 / 1.5× | 88% / 501 | 59% / 289 | 85% / 485 | 91% / 808 |
| 20% / 3 / 1.25× | 100% / 532 | 63% / 315 | 83% / 476 | 93% / 810 |
| 20% / 3 / 1.5× | 100% / 543 | 78% / 345 | 96% / 570 | 95% / 825 |

Selected setting; failure = 100% − completion. Any OOM includes the boss.

| Ch | Stage | Attempts | Normals cleared | Full route | Failure | Boss Mana | Any OOM | Normal OOM |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | first | 16 | 100% | 63% | 38% | 382 | 100% | 0% |
| 1 | ready | 16 | 100% | 100% | 0% | 543 | 25% | 0% |
| 2 | first | 32 | 75% | 6% | 94% | 168 | 100% | 88% |
| 2 | ready | 32 | 100% | 78% | 22% | 345 | 72% | 6% |
| 3 | first | 96 | 25% | 1% | 99% | 210 | 100% | 92% |
| 3 | ready | 96 | 100% | 96% | 4% | 570 | 24% | 0% |
| 4 | first | 128 | 91% | 59% | 41% | 612 | 45% | 22% |
| 4 | ready | 128 | 100% | 95% | 5% | 825 | 13% | 2% |

## Efficiency and mistake recovery

Prepared selected setting; completion / boss-entry Mana. Conditional boss averages should not be mistaken for paired changes.

| Ch | Conservation | Wasteful throughout | Wasteful opening only |
|---|---:|---:|---:|
| 1 | 100% / 543 | 0% / 161 | 88% / 394 |
| 2 | 78% / 345 | 0% / 172 | 41% / 219 |
| 3 | 96% / 570 | 0% / 198 | 86% / 481 |
| 4 | 95% / 825 | 64% / 449 | 91% / 819 |

Wasteful play fails all sampled prepared Chapter 1–3 routes and reaches the boss with much less Mana. An inefficient opening still permits 88/41/86/91% prepared completion. Chapter 4's opening mistake costs little by boss entry; this remains a pacing limitation.

## Representative route accounting

Path 0, fixed listed seeds and first chapter build. Failures are retained. Ending is after victory recovery and before loot. Capacity increases from unchanged Max Mana gear can make the next entry higher. Regen is actual capped gain; net cost = entry − ending. No boss/failure refund. JSON includes item IDs, every member's stats, snapshots, casts, overheal and OOM seconds. Values rounded here only.

### Ch 1, first, seed 920000, 1-reserves

Opening: 0 SP, 600 Max Mana, 3.00 Mana/sec including talents. Healer items: none. Boss entry: 343; failed.

| Encounter | Entry | Spent | Regen | Recovery | Ending | Net cost | Seconds | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| sentinel | 600 | 225 | 115 | 110 | 600 | 0 | 44.6 | win |
| keeper | 600 | 350 | 162 | 120 | 532 | 68 | 52.0 | win |
| watcher | 532 | 522 | 213 | 120 | 343 | 189 | 64.7 | win |
| warden | 343 | 547 | 218 | 0 | 14 | 329 | 66.0 | loss |

### Ch 1, ready, seed 920001, 1-reserves

Opening: 7 SP, 680 Max Mana, 4.87 Mana/sec including talents. Healer items: ch1-bell-of-the-vigil, ch1-book-of-last-names, ch1-sootwoven-hose. Boss entry: 633; cleared.

| Encounter | Entry | Spent | Regen | Recovery | Ending | Net cost | Seconds | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| sentinel | 680 | 190 | 147 | 43 | 680 | 0 | 37.7 | win |
| keeper | 710 | 272 | 194 | 78 | 710 | 0 | 45.0 | win |
| watcher | 710 | 487 | 268 | 142 | 633 | 77 | 56.6 | win |
| warden | 633 | 744 | 357 | 0 | 246 | 387 | 71.0 | win |

### Ch 2, first, seed 930000, 3-waves

Opening: 10 SP, 690 Max Mana, 4.32 Mana/sec including talents. Healer items: ch1-book-of-last-names, ch1-sepulcher-candle, ch1-vestment-of-quiet-prayer, ch1-sootwoven-hose. Boss entry: —; failed.

| Encounter | Entry | Spent | Regen | Recovery | Ending | Net cost | Seconds | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| briar | 690 | 439 | 185 | 138 | 574 | 116 | 49.0 | win |
| moth | 574 | 653 | 238 | 138 | 297 | 277 | 55.0 | win |
| choir | 297 | 509 | 242 | 0 | 30 | 267 | 56.0 | loss |

### Ch 2, ready, seed 930001, 3-waves

Opening: 25 SP, 760 Max Mana, 6.66 Mana/sec including talents. Healer items: ch2-dewfall-rosary, ch2-litany-of-falling-leaves, ch2-briarheart-thurible, ch2-blackbriar-jerkin, ch1-sootwoven-hose, ch1-burial-linen-hood. Boss entry: 533; cleared.

| Encounter | Entry | Spent | Regen | Recovery | Ending | Net cost | Seconds | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| briar | 760 | 475 | 273 | 152 | 710 | 50 | 47.1 | win |
| moth | 710 | 475 | 323 | 152 | 710 | 0 | 48.5 | win |
| choir | 710 | 687 | 359 | 152 | 533 | 176 | 53.9 | win |
| matriarch | 533 | 878 | 489 | 0 | 144 | 389 | 73.4 | win |

### Ch 3, first, seed 940000, 5-flow

Opening: 18 SP, 725 Max Mana, 5.58 Mana/sec including talents. Healer items: ch1-bell-of-the-vigil, ch1-book-of-last-names, ch2-briarheart-thurible, ch1-sootwoven-hose, ch1-burial-linen-hood. Boss entry: —; failed.

| Encounter | Entry | Spent | Regen | Recovery | Ending | Net cost | Seconds | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| gatekeeper | 725 | 461 | 206 | 145 | 615 | 110 | 43.0 | win |
| twins | 615 | 525 | 262 | 145 | 497 | 118 | 47.0 | win |
| furnace | 497 | 658 | 286 | 145 | 270 | 227 | 51.2 | win |
| harrier | 270 | 542 | 303 | 145 | 175 | 94 | 54.2 | win |
| bridge | 175 | 307 | 156 | 0 | 25 | 151 | 28.0 | loss |

### Ch 3, ready, seed 940000, 5-flow

Opening: 32 SP, 795 Max Mana, 6.39 Mana/sec including talents. Healer items: ch3-canticles-in-copper, ch3-lantern-of-unspent-dawn, ch1-bell-of-the-vigil, ch3-ashscript-pantaloons, ch1-burial-linen-hood. Boss entry: 488; cleared.

| Encounter | Entry | Spent | Regen | Recovery | Ending | Net cost | Seconds | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| gatekeeper | 795 | 342 | 210 | 132 | 795 | 0 | 39.0 | win |
| twins | 795 | 429 | 243 | 159 | 768 | 27 | 43.0 | win |
| furnace | 768 | 565 | 300 | 159 | 662 | 106 | 47.0 | win |
| harrier | 662 | 493 | 313 | 159 | 641 | 21 | 49.0 | win |
| bridge | 641 | 630 | 318 | 159 | 488 | 153 | 49.8 | win |
| regent | 488 | 833 | 430 | 0 | 86 | 403 | 67.4 | win |

### Ch 4, first, seed 950000, 7-earth

Opening: 35 SP, 830 Max Mana, 8.19 Mana/sec including talents. Healer items: ch3-salamander-egg, ch3-canticles-in-copper, ch3-phoenixroot-branch, ch3-vest-of-the-last-pyre, ch3-ashscript-pantaloons, ch3-smokefox-visage. Boss entry: 830; cleared.

| Encounter | Entry | Spent | Regen | Recovery | Ending | Net cost | Seconds | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| huntsman | 830 | 322 | 276 | 46 | 830 | 0 | 44.8 | win |
| hounds | 830 | 265 | 249 | 16 | 830 | 0 | 44.4 | win |
| chapel | 830 | 385 | 330 | 55 | 830 | 0 | 47.0 | win |
| leech | 830 | 594 | 386 | 166 | 788 | 42 | 51.0 | win |
| garden | 788 | 510 | 450 | 101 | 830 | -42 | 56.6 | win |
| duchess | 830 | 965 | 554 | 0 | 419 | 411 | 75.4 | win |

### Ch 4, ready, seed 950000, 7-earth

Opening: 35 SP, 830 Max Mana, 8.19 Mana/sec including talents. Healer items: ch3-salamander-egg, ch3-canticles-in-copper, ch3-phoenixroot-branch, ch3-vest-of-the-last-pyre, ch3-ashscript-pantaloons, ch3-smokefox-visage. Boss entry: 875; cleared.

| Encounter | Entry | Spent | Regen | Recovery | Ending | Net cost | Seconds | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| huntsman | 830 | 206 | 206 | 0 | 830 | 0 | 36.3 | win |
| hounds | 830 | 263 | 253 | 10 | 830 | 0 | 39.4 | win |
| chapel | 875 | 444 | 356 | 88 | 875 | 0 | 44.6 | win |
| leech | 875 | 531 | 336 | 175 | 855 | 20 | 47.0 | win |
| garden | 855 | 462 | 412 | 70 | 875 | -20 | 52.0 | win |
| duchess | 875 | 915 | 561 | 0 | 521 | 354 | 71.0 | win |

## Regen gear sustainability

Prepared conservation at 20% / 3/sec; all paths/builds, eight seeds. Each entry is completion / boss-entry Mana. Item identities and all other stats stay fixed.

| Item scale | Ch 1 | Ch 2 | Ch 3 | Ch 4 |
|---|---:|---:|---:|---:|
| 1× | 100% / 521 | 53% / 284 | 67% / 377 | 91% / 782 |
| 1.25× | 100% / 532 | 63% / 315 | 83% / 476 | 93% / 810 |
| 1.5× | 100% / 543 | 78% / 345 | 96% / 570 | 95% / 825 |

Chapter 3 normal OOM drops from 19% at 1× to 4% at 1.25× to 0% at 1.5×. Chapter 2 drops from 22% to 13% to 6%. Regen items materially improve resource stability while widespread wasteful play remains costly.

## Pressure defects and residual refills

1264 isolated probes cover reached normal loadouts, every path/build, two seeds and first/ready stages. Each re-entry starts full Health and half Mana. Of 632 zero-cast probes, 16 win without deaths; all are **prepared Chapter 4 Huntsman, seed 950000**, repeated over four paths/four builds. This is one loadout family, not 16 independent random successes. No additional zero-cast safe clear was found in the sampled loadouts. The screening flag for effectively zero healing is at most one cast and at most 5% of total party max Health healed, with victory/no deaths; it found no further cases.

The fixed Huntsman witness wins under all **27** settings in 36.3s, casts zero and loses nobody. At the selected setting it refills **415/830 → 830/830**. This is an **encounter-pressure defect at intended prepared gear**, documented in `bat-93-pressure-defects.md` for targeted correction after this Mana choice; it is not justification for lowering global Regen. Encounters remain untouched in BAT-93.

Active conservation re-entry probes gain more than 1 Mana in Ch 1: 10/24; Ch 2: 5/48; Ch 3: 74/240; Ch 4: 312/320. These require healer casts, so are not zero-heal defects by the narrow flag. Late resource surplus is still visible and must not be presented as full no-farming acceptance. No artificial net-gain cap was introduced. Between fights/while paused there is no passive Regen.

## Implementation and validation

Only CONFIG recovery/base Regen and the 18 authored item Regen values change for balance. Regression hashes confirm fixed BAT-91 encounter HP/damage/timing/mechanics, spells, Shaman talents and all non-Regen item fields. Max Mana and spell costs remain unchanged. No Priest/Druid balancing or Chapters 5–8 work.

The map uses the reconciled persisted ChapterRuns resource state. Current/max Mana sits left of the legend on desktop and wraps above it on mobile. Unstarted previews hide it; actual completed runs retain their saved value. Reload, healer/gear reconciliation, victory, arbitrary persisted changes, restart and hard reset are covered.

**252/252 tests pass; git diff --check passes.** Browser QA at the selected setting verifies fresh 600/600, 420.4/780 displayed as 420/780 and retained on reload, real 44.6s Shaman victory with 333.061 combat-exit Mana + exactly 156 recovery = 489.061 persisted (489/780 on map), restart 780/780 and hard reset 600/600. Desktop placement is left/same row. Mobile 390×844 wraps cleanly with no horizontal overflow; console has no warnings/errors. QA uses isolated bat93.localhost storage and ignored test controls; user saves are preserved. Captures: `.tmp/bat93-map.png`, `.tmp/bat93-mobile.png`.

Earlier test adjustments remain: configured Regen replaces obsolete literal Regen expectations, the historical Priest triage fixture keeps 2/sec, and the long-capacity gear band is <2.1 because approved item scaling gives Chapter 1 a discrete ratio of 2.045. No pressure/cost assertion was removed.

## Reproduction and checkpoint

```powershell
node scripts/mana-economy.mjs screen 2 docs/bat-93-conserve-screen.json
$env:CANDIDATES='[{"recovery":0.1,"baseRegen":3,"gearScale":1.5},{"recovery":0.2,"baseRegen":2.5,"gearScale":1.5},{"recovery":0.2,"baseRegen":3,"gearScale":1.25},{"recovery":0.2,"baseRegen":3,"gearScale":1.5}]'
node scripts/mana-economy.mjs final 8 docs/bat-93-conserve-final.json
Remove-Item Env:CANDIDATES
node scripts/mana-economy.mjs gear 8 docs/bat-93-gear.json
node scripts/mana-waiting.mjs docs/bat-93-waiting.json 2
node scripts/mana-economy-report.mjs
npm.cmd test
git diff --check
```

Clear POLICIES/TUNING environment overrides if present. All work remains local on dev. Recommend a checkpoint commit for the tested BAT-91/BAT-93 work and evidence before targeted pressure corrections. A stable dev → main PR should follow resolution or explicit acceptance of the documented pacing limitations. No commit/push was authorized or performed.
