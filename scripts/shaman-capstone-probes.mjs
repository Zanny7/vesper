// Capstone ablation with a shared legal six-point Cascade core.
// node scripts/shaman-capstone-probes.mjs [samples=300]
import { builds, controlledEncounter, equivalentParty, simulate, summary } from './shaman-balance.mjs';
import { decideShamanPriority } from './shaman-priority.mjs';
const samples=Number(process.argv[2]||300);
const {earthliving:removed,...core}=builds.shaman['7-earth-echo'];
for(const scale of [1.6,2.8]) for(const profile of ['three','aoe']) for(const [capstone,allocation] of Object.entries({
  unspent:core,earthliving:{...core,earthliving:1},tide:{...core,'healing-tide-totem':1},ancestral:{...core,'ancestral-echo':1},
})) {
  const rows=Array.from({length:samples},(_,i)=>simulate(controlledEncounter(4,profile,scale),equivalentParty(4,'shaman',127000+i),
    'shaman',allocation,127999+i,null,{seconds:90,policy:decideShamanPriority}));
  console.log(JSON.stringify({probe:'capstone-ablation',chapter:4,capstone,allocation,profile,scale,...summary(rows)}));
}
