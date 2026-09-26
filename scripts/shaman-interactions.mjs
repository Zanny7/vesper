// Isolated implemented-mechanic measurements. Uses diagnostic allocations,
// including pairwise combinations; these are not progression/win-rate builds.
import { Combat } from '../src/combat.js';
import { CONFIG, SHAMAN_SPELLS, partyForHealer } from '../src/data.js';
import { shamanTalentLoadout } from '../src/shaman-talents.js';
const encounter = { name: 'Interaction laboratory', maxHp: 1e8, strike: { first: Infinity, every: Infinity, damage: 0 }, mechanics: [] };
const setup = (build = {}, regen = 0) => {
  const party = partyForHealer('shaman').map(p => ({ ...p, maxHp: 10000, damage: 0,
    ...(p.label === 'HEALER' ? { spellPower: 30, maxMana: 10000, manaRegen: regen } : {}) }));
  const loadout = shamanTalentLoadout(party, SHAMAN_SPELLS, build);
  const game = new Combat(encounter, () => .99, loadout.party, loadout.spells);
  game.start(); game.party.forEach(p => { p.hp = 100; p.nextAttack = Infinity; });
  return game;
};
const advance = (g, s) => { for (let i = 0; i < Math.round(s / CONFIG.step); i++) g.step(); };
const cast = (g, id, target = 'tank') => {
  if (!g.begin(id, target).ok) throw new Error(`Cannot cast ${id}`);
  while (g.cast) g.step();
};
const hot = (g, p, id) => g.activeHots(p, [id])[0];
const heals = (g, id) => g.events.filter(e => e.type === 'heal' && e.spell === id);
const healing = (g, id) => ({ effective: heals(g, id).reduce((s, e) => s + e.amount, 0),
  raw: heals(g, id).reduce((s, e) => s + e.raw, 0), events: heals(g, id).length });
const output = (interaction, data) => console.log(JSON.stringify({ interaction, spellPower: 30, crit: 0, haste: 0, ...data }));

for (const rank of [0, 1, 2]) {
  const reserves = setup({ 'tidal-reserves': rank }, 3); reserves.mana = 0; advance(reserves, 60);
  output('Tidal Reserves', { rank, baseRegen: 3, seconds: 60, recoveredMana: reserves.mana });
  const g = setup({ 'high-tide': rank }); cast(g, 'chainHeal');
  output('High Tide', { rank, mana: 10000 - g.mana, ...healing(g, 'chainHeal') });
  const stream = setup({ 'restorative-stream': rank }); cast(stream, 'healingStream'); advance(stream, 12);
  output('Restorative Stream', { rank, duration: 12, cooldown: 15, maximumUptime: .8, mana: 10000 - stream.mana, ...healing(stream, 'healingStream') });
  const momentum = setup({ 'tidal-momentum': rank }); cast(momentum, 'recurringSurge'); cast(momentum, 'healingWave');
  output('Maintained Surge + Momentum', { rank, directWave: healing(momentum, 'healingWave'), bank: hot(momentum, momentum.party[0], 'recurringSurge').bankedHealing });
}
for (const empowered of [false, true]) {
  const g = setup({ 'ancestral-echo': 1 });
  if (empowered) cast(g, 'unleashLife');
  cast(g, 'healingWave');
  output('Ancestral Echo', { empowered, wave: healing(g, 'healingWave'), echo: healing(g, 'ancestral-echo') });
  for (const id of ['healingWave', 'chainHeal']) {
    const earth = setup({ earthliving: 1, 'echoing-surge': 1 });
    if (empowered) cast(earth, 'unleashLife');
    cast(earth, id);
    output('Earthliving contribution', { spell: id, empowered,
      banks: earth.party.map(p => ({ target: p.id, duration: (hot(earth, p, 'recurringSurge')?.expires || earth.time) - earth.time,
        healing: hot(earth, p, 'recurringSurge')?.bankedHealing || [] })) });
    advance(earth, 6);
    output('Earthliving + Echo', { spell: id, empowered, surge: healing(earth, 'recurringSurge'), echo: healing(earth, 'echoing-surge') });
  }
}
const clipped = setup({ 'echoing-surge': 1 }); cast(clipped, 'recurringSurge'); clipped.party[0].hp = 9970;
advance(clipped, 6);
output('Echo effective input', { surge: healing(clipped, 'recurringSurge'), echo: healing(clipped, 'echoing-surge') });

for (const deepRank of [0, 1, 2]) {
  const g = setup({ 'deep-riptide': deepRank, 'flowing-riptide': 1, 'tidal-waves': 1 });
  cast(g, 'riptide'); advance(g, 6);
  const previous = hot(g, g.party[0], 'riptide'), pending = previous.heal * previous.ticks;
  cast(g, 'riptide');
  output('Deep + Flowing cash-out', { deepRank, pendingBefore: pending, release: healing(g, 'flowing-riptide'),
    charges: g.availableCharges('riptide'), wavesStacksAfterTwoRiptides: g.buffs.tidalWaves });
  g.party[0].hp = 9900;
  const effect = hot(g, g.party[0], 'riptide'), expiry = effect.expires, next = effect.next;
  advance(g, 3);
  const movement = g.events.filter(e => e.type === 'buff' && e.source === 'flowingRiptide').at(-1);
  output('Flowing movement', { deepRank, movement, sameEffect: g.party.some(p => p.id !== 'tank' && p.hots.includes(effect)),
    expiryPreserved: effect.expires === expiry, nextBefore: next, nextAfter: effect.next, remainingBudget: effect.heal * effect.ticks });
}
const double = setup({ 'double-current': 1, 'tidal-waves': 1 }); cast(double, 'riptide'); cast(double, 'unleashLife');
const durations = [];
for (let i = 0; i < 2; i++) {
  double.begin('healingWave', 'tank'); durations.push(double.cast.duration); while (double.cast) double.step();
}
output('Double Current + Waves', { durations, wave: healing(double, 'healingWave'), unleashRemaining: double.buffs.unleashLife || 0, wavesRemaining: double.buffs.tidalWaves || 0 });
const tide = setup({ 'healing-tide-totem': 1, 'restorative-stream': 2 });
cast(tide, 'healingStream'); cast(tide, 'healingTide'); cast(tide, 'chainHeal'); advance(tide, 10);
output('Stream + Tide + Chain overlap', { mana: 10000 - tide.mana, stream: healing(tide, 'healingStream'), tide: healing(tide, 'healingTide'), chain: healing(tide, 'chainHeal') });
