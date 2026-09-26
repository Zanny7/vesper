import { CONFIG, SHAMAN_TALENT_VALUES as values } from './data.js';

// Derive an immutable loadout; combat owns the encounter state and effect timing.
export function shamanTalentLoadout(party, spells, allocations = {}) {
  const rank = id => allocations[id] || 0;
  const adjustedSpells = spells.map(spell => {
    if (spell.id === 'recurringSurge') return {
      ...spell, ...(rank('echoing-surge') ? { echoingSurge: values.echoingSurge.effectiveRatio } : {}),
    };
    if (spell.id === 'riptide') return {
      ...spell, hot: { ...spell.hot, heal: spell.hot.heal * (1 + rank('deep-riptide') * values.deepRiptide.periodicBonusPerRank) },
      ...(rank('tidal-waves') ? { tidalWaves: values.tidalWaves } : {}),
      ...(rank('flowing-riptide') ? { charges: values.flowingRiptide.charges, flowingRiptide: values.flowingRiptide } : {}),
    };
    if (spell.id === 'healingWave' || spell.id === 'chainHeal') return {
      ...spell,
      ...(rank('tidal-waves') ? { tidalWavesEligible: values.tidalWaves } : {}),
      ...(rank('earthliving') ? { earthlivingDuration: spell.id === 'healingWave' ? values.earthliving.waveDuration : values.earthliving.chainDuration } : {}),
      ...(spell.id === 'healingWave' ? {
        ...(rank('tidal-momentum') ? { tidalMomentum: rank('tidal-momentum') * values.tidalMomentum.healingBonusPerRank } : {}),
        ...(rank('ancestral-echo') ? { ancestralEcho: values.ancestralEcho.effectiveRatio } : {}),
      } : { chain: { ...spell.chain, jumpRatio: 1 - values.highTide.jumpLossByRank[rank('high-tide')] } }),
    };
    if (spell.id === 'unleashLife') return { ...spell, empowerments: rank('double-current') ? values.doubleCurrent.empowerments : 1 };
    if (spell.id === 'healingStream') return {
      ...spell, totem: { ...spell.totem, heal: spell.totem.heal * (1 + rank('restorative-stream') * values.restorativeStream.healingBonusPerRank) },
    };
    return { ...spell };
  });
  if (rank('healing-tide-totem')) {
    const tide = values.healingTide;
    adjustedSpells.push({
      id: 'healingTide', name: 'Healing Tide Totem', key: '7', icon: 'tideTotem', color: '#a0e2ec',
      cast: 0, cost: tide.mana / CONFIG.baseMana, heal: 0, selfTarget: true, cooldown: tide.cooldown,
      totem: { heal: tide.heal, duration: tide.duration, interval: tide.interval, party: true },
      description: `Heal every living ally for ${tide.heal} every ${tide.interval}s for ${tide.duration}s. Cast freely while active; coexists with Healing Stream.`,
    });
  }
  return { party: party.map(member => member.label === 'HEALER'
    ? { ...member, manaRegen: (member.manaRegen ?? CONFIG.manaRegen) * (1 + rank('tidal-reserves') * values.tidalReserves.manaRegenPerRank) }
    : { ...member }), spells: adjustedSpells };
}
