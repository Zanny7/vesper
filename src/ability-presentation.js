// Presentation helpers; these do not alter bindings or combat timing.
import { formatNumber, ticksForDuration } from './stats.js';
import { ATONEMENT_RATIO } from './data.js';
export function compactKeybind(binding) {
  const aliases = { shift: 'S', ctrl: 'C', control: 'C', alt: 'A', option: 'A', meta: 'M', cmd: 'M', command: 'M', win: 'M', super: 'M' };
  const parts = binding.split('+').map(part => part.trim());
  const key = parts.pop().toUpperCase();
  return parts.map(part => aliases[part.toLowerCase()] || part.toUpperCase()).join('') + key;
}

export function formatCooldown(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const tenths = Math.max(1, Math.round(seconds * 10));
  if (seconds < 60) return String(Math.min(599, tenths) / 10);
  // Round to the nearest second after the one-minute display boundary.
  const total = Math.round(tenths / 10);
  return `${Math.floor(total / 60)}.${String(total % 60).padStart(2, '0')}`;
}

// The combat model supplies all resolved numbers; presentation only chooses wording.
export function abilityTooltip(game, spell, target = null) {
  const value = game.resolveSpell(spell, target);
  const n = formatNumber;
  const lines = [
    `${spell.name} · ${spell.key}`,
    `${value.duration ? `${n(value.duration)}s ${spell.channel ? 'channel' : 'cast'}` : 'Instant'} · ${n(value.cost)} Mana`,
  ];
  if (value.bolts.length) {
    const healingBolts = value.bolts.filter(bolt => bolt.heal > 0);
    if (healingBolts.length) lines.push(`${healingBolts.length} healing ${healingBolts.length === 1 ? 'bolt' : 'bolts'}: ${n(healingBolts[0].heal)} each (${n(healingBolts.reduce((total, bolt) => total + bolt.heal, 0))} total)${spell.party ? ' per living ally' : ' to one ally'}.`);
    const damageBolts = value.bolts.filter(bolt => bolt.damage > 0);
    if (damageBolts.length) lines.push(`Enemy: ${damageBolts.length} ${damageBolts.length === 1 ? 'bolt' : 'bolts'} for ${n(damageBolts[0].damage)} damage each (${n(damageBolts.reduce((total, bolt) => total + bolt.damage, 0))} total)${spell.id === 'penance' ? '; each hit triggers Atonement' : ''}.`);
    if (value.smartBolt) lines.push(`An additional smart bolt heals the lowest-health other ally for ${n(value.smartBolt)}. Main-target bolts are unchanged.`);
  } else {
    if (value.chain) lines.push(`Chain: ${value.chain.map(n).join(' → ')} healing (${n(value.chain.reduce((sum, heal) => sum + heal, 0))} total). Start on the selected living ally; each jump chooses the lowest-health-percentage unhit living ally, including you. Up to ${spell.chain.targets} distinct targets; all healing lands at cast completion.`);
    else if (value.direct > 0) {
      const baseDirect = value.direct - (value.hotBonus?.current || 0) * (value.hotBonus?.perHot || 0);
      lines.push(`Heal ${spell.party ? 'each living ally' : 'one ally'} for ${n(baseDirect)}${value.hotBonus ? ` plus ${n(value.hotBonus.perHot)} per active Druid HoT type (up to ${value.hotBonus.max})` : ''}.`);
    }
    if (value.damage > 0) lines.push(`Deal ${n(value.damage)} damage to the enemy${spell.atonement ? ' and trigger Atonement' : ''}.`);
  }
  if (spell.bindingLight) lines.push(`Binding Light: after Flash Heal, heal the lowest-health eligible other living ally for ${n(spell.bindingLight.ratio * 100)}% of this target’s effective heal; overhealing does not count.`);
  if (spell.earlyMercy) lines.push(`Early Mercy: deliver ${n(spell.earlyMercy.ratio * 100)}% of Greater Heal halfway through this cast and the remainder at completion. Mana is charged once when casting starts; interrupting before halfway grants no heal, and interrupting afterward keeps the provisional heal. Mana is not refunded.`);
  if (value.hot) lines.push(`HoT: ${n(value.hot.tick)} healing every ${n(value.hot.interval)}s for ${n(value.hot.duration)}s (${value.hot.ticks} ticks, ${n(value.hot.tick * value.hot.ticks)} total${spell.party ? ' per ally' : ''}${value.hot.pending ? ` including ${n(value.hot.pending)} unspent healing` : ''}).`);
  if (spell.hot?.bankCap) {
    lines.push(`Each completed cast adds ${n(spell.hot.duration)}s to the remaining duration, capped at ${n(spell.hot.bankCap)}s at completion. Keeps the next tick; one ticking effect per ally. Clipped duration stores no hidden healing. Full-Health ticks are spent normally.`);
    if (target) lines.push(`Selected ally: ${n(value.hot.bankRemaining)}s banked remaining. Empowerment affects only ticks added by this cast; existing healing stays unchanged.`);
  }
  else if (spell.hot?.pool) lines.push('Recasting adds new healing to the unspent Nourish pool on this ally, then delivers the pool over a refreshed 4-second window. Nourish is not a qualifying HoT type for its own bonus.');
  else if (spell.hot && !spell.overgrowth && !spell.flowingRiptide) lines.push(spell.party ? 'Each living ally receives a separate HoT; recasting refreshes its duration.' : 'Recasting refreshes the HoT duration and tick timer.');
  if (value.dot) lines.push(`DoT: ${n(value.dot.tick)} damage every ${n(value.dot.interval)}s for ${n(value.dot.duration)}s (${value.dot.ticks} ticks, ${n(value.dot.tick * value.dot.ticks)} total${value.dot.pending ? ` including ${n(value.dot.pending)} carried damage` : ''}); recasting carries pending damage.`);
  if (spell.consumesHot) lines.push(`Requires ${spell.consumesHot.map(id => ({ rejuvenation: 'Rejuvenation', regrowth: 'Regrowth', wildGrowth: 'Wild Growth' })[id] || id).join(', ')} on the ally; ${spell.preserveHot ? 'does not consume the HoT' : 'consumes the shortest remaining HoT'}.`);
  if (spell.bloom) lines.push(`Also heals the ${spell.bloom.targets} lowest-health-percentage other living allies for ${n(value.direct * spell.bloom.ratio)} each (${n(spell.bloom.ratio * 100)}% of the primary raw heal).`);
  if (spell.hot?.maxInstances) lines.push(`Up to ${spell.hot.maxInstances} ${spell.name} HoTs may coexist on one ally.`);
  if (spell.hot?.living) lines.push('Ticks 20% faster on an ally below 50% Health; at full Health, a tick moves the HoT with its remaining healing to the lowest-health-percentage wounded living ally with room for Rejuvenation.');
  if (spell.passingBloom) lines.push('Replacing Regrowth moves the old HoT to the lowest-health-percentage wounded living ally without Regrowth, refreshed to 9s (3 normal ticks); otherwise the old HoT ends.');
  if (spell.hotBonus && value.hotBonus.current !== null) lines.push(`Selected ally currently has ${value.hotBonus.current} qualifying HoT ${value.hotBonus.current === 1 ? 'type' : 'types'}: ${n(spell.hot?.pool ? value.hot.tick * value.hot.ticks - value.hot.pending : value.direct)} new healing.`);
  if (spell.hotBonus) lines.push(`Base ${n(spell.hot?.heal * spell.hot.duration / spell.hot.interval || spell.heal)} healing, plus ${n(spell.hotBonus.amount)} per qualifying type (up to ${spell.hotBonus.max}).`);
  if (spell.hotBonus) lines.push('Qualifying types are Rejuvenation, Regrowth, and Wild Growth, counted at cast completion; Ward does not count.');
  if (spell.nourishingTouch) lines.push(`Nourishing Touch: completion adds ${spell.nourishingTouch.extraTicks} normal-strength ${spell.nourishingTouch.extraTicks === 1 ? 'tick' : 'ticks'} to every active Rejuvenation, Regrowth, Wild Growth, and triggered Ward HoT on the target, without a cap. Nourish itself is not extended.`);
  if (spell.overgrowth) lines.push(value.overgrowth ? 'Overgrowth: usable during cooldown with a 1s base cast; carries remaining HoT healing into the refresh.' : 'Overgrowth: during cooldown, use a 1s base cast and carry remaining HoT healing.');
  if (spell.overgrowth) lines.push('When a Wild Growth tick leaves an ally above 90% Health, half its remaining healing transfers to the lowest-health-percentage wounded other living ally; existing Wild Growth pools absorb it. Mana cost is 20% lower.');
  if (value.hot?.pending && value.duration > 0) lines.push('Carried healing shown is available now and may change during the cast.');
  if (spell.echoOfGrace) lines.push(`Also heals the lowest-health other wounded ally for ${n(value.direct * spell.echoOfGrace.ratio)}.`);
  if (value.lingering) lines.push(`Lingering Prayer: if a target remains below ${n(spell.lingeringPrayer.threshold * 100)}% Health after this direct heal, add ${n(value.lingering.tick)} healing every ${n(value.lingering.interval)}s for ${n(value.lingering.duration)}s (${value.lingering.ticks} ticks, ${n(value.lingering.tick * value.lingering.ticks)} total for that target).`);
  if (spell.atonement || value.bolts.some(bolt => bolt.damage > 0)) lines.push(`Atonement heals the lowest-health living ally for ${n(ATONEMENT_RATIO * 100)}% of actual damage dealt; it does not Crit separately.`);
  if (spell.lightUnspent) lines.push(`${n(spell.lightUnspent.ratio * 100)}% of direct overhealing is shared among injured allies.`);
  if (spell.postHaste && spell.id === 'flash') lines.push(`Grants a Post-Haste stack (up to ${spell.postHaste.maxStacks}) for Greater Heal or Prayer; each stack reduces its cast time and Mana cost by ${n(spell.postHaste.reduction * 100)}%.`);
  if (value.postHaste) lines.push(`Post-Haste: this cast uses one stack, reducing Mana cost and cast time by ${n(spell.postHaste.reduction * 100)}%.`);
  if (spell.empowerment) lines.push(`Store ${spell.empowerments || 1} empowerment${spell.empowerments > 1 ? 's' : ''} with no timed expiration: each successful Recurring Surge, Healing Wave, or Chain Heal heals ${n(spell.empowerment.healingBonus * 100)}% more and casts ${n(spell.empowerment.castReduction * 100)}% faster. Replaces the stored state; does not stack, reduce Mana cost, or empower old Surge ticks. Riptide and Totems preserve it; cancelled or interrupted casts do too.`);
  if (value.unleashLife) lines.push('Unleash Life: this cast is empowered. Consumed only on successful completion; Mana cost is unchanged.');
  if (value.totem) lines.push(`Totem: ${n(value.totem.tick)} healing${value.totem.party ? ' per living ally' : ''} every ${n(value.totem.interval)}s for ${n(value.totem.duration)}s (${value.totem.ticks} ticks, ${n(value.totem.tick * value.totem.ticks)} total${value.totem.party ? ' per ally' : ''}). ${value.totem.party ? 'Each tick heals every living party member, including you. Coexists with Healing Stream Totem.' : 'Each tick chooses the lowest-health-percentage injured living ally, including you.'} First tick after ${n(value.totem.interval)}s; full-Health healing is wasted. One active instance of this Totem; ticks continue while casting.`);
  if (spell.tidalMomentum) lines.push(`Tidal Momentum: ${n(spell.tidalMomentum * 100)}% more direct healing if the target has your Recurring Surge at completion. Selected-target healing above reflects the current effect state.`);
  if (spell.tidalWaves) lines.push(`Riptide grants ${spell.tidalWaves.charges} Tidal Waves charges, replacing unused charges; each reduces a successful Wave or Chain cast time by ${n(spell.tidalWaves.castReduction * 100)}%. No expiration; cancellation preserves charges.`);
  if (value.tidalWaves) lines.push(`Tidal Waves: this cast reserves one charge for ${n(spell.tidalWavesEligible.castReduction * 100)}% reduced cast time. Multiplies with Unleash and Haste; no Mana reduction.`);
  if (spell.flowingRiptide) {
    const pending = game.activeHots(target, ['riptide']).reduce((sum, hot) => sum + hot.heal * hot.ticks, 0);
    lines.push(`Flowing Riptide: when a periodic tick leaves the ally above ${n(spell.flowingRiptide.threshold * 100)}% Health, move the remaining HoT to the lowest-health-percentage wounded living ally without Riptide. Keep its next tick, expiry and healing budget. Recasting immediately delivers the old remaining periodic healing, then the fresh direct heal and HoT.`);
    if (target) lines.push(`Selected ally: ${n(pending)} remaining periodic healing available for immediate delivery on recast.`);
  }
  if (spell.echoingSurge) lines.push(`Echoing Surge: each tick also heals the lowest-health-percentage other wounded living ally for ${n(spell.echoingSurge * 100)}% of its effective healing. No echo from overheal, recursive echo or second Crit.`);
  if (spell.ancestralEcho) lines.push(`Ancestral Echo: Wave's direct heal also heals the lowest-health-percentage other wounded living ally for ${n(spell.ancestralEcho * 100)}% of its effective healing. No echo from overheal or Earthliving, recursive echo or second Crit.`);
  if (spell.earthlivingDuration) {
    const surge = game.spells.find(candidate => candidate.id === 'recurringSurge');
    const profile = game.hotProfile(surge, target);
    lines.push(`Earthliving: each healed target gains ${n(spell.earthlivingDuration)}s of Recurring Surge at ${n(profile.tick)} per ${n(profile.interval)}s tick (${spell.earthlivingDuration / surge.hot.interval} normal ${spell.earthlivingDuration === surge.hot.interval ? 'tick' : 'ticks'}). Extend existing banks without resetting the next tick, capped at ${n(surge.hot.bankCap)}s. Current Surge strength and Spell Power apply once; Unleash affects only new ticks.`);
  }
  if (spell.sanctuary) lines.push(`Reduce party damage taken by ${n(spell.sanctuary.reduction * 100)}% for ${n(spell.sanctuary.duration)}s.`);
  if (spell.divineFervor) lines.push(`Grant the Priest ${n(spell.divineFervor.speed * 100)}% Haste and reduce all spell Mana costs by ${n(spell.divineFervor.manaReduction * 100)}% for ${n(spell.divineFervor.duration)}s. This cost reduction multiplies with Post-Haste.`);
  if (spell.ward) {
    const wardInterval = game.hotInterval({ baseInterval: spell.ward.hot.interval }, target || game.healer);
    const wardTicks = ticksForDuration(spell.ward.hot.duration, wardInterval);
    const wardTotal = spell.ward.hot.heal * ticksForDuration(spell.ward.hot.duration, spell.ward.hot.interval) + Math.max(0, game.spellPower);
    lines.push(`Arm an ally for ${n(spell.ward.duration)}s. Casts on an ally at or below ${n(spell.ward.threshold * 100)}% Health trigger immediately; otherwise damage that brings them to or below the threshold triggers a HoT of ${n(wardTotal / wardTicks)} every ${n(wardInterval)}s for ${n(spell.ward.hot.duration)}s (${wardTicks} ticks, ${n(wardTotal)} total). Expiry without a trigger gives no heal.`);
    lines.push('Recasting on an armed ally replaces the armed Ward. Triggered HoTs from separate charges coexist.');
  }
  if (spell.genesis) lines.push(`Restore active Rejuvenation, Regrowth, and Wild Growth HoTs to full duration and make them tick ${n(spell.genesis.speed * 100)}% faster for ${n(spell.genesis.duration)}s. Nourish pools and Ward HoTs are excluded.`);
  if (spell.cooldown) lines.push(`${n(spell.cooldown)}s cooldown${value.overgrowth ? ' (base cooldown continues)' : ''}.`);
  const charges = game.availableCharges(spell.id);
  if (charges !== undefined) lines.push(`${charges}/${spell.charges} charges; one recharges every ${n(spell.cooldown)}s.`);
  const remaining = Math.max(0, (game.cooldowns[spell.id] || 0) - game.time);
  if (remaining > 0) lines.push(value.overgrowth ? `Overgrowth available; base cooldown ${n(remaining)}s remaining.` : `Ready in ${n(remaining)}s.`);
  return lines.join('\n');
}
