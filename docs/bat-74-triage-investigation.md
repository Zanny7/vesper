# BAT-74: Legacy triage simulations

Reproduce the measurements with `node scripts/bat-74-diagnostics.mjs`. The script uses the same 60 Hz combat step and fixed seeds as the tests. It records casts, raw/effective healing, overhealing, incoming damage, duration, deaths, and final resources. All cases use the current production spell values: Flash Heal 90/30 Mana, Greater Heal 200/45, Prayer 100 per ally/75, and Penance 60 per bolt/30. No production tuning was changed.

## Campaign healing floor

The first failure is Briar, seed 1. The historical 1,200 Mana / 4 Mana per second Priest wins in 21.4 seconds with no deaths. Four Flash Heals produce exactly **360 effective healing**, **0 overhealing**, and 1,137.93 Mana remains. Final party Health is `[569, 352, 352, 352, 352]`. The previous `>400` floor cannot hold for a four-cast fight with current 90-point Flash Heal; it reflected the older 100-point value.

The same no-gear, no-talent campaign script was also checking bosses. Once the healing assertion is bypassed, all 20 Duchess seeds lose. Seed 1 reaches 146.4 seconds with 96 boss Health left; the tank dies, Mana is 20.33, effective healing is 7,043, and overhealing is 777. Its 44 casts are 32 Flash, 9 Prayer, 2 Penance, and 1 Greater. This is an outdated test setup for bosses now tuned around persistent resources, earned talents, and chapter loot. The separate boss-balance simulator in `scripts/boss-balance.mjs` models those inputs.

**Diagnosis: stale healing threshold plus outdated boss scope.** The legacy regression now covers Chapter 2–4 normal encounters and requires at least 360 effective healing, the observed four current Flash Heals in Briar. Across 21 normal encounters and 20 seeds each, the historical strategy wins **420/420**, with zero deaths, minimum effective healing **360**, maximum duration **37.62 seconds**, and minimum remaining Mana **922.4**. Victory, death, and duration checks remain. Boss readiness remains covered by the boss-balance tooling and its current progression model.

## Default encounter triage

The old `new Combat()` default selects `ENCOUNTER`, a 4,200 Health historical Warden fixture. Seed 1 loses at 100.02 seconds when the tank dies. The boss still has 1,802 Health; Mana is 57.83 and party Health is `[0, 213, 248, 248, 230]`. The script casts 11 Flash, 4 Prayer, and 2 Greater, with **no Penance**. Its 3,390 raw healing yields 3,122 effective healing and 268 overhealing. Incoming damage totals 1,312 strikes, 605 shards, 630 crush, 1,600 pulses, and 288 marks.

A current policy adapted from `scripts/boss-balance.mjs` uses Penance at 100 missing Health, Prayer when three allies are injured and its immediate useful healing reaches 240, Greater on a tank missing 140, Flash on another ally missing 105, and Holy Fire when Mana is plentiful. On the historical 4,200 Health fixture it also loses: at 112.82 seconds the tank dies, 1,479 boss Health remains, Mana is 17.63, effective healing is 3,415, and overhealing is 360.6. It casts 3 Holy Fire, 6 Penance, 7 Flash, 4 Prayer, and 2 Greater. A second policy prioritizing efficient Greater and Prayer casts lasts to 132.02 seconds but still loses with 1,013 boss Health left and 26.03 Mana. The legacy fixture exceeds the current baseline healer budget; simply changing cast order does not restore the old assertion.

The playable Chapter 1 boss is `CHAPTER_ENCOUNTERS.warden`, with 1,700 Health and its own strike/add pressure. The old script already wins this actual boss on seed 1, but spends Mana mainly on 18 Flash casts and ends with 24.8 Mana. The current policy wins **20/20 fixed seeds**, with no deaths, 70.02-second fights, 2,451–2,715 effective healing, and 16.8–91.8 Mana remaining. Seed 1 casts 4 Holy Fire, 5 Penance, 7 Flash, 2 Prayer, and 4 Greater, producing 2,533 effective healing and 332.51 overhealing. Final Health is `[435.09, 354, 377, 377, 400]`; Mana is 61.8.

**Diagnosis: outdated test fixture and strategy, not a production balance regression in the current Chapter 1 boss.** The test now runs a seeded current-policy scenario against the actual campaign Warden and checks victory, no deaths, duration, effective healing, and Mana use. The historical default fixture remains available for lower-level combat tests, but its 4,200 Health is not a current campaign balance target. No encounter or healer value was changed.

## Validation

- Focused `node --test tests/campaign.test.mjs tests/combat.test.mjs`: **22/22 passed**.
- Full `npm.cmd test`: **149/149 passed** in the shared working tree. Other pre-existing local edits also repaired unrelated BAT-71 failures; this total is not solely attributable to BAT-74.
