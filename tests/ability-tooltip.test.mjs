import test from 'node:test';
import assert from 'node:assert/strict';
import { abilityTooltip } from '../src/ability-presentation.js';
import { Combat } from '../src/combat.js';
import { CONFIG, DRUID_SPELLS, SPELLS, partyForHealer } from '../src/data.js';
import { druidTalentLoadout } from '../src/druid-talents.js';
import { priestTalentLoadout } from '../src/priest-talents.js';
import { formatNumber, healingParts } from '../src/stats.js';
import { Equipment } from '../src/gear.js';
import { GEAR as TEST_GEAR } from './fixtures/gear.mjs';

const encounter = { name: 'Training', maxHp: 100000, strike: { first: Infinity, every: Infinity, damage: 0 }, mechanics: [] };
const makeGame = (healer, allocations = {}, stats = {}, random = () => 0.99) => {
  const party = partyForHealer(healer).map(member => member.label === 'HEALER' ? { ...member, ...stats } : { ...member });
  const loadout = healer === 'priest'
    ? priestTalentLoadout(party, SPELLS, allocations)
    : druidTalentLoadout(party, DRUID_SPELLS, allocations);
  const game = new Combat(encounter, random, loadout.party, loadout.spells);
  game.party.forEach(member => { member.nextAttack = Infinity; });
  return game;
};
const spell = (game, id) => game.spells.find(entry => entry.id === id);
const advance = (game, seconds) => { for (let i = 0; i < Math.round(seconds / CONFIG.step); i++) game.step(); };

test('Penance tooltip and combat share the 30 Mana, 60-per-bolt baseline', () => {
  const game = makeGame('priest');
  const penance = spell(game, 'penance');
  const tooltip = abilityTooltip(game, penance, game.party[0]);
  assert.match(tooltip, /2s channel · 30 Mana/);
  assert.match(tooltip, /2 healing bolts: 60 each \(120 total\)/);
  assert.match(tooltip, /2 bolts for 15 damage each \(30 total\)/);
  game.start(); game.party[0].hp = 100;
  assert.equal(game.begin('penance', 'tank').ok, true);
  advance(game, 2);
  assert.deepEqual(game.events.filter(event => event.type === 'heal' && event.spell === 'penance').map(event => event.raw), [60, 60]);
  assert.equal(game.party[0].hp, 220);
});

test('Spell Power, Haste, ranks and Post-Haste update tooltip values from the active loadout', () => {
  const game = makeGame('priest', { 'quick-remedy': 2, 'measured-casting': 2, 'post-haste': 1, 'threefold-penance': 1 }, { spellPower: 30, haste: 20 });
  assert.match(abilityTooltip(game, spell(game, 'flash')), /1.3s cast · 24 Mana/);
  assert.match(abilityTooltip(game, spell(game, 'flash')), /Heal one ally for 130/);
  assert.match(abilityTooltip(game, spell(game, 'greater')), /2.1s cast · 45 Mana/);
  const penance = abilityTooltip(game, spell(game, 'penance'));
  assert.match(penance, /1.7s channel · 30 Mana/);
  assert.match(penance, /3 healing bolts: 67.5 each \(202.5 total\)/);
  assert.match(penance, /additional smart bolt .* 67.5/);
  assert.equal(healingParts(spell(game, 'penance'), 30).direct, 270);
  game.buffs.postHaste = 1;
  assert.match(abilityTooltip(game, spell(game, 'greater')), /1.7s cast · 36 Mana/);
  assert.match(abilityTooltip(game, spell(game, 'greater')), /Post-Haste: this cast uses one stack/);
});

test('equipping and removing a Spell Power weapon refreshes the same combat tooltip', () => {
  const equipment = new Equipment(undefined, () => false, TEST_GEAR);
  const game = new Combat(encounter, () => 0.99, equipment.party('priest'), SPELLS);
  const flash = spell(game, 'flash');
  assert.match(abilityTooltip(game, flash), /Heal one ally for 100/);
  equipment.acquire('test-priest-censer');
  assert.equal(equipment.equip(partyForHealer('priest').at(-1), 'Weapon', 'test-priest-censer'), true);
  game.setLoadout(equipment.party('priest'), SPELLS);
  assert.match(abilityTooltip(game, flash), /Heal one ally for 112/);
  assert.equal(equipment.equip(partyForHealer('priest').at(-1), 'Weapon', null), true);
  game.setLoadout(equipment.party('priest'), SPELLS);
  assert.match(abilityTooltip(game, flash), /Heal one ally for 100/);
});

test('Druid tooltip tracks HoT ticks, target bonuses, and talent-added behavior', () => {
  const game = makeGame('druid', { 'twin-rejuvenation': 1, 'preserved-growth': 1, 'blooming-swiftmend': 1, 'overgrowth': 1, genesis: 1 }, { haste: 20 });
  const target = game.party[0];
  const rejuvenation = abilityTooltip(game, spell(game, 'rejuvenation'), target);
  assert.match(rejuvenation, /25 healing every 2.5s for 15s \(6 ticks, 150 total\)/);
  assert.match(rejuvenation, /Up to 2 Rejuvenation HoTs/);
  const swiftmend = abilityTooltip(game, spell(game, 'swiftmend'), target);
  assert.match(swiftmend, /does not consume the HoT/);
  assert.match(swiftmend, /every other living ally for 32/);
  game.cooldowns.wildGrowth = game.time + 8;
  assert.match(abilityTooltip(game, spell(game, 'wildGrowth')), /0.8s cast · 70 Mana/);
  assert.match(abilityTooltip(game, spell(game, 'wildGrowth')), /Overgrowth available/);
  assert.match(abilityTooltip(game, spell(game, 'genesis')), /Extend active Druid HoTs by 10s/);
});

test('active DoT rollover appears in the tooltip and matches the next application', () => {
  const game = makeGame('priest');
  game.start();
  const holyFire = spell(game, 'holyFire');
  assert.equal(game.begin('holyFire', 'boss').ok, true);
  advance(game, 2);
  game.cooldowns.holyFire = 0;
  const profile = game.resolveSpell(holyFire).dot;
  assert.equal(profile.pending, 20);
  assert.equal(profile.tick, 9);
  assert.match(abilityTooltip(game, holyFire), /9 damage every 2s for 10s \(5 ticks, 45 total including 20 carried damage\)/);
  assert.equal(game.begin('holyFire', 'boss').ok, true);
  assert.equal(game.boss.dots[0].damage, profile.tick);
});

test('Overgrowth tooltip includes carried HoT healing for the selected ally', () => {
  const game = makeGame('druid', { overgrowth: 1 });
  const target = game.party[0], wildGrowth = spell(game, 'wildGrowth');
  game.start(); game.applyHot(target, wildGrowth);
  game.cooldowns.wildGrowth = game.time + 8;
  assert.match(abilityTooltip(game, wildGrowth, target), /20 healing every 1s for 8s \(8 ticks, 160 total per ally including 80 carried healing\)/);
  game.applyHot(target, wildGrowth, { carryPending: true });
  assert.equal(target.hots.find(hot => hot.source === 'wildGrowth').heal, 20);
});

test('Penance bolts crit independently and Haste keeps all main and smart bolts', () => {
  const rolls = [0, 0.99, 0, 0.99];
  const game = makeGame('priest', { 'threefold-penance': 1 }, { haste: 20, crit: 50 }, () => rolls.shift() ?? 0.99);
  game.start(); game.party.forEach(member => { member.hp = 1; });
  assert.equal(game.begin('penance', 'tank').ok, true);
  assert.ok(Math.abs(game.cast.duration - 2 / 1.2) < 1e-8);
  advance(game, 2);
  const main = game.events.filter(event => event.type === 'heal' && event.spell === 'penance');
  const smart = game.events.filter(event => event.type === 'heal' && event.spell === 'threefold-penance');
  assert.deepEqual(main.map(event => event.raw), [90, 60, 90]);
  assert.equal(smart.length, 1);
  assert.equal(smart[0].raw, 60);
  assert.deepEqual(game.events.filter(event => event.type === 'bolt' && event.spell === 'penance').length, 4);
});

test('player-facing number formatter removes floating point artifacts', () => {
  assert.equal(formatNumber(125.000000003), '125');
  assert.equal(formatNumber(49.999999998), '50');
});
