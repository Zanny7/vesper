# BAT-93 encounter-pressure follow-up

## Chapter 4 Huntsman — passive safe clear at intended prepared gear

**Targeted correction needed after the Mana-economy choice. No encounter was retuned in BAT-93.** Ready/current-chapter preparation is not overgearing. Reproduced across all 27 approved Mana settings; base Regen is not the cause of winning without healing.

Reproduce: `node scripts/mana-waiting.mjs docs/bat-93-waiting.json 2`. Inspect idle rows for chapter 4, encounter huntsman, seed 950000, ready. The same opening is shared by all four paths and all four chapter builds. Other sampled zero-cast encounters do not clear safely.

Witness: 36.317 seconds, 0 casts, 0 deaths, 0 Mana spent. Selected 20% / 3 / 1.5×: 415/830 entry → 712 combat exit → 830 persisted. Party auto-attacks end combat naturally; no timer/damage manipulation. Starting full Health is a legal intended state.

| Member | Max Health | Damage | Armor | Resistance | Equipped IDs |
|---|---:|---:|---:|---:|---|
| tank | 830 | 18 | 26 | 10 | ch4-oath-of-the-thorn-regent, ch3-furnace-bastion, ch3-marshal-chain, ch3-ashbark-carapace, ch3-kilnforged-greathelm, ch3-obsidian-current-treads |
| rogue | 470 | 21 | 6 | 10 | ch3-obsidian-stiletto, ch4-masquerade-spider-brooch, ch3-sootsilk-doublet, ch2-bramble-antlers, ch2-briarstep-legguards |
| mage | 440 | 29 | 8 | 3 | ch4-sovereign-moonglass, ch2-adder-fang-pendant, ch2-stormroot-cuirass, ch1-sootwoven-hose, ch1-tombwatch-sallet |
| ranger | 445 | 24 | 2 | 4 | ch4-white-hart-greatbow, ch1-shattered-reliquary, ch2-duskweald-robe, ch1-burial-linen-hood |
| shaman | 460 | 0 | 6 | 15 | ch3-salamander-egg, ch3-canticles-in-copper, ch3-phoenixroot-branch, ch3-vest-of-the-last-pyre, ch3-ashscript-pantaloons, ch3-smokefox-visage |

Full entry stats, exit Health, item IDs and all witness configurations are preserved in bat-93-waiting.json. The follow-up should restore a requirement to heal at this progression band without broadly flattening Mana Regen or changing other encounters to fit this witness. Active-healing Mana-positive fights are listed separately in the Mana report and need pacing review; no additional effectively zero-heal clear met the documented screening flag.
