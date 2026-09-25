import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, ALL_ADVENTURES, CHAPTER_ENCOUNTERS, PARTY, CONFIG } from '../src/data.js';
import { Combat } from '../src/combat.js';
import { restoreCampaign, chapterUnlocked, nodeState, chapterComplete, awardVictory } from '../src/progression.js';

const advance = (g, seconds) => { for (let i=0;i<Math.ceil(seconds/CONFIG.step);i++) g.step(); };
const seeded = seed => () => { seed = (1664525*seed+1013904223) >>> 0; return seed/4294967296; };
function pathsTo(node, nodes) {
  return node.from.length ? node.from.flatMap(id => pathsTo(nodes.find(n=>n.id===id), nodes).map(path=>[...path,node])) : [[node]];
}
function triage(g) {
  if(g.cast) return;
  const living=g.party.filter(p=>p.hp>0), tank=g.party[0];
  const lowest=[...living].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  if(lowest.hp/lowest.maxHp<.5 && (g.cooldowns.penance||0)<=g.time) g.begin('penance',lowest.id);
  else if(lowest.hp/lowest.maxHp<.4) g.begin('flash',lowest.id);
  else if(living.filter(p=>p.maxHp-p.hp>=65).length>=3) g.begin('prayer',lowest.id);
  else if(tank.maxHp-tank.hp>=180) g.begin('greater','tank');
  else if(lowest.maxHp-lowest.hp>=90) g.begin('flash',lowest.id);
}

test('every chapter graph has one reachable boss, unique nodes and valid encounters', () => {
  assert.equal(new Set(ALL_ADVENTURES.map(n=>n.id)).size,ALL_ADVENTURES.length);
  assert.deepEqual(CHAPTERS.map(c=>c.nodes.length),[4,6,9,9]);
  for(const chapter of CHAPTERS) {
    const nodes=chapter.nodes,bosses=nodes.filter(n=>n.kind==='boss');
    assert.equal(bosses.length,1);
    assert.equal(nodes.filter(n=>!n.from.length).length,1);
    for(const node of nodes) {
      assert.ok(CHAPTER_ENCOUNTERS[node.encounter],node.id);
      for(const id of node.from) {
        const parent=nodes.find(n=>n.id===id);
        assert.ok(parent,node.id);
        assert.ok(parent.x<node.x,'routes always move forward; no cycles');
      }
    }
    const routes=pathsTo(bosses[0],nodes);
    assert.ok(routes.every(route=>route.length===chapter.routeLength));
    if(chapter.id!=='catacombs') assert.ok(routes.length>=2);
    for(const node of nodes) assert.ok(routes.some(route=>route.includes(node)),node.id+' is on a route to the boss');
  }
});

test('every alternative route unlocks its boss without clearing sibling routes', () => {
  for(const chapter of CHAPTERS) for(const route of pathsTo(chapter.nodes.at(-1),chapter.nodes)) {
    const completed=new Set();
    for(const node of route) {
      assert.equal(nodeState(node,completed),'available');
      assert.equal(chapterComplete(completed,chapter.nodes),false);
      assert.equal(awardVictory(completed,node.id,{status:'victory',encounter:CHAPTER_ENCOUNTERS[node.encounter]},chapter.nodes),true);
    }
    assert.equal(chapterComplete(completed,chapter.nodes),true);
    assert.equal(completed.size,chapter.routeLength);
    if(chapter.id!=='catacombs') assert.ok(completed.size<chapter.nodes.length);
  }
});

test('campaign restoration preserves old Chapter I progress, validates routes, and gates later chapters', () => {
  let completed=restoreCampaign(CHAPTERS[0].nodes.map(n=>n.id));
  assert.equal(completed.size,4);
  assert.equal(chapterUnlocked(CHAPTERS[1],completed),true);
  assert.equal(chapterUnlocked(CHAPTERS[2],completed),false);
  const route2=pathsTo(CHAPTERS[1].nodes.at(-1),CHAPTERS[1].nodes)[1];
  completed=restoreCampaign([...completed,...route2.map(n=>n.id)].reverse());
  assert.equal(chapterUnlocked(CHAPTERS[2],completed),true);
  assert.equal(chapterUnlocked(CHAPTERS[3],completed),false);
  const before=[...completed];
  const saved=restoreCampaign([...before,'unknown',CHAPTERS[2].nodes.at(-1).id,CHAPTERS[3].nodes[0].id]);
  assert.deepEqual([...saved],[...restoreCampaign(before)]);
  assert.equal(restoreCampaign(['sanctum']).size,0);
  assert.equal(restoreCampaign(null).size,0);
});

test('chapter lessons and encounter compositions vary and build on earlier pressure', () => {
  const fights=chapter=>chapter.nodes.map(n=>CHAPTER_ENCOUNTERS[n.encounter]);
  assert.ok(fights(CHAPTERS[1]).filter(e=>e.mechanics.some(m=>m.target==='party')).length>=4);
  assert.ok(fights(CHAPTERS[2]).every(e=>e.mechanics.some(m=>m.target==='random' && [2,3].includes(m.count))));
  assert.ok(fights(CHAPTERS[3]).every(e=>e.mechanics.some(m=>m.dot)));
  for(const chapter of CHAPTERS.slice(1)) {
    const encounters=fights(chapter);
    assert.ok(new Set(encounters.map(e=>e.appearance)).size>=3);
    assert.ok(encounters.some(e=>e.adds.length) && encounters.some(e=>!e.adds.length));
    assert.ok(encounters.at(-1).maxHp>Math.max(...encounters.slice(0,-1).map(e=>e.maxHp)));
  }
});

function isolated(id, random=()=>.01) {
  const g=new Combat(CHAPTER_ENCOUNTERS[id],random);g.start();
  g.nextStrike=Infinity;g.adds=[];g.party.forEach(p=>p.nextAttack=Infinity);
  g.mechanics.forEach(m=>m.next=Infinity);
  return g;
}
test('split warnings lock distinct living targets including tank and healer; pause freezes the warning', () => {
  const g=isolated('ravens',()=>.999), m=g.mechanics[0];m.next=4;
  advance(g,1.1);
  assert.equal(m.warned,true);assert.equal(new Set(m.targets).size,3);assert.ok(m.targets.includes('priest'));
  g.pause();const snapshot=JSON.stringify(g);advance(g,5);assert.equal(JSON.stringify(g),snapshot);
  g.pause();const targets=[...m.targets];advance(g,3);
  for(const p of g.party) assert.equal(p.hp,p.maxHp-(targets.includes(p.id)?m.damage:0));
  assert.equal(m.targets,undefined);assert.equal(m.warned,false);
  const tank=isolated('gatekeeper');tank.resolveMechanic(tank.mechanics[0]);
  assert.ok(tank.party[0].hp<tank.party[0].maxHp);
  const dead=isolated('gatekeeper');dead.party[1].hp=0;dead.resolveMechanic(dead.mechanics[0]);
  assert.equal(dead.party[1].hp,0);
  assert.equal(dead.events.filter(e=>e.type==='damage').length,2);
});

test('bleeds tick for their full duration, refresh their own effect, and allow different wounds to overlap', () => {
  const g=isolated('huntsman'), m=g.mechanics[0], tank=g.party[0];
  g.resolveMechanic(m);assert.equal(tank.dots.length,1);
  const initial=tank.hp;advance(g,2.1);assert.equal(tank.hp,initial-m.dot.damage);
  g.resolveMechanic(m);assert.equal(tank.dots.length,1);
  const refreshed=tank.hp;advance(g,10.1);
  assert.equal(tank.hp,refreshed-m.dot.damage*m.dot.ticks);assert.equal(tank.dots.length,0);
  g.resolveMechanic(m);g.resolveMechanic({...m,id:'other',name:'Other wound'});
  assert.equal(tank.dots.length,2);
  g.pause();const hp=tank.hp;advance(g,5);assert.equal(tank.hp,hp);
  g.reset();assert.ok(g.party.every(p=>!p.dots.length));
});

test('later chapter openers are manageable with fresh resources', () => {
  // Later route encounters are tuned as progression walls. The first normal
  // encounter remains individually beatable before route attrition begins.
  const legacyParty = PARTY.map(p => p.label === 'HEALER' ? { ...p, maxMana: 1200, manaRegen: 4 } : p);
  for(const chapter of CHAPTERS.slice(1)) for(const node of chapter.nodes.filter(node => node.kind === 'normal' && node.from.length === 0)) {
    const encounter=CHAPTER_ENCOUNTERS[node.encounter];
    for(let seed=1;seed<=20;seed++) {
      const g=new Combat(encounter,seeded(seed),legacyParty);g.start();
      while(g.status==='running'&&g.time<150) { triage(g);g.step();g.drainEvents(); }
      assert.equal(g.status,'victory',encounter.id+' seed '+seed+' hp '+g.party.map(p=>p.hp)+' mana '+g.mana);
      assert.equal(g.stats.deaths,0,encounter.id+' seed '+seed);
      assert.ok(g.time<CONFIG.enrage);
      // Briar now takes four 90-point Flash Heals with no overheal (360 total).
      assert.ok(g.stats.effective>=360,encounter.id+' seed '+seed+' effective healing '+g.stats.effective);
    }
  }
});

test('encounter pressure stays fixed when a stronger party is supplied for future gear tuning', () => {
  const stronger=PARTY.map(p=>({...p,maxHp:p.maxHp+100,damage:p.damage*1.2}));
  const g=new Combat(CHAPTER_ENCOUNTERS.briar,()=>0,stronger);g.start();
  advance(g,3);assert.equal(g.party[0].hp,stronger[0].maxHp-58);
  assert.equal(g.encounter.strike.damage,58);
});
