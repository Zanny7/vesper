import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { CONFIG, HEALERS, SHAMAN_SPELLS, partyForHealer } from '../src/data.js';
import { activeHealer, restoreActiveHealer, healerHint } from '../src/healers.js';
import { abilityTooltip } from '../src/ability-presentation.js';
import { healerBuffs } from '../src/healer-buffs.js';
import { partyEffects, effectDescription } from '../src/party-effects.js';
import { createAbilitySettings } from '../src/ability-settings.js';
import { TALENT_TREES } from '../src/talent-trees.js';
import { Equipment } from '../src/gear.js';
import { slotsForOwner } from '../src/item-model.js';

const training = { name: 'Training', maxHp: 100000, strike: { first: Infinity, every: Infinity, damage: 0 }, mechanics: [] };
function setup(stats = {}) {
  const party = partyForHealer('shaman').map(member => ({ ...member, ...(member.label === 'HEALER' ? { manaRegen: 0, ...stats } : {}) }));
  const game = new Combat(training, () => .99, party, SHAMAN_SPELLS);
  game.start(); game.party.forEach(member => { member.hp = 1; member.nextAttack = Infinity; });
  return game;
}
const advance = (game, seconds) => { for (let i = 0; i < Math.round(seconds / CONFIG.step); i++) game.step(); };
const finish = game => { while (game.cast) game.step(); };
const cast = (game, id, target = 'tank') => { assert.equal(game.begin(id, target).ok, true); finish(game); };
const heals = (game, id) => game.events.filter(event => event.type === 'heal' && event.spell === id);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
const surge = (game, target = game.party[0]) => target.hots.find(hot => hot.source === 'recurringSurge');

test('Shaman registers a separate six-spell baseline loadout, bindings and shared equipment stats', () => {
  assert.equal(restoreActiveHealer('shaman'), 'shaman');
  assert.equal(activeHealer('shaman').role, 'Shaman');
  assert.equal(HEALERS.shaman.combatSpells.length, 6);
  assert.equal(partyForHealer('shaman').filter(member => member.label === 'HEALER').length, 1);
  assert.equal(TALENT_TREES.shaman.length, 12);
  const data = new Map(), storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  const settings = createAbilitySettings(storage);
  settings.bind('shaman', 'chainHeal', 'Q'); settings.move('shaman', 'chainHeal', 'recurringSurge');
  const restored = createAbilitySettings(storage).spells('shaman');
  assert.equal(restored[0].id, 'chainHeal'); assert.equal(restored[0].key, 'Q');
  assert.equal(settings.spells('priest')[0].key, '1');
  assert.equal(settings.spells('druid')[0].id, 'rejuvenation');
  const gear = new Equipment(storage);
  const shaman = gear.healer('shaman');
  assert.deepEqual(gear.slots(shaman), slotsForOwner('priest'));
  gear.acquire('ch3-coalglass-hourglass');
  assert.equal(gear.equip(shaman, 'Trinket', 'ch3-coalglass-hourglass'), true);
  near(gear.healer('shaman').spellPower, 4);
  near(gear.healer('shaman').manaRegen, CONFIG.manaRegen + 1.6);
  assert.match(healerHint('Prepare Prayer of Healing.', 'shaman'), /Chain Heal/);
});

test('all six baseline spells use the agreed actual Mana, cast time and cooldown', () => {
  for (const [id, cost, duration, cooldown] of [
    ['recurringSurge', 24, 1.5, 0], ['healingWave', 28, 2.5, 0], ['riptide', 32, 0, 6],
    ['chainHeal', 65, 2.5, 0], ['unleashLife', 24, 0, 15], ['healingStream', 35, 0, 15],
  ]) {
    const game = setup();
    assert.equal(game.begin(id, 'tank').ok, true);
    near(game.cast?.duration || 0, duration);
    near(game.mana, CONFIG.mana - (duration ? 0 : cost));
    finish(game); near(game.mana, CONFIG.mana - cost);
    near(game.cooldowns[id] || 0, cooldown);
    if (cooldown) assert.equal(game.begin(id, 'tank').ok, false);
  }
});

test('Healing Wave heals exactly at completion and requires a living ally', () => {
  const game = setup();
  assert.equal(game.begin('healingWave', 'boss').ok, false);
  assert.equal(game.begin('healingWave', 'tank').ok, true);
  advance(game, 2.5 - CONFIG.step); assert.equal(game.party[0].hp, 1);
  advance(game, CONFIG.step); assert.equal(game.party[0].hp, 111);
  game.damage(game.party[1], 1000, 'test');
  assert.equal(game.begin('healingWave', 'rogue').ok, false);
});

test('Surge has three baseline ticks including its final tick; extension preserves the next tick', () => {
  const game = setup(); cast(game, 'recurringSurge');
  const hot = surge(game), originalNext = hot.next, originalExpiry = hot.expires;
  advance(game, 2 - CONFIG.step); assert.equal(heals(game, 'recurringSurge').length, 0);
  advance(game, CONFIG.step); assert.equal(game.party[0].hp, 45);
  cast(game, 'recurringSurge');
  assert.equal(surge(game), hot); near(hot.next, originalNext + 2); near(hot.expires, originalExpiry + 6);
  assert.equal(game.party[0].hots.length, 1);
  advance(game, 8.5);
  assert.deepEqual(heals(game, 'recurringSurge').map(event => event.raw), Array(6).fill(44));
  assert.equal(game.party[0].hots.length, 0);
});

test('prestacking Surge adds coverage without stacks and the completion-time cap clips hidden healing', () => {
  const game = setup();
  for (let i = 0; i < 6; i++) cast(game, 'recurringSurge');
  const hot = surge(game);
  near(hot.expires - game.time, 18); assert.equal(game.party[0].hots.length, 1);
  assert.equal(hot.bankedHealing.length, hot.ticks);
  assert.ok(hot.bankedHealing.every(amount => amount === 44));
  const expected = heals(game, 'recurringSurge').length + hot.ticks;
  advance(game, 20);
  assert.equal(heals(game, 'recurringSurge').length, expected);
  assert.equal(game.party[0].hots.length, 0);
  near(game.stats.effective + game.stats.overheal, expected * 44);
});

test('Surge has independent ally banks; overhealing spends ticks rather than saving them', () => {
  const game = setup(); cast(game, 'recurringSurge'); cast(game, 'recurringSurge', 'rogue');
  game.party[0].hp = game.party[0].maxHp;
  const tankNext = surge(game).next;
  advance(game, 2); assert.ok(surge(game).next > tankNext);
  advance(game, 6);
  const tankTicks = heals(game, 'recurringSurge').filter(event => event.target === 'tank');
  assert.equal(tankTicks.length, 3); assert.ok(tankTicks.every(event => event.amount === 0 && event.raw === 44));
  assert.equal(heals(game, 'recurringSurge').filter(event => event.target === 'rogue').length, 3);
});

test('Riptide delivers 40 immediately then six 27 ticks, and refresh discards its pending healing', () => {
  const game = setup(); cast(game, 'riptide'); assert.equal(game.party[0].hp, 41);
  advance(game, 3 - CONFIG.step); assert.equal(game.party[0].hp, 41);
  advance(game, CONFIG.step); assert.equal(game.party[0].hp, 68);
  advance(game, 15);
  assert.deepEqual(heals(game, 'riptide').map(event => event.raw), [40, ...Array(6).fill(27)]);
  assert.equal(game.party[0].hp, 203); assert.equal(game.party[0].hots.length, 0);
  const refresh = setup(); cast(refresh, 'riptide'); advance(refresh, 7); cast(refresh, 'riptide');
  const hot = refresh.party[0].hots[0]; near(hot.expires, refresh.time + 18); near(hot.next, refresh.time + 3);
  advance(refresh, 18);
  assert.deepEqual(heals(refresh, 'riptide').map(event => event.raw), [40, 27, 27, 40, ...Array(6).fill(27)]);
});

test('Chain Heal resolves distinct living targets by Health percentage at completion, including the healer', () => {
  const game = setup();
  assert.equal(game.begin('chainHeal', 'tank').ok, true);
  advance(game, 2); assert.equal(heals(game, 'chainHeal').length, 0);
  // Change injuries during the cast: the initial selection must not freeze jump order.
  game.party.forEach((member, index) => { member.hp = member.maxHp * [ .5, .4, .1, .3, .2 ][index]; });
  advance(game, .5);
  const events = heals(game, 'chainHeal');
  assert.deepEqual(events.map(event => event.target), ['tank', 'mage', 'shaman', 'ranger', 'rogue']);
  events.forEach((event, jump) => near(event.raw, 105 * .8 ** jump));
  near(events.reduce((sum, event) => sum + event.raw, 0), 352.968);
  events.forEach(event => near(event.time, 2.5));
  const fewer = setup(); fewer.damage(fewer.party[1], 1000, 'test'); cast(fewer, 'chainHeal');
  assert.equal(heals(fewer, 'chainHeal').length, 4);
  assert.equal(new Set(heals(fewer, 'chainHeal').map(event => event.target)).size, 4);
});

test('Unleash Life stores one persistent empowerment, preserves it through instant spells and cancellation', () => {
  const game = setup(); cast(game, 'unleashLife');
  near(game.party[0].hp, 91); assert.equal(game.buffs.unleashLife, 1);
  cast(game, 'riptide'); cast(game, 'healingStream'); advance(game, 16);
  assert.equal(game.buffs.unleashLife, 1);
  cast(game, 'unleashLife'); assert.equal(game.buffs.unleashLife, 1);
  const mana = game.mana;
  assert.equal(game.begin('healingWave', 'tank').ok, true); near(game.cast.duration, 2);
  assert.equal(healerBuffs(game).find(buff => buff.id === 'unleashLife').reserved, 1);
  advance(game, 1); game.cancel(); assert.equal(game.buffs.unleashLife, 1); near(game.mana, mana);
  cast(game, 'healingWave'); near(heals(game, 'healingWave').at(-1).raw, 132); near(game.mana, mana - 28);
  assert.equal(game.buffs.unleashLife, undefined);
  assert.equal(healerBuffs(game).some(buff => buff.id === 'unleashLife'), false);
  game.begin('healingWave', 'tank'); near(game.cast.duration, 2.5); game.cancel();
});

test('stored empowerment enables consecutive empowered casts after Unleash cooldown expires', () => {
  const game = setup(); cast(game, 'unleashLife'); advance(game, 15);
  cast(game, 'chainHeal'); cast(game, 'unleashLife'); cast(game, 'chainHeal');
  const events = heals(game, 'chainHeal'); assert.equal(events.length, 10);
  for (const start of [0, 5]) {
    events.slice(start, start + 5).forEach((event, jump) => near(event.raw, 126 * .8 ** jump));
    near(events.slice(start, start + 5).reduce((sum, event) => sum + event.raw, 0), 423.5616);
  }
});

test('empowered Surge appends only empowered new ticks without changing the original bank or schedule', () => {
  const game = setup(); cast(game, 'recurringSurge');
  const hot = surge(game), next = hot.next;
  cast(game, 'unleashLife'); game.begin('recurringSurge', 'tank'); near(game.cast.duration, 1.2); finish(game);
  near(hot.next, next); assert.equal(game.buffs.unleashLife, undefined);
  hot.bankedHealing.forEach((amount, index) => near(amount, index < 3 ? 44 : 52.8));
  advance(game, 12);
  heals(game, 'recurringSurge').forEach((event, index) => near(event.raw, index < 3 ? 44 : 52.8));
  assert.equal(heals(game, 'recurringSurge').length, 6);
});

test('a fully clipped empowered Surge cannot retain extra tick strength beyond the duration cap', () => {
  const game = setup({ haste: 1400 });
  for (let i = 0; i < 4; i++) cast(game, 'recurringSurge');
  cast(game, 'unleashLife'); cast(game, 'recurringSurge');
  const hot = surge(game);
  near(hot.expires - game.time, 18);
  assert.ok(hot.bankedHealing.every(amount => amount === 44), 'no newly scheduled tick fits this clipped extension');
  assert.equal(game.buffs.unleashLife, undefined);
});

test('a dead primary target gives no chain or wave healing and does not consume empowerment', () => {
  for (const id of ['healingWave', 'chainHeal', 'recurringSurge']) {
    const game = setup(); cast(game, 'unleashLife'); game.begin(id, 'rogue');
    game.damage(game.party[1], 1000, 'test'); finish(game);
    assert.equal(game.buffs.unleashLife, 1); assert.equal(heals(game, id).length, 0);
    assert.equal(game.party[1].hots.length, 0);
  }
});

test('Totem schedules six ticks, retargets by injured Health percentage, includes healer, and wastes full-Health ticks', () => {
  const game = setup(); game.party.forEach(member => { member.hp = member.maxHp; });
  cast(game, 'healingStream', 'boss'); advance(game, 2 - CONFIG.step);
  assert.equal(game.events.filter(event => event.type === 'totemTick').length, 0);
  advance(game, CONFIG.step); assert.equal(heals(game, 'healingStream').length, 0);
  game.healer.hp = 200; advance(game, 2); near(game.healer.hp, 232);
  game.party[1].hp = 100; advance(game, 2); near(game.party[1].hp, 132);
  game.damage(game.party[1], 1000, 'test');
  advance(game, 6);
  const ticks = game.events.filter(event => event.type === 'totemTick');
  assert.equal(ticks.length, 6); assert.equal(ticks[0].target, null);
  assert.deepEqual(ticks.slice(1).map(event => event.target), ['shaman', 'rogue', 'shaman', 'shaman', 'shaman']);
  ticks.forEach((event, index) => near(event.time, (index + 1) * 2));
  assert.equal(game.totem, null); assert.equal(game.healer.helpfulEffects.some(effect => effect.source === 'healingStream'), false);
  advance(game, 2); assert.equal(game.events.filter(event => event.type === 'totemTick').length, 6);
});

test('Totem replacement leaves one instance and its ticks continue while casting', () => {
  const game = setup(); cast(game, 'healingStream'); advance(game, 1);
  game.cooldowns.healingStream = 0; cast(game, 'healingStream');
  assert.equal(game.healer.helpfulEffects.filter(effect => effect.source === 'healingStream').length, 1);
  game.begin('healingWave', 'tank'); advance(game, 2);
  assert.ok(game.cast); assert.equal(heals(game, 'healingStream').length, 1);
  near(heals(game, 'healingStream')[0].time, 3);
  finish(game); advance(game, 10);
  assert.equal(game.events.filter(event => event.type === 'totemTick').length, 6);
});

test('Spell Power scales each new healing budget once, including chain and mixed spells', () => {
  const power = 30;
  for (const [id, expected, duration] of [
    ['healingWave', 110 + power, 0], ['chainHeal', 352.968 + power, 0],
    ['riptide', 202 + power, 18], ['recurringSurge', 132 + power, 6],
    ['unleashLife', 90 + power, 0], ['healingStream', 192 + power, 12],
  ]) {
    const game = setup({ spellPower: power }); cast(game, id); advance(game, duration);
    near(heals(game, id).reduce((sum, event) => sum + event.raw, 0), expected);
  }
  const game = setup({ spellPower: power }); cast(game, 'recurringSurge');
  const old = surge(game).bankedHealing[0]; game.healer.spellPower = 60;
  cast(game, 'unleashLife'); cast(game, 'recurringSurge');
  surge(game).bankedHealing.forEach((amount, index) => near(amount, index < 3 ? old : (44 + 60 / 3) * 1.2));
  const empowered = setup({ spellPower: power }); cast(empowered, 'unleashLife'); cast(empowered, 'chainHeal');
  near(heals(empowered, 'chainHeal').reduce((sum, event) => sum + event.raw, 0), (352.968 + power) * 1.2);
});

test('Haste follows shared HoT and cast scaling; Totem remains six ticks and Crit rolls per heal', () => {
  const game = setup({ haste: 50, crit: 100 });
  game.begin('healingWave', 'tank'); near(game.cast.duration, 2.5 / 1.5); finish(game);
  near(heals(game, 'healingWave')[0].raw, 165);
  cast(game, 'recurringSurge'); near(surge(game).interval, 2 / 1.5);
  advance(game, 6); assert.equal(heals(game, 'recurringSurge').length, 4);
  heals(game, 'recurringSurge').forEach(event => near(event.raw, 66));
  cast(game, 'healingStream'); advance(game, 12);
  assert.equal(game.events.filter(event => event.type === 'totemTick').length, 6);
});

test('pause freezes Shaman casts and effects; target death and reset clear effect state', () => {
  const game = setup(); cast(game, 'recurringSurge', 'rogue'); cast(game, 'riptide'); cast(game, 'healingStream'); cast(game, 'unleashLife');
  game.begin('healingWave', 'tank'); const time = game.time, next = game.totem.next;
  game.pause(); advance(game, 30); near(game.time, time); near(game.cast.elapsed, 0); near(game.totem.next, next);
  game.pause(); game.damage(game.party[1], 1000, 'test'); assert.equal(game.party[1].hots.length, 0);
  game.cancel(); advance(game, 2); assert.equal(game.party[1].hp, 0);
  const resources = game.resources(); game.reset(training, resources);
  assert.equal(game.mana, resources.mana.current); assert.equal(game.party[1].hp, 0);
  assert.equal(game.totem, null); assert.equal(game.buffs.unleashLife, undefined);
  assert.ok(game.party.every(member => member.hots.length === 0 && member.helpfulEffects.length === 0));
});

test('victory and defeat remove all Shaman encounter effects and stop pending casts', () => {
  for (const ending of ['victory', 'defeat']) {
    const game = setup(); cast(game, 'recurringSurge'); cast(game, 'riptide'); cast(game, 'healingStream'); cast(game, 'unleashLife');
    game.begin('healingWave', 'tank');
    if (ending === 'victory') game.boss.hp = 0; else game.damage(game.healer, 1000, 'test');
    game.step(); assert.equal(game.status, ending); assert.equal(game.cast, null);
    assert.equal(game.totem, null); assert.equal(game.buffs.unleashLife, undefined);
    assert.ok(game.party.every(member => member.hots.length === 0 && member.helpfulEffects.length === 0));
    const count = game.events.length; advance(game, 30); assert.equal(game.events.length, count);
  }
});

test('Shaman death immediately cancels casting and prevents due periodic healing', () => {
  const game = setup(); cast(game, 'recurringSurge'); cast(game, 'healingStream'); cast(game, 'unleashLife');
  game.begin('healingWave', 'tank');
  const count = game.events.filter(event => event.type === 'heal').length;
  game.damage(game.healer, 1000, 'test');
  assert.equal(game.cast, null); assert.equal(game.totem, null); assert.equal(surge(game), undefined);
  assert.equal(game.begin('riptide', 'tank').ok, false);
  advance(game, 3);
  assert.equal(game.events.filter(event => event.type === 'heal').length, count);
});

test('Shaman tooltips and effect indicators expose resolved healing, bank duration and empowerment', () => {
  const game = setup(); cast(game, 'recurringSurge'); cast(game, 'unleashLife');
  const tooltip = id => abilityTooltip(game, game.spells.find(spell => spell.id === id), game.party[0]);
  assert.match(tooltip('recurringSurge'), /1.2s cast · 24 Mana/);
  assert.match(tooltip('recurringSurge'), /52.8 healing every 2s/);
  assert.match(tooltip('recurringSurge'), /6s banked remaining/);
  assert.match(tooltip('healingWave'), /2s cast · 28 Mana/);
  assert.match(tooltip('healingWave'), /Heal one ally for 132/);
  assert.match(tooltip('chainHeal'), /126 → 100.8 → 80.6 → 64.5 → 51.6/);
  assert.match(tooltip('healingStream'), /6 ticks, 192 total/);
  assert.match(tooltip('riptide'), /27 healing every 3s/);
  assert.match(effectDescription(partyEffects(game.party[0], game.time).helpful[0], game.time), /132 banked healing in 3 remaining ticks.*6s remaining/);
  const stored = healerBuffs(game).find(buff => buff.id === 'unleashLife');
  assert.equal(stored.stacks, 1); assert.equal(stored.remaining, null);
});
