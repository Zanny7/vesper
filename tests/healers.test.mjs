import test from 'node:test';
import assert from 'node:assert/strict';
import { HEALERS } from '../src/data.js';
import { activeHealer, activeParty, restoreActiveHealer } from '../src/healers.js';
import { Combat } from '../src/combat.js';

test('healer selection restores safely and supplies exactly one player healer', () => {
  assert.equal(restoreActiveHealer('priest'), 'priest');
  assert.equal(restoreActiveHealer('druid'), 'druid');
  assert.equal(restoreActiveHealer('unknown'), 'priest');
  for (const id of Object.keys(HEALERS)) {
    const party = activeParty(id);
    assert.equal(party.length, 5);
    assert.equal(party.filter(member => member.label === 'HEALER').length, 1);
    assert.equal(party.at(-1).id, id);
    assert.equal(activeHealer(id).role, HEALERS[id].role);
  }
});

test('a selected Druid is the encounter healer while Priest behavior remains available', () => {
  const druid = new Combat(undefined, Math.random, activeParty('druid'), HEALERS.druid.combatSpells);
  const priest = new Combat(undefined, Math.random, activeParty('priest'), HEALERS.priest.combatSpells);
  assert.equal(druid.party.at(-1).role, 'Druid');
  assert.equal(priest.party.at(-1).role, 'Priest');
  druid.start(); druid.nextStrike = Infinity; druid.nextShard = Infinity; druid.mechanics.forEach(mechanic => mechanic.next = Infinity);
  assert.equal(druid.begin('flash', 'tank').ok, true);
});
