import { renderPartyEffects } from './party-effects.js';
import { ChapterRuns } from './chapter-runs.js';
import { TalentProgression } from './talents.js';
import { healingParts } from './stats.js';
import { Combat } from './combat.js';
import { Battlefield } from './renderer.js';
import { setupView } from './view.js';
import { setupShell } from './shell.js';
import { setupAdventures } from './adventures.js';
import { setupChapters } from './chapters.js';
import { setupTeam } from './team.js';
import { Equipment } from './gear.js';
import { setupEquipment, itemIcon } from './equipment.js';
import { BOSS_BONUS_LOOT_TABLES, NORMAL_LOOT_TABLES, rollBossBonusLoot, rollNormalLoot } from './loot.js';
import { activeHealer, loadActiveHealer, healerHint } from './healers.js';
import { formatCooldown, healingSummary } from './ability-presentation.js';
import { abilityIcon } from './ability-icons.js';
import { createAbilitySettings, bindingFromEvent } from './ability-settings.js';
import { CONFIG, CHAPTER_ENCOUNTERS, ALL_ADVENTURES, CHAPTERS } from './data.js';

const $ = selector => document.querySelector(selector);
let activeHealerId = loadActiveHealer();
let abilityStorage;
try { abilityStorage = localStorage; } catch { /* Settings remain available in memory. */ }
const abilitySettings = createAbilitySettings(abilityStorage);
const runs = new ChapterRuns(abilityStorage);
const equipment = new Equipment(abilityStorage);
const party = healerId => equipment.party(healerId);
const game = new Combat(CHAPTER_ENCOUNTERS.sentinel, Math.random, party(activeHealerId), abilitySettings.spells(activeHealerId)), scene = new Battlefield($('#battlefield'));
const equipmentLocked = () => ['running', 'paused'].includes(game.status);
const talents = new TalentProgression(abilityStorage, {}, equipmentLocked);
equipment.isLocked = equipmentLocked;
const view = setupView(scene);
let selected = 'tank', hovered = null, lastStatus = '', lastLog = '', last = performance.now(), accumulator = 0, toastTimer;
let lastLoot = [];
const clock = t => `${String(Math.floor(t / 60)).padStart(2,'0')}:${String(Math.floor(t % 60)).padStart(2,'0')}`;
const number = n => Math.round(n).toLocaleString('en-US');
const roleIcons={tank:'♜',rogue:'⚔',mage:'✦',ranger:'⌁',priest:'✧',druid:'♣'};
let frames = [], spellButtons = [], currentSpells = [];
function buildHealerUI() {
  const healer = activeHealer(activeHealerId);
  currentSpells = abilitySettings.spells(activeHealerId);
  game.spells = currentSpells;
  $('#party-frames').innerHTML=game.party.map(p=>`<button class="party-frame ${p.id===selected?'selected':''}" data-target="${p.id}" style="--class-color:${p.color}" aria-label="${p.name}, ${p.role}"><div class="health-fill"></div><div class="incoming-fill"></div><div class="frame-top"><strong><i>${roleIcons[p.id]}</i>${p.name}</strong></div><div class="frame-bottom"><span>${p.role}</span></div><div class="frame-health"><span class="hp-percent">100%</span><span class="hp-values">${p.maxHp} / ${p.maxHp}</span></div><div class="frame-effects frame-effects-negative" aria-hidden="true"></div><div class="frame-effects frame-effects-helpful" aria-hidden="true"></div></button>`).join('');
  $('#spellbook').innerHTML=currentSpells.map(s=>`<button class="spell" data-spell="${s.id}" data-icon="${s.icon}" aria-label="${s.name}, key ${s.key}. ${s.description}">${abilityIcon(s)}<div class="cooldown-mask" aria-hidden="true" hidden></div></button>`).join('');
  $('.help-spells').innerHTML=currentSpells.map(s=>`<div><strong>${s.key} · ${s.name}</strong>${s.description}<small>${s.cast ? s.cast + 's ' + (s.channel?'channel':'cast') : 'Instant'} · ${healingSummary(s)} healing · ${s.cost*CONFIG.baseMana} mana</small></div>`).join('');
  $('.haste-row').hidden = activeHealerId !== 'priest';
  $('#help-haste').hidden = activeHealerId !== 'priest';
  $('.priest-resource .resource-title span').textContent = `✧ ${healer.role} mana`;
  frames = [...document.querySelectorAll('.party-frame')]; spellButtons = [...document.querySelectorAll('#spellbook .spell')];
  $('.action-footer > span').textContent = `${currentSpells.map(s => s.key).join(' · ')} — Cast spell · Hover to target · Click to select · ↑ ↓ Change ally`;
  for(const frame of frames){
    frame.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')hovered=frame.dataset.target;});
    frame.addEventListener('pointerleave',()=>{hovered=null;});
    frame.addEventListener('click',()=>{selected=frame.dataset.target;});
  }
  for(const button of spellButtons)button.addEventListener('click',()=>cast(button.dataset.spell));
}
buildHealerUI();
function prepareEncounterUI() {
  const node = ALL_ADVENTURES.find(node => node.encounter === game.encounter.id);
  const chapter = CHAPTERS.find(chapter => chapter.nodes.includes(node));
  $('#encounter-view .heading h1').textContent = node.name;
  $('#encounter-view .heading .eyebrow').textContent = `${chapter.number.toUpperCase()} / ENCOUNTER ${chapter.nodes.indexOf(node) + 1} OF ${chapter.nodes.length}`;
  $('.boss-title h2').textContent = game.encounter.name;
  $('.boss-title .eyebrow').textContent = node.kind === 'boss' ? 'CHAPTER BOSS' : chapter.name.toUpperCase();
  $('#battlefield').setAttribute('aria-label', `Party fighting ${game.encounter.name} with ${game.adds.length} supporting enemies`);
  $('.scene-caption').innerHTML = `<span class="scene-dot"></span> ${node.name.toUpperCase()} <span>${chapter.nodes.indexOf(node) + 1} / ${chapter.nodes.length}</span>`;
  $('#enemy-roster').textContent = (node.kind === 'boss' ? 'Chapter Boss · ' : '') + (game.adds.length ? `${game.adds.map(add => add.name).join(' · ')} · Flee when leader falls` : 'One enemy');
  $('#timeline').innerHTML = `<div class="baseline-attack">Tank strike <b id="strike-countdown"></b><small>${game.encounter.strike.damage} damage to Aldric every ${game.encounter.strike.every}s</small></div>${game.adds.map(add => `<div class="baseline-attack">${add.name} <b data-add-countdown="${add.id}"></b><small>${add.damage} damage · ${add.target === 'tank' ? 'Aldric' : 'Random living ally'}</small></div>`).join('')}`;
  $('#timeline').insertAdjacentHTML('beforeend', game.mechanics.map(m => `<div class="baseline-attack mechanic-countdown" data-mechanic="${m.id}" tabindex="0" data-tooltip="${m.name}: ${healerHint(m.hint, activeHealerId)}">${m.name} <b></b><small>${m.target === 'party' ? 'Party-wide damage' : m.dot ? 'Persistent wound' : `${m.count || 1} targets`}</small></div>`).join(''));
}
prepareEncounterUI();
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2200);}
function cast(id){const result=game.begin(id,hovered||selected);if(!result.ok)toast(result.reason);}
function restart(encounter, resources){game.reset(encounter, resources);prepareEncounterUI();scene.reset();selected='tank';hovered=null;accumulator=0;lastStatus='';lastLog='';lastLoot=[];$('#toast').classList.remove('show');renderUI();}
function begin(){if(['victory','defeat'].includes(game.status)){shell.openChapter();return;}if(game.status==='paused')game.pause();else game.start();renderUI();}
$('#begin').addEventListener('click',begin);
$('#restart').textContent = '↻ Restart chapter';
$('#restart').addEventListener('click',()=>{adventures.restartChapter();restart();shell.openChapter();});
$('#pause').addEventListener('click',()=>{game.pause();renderUI();});
function openHelp(){if(game.status==='running')game.pause();$('#help').showModal();renderUI();}
function closeHelp(){$('#help').close();}
$('#help-button').addEventListener('click',openHelp);$('#close-help').addEventListener('click',closeHelp);$('#help-done').addEventListener('click',closeHelp);
document.addEventListener('keydown',e=>{
  if(document.querySelector('dialog[open]'))return;
  if(e.key==='?'&&!e.repeat){e.preventDefault();openHelp();return;}
  if(!shell.isEncounter())return;
  if(e.code==='Space'){e.preventDefault();if(!e.repeat){game.pause();renderUI();}return;}
  if(e.key==='Escape'){e.preventDefault();game.cancel();return;}
  if(e.key==='ArrowUp'||e.key==='ArrowDown'){
    e.preventDefault();const index=game.party.findIndex(p=>p.id===selected);selected=game.party[(index+(e.key==='ArrowDown'?1:4))%5].id;hovered=null;return;
  }
  const binding = bindingFromEvent(e);
  const spell=currentSpells.find(s=>s.key===binding);
  if(spell){e.preventDefault();if(!e.repeat)cast(spell.id);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.status==='running'){game.pause();renderUI();}last=performance.now();accumulator=0;});
window.addEventListener('blur',()=>{hovered=null;if(game.status==='running'){game.pause();renderUI();}});
function renderUI(){
  if (['victory', 'defeat'].includes(game.status)) adventures.recordVictory(game);
  shell.refresh();
  for(const frame of frames){
    const p=game.party.find(p=>p.id===frame.dataset.target),percentage=p.hp/p.maxHp*100;
    frame.querySelector('.health-fill').style.width=`${percentage}%`;
    frame.querySelector('.hp-percent').textContent=p.hp>0?`${Math.ceil(percentage)}%`:'DEAD';
    frame.querySelector('.hp-values').textContent=`${number(p.hp)} / ${p.maxHp}`;
    frame.classList.toggle('selected',selected===p.id);frame.classList.toggle('critical',percentage>0&&percentage<30);frame.classList.toggle('dead',p.hp<=0);
    const effectLabel = renderPartyEffects(frame, p, game.time);
    frame.setAttribute('aria-pressed',String(selected===p.id));frame.setAttribute('aria-label',`${p.name}, ${p.role}, ${number(p.hp)} of ${p.maxHp} health${effectLabel ? ', ' + effectLabel : ''}`);
    frame.classList.toggle('threatened', game.mechanics.some(m => m.warned && m.targets?.includes(p.id)));
    const incoming=frame.querySelector('.incoming-fill');let amount=0;
    if(game.cast&&p.hp>0&&(game.cast.spell.party||game.cast.target===p.id))amount=game.cast.spell.channel?game.cast.spell.ticks.slice(game.cast.landed).reduce((n,t)=>n+t.heal,0)*healingParts(game.cast.spell,game.spellPower).factor:game.directHealing(game.cast.spell,p);
    incoming.style.left=`${percentage}%`;incoming.style.width=`${Math.min(p.maxHp-p.hp,amount)/p.maxHp*100}%`;
  }
  const target=game.party.find(p=>p.id===(hovered||selected));$('#target-label').textContent=`${hovered?'Mouseover':'Selected'}: ${target.name}`;
  $('#mana-number').textContent=`${number(game.mana)} / ${number(game.maxMana)}`;$('#mana-fill').style.width=`${game.mana/game.maxMana*100}%`;
  [...document.querySelectorAll('.charges span')].forEach((el,i)=>el.classList.toggle('active',i<game.buffs.postHaste));$('.charges').setAttribute('aria-label',`${game.buffs.postHaste} Post-Haste charges`);
  $('#boss-fill').style.width=`${game.boss.hp/game.boss.maxHp*100}%`;$('#boss-percent').textContent=`${Math.ceil(game.boss.hp/game.boss.maxHp*100)}%`;$('#boss-hp').textContent=`${number(game.boss.hp)} / ${number(game.boss.maxHp)}`;
  $('#timer').textContent=clock(game.time);$('#enrage').textContent=clock(Math.max(0,CONFIG.enrage-game.time));
  $('#alive-count').textContent=`${game.party.filter(p=>p.hp>0).length} / 5`;
  $('#healing-stat').innerHTML=`EFFECTIVE HEALING <b>${number(game.stats.effective)}</b>`;
  const cast=game.cast;
  $('.casting-row').classList.toggle('is-casting', !!cast);
  $('#cast-name').textContent=cast?`${cast.spell.channel?'Channeling: ':''}${cast.spell.name}`:'Ready to heal';
  $('#cast-target').textContent=cast?`→ ${cast.spell.party?'Every living ally':game.party.find(p=>p.id===cast.target)?.name}`:'Hover a frame or select an ally';
  $('#cast-time').textContent=cast?`${Math.max(0,cast.duration-cast.elapsed).toFixed(1)}s`:'';
  $('#cast-fill').style.width=cast?`${Math.min(100,Math.max(0,(cast.spell.channel?1-cast.elapsed/cast.duration:cast.elapsed/cast.duration)*100))}%`:'0%';$('.cast-track').classList.toggle('channel',!!cast?.spell.channel);
  for(const button of spellButtons){
    const spell=currentSpells.find(s=>s.id===button.dataset.spell),cooldown=Math.max(0,(game.cooldowns[spell.id]||0)-game.time);
    const mask=button.querySelector('.cooldown-mask');mask.hidden=cooldown<=0;mask.textContent=formatCooldown(cooldown);
    button.classList.toggle('on-cooldown', cooldown > 0);
    button.setAttribute('aria-disabled', String(game.status!=='running'||cooldown>0||game.mana<spell.cost*CONFIG.baseMana||(spell.consumesHot&&!game.activeHots(target,spell.consumesHot).length)));
    const duration = spell.cast * (spell.consumes && game.buffs[spell.consumes.buff] > 0 ? spell.consumes.castMultiplier : 1);
    button.dataset.tooltip = `${spell.name} · ${spell.key}\n${duration ? duration.toFixed(1) + 's ' + (spell.channel?'channel':'cast') : 'Instant'} · ${spell.cost*CONFIG.baseMana} mana\n${healingSummary(spell)} healing${spell.cooldown?` · ${spell.cooldown}s cooldown`:''}\n${spell.description}${cooldown>0?`\nReady in ${cooldown.toFixed(1)}s`:''}`;
    button.classList.toggle('active',cast?.spell.id===spell.id);
  }
  $('#strike-countdown').textContent = `· ${Math.max(0, Math.ceil(game.nextStrike-game.time))}s`;
  for (const add of game.adds) $('[data-add-countdown="'+add.id+'"]').textContent = `· ${Math.max(0, Math.ceil(add.next-game.time))}s`;
  for (const m of game.mechanics) {
    const row = $('[data-mechanic="'+m.id+'"]');
    row.querySelector('b').textContent = `· ${Math.max(0, Math.ceil(m.next-game.time))}s`;
    row.classList.toggle('warning', m.warned);
  }
  view.refreshTooltip();
  const warning=game.mechanics.filter(m=>m.warned).sort((a,b)=>a.next-b.next)[0];$('#mechanic-alert').hidden=!warning||game.status!=='running';
  if(warning){$('#mechanic-alert').textContent=`${warning.name.toUpperCase()} · ${(warning.next-game.time).toFixed(1)}s · ${warning.target === 'party' ? 'Everyone' : (warning.targets || []).map(id=>game.party.find(p=>p.id===id)?.name).join(', ')}`;$('#tactical-tip').textContent=healerHint(warning.hint,activeHealerId);}else{$('#tactical-tip').textContent=healerHint(game.encounter.lesson,activeHealerId);}
  const logKey=game.history.map(l=>l.time+l.text).join('|');
  if(logKey!==lastLog){$('#combat-log').innerHTML=game.history.slice(0,6).map(l=>`<div class="log-entry ${l.kind}"><time>${clock(l.time)}</time><span>${l.text}</span></div>`).join('')||'<p class="empty-log">The sanctum is still.<br>For now.</p>';lastLog=logKey;}
  if(game.status!==lastStatus){
    document.body.classList.toggle('encounter-overlay', game.status !== 'running');
    lastStatus=game.status;$('#scene-overlay').hidden=game.status==='running';
    $('#status-label').textContent=({ready:'AWAITING PULL',running:'ENCOUNTER ACTIVE',paused:'ENCOUNTER PAUSED',victory:'ENCOUNTER COMPLETE',defeat:'PARTY DEFEATED'})[game.status];
    $('#pause').disabled=!['running','paused'].includes(game.status);$('#pause').textContent=game.status==='paused'?'▷ Resume':'Ⅱ Pause';
    const data={
      ready:['YOUR VIGIL BEGINS','Be their saving grace.','The party will fight. You will keep them alive.<br>Hover a party frame and press the key shown on a spell to heal.','Begin encounter'],
      paused:['TAKE A BREATH','The light can wait.','Your encounter is paused.<br>Resume when you are ready.','Resume encounter'],
      victory:['ENCOUNTER COMPLETE','Their light endures.',ALL_ADVENTURES.find(node => node.encounter === game.encounter.id).kind === 'boss' ? `${CHAPTERS.find(chapter => chapter.nodes.some(node => node.encounter === game.encounter.id)).number} complete.<br>Your party has survived the vigil.` : `${game.encounter.name} has fallen.<br>Return to the map to choose your next encounter.`,'Play again'],
      defeat:['THE VIGIL ENDS','Even light can falter.',game.time>=CONFIG.enrage?'The guardian enraged after 150 seconds.':game.party.find(p=>p.label==='HEALER').hp<=0?'Your light faded. Remember to heal yourself.':game.party[0].hp<=0?'Aldric fell, and the front line collapsed.':'Too few allies remain to hold the sanctum.','Try again'],
    }[game.status];
    if (game.status === 'victory') {
      data[3] = 'Continue to chapter map';
      data[2] += lastLoot.length ? `<div class="loot-awarded"><small>LOOT ACQUIRED</small>${lastLoot.map(item => `<div class="loot-item"><span class="gear-slot is-equipped">${itemIcon(item)}</span><span><strong>${item.name}</strong><small>Item level ${item.itemLevel}</small></span></div>`).join('')}</div>` : '<div class="loot-awarded"><small>NO GEAR FOUND</small></div>';
    }
    if (game.status === 'defeat') { data[2] += '<br>This chapter run has ended. Restart from its first encounter; permanent unlocks are safe.'; data[3] = 'Return to chapter map'; }
    if(data){$('#overlay-eyebrow').textContent=data[0];$('#overlay-title').textContent=data[1];$('#overlay-text').innerHTML=data[2];$('#begin').innerHTML=`${data[3]} <span>→</span>`;}
    const ended=['victory','defeat'].includes(game.status);
    $('#return-to-map').hidden=true; // The primary outcome action now returns to the map.
    document.body.classList.toggle('encounter-ended', ended);
    $('#result-stats').innerHTML=ended?`<div><b>${clock(game.time)}</b>TIME</div><div><b>${number(game.stats.effective)}</b>HEALED</div><div><b>${Math.round(game.stats.overheal/Math.max(1,game.stats.effective+game.stats.overheal)*100)}%</b>OVERHEAL</div>`:'';
    $('#overlay-foot').hidden=ended;$('#overlay-foot').textContent=game.status==='paused'?'Press Space to resume.':'No movement. Just you, your spells, and five lives.';
  }
}
let uiElapsed=0;
function frame(now){
  const dt=Math.min((now-last)/1000,.1);last=now;
  if(game.status==='running'){
    accumulator+=dt;
    while(accumulator>=CONFIG.step){game.step();accumulator-=CONFIG.step;}
  }else accumulator=0;
  scene.receive(game.drainEvents());if(shell.isEncounter())scene.render(game,dt,selected,hovered);
  uiElapsed+=dt;if(uiElapsed>=1/30){renderUI();uiElapsed=0;}
  requestAnimationFrame(frame);
}
const gearUI = setupEquipment({ equipment, isLocked: equipmentLocked, onChange: () => {
  runs.reconcileParty(party(activeHealerId)); game.setLoadout(party(activeHealerId), abilitySettings.spells(activeHealerId));
  buildHealerUI(); prepareEncounterUI(); scene.reset(); renderUI(); team.refresh();
} });
const shell = setupShell({ game, view, resetEncounter: restart, onAbandon: () => adventures.abandon(), onNavigate: destination => { gearUI.close(); if (destination === 'chapter') adventures.refresh(); }, onEquipmentShortcut: () => team.selectHealer(activeHealerId), onInventoryOpen: () => gearUI.renderInventory(), onUtilityClose: () => gearUI.close() });
const team = setupTeam({ settings: abilitySettings, onAbilitiesChange: () => { buildHealerUI(); renderUI(); }, paintPortrait: (canvas, member, width) => scene.paintPortrait(canvas, member, width), onHealerChange: healerId => {
  activeHealerId = healerId; runs.reconcileParty(party(healerId)); game.setLoadout(party(healerId), abilitySettings.spells(healerId));
  selected = 'tank'; hovered = null; buildHealerUI(); prepareEncounterUI(); scene.reset(); renderUI();
}, equipment, gearUI, equipmentLocked });
const chapters = setupChapters({ openChapter: chapter => { if (adventures.openChapter(chapter)) shell.openChapter(); } });
const adventures = setupAdventures({
  runs,
  getParty: () => party(activeHealerId),
  startEncounter: (node, resources) => { shell.enterEncounter(CHAPTER_ENCOUNTERS[node.encounter], resources); renderUI(); },
  onProgress: completed => { talents.migrateLegacyCampaign(activeHealerId, completed); chapters.refresh(completed); },
  onVictory: (node, chapter) => talents.awardEncounter(activeHealerId, chapter, node),
  awardLoot: node => {
    const rewards = rollNormalLoot(NORMAL_LOOT_TABLES[node.encounter], equipment.ownedIds, activeHealerId);
    if (node.kind === 'boss') rewards.push(...rollBossBonusLoot(BOSS_BONUS_LOOT_TABLES[node.encounter], [...equipment.ownedIds, ...rewards.map(item => item.id)], activeHealerId));
    for (const item of rewards) equipment.acquire(item.id);
    return rewards;
  },
  onLoot: rewards => { lastLoot = rewards; gearUI.renderInventory(); team.refresh(); },
});
renderUI();requestAnimationFrame(frame);
