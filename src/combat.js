import { CONFIG, PARTY, SPELLS, ENCOUNTER } from './data.js';
import { adjustedResource, resourceKey, healingParts, mitigatedDamage, hasteMultiplier as hasteFactor, hastedTime, ticksForDuration, CRIT_MULTIPLIER } from './stats.js';

// Pure fixed-step simulation. Rendering and browser input only consume its state/events.
export class Combat {
  constructor(encounter = ENCOUNTER, random = Math.random, party = PARTY, spells = SPELLS) { this.random = random; this.partyTemplate = party; this.spells = spells; this.reset(encounter); }
  setLoadout(party, spells = this.spells) { this.partyTemplate = party; this.spells = spells; this.reset(); }
  reset(encounter = this.encounter, resources = null) {
    this.encounter = encounter;
    this.party = this.partyTemplate.map((p, i) => ({ ...p, hp: p.maxHp, dots: [], hots: [], debuffs: [], helpfulEffects: [], defenseModifiers: [], nextAttack: 1 + i * 0.2 }));
    this.boss = { hp: encounter.maxHp, maxHp: encounter.maxHp, dots: [] };
    this.adds = (encounter.adds || []).map((add, i) => ({ ...add, id: `add-${i}`, name: add.name || `Pale Archer ${i + 1}`, next: add.first }));
    this.time = 0; this.status = 'ready'; this.mana = this.maxMana; this.buffs = {};
    if (resources) {
      for (const p of this.party) {
        const saved = resources.health[resourceKey(p)];
        if (saved) p.hp = saved.current <= 0 ? 0 : adjustedResource(saved.current, saved.max, p.maxHp);
      }
      this.mana = adjustedResource(resources.mana.current, resources.mana.max, this.maxMana);
    }
    this.cooldowns = {};
    this.charges = Object.fromEntries(this.spells.filter(spell => spell.charges).map(spell => [spell.id, { current: spell.charges, max: spell.charges, recharge: null, duration: spell.cooldown }]));
    this.cast = null; this.events = []; this.history = []; this.serial = 0;
    this.stats = { effective: 0, overheal: 0, casts: 0, deaths: 0 };
    this.nextStrike = encounter.strike.first; this.nextShard = encounter.shard?.first ?? Infinity; this.rotation = 0;
    this.mechanics = encounter.mechanics.map(m => ({ ...m, next: m.first, warned: false }));
  }
  get healer() { return this.party.find(p => p.label === 'HEALER'); }
  get maxMana() { return this.healer?.maxMana ?? CONFIG.mana; }
  get spellPower() { return this.healer?.spellPower || 0; }
  resources() {
    return { health: Object.fromEntries(this.party.map(p => [resourceKey(p), { current: p.hp, max: p.maxHp }])), mana: { current: this.mana, max: this.maxMana } };
  }
  emit(type, data = {}) { const e = { type, time: this.time, id: this.serial++, ...data }; this.events.push(e); return e; }
  log(text, kind = 'neutral') { this.history.unshift({ text, kind, time: this.time }); this.history.length = Math.min(30, this.history.length); }
  start() { if (this.status === 'ready') { this.status = 'running'; this.log(`${this.encounter.name} awakens. Keep your party alive.`); } }
  pause() { if (this.status === 'running') this.status = 'paused'; else if (this.status === 'paused') this.status = 'running'; }
  cancel() {
    if (!this.cast) return;
    const { manaSpent: spent, postHaste } = this.cast;
    if (postHaste) this.buffs.postHaste = (this.buffs.postHaste || 0) + 1;
    this.log(`${this.cast.spell.name} cancelled. ${spent ? 'Mana is not refunded.' : 'No Mana spent.'}`, 'warning');
    this.emit('cancel'); this.cast = null;
  }
  availableCharges(id) { return this.charges[id]?.current; }
  haste(target = this.healer) {
    const fervor = target?.label === 'HEALER' ? this.buffs.divineFervor : target?.attackSpeedBuff;
    return (Number(target?.haste) || 0) + (fervor && fervor.target === target?.id && fervor.expires > this.time ? fervor.speed * 100 : 0);
  }
  hasteMultiplier(target = this.healer) { return hasteFactor(this.haste(target)); }
  critical(actor) {
    const chance = Math.max(0, Math.min(100, Number(actor?.crit) || 0));
    return chance >= 100 || (chance > 0 && this.random() * 100 < chance);
  }
  hotInterval(hot, target) {
    const livingHaste = hot.living && target.hp / target.maxHp < .5 ? hot.living.speed * 100 : 0;
    return hastedTime(hot.baseInterval, this.haste() + livingHaste);
  }
  manaCost(spell) {
    const postHaste = Boolean(spell.postHaste && this.buffs.postHaste > 0 && ['greater', 'prayer'].includes(spell.id));
    return spell.cost * CONFIG.baseMana * (postHaste ? .8 : 1);
  }
  resolveCast(spell) {
    const overgrowth = Boolean(spell.overgrowth && (this.cooldowns[spell.id] || 0) > this.time + 0.00001);
    const postHaste = Boolean(spell.postHaste && this.buffs.postHaste > 0 && ['greater', 'prayer'].includes(spell.id));
    return {
      cost: this.manaCost(spell), overgrowth, postHaste,
      hasteMultiplier: this.hasteMultiplier(),
      duration: hastedTime(overgrowth ? 1 : spell.cast, this.haste()) * (postHaste ? .8 : 1),
    };
  }
  enemyDotProfile(spell) {
    if (!spell.enemyDot) return null;
    const interval = hastedTime(spell.enemyDot.interval, this.haste());
    const ticks = Math.max(1, ticksForDuration(spell.enemyDot.duration, interval));
    const pending = this.boss.dots.find(dot => dot.source === spell.id)?.remaining || 0;
    const baseTick = spell.enemyDot.damage / Math.round(spell.enemyDot.duration / spell.enemyDot.interval);
    return {
      tick: baseTick + pending / ticks, baseTick, pending, ticks, interval, duration: spell.enemyDot.duration,
    };
  }
  hotProfile(spell, target, carryPending = false) {
    if (!spell.hot) return null;
    const interval = this.hotInterval({ ...spell.hot, baseInterval: spell.hot.interval }, target || this.healer);
    const ticks = Math.max(1, ticksForDuration(spell.hot.duration, interval));
    const pending = carryPending && target
      ? (target.hots || []).filter(hot => hot.source === spell.id).reduce((total, hot) => total + hot.heal * hot.ticks, 0)
      : 0;
    return {
      tick: healingParts(spell, this.spellPower).hotTick + pending / ticks,
      pending, ticks, interval, duration: spell.hot.duration,
    };
  }
  lingeringPrayerProfile(spell, direct) {
    if (!spell.lingeringPrayer) return null;
    const effect = spell.lingeringPrayer;
    const interval = hastedTime(effect.interval, this.haste());
    const ticks = Math.max(1, ticksForDuration(effect.duration, interval));
    return { tick: direct * effect.ratio / Math.round(effect.duration / effect.interval), ticks, interval, duration: effect.duration };
  }
  resolveSpell(spell, target = null) {
    const cast = this.resolveCast(spell);
    const healing = healingParts(spell, this.spellPower);
    const direct = spell.channel ? 0 : this.directHealing(spell, target);
    const bolts = spell.channel ? spell.ticks.map(tick => ({ heal: tick.heal * healing.factor, damage: tick.damage || 0 })) : [];
    const smartBolt = spell.smartHealingBolt ? spell.smartHealingBolt.heal * healing.factor : 0;
    return {
      ...cast, direct, bolts, smartBolt,
      hot: this.hotProfile(spell, target, cast.overgrowth),
      dot: this.enemyDotProfile(spell),
      lingering: this.lingeringPrayerProfile(spell, direct),
      damage: spell.damage || 0,
      hotBonus: spell.hotBonus ? { perHot: spell.hotBonus.amount, max: spell.hotBonus.max, current: target ? new Set(this.activeHots(target, spell.hotBonus.sources).map(hot => hot.source)).size : null } : null,
    };
  }
  begin(id, targetId) {
    const spell = this.spells.find(s => s.id === id);
    const enemyTarget = targetId === 'boss';
    const target = this.party.find(p => p.id === targetId);
    if (this.status !== 'running') return { ok: false, reason: 'Begin or resume the encounter first.' };
    if (this.cast) return { ok: false, reason: 'Already casting. Press Esc to cancel.' };
    if (!spell) return { ok: false, reason: 'Unknown spell.' };
    if (spell.enemy) targetId = 'boss';
    else if (spell.dualTarget && !enemyTarget && (!target || target.hp <= 0)) return { ok: false, reason: 'Select a living ally or the enemy.' };
    else if (!spell.party && !spell.dualTarget && (!target || target.hp <= 0)) return { ok: false, reason: 'Select a living ally.' };
    const charge = this.charges[id];
    const cooldownActive = (this.cooldowns[id] || 0) > this.time + 0.00001;
    const overgrowth = Boolean(spell.overgrowth && cooldownActive);
    if (charge ? charge.current <= 0 : cooldownActive && !overgrowth) return { ok: false, reason: `${spell.name} is on cooldown.` };
    if (spell.consumesHot && !this.activeHots(target, spell.consumesHot).length) return { ok: false, reason: `${spell.name} requires Rejuvenation, Regrowth, or Wild Growth on this ally.` };
    const resolved = this.resolveCast(spell);
    const { postHaste, cost, duration, hasteMultiplier: castHaste } = resolved;
    if (this.mana < cost) return { ok: false, reason: 'Not enough mana.' };
    const spendAtStart = duration === 0 || spell.channel;
    if (spendAtStart) this.mana -= cost;
    if (postHaste) {
      this.buffs.postHaste--;
      if (!this.buffs.postHaste) delete this.buffs.postHaste;
    }
    if (charge) {
      charge.current--;
      if (charge.recharge === null) charge.recharge = this.time + charge.duration;
      this.cooldowns[id] = charge.recharge;
    } else if (spell.cooldown && !overgrowth) this.cooldowns[id] = this.time + spell.cooldown;
    this.cast = {
      spell, target: targetId, duration, elapsed: 0, launched: 0, landed: 0,
      postHaste, hasteMultiplier: castHaste, overgrowth, manaCost: cost, manaSpent: spendAtStart,
    };
    this.emit('cast', { spell: id, target: targetId });
    this.stats.casts++;
    if (duration === 0) this.completeCast();
    return { ok: true };
  }
  activeHots(target, sources) {
    return (target?.hots || []).filter(hot => hot.expires > this.time + 1e-8 && (!sources || sources.includes(hot.source)));
  }
  directHealing(spell, target) {
    const bonus = spell.hotBonus;
    const hotTypes = bonus ? new Set(this.activeHots(target, bonus.sources).map(hot => hot.source)).size : 0;
    return healingParts(spell, this.spellPower).direct + (bonus ? Math.min(bonus.max, hotTypes) * bonus.amount : 0);
  }
  applyHot(target, spell, { carryPending = false } = {}) {
    const existing = target.hots.filter(hot => hot.source === spell.id);
    if (spell.passingBloom && existing.length) {
      const moving = existing.sort((a, b) => a.expires - b.expires)[0];
      const destination = this.party
        .filter(member => member.hp > 0 && member.id !== target.id && !this.activeHots(member, [spell.id]).length)
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (destination) destination.hots.push(moving);
    }
    const profile = this.hotProfile(spell, target, carryPending);
    const maxInstances = spell.hot.maxInstances || 1;
    if (existing.length >= maxInstances) {
      const replacing = existing.sort((a, b) => a.expires - b.expires)[0];
      target.hots = target.hots.filter(hot => hot !== replacing);
    }
    if (maxInstances === 1) target.hots = target.hots.filter(hot => hot.source !== spell.id);
    if (carryPending) target.hots = target.hots.filter(hot => hot.source !== spell.id);
    target.hots.push({
      ...spell.hot, heal: profile.tick, source: spell.id, name: spell.name,
      icon: spell.icon, color: spell.color, applied: this.time, expires: this.time + spell.hot.duration,
      next: this.time + profile.interval, interval: profile.interval, ticks: profile.ticks, baseInterval: spell.hot.interval,
    });
  }
  applyLingeringPrayer(target, spell, direct) {
    const hot = spell.lingeringPrayer;
    if (!hot) return;
    const profile = this.lingeringPrayerProfile(spell, direct);
    target.hots = target.hots.filter(effect => effect.source !== 'lingering-prayer');
    target.hots.push({
      ...hot, heal: profile.tick,
      source: 'lingering-prayer', name: 'Lingering Prayer', icon: spell.icon, color: spell.color,
      applied: this.time, expires: this.time + hot.duration, next: this.time + profile.interval,
      interval: profile.interval, baseInterval: hot.interval, ticks: profile.ticks,
    });
  }
  lowestHealthAlly(excludeId = null, injuredOnly = true) {
    return this.party
      .filter(member => member.hp > 0 && member.id !== excludeId && (!injuredOnly || member.hp < member.maxHp))
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  }
  atonement(amount, spell) {
    const injured = this.lowestHealthAlly();
    if (injured) this.heal(injured, amount * 0.4, 'atonement', { canCrit: false });
    this.emit('atonement', { target: injured?.id, amount: injured ? amount * 0.4 : 0, spell });
  }
  damageEnemy(amount, spell, triggersAtonement = true, actor = this.healer) {
    if (this.boss.hp <= 0) return 0;
    const critical = this.critical(actor);
    const criticalAmount = amount * (critical ? CRIT_MULTIPLIER : 1);
    const dealt = Math.min(this.boss.hp, criticalAmount);
    this.boss.hp = Math.max(0, this.boss.hp - dealt);
    this.emit('damage', { target: 'boss', amount: dealt, raw: amount, source: spell, damageType: 'Holy', critical });
    if (triggersAtonement) this.atonement(dealt, spell);
    return dealt;
  }
  applyEnemyDot(spell) {
    const profile = this.enemyDotProfile(spell);
    const interval = profile.interval;
    const ticks = profile.ticks;
    this.boss.dots = this.boss.dots.filter(dot => dot.source !== spell.id);
    this.boss.dots.push({
      source: spell.id, remaining: profile.tick * ticks,
      damage: profile.tick, ticks, interval, baseInterval: spell.enemyDot.interval,
      next: this.time + interval, expires: this.time + spell.enemyDot.duration,
    });
  }
  applyDivineFervor(target, effect) {
    const buff = { target: target.id, expires: this.time + effect.duration, speed: effect.speed };
    if (target.label === 'HEALER') this.buffs.divineFervor = buff;
    else {
      const oldMultiplier = this.hasteMultiplier(target);
      target.attackSpeedBuff = buff;
      const newMultiplier = this.hasteMultiplier(target);
      target.nextAttack = this.time + Math.max(0, target.nextAttack - this.time) * oldMultiplier / newMultiplier;
    }
    this.emit('buff', { source: 'divineFervor', target: target.id, duration: effect.duration });
  }
  applyDefenseModifier(targetOrId, effect) {
    const target = typeof targetOrId === 'string'
      ? this.party.find(member => member.id === targetOrId)
      : this.party.includes(targetOrId) ? targetOrId : null;
    const source = effect?.source || effect?.id;
    const stat = String(effect?.stat || '').toLowerCase();
    const modifier = Number(effect?.modifier);
    const duration = Number(effect?.duration);
    if (!target || !source || !['armor', 'resistance'].includes(stat) || !Number.isFinite(modifier) || modifier === 0 || !Number.isFinite(duration) || duration <= 0) return null;

    target.defenseModifiers = (target.defenseModifiers || []).filter(current => current.source !== source);
    for (const list of ['debuffs', 'helpfulEffects']) {
      target[list] = (target[list] || []).filter(current => !(current.defenseModifier && current.source === source));
    }
    const defenseEffect = {
      source, id: source, name: effect.name || source, stat, modifier,
      defenseModifier: true, expires: this.time + duration,
      icon: effect.icon || 'shield', color: effect.color || (modifier < 0 ? '#f2a1af' : '#c8e4bb'),
    };
    target.defenseModifiers.push(defenseEffect);
    const collection = modifier < 0 ? 'debuffs' : 'helpfulEffects';
    target[collection].push(defenseEffect);
    return defenseEffect;
  }
  applyGenesis(effect) {
    for (const target of this.party) for (const hot of target.hots) {
      if (!['rejuvenation', 'regrowth', 'wildGrowth'].includes(hot.source)) continue;
      hot.expires += effect.extension;
      hot.ticks += ticksForDuration(effect.extension, hot.interval || hot.baseInterval);
    }
    this.emit('buff', { source: 'genesis', targets: this.party.filter(member => member.hp > 0).map(member => member.id), duration: effect.extension });
  }
  completeCast() {
    const cast = this.cast, spell = cast.spell;
    if (!cast.manaSpent) {
      this.mana -= cast.manaCost;
      cast.manaSpent = true;
    }
    if (!spell.channel) {
      if (spell.enemy) {
        this.damageEnemy(spell.damage, spell.id, spell.atonement);
        if (spell.enemyDot) this.applyEnemyDot(spell);
        this.log(`${spell.name} → ${this.encounter.name}`, 'heal');
        this.emit('complete', { spell: spell.id }); this.cast = null; return;
      }
      if (spell.sanctuary) {
        this.buffs.sanctuary = { expires: this.time + spell.sanctuary.duration, reduction: spell.sanctuary.reduction };
        this.emit('buff', { source: spell.id, targets: this.party.filter(member => member.hp > 0).map(member => member.id), duration: spell.sanctuary.duration });
      }
      if (spell.divineFervor) this.applyDivineFervor(this.party.find(member => member.id === cast.target), spell.divineFervor);
      if (spell.ward) {
        const target = this.party.find(member => member.id === cast.target);
        target.ward = { ...spell.ward, expires: this.time + spell.ward.duration };
        this.emit('buff', { source: spell.id, target: target.id, duration: spell.ward.duration });
      }
      if (spell.genesis) this.applyGenesis(spell.genesis);
      const targets = spell.party ? this.party : [this.party.find(p => p.id === cast.target)];
      const lingering = [];
      let directOverheal = 0;
      for (const target of targets) {
        if (!target || target.hp <= 0) continue;
        if (spell.consumesHot && !spell.preserveHot) {
          const consumed = this.activeHots(target, spell.consumesHot).sort((a, b) => a.expires - b.expires)[0];
          if (!consumed) continue;
          target.hots = target.hots.filter(hot => hot !== consumed);
        }
        const amount = this.directHealing(spell, target);
        const result = amount > 0 ? this.heal(target, amount, spell.id) : { effective: 0, overheal: 0 };
        if (spell.bloom && amount > 0) for (const ally of this.party) {
          if (ally.hp > 0 && ally.id !== target.id) this.heal(ally, amount * spell.bloom.ratio, 'blooming-swiftmend');
        }
        if (spell.lightUnspent) directOverheal += result.overheal;
        if (spell.echoOfGrace) {
          const echoTarget = this.lowestHealthAlly(target.id);
          if (echoTarget) this.heal(echoTarget, amount * spell.echoOfGrace.ratio, 'echo-of-grace');
        }
        lingering.push({ target, amount });
        if (spell.hot) this.applyHot(target, spell, { carryPending: cast.overgrowth });
      }
      if (spell.lightUnspent && directOverheal > 0) {
        const injured = this.party.filter(member => member.hp > 0 && member.hp < member.maxHp);
        if (injured.length) {
          const amount = directOverheal * spell.lightUnspent.ratio / injured.length;
          for (const target of injured) this.heal(target, amount, 'light-unspent');
        }
      }
      for (const entry of lingering) this.applyLingeringPrayer(entry.target, spell, entry.amount);
    }
    if (spell.id === 'flash' && spell.postHaste) this.buffs.postHaste = Math.min(spell.postHaste.maxStacks, (this.buffs.postHaste || 0) + 1);
    this.log(`${spell.name} → ${cast.target === 'boss' ? this.encounter.name : spell.party ? 'Party' : this.party.find(p => p.id === cast.target)?.name}`, 'heal');
    this.emit('complete', { spell: spell.id }); this.cast = null;
  }
  heal(target, amount, spell, { canCrit = true, actor = this.healer } = {}) {
    if (!target || target.hp <= 0) return { effective: 0, overheal: amount };
    const critical = canCrit && this.critical(actor);
    if (critical) amount *= CRIT_MULTIPLIER;
    if (target.healingReceived?.expires > this.time) amount *= 1 + target.healingReceived.amount;
    const effective = Math.min(target.maxHp - target.hp, amount);
    const overheal = amount - effective;
    target.hp += effective; this.stats.effective += effective; this.stats.overheal += overheal;
    this.emit('heal', { target: target.id, amount: effective, raw: amount, spell, critical });
    return { effective, overheal };
  }
  damage(target, amount, source, damageType = 'Physical') {
    if (!target || target.hp <= 0) return;
    const raw = amount;
    amount = mitigatedDamage(amount, damageType, target, this.time);
    if (this.buffs.sanctuary?.expires > this.time) amount *= 1 - this.buffs.sanctuary.reduction;
    target.hp = Math.max(0, target.hp - amount);
    this.emit('damage', { target: target.id, amount, raw, source, damageType });
    if (amount > 0 && target.hp > 0 && target.ward?.expires > this.time) {
      target.healingReceived = { amount: target.ward.healingReceived, expires: this.time + target.ward.triggerDuration };
      delete target.ward;
      this.emit('buff', { source: 'cenarionWard', target: target.id, duration: target.healingReceived.expires - this.time });
    }
    if (!target.hp) { target.dots = []; target.hots = []; this.stats.deaths++; this.log(`${target.name} has fallen.`, 'danger'); this.emit('death', { target: target.id }); }
  }
  rotatingTarget() { const living = this.party.filter(p => p.hp > 0 && p.id !== 'tank'); return living[this.rotation++ % living.length]; }
  randomTargets(count = 1) {
    const pool = this.party.filter(p => p.hp > 0), targets = [];
    while (pool.length && targets.length < count) targets.push(pool.splice(Math.floor(this.random() * pool.length), 1)[0]);
    return targets;
  }
  mechanicTargets(m) {
    if (m.target === 'party') return this.party.filter(p => p.hp > 0);
    if (m.target === 'tank') return [this.party.find(p => p.id === 'tank')];
    if (m.target === 'random') return this.randomTargets(m.count);
    return [this.rotatingTarget()];
  }
  resolveMechanic(m) {
    const targets = m.targets ? m.targets.map(id => this.party.find(p => p.id === id)) : this.mechanicTargets(m);
    this.log(`${m.name}${m.target === 'party' ? ' hits the party.' : '.'}`, 'danger');
    this.emit('mechanic', { mechanic: m.id, targetType: m.target, targets: targets.filter(Boolean).map(p => p.id), color: m.color, dot: !!m.dot });
    for (const target of targets) {
      if (!target || target.hp <= 0) continue;
      if (m.damage) this.damage(target, m.damage, m.id, m.damageType);
      if (m.dot && target.hp > 0) {
        // Reapplications refresh their own effect; different wounds coexist.
        target.dots = target.dots.filter(dot => dot.source !== m.id);
        target.dots.push({ ...m.dot, source: m.id, name: m.name, next: this.time + m.dot.interval });
        this.log(`${target.name}: ${m.name} (${m.dot.ticks * m.dot.interval}s).`, 'warning');
      }
    }
  }
  step(dt = CONFIG.step) {
    if (this.status !== 'running') return;
    this.time += dt; this.mana = Math.min(this.maxMana, this.mana + (this.healer?.manaRegen ?? CONFIG.manaRegen) * dt);
    for (const [id, charge] of Object.entries(this.charges)) {
      while (charge.recharge !== null && this.time + 1e-8 >= charge.recharge) {
        charge.current++;
        charge.recharge = charge.current < charge.max ? charge.recharge + charge.duration : null;
      }
      if (charge.recharge === null) delete this.cooldowns[id]; else this.cooldowns[id] = charge.recharge;
    }
    if (this.buffs.sanctuary?.expires <= this.time) delete this.buffs.sanctuary;
    if (this.buffs.divineFervor?.expires <= this.time) delete this.buffs.divineFervor;
    for (const member of this.party) if (member.attackSpeedBuff?.expires <= this.time) {
      const oldMultiplier = hasteFactor((Number(member.haste) || 0) + member.attackSpeedBuff.speed * 100);
      const remaining = Math.max(0, member.nextAttack - this.time);
      delete member.attackSpeedBuff;
      member.nextAttack = this.time + remaining * oldMultiplier / this.hasteMultiplier(member);
    }
    for (const member of this.party) {
      const expiredDefenseEffects = (member.defenseModifiers || []).filter(effect => effect.expires <= this.time + 1e-8);
      if (expiredDefenseEffects.length) {
        const expired = new Set(expiredDefenseEffects);
        member.defenseModifiers = member.defenseModifiers.filter(effect => !expired.has(effect));
        member.debuffs = (member.debuffs || []).filter(effect => !expired.has(effect));
        member.helpfulEffects = (member.helpfulEffects || []).filter(effect => !expired.has(effect));
      }
      if (member.ward?.expires <= this.time) delete member.ward;
      if (member.healingReceived?.expires <= this.time) delete member.healingReceived;
    }
    // Resolve due ticks before a finishing cast can refresh/consume an effect.
    for (const p of this.party) {
      if (p.hp <= 0) continue;
      for (const hot of [...p.hots]) {
        while (hot.ticks > 0 && this.time + 1e-8 >= hot.next && hot.next <= hot.expires + 1e-8) {
          let target = p;
          if (hot.living && p.hp >= p.maxHp) {
            const cap = hot.maxInstances || 1;
            const destination = this.party
              .filter(member => member.hp > 0 && member.hp < member.maxHp && member.id !== p.id && this.activeHots(member, [hot.source]).length < cap)
              .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
            if (destination) {
              p.hots = p.hots.filter(effect => effect !== hot);
              destination.hots.push(hot);
              target = destination;
            }
          }
          this.heal(target, hot.heal, hot.source); hot.ticks--;
          hot.interval = this.hotInterval(hot, target);
          hot.next += hot.interval;
          hot.ticks = hot.next <= hot.expires + 1e-8
            ? ticksForDuration(hot.expires - hot.next, hot.interval) + 1
            : 0;
        }
      }
      p.hots = p.hots.filter(hot => hot.ticks > 0);
    }
    const cast = this.cast;
    if (cast) {
      cast.elapsed += dt;
      if (cast.spell.channel) {
        const ticks = cast.spell.ticks;
        const channelElapsed = cast.elapsed * cast.hasteMultiplier;
        while (cast.launched < ticks.length && channelElapsed + 1e-8 >= ticks[cast.launched].at - 0.3) {
          this.emit('bolt', { target: cast.target, spell: cast.spell.id, travel: 0.3 / cast.hasteMultiplier, bolt: cast.launched }); cast.launched++;
        }
        while (cast.landed < ticks.length && channelElapsed + 1e-8 >= ticks[cast.landed].at) {
          const tick = ticks[cast.landed];
          if (cast.target === 'boss') this.damageEnemy(tick.damage, cast.spell.id);
          else if (cast.spell.party) for (const target of this.party) {
            if (target.hp > 0) this.heal(target, tick.heal * healingParts(cast.spell, this.spellPower).factor, cast.spell.id);
          }
          else this.heal(this.party.find(p => p.id === cast.target), tick.heal * healingParts(cast.spell, this.spellPower).factor, cast.spell.id);
          cast.landed++;
        }
        const smartBolt = cast.spell.smartHealingBolt;
        if (smartBolt && !cast.smartLanded && channelElapsed + 1e-8 >= smartBolt.at) {
          const target = this.lowestHealthAlly(cast.target === 'boss' ? null : cast.target, false);
          if (target) {
            this.emit('bolt', { target: target.id, spell: cast.spell.id, travel: 0.3 / cast.hasteMultiplier, bolt: ticks.length, smart: true });
            this.heal(target, smartBolt.heal * healingParts(cast.spell, this.spellPower).factor, 'threefold-penance');
          }
          cast.smartLanded = true;
        }
      }
      if (cast.elapsed + 1e-8 >= cast.duration) {
        this.completeCast();
      }
    }
    for (const p of this.party) {
      if (p.hp <= 0) continue;
      if (p.damage && this.time >= p.nextAttack) {
        this.damageEnemy(p.damage, p.id, false, p);
        const interval = hastedTime(p.interval, this.haste(p));
        p.nextAttack += interval; this.emit('attack', { source: p.id });
      }
      for (const dot of p.dots) {
        if (this.time >= dot.next) { this.damage(p, dot.damage, dot.source || 'mark', dot.damageType); dot.ticks--; dot.next += dot.interval; }
      }
      p.dots = p.dots.filter(d => d.ticks > 0);
    }
    for (const dot of this.boss.dots) {
      while (dot.ticks > 0 && this.time + 1e-8 >= dot.next && dot.next <= dot.expires + 1e-8) {
        const amount = dot.damage;
        dot.ticks--;
        dot.interval = hastedTime(dot.baseInterval, this.haste());
        dot.next += dot.interval;
        dot.ticks = dot.next <= dot.expires + 1e-8
          ? ticksForDuration(dot.expires - dot.next, dot.interval) + 1
          : 0;
        dot.remaining = dot.damage * dot.ticks;
        this.damageEnemy(amount, dot.source);
      }
    }
    this.boss.dots = this.boss.dots.filter(dot => dot.ticks > 0 && this.boss.hp > 0);
    if (this.boss.hp > 0) {
      if (this.time >= this.nextStrike) { this.damage(this.party[0], this.encounter.strike.damage, 'strike', this.encounter.strike.damageType); this.nextStrike += this.encounter.strike.every; this.emit('bossAttack'); }
      if (this.time >= this.nextShard) { this.damage(this.rotatingTarget(), this.encounter.shard.damage, 'shard', this.encounter.shard.damageType); this.nextShard += this.encounter.shard.every; }
      for (const add of this.adds) {
        if (this.time < add.next) continue;
        const target = add.target === 'tank' ? this.party[0] : this.randomTargets(1)[0];
        if (target) { this.damage(target, add.damage, add.id, add.damageType); this.emit('rangedAttack', { source: add.id, target: target.id }); }
        add.next += add.every;
      }
    }
    for (const m of this.mechanics) {
      if (this.boss.hp <= 0) break;
      if (!m.warned && this.time >= m.next - m.warning) {
        m.targets = this.mechanicTargets(m).filter(Boolean).map(p => p.id);
        this.emit('warning', { mechanic: m.id, targets: m.targets }); m.warned = true;
      }
      if (this.time >= m.next) { this.resolveMechanic(m); m.next += m.every; m.warned = false; delete m.targets; }
    }
    const healer = this.party.find(p => p.label === 'HEALER');
    if (this.party[0].hp <= 0 || healer?.hp <= 0 || this.party.filter(p => p.hp > 0).length < 3 || this.time >= CONFIG.enrage) {
      this.status = 'defeat'; this.cast = null; this.log(this.time >= CONFIG.enrage ? 'The sanctum is consumed. Enrage.' : 'The party has fallen.', 'danger'); this.emit('end');
    } else if (this.boss.hp <= 0) { this.status = 'victory'; this.cast = null; this.log(`${this.encounter.name} is defeated.${this.adds.length ? ' The remaining enemies flee.' : ''}`, 'heal'); this.emit('end'); }
  }
  drainEvents() { const events = this.events; this.events = []; return events; }
}
