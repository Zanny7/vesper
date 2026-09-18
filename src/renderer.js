import { PARTY } from './data.js';
const TAU = Math.PI * 2;
const positions = Object.fromEntries(PARTY.map(p => [p.id, { x: p.x, y: p.y - 40 }]));
positions.boss = { x: 495, y: 225 };

// Original procedural artwork. All art lives behind this renderer, outside combat rules.
export class Battlefield {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.effects = []; this.hits = {}; this.attacks = {}; this.clock = 0;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(canvas);
    this.background = document.createElement('canvas'); this.background.width = 960; this.background.height = 590;
    this.paintEnvironment(this.background.getContext('2d'));
    this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = rect.width * dpr; this.canvas.height = rect.height * dpr;
    this.width = rect.width; this.height = rect.height; this.dpr = dpr;
  }
  reset() { this.effects = []; this.hits = {}; this.attacks = {}; }
  point(id) { return positions[id] || positions.priest; }
  receive(events) {
    for (const e of events) {
      if (e.type === 'cancel' || e.type === 'end') this.effects = this.effects.filter(effect => effect.type !== 'bolt');
      const base = { born: this.clock, duration: 0.8, ...e };
      if (e.type === 'heal') { this.effects.push({ ...base, duration: 1.3 }); this.hits[e.target] = { time: this.clock, heal: true }; }
      if (e.type === 'damage') { this.hits[e.target] = { time: this.clock, heal: false }; this.effects.push({ ...base, duration: 1.1 }); }
      if (e.type === 'bolt') this.effects.push({ ...base, duration: e.travel });
      if (e.type === 'attack') { this.attacks[e.source] = this.clock; this.effects.push({ ...base, duration: 0.45 }); }
      if (e.type === 'bossAttack') this.attacks.boss = this.clock;
      if (e.type === 'mechanic') { this.effects.push({ ...base, duration: 1.2 }); this.attacks.boss = this.clock; }
    }
    this.effects = this.effects.slice(-120);
  }
  poly(c, points, fill, stroke, width = 1) {
    c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  }
  ellipse(c,x,y,rx,ry,fill,stroke,width=1) { c.beginPath(); c.ellipse(x,y,rx,ry,0,0,TAU); if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();} }
  line(c,points,color,width=1) { c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke(); }
  glow(c,x,y,r,color) { const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2); }
  paintEnvironment(c) {
    const g=c.createLinearGradient(0,0,0,590);g.addColorStop(0,'#08151b');g.addColorStop(.5,'#203438');g.addColorStop(1,'#101e23');c.fillStyle=g;c.fillRect(0,0,960,590);
    // Receding pointed vaults, weathered pilasters, and the sealed sanctuary.
    for (let i=0;i<7;i++) {
      const x=40+i*145;
      this.poly(c,[[x,285],[x,78],[x+62,-10],[x+124,78],[x+124,285]],'#101e25','#304348');
      this.poly(c,[[x+14,276],[x+14,83],[x+62,12],[x+110,83],[x+110,276]],'#11232b','#1d363d');
      this.line(c,[[x+62,28],[x+62,253]],'#294349');
      for(let j=0;j<4;j++)this.line(c,[[x+17,110+j*39],[x+106,110+j*39]],'#20353c');
      this.poly(c,[[x-16,0],[x+5,0],[x+6,294],[x-22,294]],'#1d2c32','#344047');
      this.poly(c,[[x-22,294],[x+7,294],[x+15,310],[x-32,310]],'#2b3b3f','#3d4c4d');
    }
    this.poly(c,[[388,263],[388,112],[480,22],[572,112],[572,263]],'#111d25','#496368',3);
    this.poly(c,[[408,258],[408,119],[480,45],[552,119],[552,258]],'#162d33','#304c53',2);
    this.glow(c,480,154,145,'#537b7538');
    this.ellipse(c,480,156,53,66,null,'#80979055',2);
    this.ellipse(c,480,156,43,55,null,'#70897944');
    this.poly(c,[[480,102],[510,156],[480,210],[450,156]],null,'#92a89355');
    this.line(c,[[426,156],[534,156]],'#92a89355');
    for(let i=0;i<3;i++)this.poly(c,[[348-i*30,260+i*14],[606+i*30,260+i*14],[656+i*35,278+i*14],[300-i*35,278+i*14]],i%2?'#253b3e':'#2b4143','#4a5b5655');
    // Stone floor in perspective, with a broad ritual circle.
    this.poly(c,[[0,304],[960,304],[960,590],[0,590]],'#1a2c31');
    for(let i=-7;i<=7;i++)this.line(c,[[480+i*45,302],[480+i*130,590]],'#4253543b');
    for(const y of [322,347,381,427,490,574])this.line(c,[[0,y],[960,y]],'#4d5b582b');
    this.ellipse(c,493,389,292,109,'#23393a55','#65786b55',2);
    this.ellipse(c,493,389,275,100,null,'#65786b33');
    this.ellipse(c,493,389,203,75,null,'#7185713b');
    this.ellipse(c,493,389,190,70,null,'#71857122');
    for(let i=0;i<28;i++){
      const a=i/28*TAU,x=493+283*Math.cos(a),y=389+105*Math.sin(a);
      this.line(c,[[x-3,y-3],[x+2,y+2],[x+4,y-3]],'#8d9d7866');
    }
    for(let i=0;i<8;i++){
      const a=i/8*TAU;
      this.line(c,[[493+203*Math.cos(a),389+75*Math.sin(a)],[493+267*Math.cos(a+.13),389+98*Math.sin(a+.13)]],'#86957728');
    }
    // Cracks and rubble are deterministic, never gameplay randomness.
    for(let i=0;i<35;i++){
      const x=(Math.sin(i*86.3)*.5+.5)*960,y=330+(Math.cos(i*19.7)*.5+.5)*250;
      this.line(c,[[x,y],[x+9,y+3],[x+5,y+8],[x+18,y+11]],'#0d1d2466');
    }
    for(const x of [110,830]){
      this.poly(c,[[x-24,358],[x+24,358],[x+18,367],[x-18,367]],'#3a4a49','#5a665b');
      this.poly(c,[[x-9,305],[x+9,305],[x+13,357],[x-13,357]],'#344548','#69716177');
      this.poly(c,[[x-25,288],[x+25,288],[x+15,307],[x-15,307]],'#333e3e','#95856699');
      this.glow(c,x,289,75,'#e1a95226');
    }
    // Foreground silhouettes frame the play space.
    for(const x of [-10,940]){
      this.poly(c,[[x,135],[x+30,135],[x+40,566],[x-10,566]],'#101e25','#2b3e45');
      this.poly(c,[[x-18,543],[x+47,543],[x+60,590],[x-30,590]],'#14232a','#344348');
    }
    const vignette=c.createRadialGradient(480,310,140,480,310,540);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#050f18b0');c.fillStyle=vignette;c.fillRect(0,0,960,590);
  }
  drawBoss(c,state,t) {
    const dead=state.boss.hp<=0,attack=Math.max(0,1-(this.clock-(this.attacks.boss ?? -10))/.65);
    c.save();c.translate(495,281);this.ellipse(c,0,12,77,20,'#06121899');
    if(dead){c.rotate(-1.2);c.globalAlpha=.45;}else{c.translate(Math.sin(t*.8)*3,Math.sin(t*1.5)*4);c.rotate(Math.sin(attack*Math.PI)*.06);}
    this.glow(c,0,-57,95,'#6d9f8d25');
    // Tattered cloak, layered armor and a crown of horns.
    this.poly(c,[[-42,-110],[-70,-59],[-78,22],[-50,13],[-32,35],[-8,13],[18,31],[41,15],[67,24],[59,-64],[34,-113]],'#15252d','#41564f',2);
    for(let i=-2;i<=2;i++)this.poly(c,[[i*16,-79],[i*22-8,16],[i*22+8,9]],'#233b3c','#41554b55');
    this.poly(c,[[-36,-102],[-46,-61],[-24,-28],[23,-28],[43,-61],[31,-102]],'#3b5151','#8b9380',2);
    this.poly(c,[[-29,-91],[0,-108],[29,-91],[23,-57],[0,-34],[-24,-56]],'#213a40','#657d70');
    this.poly(c,[[0,-94],[12,-70],[0,-51],[-12,-70]],'#a4c3a6','#d6dcaf');
    this.glow(c,0,-73,25,'#abdd9d66');
    for(const side of [-1,1]){
      c.save();c.scale(side,1);
      this.poly(c,[[29,-111],[60,-121],[80,-92],[60,-77],[36,-88]],'#435858','#92977f',2);
      this.poly(c,[[43,-112],[52,-139],[61,-114],[77,-133],[72,-106]],'#627169','#9b9d84');
      c.save();c.translate(53,-79);c.rotate(-attack*.65);
      this.poly(c,[[-8,-8],[10,-4],[17,32],[3,45],[-12,20]],'#2c4549','#7e8d7c',2);
      this.poly(c,[[1,25],[19,24],[19,45],[3,49],[-3,40]],'#647366','#969d7f');
      if(side===-1){this.line(c,[[12,33],[23,99]],'#a28f6e',7);this.poly(c,[[17,77],[-13,76],[-32,52],[-32,90],[-9,110],[28,99],[47,111],[48,76],[33,60]],'#536966','#a1a48a',2);this.glow(c,12,88,35,'#85bbaa44');}
      c.restore();c.restore();
    }
    this.poly(c,[[-23,-112],[-25,-145],[-14,-161],[13,-161],[26,-143],[19,-113],[0,-105]],'#617971','#bdbaa0',2);
    this.poly(c,[[-18,-140],[0,-149],[18,-140],[11,-119],[0,-113],[-12,-121]],'#10232b','#708d80');
    this.line(c,[[-14,-133],[-5,-131]],'#cef1c4',3);this.line(c,[[5,-131],[14,-133]],'#cef1c4',3);
    this.glow(c,0,-133,24,'#b1e5ba44');
    this.poly(c,[[-18,-152],[-37,-170],[-35,-194],[-24,-178],[-5,-161]],'#5c756e','#a7ae92');
    this.poly(c,[[18,-152],[37,-170],[35,-194],[24,-178],[5,-161]],'#5c756e','#a7ae92');
    this.poly(c,[[-8,-158],[0,-179],[8,-158]],'#a1ac91','#d1c6a0');c.restore();
  }
  drawCharacter(c,p,state,t,selected,hovered) {
    const alive=p.hp>0,hit=this.hits[p.id],age=hit?this.clock-hit.time:99,attackAge=this.clock-(this.attacks[p.id]??-10);
    const attacking=attackAge<.45&&state.status==='running';
    c.save();c.translate(p.x,p.y);
    this.ellipse(c,0,3,23,8,'#07131999');
    if(p.id===selected||p.id===hovered)this.ellipse(c,0,4,28,10,null,p.id===hovered?'#f0e2b0':'#b9a67499',1.5);
    if(alive&&hit&&age<.6){this.ellipse(c,0,2,28+age*15,10+age*5,null,hit.heal?`rgba(215,226,153,${1-age/.6})`:`rgba(206,103,98,${1-age/.6})`,2);}
    if(!alive){c.rotate(-Math.PI/2);c.translate(20,0);c.globalAlpha=.42;}
    else {c.translate(age<.2&&!hit.heal?Math.sin(age*50)*4:0,Math.sin(t*2+PARTY.indexOf(p))*1.4);if(attacking)c.rotate(Math.sin(attackAge/.45*Math.PI)*-.14);}
    const colors={tank:['#394e5a','#81939b'],rogue:['#332d46','#978caa'],mage:['#2b3e60','#849fce'],ranger:['#34473f','#97a481'],priest:['#b6ad8e','#f2dfad']};const [dark,light]=colors[p.id];
    const caster=p.id==='mage'||p.id==='priest';
    // Articulated silhouette: boots, cloak, torso, pauldrons, hood, hands, weapon.
    this.poly(c,[[-10,-26],[-12,0],[-3,0],[0,-23],[3,0],[13,0],[10,-29]],'#16282d','#586661');
    this.poly(c,[[-12,-52],[-19,-9],[0,-2],[19,-9],[12,-52]],dark,light);
    this.poly(c,[[-9,-45],[-5,-13],[0,-8],[6,-14],[9,-46]],caster?light:'#546568',dark);
    this.poly(c,[[-14,-51],[0,-57],[14,-51],[10,-30],[-10,-30]],dark,light);
    this.line(c,[[-11,-28],[11,-28]],'#c2ad7c',3);
    this.poly(c,[[-14,-54],[-24,-47],[-17,-37],[-10,-45]],dark,light);
    this.poly(c,[[14,-54],[23,-47],[17,-37],[10,-45]],dark,light);
    c.save();c.translate(17,-42);
    const casting=p.id==='priest'&&state.cast;
    c.rotate(casting?-.65:attacking?-1.2*Math.sin(attackAge/.45*Math.PI):Math.sin(t*1.5)*.05);
    this.line(c,[[0,0],[5,15],[11,17]],light,6);
    if(caster){
      this.line(c,[[11,-35],[11,38]],'#b4a381',3);
      this.ellipse(c,11,-35,7,9,null,light,2);this.glow(c,11,-35,casting?32:15,p.id==='priest'?'#ffe7a66a':'#a7bfff6a');
      this.poly(c,[[11,-42],[15,-35],[11,-28],[7,-35]],p.id==='priest'?'#fff0bf':'#a1c3ff');
      if(casting){this.glow(c,-23,4,24,'#ffe9a455');this.ellipse(c,-23,4,7,7,'#fff3c2');}
    }else if(p.id==='ranger'){
      c.beginPath();c.ellipse(14,1,13,30,0,-Math.PI/2,Math.PI/2);c.strokeStyle='#b5b78f';c.lineWidth=3;c.stroke();this.line(c,[[14,-29],[10,1],[14,31]],'#bfc1a3');
    }else{this.poly(c,[[8,12],[10,-28],[14,-37],[17,-27],[14,12]],'#bdc8c0','#ecdfb5');this.line(c,[[3,12],[20,12]],'#c8b78b',3);}
    c.restore();
    if(p.id==='tank'){this.poly(c,[[-21,-40],[-5,-35],[-8,-14],[-21,-7],[-32,-18],[-34,-35]],'#426275','#bbc2ad',2);this.poly(c,[[-21,-32],[-14,-26],[-21,-16],[-28,-26]],'#96b4bb','#dfd7b3');}
    this.ellipse(c,0,-62,10,12,'#b9a58c',light);
    if(p.id==='tank'){this.poly(c,[[-12,-61],[-10,-73],[0,-78],[11,-72],[12,-59],[5,-54],[5,-67],[-5,-67],[-5,-54]],'#617880','#a8b9b9');this.line(c,[[-7,-63],[7,-63]],'#172c32',3);}
    else{this.poly(c,[[-12,-55],[-13,-68],[-5,-77],[7,-76],[14,-63],[11,-53],[6,-66],[0,-70],[-6,-66],[-6,-55]],dark,light);this.line(c,[[-5,-60],[4,-59]],'#263b3c',2);}
    if(p.id==='priest'){this.ellipse(c,0,-83,14,4,null,'#ddca9388');}
    c.restore();
    c.save();c.font='10px "DM Sans",sans-serif';c.textAlign='center';c.fillStyle=alive?'#c6d4cd':'#768583';c.shadowColor='#000';c.shadowBlur=4;c.fillText(p.name==='You'?'YOU':p.name.toUpperCase(),p.x,p.y+23);c.restore();
  }
  drawEffect(c,e) {
    const age=this.clock-e.born,progress=age/e.duration,p=this.point(e.target),from=this.point('priest');
    c.save();
    if(e.type==='bolt'){
      const x=from.x+(p.x-from.x)*progress,y=from.y+(p.y-from.y)*progress-Math.sin(progress*Math.PI)*35;
      const tail=Math.max(0,progress-.25),tx=from.x+(p.x-from.x)*tail,ty=from.y+(p.y-from.y)*tail-Math.sin(tail*Math.PI)*35;
      c.globalCompositeOperation='lighter';c.shadowColor='#ffcb69';c.shadowBlur=18;this.line(c,[[tx,ty],[x,y]],'#eec47277',10);this.line(c,[[tx,ty],[x,y]],'#fff1b7',3);this.glow(c,x,y,24,'#ffd786cc');this.ellipse(c,x,y,5,5,'#fffbea');
      for(let i=0;i<5;i++)this.ellipse(c,x-Math.sin(age*21+i)*12,y+Math.cos(age*19+i)*10,1.3,1.3,'#ffe8a7');
    }
    if(e.type==='heal'){
      c.globalAlpha=Math.max(0,1-progress);c.globalCompositeOperation='lighter';
      const color=e.spell==='prayer'?'#a4f4c0':'#ffe9aa';
      this.glow(c,p.x,p.y+10,45,color+'33');this.ellipse(c,p.x,p.y+32,24+progress*25,9+progress*8,null,color,2);
      for(let i=0;i<8;i++){const a=i/8*TAU;this.ellipse(c,p.x+Math.cos(a)*(15+progress*18),p.y+25-Math.sin(a)*20-progress*60,1.5,3,color);}
      if(e.spell==='greater'){this.line(c,[[p.x,p.y-90],[p.x,p.y+32]],'#ffeabb33',22);this.line(c,[[p.x,p.y-70],[p.x,p.y+32]],'#fff5d966',3);}
      c.globalCompositeOperation='source-over';c.fillStyle=color;c.font='600 18px Georgia';c.textAlign='center';c.shadowBlur=6;c.shadowColor='#111';c.fillText(e.amount?`+${Math.round(e.amount)}`:'Full',p.x,p.y-36-progress*25);
    }
    if(e.type==='damage'){
      c.globalAlpha=1-progress;c.font='12px "DM Sans",sans-serif';c.textAlign='center';c.fillStyle='#edaaa0';c.shadowColor='#000';c.shadowBlur=5;c.fillText(`−${e.amount}`,p.x+22,p.y-15-progress*30);
    }
    if(e.type==='attack'){
      const a=this.point(e.source),b=this.point('boss');
      if(e.source==='mage'||e.source==='ranger'){
        const x=a.x+(b.x-a.x)*progress,y=a.y+(b.y-a.y)*progress;
        const color=e.source==='mage'?'#9abfff':'#bfc8a2';this.line(c,[[x-(b.x-a.x)*.07,y-(b.y-a.y)*.07],[x,y]],color,e.source==='mage'?3:1.5);if(e.source==='mage')this.glow(c,x,y,12,'#80aaff66');
      }else{c.globalAlpha=1-progress;c.beginPath();c.ellipse(a.x,a.y-10,35,20,-.6,Math.PI,Math.PI+progress*3);c.strokeStyle='#d9e8ce99';c.lineWidth=3;c.stroke();}
    }
    if(e.type==='mechanic'){
      c.globalAlpha=(1-progress)*.7;
      if(e.mechanic==='pulse'){this.ellipse(c,495,290,progress*580,progress*210,null,'#c398d8',5);this.ellipse(c,495,290,progress*560,progress*202,null,'#d0ade577',12);this.glow(c,495,290,progress*300+40,'#b395cb33');}
      if(e.mechanic==='crush'){this.line(c,[[475,210],[485,335]],'#dcb58c',5);this.ellipse(c,485,348,progress*70,progress*24,null,'#d6af86',3);}
    }
    c.restore();
  }
  render(state,dt,selected,hovered) {
    // Visual time freezes with combat, so impacts and channels stay synchronized on pause.
    if(state.status==='running'||state.status==='ready')this.clock+=dt;
    const c=this.ctx,t=this.reducedMotion?0:this.clock;
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);
    // Show all six actors even when the canvas is narrow.
    const scale=Math.min(this.width/800,this.height/570),x=(this.width-960*scale)/2,y=(this.height-590*scale)/2;
    c.translate(x,y);c.scale(scale,scale);c.drawImage(this.background,0,0);
    for(const bx of [110,830]){
      this.glow(c,bx,281,35+Math.sin(t*3)*3,'#f6bf5c55');
      this.poly(c,[[bx-7,290],[bx-10,279],[bx-3,264+Math.sin(t*8)*4],[bx,273],[bx+4,260+Math.cos(t*7)*3],[bx+10,281],[bx+6,290]],'#e4b774');
      this.ellipse(c,bx,284,4,9,'#fbe0a3');
    }
    for(let i=0;i<28;i++){
      const ax=100+(i*83.17)%780,ay=100+((i*49+t*(4+i%3))%390);c.globalAlpha=.15+.25*Math.sin(i+t);this.ellipse(c,ax+Math.sin(t*.6+i)*8,ay,i%3===0?1.5:.8,i%3===0?1.5:.8,'#b9cba8');
    }c.globalAlpha=1;
    const warning=state.mechanics.find(m=>m.warned);
    if(warning&&state.status==='running'){
      c.globalAlpha=.2+Math.sin(t*5)*.08;this.ellipse(c,495,365,warning.id==='pulse'?280:80,warning.id==='pulse'?103:30,null,warning.color,3);c.globalAlpha=1;
    }
    this.drawBoss(c,state,t);
    for(const p of [...state.party].sort((a,b)=>a.y-b.y))this.drawCharacter(c,p,state,t,selected,hovered);
    if(state.cast){const p=this.point(state.cast.target);c.save();c.globalAlpha=.18;this.line(c,[[485,444],[p.x,p.y]],'#f8dc91',1);c.restore();}
    this.effects=this.effects.filter(e=>this.clock-e.born<e.duration);
    for(const e of this.effects)this.drawEffect(c,e);
  }
}
