import test from 'node:test';
import assert from 'node:assert/strict';
import { SPELLS } from '../src/data.js';
import { bindingFromEvent, normalizeBinding, restoreAbilitySettings, createAbilitySettings } from '../src/ability-settings.js';
import { Combat } from '../src/combat.js';
import { activeParty } from '../src/healers.js';
import { partyForHealer } from '../src/data.js';
import { priestTalentLoadout } from '../src/priest-talents.js';

function storage() {
  const saved = new Map();
  return { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
}
test('reordering and conflicting binds persist independently for each healer', () => {
  const disk = storage(), settings = createAbilitySettings(disk);
  settings.move('priest', 'penance', 'flash');
  assert.deepEqual(settings.spells('priest').map(s => s.id), ['penance', 'flash', 'greater', 'prayer', 'smite', 'holyFire']);
  assert.deepEqual(settings.bind('priest', 'penance', '1'), { ok: true, swapped: 'flash' });
  assert.deepEqual(settings.spells('priest').map(s => s.key), ['1', '4', '2', '3', '5', '6']);
  settings.move('druid', 'rejuvenation', 'swiftmend'); settings.bind('druid', 'swiftmend', 'shift+q');
  const restored = createAbilitySettings(disk);
  for (const id of ['priest', 'druid']) assert.deepEqual(restored.spells(id), settings.spells(id));
  assert.deepEqual(restored.spells('priest').map(s => s.key), ['1', '4', '2', '3', '5', '6']);
  assert.deepEqual(restored.spells('druid').map(s => s.id), ['regrowth', 'swiftmend', 'rejuvenation', 'wildGrowth', 'nourish']);
  assert.equal(restored.spells('druid').find(s => s.id === 'swiftmend').key, 'Shift+Q');
  assert.deepEqual(SPELLS.map(s => s.key), ['1', '2', '3', '4', '5', '6']);
});
test('settings repair stale IDs, duplicates and invalid bindings while preserving valid choices', () => {
  const config = restoreAbilitySettings(SPELLS, { order: ['removed', 'prayer', 'prayer'], bindings: { flash: 'Q', greater: 'Q', prayer: 'Escape', penance: 'Ctrl+L' } });
  assert.deepEqual(config.order, ['prayer', 'flash', 'greater', 'penance', 'smite', 'holyFire']);
  assert.equal(config.bindings.flash, 'Q');
  assert.equal(new Set(Object.values(config.bindings)).size, SPELLS.length);
  for (const bad of [null, 42, [], { order: {}, bindings: null }]) assert.equal(restoreAbilitySettings(SPELLS, bad).order.length, 6);
  const sections = [{ id: 'a', key: '1', section: 'heals' }, { id: 'b', key: '2', section: 'heals' }, { id: 'c', key: '3', section: 'utility' }];
  assert.deepEqual(restoreAbilitySettings(sections, { order: ['c', 'b', 'a'] }).order, ['b', 'a', 'c']);
});
test('blocked storage retains usable session settings and damaged JSON falls back to defaults', () => {
  const settings = createAbilitySettings({ getItem() { return '{'; }, setItem() { throw new Error('Blocked'); } });
  settings.bind('druid', 'rejuvenation', 'E'); settings.move('druid', 'nourish', 'rejuvenation');
  assert.equal(settings.spells('druid')[0].id, 'nourish');
  assert.equal(settings.spells('druid').find(s => s.id === 'rejuvenation').key, 'E');
  assert.equal(settings.move('priest', 'missing', 'flash'), false);
  assert.equal(settings.bind('priest', 'flash', 'Escape').ok, false);
});
test('capture and encounter matching use the same modifier-aware key grammar', () => {
  assert.equal(bindingFromEvent({ key: 'q', code: 'KeyQ' }), 'Q');
  assert.equal(bindingFromEvent({ key: '!', code: 'Digit1', shiftKey: true }), 'Shift+1');
  assert.equal(bindingFromEvent({ key: 'e', code: 'KeyE', ctrlKey: true, altKey: true }), 'Ctrl+Alt+E');
  for (const event of [{ key: 'Escape' }, { key: ' ' }, { key: 'ArrowUp' }, { key: 'Tab' }, { key: '?' }, { key: 'l', ctrlKey: true }, { key: 'q', metaKey: true }, { key: 'q', isComposing: true }]) assert.equal(bindingFromEvent(event), null);
  assert.equal(normalizeBinding('shift+ctrl+alt+e'), 'Ctrl+Alt+Shift+E');
  assert.equal(normalizeBinding('Shift+Shift+Q'), null);
});
test('configured order and keys keep spell mechanics intact when consumed by combat', () => {
  const settings = createAbilitySettings(storage());
  settings.move('priest', 'penance', 'flash'); settings.bind('priest', 'flash', 'Q');
  const spells = settings.spells('priest'), game = new Combat(undefined, () => 0, activeParty('priest'), spells);
  game.start(); game.nextStrike = Infinity; game.nextShard = Infinity; game.mechanics.forEach(m => m.next = Infinity);
  game.party[0].hp = 100;
  const pressed = bindingFromEvent({ key: 'q', code: 'KeyQ' });
  const spell = spells.find(s => s.key === pressed);
  assert.equal(game.begin(spell.id, 'tank').ok, true);
  for (let i = 0; i < 90; i++) game.step();
  assert.equal(game.party[0].hp, 190);
  assert.deepEqual(game.buffs, {});
});

test('talent-granted Priest spells retain bar order and custom keybinds across reloads', () => {
  const disk = storage(), settings = createAbilitySettings(disk);
  const priestSpells = (current, allocations) => {
    const base = current.spells('priest');
    return current.spells('priest', priestTalentLoadout(partyForHealer('priest'), base, allocations).spells);
  };
  const allocations = { sanctuary: 1, 'divine-fervor': 1 };
  assert.deepEqual(priestSpells(settings, allocations).slice(-2).map(spell => [spell.id, spell.key]), [['sanctuary', '7'], ['divineFervor', '8']]);
  assert.equal(settings.move('priest', 'sanctuary', 'penance'), true);
  assert.equal(settings.bind('priest', 'divineFervor', 'Ctrl+Alt+Q').ok, true);
  const restored = createAbilitySettings(disk);
  const spells = priestSpells(restored, allocations);
  assert.ok(spells.findIndex(spell => spell.id === 'sanctuary') < spells.findIndex(spell => spell.id === 'penance'));
  assert.equal(spells.find(spell => spell.id === 'divineFervor').key, 'Ctrl+Alt+Q');
});
