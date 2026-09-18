import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { CONFIG } from '../src/data.js';

const advance=(g,seconds)=>{for(let i=0;i<Math.round(seconds/CONFIG.step);i++)g.step();};
function isolated(){const g=new Combat();g.start();g.nextStrike=Infinity;g.nextShard=Infinity;g.mechanics.forEach(m=>m.next=Infinity);g.party.forEach(p=>{p.nextAttack=Infinity;});return g;}

test('Flash completes at 1.5s, heals 100 and caps Post-Haste at two',()=>{
  const g=isolated();g.party[0].hp=100;
  assert.equal(g.begin('flash','tank').ok,true);advance(g,1.4);assert.equal(g.party[0].hp,100);assert.equal(g.buffs.postHaste,0);
  advance(g,.1);assert.equal(g.party[0].hp,200);assert.equal(g.buffs.postHaste,1);
  for(let i=0;i<2;i++){g.begin('flash','tank');advance(g,1.5);}assert.equal(g.buffs.postHaste,2);
});
test('two charges accelerate separate casts, never stack on one',()=>{
  const g=isolated();g.buffs.postHaste=2;g.begin('greater','tank');assert.ok(Math.abs(g.cast.duration-1.8)<1e-8);assert.equal(g.buffs.postHaste,1);
  advance(g,1.8);g.begin('prayer','priest');assert.ok(Math.abs(g.cast.duration-1.8)<1e-8);assert.equal(g.buffs.postHaste,0);
  advance(g,1.8);g.begin('greater','tank');assert.equal(g.cast.duration,3);
});
test('Prayer heals every living ally including Priest without reviving the dead',()=>{
  const g=isolated();g.party.forEach(p=>p.hp=100);g.party[1].hp=0;g.begin('prayer','rogue');advance(g,3);
  assert.deepEqual(g.party.map(p=>p.hp),[200,0,200,200,200]);assert.equal(g.stats.effective,400);
});
test('Penance launches three bolts before distinct heals totaling 250',()=>{
  const g=isolated();g.party[0].hp=100;g.begin('penance','tank');advance(g,.2);
  assert.equal(g.events.filter(e=>e.type==='bolt').length,1);assert.equal(g.party[0].hp,100);
  advance(g,.3);assert.equal(g.party[0].hp,183);advance(g,.75);assert.equal(g.party[0].hp,266);advance(g,.75);assert.equal(g.party[0].hp,350);
  const bolts=g.events.filter(e=>e.type==='bolt'),heals=g.events.filter(e=>e.type==='heal');assert.equal(bolts.length,3);assert.equal(heals.length,3);
  heals.forEach((heal,i)=>assert.ok(Math.abs(heal.time-bolts[i].time-.3)<.02));assert.equal(g.cast,null);
  assert.equal(g.begin('penance','tank').ok,false);advance(g,8);assert.equal(g.begin('penance','tank').ok,true);
});
test('cancelling a channel prevents unlanded ticks and retains spent resources',()=>{
  const g=isolated();g.party[0].hp=100;g.begin('penance','tank');advance(g,.5);g.cancel();advance(g,1.5);
  assert.equal(g.party[0].hp,183);assert.ok(Math.abs(g.mana-(CONFIG.mana-36+8))<1e-8);assert.equal(g.begin('penance','tank').ok,false);
});
test('mana, cooldown, dead targets and busy casts reject without spending',()=>{
  const g=isolated();g.mana=20;assert.equal(g.begin('flash','tank').ok,false);assert.equal(g.mana,20);g.mana=200;g.party[1].hp=0;
  assert.equal(g.begin('flash','rogue').ok,false);assert.equal(g.mana,200);assert.equal(g.begin('greater','tank').ok,true);assert.equal(g.mana,155);
  assert.equal(g.begin('flash','priest').ok,false);assert.equal(g.mana,155);
});
test('healing clamps to max health and records overheal separately',()=>{
  const g=isolated();g.party[0].hp=580;g.begin('greater','tank');advance(g,3);assert.equal(g.party[0].hp,600);assert.equal(g.stats.effective,20);assert.equal(g.stats.overheal,180);
});
test('target is locked at cast start and dead targets receive no healing',()=>{
  const g=isolated();g.party[1].hp=50;g.begin('flash','rogue');g.damage(g.party[1],100,'test');advance(g,1.5);
  assert.equal(g.party[1].hp,0);assert.equal(g.buffs.postHaste,0);
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
test('unattended party loses; a triage strategy can win a complete encounter',()=>{
  const idle=new Combat();idle.start();advance(idle,150);assert.equal(idle.status,'defeat');
  const g=new Combat();g.start();let attempts=0;
  while(g.status==='running'&&attempts++<10000){
    if(!g.cast){
      const living=g.party.filter(p=>p.hp>0),lowest=[...living].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
      const injured=living.filter(p=>p.maxHp-p.hp>=70),tank=g.party[0];
      if(injured.length>=3)g.begin('prayer',lowest.id);
      else if(tank.hp<360&&(g.cooldowns.penance||0)<=g.time)g.begin('penance','tank');
      else if(lowest.hp/lowest.maxHp<.48)g.begin('flash',lowest.id);
      else if(tank.maxHp-tank.hp>=160)g.begin('greater','tank');
      else if(lowest.maxHp-lowest.hp>=100)g.begin('flash',lowest.id);
    }
    g.step();g.drainEvents();
  }
  assert.equal(g.status,'victory',`Ended ${g.status} at ${g.time.toFixed(1)}s, mana ${g.mana}, health ${g.party.map(p=>p.hp)}`);
  assert.ok(g.stats.effective>2000);assert.ok(g.mana<CONFIG.mana*.8);
});
