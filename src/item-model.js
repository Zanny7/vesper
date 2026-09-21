import { GEAR, SLOTS } from './data.js';

export const ITEM_STATS = {
  healer: ['maxHp', 'maxMana', 'manaRegen', 'spellPower', 'haste', 'crit', 'armor', 'resistance'],
  companion: ['maxHp', 'armor', 'resistance', 'damage'],
};
export const isHealerOwner = owner => owner === 'priest' || owner === 'druid';
export const ITEM_OWNERS = ['priest', 'druid', 'tank', 'rogue', 'mage', 'ranger'];
export const slotsForOwner = owner => ITEM_OWNERS.includes(owner) ? SLOTS[isHealerOwner(owner) ? 'healer' : owner] : [];
// Pure validation is reusable for authoring tools and future loot tables.
export function validateCatalogue(items) {
  const errors = [], ids = new Set();
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) { errors.push('invalid item'); continue; }
    const fail = message => errors.push(`${item.id || '(missing id)'}: ${message}`);
    if (!/^[a-z0-9-]+$/.test(item.id || '') || ids.has(item.id)) fail('missing, invalid or duplicate id');
    ids.add(item.id);
    if (!slotsForOwner(item.owner).includes(item.slot)) fail('invalid owner or slot');
    if (!Number.isInteger(item.itemLevel) || item.itemLevel < 1) fail('invalid item level');
    if (![1, 2, 3, 4].includes(item.chapter)) fail('invalid chapter');
    for (const key of ['name', 'icon']) if (typeof item[key] !== 'string' || !item[key].trim()) fail(`missing ${key}`);
    if (item.flavor !== undefined && typeof item.flavor !== 'string') fail('invalid flavor');
    const allowed = ITEM_STATS[isHealerOwner(item.owner) ? 'healer' : 'companion'];
    if (!item.stats || Array.isArray(item.stats) || !Object.keys(item.stats).length) fail('missing stats');
    else for (const [stat, value] of Object.entries(item.stats)) {
      if (!allowed.includes(stat) || !Number.isFinite(value) || value < 0) fail(`invalid stat ${stat}`);
    }
  }
  return errors;
}
export const ITEM_BY_ID = new Map(GEAR.map(item => [item.id, item]));
export const itemById = id => ITEM_BY_ID.get(id) || null;
export const eligibleItems = (owner, slot, items = GEAR) => items.filter(item => item.owner === owner && (!slot || item.slot === slot));
export const unownedItems = (items, ownedIds) => items.filter(item => !ownedIds.has(item.id));
export function averageItemLevel(member, equipped, catalogue = GEAR) {
  const slots = slotsForOwner(member.id);
  if (!slots.length) return 0;
  return slots.reduce((sum, slot) => {
    const item = catalogue.find(item => item.id === equipped?.[member.id]?.[slot]);
    return sum + (item?.owner === member.id && item.slot === slot ? item.itemLevel : 0);
  }, 0) / slots.length;
}
