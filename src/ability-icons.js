import { compactKeybind } from './ability-presentation.js';

const icons = {
  wound: '<path d="m25 3-15 17h11l-7 17L32 16H20ZM5 8l4 3M32 30l4 3"/>',
  shield: '<path d="m20 3 14 5v12c0 8-8 14-14 17C14 34 6 28 6 20V8ZM20 11v17M12 19h16"/>',
  wardBloom: '<path d="M20 4v29M20 18C11 5 6 8 7 19c1 5 7 6 13 6M20 18c9-13 14-10 13 1-1 5-7 6-13 6M11 34h18M15 30l5 4 5-4"/>',
  leaf: '<path d="M8 32C-1 13 17 5 34 5c0 19-9 32-26 27ZM8 32 28 11M16 24l-1-9m8 2 8 1"/>',
  sprout: '<path d="M20 36V18M20 25C5 25 5 13 5 10c12 0 15 7 15 15ZM20 18C20 7 28 4 36 4c0 10-6 16-16 14M10 36h20"/>',
  bloom: '<path d="M20 4c8 5 6 10 0 16-6-6-8-11 0-16ZM36 20c-5 8-10 6-16 0 6-6 11-8 16 0ZM20 36c-8-5-6-10 0-16 6 6 8 11 0 16ZM4 20c5-8 10-6 16 0-6 6-11 8-16 0Z"/>',
  grove: '<path d="M20 3 10 19h6L8 29h24l-8-10h6ZM20 29v8M7 12 2 23h5l-4 8h5M33 12l5 11h-5l4 8h-5"/>',
  seed: '<path d="M20 35C2 30 8 10 20 4c12 6 18 26 0 31ZM20 13v22M13 21l7 7 7-7"/>',
  spark: '<path d="M20 2 24 15 37 19 24 23 20 37 16 23 3 19 16 15Z"/><path d="m30 3 1.5 5 5 1.5-5 1.5-1.5 5-1.5-5-5-1.5 5-1.5Z"/>',
  sun: '<circle cx="20" cy="20" r="9"/><circle cx="20" cy="20" r="4"/><path d="M20 1v7m0 24v7M1 20h7m24 0h7M6 6l5 5m18 18 5 5M6 34l5-5M29 11l5-5"/>',
  wings: '<path d="M20 32C7 30 3 22 3 9l12 10M20 32c13-2 17-10 17-23L25 19M6 17l9 7M34 17l-9 7M20 7v19m-6-12h12"/>',
  bolts: '<path d="m10 3 4 9-5 10 10-7-3-9Zm11 7 4 9-5 10 10-7-3-9Zm9 7 4 9-5 10 10-7-3-9Z"/>',
  smite: '<path d="M20 2v36M7 13h26M11 31l9 7 9-7"/>',
  holyFire: '<path d="M20 3c8 9 11 15 8 23-2 7-13 10-18 3-5-8 2-14 8-20 0 7 8 8 2 18 8-5 5-14 0-24Z"/>',
};

export function abilityIcon(spell) {
  return `<div class="spell-icon" aria-hidden="true">${effectGlyph(spell, 1.4)}</div><kbd aria-hidden="true">${compactKeybind(spell.key)}</kbd>`;
}

export function effectGlyph(effect, strokeWidth = 1.8) {
  return `<svg viewBox="0 0 40 40" fill="none" stroke="${effect.color || 'currentColor'}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[effect.icon] || icons.spark}</svg>`;
}
