import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, partyForHealer } from '../src/data.js';
import { builds, validateBuild, equivalentParty, balanceLoadout, simulate, controlledEncounter, routeTrial } from '../scripts/shaman-balance.mjs';
import { Combat } from '../src/combat.js';
import { Combat as Bat87Combat } from '../scripts/fixtures/bat87-combat.mjs';
import { decideShaman } from '../scripts/shaman-policy.mjs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('balance matrix contains legal 0/1/3/5/7/8-point builds for every healer', () => {
  for (const [healer, entries] of Object.entries(builds)) {
    assert.deepEqual([...new Set(Object.values(entries).map(build => validateBuild(healer, build)))].sort((a, b) => a - b), [0, 1, 3, 5, 7, 8]);
  }
  assert.throws(() => validateBuild('shaman', { earthliving: 1 }), /Locked row/);
  assert.throws(() => validateBuild('shaman', { 'tidal-reserves': 3 }), /Invalid rank/);
});

test('controlled comparisons have identical base stats and independent healer identities', () => {
  const parties = ['priest', 'druid', 'shaman'].map(healer => equivalentParty(4, healer, 127001));
  const stats = party => party.map(({ id, name, class: className, ...rest }) => rest);
  assert.deepEqual(stats(parties[0]), stats(parties[1]));
  assert.deepEqual(stats(parties[0]), stats(parties[2]));
  assert.deepEqual(parties.map(p => p.find(m => m.label === 'HEALER').id), ['priest', 'druid', 'shaman']);
  parties[2][0].maxHp = 1;
  assert.notEqual(equivalentParty(4, 'shaman', 127001)[0].maxHp, 1);
});

test('simulation charges instant costs exactly, rather than subtracting tick regeneration', () => {
  const party = partyForHealer('shaman');
  const encounter = { name: 'Debit measurement', maxHp: 1e8, strike: { first: Infinity, every: Infinity, damage: 0 }, mechanics: [] };
  const resources = { health: Object.fromEntries(party.map(p => [p.label === 'HEALER' ? 'healer' : p.id,
    { current: p.maxHp - (p.id === 'tank' ? 80 : 0), max: p.maxHp }])), mana: { current: 600, max: 600 } };
  // At 80 missing Health the policy summons Stream; Riptide follows at the
  // next decision, outside this one-step window. Only Stream costs Mana here.
  const result = simulate(encounter, party, 'shaman', {}, 1, resources, { seconds: CONFIG.step });
  assert.equal(result.manaSpent, 35);
  assert.ok(Math.abs(result.remainingMana - (600 - 35 + CONFIG.manaRegen * CONFIG.step)) < 1e-7);
  assert.deepEqual(result.casts, { healingStream: 1 });
});

test('original balance loadout restores all changed numbers without mutating production', () => {
  const party = partyForHealer('shaman'), build = builds.shaman['8-earth-tide'];
  const current = balanceLoadout(party, 'shaman', build), original = balanceLoadout(party, 'shaman', build, 'original');
  const spell = (loadout, id) => loadout.spells.find(s => s.id === id);
  assert.equal(spell(original, 'recurringSurge').hot.heal, 44);
  assert.equal(spell(original, 'healingWave').heal, 110);
  assert.equal(spell(original, 'healingWave').cost * CONFIG.baseMana, 28);
  assert.equal(spell(original, 'healingWave').earthlivingHealingRatio, 1);
  assert.equal(spell(original, 'chainHeal').earthlivingHealingRatio, 1);
  assert.equal(balanceLoadout(party, 'shaman', builds.shaman['7-high-tide'], 'original').spells.find(s => s.id === 'chainHeal').chain.jumpRatio, .85);
  assert.equal(spell(original, 'riptide').cost * CONFIG.baseMana, 32);
  assert.equal(spell(original, 'healingTide').totem.heal, 14);
  assert.equal(spell(original, 'healingTide').cost * CONFIG.baseMana, 80);
  assert.equal(spell(original, 'healingTide').totem.duration, 8);
  assert.equal(balanceLoadout(party, 'shaman', builds.shaman['7-earth-echo'], 'original').spells.find(s => s.id === 'recurringSurge').echoingSurge, .5);
  assert.deepEqual(balanceLoadout(party, 'shaman', build), current);
  assert.equal(balanceLoadout(party, 'shaman', builds.shaman['7-ancestral'], 'original').spells.find(s => s.id === 'healingWave').ancestralEcho, .4);
});

test('historical BAT-87 Tide policy prevents paying again for covered wounds', () => {
  const loadout = balanceLoadout(partyForHealer('shaman'), 'shaman', builds.shaman['7-tide-echo'], 'bat87');
  const encounter = { name: 'Split policy regression', maxHp: 1e8, strike: { first: Infinity, every: Infinity, damage: 0 }, mechanics: [] };
  const game = new Bat87Combat(encounter, () => .99, loadout.party, loadout.spells);
  game.start();
  game.party[0].hp -= 100; game.party[1].hp -= 100;
  decideShaman(game);
  assert.ok(game.tideTotem);
  const afterTide = game.mana;
  decideShaman(game);
  assert.equal(game.mana, afterTide);
  assert.equal(game.cast, null);
  assert.equal(game.totem, null);
  assert.equal(game.activeHots(game.party[0], ['recurringSurge', 'riptide']).length, 0);
});

test('Ancestral policy selects the primary that makes both effective heals useful', () => {
  const party = partyForHealer('shaman').map(p => ({ ...p,
    ...(p.id === 'tank' ? { maxHp: 1000 } : p.id === 'rogue' ? { maxHp: 400 } : {}),
    ...(p.label === 'HEALER' ? { spellPower: 30 } : {}) }));
  const loadout = balanceLoadout(party, 'shaman', builds.shaman['7-ancestral-echo']);
  const game = new Combat({ name: 'Echo policy regression', maxHp: 1e8, strike: { first: Infinity, every: Infinity, damage: 0 }, mechanics: [] }, () => .99, loadout.party, loadout.spells);
  game.start();
  game.party[0].hp -= 200; game.party[1].hp -= 125;
  assert.ok(game.party[1].hp / game.party[1].maxHp < game.party[0].hp / game.party[0].maxHp);
  assert.ok(game.begin('healingStream', game.healer.id).ok);
  assert.ok(game.begin('unleashLife', game.healer.id).ok);
  decideShaman(game);
  assert.equal(game.cast.spell.id, 'healingWave');
  assert.equal(game.cast.target, 'tank');
});

test('an empty CLI build filter runs all requested progression builds instead of zero rows', () => {
  const output = execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/shaman-balance.mjs', import.meta.url)), '1', 'controlled'], {
    encoding: 'utf8', env: { ...process.env, CHAPTERS: '1', HEALERS: 'shaman', PROFILES: 'focused', PRESSURE_SCALE: '1.6', BUILD_FILTER: '', BALANCE_VERSION: 'current', SHAMAN_TUNING: '{}' },
  });
  const rows = output.trim().split(/\r?\n/).map(JSON.parse);
  assert.deepEqual(rows.map(r => r.build), ['0-base', '1-reserves', '1-deep', '1-momentum']);
  assert.ok(rows.every(r => r.samples === 1 && r.seconds > 0));
});

test('fixed combat and route seeds reproduce results, and route resources carry exactly', () => {
  const encounter = controlledEncounter(4, 'burst', 2), party = equivalentParty(4, 'shaman', 87001);
  const run = () => simulate(encounter, party, 'shaman', builds.shaman['7-earth'], 88100, null, { seconds: 30 });
  assert.deepEqual(run(), run());
  const route = () => routeTrial(1, 'shaman', 'veryGood', 'ready', 1);
  const result = route();
  assert.deepEqual(route(), result);
  const boss = result.encounters.find(e => e.boss);
  if (boss) assert.equal(result.bossEntryMana, boss.entryResources.mana.current);
  for (let i = 1; i < result.encounters.length; i++) {
    const previous = result.encounters[i - 1].resources, next = result.encounters[i].entryResources;
    const adjusted = (saved, actual) => Math.min(actual.max, saved.current + Math.max(0, actual.max - saved.max));
    assert.ok(Math.abs(next.mana.current - adjusted(previous.mana, next.mana)) < 1e-7);
    for (const id of Object.keys(next.health)) assert.ok(Math.abs(next.health[id].current - adjusted(previous.health[id], next.health[id])) < 1e-7);
  }
});
