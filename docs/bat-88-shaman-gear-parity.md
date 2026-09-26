# BAT-88: Shaman gear parity and BAT-87 handoff

Result: added 24 Shaman items (one per healer slot per chapter), all with local SVG artwork. Shaman now participates in the actual depth-based normal loot rotation and the existing hidden chapter-boss bonus pools. Original Priest/Druid/companion items, normal encounter rotations, combat configuration and nominal drop weights are unchanged.

Baseline defect: zero authored Shaman items; no Shaman owner in normal loot tables. Shared armor/trinkets were equip-compatible, but Weapons/Tomes require matching owner, leaving Shaman without either slot across all four chapters. The existing sampling helper also scored Shaman as a companion; its healer detection now uses the shared healer registry.

## Coverage, access and all added items

Each healer now has one authored item per slot per chapter. Practical eligible counts per chapter are identical: Weapon 1, Tome 1, Trinket 7, Head 7, Chest 7, Legs 7. The larger counts include shared gear authored for the other characters. Item levels match per slot: Weapon/Trinket 3, 6, 9, 12; Tome/Chest 2, 5, 8, 11; Head/Legs 1, 4, 7, 10.

In Chapters 1–2, authored Weapon/Tome/Trinket appear before the boss on every route (1/1 and 2/2 routes respectively); authored Head is the boss normal reward; authored Chest/Legs are hidden bonus-only. Universal companion armor provides pre-boss defensive alternatives in every slot. In Chapters 3–4, Weapon/Tome/Trinket/Head/Chest appear at depths 0/1/2/3/4 on all four routes; Legs is the boss normal reward. No branch brings an authored healer slot earlier or later for one class.

Hidden bonuses are the chapter catalogue minus that boss's normal preview, rather than separate bonus-only item definitions. All three healers have five authored items in each hidden boss pool. Only Chest/Legs in Chapters 1–2 are unavailable from the normal tables. In Chapters 3–4 all five hidden authored items also appear before the boss. No extra hidden-exclusive items were invented.

Availability below lists encounter IDs (all matching-depth branch encounters are included). "Hidden" means boss bonus only; "boss normal" means the ordinary boss table. Detailed compatible-item stats and reward sources are in [bat-88-gear-parity.json](bat-88-gear-parity.json); the original audit is [bat-88-before-gear-parity.json](bat-88-before-gear-parity.json).

| Ch | Slot | Added Shaman item | ilvl | Normal availability | Budget P / D / S | Shaman stats |
| --- | --- | --- | ---: | --- | --- | --- |
| 1 | Weapon | Gravewater Conduit | 3 | sentinel | 2 / 2.1 / 2.07 | spellPower +9, maxHp +8 |
| 1 | Tome | Whispers in Riverstone | 2 | keeper | 1.71 / 2.49 / 2.23 | maxMana +50, manaRegen +0.1 |
| 1 | Trinket | Ancestral Shell | 3 | watcher | 4.8 / 4.43 / 4.63 | manaRegen +0.55, maxMana +8 |
| 1 | Head | Mistcaller Cowl | 1 | boss normal | 0.83 / 1 / 1.07 | maxHp +22, resistance +1 |
| 1 | Chest | Spiritbound Hauberk | 2 | Hidden | 1.5 / 1.33 / 1.6 | armor +1, resistance +3, maxHp +8 |
| 1 | Legs | Siltwalker Bindings | 1 | Hidden | 0.67 / 0.67 / 0.67 | armor +1, maxHp +10 |
| 2 | Weapon | Thunderreed Channeler | 6 | briar | 5 / 5.4 / 5.2 | spellPower +16, manaRegen +0.25 |
| 2 | Tome | Rainkeeper Tablets | 5 | moth, boar | 3.31 / 3.09 / 3.17 | maxMana +90, spellPower +3 |
| 2 | Trinket | Stormcallers Bead | 6 | choir, mire | 8.5 / 7.87 / 8.27 | manaRegen +0.95, maxHp +10, resistance +1 |
| 2 | Head | Cloudherd Headdress | 4 | boss normal | 2 / 1.83 / 1.93 | maxHp +38, armor +1, resistance +1 |
| 2 | Chest | Torrent Scaleguard | 5 | Hidden | 2.17 / 2.67 / 2.27 | armor +4, maxHp +28 |
| 2 | Legs | Fordkeepers Greaves | 4 | Hidden | 1.9 / 1.9 / 1.9 | resistance +4, maxMana +20 |
| 3 | Weapon | Cinderstorm Focus | 9 | gatekeeper | 5.57 / 5.27 / 5.42 | spellPower +24, maxMana +10, maxHp +10 |
| 3 | Tome | Songs of Molten Rain | 8 | twins, ravens | 4.71 / 5.69 / 4.96 | maxMana +120, manaRegen +0.15, resistance +1 |
| 3 | Trinket | Emberheart Totem | 9 | furnace | 13.6 / 11.2 / 12.4 | manaRegen +1.45, spellPower +4 |
| 3 | Head | Ashcloud Visor | 7 | harrier, tribunal | 2.83 / 2.5 / 2.67 | maxHp +50, resistance +2, armor +1 |
| 3 | Chest | Lavaward Scales | 8 | bridge, bells | 3.5 / 3.33 / 3.5 | resistance +7, maxHp +35 |
| 3 | Legs | Obsidian Current Treads | 7 | boss normal | 2.05 / 3.38 / 2.71 | armor +6, maxMana +25 |
| 4 | Weapon | Moonstorm Scepter | 12 | huntsman | 7.63 / 7.4 / 7.43 | spellPower +33, maxHp +15, resistance +1 |
| 4 | Tome | Covenant of Deep Waters | 11 | hounds, roses | 5.71 / 5.14 / 5.43 | maxMana +155, spellPower +5 |
| 4 | Trinket | Pearl of the Elder Tide | 12 | chapel | 17 / 17 / 16.83 | manaRegen +2, maxHp +15, armor +1 |
| 4 | Head | Nighttide Crown | 10 | leech, procession | 3.5 / 3.33 / 3.4 | maxHp +62, armor +2, resistance +2 |
| 4 | Chest | Tempest Courtmail | 11 | garden, cryptkeeper | 4.67 / 4.33 / 4.5 | armor +8, maxHp +55 |
| 4 | Legs | Starwater Legguards | 10 | boss normal | 3.48 / 3.81 / 3.48 | resistance +7, maxMana +40 |

## Stat budgets and compatibility

Budget is an audit score: HP/30 + Mana/35 + regeneration×8 + Spell Power/5 + Haste/2 + Crit/2 + armor/3 + resistance/3. It is not an in-game multiplier or a guarantee of equal effective spell throughput. Shaman per-slot scores stay between the peers or within 20% of their envelope. No Priest/Druid stats changed. No authored catalogue item currently grants Haste or Crit; both remain zero for all three classes in these samples. Defense protects Physical/Magic damage; Bleed/Chaos bypass it.

The following totals are the six authored current-chapter items equipped by their owner, with base stats excluded. They are a budget comparison, not a guaranteed loadout.

| Ch | Healer | Budget | SP | Mana | Regen/s | HP | Armor | Resistance |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | priest | 11.51 | 10 | 60 | 0.6 | 40 | 2 | 3 |
| 1 | druid | 12.02 | 8 | 60 | 0.65 | 55 | 2 | 3 |
| 1 | shaman | 12.27 | 9 | 58 | 0.65 | 48 | 2 | 4 |
| 2 | priest | 22.88 | 20 | 115 | 1.2 | 80 | 4 | 6 |
| 2 | druid | 22.76 | 19 | 100 | 1.2 | 65 | 7 | 6 |
| 2 | shaman | 22.74 | 19 | 110 | 1.2 | 76 | 5 | 6 |
| 3 | priest | 32.26 | 29 | 175 | 1.6 | 90 | 7 | 10 |
| 3 | druid | 31.37 | 27 | 140 | 1.6 | 105 | 8 | 9 |
| 3 | shaman | 31.66 | 28 | 155 | 1.6 | 95 | 7 | 10 |
| 4 | priest | 41.99 | 39 | 205 | 2 | 150 | 11 | 11 |
| 4 | druid | 41.01 | 37 | 185 | 2 | 140 | 12 | 11 |
| 4 | shaman | 41.07 | 38 | 195 | 2 | 147 | 11 | 10 |

Healer Weapons and Tomes remain class-exclusive. Head/Chest/Legs are universal, including any stats on them; healer-stat Trinkets work for all healers and are barred from companions. Pure defensive or damage Trinkets remain universal. categoryFor() in src/loot.js gives any item compatible with the active healer the healer category first, even companion-authored armor or defensive Trinkets. Thus "30% healer" does not mean "30% class-authored gear." These existing rules and their tradeoffs are preserved.

Normal drop count remains 50% zero / 35% one / 15% two. Category weights remain healer 30%, each companion 17.5%, renormalized over remaining categories; candidates within a category are uniform and owned IDs are removed. The additional shared Shaman armor/Trinkets expand everyone's eligible candidate pool and can delay its exhaustion. This necessary content addition changes individual-item odds inside that pool; it does not change nominal category weights, counts or the guaranteed single boss bonus. No probabilities were deliberately retuned.

## Companion invariance

PASS for Aldric, Nyx, Sera and Theron across all normal/branch/boss tables and bonus pools. buildNormalLootTables() now uses fixed companion offsets (tank 2, rogue 3, mage 4, ranger 5), preserving every original encounter item ID even when adding a healer. categoryFor()/canEquipItem() use the selected companion owner, never the healer's identity, for companion eligibility. Armor access and item uniqueness are shared. The audit finds zero companion pool differences between Priest/Druid/Shaman. Fixed ownership states also retain the same category chances; independently acquired/equipped gear need not produce identical stats because shared items can be allocated differently.

## Real-loot progression snapshots

Reproduce: node scripts/shaman-gear-progression.mjs 256. Live normal/hidden boss loot, shared compatibility, no duplicates, shared weighted equipment sampler. Previous chapters use average-profile recursive inheritance (3 farming routes, boss approach, normal and bonus boss rewards, then 0–1 extra routes). Current chapter snapshots are before its boss. Victories assumed; no talents or combat simulation.

Uses 256 seeds per class/chapter, the same seed schedule across healers, 0–5 sequential route clears, real normal/bonus rolls and canEquipItem(). Equipment selection uses the existing stat-weighted shared sampler with single-item ownership and an authored-owner preference. It is a reasonable greedy gear allocation, not an optimal or enforced player decision. No synthetic stat grants, talent bonuses or combat tuning.

These are actual median-by-occupied-slot representative Shaman saves, selected from the samples. Current-chapter slots may contain universal gear from another owner. Party ilvl averages the five character averages with empty slots counting as zero. More routes improve opportunities but do not guarantee a drop or all slots. Full loadouts, prior-chapter histories, mean stats and per-slot occupancy are in [bat-88-gear-progression.json](bat-88-gear-progression.json).

| Ch | Clears | Seed | Current healer slots | Mean count / 6 | Party ilvl | SP | Mana | Regen/s | HP | Armor / Resist |
| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 1 | 88011 | Legs | 0.66 | 0.03 | 0 | 600 | 2 | 420 | 0 / 0 |
| 1 | 2 | 88083 | Weapon | 1.43 | 0.37 | 9 | 600 | 2 | 408 | 0 / 0 |
| 1 | 3 | 88226 | Weapon, Legs | 2.09 | 0.45 | 9 | 600 | 2 | 428 | 0 / 0 |
| 1 | 4 | 88108 | Weapon, Tome, Trinket | 2.73 | 0.51 | 9 | 665 | 2.6 | 408 | 0 / 0 |
| 1 | 5 | 88085 | Weapon, Trinket, Legs | 3.31 | 0.84 | 9 | 608 | 2.55 | 428 | 0 / 0 |
| 2 | 1 | 98125 | none | 0.61 | 1.59 | 9 | 658 | 2.65 | 448 | 3 / 0 |
| 2 | 2 | 98148 | Trinket | 1.37 | 1.49 | 9 | 600 | 2 | 508 | 3 / 2 |
| 2 | 3 | 98090 | Trinket, Chest | 2.1 | 1.64 | 9 | 650 | 3 | 478 | 5 / 3 |
| 2 | 4 | 98212 | Weapon, Chest, Legs | 2.73 | 1.65 | 16 | 608 | 2.8 | 495 | 5 / 2 |
| 2 | 5 | 98004 | Weapon, Tome, Trinket, Legs | 3.46 | 1.83 | 19 | 690 | 3.25 | 445 | 2 / 2 |
| 3 | 1 | 108016 | Chest | 1.19 | 3.25 | 16 | 650 | 3.3 | 485 | 0 / 10 |
| 3 | 2 | 108171 | Head, Chest | 2.29 | 4.36 | 19 | 690 | 2.25 | 580 | 3 / 11 |
| 3 | 3 | 108169 | Trinket, Head, Chest | 3.17 | 4.78 | 13 | 600 | 3.6 | 533 | 1 / 8 |
| 3 | 4 | 108145 | Trinket, Head, Chest, Legs | 3.96 | 5.13 | 20 | 650 | 3.8 | 525 | 5 / 10 |
| 3 | 5 | 108021 | Weapon, Tome, Trinket, Head, Chest | 4.52 | 5.1 | 28 | 730 | 3.6 | 535 | 1 / 12 |
| 4 | 1 | 118098 | Chest | 1.07 | 6.61 | 24 | 763 | 2.7 | 503 | 13 / 2 |
| 4 | 2 | 118005 | Tome, Head | 2.18 | 7.47 | 33 | 765 | 3.45 | 575 | 5 / 10 |
| 4 | 3 | 118126 | Weapon, Tome, Head | 3.19 | 8.05 | 42 | 755 | 3.6 | 550 | 9 / 8 |
| 4 | 4 | 118039 | Weapon, Trinket, Head, Legs | 3.99 | 8.42 | 33 | 720 | 4.15 | 607 | 5 / 17 |
| 4 | 5 | 118185 | Weapon, Tome, Trinket, Head, Chest | 4.62 | 8.67 | 38 | 755 | 4 | 570 | 14 / 7 |

All representative and mean Haste/Crit values are 0%. A same-checkpoint comparison at three clears (means, including base stats and inherited gear):

| Ch | Healer | Current slots / 6 | Party ilvl | SP | Mana | Regen/s |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | priest | 2.09 | 0.44 | 3.2 | 623.8 | 2.28 |
| 1 | druid | 2.09 | 0.44 | 2.56 | 618.82 | 2.33 |
| 1 | shaman | 2.09 | 0.44 | 2.88 | 620.72 | 2.31 |
| 2 | priest | 2.09 | 1.59 | 10.46 | 651.84 | 2.81 |
| 2 | druid | 2.1 | 1.6 | 9.43 | 642.24 | 2.89 |
| 2 | shaman | 2.1 | 1.59 | 9.72 | 647.86 | 2.85 |
| 3 | priest | 3.19 | 4.57 | 20.72 | 690.49 | 3.31 |
| 3 | druid | 2.98 | 4.55 | 17.55 | 671.27 | 3.54 |
| 3 | shaman | 3.17 | 4.57 | 19.74 | 680.09 | 3.39 |
| 4 | priest | 3.17 | 7.88 | 29.4 | 731.4 | 3.8 |
| 4 | druid | 2.98 | 7.84 | 25.28 | 703.77 | 4.05 |
| 4 | shaman | 3.19 | 7.88 | 28.54 | 719.81 | 3.88 |

Shaman's mean Spell Power, Mana and regeneration fall within the Priest/Druid ranges at every 1–5-clear checkpoint in all four chapters. Maximum cross-healer difference in mean party ilvl across those checkpoints is under 0.06. Later Druid slot counts sometimes trail the others because the sampler values earlier regeneration gear over newer items; it is a stat tradeoff, not missing loot access.

## Validation and BAT-87 limitations

- Full suite: 217/217 pass (baseline 211/211). Coverage includes all authored slots/ilvls/budget bounds/routes, original encounter rotations, nominal category boundaries, hidden/normal rewards, exclusive/shared compatibility, stat application, separate healer equipment reload, actual sampled loadout validity, duplicate/invalid IDs and distinct local artwork.
- Browser: all 156 catalogue images load; keyboard-equipped all six Shaman slots at Chapter 1 and then Chapter 4, with correct displayed totals. Checked live Shaman Team slots and Chapter 1 first-encounter weapon preview / boss Head preview and Chapter 4 boss Legs preview. No combat outcomes or random live reward rolls were asserted; those roll paths have automated coverage. Catalogue uses no player storage. A pre-existing local server was reused after npm start reported port 5173 in use.
- [Browser equipment evidence](screenshots/bat-88-shaman-equipment.png). Chapter 4 totals: +38 SP, +195 Mana, +2 regen/s, +147 HP, +11 armor, +10 resistance.
- Existing catalogue mouse-picker interaction can close on scroll/focus; keyboard activation worked. No unrelated UI change was included.
- BAT-87 should use these real loot/save loadouts and sampleGearProgression(), including inheritance, routes and gear allocation. Its encounter driver still needs Shaman-specific talent builds/loadouts and cast policy: the old boss-balance.mjs fight/allocations functions remain Priest/Druid-only. Only that helper's equipment scoring was extended here.
- Route and boss wins are assumed for sampling; gear access parity does not prove Shaman can win all chapters. BAT-87 owns victory rates, the first-run Chapter 1 strength red flag and numerical spell/talent adjustments. No baseline spells, talents or encounters changed in BAT-88.
- No save migration is required: the existing version-2 equipment records accept Shaman through the healer registry, new IDs persist normally, and old saves gain no items automatically.
- Development checkpoint is on dev; the stable main milestone awaits BAT-87 combat-balance validation.
