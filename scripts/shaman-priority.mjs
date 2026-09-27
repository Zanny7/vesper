// BAT-89: injury-aware priority policy. Uses public schedules and announced
// random targets; never consumes the combat RNG to predict future targets.
import { SHAMAN_EMPOWERMENT } from '../src/data.js';
import { mitigatedDamage } from '../src/stats.js';
const forecastCaches = new WeakMap();
const activeForecastGames = new WeakSet();
function forecastCache(game) {
  if (!activeForecastGames.has(game)) return { damage: new Map(), healing: new Map() };
  let cached = forecastCaches.get(game);
  if (!cached || cached.time !== game.time || cached.serial !== game.serial || cached.party !== game.party) {
    cached = { time: game.time, serial: game.serial, party: game.party, damage: new Map(), healing: new Map() };
    forecastCaches.set(game, cached);
  }
  return cached;
}

export function expectedDamage(game, target, horizon) {
  const cache = forecastCache(game).damage, key = `${target.id}:${horizon}`;
  if (cache.has(key)) return cache.get(key);
  let amount = 0;
  if (target === game.party[0] && Number.isFinite(game.nextStrike)) {
    for (let at = game.nextStrike; at <= game.time + horizon; at += game.encounter.strike.every) {
      amount += mitigatedDamage(game.encounter.strike.damage, game.encounter.strike.damageType || 'Physical', target, game.time);
      if (!(game.encounter.strike.every > 0)) break;
    }
  }
  for (const m of game.mechanics) {
    if (m.next > game.time + horizon) continue;
    const affected = m.target === 'party' || m.target === 'tank' && target === game.party[0]
      || m.warned && m.targets?.includes(target.id);
    if (affected) amount += mitigatedDamage(m.damage || 0, m.damageType || 'Physical', target, game.time);
  }
  for (const dot of target.dots) {
    const due = Math.max(0, Math.min(dot.ticks, Math.floor((game.time + horizon - dot.next) / dot.interval + 1e-8) + 1));
    amount += mitigatedDamage(dot.damage || 0, dot.damageType || 'Physical', target, game.time) * due;
  }
  cache.set(key, amount);
  return amount;
}

function periodicHealing(game, target, horizon) {
  let healing = 0;
  for (const hot of game.activeHots(target, ['riptide', 'recurringSurge'])) {
    const count = Math.max(0, Math.min(hot.ticks, Math.floor((game.time + horizon - hot.next) / hot.interval + 1e-8) + 1));
    healing += hot.bankedHealing ? hot.bankedHealing.slice(0, count).reduce((a, b) => a + b, 0) : count * hot.heal;
  }
  if (game.tideTotem) {
    const t = game.tideTotem;
    healing += Math.max(0, Math.min(t.ticks, Math.floor((game.time + horizon - t.next) / t.interval + 1e-8) + 1)) * t.heal;
  }
  return healing;
}

export function pendingHealing(game, target, horizon) {
  const cache = forecastCache(game).healing, key = `${target.id}:${horizon}`;
  if (cache.has(key)) return cache.get(key);
  let healing = periodicHealing(game, target, horizon);
  // Allocate each smart Stream tick once to a projected injured destination.
  // This is a deterministic estimate; actual ticks still choose live Health.
  if (game.totem) {
    const t = game.totem, allocated = new Map();
    for (let i = 0; i < t.ticks && t.next + i * t.interval <= game.time + horizon + 1e-8; i++) {
      const offset = Math.max(0, t.next + i * t.interval - game.time);
      const choices = game.party.filter(p => p.hp > 0).map(p => ({ p,
        need: Math.max(0, p.maxHp - p.hp + expectedDamage(game, p, offset) - periodicHealing(game, p, offset) - (allocated.get(p.id) || 0)) }))
        .filter(c => c.need > 0).sort((a, b) => b.need / b.p.maxHp - a.need / a.p.maxHp);
      if (choices.length) {
        const { p, need } = choices[0];
        allocated.set(p.id, (allocated.get(p.id) || 0) + Math.min(t.heal, need));
      }
    }
    healing += allocated.get(target.id) || 0;
  }
  cache.set(key, healing);
  return healing;
}

export function usefulCast(game, spell, primary, { empowered = !!game.buffs.unleashLife, used = {}, offset = 0 } = {}) {
  const value = game.resolveSpell(spell, primary);
  const multiplier = spell.empowerable ? (empowered ? 1 + SHAMAN_EMPOWERMENT.healingBonus : 1) / game.healingEmpowerment(spell) : 1;
  const duration = value.duration * (spell.empowerable ? (empowered ? .8 : 1) / (game.buffs.unleashLife ? .8 : 1) : 1);
  const horizon = offset + Math.max(duration, spell.hot?.duration || 0, spell.earthlivingDuration || 0);
  const allocations = {};
  const need = (p, time = horizon) => Math.max(0, p.maxHp - p.hp + expectedDamage(game, p, time)
    - pendingHealing(game, p, time) - (used[p.id] || 0) - (allocations[p.id] || 0));
  const grant = (p, amount, time = horizon) => {
    const useful = Math.min(amount, need(p, time));
    allocations[p.id] = (allocations[p.id] || 0) + useful;
    return useful;
  };
  const targets = spell.chain ? game.chainTargets(spell, primary) : [primary];
  let useful = 0, usefulTargets = 0;
  for (const [jump, target] of targets.entries()) {
    const raw = value.direct * multiplier * (spell.chain ? spell.chain.jumpRatio ** jump : 1);
    const direct = grant(target, raw, offset + duration);
    useful += direct;
    // A future scheduled hit is useful for preparation, but does not turn a
    // nearly-full ally into evidence of efficient current group healing.
    if (Math.min(raw, Math.max(0, target.maxHp - target.hp - pendingHealing(game, target, value.duration))) >= 40) usefulTargets++;
    if (spell.ancestralEcho) {
      const secondary = game.party.filter(p => p.hp > 0 && p !== target && p.hp < p.maxHp)
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (secondary) useful += grant(secondary, direct * spell.ancestralEcho, offset + duration);
    }
    if (spell.hot) {
      const rawHot = value.hot.tick * value.hot.ticks * multiplier;
      const bank = game.activeHots(target, [spell.id])[0];
      const room = spell.hot.bankCap ? Math.max(0, spell.hot.bankCap - (bank ? bank.expires - game.time : 0)) / spell.hot.duration : 1;
      useful += grant(target, rawHot * Math.min(1, room));
    }
  }
  if (spell.earthlivingDuration) {
    const recipients = spell.earthlivingTargets ? [...targets]
      .filter(p => p.maxHp - p.hp - (used[p.id] || 0) - (allocations[p.id] || 0) > 0)
      .sort((a, b) => (a.hp + (allocations[a.id] || 0)) / a.maxHp - (b.hp + (allocations[b.id] || 0)) / b.maxHp)
      .slice(0, spell.earthlivingTargets) : targets;
    for (const target of recipients) {
      const surge = game.spells.find(s => s.id === 'recurringSurge');
      const profile = game.hotProfile(surge, target), bank = game.activeHots(target, ['recurringSurge'])[0];
      const room = Math.min(spell.earthlivingDuration, Math.max(0, surge.hot.bankCap - (bank ? bank.expires - game.time : 0)));
      const raw = profile.tick * multiplier * (spell.earthlivingHealingRatio ?? 1) * Math.floor(room / profile.interval);
      useful += grant(target, raw);
    }
  }
  return { spell, primary, useful, usefulTargets, allocations, duration, cost: value.cost, hpm: useful / value.cost };
}

// Evaluate all stored empowerments against a shared wound budget. This includes
// direct/secondary/generated healing and avoids counting a second full heal
// into the same injury. Returns the package with its actual spell costs.
export function unleashPackage(game, next, target, empowered) {
  const unleash = game.spells.find(s => s.id === 'unleashLife');
  const count = unleash.empowerments || 1;
  const used = {};
  let useful = 0, cost = 0, duration = 0;
  if (empowered) {
    const instant = Math.min(game.resolveSpell(unleash).direct, target.maxHp - target.hp);
    used[target.id] = instant; useful += instant; cost += game.manaCost(unleash);
  }
  for (let i = 0; i < count; i++) {
    const candidates = (i ? game.party.filter(p => p.hp > 0) : [next.primary])
      .map(p => usefulCast(game, next.spell, p, { empowered, used, offset: duration }))
      .sort((a, b) => b.useful - a.useful);
    const cast = candidates[0];
    useful += cast.useful; cost += cast.cost; duration += cast.duration;
    for (const [id, healing] of Object.entries(cast.allocations)) used[id] = (used[id] || 0) + healing;
  }
  return { useful, cost, duration, hpm: useful / cost };
}

function runShamanPriority(game, skill = 'veryGood', { unleashMode = 'adaptive' } = {}) {
  if (game.cast || game.status !== 'running') return;
  const living = game.party.filter(p => p.hp > 0), tank = game.party[0];
  const ordered = [...living].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  const lowest = ordered[0];
  if (!lowest) return;
  const scale = { veryGood: 1, average: .85, weak: .75 }[skill] ?? 1;
  const spell = id => game.spells.find(s => s.id === id);
  const cast = (id, target = lowest) => game.begin(id, target.id).ok;
  const missing = p => p.maxHp - p.hp;
  const uncovered = (p, horizon) => Math.max(0, missing(p) + expectedDamage(game, p, horizon) - pendingHealing(game, p, horizon));
  const danger = lowest.hp / lowest.maxHp < .45;
  const warnedGroup = game.mechanics.some(m => m.warned && m.target === 'party' && m.next - game.time <= 3);
  const injured = living.filter(p => missing(p) >= 65 * scale);
  const tide = spell('healingTide');
  if (tide && !game.tideTotem) {
    const value = game.resolveSpell(tide);
    const useful = living.reduce((sum, p) => sum + Math.min(uncovered(p, value.totem.duration), value.totem.tick * value.totem.ticks), 0);
    if ((injured.length >= 2 || warnedGroup || danger) && useful >= value.cost * 3 * scale && cast(tide.id)) return;
  }
  const stream = spell('healingStream');
  if (stream && !game.totem) {
    const value = game.resolveSpell(stream);
    const uncoveredTotal = living.reduce((sum, p) => sum + uncovered(p, value.totem.duration), 0);
    const burst = (value.cascadingStream || []).reduce((sum, raw, jump) => sum + Math.min(raw, missing(ordered[jump] || lowest)), 0);
    const useful = burst + Math.min(Math.max(0, uncoveredTotal - burst), value.totem.tick * value.totem.ticks);
    if (useful >= value.cost * 3 * scale && (injured.length >= 2 || missing(tank) >= 70 * scale) && cast(stream.id)) return;
  }
  const candidates = ['healingWave', 'chainHeal'].flatMap(id => spell(id)
    ? living.map(p => usefulCast(game, spell(id), p)) : []);
  const wave = candidates.filter(c => c.spell.id === 'healingWave').sort((a, b) => b.useful - a.useful)[0];
  const chain = candidates.filter(c => c.spell.id === 'chainHeal').sort((a, b) => b.useful - a.useful)[0];
  const useChain = chain && chain.usefulTargets >= 3 && chain.useful >= 210 * scale
    && (chain.usefulTargets >= 4 || chain.hpm >= wave.hpm);
  const next = useChain ? chain : wave;
  const unleash = spell('unleashLife');
  if (unleash && !game.buffs.unleashLife && next && game.mana >= game.manaCost(unleash) + next.cost) {
    const instant = Math.min(game.resolveSpell(unleash).direct, missing(lowest));
    const boosted = unleashPackage(game, next, lowest, true), normal = unleashPackage(game, next, lowest, false);
    const upcoming = game.mechanics.some(m => m.next - game.time <= 5 && m.next - game.time > 0
      && (m.target === 'party' || m.target === 'tank' || m.warned));
    const reserve = unleashMode === 'reserve' || unleashMode === 'adaptive' && upcoming && !danger;
    if (instant >= 35 * scale && boosted.useful - instant >= 60 * scale && game.mana >= boosted.cost
      && (danger || !reserve && boosted.hpm >= normal.hpm * .98 || reserve && game.mechanics.some(m => m.warned))) {
      if (cast(unleash.id)) return;
    }
  }
  // Use a useful split Wave before an instant Riptide removes its primary
  // wound. This was the source of the preliminary Ancestral policy regression.
  if (wave?.spell.ancestralEcho && !danger && missing(wave.primary) >= 85 * scale
    && Object.entries(wave.allocations).some(([id, value]) => id !== wave.primary.id && value >= 40 * scale)
    && (!useChain || wave.hpm >= chain.hpm) && cast(wave.spell.id, wave.primary)) return;
  const riptide = spell('riptide');
  if (riptide) {
    for (const target of ordered) {
      const existing = game.activeHots(target, ['riptide'])[0];
      const cashout = riptide.flowingRiptide && existing && missing(target) >= 40 + existing.heal * existing.ticks;
      if ((!existing || existing.expires - game.time < 3 || cashout) && missing(target) >= 65 * scale
        && uncovered(target, 6) >= 60 * scale && cast(riptide.id, target)) return;
    }
  }
  if (useChain && cast(chain.spell.id, chain.primary)) return;
  const surge = spell('recurringSurge'), bank = game.activeHots(tank, ['recurringSurge'])[0];
  if (surge && tank.hp > 0 && !danger && (!bank || bank.expires - game.time < 3)) {
    const value = usefulCast(game, surge, tank);
    // Paid Surge still has a niche with Earthliving; compare useful healing
    // against the whole Wave package rather than banning it by talent flag.
    const focusedWave = usefulCast(game, spell('healingWave'), tank);
    const sustained = expectedDamage(game, tank, 6) >= value.useful * .6 || injured.length <= 1 && missing(tank) >= 140 * scale;
    if (sustained && value.useful >= 60 * scale && value.hpm >= focusedWave.hpm && cast(surge.id, tank)) return;
  }
  if (wave && missing(wave.primary) >= 85 * scale && (danger || wave.useful >= 95 * scale)) cast(wave.spell.id, wave.primary);
}

export function decideShamanPriority(game, skill = 'veryGood', options = {}) {
  forecastCaches.delete(game); activeForecastGames.add(game);
  try { return runShamanPriority(game, skill, options); }
  finally { activeForecastGames.delete(game); forecastCaches.delete(game); }
}
