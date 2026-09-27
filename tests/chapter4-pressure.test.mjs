import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, CHAPTER_ENCOUNTERS, CONFIG, GEAR, HEALERS } from '../src/data.js';
import { fullResources, recoverEncounterMana } from '../src/chapter-runs.js';
import { baseline, fight, states } from '../scripts/chapter4-pressure.mjs';
import { chapterBuilds } from '../scripts/encounter-pressure.mjs';
import { routes } from '../scripts/boss-balance.mjs';

test('BAT-94 changes only the identified Chapter 4 normal encounters', () => {
  assert.deepEqual(CONFIG,baseline.config);
  assert.deepEqual(GEAR.filter(item=>item.chapter<=4),baseline.gear);
  assert.deepEqual(HEALERS.shaman,baseline.shaman);
  const changed = Object.keys(baseline.encounters).filter(id => JSON.stringify(CHAPTER_ENCOUNTERS[id]) !== JSON.stringify(baseline.encounters[id]));
  assert.deepEqual(changed,['huntsman','roses','procession','garden','cryptkeeper']);
});

test('the original prepared Huntsman witness needs sustained healing', () => {
  const state = states(0,0,'7-earth','ready')[0], resources = fullResources(state.party);
  resources.mana.current /= 2;
  const prior = fight(baseline.encounters.huntsman,state.party,state.allocations,state.combatSeed,resources,'idle');
  assert.equal(prior.won,true); assert.equal(prior.casts,0); assert.equal(prior.deaths,0);
  assert.ok(Math.abs(prior.seconds - 36.3166666667) < .02);
  for (const policy of ['idle','oneHot','oneWave']) {
    const result = fight(CHAPTER_ENCOUNTERS.huntsman,state.party,state.allocations,state.combatSeed,resources,policy);
    assert.ok(!result.won || result.deaths > 0,policy);
  }
  const active = fight(CHAPTER_ENCOUNTERS.huntsman,state.party,state.allocations,state.combatSeed,resources);
  assert.equal(active.won,true); assert.equal(active.deaths,0);
  assert.ok(active.casts >= 8 && active.effectiveHealing > 1500);
});

test('every Chapter 4 normal resists idle and single-cast clears at both progression stages', () => {
  for (const stage of ['first','ready']) for (const build of chapterBuilds[3]) for (const path of routes(CHAPTERS[3]).keys()) {
    for (const state of states(path,0,build,stage).filter(s=>!s.boss)) for (const policy of ['idle','oneHot','oneWave']) {
      const result = fight(CHAPTER_ENCOUNTERS[state.encounter],state.party,state.allocations,state.combatSeed,null,policy);
      assert.ok(!result.won || result.deaths > 0,`${stage}/${build}/${path}/${state.encounter}/${policy}`);
    }
  }
});

test('all four reference builds can clear each prepared route with carried resources', () => {
  for (const build of chapterBuilds[3]) for (const path of routes(CHAPTERS[3]).keys()) {
    let resources = null;
    for (const state of states(path,0,build,'ready')) {
      const result = fight(CHAPTER_ENCOUNTERS[state.encounter],state.party,state.allocations,state.combatSeed,resources);
      assert.equal(result.won,true,`${build}/${path}/${state.encounter}`);
      assert.equal(result.deaths,0,`${build}/${path}/${state.encounter}`);
      resources = result.resources;
      if (!state.boss) {
        // Use the same shipped award and reconciliation pipeline as the report.
        resources = recoverEncounterMana(resources,CONFIG.encounterManaRecovery);
      }
    }
  }
});
