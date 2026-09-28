// Reconstruct the pre-BAT-103 Druid costs for historical snapshot guards.
export function historicalHealersBeforeBat103(healers) {
  return Object.fromEntries(Object.entries(healers).map(([id, healer]) => {
    if (id !== 'druid') return [id, healer];
    const before = { rejuvenation: 1, wildGrowth: 70 / 30, nourish: 1 };
    const spells = healer.spellBook.map(spell => before[spell.id] === undefined
      ? spell : { ...spell, cost: before[spell.id] });
    return [id, { ...healer, spellBook: spells, combatSpells: spells }];
  }));
}
