import { itemIcon } from './equipment.js';
import { roleLabel } from './item-model.js';
import { itemBorderAttributes, itemEraLabel } from './eras.js';
import { ELITE_REWARD_CHANCE } from './data.js';
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export function encounterLootMarkup(normal, bonus = [], isBoss = false, isElite = false) {
  const items = pool => pool.map(item => `<button type="button" class="loot-reward" data-item-id="${escape(item.id)}" aria-label="${escape(item.name)}, item level ${item.itemLevel}, ${roleLabel(item)} · ${itemEraLabel(item)}"><span class="gear-slot is-equipped" ${itemBorderAttributes(item)}>${itemIcon(item)}</span></button>`).join('');
  const label = isElite ? 'Elite Choice' : 'Boss Bonus';
  const description = isElite ? `${Math.round(ELITE_REWARD_CHANCE * 100)}% chance to choose one eligible item from this elite’s reward table. Owned items are excluded.` : 'This boss can drop one additional eligible item from this chapter.';
  const mystery = `<button type="button" class="loot-reward boss-bonus-reward" aria-label="${label}. ${description}" aria-describedby="boss-bonus-tooltip" aria-expanded="false"><span class="gear-slot is-equipped boss-bonus-mystery" aria-hidden="true">?</span><span class="boss-bonus-tooltip" id="boss-bonus-tooltip" role="tooltip"><strong>${label}</strong><span>${description}</span></span></button>`;
  return `<div class="loot-rewards">${items(normal)}${isBoss || isElite ? mystery : ''}${!normal.length ? '<p class="empty-loot">No eligible normal loot remains.</p>' : ''}</div>`;
}
