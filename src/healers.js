import { HEALERS, partyForHealer } from './data.js';

const storageKey = 'vesper-active-healer-v1';

export function restoreActiveHealer(saved) {
  return Object.hasOwn(HEALERS, saved) ? saved : 'priest';
}

export function loadActiveHealer() {
  try { return restoreActiveHealer(localStorage.getItem(storageKey)); } catch { return 'priest'; }
}

export function saveActiveHealer(id) {
  const active = restoreActiveHealer(id);
  try { localStorage.setItem(storageKey, active); } catch { /* The selected healer still works for this session. */ }
  return active;
}

export const activeHealer = id => HEALERS[restoreActiveHealer(id)];
export const activeParty = id => partyForHealer(restoreActiveHealer(id));

export function healerHint(text, id) {
  if (id !== 'druid' || !/Flash Heal|Greater Heal|Prayer|Penance|Post-Haste/.test(text)) return text;
  return 'Keep Rejuvenation and Regrowth on allies under pressure. Use Wild Growth for party wounds, Nourish for prepared targets, and Swiftmend for an urgent burst.';
}
