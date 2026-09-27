import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CONFIG,GEAR,HEALERS,CHAPTERS,CHAPTER_ENCOUNTERS} from '../src/data.js';
import {acquisitionSeed,progressionWitness,equipmentForSnapshot} from '../scripts/era2-gear.mjs';
import {probe,probeRoute,builds} from '../scripts/era2-content.mjs';
import {representativePaths} from '../scripts/era2-balance.mjs';
import {routes} from '../scripts/boss-balance.mjs';
import {fullResources,recoverEncounterMana} from '../src/chapter-runs.js';

const baseline=JSON.parse(readFileSync(new URL('../scripts/fixtures/bat99-fixed.json',import.meta.url)));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('BAT-99 leaves Mana, gear, healers and Era I encounters intact',()=>{
  assert.equal(hash(CONFIG),baseline.CONFIG);assert.equal(hash(GEAR),baseline.GEAR);assert.equal(hash(HEALERS),baseline.HEALERS);
  const encounters=Object.fromEntries(CHAPTERS.slice(0,4).flatMap(c=>c.nodes.filter(n=>n.encounter).map(n=>[n.encounter,CHAPTER_ENCOUNTERS[n.encounter]])));
  assert.equal(hash(encounters),baseline.encounters);
});
test('real prior-chapter equipment clears both Chapter 5–8 farming entrances without a reward between fights',()=>{
  const witness=progressionWitness(acquisitionSeed(0));
  for(const chapter of CHAPTERS.slice(4)) {
    const state=witness.find(w=>w.chapter===chapter.ordinal).states.previous;
    assert.equal(state.current,0);const party=equipmentForSnapshot(state,'shaman').party('shaman');
    const prefixes=[...new Map(routes(chapter).filter(path=>!path.some(n=>['elite','shrine'].includes(n.kind)))
      .map(path=>path.slice(0,2)).map(path=>[path.map(n=>n.id).join(','),path])).values()];
    for(const prefix of prefixes)for(const build of builds) {
      let resources=fullResources(party);
      for(const node of prefix) {
        const result=probe(CHAPTER_ENCOUNTERS[node.encounter],party,build,acquisitionSeed(0),resources);
        assert.equal(result.safe,true,`${chapter.id} ${node.id} ${build}`);
        assert.ok(result.casts>3);resources=recoverEncounterMana(result.resources);
      }
    }
  }
});
test('prepared gear requires active healing and Shaman has viable normal, elite and shrine boss paths',()=>{
  const witness=progressionWitness(acquisitionSeed(0));
  for(const chapter of CHAPTERS.slice(4)) {
    const state=witness.find(w=>w.chapter===chapter.ordinal).states.average,party=equipmentForSnapshot(state,'shaman').party('shaman');
    assert.ok(state.current>=15&&state.current<=20);
    for(const node of chapter.nodes.filter(n=>n.encounter&&n.kind!=='boss'))for(const policy of ['idle','oneHot','oneWave','oneStream']) {
      const result=probe(CHAPTER_ENCOUNTERS[node.encounter],party,'8-earth',acquisitionSeed(0),fullResources(party),policy);
      assert.equal(result.safe,false,`${chapter.id} ${node.id} ${policy}`);
    }
    for(const {strategy,path}of representativePaths(chapter)) {
      const result=probeRoute(chapter,path,party,'8-earth',acquisitionSeed(0),'conservative');
      assert.equal(result.safe,true,`${chapter.id} ${strategy}`);
      assert.ok(result.bossEntryMana>0);
    }
  }
});
