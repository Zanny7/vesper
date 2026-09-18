import { CONFIG, PARTY, SPELLS, ENCOUNTER } from './data.js';

// Pure fixed-step simulation. Rendering and browser input only consume its state/events.
export class Combat {
  constructor() { this.reset(); }
  reset() {
    this.party = PARTY.map(p => ({ ...p, hp: p.maxHp, dots: [], nextAttack: 1 + PARTY.indexOf(p) * 0.2 }));
    this.boss = { hp: ENCOUNTER.maxHp, maxHp: ENCOUNTER.maxHp };
    this.time = 0; this.status = 'ready'; this.mana = CONFIG.mana; this.buffs = { postHaste: 0 };
    this.cooldowns = {}; this.cast = null; this.events = []; this.history = []; this.serial = 0;
    this.stats = { effective: 0, overheal: 0, casts: 0, deaths: 0 };
    this.nextStrike = ENCOUNTER.strike.first; this.nextShard = ENCOUNTER.shard.first; this.rotation = 0;
    this.mechanics = ENCOUNTER.mechanics.map(m => ({ ...m, next: m.first, warned: false }));
  }
  emit(type, data = {}) { const e = { type, time: this.time, id: this.serial++, ...data }; this.events.push(e); return e; }
  log(text, kind = 'neutral') { this.history.unshift({ text, kind, time: this.time }); this.history.length = Math.min(30, this.history.length); }
  start() { if (this.status === 'ready') { this.status = 'running'; this.log('The Warden awakens. Keep your party alive.'); } }
  pause() { if (this.status === 'running') this.status = 'paused'; else if (this.status === 'paused') this.status = 'running'; }
  cancel() { if (this.cast) { this.log(`${this.cast.spell.name} cancelled. Mana is not refunded.`, 'warning'); this.emit('cancel'); this.cast = null; } }
  begin(id, targetId) {
    const spell = SPELLS.find(s => s.id === id);
    const target = this.party.find(p => p.id === targetId);
    if (this.status !== 'running') return { ok: false, reason: 'Begin or resume the encounter first.' };
    if (this.cast) return { ok: false, reason: 'Already casting. Press Esc to cancel.' };
    if (!spell) return { ok: false, reason: 'Unknown spell.' };
    if (!spell.party && (!target || target.hp <= 0)) return { ok: false, reason: 'Select a living ally.' };
    if ((this.cooldowns[id] || 0) > this.time + 0.00001) return { ok: false, reason: 'Penance is on cooldown.' };
    const cost = spell.cost * CONFIG.baseMana;
    if (this.mana < cost) return { ok: false, reason: 'Not enough mana.' };
    let duration = spell.cast;
    if (spell.consumes && this.buffs[spell.consumes.buff] > 0) { this.buffs[spell.consumes.buff]--; duration *= spell.consumes.castMultiplier; }
    this.mana -= cost;
    if (spell.cooldown) this.cooldowns[id] = this.time + spell.cooldown;
    this.cast = { spell, target: targetId, duration, elapsed: 0, launched: 0, landed: 0 };
    this.emit('cast', { spell: id, target: targetId });
    this.stats.casts++;
    return { ok: true };
  }
  heal(target, amount, spell) {
    if (!target || target.hp <= 0) return;
    const effective = Math.min(target.maxHp - target.hp, amount);
    target.hp += effective; this.stats.effective += effective; this.stats.overheal += amount - effective;
    this.emit('heal', { target: target.id, amount: effective, raw: amount, spell });
  }
  damage(target, amount, source) {
    if (!target || target.hp <= 0) return;
    target.hp = Math.max(0, target.hp - amount);
    this.emit('damage', { target: target.id, amount, source });
    if (!target.hp) { target.dots = []; this.stats.deaths++; this.log(`${target.name} has fallen.`, 'danger'); this.emit('death', { target: target.id }); }
  }
  rotatingTarget() { const living = this.party.filter(p => p.hp > 0 && p.id !== 'tank'); return living[this.rotation++ % living.length]; }
  resolveMechanic(m) {
    this.log(`${m.name}${m.target === 'party' ? ' hits the party.' : '.'}`, 'danger');
    this.emit('mechanic', { mechanic: m.id });
    const targets = m.target === 'party' ? this.party : [m.target === 'tank' ? this.party[0] : this.rotatingTarget()];
    for (const target of targets) {
      if (!target || target.hp <= 0) continue;
      if (m.dot) { target.dots.push({ ...m.dot, name: m.name, next: this.time + m.dot.interval }); this.log(target.id === 'priest' ? 'You are marked.' : `${target.name} is marked.`, 'warning'); }
      else this.damage(target, m.damage, m.id);
    }
  }
  step(dt = CONFIG.step) {
    if (this.status !== 'running') return;
    this.time += dt; this.mana = Math.min(CONFIG.mana, this.mana + CONFIG.manaRegen * dt);
    const cast = this.cast;
    if (cast) {
      cast.elapsed += dt;
      if (cast.spell.channel) {
        const ticks = cast.spell.ticks;
        while (cast.launched < ticks.length && cast.elapsed + 1e-8 >= ticks[cast.launched].at - 0.3) {
          this.emit('bolt', { target: cast.target, spell: cast.spell.id, travel: 0.3, bolt: cast.launched }); cast.launched++;
        }
        while (cast.landed < ticks.length && cast.elapsed + 1e-8 >= ticks[cast.landed].at) {
          this.heal(this.party.find(p => p.id === cast.target), ticks[cast.landed].heal, cast.spell.id); cast.landed++;
        }
      }
      if (cast.elapsed + 1e-8 >= cast.duration) {
        if (!cast.spell.channel) {
          const targets = cast.spell.party ? this.party : [this.party.find(p => p.id === cast.target)];
          for (const target of targets) this.heal(target, cast.spell.heal, cast.spell.id);
          if (cast.spell.grants && targets.some(p => p?.hp > 0)) { const g = cast.spell.grants; this.buffs[g.buff] = Math.min(g.max, this.buffs[g.buff] + g.amount); }
        }
        this.log(`${cast.spell.name} → ${cast.spell.party ? 'Party' : this.party.find(p => p.id === cast.target)?.name}`, 'heal');
        this.emit('complete', { spell: cast.spell.id }); this.cast = null;
      }
    }
    for (const p of this.party) {
      if (p.hp <= 0) continue;
      if (p.damage && this.time >= p.nextAttack) {
        this.boss.hp = Math.max(0, this.boss.hp - p.damage * p.interval);
        p.nextAttack += p.interval; this.emit('attack', { source: p.id });
      }
      for (const dot of p.dots) {
        if (this.time >= dot.next) { this.damage(p, dot.damage, 'mark'); dot.ticks--; dot.next += dot.interval; }
      }
      p.dots = p.dots.filter(d => d.ticks > 0);
    }
    if (this.time >= this.nextStrike) { this.damage(this.party[0], ENCOUNTER.strike.damage, 'strike'); this.nextStrike += ENCOUNTER.strike.every; this.emit('bossAttack'); }
    if (this.time >= this.nextShard) { this.damage(this.rotatingTarget(), ENCOUNTER.shard.damage, 'shard'); this.nextShard += ENCOUNTER.shard.every; }
    for (const m of this.mechanics) {
      if (!m.warned && this.time >= m.next - m.warning) { this.emit('warning', { mechanic: m.id }); m.warned = true; }
      if (this.time >= m.next) { this.resolveMechanic(m); m.next += m.every; m.warned = false; }
    }
    if (this.party[0].hp <= 0 || this.party[4].hp <= 0 || this.party.filter(p => p.hp > 0).length < 3 || this.time >= CONFIG.enrage) {
      this.status = 'defeat'; this.cast = null; this.log(this.time >= CONFIG.enrage ? 'The sanctum is consumed. Enrage.' : 'The party has fallen.', 'danger'); this.emit('end');
    } else if (this.boss.hp <= 0) { this.status = 'victory'; this.cast = null; this.log('The Hollow Warden is defeated.', 'heal'); this.emit('end'); }
  }
  drainEvents() { const events = this.events; this.events = []; return events; }
}
