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
export function mitigatedDamage(amount, type, target) {
  if (amount <= 0) return 0;
  if (type !== 'Physical' && type !== 'Magic') return amount;
  const reduction = type === 'Physical' ? target.armor : type === 'Magic' ? target.resistance : 0;
  return Math.max(1, amount - Math.max(0, reduction || 0));
}
