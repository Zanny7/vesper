// BAT-89 early-reference policy sensitivity, no spell/gear/encounter changes.
// node scripts/shaman-reference-probes.mjs [trainingSamples=30] [validationSamples=300]
import { writeFileSync } from 'node:fs';
import { decide } from './talent-balance.mjs';
import { routeTrial, routeSummary } from './shaman-balance.mjs';
const source = decide.toString()
  .replace('threshold(95)', 'threshold(p.penance)')
  .replace('threshold(105)', 'threshold(p.greater)')
  .replace('threshold(80)', 'threshold(p.flash)')
  .replace('threshold(110)', 'threshold(p.swiftmend)')
  .replace('threshold(145)', 'threshold(p.regrowth)')
  .replace('threshold(90)', 'threshold(p.nourishWound)')
  .replace('incomingSoon - pendingSoon >= threshold(95)', 'incomingSoon - pendingSoon >= threshold(p.nourishNeed)');
function policy(parameters) {
  // Source is the locally imported trusted policy; only numeric parameters vary.
  return new Function('p', 'return (' + source + ');')(parameters);
}
const training = Number(process.argv[2] || 30), validation = Number(process.argv[3] || 300);
const trials = (healer, build, count, stage, p, skill = 'veryGood', offset = 0) => {
  const decideWithThresholds = policy(p);
  return Array.from({length:count},(_,i)=>routeTrial(1,healer,skill,stage,i+offset,
    build,'current',{policy: g=>decideWithThresholds(g,healer,skill)}));
};
const base = {penance:95,greater:105,flash:80,swiftmend:110,regrowth:145,nourishWound:90,nourishNeed:95};
const grid = [];
const selected = [];
for (const healer of ['priest','druid']) {
  const parameters = [];
  if (healer==='priest') for (const penance of [80,95,120]) for (const greater of [105,150,200]) for (const flash of [80,120]) parameters.push({...base,penance,greater,flash});
  else for (const swiftmend of [110,160,200]) for (const regrowth of [110,145,180]) for (const nourishNeed of [65,95,125]) parameters.push({...base,swiftmend,regrowth,nourishNeed,nourishWound:65});
  for (const build of healer==='priest'?['1-binding','1-mercy']:['1-rejuvenation','1-touch']) {
    const rows = parameters.map(p=>({healer,build,trainingIndexOffset:1000,parameters:p,
      ...routeSummary(trials(healer,build,training,'ready',p,'veryGood',1000))}));
    rows.sort((a,b)=>b.fullCompletion-a.fullCompletion || b.routeCompletion-a.routeCompletion || b.hpm-a.hpm);
    grid.push(...rows); selected.push({healer,build,parameters:rows[0].parameters});
  }
}
writeFileSync('docs/bat-89-reference-grid.jsonl',grid.map(row=>JSON.stringify(row)).join('\n')+'\n');
for (const {healer,build,parameters} of selected) for (const skill of ['veryGood','average','weak']) for (const stage of ['first','ready']) {
  console.log(JSON.stringify({probe:'reference-threshold-sensitivity',chapter:1,healer,build,skill,stage,parameters,
    trainingSeeds:training,trainingIndexOffset:1000,validationIncludesTraining:false,
    ...routeSummary(trials(healer,build,validation,stage,parameters,skill))}));
}
