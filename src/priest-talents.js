import { CONFIG } from './data.js';

const rank = (allocations, id) => allocations?.[id] || 0;
const TALENT_KEYS = '7890ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function talentSpell(base, usedKeys) {
  const key = [...TALENT_KEYS].find(candidate => !usedKeys.has(candidate));
  usedKeys.add(key);
  return { ...base, key };
}

// Talent definitions remain progression data. This adapter creates an encounter
// loadout, keeping the base spell book and party data immutable.
export function priestTalentLoadout(party, spells, allocations = {}) {
  const conservation = rank(allocations, 'conservation-of-faith');
  const quickRemedy = rank(allocations, 'quick-remedy');
  const measuredCasting = rank(allocations, 'measured-casting');
  const postHaste = rank(allocations, 'post-haste');
  const focusedPenance = rank(allocations, 'focused-penance');
  const lingeringPrayer = rank(allocations, 'lingering-prayer');
  const threefoldPenance = rank(allocations, 'threefold-penance');
  const echoOfGrace = rank(allocations, 'echo-of-grace');
  const lightUnspent = rank(allocations, 'light-unspent');
  const twinPenance = rank(allocations, 'twin-penance');
  const sanctuary = rank(allocations, 'sanctuary');
  const divineFervor = rank(allocations, 'divine-fervor');
  const adjustedParty = party.map(member => member.label === 'HEALER'
    ? { ...member, manaRegen: member.manaRegen * (1 + conservation * .1) }
    : member);
  const adjustedSpells = spells.map(spell => {
    if (spell.id === 'flash') return {
      ...spell,
      cost: spell.cost - quickRemedy * 3 / CONFIG.baseMana,
      ...(postHaste ? { postHaste: { maxStacks: postHaste } } : {}),
      ...(echoOfGrace ? { echoOfGrace: { ratio: .2 } } : {}),
    };
    if (spell.id === 'greater') return {
      ...spell,
      cast: [3, 2.8, 2.5][measuredCasting],
      ...(postHaste ? { postHaste: { maxStacks: postHaste } } : {}),
      ...(echoOfGrace ? { echoOfGrace: { ratio: .2 } } : {}),
    };
    if (spell.id === 'prayer') return {
      ...spell,
      ...(postHaste ? { postHaste: { maxStacks: postHaste } } : {}),
      ...(lingeringPrayer ? { lingeringPrayer: { ratio: .2, duration: 6, interval: 2 } } : {}),
      ...(lightUnspent ? { lightUnspent: { ratio: .5 } } : {}),
    };
    if (spell.id === 'penance') return {
      ...spell,
      cooldown: [12, 10, 8][focusedPenance],
      ...(twinPenance ? { charges: 2 } : {}),
      ...(threefoldPenance ? {
        ticks: [2 / 3, 4 / 3, 2].map(at => ({ at, heal: spell.ticks[0].heal, damage: spell.ticks[0].damage })),
        smartHealingBolt: { at: 2, heal: spell.ticks[0].heal },
      } : {}),
    };
    return { ...spell };
  });
  const usedKeys = new Set(adjustedSpells.map(spell => spell.key));
  if (sanctuary) adjustedSpells.push(talentSpell({
    id: 'sanctuary', name: 'Sanctuary', icon: 'shield', cast: 0, cost: 0, heal: 0, party: true,
    cooldown: 90, sanctuary: { duration: 10, reduction: .2 }, color: '#d9cf9b', effectSummary: '20% party damage reduction',
    description: 'Reduce all damage taken by the party by 20% for 10 seconds.',
  }, usedKeys));
  if (divineFervor) adjustedSpells.push(talentSpell({
    id: 'divineFervor', name: 'Divine Fervor', icon: 'sun', cast: 0, cost: 0, heal: 0,
    cooldown: 90, divineFervor: { duration: 20, speed: .2 }, color: '#f1d27e', effectSummary: '20% Haste or Attack Speed',
    description: 'Grant the healer 20% Haste or a companion 20% Attack Speed for 20 seconds.',
  }, usedKeys));
  return { party: adjustedParty, spells: adjustedSpells };
}
