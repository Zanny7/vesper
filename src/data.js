export const CONFIG = { mana: 1200, baseMana: 30, manaRegen: 4, step: 1 / 60, enrage: 150 };
// Chapter selection stays separate from the encounter map so future chapters can add their own maps.
// Four required encounters. Routes are independent of combat tuning below.
export const ADVENTURES = [
  { id: 'threshold', name: 'The Silent Threshold', kind: 'normal', encounter: 'sentinel', from: [], x: 13, y: 64, description: 'A lone sentinel bars the descent. Find your rhythm as its steady blows fall upon Aldric.' },
  { id: 'gallery', name: 'The Ashen Gallery', kind: 'normal', encounter: 'keeper', from: ['threshold'], x: 38, y: 43, description: 'A bowstring stirs in the dark. Watch for wounds beyond the front line.' },
  { id: 'ossuary', name: 'The Sunken Ossuary', kind: 'normal', encounter: 'watcher', from: ['gallery'], x: 63, y: 59, description: 'Two pale archers flank an ancient watcher. Keep the tank steady while tending the others.' },
  { id: 'sanctum', name: 'The Hollow Sanctum', kind: 'boss', encounter: 'warden', from: ['ossuary'], x: 87, y: 34, description: 'The Hollow Warden stands between your party and the dawn. Bring every lesson of the descent to bear.' },
];
// Initial Chapter 1 tuning: roughly 30–55 seconds per fight with the full party alive.
// Adds supply light, random damage. The party focuses the primary; adds flee on its defeat.
export const CHAPTER_ENCOUNTERS = {
  sentinel: { id: 'sentinel', name: 'The Sepulchral Sentinel', maxHp: 1500, strike: { first: 2.4, every: 2.4, damage: 60 }, adds: [], mechanics: [], lesson: 'Keep Aldric healthy. Flash Heal builds Post-Haste for a faster Greater Heal.' },
  keeper: { id: 'keeper', name: 'The Cinder Keeper', maxHp: 1700, strike: { first: 2.4, every: 2.4, damage: 62 }, adds: [{ first: 4, every: 4.8, damage: 24 }], mechanics: [], lesson: 'The archer may hit anyone, including you. Switch targets when an ally needs healing, then return to Aldric.' },
  watcher: { id: 'watcher', name: 'The Bone Watcher', maxHp: 2000, strike: { first: 2.4, every: 2.4, damage: 64 }, adds: [{ first: 4, every: 4.8, damage: 24 }, { first: 6, every: 4.8, damage: 24 }], mechanics: [], lesson: 'Two archers spread wounds across the party. Use Prayer of Healing when several allies are hurt.' },
  warden: { id: 'warden', name: 'The Hollow Warden', maxHp: 2500, strike: { first: 2.3, every: 2.3, damage: 78 }, adds: [{ first: 4, every: 4.5, damage: 26 }, { first: 6, every: 4.5, damage: 26 }], mechanics: [], lesson: 'The Warden strikes harder and faster. Keep Penance ready for Aldric while watching the whole party.' },
};
export const PARTY = [
  { id: 'tank', name: 'Aldric', role: 'Guardian', label: 'TANK', maxHp: 600, color: '#78aabc', damage: 7, interval: 2, x: 485, y: 348 },
  { id: 'rogue', name: 'Nyx', role: 'Nightblade', label: 'DPS', maxHp: 360, color: '#b598d3', damage: 15, interval: 1.65, x: 633, y: 327 },
  { id: 'mage', name: 'Sera', role: 'Arcanist', label: 'DPS', maxHp: 340, color: '#729cdf', damage: 13, interval: 2.4, x: 697, y: 449 },
  { id: 'ranger', name: 'Theron', role: 'Ranger', label: 'DPS', maxHp: 380, color: '#8fb58d', damage: 12, interval: 2.1, x: 322, y: 415 },
  { id: 'priest', name: 'You', role: 'Priest', label: 'HEALER', maxHp: 400, color: '#e2cc94', damage: 0, interval: 2, x: 485, y: 484 },
];
export const SPELLS = [
  { id: 'flash', name: 'Flash Heal', key: '1', icon: 'spark', cast: 1.5, cost: 1, heal: 100, color: '#e5ce8c', description: 'A quick, focused heal. Grants 1 Post-Haste charge.', grants: { buff: 'postHaste', amount: 1, max: 2 } },
  { id: 'greater', name: 'Greater Heal', key: '2', icon: 'sun', cast: 3, cost: 1.5, heal: 200, color: '#f2dfad', description: 'An efficient, powerful heal. Post-Haste reduces cast time to 1.8s.', consumes: { buff: 'postHaste', castMultiplier: 0.6 } },
  { id: 'prayer', name: 'Prayer of Healing', key: '3', icon: 'wings', cast: 3, cost: 2.5, heal: 100, party: true, color: '#9fdfc6', description: 'Restores 100 health to every living ally, including you. Benefits from Post-Haste.', consumes: { buff: 'postHaste', castMultiplier: 0.6 } },
  { id: 'penance', name: 'Penance', key: '4', icon: 'bolts', cast: 2, cost: 1.2, heal: 250, channel: true, cooldown: 10, ticks: [{ at: 0.5, heal: 83 }, { at: 1.25, heal: 83 }, { at: 2, heal: 84 }], description: 'Channel three holy bolts for 250 total healing. 10s cooldown.', color: '#f4c16c' },
];
export const ENCOUNTER = {
  name: 'The Hollow Warden', maxHp: 4200,
  mechanics: [
    { id: 'crush', name: 'Crushing blow', first: 10, every: 18, warning: 3, damage: 105, target: 'tank', color: '#d99b78', hint: 'A heavy strike on Aldric. Prepare a strong single-target heal.' },
    { id: 'pulse', name: 'Hollow nova', first: 18, every: 22, warning: 4, damage: 80, target: 'party', color: '#c491d6', hint: 'Party-wide damage. Save Post-Haste for Prayer of Healing.' },
    { id: 'mark', name: 'Withering mark', first: 25, every: 20, warning: 2, target: 'rotating', dot: { damage: 18, ticks: 4, interval: 2 }, color: '#83b7a4', hint: 'An ally takes damage over 8 seconds. Watch their frame.' },
  ],
  strike: { first: 2.4, every: 2.4, damage: 32 },
  shard: { first: 7, every: 9, damage: 55 },
};
// Later chapters share the same graph and encounter model. Explicit values are
// starting points for playtesting, not a scaling formula or permanent power curve.
const pulse = (id, name, first, every, damage) => ({ id, name, first, every, damage, warning: 3, target: 'party', color: '#b8c98a', hint: 'Party-wide damage. Prepare Prayer of Healing, ideally with Post-Haste.' });
const split = (id, name, first, every, damage, count) => ({ id, name, first, every, damage, count, warning: 3, target: 'random', color: '#e4af7c', hint: `Hits ${count} different living allies. Check the marked targets and heal the most vulnerable first.` });
const bleed = (id, name, first, every, count, damage, ticks, interval, target = 'random') => ({ id, name, first, every, count, warning: 3, target, color: '#d78d9d', dot: { damage, ticks, interval }, hint: `${target === 'tank' ? 'Aldric' : count === 1 ? 'One random living ally' : count + ' random living allies'} will bleed for ${ticks * interval}s. Heal through it; there is no dispel.` });
const add = (name, first, every, damage, target = 'random', appearance = 'archer') => ({ name, first, every, damage, target, appearance });
const fight = (id, name, maxHp, damage, every, appearance, color, mechanics, adds, lesson) => ({ id, name, maxHp, strike: { first: every, every, damage }, appearance, color, mechanics, adds, lesson });
Object.assign(CHAPTER_ENCOUNTERS, {
  briar: fight('briar', 'Briarbound Ancient', 1950, 49, 2.7, 'treant', '#89b39a',
    [pulse('spores', 'Sporefall', 9, 14, 48)], [], 'Let the first Sporefall land, then restore the party together. Keep Aldric steady between pulses.'),
  moth: fight('moth', 'The Mourning Moth', 2050, 35, 1.8, 'moth', '#b1a2c5',
    [pulse('dust', 'Grave Dust', 8, 11, 40)], [], 'Frequent light pulses reward efficient group healing. Avoid using Prayer for only one wounded ally.'),
  boar: fight('boar', 'Gravetusk', 2100, 88, 3.5, 'beast', '#b8a887',
    [], [add('Thorn Slinger', 5, 4.5, 30)], 'Heavy, slow tusk blows give you time to prepare. Tend stray thorn wounds between tank heals.'),
  choir: fight('choir', 'The Root Choir', 2250, 48, 2.5, 'treant', '#7dafa1',
    [pulse('lament', 'Root Lament', 12, 17, 70)], [add('Sapling Guard', 4, 4, 16, 'tank', 'melee')], 'The sapling also attacks Aldric. Save a group heal for the slower, stronger lament.'),
  mire: fight('mire', 'Mirelight Widow', 2200, 42, 2, 'spider', '#9aa875',
    [pulse('mist', 'Mire Mist', 7, 12, 46)], [add('Bog Wisp', 6, 6, 24, 'random', 'wisp')], 'Mist and wisp shots create different wounds. Balance group recovery with focused healing.'),
  matriarch: fight('matriarch', 'Elder of the Hollow Grove', 2900, 60, 2.4, 'treant', '#a8ce8d',
    [pulse('bloom', 'Hollow Bloom', 10, 13, 66)], [add('Thorn Slinger', 5, 5, 26)], 'The Elder combines steady tank damage, thorns, and repeated blooms. Build Post-Haste before each pulse.'),
  gatekeeper: fight('gatekeeper', 'The Cinder Gatekeeper', 2200, 55, 2.5, 'knight', '#c69e7e',
    [split('cleave', 'Forked Cleave', 9, 13, 85, 2)], [], 'Two allies are marked before the cleave. Restore the more vulnerable target first.'),
  twins: fight('twins', 'Ashblade Captain', 2350, 49, 2.2, 'knight', '#c48e80',
    [split('crosscut', 'Crosscut', 8, 11, 72, 2)], [add('Ashblade Duelist', 5, 5, 22, 'random', 'melee')], 'A duelist adds stray cuts between paired strikes. Keep your next heal flexible.'),
  ravens: fight('ravens', 'The Cinderwing', 2300, 44, 2.3, 'moth', '#b99783',
    [split('feathers', 'Searing Feathers', 10, 16, 88, 3)], [], 'Three different allies take the volley. Prayer becomes efficient when all three need healing.'),
  furnace: fight('furnace', 'Furnace Colossus', 2400, 77, 3.1, 'knight', '#dcaa77',
    [split('brands', 'Twin Brands', 9, 15, 80, 2), pulse('furnace', 'Furnace Breath', 18, 24, 42)], [], 'Paired brands and occasional party damage overlap. Watch the warnings before committing to a long cast.'),
  harrier: fight('harrier', 'The Ember Harrier', 2450, 39, 1.7, 'beast', '#b99174',
    [split('pounce', 'Divided Pounce', 7, 10, 67, 2)], [], 'Quick strikes leave short recovery windows. Flash Heal can stabilize a low ally before a larger heal.'),
  tribunal: fight('tribunal', 'The Ashen Tribunal', 2500, 52, 2.5, 'wraith', '#c6ac91',
    [split('judgment', 'Threefold Judgment', 12, 18, 104, 3)], [add('Cinder Witness', 6, 7, 23, 'random', 'wisp')], 'Three heavy wounds arrive together, followed by a long recovery window. Keep some mana in reserve.'),
  bridge: fight('bridge', 'Ironwake Bulwark', 2550, 83, 3.2, 'knight', '#aa9f8d',
    [split('shrapnel', 'Shattered Iron', 10, 13, 78, 2)], [add('Shield Retainer', 4, 5, 18, 'tank', 'melee')], 'Tank and split pressure compete for your next cast. Penance can buy time for group recovery.'),
  bells: fight('bells', 'The Bellbound Shade', 2450, 45, 2.2, 'wraith', '#ab9bbf',
    [split('echoes', 'Broken Echoes', 8, 12, 70, 3), pulse('toll', 'Distant Toll', 19, 27, 38)], [], 'Frequent split wounds occasionally meet a full-party toll. Keep Post-Haste ready for that overlap.'),
  regent: fight('regent', 'The Cinder Regent', 3200, 62, 2.4, 'knight', '#e2b27e',
    [split('decree', 'Sundering Decree', 10, 14, 92, 3), pulse('crown', 'Crown of Embers', 20, 25, 48)],
    [add('Regent Guard', 5, 6, 18, 'tank', 'melee')], 'The Regent combines three-target decrees, tank pressure, and occasional AoE. Recover before the next overlap.'),
  huntsman: fight('huntsman', 'The Thorn Huntsman', 2350, 53, 2.5, 'vampire', '#b98799',
    [bleed('barb', 'Barbed Arrow', 8, 15, 1, 19, 5, 2)], [], 'A single ally bleeds for ten seconds. Watch the remaining duration and heal before the next tick.'),
  hounds: fight('hounds', 'The Sanguine Hound', 2500, 46, 2.2, 'beast', '#b78089',
    [bleed('maul', 'Rending Maul', 9, 15, 1, 22, 4, 2, 'tank')], [add('Hunting Whelp', 5, 5, 22, 'random', 'melee')], 'Aldric takes a heavy bleed while the whelp hunts other allies. Keep strong single-target healing available.'),
  roses: fight('roses', 'The Weeping Rose', 2450, 44, 2.4, 'treant', '#c28ca7',
    [bleed('thorns', 'Rain of Thorns', 9, 17, 3, 10, 6, 2)], [], 'Three lighter bleeds make sustained group recovery efficient. They must be healed through, not dispelled.'),
  chapel: fight('chapel', 'The Crimson Cantor', 2600, 55, 2.6, 'wraith', '#bf8b9e',
    [bleed('refrain', 'Crimson Refrain', 8, 16, 2, 15, 5, 2), pulse('hymn', 'Grieving Hymn', 17, 23, 44)], [], 'Two long wounds may still be ticking when the hymn lands. Top up vulnerable allies ahead of it.'),
  leech: fight('leech', 'The Vein Weaver', 2650, 43, 2, 'spider', '#af879f',
    [bleed('threads', 'Crimson Threads', 7, 11, 1, 13, 6, 1), split('fangs', 'Forked Fangs', 13, 17, 75, 2)], [], 'Short, rapid ticks demand prompt attention. Fangs may wound two other allies during the bleed.'),
  procession: fight('procession', 'The Sorrow Bearer', 2650, 50, 2.5, 'vampire', '#aa8399',
    [bleed('vigil', 'Endless Vigil', 8, 20, 2, 17, 5, 3)], [add('Mourning Acolyte', 6, 5.5, 26, 'random', 'wisp')], 'Long, slow bleeds continue between other attacks. Use the three-second tick rhythm to plan recovery.'),
  garden: fight('garden', 'The Briar Executioner', 2750, 72, 3, 'knight', '#b9998b',
    [bleed('sever', 'Severing Thorns', 9, 16, 2, 16, 5, 2), split('shears', 'Twin Shears', 16, 19, 78, 2)], [], 'Direct cuts can hit while bleeds persist. Prefer the ally with the lowest health and the most incoming damage.'),
  cryptkeeper: fight('cryptkeeper', 'The Bloodroot Keeper', 2700, 47, 2.3, 'treant', '#b39198',
    [bleed('roots', 'Bloodroot Bind', 8, 17, 3, 11, 6, 2), pulse('petals', 'Falling Petals', 18, 24, 43)],
    [add('Briar Guard', 5, 6, 15, 'tank', 'melee')], 'Spread bleeds meet occasional AoE while a guard pressures Aldric. Prepare group healing for the overlap.'),
  duchess: fight('duchess', 'The Thornveiled Duchess', 3450, 58, 2.4, 'vampire', '#dfa0b3',
    [bleed('veil', 'The Bleeding Veil', 9, 17, 2, 18, 6, 2), split('court', 'Cruel Court', 16, 19, 83, 3), pulse('requiem', 'Scarlet Requiem', 25, 29, 44)],
    [add('Thornbound Attendant', 6, 6, 22, 'random', 'wisp')], 'Watch bleed durations, answer the court’s split wounds, and prepare for the requiem. Keep yourself and Aldric alive.'),
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
