import { PRIEST_TALENT_VALUES } from './data.js';

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
  const values = PRIEST_TALENT_VALUES;
  const conservation = rank(allocations, 'conservation-of-faith');
  const bindingLight = rank(allocations, 'binding-light');
  const earlyMercy = rank(allocations, 'early-mercy');
  const postHaste = rank(allocations, 'post-haste');
  const focusedPenance = rank(allocations, 'focused-penance');
  const lingeringPrayer = rank(allocations, 'lingering-prayer');
  const fourfoldPenance = rank(allocations, 'fourfold-penance');
  const echoOfGrace = rank(allocations, 'echo-of-grace');
  const lightUnspent = rank(allocations, 'light-unspent');
  const twinPenance = rank(allocations, 'twin-penance');
  const sanctuary = rank(allocations, 'sanctuary');
  const divineFervor = rank(allocations, 'divine-fervor');
  const adjustedParty = party.map(member => member.label === 'HEALER'
    ? { ...member, manaRegen: member.manaRegen * (1 + conservation * values.conservationOfFaith.manaRegenPerRank) }
    : member);
  const adjustedSpells = spells.map(spell => {
    if (spell.id === 'flash') return {
      ...spell,
      ...(bindingLight ? { bindingLight: { ratio: values.bindingLight.effectiveHealRatioByRank[bindingLight] } } : {}),
      ...(postHaste ? { postHaste: { maxStacks: postHaste, reduction: PRIEST_TALENT_VALUES.postHaste.castAndManaReduction } } : {}),
      ...(echoOfGrace ? { echoOfGrace: { ratio: PRIEST_TALENT_VALUES.echoOfGrace.ratio } } : {}),
    };
    if (spell.id === 'greater') return {
      ...spell,
      ...(earlyMercy ? { earlyMercy: { ratio: values.earlyMercy.provisionalRatioByRank[earlyMercy], midpoint: values.earlyMercy.midpoint } } : {}),
      ...(postHaste ? { postHaste: { maxStacks: postHaste, reduction: PRIEST_TALENT_VALUES.postHaste.castAndManaReduction } } : {}),
      ...(echoOfGrace ? { echoOfGrace: { ratio: PRIEST_TALENT_VALUES.echoOfGrace.ratio } } : {}),
    };
    if (spell.id === 'prayer') return {
      ...spell,
      ...(postHaste ? { postHaste: { maxStacks: postHaste, reduction: PRIEST_TALENT_VALUES.postHaste.castAndManaReduction } } : {}),
      ...(lingeringPrayer ? { lingeringPrayer: { ...values.lingeringPrayer } } : {}),
      ...(lightUnspent ? { lightUnspent: { ratio: values.lightUnspent.overhealRatio } } : {}),
    };
    if (spell.id === 'penance') return {
      ...spell,
      cooldown: Math.max(0, spell.cooldown - focusedPenance * values.focusedPenance.cooldownReductionPerRank),
      ...(twinPenance ? { charges: PRIEST_TALENT_VALUES.twinPenance.charges } : {}),
      ...(fourfoldPenance ? {
        heal: spell.ticks[0].heal * PRIEST_TALENT_VALUES.fourfoldPenance.mainBolts,
        ticks: Array.from({ length: PRIEST_TALENT_VALUES.fourfoldPenance.mainBolts }, (_, index) => ({
          at: spell.cast * (index + 1) / PRIEST_TALENT_VALUES.fourfoldPenance.mainBolts,
          heal: spell.ticks[0].heal, damage: spell.ticks[0].damage,
        })),
        smartHealingBolt: { at: spell.cast, heal: spell.ticks[0].heal },
      } : {}),
    };
    return { ...spell };
  });
  const usedKeys = new Set(adjustedSpells.map(spell => spell.key));
  if (sanctuary) adjustedSpells.push(talentSpell({
    id: 'sanctuary', name: 'Sanctuary', icon: 'shield', cast: 0, cost: 0, heal: 0, party: true,
    cooldown: values.sanctuary.cooldown, sanctuary: { duration: values.sanctuary.duration, reduction: values.sanctuary.reduction }, color: '#d9cf9b', effectSummary: `${values.sanctuary.reduction * 100}% party damage reduction`,
    description: `Reduce party damage taken by ${values.sanctuary.reduction * 100}% for ${values.sanctuary.duration} seconds. ${values.sanctuary.cooldown}-second cooldown.`,
  }, usedKeys));
  if (divineFervor) adjustedSpells.push(talentSpell({
    id: 'divineFervor', name: 'Divine Fervor', icon: 'sun', cast: 0, cost: 0, heal: 0,
    selfTarget: true,
    cooldown: values.divineFervor.cooldown,
    divineFervor: { duration: values.divineFervor.duration, speed: values.divineFervor.speed, manaReduction: values.divineFervor.manaReduction },
    color: '#f1d27e', effectSummary: `${values.divineFervor.speed * 100}% Haste and ${values.divineFervor.manaReduction * 100}% reduced Mana cost`,
    description: `Grant the Priest ${values.divineFervor.speed * 100}% Haste and ${values.divineFervor.manaReduction * 100}% reduced spell Mana costs for ${values.divineFervor.duration} seconds. ${values.divineFervor.cooldown}-second cooldown.`,
  }, usedKeys));
  return { party: adjustedParty, spells: adjustedSpells };
}
