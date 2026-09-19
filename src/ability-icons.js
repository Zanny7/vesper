import { compactKeybind } from './ability-presentation.js';

const icons = {
  spark: '<path d="M20 2 24 15 37 19 24 23 20 37 16 23 3 19 16 15Z"/><path d="m30 3 1.5 5 5 1.5-5 1.5-1.5 5-1.5-5-5-1.5 5-1.5Z"/>',
  sun: '<circle cx="20" cy="20" r="9"/><circle cx="20" cy="20" r="4"/><path d="M20 1v7m0 24v7M1 20h7m24 0h7M6 6l5 5m18 18 5 5M6 34l5-5M29 11l5-5"/>',
  wings: '<path d="M20 32C7 30 3 22 3 9l12 10M20 32c13-2 17-10 17-23L25 19M6 17l9 7M34 17l-9 7M20 7v19m-6-12h12"/>',
  bolts: '<path d="m10 3 4 9-5 10 10-7-3-9Zm11 7 4 9-5 10 10-7-3-9Zm9 7 4 9-5 10 10-7-3-9Z"/>',
};

export function abilityIcon(spell) {
  return `<div class="spell-icon" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none" stroke="${spell.color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${icons[spell.icon] || icons.spark}</svg></div><kbd aria-hidden="true">${compactKeybind(spell.key)}</kbd>`;
}
