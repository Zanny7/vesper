import { itemIcon } from './equipment.js';
import { roleLabel } from './item-model.js';
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export function encounterLootMarkup(normal, bonus = [], isBoss = false) {
  const items = (pool, special) => pool.map(item => `<button type="button" class="loot-reward ${special ? 'boss-bonus-reward' : ''}" data-item-id="${escape(item.id)}" aria-label="${special ? 'Boss Bonus: ' : ''}${escape(item.name)}, item level ${item.itemLevel}, ${roleLabel(item)}"><span class="gear-slot is-equipped">${itemIcon(item)}</span>${special ? '<span class="boss-bonus-badge">♜ Boss Bonus</span>' : ''}</button>`).join('');
  return `<div class="loot-section"><h4>Normal rewards</h4><div class="loot-rewards">${items(normal, false) || '<p class="empty-loot">No eligible normal loot remains.</p>'}</div></div>${isBoss ? `<div class="loot-section boss-bonus-section"><h4>♜ Boss Bonus</h4><p>One additional unowned reward on victory, while eligible items remain. These items may also drop along the route.</p><div class="loot-rewards">${items(bonus, true) || '<p class="empty-loot">All eligible boss bonus rewards are owned.</p>'}</div></div>` : ''}`;
}
