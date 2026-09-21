import { HEALERS, partyForHealer, GEAR, SLOTS } from './data.js';
import { slotsForOwner, eligibleItems } from './item-model.js';
export { GEAR, SLOTS } from './data.js';

const storageKey = 'vesper-equipment-v2';

const ownerFor = member => member.id;
const isRecord = value => value && typeof value === 'object' && !Array.isArray(value);
export function validEquipment(saved = {}, catalogue = GEAR) {
  const out = {};
  for (const item of catalogue) if (saved[item.owner]?.[item.slot] === item.id) (out[item.owner] ||= {})[item.slot] = item.id;
  return out;
}
export class Equipment {
  constructor(storage, isLocked = () => false, catalogue = GEAR) {
    this.isLocked = isLocked;
    this.catalogue = catalogue;
    this.itemById = id => catalogue.find(item => item.id === id) || null;
    this.storage = storage; this.equipped = {}; this.ownedIds = new Set();
    try {
      const raw = storage?.getItem(storageKey);
      if (raw != null) {
        const saved = JSON.parse(raw);
        if (saved?.version === 2 && isRecord(saved)) {
          this.ownedIds = new Set((Array.isArray(saved.owned) ? saved.owned : []).filter(id => this.itemById(id)));
          this.equipped = validEquipment(isRecord(saved.equipped) ? saved.equipped : {}, catalogue);
          for (const slots of Object.values(this.equipped)) for (const [slot, id] of Object.entries(slots)) if (!this.owns(id)) delete slots[slot];
        }
      } else {
        const legacy = JSON.parse(storage?.getItem('vesper-equipment-v1') || 'null');
        this.equipped = validEquipment(isRecord(legacy) ? legacy : {}, catalogue);
        this.ownedIds = new Set(Object.values(this.equipped).flatMap(slots => Object.values(slots)));
        if (legacy != null) this.save();
      }
    } catch { /* Malformed storage starts an empty session. */ }
  }
  save() { try { this.storage?.setItem(storageKey, JSON.stringify({ version: 2, owned: [...this.ownedIds], equipped: this.equipped })); } catch { /* Keep the session selection. */ } }
  owns(id) { return this.ownedIds.has(id); }
  acquire(id) {
    if (!this.itemById(id) || this.owns(id)) return false;
    this.ownedIds.add(id); this.save(); return true;
  }
  slots(member) { return slotsForOwner(member.id); }
  item(member, slot) { return this.catalogue.find(item => item.id === this.equipped[ownerFor(member)]?.[slot]) || null; }
  owned(member, slot) { return eligibleItems(ownerFor(member), slot, this.catalogue).filter(item => this.owns(item.id)); }
  collection() { return this.catalogue.filter(item => this.owns(item.id)); }
  isEquipped(item) { return this.equipped[item.owner]?.[item.slot] === item.id; }
  equip(member, slot, id) {
    if (this.isLocked() || !this.slots(member).includes(slot)) return false;
    const item = this.owned(member, slot).find(candidate => candidate.id === id);
    const owner = ownerFor(member); (this.equipped[owner] ||= {});
    if (!item && id) return false;
    if (!item) { delete this.equipped[owner][slot]; } else this.equipped[owner][slot] = item.id;
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
