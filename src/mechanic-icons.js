const CATEGORY_ICONS = Object.freeze({
  physical: '<path d="M12 5 5 8v7c0 5 4 8 7 10 3-2 7-5 7-10V8l-7-3Z"/><path d="m9 15 2-2 2 2 3-4"/>',
  aoe: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1m0-14.2L17 7M7 17l-2.1 2.1"/>',
  bleed: '<path d="M12 3s-6 7-6 12a6 6 0 0 0 12 0c0-5-6-12-6-12Z"/><path d="M9 16a3 3 0 0 0 3 3"/>',
  magic: '<path d="m12 2 2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3L12 2Z"/><path d="M19 2v4m-2-2h4"/>',
  chaos: '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7a5 5 0 1 0 5 5"/><path d="M12 11a1 1 0 1 0 1 1m0-10v5m8-4-4 4"/>',
  adds: '<circle cx="12" cy="8" r="3"/><circle cx="5" cy="11" r="2"/><circle cx="19" cy="11" r="2"/><path d="M6 21v-2a6 6 0 0 1 12 0v2m-16 0v-2a4 4 0 0 1 3-4m13 6v-2a4 4 0 0 0-3-4"/>',
});

export function mechanicCategory(mechanic = {}) {
  const category = mechanic.iconCategory || mechanic.category;
  if (category && CATEGORY_ICONS[category]) return category;
  const text = `${mechanic.id || ''} ${mechanic.name || ''} ${mechanic.hint || ''}`.toLowerCase();
  if (/\bchaos\b/.test(text)) return 'chaos';
  if (/\b(?:bleed|blood|wound|thorns|barbed|maul)\b/.test(text)) return 'bleed';
  if (/\b(?:magic|arcane|curse|mark)\b/.test(text)) return 'magic';
  if (mechanic.target === 'party') return 'aoe';
  if (mechanic.target === 'tank' || (mechanic.count || 1) > 1) return 'physical';
  return mechanic.dot ? 'magic' : 'physical';
}

export function mechanicIcon(category) {
  const icon = CATEGORY_ICONS[category] || CATEGORY_ICONS.physical;
  return `<svg class="mechanic-icon mechanic-icon--${category in CATEGORY_ICONS ? category : 'physical'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg>`;
}
