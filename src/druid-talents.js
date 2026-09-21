import { CONFIG } from './data.js';

const rank = (allocations, id) => allocations?.[id] || 0;
const TALENT_KEYS = '67890ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function talentSpell(base, usedKeys) {
  const key = [...TALENT_KEYS].find(candidate => !usedKeys.has(candidate));
  usedKeys.add(key);
  return { ...base, key };
}

// Derive a combat loadout without mutating the shared Druid spell definitions.
export function druidTalentLoadout(party, spells, allocations = {}) {
  const preservedGrowth = rank(allocations, 'preserved-growth');
  const empoweredRejuvenation = rank(allocations, 'empowered-rejuvenation');
  const nourishingTouch = rank(allocations, 'nourishing-touch');
  const passingBloom = rank(allocations, 'passing-bloom');
  const cenarionWard = rank(allocations, 'cenarion-ward');
  const abundantNourishment = rank(allocations, 'abundant-nourishment');
  const bloomingSwiftmend = rank(allocations, 'blooming-swiftmend');
  const overgrowth = rank(allocations, 'overgrowth');
  const livingRejuvenation = rank(allocations, 'living-rejuvenation');
  const genesis = rank(allocations, 'genesis');
  const twinRejuvenation = rank(allocations, 'twin-rejuvenation');
  const tranquility = rank(allocations, 'tranquility');
  const adjustedSpells = spells.map(spell => {
    if (spell.id === 'rejuvenation') return {
      ...spell,
      hot: {
        ...spell.hot,
        heal: spell.hot.heal * (1 + empoweredRejuvenation * .1),
        ...(livingRejuvenation ? { living: { speed: .2 } } : {}),
        ...(twinRejuvenation ? { maxInstances: 2 } : {}),
      },
    };
    if (spell.id === 'regrowth') return { ...spell, ...(passingBloom ? { passingBloom: true } : {}) };
    if (spell.id === 'swiftmend') return {
      ...spell,
      ...(preservedGrowth ? { preserveHot: true } : {}),
      ...(bloomingSwiftmend ? { bloom: { ratio: .2 } } : {}),
    };
    if (spell.id === 'wildGrowth') return { ...spell, ...(overgrowth ? { overgrowth: true } : {}) };
    if (spell.id === 'nourish') return {
      ...spell,
      cast: [2, 1.8, 1.6][nourishingTouch],
      hotBonus: { ...spell.hotBonus, amount: 20 + abundantNourishment * 5 },
    };
    return { ...spell };
  });
  const usedKeys = new Set(adjustedSpells.map(spell => spell.key));
  if (cenarionWard) adjustedSpells.push(talentSpell({
    id: 'cenarionWard', name: 'Cenarion Ward', icon: 'shield', cast: 0, cost: 45 / CONFIG.baseMana,
    heal: 0, cooldown: 30, ward: { duration: 20, triggerDuration: 10, healingReceived: .2 },
    color: '#91d0a0', effectSummary: 'Next damage grants +20% healing received',
    description: 'Ward an ally for 20 seconds. The next damage grants 20% increased healing received for 10 seconds.',
  }, usedKeys));
  if (genesis) adjustedSpells.push(talentSpell({
    id: 'genesis', name: 'Genesis', icon: 'sun', cast: 0, cost: 0, heal: 0, party: true,
    cooldown: 60, genesis: { extension: 10 }, color: '#a9d894', effectSummary: 'Extend active Druid HoTs by 10 seconds',
    description: 'Extend every active Druid healing-over-time effect by 10 seconds, adding normal ticks.',
  }, usedKeys));
  if (tranquility) adjustedSpells.push(talentSpell({
    id: 'tranquility', name: 'Tranquility', icon: 'grove', cast: 5, cost: 100 / CONFIG.baseMana,
    heal: 0, party: true, channel: true, cooldown: 90,
    ticks: [1, 2, 3, 4, 5].map(at => ({ at, heal: 30 })), color: '#bce6ae',
    effectSummary: '30 party healing each second for 5 seconds',
    description: 'Channel for 5 seconds, healing every living party member for 30 each second.',
  }, usedKeys));
  return { party: party.map(member => ({ ...member })), spells: adjustedSpells };
}
