import { GEAR, SLOTS, HEALERS, CHAPTERS } from './data.js';

export const ITEM_STATS = {
  healer: ['maxMana', 'manaRegen', 'spellPower', 'haste', 'crit'],
  defensive: ['maxHp', 'armor', 'resistance'],
  offensive: ['damage'],
};
export const isHealerOwner = owner => Object.hasOwn(HEALERS, owner);
// Character ids remain separate from authored equipment roles.
export const ITEM_OWNERS = ['priest', 'druid', 'shaman', 'tank', 'rogue', 'mage', 'ranger'];
export const slotsForOwner = owner => isHealerOwner(owner) ? SLOTS.healer : ITEM_OWNERS.includes(owner) ? SLOTS[owner] : [];
export const ITEM_ROLES = Object.freeze({ all: 'All', healer: 'Healer', tank: 'Tank', damage: 'Damage' });
export const roleLabel = item => `Role: ${Object.hasOwn(ITEM_ROLES, item?.role) ? ITEM_ROLES[item.role] : 'Unknown'}`;
const armorSlots = ['Head', 'Chest', 'Legs'];
export function statsForItem(item) {
  if (item.role === 'all' && armorSlots.includes(item.slot)) return ITEM_STATS.defensive;
  if (item.role === 'healer' && ['Weapon', 'Tome', 'Trinket'].includes(item.slot)) return ITEM_STATS.healer;
  if (item.role === 'tank') return item.slot === 'Weapon' ? ITEM_STATS.offensive : ['Shield', 'Trinket'].includes(item.slot) ? ITEM_STATS.defensive : [];
  if (item.role === 'damage' && ['Sword', 'Staff', 'Bow', 'Trinket'].includes(item.slot)) return ITEM_STATS.offensive;
  return [];
}
// Pure validation is reusable for authoring tools and future loot tables.
export function validateCatalogue(items) {
  const errors = [], ids = new Set();
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) { errors.push('invalid item'); continue; }
    const fail = message => errors.push(`${item.id || '(missing id)'}: ${message}`);
    if (!/^[a-z0-9-]+$/.test(item.id || '') || ids.has(item.id)) fail('missing, invalid or duplicate id');
    ids.add(item.id);
    const allowed = statsForItem(item);
    if (!allowed.length) fail('invalid role or slot');
    if (item.role === 'damage' && item.slot !== 'Trinket') {
      if (!['rogue', 'mage', 'ranger'].includes(item.owner) || SLOTS[item.owner][0] !== item.slot) fail('invalid weapon owner');
    } else if (item.owner !== undefined) fail('shared items must not have a character owner');
    if (!Number.isInteger(item.itemLevel) || item.itemLevel < 1) fail('invalid item level');
    if (!CHAPTERS.some(chapter => chapter.ordinal === item.chapter)) fail('invalid chapter');
    for (const key of ['name', 'icon']) if (typeof item[key] !== 'string' || !item[key].trim()) fail(`missing ${key}`);
    if (item.flavor !== undefined && typeof item.flavor !== 'string') fail('invalid flavor');
    if (!item.stats || Array.isArray(item.stats) || !Object.keys(item.stats).length) fail('missing stats');
    else for (const [stat, value] of Object.entries(item.stats)) {
      if (!allowed.includes(stat) || !Number.isFinite(value) || value <= 0) fail(`invalid stat ${stat}`);
      if (['haste', 'crit'].includes(stat) && (item.chapter < 3 || value > 3)) fail(`secondary stat outside chapter budget: ${stat}`);
    }
  }
  return errors;
}
export const ITEM_BY_ID = new Map(GEAR.map(item => [item.id, item]));
export const itemById = id => ITEM_BY_ID.get(id) || null;
export const UNIVERSAL_SLOTS = new Set(armorSlots);
export function canEquipItem(owner, slot, item) {
  if (!item || !slotsForOwner(owner).includes(slot) || item.slot !== slot) return false;
  if (!statsForItem(item).length) return false;
  if (item.role === 'all') return UNIVERSAL_SLOTS.has(slot);
  if (item.role === 'healer') return isHealerOwner(owner);
  if (item.role === 'tank') return owner === 'tank';
  return item.role === 'damage' && ['rogue', 'mage', 'ranger'].includes(owner) && (slot === 'Trinket' || item.owner === owner);
}
export const eligibleItems = (owner, slot, items = GEAR) => items.filter(item => canEquipItem(owner, slot || item.slot, item));
export const unownedItems = (items, ownedIds) => items.filter(item => !ownedIds.has(item.id));
export function averageItemLevel(member, equipped, catalogue = GEAR) {
  const slots = slotsForOwner(member.id);
  if (!slots.length) return 0;
  return slots.reduce((sum, slot) => {
    const item = catalogue.find(item => item.id === equipped?.[member.id]?.[slot]);
    return sum + (canEquipItem(member.id, slot, item) ? item.itemLevel : 0);
  }, 0) / slots.length;
}
