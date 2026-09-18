export const CONFIG = { mana: 1200, baseMana: 30, manaRegen: 4, step: 1 / 60, enrage: 150 };
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
