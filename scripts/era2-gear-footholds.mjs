// Limited BAT-98 farming-access diagnostic, not final BAT-97 encounter acceptance.
// node scripts/era2-gear-footholds.mjs [samples=8] [output=docs/bat-98-footholds.json]
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CHAPTERS,CHAPTER_ENCOUNTERS } from '../src/data.js';
import { fullResources,recoverEncounterMana } from '../src/chapter-runs.js';
import { progressionWitness,equipmentForSnapshot,acquisitionSeed } from './era2-gear.mjs';
import { probe,builds } from './era2-content.mjs';
import { routes } from './boss-balance.mjs';
export function footholds(samples=8) {
  const rows=[],priorBoss=[];
  for(let i=0;i<samples;i++) {
    const seed=acquisitionSeed(i),witness=progressionWitness(seed);
    // Verify the inherited Chapter 4 equipment is an actual boss-clear loadout
    // under the same policy/build family used for the entrance diagnostic.
    const ch4Party=equipmentForSnapshot(witness[0].states.previous,'shaman').party('shaman');
    for(const build of builds) {
      const {resources,...result}=probe(CHAPTER_ENCOUNTERS[CHAPTERS[3].nodes.at(-1).encounter],ch4Party,build,seed);
      priorBoss.push({seed,build,...result});
    }
    for(const chapter of CHAPTERS.slice(4))for(const build of builds) {
      const state=witness.find(c=>c.chapter===chapter.ordinal).states.previous;
      const party=equipmentForSnapshot(state,'shaman').party('shaman');
      const prefixes=[...new Map(routes(chapter).filter(path=>!path.some(n=>['elite','shrine'].includes(n.kind)))
        .map(path=>path.filter(n=>n.kind==='normal').slice(0,2)).map(path=>[path.map(n=>n.id).join(','),path])).values()];
      for(const early of prefixes) {
       let resources=fullResources(party);
       for(const node of early) {
        const {resources:exit,...result}=probe(CHAPTER_ENCOUNTERS[node.encounter],party,build,seed,resources);
        rows.push({chapter:chapter.ordinal,node:node.id,prefix:early.map(n=>n.id),seed,build,currentSlots:0,...result});
        resources=recoverEncounterMana(exit);if(!result.won)break;
       }
      }
    }
  }
  return {samples,seeds:Array.from({length:samples},(_,i)=>acquisitionSeed(i)),method:'Real inherited Shaman equipment, three existing eight-point builds and conservative forecast policy. First two normal encounters carry Health/Mana with production recovery. No current-chapter gear granted between these two fights. Chapter 4 inheritance uses normal/Boss Bonus acquisition; Chapter 5–7 completion is assumed at the observed 18-slot state. These deterministic outcomes are not human probabilities or final encounter acceptance.',
    previousChapter4Boss:{attempts:priorBoss.length,wins:priorBoss.filter(r=>r.won).length,safe:priorBoss.filter(r=>r.safe).length},
    summary:CHAPTERS.slice(4).map(c=>{const selected=rows.filter(r=>r.chapter===c.ordinal);return {chapter:c.ordinal,attempts:selected.length,wins:selected.filter(r=>r.won).length,safe:selected.filter(r=>r.safe).length};}),priorBoss,rows};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const samples=Number(process.argv[2]||8);if(!Number.isInteger(samples)||samples<1)throw Error('samples must be positive');
  const report=footholds(samples);writeFileSync(process.argv[3]||'docs/bat-98-footholds.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({previousChapter4Boss:report.previousChapter4Boss,summary:report.summary}));
}
