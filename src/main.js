import { Combat } from './combat.js';
import { Battlefield } from './renderer.js';
import { setupView } from './view.js';
import { setupShell } from './shell.js';
import { setupAdventures } from './adventures.js';
import { setupTeam } from './team.js';
import { setupEquipment } from './equipment.js';
import { compactKeybind, formatCooldown } from './ability-presentation.js';
import { CONFIG, SPELLS } from './data.js';

const $ = selector => document.querySelector(selector);
const game = new Combat(), scene = new Battlefield($('#battlefield'));
const view = setupView(scene);
setupTeam((canvas, member) => scene.paintPortrait(canvas, member));
setupEquipment((canvas, member) => scene.paintPortrait(canvas, member, 200));
let selected = 'tank', hovered = null, lastStatus = '', lastLog = '', last = performance.now(), accumulator = 0, toastTimer;
const clock = t => `${String(Math.floor(t / 60)).padStart(2,'0')}:${String(Math.floor(t % 60)).padStart(2,'0')}`;
const number = n => Math.round(n).toLocaleString('en-US');
const icons = {
  spark: '<path d="M20 2 24 15 37 19 24 23 20 37 16 23 3 19 16 15Z"/><path d="m30 3 1.5 5 5 1.5-5 1.5-1.5 5-1.5-5-5-1.5 5-1.5Z"/>',
  sun: '<circle cx="20" cy="20" r="9"/><circle cx="20" cy="20" r="4"/><path d="M20 1v7m0 24v7M1 20h7m24 0h7M6 6l5 5m18 18 5 5M6 34l5-5M29 11l5-5"/>',
  wings: '<path d="M20 32C7 30 3 22 3 9l12 10M20 32c13-2 17-10 17-23L25 19M6 17l9 7M34 17l-9 7M20 7v19m-6-12h12"/>',
  bolts: '<path d="m10 3 4 9-5 10 10-7-3-9Zm11 7 4 9-5 10 10-7-3-9Zm9 7 4 9-5 10 10-7-3-9Z"/>',
};
const roleIcons={tank:'♜',rogue:'⚔',mage:'✦',ranger:'⌁',priest:'✧'};
$('#party-frames').innerHTML=game.party.map(p=>`<button class="party-frame ${p.id===selected?'selected':''}" data-target="${p.id}" style="--class-color:${p.color}" aria-label="${p.name}, ${p.role}"><div class="health-fill"></div><div class="incoming-fill"></div><div class="frame-top"><strong><i>${roleIcons[p.id]}</i>${p.name}</strong><span class="debuff" hidden></span><span class="hp-percent">100%</span></div><div class="frame-bottom"><span>${p.role} <span style="opacity:.6">· ${p.label}</span></span><span class="hp-values">${p.maxHp} / ${p.maxHp}</span></div></button>`).join('');
$('#spellbook').innerHTML=SPELLS.map(s=>`<button class="spell" data-spell="${s.id}" aria-label="${s.name}, key ${s.key}. ${s.description}"><div class="spell-icon" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none" stroke="${s.color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${icons[s.icon]}</svg></div><kbd aria-hidden="true">${compactKeybind(s.key)}</kbd><div class="cooldown-mask" aria-hidden="true" hidden></div></button>`).join('');
$('.help-spells').innerHTML=SPELLS.map(s=>`<div><strong>${s.key} · ${s.name}</strong>${s.description}<small>${s.cast}s ${s.channel?'channel':'cast'} · ${s.heal} healing${s.party?' per ally':''} · ${s.cost*CONFIG.baseMana} mana</small></div>`).join('');
const frames = [...document.querySelectorAll('.party-frame')];
const spellButtons = [...document.querySelectorAll('.spell')];
// Keep timeline elements stable so hover/focus tooltips survive UI updates.
const timelineItems = new Map(game.mechanics.map(m => {
  const item = document.createElement('div');
  item.className = 'mechanic-item';
  item.tabIndex = 0;
  item.dataset.tooltip = `${m.name}\n${m.hint}`;
  item.innerHTML = `<div class="mechanic-row"><span class="mechanic-symbol" style="color:${m.color}">${m.id==='crush'?'♜':m.id==='pulse'?'✺':'◇'}</span><span>${m.name}</span><strong></strong></div><div class="mechanic-track"><div style="background:${m.color}"></div></div><div class="mechanic-type">${m.target==='tank'?'Heavy tank damage':m.target==='party'?'Party-wide damage':'Damage over time'}</div>`;
  $('#timeline').append(item);
  return [m.id, item];
}));
for(const frame of frames){
  frame.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')hovered=frame.dataset.target;});
  frame.addEventListener('pointerleave',()=>{hovered=null;});
  frame.addEventListener('click',()=>{selected=frame.dataset.target;});
}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2200);}
function cast(id){const result=game.begin(id,hovered||selected);if(!result.ok)toast(result.reason);}
for(const button of spellButtons)button.addEventListener('click',()=>cast(button.dataset.spell));
function restart(){game.reset();scene.reset();selected='tank';hovered=null;accumulator=0;lastStatus='';lastLog='';$('#toast').classList.remove('show');renderUI();}
function begin(){if(game.status==='paused')game.pause();else{if(game.status!=='ready')restart();game.start();}renderUI();}
$('#begin').addEventListener('click',begin);
$('#restart').addEventListener('click',restart);
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
  const spell=SPELLS.find(s=>s.key===e.key);
  if(spell&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(!e.repeat)cast(spell.id);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.status==='running'){game.pause();renderUI();}last=performance.now();accumulator=0;});
window.addEventListener('blur',()=>{hovered=null;if(game.status==='running'){game.pause();renderUI();}});
function renderUI(){
  if (game.status === 'victory') adventures.recordVictory();
  shell.refresh();
  for(const frame of frames){
    const p=game.party.find(p=>p.id===frame.dataset.target),percentage=p.hp/p.maxHp*100;
    frame.querySelector('.health-fill').style.width=`${percentage}%`;
    frame.querySelector('.hp-percent').textContent=p.hp>0?`${Math.ceil(percentage)}%`:'DEAD';
    frame.querySelector('.hp-values').textContent=`${number(p.hp)} / ${p.maxHp}`;
    frame.classList.toggle('selected',selected===p.id);frame.classList.toggle('critical',percentage>0&&percentage<30);frame.classList.toggle('dead',p.hp<=0);
    frame.setAttribute('aria-pressed',String(selected===p.id));frame.setAttribute('aria-label',`${p.name}, ${p.role}, ${number(p.hp)} of ${p.maxHp} health${p.dots.length?', Withering Mark':''}`);
    const debuff=frame.querySelector('.debuff');debuff.hidden=!p.dots.length;debuff.textContent=p.dots.length?`☠ ${Math.ceil(Math.max(...p.dots.map(d=>d.next+(d.ticks-1)*d.interval))-game.time)}s`:'';
    const incoming=frame.querySelector('.incoming-fill');let amount=0;
    if(game.cast&&p.hp>0&&(game.cast.spell.party||game.cast.target===p.id))amount=game.cast.spell.channel?game.cast.spell.ticks.slice(game.cast.landed).reduce((n,t)=>n+t.heal,0):game.cast.spell.heal;
    incoming.style.left=`${percentage}%`;incoming.style.width=`${Math.min(p.maxHp-p.hp,amount)/p.maxHp*100}%`;
  }
  const target=game.party.find(p=>p.id===(hovered||selected));$('#target-label').textContent=`${hovered?'Mouseover':'Selected'}: ${target.name}`;
  $('#mana-number').textContent=`${number(game.mana)} / ${number(CONFIG.mana)}`;$('#mana-fill').style.width=`${game.mana/CONFIG.mana*100}%`;
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
    const spell=SPELLS.find(s=>s.id===button.dataset.spell),cooldown=Math.max(0,(game.cooldowns[spell.id]||0)-game.time);
    const mask=button.querySelector('.cooldown-mask');mask.hidden=cooldown<=0;mask.textContent=formatCooldown(cooldown);
    button.classList.toggle('on-cooldown', cooldown > 0);
    button.setAttribute('aria-disabled', String(game.status!=='running'||cooldown>0||game.mana<spell.cost*CONFIG.baseMana));
    const duration = spell.cast * (spell.consumes && game.buffs[spell.consumes.buff] > 0 ? spell.consumes.castMultiplier : 1);
    button.dataset.tooltip = `${spell.name} · ${spell.key}\n${duration.toFixed(1)}s ${spell.channel?'channel':'cast'} · ${spell.cost*CONFIG.baseMana} mana\n${spell.heal} healing${spell.party?' to every living ally':''}${spell.cooldown?` · ${spell.cooldown}s cooldown`:''}\n${spell.description}${cooldown>0?`\nReady in ${cooldown.toFixed(1)}s`:''}`;
    button.classList.toggle('active',cast?.spell.id===spell.id);
  }
  for (const [index, mechanic] of [...game.mechanics].sort((a,b)=>a.next-b.next).entries()) {
    const item = timelineItems.get(mechanic.id);
    item.style.order = index;
    item.querySelector('strong').textContent = `${Math.ceil(mechanic.next-game.time)}s`;
    item.querySelector('.mechanic-track > div').style.width = `${Math.max(0,Math.min(100,(1-(mechanic.next-game.time)/mechanic.every)*100))}%`;
  }
  view.refreshTooltip();
  const warning=game.mechanics.filter(m=>m.warned).sort((a,b)=>a.next-b.next)[0];$('#mechanic-alert').hidden=!warning||game.status!=='running';
  if(warning){$('#mechanic-alert').textContent=`${warning.name.toUpperCase()} · ${(warning.next-game.time).toFixed(1)}s`;$('#tactical-tip').textContent=warning.hint;}else{$('#tactical-tip').textContent='Build Post-Haste with Flash Heal before the Warden’s party-wide nova.';}
  const logKey=game.history.map(l=>l.time+l.text).join('|');
  if(logKey!==lastLog){$('#combat-log').innerHTML=game.history.slice(0,6).map(l=>`<div class="log-entry ${l.kind}"><time>${clock(l.time)}</time><span>${l.text}</span></div>`).join('')||'<p class="empty-log">The sanctum is still.<br>For now.</p>';lastLog=logKey;}
  if(game.status!==lastStatus){
    document.body.classList.toggle('encounter-overlay', game.status !== 'running');
    lastStatus=game.status;$('#scene-overlay').hidden=game.status==='running';
    $('#status-label').textContent=({ready:'AWAITING PULL',running:'ENCOUNTER ACTIVE',paused:'ENCOUNTER PAUSED',victory:'WARDEN DEFEATED',defeat:'PARTY DEFEATED'})[game.status];
    $('#pause').disabled=!['running','paused'].includes(game.status);$('#pause').textContent=game.status==='paused'?'▷ Resume':'Ⅱ Pause';
    const data={
      ready:['YOUR VIGIL BEGINS','Be their saving grace.','The party will fight. You will keep them alive.<br>Hover a party frame and press <b>1–4</b> to heal.','Begin encounter'],
      paused:['TAKE A BREATH','The light can wait.','Your encounter is paused.<br>Resume when you are ready.','Resume encounter'],
      victory:['ENCOUNTER COMPLETE','Their light endures.','The Hollow Warden has fallen.<br>Your vigil made the difference.','Play again'],
      defeat:['THE VIGIL ENDS','Even light can falter.',game.time>=CONFIG.enrage?'The Warden enraged after 150 seconds.':game.party[4].hp<=0?'Your light faded. Remember to heal yourself.':game.party[0].hp<=0?'Aldric fell, and the front line collapsed.':'Too few allies remain to hold the sanctum.','Try again'],
    }[game.status];
    if(data){$('#overlay-eyebrow').textContent=data[0];$('#overlay-title').textContent=data[1];$('#overlay-text').innerHTML=data[2];$('#begin').innerHTML=`${data[3]} <span>→</span>`;}
    const ended=['victory','defeat'].includes(game.status);
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
const shell = setupShell({ game, view, resetEncounter: restart });
const adventures = setupAdventures({ startEncounter: () => { shell.enterEncounter(); renderUI(); } });
renderUI();requestAnimationFrame(frame);
