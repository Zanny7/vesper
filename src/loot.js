import { CHAPTERS, GEAR } from './data.js';
import { canEquipItem } from './item-model.js';

export const NORMAL_DROP_WEIGHTS = Object.freeze({ healer: 0.3, tank: 0.175, rogue: 0.175, mage: 0.175, ranger: 0.175 });
// Hundredth-percent units represent the documented percentages exactly and
// keep exact cumulative boundaries out of floating-point weight summation.
const NORMAL_DROP_WEIGHT_UNITS = Object.freeze({ healer: 3000, tank: 1750, rogue: 1750, mage: 1750, ranger: 1750 });
const OWNERS = ['priest', 'druid', 'tank', 'rogue', 'mage', 'ranger'];

// Each encounter lists one chapter-appropriate item for every possible recipient.
// The rotation keeps route rewards distinct while leaving item values in data.js.
export function buildNormalLootTables(chapters = CHAPTERS, catalogue = GEAR) {
  const tables = {};
  for (const [chapterIndex, chapter] of chapters.entries()) {
    const chapterNumber = chapterIndex + 1;
    const byOwner = Object.fromEntries(OWNERS.map(owner => [owner, catalogue.filter(item => item.chapter === chapterNumber && item.owner === owner)]));
    chapter.nodes.forEach((node, encounterIndex) => {
      tables[node.encounter] = OWNERS.flatMap((owner, ownerIndex) => {
        const items = byOwner[owner];
        return items.length ? [items[(encounterIndex + ownerIndex) % items.length].id] : [];
      });
    });
  }
  return tables;
}

export const NORMAL_LOOT_TABLES = Object.freeze(buildNormalLootTables());
export const normalLootForEncounter = (encounterId, catalogue = GEAR) => (NORMAL_LOOT_TABLES[encounterId] || []).map(id => catalogue.find(item => item.id === id)).filter(Boolean);

const categoryFor = (item, healerId) => {
  if (canEquipItem(healerId, item.slot, item)) return 'healer';
  return ['tank', 'rogue', 'mage', 'ranger'].includes(item.owner) && canEquipItem(item.owner, item.slot, item) ? item.owner : null;
};

// Keep the preview and both normal and bonus reward rolls on the same rules.
// A preview shows all items that can be selected, regardless of drop count.
export function eligibleLootPool(table, ownedIds, healerId, catalogue = GEAR) {
  const byId = new Map(catalogue.map(item => [item.id, item]));
  const owned = new Set(ownedIds || []);
  return (table || []).map(id => byId.get(id)).filter(item => item && !owned.has(item.id) && categoryFor(item, healerId));
}

export function eligibleNormalLootForEncounter(encounterId, ownedIds, healerId, catalogue = GEAR) {
  return eligibleLootPool(NORMAL_LOOT_TABLES[encounterId], ownedIds, healerId, catalogue);
}

// Boss rewards are intentionally absent from the encounter preview.  They draw
// from the chapter's remaining catalogue, so beating a boss can uncover gear
// that was not advertised by the ordinary route reward list.
export function buildBossBonusLootTables(chapters = CHAPTERS, catalogue = GEAR, normalTables = buildNormalLootTables(chapters, catalogue)) {
  return Object.fromEntries(chapters.flatMap((chapter, chapterIndex) => chapter.nodes
    .filter(node => node.kind === 'boss')
    .map(node => [node.encounter, catalogue
      .filter(item => item.chapter === chapterIndex + 1 && !normalTables[node.encounter]?.includes(item.id))
      .map(item => item.id)])));
}

export const BOSS_BONUS_LOOT_TABLES = Object.freeze(buildBossBonusLootTables());

export function normalDropCount(rng = Math.random) {
  const roll = rng();
  return roll < 0.5 ? 0 : roll < 0.85 ? 1 : 2;
}

function chooseWeightedLoot(table, ownedIds, healerId, rng = Math.random, catalogue = GEAR) {
  const pool = eligibleLootPool(table, ownedIds, healerId, catalogue);
  if (!pool.length) return null;
  const categories = [...new Set(pool.map(item => categoryFor(item, healerId)))];
  const totalWeightUnits = categories.reduce((sum, category) => sum + NORMAL_DROP_WEIGHT_UNITS[category], 0);
  const categoryRoll = rng() * totalWeightUnits;
  let cumulativeWeightUnits = 0;
  let chosenCategory = categories.at(-1);
  for (const category of categories) {
    cumulativeWeightUnits += NORMAL_DROP_WEIGHT_UNITS[category];
    if (categoryRoll < cumulativeWeightUnits) { chosenCategory = category; break; }
  }
  const candidates = pool.filter(item => categoryFor(item, healerId) === chosenCategory);
  return candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))];
}

export function rollNormalLoot(table, ownedIds, healerId, rng = Math.random, catalogue = GEAR) {
  const owned = new Set(ownedIds || []);
  const rewards = [];
  for (let count = normalDropCount(rng); count > 0; count--) {
    const item = chooseWeightedLoot(table, owned, healerId, rng, catalogue);
    if (!item) break;
    rewards.push(item); owned.add(item.id);
  }
  return rewards;
}

// A chapter boss guarantees one additional reward when an eligible item remains.
// The caller combines it with normal loot only after a validated victory.
export function rollBossBonusLoot(table, ownedIds, healerId, rng = Math.random, catalogue = GEAR) {
  const item = chooseWeightedLoot(table, ownedIds, healerId, rng, catalogue);
  return item ? [item] : [];
}
