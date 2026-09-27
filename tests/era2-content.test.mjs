import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { CONFIG, CHAPTERS, CHAPTER_ENCOUNTERS, GEAR } from '../src/data.js';
import { fullResources, ChapterRuns, encounterState } from '../src/chapter-runs.js';
import { buildNormalLootTables, buildEliteBonusLootTables, rollBossBonusLoot } from '../src/loot.js';
import { encounterLootMarkup } from '../src/loot-presentation.js';
import { priorEquipment, probe, builds, probeRoute } from '../scripts/era2-content.mjs';
import { routes } from '../scripts/boss-balance.mjs';
import { TALENT_TREES } from '../src/talent-trees.js';
import { shamanBuilds } from '../scripts/shaman-policy.mjs';
const advance = (game, seconds) => { for (let i=0; i<seconds/CONFIG.step; i++) game.step(); };

test('all 47 Era II fights have unique authored pressure, readable schedules and authored rewards awaiting final tuning', () => {
  const profiles = new Set();
  let fights = 0;
  for (const chapter of CHAPTERS.slice(4)) {
    assert.equal(chapter.balanceStatus, 'awaiting-tuning');
    assert.equal(chapter.rewardsStatus, 'authored');
    assert.equal(chapter.talentMilestones, false);
    const encounters=chapter.nodes.filter(n=>n.encounter).map(n=>CHAPTER_ENCOUNTERS[n.encounter]);
    assert.ok(encounters.at(-1).maxHp > Math.max(...encounters.slice(0,-1).map(e=>e.maxHp)));
    const elite=CHAPTER_ENCOUNTERS[chapter.nodes.find(n=>n.kind==='elite').encounter];
    const normal=CHAPTER_ENCOUNTERS[chapter.nodes.find(n=>n.kind==='elite').id.replace(/\d+$/, n=>String(Number(n)-1))];
    assert.ok(elite.maxHp > normal.maxHp && elite.strike.damage/elite.strike.every > normal.strike.damage/normal.strike.every);
    for (const encounter of encounters) {
      fights++;
      profiles.add(JSON.stringify([encounter.strike,encounter.mechanics]));
      for (const m of encounter.mechanics) {
        assert.ok(m.warning>=3 && m.first>=m.warning && m.every>m.warning);
        if (m.end!=null) assert.ok(m.end>m.first);
        assert.ok(m.hint.length>20);
      }
    }
  }
  assert.equal(fights,47); assert.equal(profiles.size,47);
  const bosses=CHAPTERS.slice(4).map(chapter=>CHAPTER_ENCOUNTERS[chapter.nodes.at(-1).encounter]);
  assert.deepEqual(bosses.map(boss=>boss.phases.length),[2,3,3,4]);
  assert.ok(bosses.at(-1).phases.at(-1).at>=110);
  assert.equal(CONFIG.encounterManaRecovery,.2); assert.equal(CONFIG.manaRegen,3);
});

test('bounded mechanics stop announcing new casts while their existing wounds finish; phases pause and reset', () => {
  const encounter={...structuredClone(CHAPTER_ENCOUNTERS.sentinel),maxHp:1e8,
    phases:[{at:0,name:'Opening',hint:'First wound.'},{at:6,name:'Closing',hint:'Second hit.'}],
    mechanics:[{id:'wound',name:'Wound',first:4,every:2,end:6,warning:1,target:'tank',dot:{damage:2,ticks:5,interval:1}},
      {id:'close',name:'Closing Hit',first:8,every:20,warning:1,target:'party',damage:3}]};
  const game=new Combat(encounter); game.start(); game.nextStrike=Infinity;
  game.party.forEach(p=>p.nextAttack=Infinity);
  advance(game,3.1); assert.equal(game.mechanics[0].warned,true);
  game.pause();const frozen=JSON.stringify(game);advance(game,4);assert.equal(JSON.stringify(game),frozen);
  game.pause();advance(game,1.1);
  assert.equal(game.mechanics[0].next,Infinity);assert.equal(game.mechanics[0].warned,false);
  assert.equal(game.party[0].dots.length,1);
  advance(game,5);
  assert.equal(game.phase.name,'Closing');assert.equal(game.party[0].dots.length,0);
  assert.equal(game.events.filter(e=>e.type==='mechanic'&&e.mechanic==='wound').length,1);
  assert.deepEqual(game.events.filter(e=>e.type==='phase').map(e=>e.name),['Opening','Closing']);
  game.reset();assert.equal(game.phase.name,'Opening');assert.equal(game.mechanics[0].next,4);
});

test('Era II branches commit per run without erasing historical clears or changing Era I route rules', () => {
  const chapter=CHAPTERS[6], shrine=chapter.nodes.find(n=>n.kind==='shrine');
  const path=routes(chapter).find(path=>path.includes(shrine));
  const party=priorEquipment('prior-entry',970001).party('shaman'), runs=new ChapterRuns(null);
  const run=runs.restart(chapter,party);
  run.completed=path.slice(0,path.indexOf(shrine)).map(n=>n.id);
  const choices=chapter.nodes.filter(node=>node.routeStage===shrine.routeStage);
  assert.ok(choices.every(node=>encounterState(chapter,run,node)==='available'));
  assert.equal(runs.visit(chapter,shrine,party),true);
  for(const node of choices.filter(node=>node!==shrine)) {
    assert.equal(encounterState(chapter,run,node),'locked');
    assert.equal(runs.begin(chapter,node,party),null);
  }
  assert.equal(encounterState(chapter,run,shrine),'completed');
  assert.equal(encounterState(chapter,run,path[path.indexOf(shrine)+1]),'available');
  runs.restart(chapter,party);assert.equal(runs.runs[chapter.id].completed.length,0);
  assert.ok(CHAPTERS.slice(0,4).every(chapter=>chapter.routeChoices===undefined));
});

test('custom elite pool derivation remains chapter-local and the preview labels the choice model', () => {
  const chapter=CHAPTERS[5];
  const catalogue=GEAR.filter(item=>item.chapter===4).map(item=>({...item,id:`qa-${item.id}`,chapter:6}));
  // Synthetic catalogue is a reward plumbing test, never a balance loadout.
  const normal=buildNormalLootTables([chapter],catalogue), tables=buildEliteBonusLootTables([chapter],catalogue,normal);
  const elite=chapter.nodes.find(n=>n.kind==='elite'), table=tables[elite.encounter];
  assert.ok(table.length>0); assert.ok(table.every(id=>!normal[elite.encounter].includes(id)));
  const first=rollBossBonusLoot(table,[],'shaman',()=>0,catalogue);
  assert.equal(first.length,1);
  assert.equal(rollBossBonusLoot(table,table,'shaman',()=>0,catalogue).length,0);
  assert.match(encounterLootMarkup([],first,false,true),/Elite Choice/);
});

test('all Era II normal and elite fights reject idle and single-Stream safe clears with a full actual Era I catalogue loadout', () => {
  const party=priorEquipment('prior-catalogue',970001).party('shaman');
  for (const chapter of CHAPTERS.slice(4)) for (const node of chapter.nodes.filter(n=>n.encounter&&n.kind!=='boss')) {
    for (const policy of ['idle','oneStream']) {
      const result=probe(CHAPTER_ENCOUNTERS[node.encounter],party,'8-earth',970001,fullResources(party),policy);
      assert.equal(result.safe,false,`${node.id} ${policy}`);
      assert.ok(result.casts<=1);
    }
  }
});

test('reference builds use the existing eight-point Shaman budget and telemetry reconciles all Mana', () => {
  const party=priorEquipment('prior-entry',970001).party('shaman');
  for (const build of builds) {
    assert.equal(Object.values(shamanBuilds[build]).reduce((sum,rank)=>sum+rank,0),8);
    for (const [id,rank] of Object.entries(shamanBuilds[build])) assert.ok(rank <= (TALENT_TREES.shaman.find(talent=>talent.id===id).maxRank || 1));
    const result=probe(CHAPTER_ENCOUNTERS['reach-1'],party,build,970001);
    assert.ok(result.casts>3); assert.ok(result.effectiveHealing>500);
    assert.ok(Math.abs(result.entryMana-result.manaSpent+result.manaRegenerated-result.exitMana)<1e-5);
  }
  assert.equal(TALENT_TREES.shaman.length,12);
});

test('legal shrine paths carry wounded Health, apply explicit utility, and award exactly the fixed non-final recovery', () => {
  const chapter=CHAPTERS[4], party=priorEquipment('prior-catalogue',970001).party('shaman');
  const path=routes(chapter).find(path=>path.some(node=>node.kind==='shrine'));
  const result=probeRoute(chapter,path,party,'8-earth',970001,'conservative');
  const shrine=result.encounters.find(row=>row.utility);
  assert.ok(shrine,'the real previous-chapter loadout reaches the shrine');
  assert.equal(shrine.after.mana.current,shrine.before.mana.current);
  for (const row of result.encounters.filter(row=>row.won&&row.kind!=='boss')) {
    assert.ok(Math.abs(row.recovery-Math.min(row.maxMana*.2,row.maxMana-row.exitMana))<1e-5);
  }
});

test('a death-free enrage is still a failed route, never a safe clear in balance evidence', () => {
  const chapter=CHAPTERS[6], seed=970001, party=priorEquipment('prior-entry',seed).party('shaman');
  const result=probeRoute(chapter,routes(chapter)[0],party,'8-earth',seed,'conservative');
  assert.equal(result.won,false); assert.equal(result.safe,false);
  assert.equal(result.encounters.at(-1).kind,'boss');
  assert.ok(result.encounters.at(-1).seconds>=CHAPTER_ENCOUNTERS[chapter.nodes.at(-1).encounter].enrageSeconds);
  assert.ok(result.encounters.every(row=>!row.deaths));
});
