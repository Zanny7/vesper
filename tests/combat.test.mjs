import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { CHAPTER_ENCOUNTERS, CONFIG } from '../src/data.js';

const advance=(g,seconds)=>{for(let i=0;i<Math.round(seconds/CONFIG.step);i++)g.step();};
function isolated(){const g=new Combat();g.start();g.nextStrike=Infinity;g.nextShard=Infinity;g.mechanics.forEach(m=>m.next=Infinity);g.party.forEach(p=>{p.nextAttack=Infinity;});return g;}

test('Flash completes at 1.5s and heals 90 without baseline Post-Haste',()=>{
  const g=isolated();g.party[0].hp=100;
  assert.equal(g.begin('flash','tank').ok,true);advance(g,1.4);assert.equal(g.party[0].hp,100);
  advance(g,.1);assert.equal(g.party[0].hp,190);assert.deepEqual(g.buffs,{});
  g.begin('greater','tank');assert.equal(g.cast.duration,3);
});
test('Prayer heals every living ally including Priest without reviving the dead',()=>{
  const g=isolated();g.party.forEach(p=>p.hp=100);g.party[1].hp=0;g.begin('prayer','rogue');advance(g,3);
  assert.deepEqual(g.party.map(p=>p.hp),[200,0,200,200,200]);assert.equal(g.stats.effective,400);
});
test('Penance launches two bolts before distinct heals totaling 120',()=>{
  const g=isolated();g.party[0].hp=100;g.begin('penance','tank');advance(g,.7);
  assert.equal(g.events.filter(e=>e.type==='bolt').length,1);assert.equal(g.party[0].hp,100);
  advance(g,.3);assert.equal(g.party[0].hp,160);advance(g,1);assert.equal(g.party[0].hp,220);
  const bolts=g.events.filter(e=>e.type==='bolt'),heals=g.events.filter(e=>e.type==='heal');assert.equal(bolts.length,2);assert.equal(heals.length,2);
  heals.forEach((heal,i)=>assert.ok(Math.abs(heal.time-bolts[i].time-.3)<.02));assert.equal(g.cast,null);
  assert.equal(g.begin('penance','tank').ok,false);advance(g,10);assert.equal(g.begin('penance','tank').ok,true);
});
test('cancelling a channel prevents unlanded ticks and retains spent resources',()=>{
  const g=isolated();g.party[0].hp=100;g.begin('penance','tank');advance(g,.5);g.cancel();advance(g,1.5);
  assert.equal(g.party[0].hp,100);assert.ok(Math.abs(g.mana-(CONFIG.mana-30+2*CONFIG.manaRegen))<1e-8);assert.equal(g.begin('penance','tank').ok,false);
});
test('normal casts reserve their final cost, spend on completion, and cost nothing when cancelled',()=>{
  const g=isolated();g.mana=45;
  assert.equal(g.begin('greater','tank').ok,true);assert.equal(g.mana,45);assert.equal(g.cast.manaCost,45);
  advance(g,1);g.cancel();assert.ok(g.mana>45);assert.match(g.history[0].text,/No Mana spent/);
  g.mana=44;assert.equal(g.begin('greater','tank').ok,false);assert.equal(g.mana,44);
  g.mana=45;assert.equal(g.begin('greater','tank').ok,true);advance(g,3);
  assert.ok(Math.abs(g.mana-(45+3*CONFIG.manaRegen-45))<1e-8);
});
test('instant spells and channels spend their final cost at activation',()=>{
  const g=isolated();
  assert.equal(g.begin('holyFire','boss').ok,true);assert.equal(g.mana,CONFIG.mana-8);
  const mana=g.mana;assert.equal(g.begin('penance','tank').ok,true);assert.equal(g.mana,mana-30);
  g.cancel();assert.equal(g.mana,mana-30);assert.match(g.history[0].text,/not refunded/);
});
test('mana, cooldown, dead targets and busy casts reject without spending',()=>{
  const g=isolated();g.mana=20;assert.equal(g.begin('flash','tank').ok,false);assert.equal(g.mana,20);g.mana=200;g.party[1].hp=0;
  assert.equal(g.begin('flash','rogue').ok,false);assert.equal(g.mana,200);assert.equal(g.begin('greater','tank').ok,true);assert.equal(g.mana,200);
  assert.equal(g.begin('flash','priest').ok,false);assert.equal(g.mana,200);
});
test('healing clamps to max health and records overheal separately',()=>{
  const g=isolated();g.party[0].hp=580;g.begin('greater','tank');advance(g,3);assert.equal(g.party[0].hp,600);assert.equal(g.stats.effective,20);assert.equal(g.stats.overheal,180);
});
test('target is locked at cast start and dead targets receive no healing',()=>{
  const g=isolated();g.party[1].hp=50;g.begin('flash','rogue');g.damage(g.party[1],100,'test');advance(g,1.5);
  assert.equal(g.party[1].hp,0);assert.deepEqual(g.buffs,{});
});
test('mechanics warn ahead, repeat predictably and dots tick four times',()=>{
  const g=isolated();const pulse=g.mechanics.find(m=>m.id==='pulse');pulse.next=5;advance(g,1.1);assert.equal(pulse.warned,true);advance(g,4);
  assert.equal(g.party[4].hp,320);assert.equal(pulse.next,27);
  const mark=g.mechanics.find(m=>m.id==='mark');g.resolveMechanic(mark);const marked=g.party.find(p=>p.dots.length);const hp=marked.hp;advance(g,8.1);
  assert.equal(marked.hp,hp-72);assert.equal(marked.dots.length,0);
});
test('pause freezes channel, mana, cooldown and encounter time',()=>{
  const g=isolated();g.begin('penance','tank');advance(g,.3);g.pause();const snapshot=JSON.stringify(g);advance(g,5);assert.equal(JSON.stringify(g),snapshot);g.pause();advance(g,1.7);assert.equal(g.cast,null);
});
test('tank death, priest death, depleted party and enrage cause defeat',()=>{
  for(const target of [0,4]){const g=isolated();g.party[target].hp=0;g.step();assert.equal(g.status,'defeat');}
  const low=isolated();low.party.slice(1,4).forEach(p=>p.hp=0);low.step();assert.equal(low.status,'defeat');
  const enrage=isolated();advance(enrage,150.1);assert.equal(enrage.status,'defeat');
});
test('victory stops combat; restart clears casts, cooldowns, dots and outcome',()=>{
  const g=isolated();g.boss.hp=0;g.step();assert.equal(g.status,'victory');const t=g.time;advance(g,1);assert.equal(g.time,t);
  g.reset();assert.equal(g.status,'ready');assert.equal(g.time,0);assert.equal(g.mana,CONFIG.mana);assert.equal(g.cast,null);assert.deepEqual(g.cooldowns,{});assert.equal(g.stats.deaths,0);
});
function currentTriage(g){
  if(g.cast)return;
  const living=g.party.filter(p=>p.hp>0),lowest=[...living].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  const missing=p=>p.maxHp-p.hp;
  const injured=living.filter(p=>missing(p)>55);
  const ready=id=>(g.cooldowns[id]||0)<=g.time+1e-6;
  if(missing(lowest)>=100&&ready('penance')&&g.begin('penance',lowest.id).ok)return;
  if(injured.length>=3&&injured.reduce((sum,p)=>sum+Math.min(100,missing(p)),0)>=240&&g.begin('prayer',lowest.id).ok)return;
  if(missing(g.party[0])>=140&&g.begin('greater','tank').ok)return;
  if(missing(lowest)>=105&&g.begin('flash',lowest.id).ok)return;
  if(g.mana>g.maxMana*.8&&ready('holyFire'))g.begin('holyFire','boss');
}
test('unattended party loses; current triage wins the Chapter I boss',()=>{
  const seeded=seed=>()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const idle=new Combat(CHAPTER_ENCOUNTERS.warden,seeded(1));idle.start();advance(idle,150);assert.equal(idle.status,'defeat');
  for(let seed=1;seed<=20;seed++){
    const g=new Combat(CHAPTER_ENCOUNTERS.warden,seeded(seed));g.start();let attempts=0;
    while(g.status==='running'&&attempts++<10000){
      currentTriage(g);
      g.step();g.drainEvents();
    }
    assert.equal(g.status,'victory',`Seed ${seed} ended ${g.status} at ${g.time.toFixed(1)}s, mana ${g.mana}, health ${g.party.map(p=>p.hp)}`);
    assert.equal(g.stats.deaths,0,`seed ${seed}`);
    assert.ok(g.time<90,`seed ${seed}`);
    assert.ok(g.stats.effective>2000,`seed ${seed}`);
    assert.ok(g.mana<CONFIG.mana*.8,`seed ${seed}`);
  }
});
