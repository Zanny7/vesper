export const CONFIG = { mana: 600, baseMana: 30, manaRegen: 2, step: 1 / 60, enrage: 150 };
export const ATONEMENT_RATIO = 1;
export const DAMAGE_TYPES = ['Physical', 'Magic', 'Bleed', 'Chaos'];
export const PRIEST_TALENT_VALUES = Object.freeze({
  conservationOfFaith: Object.freeze({ manaRegenPerRank: .1 }),
  bindingLight: Object.freeze({ effectiveHealRatioByRank: Object.freeze([0, .15, .30]) }),
  earlyMercy: Object.freeze({ provisionalRatioByRank: Object.freeze([0, .30, .50]), midpoint: .5 }),
  postHaste: Object.freeze({ castAndManaReduction: .20 }),
  focusedPenance: Object.freeze({ cooldownReductionPerRank: 2 }),
  lingeringPrayer: Object.freeze({ ratio: .30, duration: 6, interval: 2, threshold: .70 }),
  fourfoldPenance: Object.freeze({ mainBolts: 3 }),
  echoOfGrace: Object.freeze({ ratio: .20 }),
  lightUnspent: Object.freeze({ overhealRatio: .40 }),
  twinPenance: Object.freeze({ charges: 2 }),
  sanctuary: Object.freeze({ reduction: .20, duration: 12, cooldown: 60 }),
  divineFervor: Object.freeze({ speed: .20, manaReduction: .20, duration: 15, cooldown: 60 }),
});
export const DRUID_TALENT_VALUES = Object.freeze({
  naturalRegeneration: Object.freeze({ manaRegenPerRank: .2 }),
  abundantNourishment: Object.freeze({ healingPerHotPerRank: 20 }),
});
export const SHAMAN_TALENT_VALUES = Object.freeze({
  tidalReserves: Object.freeze({ manaRegenPerRank: .10 }),
  deepRiptide: Object.freeze({ periodicBonusPerRank: .10 }),
  tidalMomentum: Object.freeze({ healingBonusPerRank: .10 }),
  tidalWaves: Object.freeze({ charges: 2, castReduction: .20 }),
  highTide: Object.freeze({ jumpLossByRank: Object.freeze([.20, .125, .05]) }),
  restorativeStream: Object.freeze({ healingBonusPerRank: .15 }),
  flowingRiptide: Object.freeze({ charges: 2, threshold: .90 }),
  cascadingStream: Object.freeze({ ratio: .50, targets: 3 }),
  doubleCurrent: Object.freeze({ empowerments: 2 }),
  earthliving: Object.freeze({ waveDuration: 6, chainDuration: 2, chainTargets: 2 }),
  healingTide: Object.freeze({ heal: 10, duration: 12, interval: 1, mana: 60, cooldown: 60 }),
  ancestralEcho: Object.freeze({ effectiveRatio: .50 }),
});
export const SLOTS = {
  healer: ['Weapon', 'Tome', 'Trinket', 'Head', 'Chest', 'Legs'],
  tank: ['Weapon', 'Shield', 'Trinket', 'Head', 'Chest', 'Legs'],
  rogue: ['Sword', 'Trinket', 'Head', 'Chest', 'Legs'],
  mage: ['Staff', 'Trinket', 'Head', 'Chest', 'Legs'],
  ranger: ['Bow', 'Trinket', 'Head', 'Chest', 'Legs'],
};

// Item level describes a budget; it never multiplies stats automatically.
export const GEAR_CHAPTER_BANDS = { 1: [1, 3], 2: [4, 6], 3: [7, 9], 4: [10, 12] };
export const GEAR_LOOT_WEIGHTS = Object.freeze({ healer: .3, all: .3, tank: .175, damage: .225 });
// Role eligibility and budgets: docs/bat-92-itemization.md.
export const GEAR = [
  {"id":"ch1-sepulcher-candle","slot":"Weapon","name":"Sepulcher Candle","chapter":1,"itemLevel":3,"icon":"/assets/items/ch1-sepulcher-candle.svg","flavor":"Its flame leans toward the living.","stats":{"spellPower":6,"maxMana":30,"manaRegen":0.1},"role":"healer"},
  {"id":"ch1-book-of-last-names","slot":"Tome","name":"Book of Last Names","chapter":1,"itemLevel":3,"icon":"/assets/items/ch1-book-of-last-names.svg","flavor":"No name is crossed out.","stats":{"spellPower":4,"maxMana":60,"manaRegen":0.3},"role":"healer"},
  {"id":"ch1-bell-of-the-vigil","slot":"Trinket","name":"Bell of the Vigil","chapter":1,"itemLevel":3,"icon":"/assets/items/ch1-bell-of-the-vigil.svg","flavor":"A sound too soft to wake the dead.","stats":{"spellPower":3,"maxMana":20,"manaRegen":0.65},"role":"healer"},
  {"id":"ch1-burial-linen-hood","slot":"Head","name":"Burial Linen Hood","chapter":1,"itemLevel":1,"icon":"/assets/items/ch1-burial-linen-hood.svg","flavor":"Clean linen in a place of dust.","stats":{"maxHp":25},"role":"all"},
  {"id":"ch1-vestment-of-quiet-prayer","slot":"Chest","name":"Vestment of Quiet Prayer","chapter":1,"itemLevel":2,"icon":"/assets/items/ch1-vestment-of-quiet-prayer.svg","flavor":"The stitched prayers face inward.","stats":{"maxHp":40,"armor":1,"resistance":1},"role":"all"},
  {"id":"ch1-processional-gaiters","slot":"Legs","name":"Processional Gaiters","chapter":1,"itemLevel":1,"icon":"/assets/items/ch1-processional-gaiters.svg","flavor":"Worn smooth by the long descent.","stats":{"maxHp":25},"role":"all"},
  {"id":"ch1-morel-cap","slot":"Head","name":"Morel Cap","chapter":1,"itemLevel":1,"icon":"/assets/items/ch1-morel-cap.svg","flavor":"Life takes shelter beneath its brim.","stats":{"maxHp":20,"armor":1},"role":"all"},
  {"id":"ch1-cryptmoss-mantle","slot":"Chest","name":"Cryptmoss Mantle","chapter":1,"itemLevel":2,"icon":"/assets/items/ch1-cryptmoss-mantle.svg","flavor":"Damp stone cannot chill its wearer.","stats":{"maxHp":30,"armor":2,"resistance":1},"role":"all"},
  {"id":"ch1-rootstitch-leggings","slot":"Legs","name":"Rootstitch Leggings","chapter":1,"itemLevel":1,"icon":"/assets/items/ch1-rootstitch-leggings.svg","flavor":"Every torn seam has grown shut.","stats":{"maxHp":20,"armor":1},"role":"all"},
  {"id":"ch1-ossuary-falchion","slot":"Weapon","name":"Ossuary Falchion","chapter":1,"itemLevel":3,"icon":"/assets/items/ch1-ossuary-falchion.svg","flavor":"Forged for a guard whose watch never ended.","stats":{"damage":3},"role":"tank"},
  {"id":"ch1-door-of-the-dead","slot":"Shield","name":"Door of the Dead","chapter":1,"itemLevel":3,"icon":"/assets/items/ch1-door-of-the-dead.svg","flavor":"The last hinge still holds.","stats":{"armor":6,"maxHp":10},"role":"tank"},
  {"id":"ch1-sentinel-seal","slot":"Trinket","name":"Sentinel Seal","chapter":1,"itemLevel":2,"icon":"/assets/items/ch1-sentinel-seal.svg","flavor":"An oath stamped into cold iron.","stats":{"maxHp":40,"armor":1,"resistance":2},"role":"tank"},
  {"id":"ch1-tombwatch-sallet","slot":"Head","name":"Tombwatch Sallet","chapter":1,"itemLevel":1,"icon":"/assets/items/ch1-tombwatch-sallet.svg","flavor":"Its visor bears a hundred candle burns.","stats":{"maxHp":10,"armor":2},"role":"all"},
  {"id":"ch1-mortuary-hauberk","slot":"Chest","name":"Mortuary Hauberk","chapter":1,"itemLevel":2,"icon":"/assets/items/ch1-mortuary-hauberk.svg","flavor":"Links of iron bind a quiet promise.","stats":{"maxHp":15,"armor":3,"resistance":1},"role":"all"},
  {"id":"ch1-stoneward-sabatons","slot":"Legs","name":"Stoneward Sabatons","chapter":1,"itemLevel":1,"icon":"/assets/items/ch1-stoneward-sabatons.svg","flavor":"Made to stand when others must flee.","stats":{"maxHp":10,"armor":2},"role":"all"},
  {"id":"ch1-graveglass-edge","owner":"rogue","slot":"Sword","name":"Graveglass Edge","chapter":1,"itemLevel":3,"icon":"/assets/items/ch1-graveglass-edge.svg","flavor":"The dark blade reflects no face.","stats":{"damage":3},"role":"damage"},
  {"id":"ch1-widow-coin","slot":"Trinket","name":"Widow Coin","chapter":1,"itemLevel":2,"icon":"/assets/items/ch1-widow-coin.svg","flavor":"Payment for a passage never taken.","stats":{"damage":1},"role":"damage"},
  {"id":"ch1-ashveil-mask","slot":"Head","name":"Ashveil Mask","chapter":1,"itemLevel":1,"icon":"/assets/items/ch1-ashveil-mask.svg","flavor":"It keeps the dust and whispers out.","stats":{"maxHp":5,"resistance":2},"role":"all"},
  {"id":"ch1-pallbearer-leather","slot":"Chest","name":"Pallbearer Leather","chapter":1,"itemLevel":2,"icon":"/assets/items/ch1-pallbearer-leather.svg","flavor":"No buckle breaks the silence.","stats":{"maxHp":10,"armor":1,"resistance":4},"role":"all"},
  {"id":"ch1-dustwalker-strides","slot":"Legs","name":"Dustwalker Strides","chapter":1,"itemLevel":1,"icon":"/assets/items/ch1-dustwalker-strides.svg","flavor":"Footprints vanish behind the wearer.","stats":{"maxHp":5,"resistance":2},"role":"all"},
  {"id":"ch1-bonewick-rod","owner":"mage","slot":"Staff","name":"Bonewick Rod","chapter":1,"itemLevel":3,"icon":"/assets/items/ch1-bonewick-rod.svg","flavor":"A blue ember burns inside the hollow.","stats":{"damage":3},"role":"damage"},
  {"id":"ch1-shattered-reliquary","slot":"Trinket","name":"Shattered Reliquary","chapter":1,"itemLevel":2,"icon":"/assets/items/ch1-shattered-reliquary.svg","flavor":"Its broken seal still turns aside a curse.","stats":{"damage":1},"role":"damage"},
  {"id":"ch1-cinder-diadem","slot":"Head","name":"Cinder Diadem","chapter":1,"itemLevel":1,"icon":"/assets/items/ch1-cinder-diadem.svg","flavor":"Warm ash gathers beneath the silver.","stats":{"maxHp":10,"armor":1,"resistance":2},"role":"all"},
  {"id":"ch1-shroud-of-pale-embers","slot":"Chest","name":"Shroud of Pale Embers","chapter":1,"itemLevel":2,"icon":"/assets/items/ch1-shroud-of-pale-embers.svg","flavor":"The fire remembers its old shape.","stats":{"maxHp":15,"armor":1,"resistance":3},"role":"all"},
  {"id":"ch1-sootwoven-hose","slot":"Legs","name":"Sootwoven Hose","chapter":1,"itemLevel":1,"icon":"/assets/items/ch1-sootwoven-hose.svg","flavor":"Blackened silk, untouched by decay.","stats":{"maxHp":10,"armor":1,"resistance":2},"role":"all"},
  {"id":"ch1-coffin-yew","owner":"ranger","slot":"Bow","name":"Coffin Yew","chapter":1,"itemLevel":3,"icon":"/assets/items/ch1-coffin-yew.svg","flavor":"Bent from wood that once enclosed a king.","stats":{"damage":3},"role":"damage"},
  {"id":"ch1-raven-quill","slot":"Trinket","name":"Raven Quill","chapter":1,"itemLevel":2,"icon":"/assets/items/ch1-raven-quill.svg","flavor":"The bird left before the doors were sealed.","stats":{"damage":1},"role":"damage"},
  {"id":"ch1-lanternwatch-hood","slot":"Head","name":"Lanternwatch Hood","chapter":1,"itemLevel":1,"icon":"/assets/items/ch1-lanternwatch-hood.svg","flavor":"A narrow brim against the grave wind.","stats":{"maxHp":15,"armor":1},"role":"all"},
  {"id":"ch1-gravepath-brigandine","slot":"Chest","name":"Gravepath Brigandine","chapter":1,"itemLevel":2,"icon":"/assets/items/ch1-gravepath-brigandine.svg","flavor":"Each plate marks a safe return.","stats":{"maxHp":25,"armor":2,"resistance":1},"role":"all"},
  {"id":"ch1-barrowtrail-chaps","slot":"Legs","name":"Barrowtrail Chaps","chapter":1,"itemLevel":1,"icon":"/assets/items/ch1-barrowtrail-chaps.svg","flavor":"Thorns and bone slide from the waxed cloth.","stats":{"maxHp":15,"armor":1},"role":"all"},
  {"id":"ch2-briarheart-thurible","slot":"Weapon","name":"Briarheart Thurible","chapter":2,"itemLevel":6,"icon":"/assets/items/ch2-briarheart-thurible.svg","flavor":"Incense curls through a cage of thorns.","stats":{"spellPower":11,"maxMana":45,"manaRegen":0.15},"role":"healer"},
  {"id":"ch2-litany-of-falling-leaves","slot":"Tome","name":"Litany of Falling Leaves","chapter":2,"itemLevel":6,"icon":"/assets/items/ch2-litany-of-falling-leaves.svg","flavor":"Each turning page sounds like autumn.","stats":{"spellPower":8,"maxMana":85,"manaRegen":0.5},"role":"healer"},
  {"id":"ch2-dewfall-rosary","slot":"Trinket","name":"Dewfall Rosary","chapter":2,"itemLevel":6,"icon":"/assets/items/ch2-dewfall-rosary.svg","flavor":"Every bead holds the morning still.","stats":{"spellPower":6,"maxMana":30,"manaRegen":1.05},"role":"healer"},
  {"id":"ch2-canopy-mitre","slot":"Head","name":"Canopy Mitre","chapter":2,"itemLevel":4,"icon":"/assets/items/ch2-canopy-mitre.svg","flavor":"Light finds its way through the woven crown.","stats":{"maxHp":40,"armor":1,"resistance":1},"role":"all"},
  {"id":"ch2-rainblessed-surplice","slot":"Chest","name":"Rainblessed Surplice","chapter":2,"itemLevel":5,"icon":"/assets/items/ch2-rainblessed-surplice.svg","flavor":"The wild rain cannot wash away its blessing.","stats":{"maxHp":65,"armor":1,"resistance":1},"role":"all"},
  {"id":"ch2-fernbound-buskins","slot":"Legs","name":"Fernbound Buskins","chapter":2,"itemLevel":4,"icon":"/assets/items/ch2-fernbound-buskins.svg","flavor":"Soft steps across a wounded wood.","stats":{"maxHp":40,"armor":1,"resistance":1},"role":"all"},
  {"id":"ch2-bramble-antlers","slot":"Head","name":"Bramble Antlers","chapter":2,"itemLevel":4,"icon":"/assets/items/ch2-bramble-antlers.svg","flavor":"Even the smallest branch knows how to guard.","stats":{"maxHp":30,"armor":2,"resistance":1},"role":"all"},
  {"id":"ch2-willowbark-coat","slot":"Chest","name":"Willowbark Coat","chapter":2,"itemLevel":5,"icon":"/assets/items/ch2-willowbark-coat.svg","flavor":"The old willow lends its patient strength.","stats":{"maxHp":50,"armor":2,"resistance":1},"role":"all"},
  {"id":"ch2-streamreed-wraps","slot":"Legs","name":"Streamreed Wraps","chapter":2,"itemLevel":4,"icon":"/assets/items/ch2-streamreed-wraps.svg","flavor":"Bound with reeds that bend but never break.","stats":{"maxHp":30,"armor":2,"resistance":1},"role":"all"},
  {"id":"ch2-ironbriar-cleaver","slot":"Weapon","name":"Ironbriar Cleaver","chapter":2,"itemLevel":6,"icon":"/assets/items/ch2-ironbriar-cleaver.svg","flavor":"Thorns have learned the weight of iron.","stats":{"damage":5},"role":"tank"},
  {"id":"ch2-heartoak-pavise","slot":"Shield","name":"Heartoak Pavise","chapter":2,"itemLevel":6,"icon":"/assets/items/ch2-heartoak-pavise.svg","flavor":"A living knot closes over every scar.","stats":{"armor":10,"maxHp":20,"resistance":1},"role":"tank"},
  {"id":"ch2-stagwarden-badge","slot":"Trinket","name":"Stagwarden Badge","chapter":2,"itemLevel":5,"icon":"/assets/items/ch2-stagwarden-badge.svg","flavor":"The herd gathers behind its bearer.","stats":{"maxHp":60,"armor":2,"resistance":3},"role":"tank"},
  {"id":"ch2-thorncrown-bascinet","slot":"Head","name":"Thorncrown Bascinet","chapter":2,"itemLevel":4,"icon":"/assets/items/ch2-thorncrown-bascinet.svg","flavor":"Steel roots protect the brow.","stats":{"maxHp":15,"armor":3,"resistance":1},"role":"all"},
  {"id":"ch2-stormroot-cuirass","slot":"Chest","name":"Stormroot Cuirass","chapter":2,"itemLevel":5,"icon":"/assets/items/ch2-stormroot-cuirass.svg","flavor":"It holds firm while the canopy breaks.","stats":{"maxHp":20,"armor":5,"resistance":1},"role":"all"},
  {"id":"ch2-bogiron-treads","slot":"Legs","name":"Bogiron Treads","chapter":2,"itemLevel":4,"icon":"/assets/items/ch2-bogiron-treads.svg","flavor":"Drawn from the mire, sworn to solid ground.","stats":{"maxHp":15,"armor":3,"resistance":1},"role":"all"},
  {"id":"ch2-nightpetal-saber","owner":"rogue","slot":"Sword","name":"Nightpetal Saber","chapter":2,"itemLevel":6,"icon":"/assets/items/ch2-nightpetal-saber.svg","flavor":"A single dark petal rides the fuller.","stats":{"damage":6},"role":"damage"},
  {"id":"ch2-adder-fang-pendant","slot":"Trinket","name":"Adder Fang Pendant","chapter":2,"itemLevel":5,"icon":"/assets/items/ch2-adder-fang-pendant.svg","flavor":"The fang is empty. The warning remains.","stats":{"damage":2},"role":"damage"},
  {"id":"ch2-mothwing-veil","slot":"Head","name":"Mothwing Veil","chapter":2,"itemLevel":4,"icon":"/assets/items/ch2-mothwing-veil.svg","flavor":"A face lost among fluttering shadows.","stats":{"maxHp":10,"armor":1,"resistance":4},"role":"all"},
  {"id":"ch2-blackbriar-jerkin","slot":"Chest","name":"Blackbriar Jerkin","chapter":2,"itemLevel":5,"icon":"/assets/items/ch2-blackbriar-jerkin.svg","flavor":"The thorns point away from the skin.","stats":{"maxHp":10,"armor":1,"resistance":6},"role":"all"},
  {"id":"ch2-foxglove-trousers","slot":"Legs","name":"Foxglove Trousers","chapter":2,"itemLevel":4,"icon":"/assets/items/ch2-foxglove-trousers.svg","flavor":"Purple thread follows the hidden paths.","stats":{"maxHp":10,"armor":1,"resistance":4},"role":"all"},
  {"id":"ch2-witchhazel-spire","owner":"mage","slot":"Staff","name":"Witchhazel Spire","chapter":2,"itemLevel":6,"icon":"/assets/items/ch2-witchhazel-spire.svg","flavor":"A violet spark nests between its forks.","stats":{"damage":6},"role":"damage"},
  {"id":"ch2-stormseed-crystal","slot":"Trinket","name":"Stormseed Crystal","chapter":2,"itemLevel":5,"icon":"/assets/items/ch2-stormseed-crystal.svg","flavor":"A thunderhead waits inside the seed.","stats":{"damage":2},"role":"damage"},
  {"id":"ch2-firefly-coronet","slot":"Head","name":"Firefly Coronet","chapter":2,"itemLevel":4,"icon":"/assets/items/ch2-firefly-coronet.svg","flavor":"Little lights circle the sleeping mind.","stats":{"maxHp":15,"armor":1,"resistance":3},"role":"all"},
  {"id":"ch2-duskweald-robe","slot":"Chest","name":"Duskweald Robe","chapter":2,"itemLevel":5,"icon":"/assets/items/ch2-duskweald-robe.svg","flavor":"The forest dusk is woven into its hem.","stats":{"maxHp":20,"armor":2,"resistance":4},"role":"all"},
  {"id":"ch2-mistspun-leggings","slot":"Legs","name":"Mistspun Leggings","chapter":2,"itemLevel":4,"icon":"/assets/items/ch2-mistspun-leggings.svg","flavor":"Mist pools in every fold.","stats":{"maxHp":15,"armor":1,"resistance":3},"role":"all"},
  {"id":"ch2-hawthorn-recurve","owner":"ranger","slot":"Bow","name":"Hawthorn Recurve","chapter":2,"itemLevel":6,"icon":"/assets/items/ch2-hawthorn-recurve.svg","flavor":"Its limbs remember the shape of a storm.","stats":{"damage":6},"role":"damage"},
  {"id":"ch2-kestrel-talon","slot":"Trinket","name":"Kestrel Talon","chapter":2,"itemLevel":5,"icon":"/assets/items/ch2-kestrel-talon.svg","flavor":"Kept from a faithful watcher of the trail.","stats":{"damage":2},"role":"damage"},
  {"id":"ch2-owlfeather-cowl","slot":"Head","name":"Owlfeather Cowl","chapter":2,"itemLevel":4,"icon":"/assets/items/ch2-owlfeather-cowl.svg","flavor":"The feathers listen to the night.","stats":{"maxHp":25,"armor":2,"resistance":1},"role":"all"},
  {"id":"ch2-greenwatch-lamellar","slot":"Chest","name":"Greenwatch Lamellar","chapter":2,"itemLevel":5,"icon":"/assets/items/ch2-greenwatch-lamellar.svg","flavor":"Small plates overlap like patient leaves.","stats":{"maxHp":35,"armor":4,"resistance":1},"role":"all"},
  {"id":"ch2-briarstep-legguards","slot":"Legs","name":"Briarstep Legguards","chapter":2,"itemLevel":4,"icon":"/assets/items/ch2-briarstep-legguards.svg","flavor":"No bramble can hold a homeward stride.","stats":{"maxHp":25,"armor":2,"resistance":1},"role":"all"},
  {"id":"ch3-lantern-of-unspent-dawn","slot":"Weapon","name":"Lantern of Unspent Dawn","chapter":3,"itemLevel":9,"icon":"/assets/items/ch3-lantern-of-unspent-dawn.svg","flavor":"One small dawn survived the burning of the citadel.","stats":{"spellPower":17,"maxMana":60,"manaRegen":0.2,"haste":1},"role":"healer"},
  {"id":"ch3-canticles-in-copper","slot":"Tome","name":"Canticles in Copper","chapter":3,"itemLevel":9,"icon":"/assets/items/ch3-canticles-in-copper.svg","flavor":"The choir is gone. Its words endure in hammered metal.","stats":{"spellPower":12,"maxMana":115,"manaRegen":0.7,"crit":1},"role":"healer"},
  {"id":"ch3-coalglass-hourglass","slot":"Trinket","name":"Coalglass Hourglass","chapter":3,"itemLevel":9,"icon":"/assets/items/ch3-coalglass-hourglass.svg","flavor":"The last ember falls, then rises again.","stats":{"spellPower":9,"maxMana":40,"manaRegen":1.5,"crit":1.5},"role":"healer"},
  {"id":"ch3-crown-of-the-ash-saint","slot":"Head","name":"Crown of the Ash Saint","chapter":3,"itemLevel":7,"icon":"/assets/items/ch3-crown-of-the-ash-saint.svg","flavor":"No throne was offered to its first bearer.","stats":{"maxHp":55,"armor":1,"resistance":1},"role":"all"},
  {"id":"ch3-furnace-chapel-vestments","slot":"Chest","name":"Furnace Chapel Vestments","chapter":3,"itemLevel":8,"icon":"/assets/items/ch3-furnace-chapel-vestments.svg","flavor":"Sparks fade before they touch the inner lining.","stats":{"maxHp":90,"armor":1,"resistance":1},"role":"all"},
  {"id":"ch3-cinderstep-sandals","slot":"Legs","name":"Cinderstep Sandals","chapter":3,"itemLevel":7,"icon":"/assets/items/ch3-cinderstep-sandals.svg","flavor":"The chapel floor still glows beneath the ash.","stats":{"maxHp":55,"armor":1,"resistance":1},"role":"all"},
  {"id":"ch3-phoenixroot-branch","slot":"Weapon","name":"Phoenixroot Branch","chapter":3,"itemLevel":9,"icon":"/assets/items/ch3-phoenixroot-branch.svg","flavor":"The first shoot after the last fire.","stats":{"spellPower":15,"maxMana":70,"manaRegen":0.25,"crit":1.5},"role":"healer"},
  {"id":"ch3-charred-ring-almanac","slot":"Tome","name":"Charred Ring Almanac","chapter":3,"itemLevel":9,"icon":"/assets/items/ch3-charred-ring-almanac.svg","flavor":"Every blackened ring records a spring to come.","stats":{"spellPower":11,"maxMana":120,"manaRegen":0.7,"haste":1},"role":"healer"},
  {"id":"ch3-salamander-egg","slot":"Trinket","name":"Salamander Egg","chapter":3,"itemLevel":9,"icon":"/assets/items/ch3-salamander-egg.svg","flavor":"Something green dreams inside the warm shell.","stats":{"spellPower":8,"maxMana":45,"manaRegen":1.6,"haste":1},"role":"healer"},
  {"id":"ch3-basalt-bloom-circlet","slot":"Head","name":"Basalt Bloom Circlet","chapter":3,"itemLevel":7,"icon":"/assets/items/ch3-basalt-bloom-circlet.svg","flavor":"A flower forced its way through cooling stone.","stats":{"maxHp":40,"armor":2,"resistance":1},"role":"all"},
  {"id":"ch3-ashbark-carapace","slot":"Chest","name":"Ashbark Carapace","chapter":3,"itemLevel":8,"icon":"/assets/items/ch3-ashbark-carapace.svg","flavor":"What the fire could not consume became a shelter.","stats":{"maxHp":65,"armor":3,"resistance":1},"role":"all"},
  {"id":"ch3-embervine-bindings","slot":"Legs","name":"Embervine Bindings","chapter":3,"itemLevel":7,"icon":"/assets/items/ch3-embervine-bindings.svg","flavor":"Living vines coil around a heart of charcoal.","stats":{"maxHp":40,"armor":2,"resistance":1},"role":"all"},
  {"id":"ch3-gatebreaker-mace","slot":"Weapon","name":"Gatebreaker Mace","chapter":3,"itemLevel":9,"icon":"/assets/items/ch3-gatebreaker-mace.svg","flavor":"It opened the gates when no key remained.","stats":{"damage":7},"role":"tank"},
  {"id":"ch3-furnace-bastion","slot":"Shield","name":"Furnace Bastion","chapter":3,"itemLevel":9,"icon":"/assets/items/ch3-furnace-bastion.svg","flavor":"The smith left a window for the dying fire.","stats":{"armor":13,"maxHp":30,"resistance":2},"role":"tank"},
  {"id":"ch3-marshal-chain","slot":"Trinket","name":"Marshal Chain","chapter":3,"itemLevel":8,"icon":"/assets/items/ch3-marshal-chain.svg","flavor":"Each link remembers a soldier brought home.","stats":{"maxHp":80,"armor":3,"resistance":4},"role":"tank"},
  {"id":"ch3-kilnforged-greathelm","slot":"Head","name":"Kilnforged Greathelm","chapter":3,"itemLevel":7,"icon":"/assets/items/ch3-kilnforged-greathelm.svg","flavor":"Its narrow eyes look through the smoke.","stats":{"maxHp":20,"armor":5,"resistance":1},"role":"all"},
  {"id":"ch3-cinderwall-harness","slot":"Chest","name":"Cinderwall Harness","chapter":3,"itemLevel":8,"icon":"/assets/items/ch3-cinderwall-harness.svg","flavor":"The wall fell. Its guardian did not.","stats":{"maxHp":30,"armor":7,"resistance":1},"role":"all"},
  {"id":"ch3-anvil-march-greaves","slot":"Legs","name":"Anvil March Greaves","chapter":3,"itemLevel":7,"icon":"/assets/items/ch3-anvil-march-greaves.svg","flavor":"A measured tread above the broken forge.","stats":{"maxHp":20,"armor":5,"resistance":1},"role":"all"},
  {"id":"ch3-obsidian-stiletto","owner":"rogue","slot":"Sword","name":"Obsidian Stiletto","chapter":3,"itemLevel":9,"icon":"/assets/items/ch3-obsidian-stiletto.svg","flavor":"A sliver of the night the citadel burned.","stats":{"damage":8},"role":"damage"},
  {"id":"ch3-smuggler-ember-locket","slot":"Trinket","name":"Smuggler Ember Locket","chapter":3,"itemLevel":8,"icon":"/assets/items/ch3-smuggler-ember-locket.svg","flavor":"The hidden compartment holds a stolen sunrise.","stats":{"damage":3},"role":"damage"},
  {"id":"ch3-smokefox-visage","slot":"Head","name":"Smokefox Visage","chapter":3,"itemLevel":7,"icon":"/assets/items/ch3-smokefox-visage.svg","flavor":"The mask smiles where its wearer does not.","stats":{"maxHp":10,"armor":1,"resistance":5},"role":"all"},
  {"id":"ch3-sootsilk-doublet","slot":"Chest","name":"Sootsilk Doublet","chapter":3,"itemLevel":8,"icon":"/assets/items/ch3-sootsilk-doublet.svg","flavor":"Fine black silk drinks the glow of the forge.","stats":{"maxHp":15,"armor":2,"resistance":8},"role":"all"},
  {"id":"ch3-glassrunner-cuisses","slot":"Legs","name":"Glassrunner Cuisses","chapter":3,"itemLevel":7,"icon":"/assets/items/ch3-glassrunner-cuisses.svg","flavor":"A quiet route across a field of shattered windows.","stats":{"maxHp":10,"armor":1,"resistance":5},"role":"all"},
  {"id":"ch3-crucible-helix","owner":"mage","slot":"Staff","name":"Crucible Helix","chapter":3,"itemLevel":9,"icon":"/assets/items/ch3-crucible-helix.svg","flavor":"The last experiment still circles its crown.","stats":{"damage":8},"role":"damage"},
  {"id":"ch3-captured-flare","slot":"Trinket","name":"Captured Flare","chapter":3,"itemLevel":8,"icon":"/assets/items/ch3-captured-flare.svg","flavor":"A furnace star behind an unbroken seal.","stats":{"damage":3},"role":"damage"},
  {"id":"ch3-molten-halo","slot":"Head","name":"Molten Halo","chapter":3,"itemLevel":7,"icon":"/assets/items/ch3-molten-halo.svg","flavor":"The metal flows but never falls.","stats":{"maxHp":20,"armor":2,"resistance":4},"role":"all"},
  {"id":"ch3-vest-of-the-last-pyre","slot":"Chest","name":"Vest of the Last Pyre","chapter":3,"itemLevel":8,"icon":"/assets/items/ch3-vest-of-the-last-pyre.svg","flavor":"Its bright thread was spun from the funeral fire.","stats":{"maxHp":30,"armor":3,"resistance":6},"role":"all"},
  {"id":"ch3-ashscript-pantaloons","slot":"Legs","name":"Ashscript Pantaloons","chapter":3,"itemLevel":7,"icon":"/assets/items/ch3-ashscript-pantaloons.svg","flavor":"The letters brighten with every step.","stats":{"maxHp":20,"armor":2,"resistance":4},"role":"all"},
  {"id":"ch3-firescar-longbow","owner":"ranger","slot":"Bow","name":"Firescar Longbow","chapter":3,"itemLevel":9,"icon":"/assets/items/ch3-firescar-longbow.svg","flavor":"A charred limb bent back toward the light.","stats":{"damage":8},"role":"damage"},
  {"id":"ch3-brass-falcon-whistle","slot":"Trinket","name":"Brass Falcon Whistle","chapter":3,"itemLevel":8,"icon":"/assets/items/ch3-brass-falcon-whistle.svg","flavor":"No bird answers, but the wind remembers.","stats":{"damage":3},"role":"damage"},
  {"id":"ch3-coalfeather-helm","slot":"Head","name":"Coalfeather Helm","chapter":3,"itemLevel":7,"icon":"/assets/items/ch3-coalfeather-helm.svg","flavor":"A single feather escaped the rookery fire.","stats":{"maxHp":30,"armor":3,"resistance":1},"role":"all"},
  {"id":"ch3-furnacehide-coat","slot":"Chest","name":"Furnacehide Coat","chapter":3,"itemLevel":8,"icon":"/assets/items/ch3-furnacehide-coat.svg","flavor":"The inside smells of rain on hot stone.","stats":{"maxHp":50,"armor":5,"resistance":1},"role":"all"},
  {"id":"ch3-slagpath-guards","slot":"Legs","name":"Slagpath Guards","chapter":3,"itemLevel":7,"icon":"/assets/items/ch3-slagpath-guards.svg","flavor":"Made for trails that have not yet cooled.","stats":{"maxHp":30,"armor":3,"resistance":1},"role":"all"},
  {"id":"ch4-scepter-of-the-last-mercy","slot":"Weapon","name":"Scepter of the Last Mercy","chapter":4,"itemLevel":12,"icon":"/assets/items/ch4-scepter-of-the-last-mercy.svg","flavor":"Even this court must leave room for mercy.","stats":{"spellPower":23,"maxMana":80,"manaRegen":0.3,"haste":2},"role":"healer"},
  {"id":"ch4-thornlit-testament","slot":"Tome","name":"Thornlit Testament","chapter":4,"itemLevel":12,"icon":"/assets/items/ch4-thornlit-testament.svg","flavor":"A quiet promise written between the briars.","stats":{"spellPower":17,"maxMana":150,"manaRegen":0.95,"crit":2},"role":"healer"},
  {"id":"ch4-tear-of-the-pale-queen","slot":"Trinket","name":"Tear of the Pale Queen","chapter":4,"itemLevel":12,"icon":"/assets/items/ch4-tear-of-the-pale-queen.svg","flavor":"The court insists that she never wept.","stats":{"spellPower":13,"maxMana":55,"manaRegen":2,"crit":2.5},"role":"healer"},
  {"id":"ch4-veiled-pontiff-tiara","slot":"Head","name":"Veiled Pontiff Tiara","chapter":4,"itemLevel":10,"icon":"/assets/items/ch4-veiled-pontiff-tiara.svg","flavor":"Silver veils hide neither grief nor resolve.","stats":{"maxHp":70,"armor":1,"resistance":1},"role":"all"},
  {"id":"ch4-moonpetal-chasuble","slot":"Chest","name":"Moonpetal Chasuble","chapter":4,"itemLevel":11,"icon":"/assets/items/ch4-moonpetal-chasuble.svg","flavor":"The petals close when the night grows cruel.","stats":{"maxHp":110,"armor":1,"resistance":1},"role":"all"},
  {"id":"ch4-pilgrimage-of-thorns","slot":"Legs","name":"Pilgrimage of Thorns","chapter":4,"itemLevel":10,"icon":"/assets/items/ch4-pilgrimage-of-thorns.svg","flavor":"Every thorn marks a kindness that cost something.","stats":{"maxHp":70,"armor":1,"resistance":1},"role":"all"},
  {"id":"ch4-crook-of-the-elder-hart","slot":"Weapon","name":"Crook of the Elder Hart","chapter":4,"itemLevel":12,"icon":"/assets/items/ch4-crook-of-the-elder-hart.svg","flavor":"The oldest hart bows only to winter.","stats":{"spellPower":21,"maxMana":95,"manaRegen":0.35,"crit":2.5},"role":"healer"},
  {"id":"ch4-briarqueen-herbarium","slot":"Tome","name":"Briarqueen Herbarium","chapter":4,"itemLevel":12,"icon":"/assets/items/ch4-briarqueen-herbarium.svg","flavor":"Pressed flowers remember a gentler court.","stats":{"spellPower":16,"maxMana":160,"manaRegen":0.95,"haste":2},"role":"healer"},
  {"id":"ch4-seed-of-the-silver-eclipse","slot":"Trinket","name":"Seed of the Silver Eclipse","chapter":4,"itemLevel":12,"icon":"/assets/items/ch4-seed-of-the-silver-eclipse.svg","flavor":"A night without moonlight holds its own beginning.","stats":{"spellPower":12,"maxMana":65,"manaRegen":2.1,"haste":2},"role":"healer"},
  {"id":"ch4-crescentwood-antlers","slot":"Head","name":"Crescentwood Antlers","chapter":4,"itemLevel":10,"icon":"/assets/items/ch4-crescentwood-antlers.svg","flavor":"Two branches cradle the waning moon.","stats":{"maxHp":55,"armor":3,"resistance":1},"role":"all"},
  {"id":"ch4-rosebark-aegis","slot":"Chest","name":"Rosebark Aegis","chapter":4,"itemLevel":11,"icon":"/assets/items/ch4-rosebark-aegis.svg","flavor":"Beauty learned to guard what it could not heal.","stats":{"maxHp":85,"armor":4,"resistance":1},"role":"all"},
  {"id":"ch4-nightwater-reedweave","slot":"Legs","name":"Nightwater Reedweave","chapter":4,"itemLevel":10,"icon":"/assets/items/ch4-nightwater-reedweave.svg","flavor":"Reeds gathered where the stars touch the marsh.","stats":{"maxHp":55,"armor":3,"resistance":1},"role":"all"},
  {"id":"ch4-oath-of-the-thorn-regent","slot":"Weapon","name":"Oath of the Thorn Regent","chapter":4,"itemLevel":12,"icon":"/assets/items/ch4-oath-of-the-thorn-regent.svg","flavor":"Its edge carries the weight of a broken vow.","stats":{"damage":10},"role":"tank"},
  {"id":"ch4-moonthorn-bulwark","slot":"Shield","name":"Moonthorn Bulwark","chapter":4,"itemLevel":12,"icon":"/assets/items/ch4-moonthorn-bulwark.svg","flavor":"The moon has watched this shield outlast its kings.","stats":{"armor":16,"maxHp":40,"resistance":2},"role":"tank"},
  {"id":"ch4-lion-of-the-empty-throne","slot":"Trinket","name":"Lion of the Empty Throne","chapter":4,"itemLevel":11,"icon":"/assets/items/ch4-lion-of-the-empty-throne.svg","flavor":"No ruler remains to claim its loyalty.","stats":{"maxHp":100,"armor":4,"resistance":5},"role":"tank"},
  {"id":"ch4-regent-warcrown","slot":"Head","name":"Regent Warcrown","chapter":4,"itemLevel":10,"icon":"/assets/items/ch4-regent-warcrown.svg","flavor":"A crown fitted for the burden, not the glory.","stats":{"maxHp":25,"armor":6,"resistance":1},"role":"all"},
  {"id":"ch4-pale-court-panoply","slot":"Chest","name":"Pale Court Panoply","chapter":4,"itemLevel":11,"icon":"/assets/items/ch4-pale-court-panoply.svg","flavor":"Polished bright enough to reflect a false dawn.","stats":{"maxHp":35,"armor":9,"resistance":1},"role":"all"},
  {"id":"ch4-thornward-ramparts","slot":"Legs","name":"Thornward Ramparts","chapter":4,"itemLevel":10,"icon":"/assets/items/ch4-thornward-ramparts.svg","flavor":"The roots of the court cannot pull them down.","stats":{"maxHp":25,"armor":6,"resistance":1},"role":"all"},
  {"id":"ch4-petal-of-the-final-dance","owner":"rogue","slot":"Sword","name":"Petal of the Final Dance","chapter":4,"itemLevel":12,"icon":"/assets/items/ch4-petal-of-the-final-dance.svg","flavor":"One last turn beneath the falling blossoms.","stats":{"damage":11},"role":"damage"},
  {"id":"ch4-masquerade-spider-brooch","slot":"Trinket","name":"Masquerade Spider Brooch","chapter":4,"itemLevel":11,"icon":"/assets/items/ch4-masquerade-spider-brooch.svg","flavor":"Eight silver legs hold a secret close.","stats":{"damage":4},"role":"damage"},
  {"id":"ch4-mask-of-the-unnamed-guest","slot":"Head","name":"Mask of the Unnamed Guest","chapter":4,"itemLevel":10,"icon":"/assets/items/ch4-mask-of-the-unnamed-guest.svg","flavor":"No invitation bears the name beneath it.","stats":{"maxHp":15,"armor":1,"resistance":6},"role":"all"},
  {"id":"ch4-velvet-thorn-corslet","slot":"Chest","name":"Velvet Thorn Corslet","chapter":4,"itemLevel":11,"icon":"/assets/items/ch4-velvet-thorn-corslet.svg","flavor":"The finest velvet conceals the sharpest edges.","stats":{"maxHp":20,"armor":2,"resistance":10},"role":"all"},
  {"id":"ch4-courtshadow-boots","slot":"Legs","name":"Courtshadow Boots","chapter":4,"itemLevel":10,"icon":"/assets/items/ch4-courtshadow-boots.svg","flavor":"They leave no trace upon the ballroom dust.","stats":{"maxHp":15,"armor":1,"resistance":6},"role":"all"},
  {"id":"ch4-sovereign-moonglass","owner":"mage","slot":"Staff","name":"Sovereign Moonglass","chapter":4,"itemLevel":12,"icon":"/assets/items/ch4-sovereign-moonglass.svg","flavor":"The moon is caught in an unfinished spell.","stats":{"damage":11},"role":"damage"},
  {"id":"ch4-prism-of-the-waning-court","slot":"Trinket","name":"Prism of the Waning Court","chapter":4,"itemLevel":11,"icon":"/assets/items/ch4-prism-of-the-waning-court.svg","flavor":"Every face shows a different end to the night.","stats":{"damage":4},"role":"damage"},
  {"id":"ch4-starless-coronation","slot":"Head","name":"Starless Coronation","chapter":4,"itemLevel":10,"icon":"/assets/items/ch4-starless-coronation.svg","flavor":"A crown for the hour after the last star fades.","stats":{"maxHp":25,"armor":2,"resistance":5},"role":"all"},
  {"id":"ch4-eclipseweave-regalia","slot":"Chest","name":"Eclipseweave Regalia","chapter":4,"itemLevel":11,"icon":"/assets/items/ch4-eclipseweave-regalia.svg","flavor":"Light and shadow share its silver seams.","stats":{"maxHp":35,"armor":4,"resistance":7},"role":"all"},
  {"id":"ch4-astral-briar-stockings","slot":"Legs","name":"Astral Briar Stockings","chapter":4,"itemLevel":10,"icon":"/assets/items/ch4-astral-briar-stockings.svg","flavor":"The thorns trace constellations no one remembers.","stats":{"maxHp":25,"armor":2,"resistance":5},"role":"all"},
  {"id":"ch4-white-hart-greatbow","owner":"ranger","slot":"Bow","name":"White Hart Greatbow","chapter":4,"itemLevel":12,"icon":"/assets/items/ch4-white-hart-greatbow.svg","flavor":"Drawn in silence beneath the oldest bough.","stats":{"damage":11},"role":"damage"},
  {"id":"ch4-moonhawk-jess","slot":"Trinket","name":"Moonhawk Jess","chapter":4,"itemLevel":11,"icon":"/assets/items/ch4-moonhawk-jess.svg","flavor":"The hawk returned with moonlight on its wings.","stats":{"damage":4},"role":"damage"},
  {"id":"ch4-briarflight-coif","slot":"Head","name":"Briarflight Coif","chapter":4,"itemLevel":10,"icon":"/assets/items/ch4-briarflight-coif.svg","flavor":"Feathers and thorns shelter the same watchful eyes.","stats":{"maxHp":40,"armor":4,"resistance":1},"role":"all"},
  {"id":"ch4-silverwood-scalecoat","slot":"Chest","name":"Silverwood Scalecoat","chapter":4,"itemLevel":11,"icon":"/assets/items/ch4-silverwood-scalecoat.svg","flavor":"Each scale is a leaf from a tree beyond winter.","stats":{"maxHp":65,"armor":6,"resistance":1},"role":"all"},
  {"id":"ch4-wild-hunt-legplates","slot":"Legs","name":"Wild Hunt Legplates","chapter":4,"itemLevel":10,"icon":"/assets/items/ch4-wild-hunt-legplates.svg","flavor":"The hunt ends only when every companion returns.","stats":{"maxHp":40,"armor":4,"resistance":1},"role":"all"},
  {"id":"ch1-mistcaller-cowl","slot":"Head","name":"Mistcaller Cowl","chapter":1,"itemLevel":1,"icon":"/assets/items/ch1-mistcaller-cowl.svg","flavor":"Cool mist gathers where the grave wind passes.","stats":{"maxHp":15,"armor":1,"resistance":1},"role":"all"},
  {"id":"ch1-spiritbound-hauberk","slot":"Chest","name":"Spiritbound Hauberk","chapter":1,"itemLevel":2,"icon":"/assets/items/ch1-spiritbound-hauberk.svg","flavor":"Quiet spirits keep watch between its scales.","stats":{"maxHp":25,"armor":1,"resistance":1},"role":"all"},
  {"id":"ch1-siltwalker-bindings","slot":"Legs","name":"Siltwalker Bindings","chapter":1,"itemLevel":1,"icon":"/assets/items/ch1-siltwalker-bindings.svg","flavor":"The river remembers every step toward home.","stats":{"maxHp":15,"armor":1,"resistance":1},"role":"all"},
  {"id":"ch2-cloudherd-headdress","slot":"Head","name":"Cloudherd Headdress","chapter":2,"itemLevel":4,"icon":"/assets/items/ch2-cloudherd-headdress.svg","flavor":"Small clouds follow the trail of its wearer.","stats":{"maxHp":25,"armor":1,"resistance":1},"role":"all"},
  {"id":"ch2-torrent-scaleguard","slot":"Chest","name":"Torrent Scaleguard","chapter":2,"itemLevel":5,"icon":"/assets/items/ch2-torrent-scaleguard.svg","flavor":"Rain runs between scales without reaching skin.","stats":{"maxHp":40,"armor":2,"resistance":2},"role":"all"},
  {"id":"ch2-fordkeepers-greaves","slot":"Legs","name":"Fordkeepers Greaves","chapter":2,"itemLevel":4,"icon":"/assets/items/ch2-fordkeepers-greaves.svg","flavor":"The ford yields only to those who listen.","stats":{"maxHp":25,"armor":1,"resistance":1},"role":"all"},
  {"id":"ch3-ashcloud-visor","slot":"Head","name":"Ashcloud Visor","chapter":3,"itemLevel":7,"icon":"/assets/items/ch3-ashcloud-visor.svg","flavor":"The storm reveals a path through falling ash.","stats":{"maxHp":35,"armor":2,"resistance":2},"role":"all"},
  {"id":"ch3-lavaward-scales","slot":"Chest","name":"Lavaward Scales","chapter":3,"itemLevel":8,"icon":"/assets/items/ch3-lavaward-scales.svg","flavor":"Each scale remembers the mountain before fire.","stats":{"maxHp":55,"armor":3,"resistance":3},"role":"all"},
  {"id":"ch3-obsidian-current-treads","slot":"Legs","name":"Obsidian Current Treads","chapter":3,"itemLevel":7,"icon":"/assets/items/ch3-obsidian-current-treads.svg","flavor":"Dark glass parts around the patient current.","stats":{"maxHp":35,"armor":2,"resistance":2},"role":"all"},
  {"id":"ch4-nighttide-crown","slot":"Head","name":"Nighttide Crown","chapter":4,"itemLevel":10,"icon":"/assets/items/ch4-nighttide-crown.svg","flavor":"The turning tide bows to no earthly throne.","stats":{"maxHp":45,"armor":2,"resistance":2},"role":"all"},
  {"id":"ch4-tempest-courtmail","slot":"Chest","name":"Tempest Courtmail","chapter":4,"itemLevel":11,"icon":"/assets/items/ch4-tempest-courtmail.svg","flavor":"The storm stands guard beyond the courtly lamps.","stats":{"maxHp":70,"armor":4,"resistance":4},"role":"all"},
  {"id":"ch4-starwater-legguards","slot":"Legs","name":"Starwater Legguards","chapter":4,"itemLevel":10,"icon":"/assets/items/ch4-starwater-legguards.svg","flavor":"Starlight follows the water through their seams.","stats":{"maxHp":45,"armor":2,"resistance":2},"role":"all"},
];

// Removed class-specific healer items map to the same chapter/slot shared item.
export const GEAR_ID_MIGRATIONS = Object.freeze({
  "ch1-rootbound-crook": "ch1-sepulcher-candle",
  "ch1-lichen-folio": "ch1-book-of-last-names",
  "ch1-amber-spore": "ch1-bell-of-the-vigil",
  "ch2-hartwood-scepter": "ch2-briarheart-thurible",
  "ch2-rainroot-codex": "ch2-litany-of-falling-leaves",
  "ch2-moonwell-acorn": "ch2-dewfall-rosary",
  "ch1-gravewater-conduit": "ch1-sepulcher-candle",
  "ch1-whispers-in-riverstone": "ch1-book-of-last-names",
  "ch1-ancestral-shell": "ch1-bell-of-the-vigil",
  "ch2-thunderreed-channeler": "ch2-briarheart-thurible",
  "ch2-rainkeeper-tablets": "ch2-litany-of-falling-leaves",
  "ch2-stormcallers-bead": "ch2-dewfall-rosary",
  "ch3-cinderstorm-focus": "ch3-lantern-of-unspent-dawn",
  "ch3-songs-of-molten-rain": "ch3-canticles-in-copper",
  "ch3-emberheart-totem": "ch3-coalglass-hourglass",
  "ch4-moonstorm-scepter": "ch4-scepter-of-the-last-mercy",
  "ch4-covenant-of-deep-waters": "ch4-thornlit-testament",
  "ch4-pearl-of-the-elder-tide": "ch4-tear-of-the-pale-queen"
});
// Chapter selection stays separate from the encounter map so future chapters can add their own maps.
// Four required encounters. Routes are independent of combat tuning below.
export const ADVENTURES = [
  { id: 'threshold', name: 'The Silent Threshold', kind: 'normal', encounter: 'sentinel', from: [], x: 13, y: 64, description: 'A lone sentinel bars the descent. Find your rhythm as its steady blows fall upon Aldric.' },
  { id: 'gallery', name: 'The Ashen Gallery', kind: 'normal', encounter: 'keeper', from: ['threshold'], x: 38, y: 43, description: 'A bowstring stirs in the dark. Watch for wounds beyond the front line.' },
  { id: 'ossuary', name: 'The Sunken Ossuary', kind: 'normal', encounter: 'watcher', from: ['gallery'], x: 63, y: 59, description: 'Two pale archers flank an ancient watcher. Keep the tank steady while tending the others.' },
  { id: 'sanctum', name: 'The Hollow Sanctum', kind: 'boss', encounter: 'warden', from: ['ossuary'], x: 87, y: 34, description: 'The Hollow Warden stands between your party and the dawn. Bring every lesson of the descent to bear.' },
];
// Chapter 1 normals last long enough to require triage while preserving route resources.
// Adds supply light, random damage. The party focuses the primary; adds flee on its defeat.
export const CHAPTER_ENCOUNTERS = {
  sentinel: { id: 'sentinel', name: 'The Sepulchral Sentinel', maxHp: 1000, strike: { first: 2.4, every: 2.4, damage: 50 }, adds: [], mechanics: [], lesson: 'Keep Aldric healthy. When he is stable, damage the enemy to convert Atonement into extra healing.' },
  keeper: { id: 'keeper', name: 'The Cinder Keeper', maxHp: 1000, strike: { first: 2.4, every: 2.4, damage: 50 }, adds: [{ first: 4, every: 4.8, damage: 30 }], mechanics: [], lesson: 'The archer may hit anyone, including you. Switch targets when an ally needs healing, then return to Aldric.' },
  watcher: { id: 'watcher', name: 'The Bone Watcher', maxHp: 1450, strike: { first: 2.4, every: 2.4, damage: 65 }, adds: [{ first: 4, every: 4.5, damage: 34 }, { first: 6, every: 4.5, damage: 34 }], mechanics: [], lesson: 'Two archers spread wounds across the party. Use Prayer of Healing when several allies are hurt.' },
  warden: { id: 'warden', name: 'The Hollow Warden', maxHp: 1700, strike: { first: 2.3, every: 5, damage: 70 }, adds: [{ first: 4, every: 4.5, damage: 10 }, { first: 6, every: 4.5, damage: 10 }], mechanics: [], lesson: 'The Warden hits Aldric hard but leaves a longer recovery window. Keep Penance ready while watching the archers.' },
};
export const PARTY = [
  { id: 'tank', name: 'Aldric', role: 'Guardian', label: 'TANK', maxHp: 600, color: '#78aabc', damage: 8, interval: 2, x: 485, y: 348 },
  { id: 'rogue', name: 'Nyx', role: 'Nightblade', label: 'DPS', maxHp: 400, color: '#b598d3', damage: 9, interval: 1.35, x: 633, y: 327 },
  { id: 'mage', name: 'Sera', role: 'Arcanist', label: 'DPS', maxHp: 400, color: '#729cdf', damage: 16, interval: 2.4, x: 697, y: 449 },
  { id: 'ranger', name: 'Theron', role: 'Ranger', label: 'DPS', maxHp: 400, color: '#8fb58d', damage: 12, interval: 1.8, x: 322, y: 415 },
  { id: 'priest', name: 'You', role: 'Priest', label: 'HEALER', maxHp: 400, color: '#e2cc94', damage: 0, interval: 2, x: 485, y: 484 },
];
export const SPELLS = [
  { id: 'flash', name: 'Flash Heal', key: '1', icon: 'spark', cast: 1.5, cost: 1, heal: 90, color: '#e5ce8c', description: 'A quick, focused heal for 90.' },
  { id: 'greater', name: 'Greater Heal', key: '2', icon: 'sun', cast: 3, cost: 1.5, heal: 200, color: '#f2dfad', description: 'An efficient, powerful heal for 200.' },
  { id: 'prayer', name: 'Prayer of Healing', key: '3', icon: 'wings', cast: 3, cost: 2.5, heal: 100, party: true, color: '#9fdfc6', description: 'Restores 100 health to every living ally, including you.' },
  { id: 'penance', name: 'Penance', key: '4', icon: 'bolts', cast: 2, cost: 1, heal: 120, damage: 30, dualTarget: true, channel: true, cooldown: 12, ticks: [{ at: 1, heal: 60, damage: 15 }, { at: 2, heal: 60, damage: 15 }], description: 'Channel two holy bolts. Each heals an ally for 60, or damages the enemy for 15 and triggers Atonement.', color: '#f4c16c' },
  { id: 'smite', name: 'Smite', key: '5', icon: 'smite', cast: 1.5, cost: 4 / CONFIG.baseMana, heal: 0, damage: 2.5, enemy: true, atonement: true, description: 'Deal 2.5 damage to the enemy and heal the most injured ally through Atonement.', color: '#f3df9b' },
  { id: 'holyFire', name: 'Holy Fire', key: '6', icon: 'holyFire', cast: 0, cost: 8 / CONFIG.baseMana, heal: 0, damage: 3, enemy: true, atonement: true, cooldown: 6, enemyDot: { damage: 7, duration: 10, interval: 2 }, description: 'Deal 3 damage, then 7 over 10s. Recasting carries pending damage into the refreshed effect. All damage triggers Atonement.', color: '#efad69' },
];
export const DRUID_HOTS = ['rejuvenation', 'regrowth', 'wildGrowth'];
export const DRUID_SPELLS = [
  { id: 'rejuvenation', name: 'Rejuvenation', key: '1', icon: 'leaf', cast: 0, cost: 1, heal: 0, hot: { duration: 15, interval: 3, heal: 30 }, color: '#9cdb95', description: 'Heal for 30 every 3s for 15s (150 total). Refreshing restarts the duration and tick timer.' },
  { id: 'regrowth', name: 'Regrowth', key: '2', icon: 'sprout', cast: 1.5, cost: 40 / CONFIG.baseMana, heal: 60, hot: { duration: 18, interval: 3, heal: 20 }, color: '#a8e5b9', description: 'Heal for 60 immediately, then 20 every 3s for 18s (180 total). Refreshing restarts the HoT.' },
  { id: 'swiftmend', name: 'Swiftmend', key: '3', icon: 'bloom', cast: 0, cost: 35 / CONFIG.baseMana, heal: 130, cooldown: 15, consumesHot: DRUID_HOTS, preserveHot: true, color: '#e0d497', description: 'Heal for 130. Requires Rejuvenation, Regrowth, or Wild Growth on this ally, but does not consume it.' },
  { id: 'wildGrowth', name: 'Wild Growth', key: '4', icon: 'grove', cast: 0, cost: 70 / CONFIG.baseMana, heal: 0, party: true, cooldown: 10, hot: { duration: 8, interval: 1, heal: 12 }, color: '#80c9a8', description: 'Heal every living ally for 12 every second for 8s (96 per ally). Each ally has their own HoT.' },
  { id: 'nourish', name: 'Nourish', key: '5', icon: 'seed', cast: 2, cost: 1, heal: 0, hot: { duration: 4, interval: 1, heal: 20, pool: true }, hotBonus: { sources: DRUID_HOTS, amount: 30, max: 3 }, color: '#c8df9b', description: 'A 4-second HoT ticking every second. Its 80 healing grows by 30 per active Rejuvenation, Regrowth, or Wild Growth type at completion. Recasting adds to the unspent pool and refreshes the duration.' },
];
export const SHAMAN_EMPOWERMENT = Object.freeze({ healingBonus: .20, castReduction: .20 });
export const SHAMAN_SPELLS = [
  { id: 'recurringSurge', name: 'Recurring Surge', key: '1', icon: 'surge', cast: 1.5, cost: 24 / CONFIG.baseMana, heal: 0, empowerable: true, hot: { duration: 6, interval: 2, heal: 36, bankCap: 18 }, color: '#76d5d0', description: 'Heal for 36 every 2s. Each cast adds 6s of remaining duration, up to 18s, without resetting the next tick. One effect per ally.' },
  { id: 'healingWave', name: 'Healing Wave', key: '2', icon: 'wave', cast: 2.5, cost: 32 / CONFIG.baseMana, heal: 125, empowerable: true, color: '#a1e2e4', description: 'Heal one living ally for 125 when the cast completes.' },
  { id: 'riptide', name: 'Riptide', key: '3', icon: 'riptide', cast: 0, cost: 36 / CONFIG.baseMana, heal: 40, cooldown: 6, hot: { duration: 18, interval: 3, heal: 27 }, color: '#72badf', description: 'Heal for 40 immediately, then 27 every 3s for 18s (202 total). Refreshing replaces the HoT and restarts its tick timer.' },
  { id: 'chainHeal', name: 'Chain Heal', key: '4', icon: 'chain', cast: 2.5, cost: 65 / CONFIG.baseMana, heal: 105, empowerable: true, chain: { targets: 5, jumpRatio: .8 }, color: '#ace4b9', description: 'Heal the selected ally for 105, then jump to the lowest-health-percentage unhit living ally, up to five targets. Each jump heals 20% less; all healing resolves at completion.' },
  { id: 'unleashLife', name: 'Unleash Life', key: '5', icon: 'unleash', cast: 0, cost: 24 / CONFIG.baseMana, heal: 90, cooldown: 15, empowerment: SHAMAN_EMPOWERMENT, color: '#d0e9a0', description: 'Heal for 90 and store one empowerment: the next successful Surge, Wave, or Chain Heal heals 20% more and casts 20% faster. No expiration or stacking; Mana cost is unchanged.' },
  { id: 'healingStream', name: 'Healing Stream Totem', key: '6', icon: 'totem', cast: 0, cost: 35 / CONFIG.baseMana, heal: 0, selfTarget: true, cooldown: 15, totem: { duration: 12, interval: 2, heal: 32 }, color: '#82cfc3', description: 'Summon one Totem for 12s. Every 2s it heals the lowest-health-percentage injured living ally for 32 (six ticks). A tick is wasted if nobody is injured.' },
];
// Healer identity and spell kits are separate from the companion roster.
export const HEALERS = {
  priest: { id: 'priest', name: 'You', role: 'Priest', label: 'HEALER', maxHp: 400, color: '#e2cc94', damage: 0, interval: 2, x: 485, y: 484, spellBook: SPELLS, combatSpells: SPELLS, description: 'A disciplined keeper of the party’s light. Uses the current healing kit.' },
  druid: { id: 'druid', name: 'You', role: 'Druid', label: 'HEALER', maxHp: 400, color: '#9acb91', damage: 0, interval: 2, x: 485, y: 484, spellBook: DRUID_SPELLS, combatSpells: DRUID_SPELLS, description: 'Prepare allies with healing over time. Nourish rewards layered HoTs; Swiftmend converts preparation into an immediate burst.' },
  shaman: { id: 'shaman', name: 'You', role: 'Shaman', label: 'HEALER', maxHp: 400, color: '#76cfc9', damage: 0, interval: 2, x: 485, y: 484, spellBook: SHAMAN_SPELLS, combatSpells: SHAMAN_SPELLS, description: 'Bank Recurring Surge on pressured allies, maintain Riptide, and recover the group with Chain Heal and a smart Healing Stream Totem. Unleash Life empowers your next cast-time heal.' },
};
export const partyForHealer = healerId => [...PARTY.filter(member => member.label !== 'HEALER'), HEALERS[healerId] || HEALERS.priest];
// Neutral starting defenses/power: gear may supply bonuses without changing encounter tuning.
for (const member of [...PARTY, ...Object.values(HEALERS)]) {
  Object.assign(member, { armor: 0, resistance: 0, crit: 0, haste: 0 });
  if (member.label === 'HEALER') Object.assign(member, { maxMana: CONFIG.mana, manaRegen: CONFIG.manaRegen, spellPower: 0 });
}
export const ENCOUNTER = {
  name: 'The Hollow Warden', maxHp: 4200,
  mechanics: [
    { id: 'crush', name: 'Crushing blow', first: 10, every: 18, warning: 3, damage: 105, target: 'tank', iconCategory: 'physical', color: '#d99b78', hint: 'A heavy strike on Aldric. Prepare a strong single-target heal.' },
    { id: 'pulse', name: 'Hollow nova', first: 18, every: 22, warning: 4, damage: 80, target: 'party', iconCategory: 'aoe', color: '#c491d6', hint: 'Party-wide damage. Prepare Prayer of Healing and use Atonement to top off the weakest ally.' },
    { id: 'mark', name: 'Withering mark', first: 25, every: 20, warning: 2, target: 'rotating', dot: { damage: 18, ticks: 4, interval: 2 }, color: '#83b7a4', hint: 'An ally takes damage over 8 seconds. Watch their frame.' },
  ],
  strike: { first: 2.4, every: 2.4, damage: 32 },
  shard: { first: 7, every: 9, damage: 55 },
};
// Later chapters share the same graph and encounter model. Explicit values are
// starting points for playtesting, not a scaling formula or permanent power curve.
const pulse = (id, name, first, every, damage) => ({ id, name, first, every, damage, warning: 3, target: 'party', iconCategory: 'aoe', color: '#b8c98a', hint: 'Party-wide damage. Prepare Prayer of Healing, then use Atonement to support the weakest ally.' });
const split = (id, name, first, every, damage, count) => ({ id, name, first, every, damage, count, warning: 3, target: 'random', iconCategory: 'physical', color: '#e4af7c', hint: `Hits ${count} different living allies. Check the marked targets and heal the most vulnerable first.` });
const bleed = (id, name, first, every, count, damage, ticks, interval, target = 'random') => ({ id, name, first, every, count, warning: 3, target, iconCategory: 'bleed', color: '#d78d9d', dot: { damage, ticks, interval }, hint: `${target === 'tank' ? 'Aldric' : count === 1 ? 'One random living ally' : count + ' random living allies'} will bleed for ${ticks * interval}s. Heal through it; there is no dispel.` });
const add = (name, first, every, damage, target = 'random', appearance = 'archer') => ({ name, first, every, damage, target, appearance });
const fight = (id, name, maxHp, damage, every, appearance, color, mechanics, adds, lesson) => ({ id, name, maxHp, strike: { first: every, every, damage }, appearance, color, mechanics, adds, lesson });
Object.assign(CHAPTER_ENCOUNTERS, {
  briar: fight('briar', 'Briarbound Ancient', 1050, 58, 2.5, 'treant', '#89b39a',
    [pulse('spores', 'Sporefall', 9, 12, 58)], [], 'Let the first Sporefall land, then restore the party together. Keep Aldric steady between pulses.'),
  moth: fight('moth', 'The Mourning Moth', 1100, 42, 1.7, 'moth', '#b1a2c5',
    [pulse('dust', 'Grave Dust', 8, 10, 52)], [], 'Frequent light pulses reward efficient group healing. Avoid using Prayer for only one wounded ally.'),
  boar: fight('boar', 'Gravetusk', 1150, 100, 3.2, 'beast', '#b8a887',
    [], [add('Thorn Slinger', 5, 4.5, 36)], 'Heavy, slow tusk blows give you time to prepare. Tend stray thorn wounds between tank heals.'),
  choir: fight('choir', 'The Root Choir', 1150, 60, 2.3, 'treant', '#7dafa1',
    [pulse('lament', 'Root Lament', 11, 15, 72)], [add('Sapling Guard', 4, 4, 20, 'tank', 'melee')], 'The sapling also attacks Aldric. Save a group heal for the slower, stronger lament.'),
  mire: fight('mire', 'Mirelight Widow', 1150, 46, 1.8, 'spider', '#9aa875',
    [pulse('mist', 'Mire Mist', 7, 11, 52)], [add('Bog Wisp', 6, 5.5, 17, 'random', 'wisp')], 'Mist and wisp shots create different wounds. Balance group recovery with focused healing.'),
  matriarch: fight('matriarch', 'Elder of the Hollow Grove', 1800, 43, 3.3, 'treant', '#a8ce8d',
    [pulse('bloom', 'Hollow Bloom', 10, 13, 55)], [add('Thorn Slinger', 5, 5, 18)], 'The Elder leaves a recovery window between tank strikes, then wounds the whole party with a stronger bloom. Prepare group healing before each pulse.'),
  gatekeeper: fight('gatekeeper', 'The Cinder Gatekeeper', 1250, 62, 2.4, 'knight', '#c69e7e',
    [split('cleave', 'Forked Cleave', 9, 12, 94, 2)], [], 'Two allies are marked before the cleave. Restore the more vulnerable target first.'),
  twins: fight('twins', 'Ashblade Captain', 1400, 58, 2.1, 'knight', '#c48e80',
    [split('crosscut', 'Crosscut', 8, 10, 82, 2)], [add('Ashblade Duelist', 5, 4.5, 28, 'random', 'melee')], 'A duelist adds stray cuts between paired strikes. Keep your next heal flexible.'),
  ravens: fight('ravens', 'The Cinderwing', 1400, 53, 2.2, 'moth', '#b99783',
    [split('feathers', 'Searing Feathers', 10, 14, 100, 3)], [], 'Three different allies take the volley. Prayer becomes efficient when all three need healing.'),
  furnace: fight('furnace', 'Furnace Colossus', 1450, 80, 3, 'knight', '#dcaa77',
    [split('brands', 'Twin Brands', 9, 14, 86, 2), pulse('furnace', 'Furnace Breath', 18, 22, 48)], [], 'Paired brands and occasional party damage overlap. Watch the warnings before committing to a long cast.'),
  harrier: fight('harrier', 'The Ember Harrier', 1300, 45, 1.6, 'beast', '#b99174',
    [split('pounce', 'Divided Pounce', 7, 9, 72, 2)], [], 'Quick strikes leave short recovery windows. Flash Heal can stabilize a low ally before a larger heal.'),
  tribunal: fight('tribunal', 'The Ashen Tribunal', 1400, 62, 2.2, 'wraith', '#c6ac91',
    [split('judgment', 'Threefold Judgment', 12, 16, 110, 3)], [add('Cinder Witness', 6, 6, 26, 'random', 'wisp')], 'Three heavy wounds arrive together, followed by a long recovery window. Keep some mana in reserve.'),
  bridge: fight('bridge', 'Ironwake Bulwark', 1550, 80, 3.2, 'knight', '#aa9f8d',
    [split('shrapnel', 'Shattered Iron', 10, 12, 86, 2)], [add('Shield Retainer', 4, 5, 18, 'tank', 'melee')], 'Tank and split pressure compete for your next cast. Penance can buy time for group recovery.'),
  bells: fight('bells', 'The Bellbound Shade', 1500, 54, 2.1, 'wraith', '#ab9bbf',
    [split('echoes', 'Broken Echoes', 8, 11, 78, 3), pulse('toll', 'Distant Toll', 19, 24, 44)], [], 'Frequent split wounds occasionally meet a full-party toll. Keep Prayer ready for that overlap.'),
  regent: fight('regent', 'The Cinder Regent', 2200, 50, 2.4, 'knight', '#e2b27e',
    [split('decree', 'Sundering Decree', 10, 14, 65, 3), pulse('crown', 'Crown of Embers', 20, 25, 35)],
    [add('Regent Guard', 5, 6, 16, 'tank', 'melee')], 'The Regent combines three-target decrees, tank pressure, and occasional AoE. Recover before the next overlap.'),
  huntsman: fight('huntsman', 'The Thorn Huntsman', 1700, 66, 2.2, 'vampire', '#b98799',
    [bleed('barb', 'Barbed Arrow', 8, 14, 1, 25, 5, 2)], [], 'A single ally bleeds for ten seconds. Watch the remaining duration and heal before the next tick.'),
  hounds: fight('hounds', 'The Sanguine Hound', 1800, 58, 2, 'beast', '#b78089',
    [bleed('maul', 'Rending Maul', 9, 14, 1, 28, 4, 2, 'tank')], [add('Hunting Whelp', 5, 4.5, 29, 'random', 'melee')], 'Aldric takes a heavy bleed while the whelp hunts other allies. Keep strong single-target healing available.'),
  roses: fight('roses', 'The Weeping Rose', 1800, 56, 2.2, 'treant', '#c28ca7',
    [bleed('thorns', 'Rain of Thorns', 9, 16, 3, 14, 6, 2)], [], 'Three lighter bleeds make sustained group recovery efficient. They must be healed through, not dispelled.'),
  chapel: fight('chapel', 'The Crimson Cantor', 2500, 71, 2.3, 'wraith', '#bf8b9e',
    [bleed('refrain', 'Crimson Refrain', 8, 15, 2, 22, 5, 2), pulse('hymn', 'Grieving Hymn', 17, 21, 60)], [], 'Two long wounds may still be ticking when the hymn lands. Top up vulnerable allies ahead of it.'),
  leech: fight('leech', 'The Vein Weaver', 2350, 56, 1.8, 'spider', '#af879f',
    [bleed('threads', 'Crimson Threads', 7, 10, 1, 18, 6, 1), split('fangs', 'Forked Fangs', 13, 16, 92, 2)], [], 'Short, rapid ticks demand prompt attention. Fangs may wound two other allies during the bleed.'),
  procession: fight('procession', 'The Sorrow Bearer', 2350, 64, 2.3, 'vampire', '#aa8399',
    [bleed('vigil', 'Endless Vigil', 8, 18, 2, 23, 5, 3)], [add('Mourning Acolyte', 6, 5, 34, 'random', 'wisp')], 'Long, slow bleeds continue between other attacks. Use the three-second tick rhythm to plan recovery.'),
  garden: fight('garden', 'The Briar Executioner', 2800, 92, 2.7, 'knight', '#b9998b',
    [bleed('sever', 'Severing Thorns', 9, 14, 2, 23, 5, 2), split('shears', 'Twin Shears', 16, 17, 98, 2)], [], 'Direct cuts can hit while bleeds persist. Prefer the ally with the lowest health and the most incoming damage.'),
  cryptkeeper: fight('cryptkeeper', 'The Bloodroot Keeper', 2800, 65, 2, 'treant', '#b39198',
    [bleed('roots', 'Bloodroot Bind', 8, 15, 3, 16, 6, 2), pulse('petals', 'Falling Petals', 18, 21, 58)],
    [add('Briar Guard', 5, 5, 25, 'tank', 'melee')], 'Spread bleeds meet occasional AoE while a guard pressures Aldric. Prepare group healing for the overlap.'),
  duchess: fight('duchess', 'The Thornveiled Duchess', 3600, 60, 2.4, 'vampire', '#dfa0b3',
    [bleed('veil', 'The Bleeding Veil', 9, 17, 2, 16, 6, 2), split('court', 'Cruel Court', 16, 19, 70, 3), pulse('requiem', 'Scarlet Requiem', 25, 29, 40)],
    [add('Thornbound Attendant', 6, 6, 25, 'random', 'wisp')], 'Watch bleed durations, answer the court’s split wounds, and prepare for the requiem. Keep yourself and Aldric alive.'),
});
const node = (id, name, encounter, from, x, y, description, kind = 'normal') => ({ id, name, encounter, from, x, y, description, kind });
const WILDS = [
  node('wild-entry', 'Briar Threshold', 'briar', [], 10, 50, 'Roots stir under a canopy of mourning leaves.'),
  node('wild-moth', 'Mothlight Glade', 'moth', ['wild-entry'], 36, 25, 'Pale wings scatter grave dust across the clearing.'),
  node('wild-tusk', 'Gravetusk Hollow', 'boar', ['wild-entry'], 36, 75, 'A scarred beast guards the thorn-choked lower trail.'),
  node('wild-choir', 'The Root Choir', 'choir', ['wild-moth'], 63, 25, 'Living roots sing a lament beneath the soil.'),
  node('wild-mire', 'Widow’s Mire', 'mire', ['wild-tusk'], 63, 75, 'Cold lights hover above a web of black water.'),
  node('wild-boss', 'The Hollow Grove', 'matriarch', ['wild-choir', 'wild-mire'], 90, 50, 'An ancient elder gathers the sorrow of the forest.', 'boss'),
];
const CITADEL = [
  node('ash-entry', 'Cinder Gate', 'gatekeeper', [], 8, 50, 'An iron sentinel bars the ember-lit gate.'),
  node('ash-twins', 'Blades of Ash', 'twins', ['ash-entry'], 25, 25, 'Two oathbound blades patrol the western rampart.'),
  node('ash-ravens', 'The Scorched Aerie', 'ravens', ['ash-entry'], 25, 75, 'Cinderwings circle the abandoned watchtower.'),
  node('ash-furnace', 'Furnace Heart', 'furnace', ['ash-twins', 'ash-ravens'], 42, 50, 'The citadel’s furnace breathes through a living shell.'),
  node('ash-harrier', 'The Hunting Court', 'harrier', ['ash-furnace'], 59, 25, 'A quick-footed horror prowls the empty court.'),
  node('ash-tribunal', 'Hall of Judgment', 'tribunal', ['ash-furnace'], 59, 75, 'The dead tribunal still passes sentence.'),
  node('ash-bridge', 'Ironwake Bridge', 'bridge', ['ash-harrier'], 76, 25, 'A shield wall guards the narrow bridge.'),
  node('ash-bells', 'The Broken Belfry', 'bells', ['ash-tribunal'], 76, 75, 'Cracked bells echo through three souls at once.'),
  node('ash-boss', 'The Ember Throne', 'regent', ['ash-bridge', 'ash-bells'], 93, 50, 'The last regent rules a kingdom of embers.', 'boss'),
];
const THORNS = [
  node('thorn-entry', 'The Red Gate', 'huntsman', [], 8, 50, 'A silent huntsman welcomes you with a barbed arrow.'),
  node('thorn-hounds', 'Kennels of Sorrow', 'hounds', ['thorn-entry'], 25, 25, 'The duchess’s hounds have not forgotten the hunt.'),
  node('thorn-roses', 'The Weeping Arbor', 'roses', ['thorn-entry'], 25, 75, 'Every pale flower bears a crimson thorn.'),
  node('thorn-chapel', 'Chapel of Wounds', 'chapel', ['thorn-hounds', 'thorn-roses'], 42, 50, 'An endless hymn keeps old wounds open.'),
  node('thorn-leech', 'The Vein Loom', 'leech', ['thorn-chapel'], 59, 25, 'A patient weaver draws scarlet threads through the dark.'),
  node('thorn-procession', 'The Long Procession', 'procession', ['thorn-chapel'], 59, 75, 'Mourners carry a grief that never quite fades.'),
  node('thorn-garden', 'The Severed Garden', 'garden', ['thorn-leech'], 76, 25, 'The gardener sharpens shears against a gravestone.'),
  node('thorn-crypt', 'Bloodroot Crypt', 'cryptkeeper', ['thorn-procession'], 76, 75, 'Roots drink deep beneath the court’s oldest tombs.'),
  node('thorn-boss', 'The Scarlet Court', 'duchess', ['thorn-garden', 'thorn-crypt'], 93, 50, 'Behind her veil, the duchess smiles at every wound.', 'boss'),
];
export const CHAPTERS = [
  { id: 'catacombs', number: 'Chapter 1', name: 'The Forsaken Catacombs', state: 'available', nodes: ADVENTURES, routeLength: 4, description: 'Hold your party together through the first descent. Learn steady tank healing and light triage.' },
  { id: 'wilds', number: 'Chapter 2', name: 'The Verdant Wilds', nodes: WILDS, routeLength: 4, description: 'Follow a branching trail beneath a mourning canopy. Learn to recover from party-wide damage.' },
  { id: 'citadel', number: 'Chapter 3', name: 'The Ember Citadel', nodes: CITADEL, routeLength: 6, description: 'Choose your way through the fallen citadel. Balance split wounds across several allies.' },
  { id: 'thorns', number: 'Chapter 4', name: 'The Thornveiled Court', nodes: THORNS, routeLength: 6, description: 'Enter a court of lingering wounds. Heal through bleeds while answering familiar threats.' },
];
export const ALL_ADVENTURES = CHAPTERS.flatMap(chapter => chapter.nodes);
// Presentation metadata travels with an encounter; power/timing stays above.
for (const chapter of CHAPTERS) for (const node of chapter.nodes) {
  Object.assign(CHAPTER_ENCOUNTERS[node.encounter], { chapterId: chapter.id, isBoss: node.kind === 'boss' });
}
// Types are explicit on every runtime damage source. No damage/timing rebalance.
for (const encounter of [ENCOUNTER, ...Object.values(CHAPTER_ENCOUNTERS)]) {
  encounter.strike.damageType = 'Physical';
  if (encounter.shard) encounter.shard.damageType = 'Magic';
  for (const add of encounter.adds || []) add.damageType = add.appearance === 'wisp' ? 'Magic' : 'Physical';
  for (const mechanic of encounter.mechanics) {
    if (mechanic.damage) mechanic.damageType = mechanic.target === 'party' ? 'Magic' : 'Physical';
    if (mechanic.dot) mechanic.dot.damageType = 'Bleed';
  }
}
