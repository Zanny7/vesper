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
  const naturalRegeneration = rank(allocations, 'natural-regeneration');
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
    if (spell.id === 'swiftmend') return { ...spell, ...(bloomingSwiftmend ? { bloom: { ratio: .3, targets: 2 } } : {}) };
    if (spell.id === 'wildGrowth') return { ...spell, ...(overgrowth ? { overgrowth: { transfer: .5, threshold: .9 }, cost: spell.cost * .8 } : {}) };
    if (spell.id === 'nourish') return {
      ...spell,
      ...(nourishingTouch ? { nourishingTouch: { extraTicks: nourishingTouch } } : {}),
      hotBonus: { ...spell.hotBonus, amount: spell.hotBonus.amount + abundantNourishment * 10 },
    };
    return { ...spell };
  });
  const usedKeys = new Set(adjustedSpells.map(spell => spell.key));
  if (cenarionWard) adjustedSpells.push(talentSpell({
    id: 'cenarionWard', name: 'Cenarion Ward', icon: 'shield', cast: 0, cost: 45 / CONFIG.baseMana,
    heal: 0, cooldown: 30, charges: cenarionWard, ward: { duration: 20, threshold: .5, hot: { duration: 6, interval: 1, heal: 30 } },
    color: '#91d0a0', effectSummary: 'At 50% Health, trigger 180 healing over 6 seconds',
    description: 'Arm an ally for 20 seconds. At or below 50% Health, immediately trigger a 6-second HoT: 30 each second (180 total).',
  }, usedKeys));
  if (genesis) adjustedSpells.push(talentSpell({
    id: 'genesis', name: 'Genesis', icon: 'sun', cast: 0, cost: 0, heal: 0, party: true,
    cooldown: 60, genesis: { duration: 8, speed: .15 }, color: '#a9d894', effectSummary: 'Refresh core Druid HoTs; 15% faster ticks for 8 seconds',
    description: 'Restore active Rejuvenation, Regrowth, and Wild Growth HoTs to full duration and make them tick 15% faster for 8 seconds. Nourish pools and Ward HoTs are excluded.',
  }, usedKeys));
  if (tranquility) adjustedSpells.push(talentSpell({
    id: 'tranquility', name: 'Tranquility', icon: 'grove', cast: 5, cost: 100 / CONFIG.baseMana,
    heal: 0, party: true, channel: true, cooldown: 60,
    ticks: [1, 2, 3, 4, 5].map(at => ({ at, heal: 30 })), color: '#bce6ae',
    effectSummary: '30 party healing each second for 5 seconds',
    description: 'Channel for 5 seconds, healing every living party member for 30 each second.',
  }, usedKeys));
  return { party: party.map(member => member.label === 'HEALER'
    ? { ...member, manaRegen: (member.manaRegen ?? CONFIG.manaRegen) * (1 + naturalRegeneration * .1) }
    : { ...member }), spells: adjustedSpells };
}
