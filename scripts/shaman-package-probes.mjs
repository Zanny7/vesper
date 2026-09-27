// Actual Combat: useful target counts, partial cleave, full Unleash packages,
// and Tide alone versus continuing casts. No random Crit or permanent gear.
import { Combat } from '../src/combat.js';
import { Combat as Bat87Combat } from './fixtures/bat87-combat.mjs';
import { CONFIG, partyForHealer } from '../src/data.js';
import { balanceLoadout } from './shaman-balance.mjs';
const encounter = { name: 'Package probe', maxHp: 1e9, strike: { first: Infinity, every: Infinity, damage: 0 }, mechanics: [] };
function setup(build, injuries, version, power = 0) {
  const party = partyForHealer('shaman').map(p => ({ ...p, maxHp: 10000, damage: 0,
    ...(p.label === 'HEALER' ? { spellPower: power, maxMana: 10000, manaRegen: 0, haste: 0, crit: 0 } : {}) }));
  const loadout = balanceLoadout(party, 'shaman', build, version);
  const Model = version === 'bat87' ? Bat87Combat : Combat;
  const g = new Model(encounter, () => .99, loadout.party, loadout.spells);
  g.start();
  g.party.forEach((p, i) => { p.hp -= injuries[i] || 0; });
  let manaSpent = 0, mana = g.mana;
  Object.defineProperty(g, 'mana', { get: () => mana, set: value => { manaSpent += Math.max(0, mana - value); mana = value; } });
  g.measured = () => {
    const events = g.events.filter(e => e.type === 'heal');
    const sources = Object.fromEntries([...new Set(events.map(e => e.spell))].map(id => {
      const source = events.filter(e => e.spell === id);
      return [id, { effective: source.reduce((s, e) => s + e.amount, 0), raw: source.reduce((s, e) => s + e.raw, 0) }];
    }));
    return { effective: g.stats.effective, raw: g.stats.effective + g.stats.overheal, overheal: g.stats.overheal,
      manaSpent, hpm: g.stats.effective / manaSpent, seconds: g.time, sources };
  };
  return g;
}
function advance(g, seconds) { const end = g.time + seconds; while (g.time < end - 1e-8) g.step(); }
function cast(g, id, target = g.party[0]) {
  const result = g.begin(id, target.id);
  if (!result.ok) throw new Error(`${id}: ${result.reason}`);
  while (g.cast) g.step();
}
const out = row => console.log(JSON.stringify(row));
for (const version of ['bat87', 'current']) {
  for (const power of [0, 100]) for (const count of [1, 2, 3, 4, 5]) for (const wound of [50, 150, 300]) for (const rank of [0, 1, 2]) {
    const injuries = Array.from({ length: 5 }, (_, i) => i < count ? wound : 1);
    const g = setup({ 'high-tide': rank }, injuries, version, power);
    cast(g, 'chainHeal');
    out({ probe: 'chain', version, power, count, wound, rank, ...g.measured() });
  }
  for (const empowered of [false, true]) for (const wound of [10, 300]) {
    const g = setup({ 'ancestral-echo': 1 }, [wound, 500], version);
    if (empowered) cast(g, 'unleashLife', g.party[1]);
    cast(g, 'healingWave');
    out({ probe: 'ancestral', version, empowered, wound, ...g.measured() });
  }
  for (const count of [0, 1, 2, 3, 5]) for (const power of [0, 100]) {
    const g = setup({ 'cascading-stream': 1, 'high-tide': 2, 'tidal-waves': 1, earthliving: 1 },
      Array.from({ length: 5 }, (_, i) => i < count ? 300 : 0), version, power);
    cast(g, 'healingStream');
    out({ probe: 'cascade', version, count, power, ...g.measured() });
  }
  for (const continuation of [false, true]) {
    const g = setup({ 'healing-tide-totem': 1 }, Array(5).fill(300), version);
    cast(g, 'healingTide');
    if (continuation) { cast(g, 'chainHeal'); cast(g, 'chainHeal'); }
    if (g.time < 12) advance(g, 12 - g.time);
    out({ probe: 'tide-recovery', version, continuation, initialWounds: 1500, ...g.measured() });
  }
  for (const capstone of ['earthliving', 'ancestral-echo']) for (const double of [false, true]) for (const unleash of [false, true]) {
    const build = { [capstone]: 1, ...(double ? { 'double-current': 1 } : {}) };
    const g = setup(build, [700, 700], version, 100);
    if (unleash) cast(g, 'unleashLife');
    cast(g, 'healingWave'); cast(g, 'healingWave', g.party[1]);
    advance(g, 12);
    out({ probe: 'unleash-package', version, capstone, double, unleash, ...g.measured() });
  }
}
