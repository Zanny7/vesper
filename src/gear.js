import { HEALERS, partyForHealer, GEAR, SLOTS, GEAR_ID_MIGRATIONS, ERA2_ELITE_LOOT_TABLES } from './data.js';
import { slotsForOwner, eligibleItems, canEquipItem } from './item-model.js';
export { GEAR, SLOTS } from './data.js';

const storageKey = 'vesper-equipment-v2';

const ownerFor = member => member.id;
const isRecord = value => value && typeof value === 'object' && !Array.isArray(value);
const migratedId = (id, catalogue) => catalogue.some(item => item.id === id) ? id : Object.hasOwn(GEAR_ID_MIGRATIONS, id) ? GEAR_ID_MIGRATIONS[id] : id;
function migratedAssignments(saved, catalogue, activeHealer) {
  const entries = Object.entries(isRecord(saved) ? saved : {});
  // Save iteration order breaks ties after the active healer's assignments.
  entries.sort(([a], [b]) => Number(b === activeHealer) - Number(a === activeHealer));
  return Object.fromEntries(entries.map(([owner, slots]) => [owner,
    Object.fromEntries(Object.entries(isRecord(slots) ? slots : {}).map(([slot, id]) => [slot, migratedId(id, catalogue)]))]));
}
export function validEquipment(saved = {}, catalogue = GEAR) {
  const out = {};
  for (const [owner, slots] of Object.entries(saved)) for (const [slot, id] of Object.entries(isRecord(slots) ? slots : {})) {
    const item = catalogue.find(candidate => candidate.id === id);
    if (item && canEquipItem(owner, slot, item) && !Object.values(out).some(equipped => Object.values(equipped).includes(id))) (out[owner] ||= {})[slot] = id;
  }
  return out;
}
export class Equipment {
  constructor(storage, isLocked = () => false, catalogue = GEAR) {
    this.isLocked = isLocked;
    this.catalogue = catalogue;
    this.itemById = id => catalogue.find(item => item.id === id) || null;
    this.storage = storage; this.equipped = {}; this.ownedIds = new Set(); this.bagSlots = []; this.eliteRewards = Object.create(null);
    try {
      const raw = storage?.getItem(storageKey);
      if (raw != null) {
        const saved = JSON.parse(raw);
        if ([2, 3, 4, 5].includes(saved?.version) && isRecord(saved)) {
          const migrate = id => migratedId(id, catalogue);
          this.ownedIds = new Set((Array.isArray(saved.owned) ? saved.owned : []).map(migrate).filter(id => this.itemById(id)));
          const assignments = migratedAssignments(saved.equipped, catalogue, storage?.getItem('vesper-active-healer-v1'));
          this.equipped = validEquipment(assignments, catalogue);
          for (const slots of Object.values(this.equipped)) for (const [slot, id] of Object.entries(slots)) if (!this.owns(id)) delete slots[slot];
          const equipped = new Set(Object.values(this.equipped).flatMap(slots => Object.values(slots)));
          const savedBag = Array.isArray(saved.bag) ? saved.bag : [];
          const bagged = new Set();
          this.bagSlots = savedBag.map(migrate).map(id => {
            if (!id || !this.owns(id) || equipped.has(id) || bagged.has(id)) return null;
            bagged.add(id); return id;
          });
          for (const id of this.ownedIds) if (!equipped.has(id) && !this.bagSlots.includes(id)) this.placeInBag(id);
          for (const [id, reward] of Object.entries(isRecord(saved.eliteRewards) ? saved.eliteRewards : {})) {
            const table = ERA2_ELITE_LOOT_TABLES[reward?.encounter];
            if (!id || !Array.isArray(table) || !['pending', 'claimed', 'failed', 'exhausted'].includes(reward.status)) continue;
            const choices = [...new Set(Array.isArray(reward.choices) ? reward.choices : [])].filter(itemId => table.includes(itemId) && this.itemById(itemId));
            if (reward.status === 'pending' && !choices.length) continue;
            if (reward.status === 'claimed' && (!table.includes(reward.chosen) || !this.itemById(reward.chosen))) continue;
            this.eliteRewards[id] = { encounter: reward.encounter, status: reward.status, choices, ...(reward.status === 'claimed' ? { chosen: reward.chosen } : {}) };
          }
          this.save();
        }
      } else {
        const legacy = JSON.parse(storage?.getItem('vesper-equipment-v1') || 'null');
        const migrated = migratedAssignments(legacy, catalogue, storage?.getItem('vesper-active-healer-v1'));
        this.equipped = validEquipment(migrated, catalogue);
        this.ownedIds = new Set(Object.values(this.equipped).flatMap(slots => Object.values(slots)));
        if (legacy != null) this.save();
      }
    } catch { /* Malformed storage starts an empty session. */ }
  }
  save() { try { this.storage?.setItem(storageKey, JSON.stringify({ version: 5, owned: [...this.ownedIds], equipped: this.equipped, bag: this.bagSlots, eliteRewards: this.eliteRewards })); } catch { /* Keep the session selection. */ } }
  recordEliteReward(id, encounter, roll) {
    if (!id || Object.hasOwn(this.eliteRewards, id) || !Array.isArray(ERA2_ELITE_LOOT_TABLES[encounter])) return false;
    const choices = roll.items.map(item => item.id).filter(itemId => ERA2_ELITE_LOOT_TABLES[encounter].includes(itemId) && this.itemById(itemId) && !this.owns(itemId));
    this.eliteRewards[id] = { encounter, choices: [...new Set(choices)], status: !roll.succeeded ? 'failed' : choices.length ? 'pending' : 'exhausted' };
    this.save(); return true;
  }
  pendingEliteRewards() {
    return Object.entries(this.eliteRewards).filter(([, reward]) => reward.status === 'pending').map(([id, reward]) => ({ id, ...reward,
      items: reward.choices.map(itemId => this.itemById(itemId)).filter(item => item && !this.owns(item.id)),
    }));
  }
  claimEliteReward(id, chosen) {
    const reward = this.eliteRewards[id], item = this.itemById(chosen);
    if (this.isLocked() || reward?.status !== 'pending' || !reward.choices.includes(chosen) || !item || this.owns(chosen)) return null;
    // Ownership and the spent claim are persisted in one inventory write.
    this.ownedIds.add(chosen); this.placeInBag(chosen);
    reward.status = 'claimed'; reward.chosen = chosen; this.save(); return item;
  }
  dismissExhaustedEliteReward(id) {
    const reward = this.pendingEliteRewards().find(reward => reward.id === id);
    if (!reward || reward.items.length) return false;
    this.eliteRewards[id].status = 'exhausted'; this.save(); return true;
  }
  switchHealer(from, to) {
    if (this.isLocked() || from === to || !Object.hasOwn(HEALERS, from) || !Object.hasOwn(HEALERS, to)) return false;
    for (const [slot, id] of Object.entries(this.equipped[from] || {})) {
      if (!canEquipItem(to, slot, this.itemById(id))) continue;
      const displaced = this.equipped[to]?.[slot];
      delete this.equipped[from][slot];
      (this.equipped[to] ||= {})[slot] = id;
      if (displaced && displaced !== id) this.placeInBag(displaced);
    }
    if (this.equipped[from] && !Object.keys(this.equipped[from]).length) delete this.equipped[from];
    this.save(); return true;
  }
  ensureBagCapacity(index) { const capacity = Math.max(20, Math.ceil((index + 1) / 20) * 20); while (this.bagSlots.length < capacity) this.bagSlots.push(null); }
  placeInBag(id, preferredIndex = null) {
    if (this.bagSlots.includes(id)) return this.bagSlots.indexOf(id);
    if (preferredIndex !== null && preferredIndex >= 0) {
      this.ensureBagCapacity(preferredIndex);
      if (!this.bagSlots[preferredIndex]) { this.bagSlots[preferredIndex] = id; return preferredIndex; }
    }
    this.ensureBagCapacity(Math.max(0, this.bagSlots.length - 1));
    const last = this.bagSlots.reduce((found, value, index) => value ? index : found, -1);
    let index = last + 1;
    if (index >= this.bagSlots.length || this.bagSlots[index]) index = this.bagSlots.findIndex(value => !value);
    if (index < 0) { index = this.bagSlots.length; this.ensureBagCapacity(index); }
    this.bagSlots[index] = id; return index;
  }
  bagItem(index) { return this.itemById(this.bagSlots[index]); }
  bagEntries() { return this.bagSlots.map((id, index) => id ? { index, item: this.itemById(id) } : null).filter(Boolean); }
  owns(id) { return this.ownedIds.has(id); }
  acquire(id) {
    if (!this.itemById(id) || this.owns(id)) return false;
    this.ownedIds.add(id); this.placeInBag(id); this.save(); return true;
  }
  slots(member) { return slotsForOwner(member.id); }
  item(member, slot) { return this.catalogue.find(item => item.id === this.equipped[ownerFor(member)]?.[slot]) || null; }
  owned(member, slot) {
    return eligibleItems(ownerFor(member), slot, this.catalogue).filter(item => {
      if (!this.owns(item.id)) return false;
      const assigned = this.equippedAt(item.id);
      return !assigned || (assigned.owner === ownerFor(member) && assigned.slot === slot);
    });
  }
  collection() { return this.catalogue.filter(item => this.owns(item.id)); }
  isEquipped(item) { return Object.values(this.equipped).some(slots => Object.values(slots).includes(item.id)); }
  equippedAt(id) { for (const [owner, slots] of Object.entries(this.equipped)) for (const [slot, itemId] of Object.entries(slots)) if (itemId === id) return { owner, slot }; return null; }
  unequipToBag(member, slot, index) {
    if (this.isLocked() || !this.slots(member).includes(slot) || !Number.isInteger(index) || index < 0 || this.bagSlots[index]) return false;
    const owner = ownerFor(member), id = this.equipped[owner]?.[slot];
    if (!id) return false;
    delete this.equipped[owner][slot]; if (!Object.keys(this.equipped[owner]).length) delete this.equipped[owner];
    this.ensureBagCapacity(index); this.bagSlots[index] = id; this.save(); return true;
  }
  discard(id) {
    if (this.isLocked() || !this.owns(id) || this.equippedAt(id)) return false;
    const index = this.bagSlots.indexOf(id); if (index >= 0) this.bagSlots[index] = null;
    this.ownedIds.delete(id); this.save(); return true;
  }
  equip(member, slot, id) {
    if (this.isLocked() || !this.slots(member).includes(slot)) return false;
    const item = this.owned(member, slot).find(candidate => candidate.id === id);
    const owner = ownerFor(member);
    if (!item && id) return false;
    const currentId = this.equipped[owner]?.[slot];
    if (item?.id === currentId) return true;
    if (item && this.equippedAt(item.id) && currentId !== item.id) return false;
    const bagIndex = item ? this.bagSlots.indexOf(item.id) : -1;
    if (bagIndex >= 0) this.bagSlots[bagIndex] = null;
    if (currentId) { delete this.equipped[owner][slot]; if (currentId !== item?.id) this.placeInBag(currentId, bagIndex >= 0 ? bagIndex : null); }
    if (item) {
      (this.equipped[owner] ||= {});
      this.equipped[owner][slot] = item.id;
    }
    if (this.equipped[owner] && !Object.keys(this.equipped[owner]).length) delete this.equipped[owner];
    this.save(); return true;
  }
  apply(member) {
    const bonuses = Object.values(this.equipped[ownerFor(member)] || {}).map(id => this.catalogue.find(item => item.id === id)).filter(Boolean).reduce((total, item) => {
      for (const [stat, value] of Object.entries(item.stats)) total[stat] = (total[stat] || 0) + value;
      return total;
    }, {});
    const result = { ...member };
    for (const [stat, value] of Object.entries(bonuses)) result[stat] = (result[stat] || 0) + value;
    return result;
  }
  party(healerId) { return partyForHealer(healerId).map(member => this.apply(member)); }
  healer(healerId) { return this.apply(HEALERS[healerId] || HEALERS.priest); }
}
