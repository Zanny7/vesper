import { CHAPTERS, GEAR } from './data.js';

export const NORMAL_DROP_WEIGHTS = Object.freeze({ healer: 0.3, tank: 0.175, rogue: 0.175, mage: 0.175, ranger: 0.175 });
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

const categoryFor = (item, healerId) => item.owner === healerId ? 'healer' : ['tank', 'rogue', 'mage', 'ranger'].includes(item.owner) ? item.owner : null;

function chooseWeightedLoot(table, ownedIds, healerId, rng = Math.random, catalogue = GEAR) {
  const byId = new Map(catalogue.map(item => [item.id, item]));
  const owned = new Set(ownedIds || []);
  const pool = (table || []).map(id => byId.get(id)).filter(item => item && !owned.has(item.id) && categoryFor(item, healerId));
  if (!pool.length) return null;
  const categories = [...new Set(pool.map(item => categoryFor(item, healerId)))];
  const totalWeight = categories.reduce((sum, category) => sum + NORMAL_DROP_WEIGHTS[category], 0);
  let categoryRoll = rng() * totalWeight;
  let chosenCategory = categories.at(-1);
  for (const category of categories) {
    categoryRoll -= NORMAL_DROP_WEIGHTS[category];
    if (categoryRoll < 0) { chosenCategory = category; break; }
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
