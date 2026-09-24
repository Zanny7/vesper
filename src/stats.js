// Shared rules for live stat changes and chapter resource snapshots.
export function adjustedResource(current, oldMax, newMax) {
  return Math.max(0, Math.min(newMax, current + Math.max(0, newMax - oldMax)));
}
export const resourceKey = member => member.label === 'HEALER' ? 'healer' : member.id;
export function healingParts(spell, power = 0) {
  const ticks = spell.hot ? Math.round(spell.hot.duration / spell.hot.interval) : 0;
  const direct = spell.channel
    ? spell.ticks.reduce((n, t) => n + t.heal, 0) + (spell.smartHealingBolt?.heal || 0)
    : spell.heal;
  const hot = ticks * (spell.hot?.heal || 0), total = direct + hot;
  const factor = total > 0 ? (total + Math.max(0, power)) / total : 1;
  return { direct: direct * factor, hotTick: ticks ? hot * factor / ticks : 0, factor };
}
const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
export const CRIT_MULTIPLIER = 1.5;
export function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? numberFormat.format(number) : String(value);
}
export function hasteMultiplier(hastePercent = 0) {
  const haste = Number(hastePercent);
  return 1 + (Number.isFinite(haste) ? haste : 0) / 100;
}
export function hastedTime(baseTime, hastePercent = 0) {
  return baseTime / hasteMultiplier(hastePercent);
}
export function effectiveAttackInterval(baseInterval, hastePercent = 0) {
  return hastedTime(baseInterval, hastePercent);
}
export function displayedDps(damage, interval) {
  return interval > 0 ? damage / interval : 0;
}
export function criticalChance(crit = 0) {
  return Math.max(0, Math.min(100, Number(crit) || 0));
}
export function damageMultiplierForDefense(defense = 0) {
  const value = Number(defense);
  const effectiveDefense = Number.isNaN(value) ? 0 : value;
  return effectiveDefense >= 0
    ? 100 / (100 + effectiveDefense)
    : 2 - (100 / (100 - effectiveDefense));
}
export function damageReductionPercent(defense = 0) {
  return (1 - damageMultiplierForDefense(defense)) * 100;
}
export function ticksForDuration(duration, interval) {
  if (!Number.isFinite(duration) || !Number.isFinite(interval) || duration < 0 || interval <= 0) return 0;
  return Math.floor(duration / interval + 1e-8);
}
export function mitigatedDamage(amount, type, target, time = 0) {
  if (amount <= 0) return 0;
  if (type !== 'Physical' && type !== 'Magic') return amount;
  const stat = type === 'Physical' ? 'armor' : 'resistance';
  const defense = Number(target?.[stat]);
  const baseDefense = Number.isNaN(defense) ? 0 : defense;
  const temporaryDefense = (target?.defenseModifiers || [])
    .filter(effect => effect.stat === stat && (effect.expires == null || effect.expires > time + 1e-8))
    .reduce((total, effect) => total + effect.modifier, 0);
  return amount * damageMultiplierForDefense(baseDefense + temporaryDefense);
}
