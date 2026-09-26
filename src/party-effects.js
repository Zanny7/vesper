import { DRUID_HOTS } from './data.js';
import { effectGlyph } from './ability-icons.js';
import { formatNumber } from './stats.js';

// Adapt combat-owned effects to one presentation model. Future buffs/shields can
// supply id/source, name, icon, color, expires (optional), and displayOrder.
export function partyEffects(member, time) {
  const live = effect => effect.expires == null || effect.expires > time + 1e-8;
  const helpful = [...member.hots || [], ...member.helpfulEffects || []].filter(live)
    .sort((a, b) => order(a) - order(b) || key(a).localeCompare(key(b)));
  const negative = [...(member.dots || []).map(dot => ({ ...dot, icon: dot.icon || 'wound', color: dot.color || '#f2a1af', expires: dot.next + (dot.ticks - 1) * dot.interval })), ...member.debuffs || []].filter(live)
    // Dispellable first, then explicit priority, then damage per second; stable ID breaks ties.
    .sort((a, b) => Number(!!b.dispellable) - Number(!!a.dispellable) || (b.priority || 0) - (a.priority || 0) || pressure(b) - pressure(a) || key(a).localeCompare(key(b)))
    .slice(0, 2);
  return member.hp > 0 ? { helpful, negative } : { helpful: [], negative: [] };
}
const key = e => e.source || e.id || e.name;
const order = e => e.displayOrder ?? (DRUID_HOTS.includes(e.source) ? DRUID_HOTS.indexOf(e.source) : e.source === 'nourish' ? 3 : e.source === 'cenarionWardArmed' ? 4 : e.source === 'cenarionWard' ? 5 : 100);
const pressure = e => (e.damage || 0) / (e.interval || 1);
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function effectDescription(effect, time) {
  const modifier = effect.defenseModifier
    ? ` (${effect.modifier > 0 ? '+' : ''}${formatNumber(effect.modifier)} ${effect.stat === 'armor' ? 'Armor' : 'Resistance'})`
    : '';
  const pool = effect.bankCap ? ` (${formatNumber(effect.bankedHealing.reduce((sum, healing) => sum + healing, 0))} banked healing in ${effect.ticks} remaining ticks)` : effect.pool || effect.flowingRiptide ? ` (${formatNumber(effect.heal * effect.ticks)} healing in ${effect.ticks} remaining ticks)` : '';
  return `${effect.name}${modifier}${pool}${effect.expires == null ? '' : `: ${Math.max(0, Math.ceil(effect.expires - time - 1e-8))}s remaining`}`;
}
export function effectMarkup(effects, time) {
  return effects.map(effect => `<span class="frame-effect" data-effect="${escape(key(effect))}" title="${escape(effectDescription(effect, time))}">${effectGlyph(effect)}${effect.expires == null ? '' : `<b>${Math.max(0, Math.ceil(effect.expires - time - 1e-8))}</b>`}</span>`).join('');
}

export function renderPartyEffects(frame, member, time) {
  const effects = partyEffects(member, time);
  for (const kind of ['helpful', 'negative']) {
    const root = frame.querySelector(`.frame-effects-${kind}`), html = effectMarkup(effects[kind], time);
    if (root.innerHTML !== html) root.innerHTML = html;
  }
  return [...effects.negative, ...effects.helpful].map(effect => effectDescription(effect, time)).join(', ');
}
