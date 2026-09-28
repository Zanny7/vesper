// Reconstruct only BAT-102 Priest values for historical scope guards.
export function beforeBat102Healers(healers) {
  const copy = structuredClone(healers);
  for (const key of ['spellBook', 'combatSpells']) copy.priest[key] = copy.priest[key].map(spell => {
    if (spell.id === 'flash') return { ...spell, heal: 90, description: 'A quick, focused heal for 90.' };
    if (spell.id === 'prayer') return { ...spell, heal: 100, description: 'Restores 100 health to every living ally, including you.' };
    if (spell.id === 'penance') return { ...spell, heal: 120,
      ticks: spell.ticks.map(tick => ({ ...tick, heal: 60 })),
      description: 'Channel two holy bolts. Each heals an ally for 60, or damages the enemy for 15 and triggers Atonement.' };
    return spell;
  });
  return copy;
}
