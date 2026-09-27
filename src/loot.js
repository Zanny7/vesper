import { CHAPTERS, GEAR, GEAR_LOOT_WEIGHTS } from './data.js';
import { canEquipItem } from './item-model.js';

// Armor is its own category. Item count cannot dilute shared throughput rewards.
export const NORMAL_DROP_WEIGHTS = GEAR_LOOT_WEIGHTS;
// Hundredth-percent units represent the documented percentages exactly and
// keep exact cumulative boundaries out of floating-point weight summation.
const NORMAL_DROP_WEIGHT_UNITS = Object.freeze(Object.fromEntries(Object.entries(NORMAL_DROP_WEIGHTS).map(([role, weight]) => [role, Math.round(weight * 10000)])));
const ROLES = Object.keys(NORMAL_DROP_WEIGHTS);

// Every normal encounter offers each role. Depth rotates healer slots, so both
// branches at a fork offer the same slot; armor rotates independent of healers.
export function buildNormalLootTables(chapters = CHAPTERS, catalogue = GEAR) {
  const tables = {};
  for (const [chapterIndex, chapter] of chapters.entries()) {
    const chapterNumber = chapter.ordinal ?? chapterIndex + 1;
    const items = catalogue.filter(item => item.chapter === chapterNumber);
    const depthById = new Map();
    const depth = node => {
      if (depthById.has(node.id)) return depthById.get(node.id);
      const value = node.from.length ? 1 + Math.max(...node.from.map(id => depth(chapter.nodes.find(candidate => candidate.id === id)))) : 0;
      depthById.set(node.id, value);
      return value;
    };
    chapter.nodes.forEach((node, encounterIndex) => {
      if (!node.encounter) return;
      const choose = (pool, index) => pool.length ? [pool[index % pool.length].id] : [];
      const healerSlot = ['Weapon', 'Tome', 'Trinket'][depth(node) % 3];
      tables[node.encounter] = [
        ...choose(items.filter(item => item.role === 'healer' && item.slot === healerSlot), encounterIndex),
        ...['Head', 'Chest', 'Legs'].flatMap((slot, offset) => choose(items.filter(item => item.role === 'all' && item.slot === slot), encounterIndex + offset * 2)),
        ...choose(items.filter(item => item.role === 'tank'), encounterIndex + 2),
        ...['rogue', 'mage', 'ranger'].flatMap((owner, offset) => choose(items.filter(item => item.role === 'damage' && (item.owner === owner || item.slot === 'Trinket')), encounterIndex + offset)),
      ].filter((id, index, ids) => ids.indexOf(id) === index);
    });
  }
  return tables;
}

export const NORMAL_LOOT_TABLES = Object.freeze(buildNormalLootTables());
export const normalLootForEncounter = (encounterId, catalogue = GEAR) => (NORMAL_LOOT_TABLES[encounterId] || []).map(id => catalogue.find(item => item.id === id)).filter(Boolean);

const categoryFor = (item, healerId) => ROLES.includes(item.role) && [healerId, 'tank', 'rogue', 'mage', 'ranger'].some(owner => canEquipItem(owner, item.slot, item)) ? item.role : null;

// Keep the preview and both normal and bonus reward rolls on the same rules.
// A preview shows all items that can be selected, regardless of drop count.
export function eligibleLootPool(table, ownedIds, healerId, catalogue = GEAR) {
  const byId = new Map(catalogue.map(item => [item.id, item]));
  const owned = new Set(ownedIds || []);
  return [...new Set(table || [])].map(id => byId.get(id)).filter(item => item && !owned.has(item.id) && categoryFor(item, healerId));
}

export function eligibleNormalLootForEncounter(encounterId, ownedIds, healerId, catalogue = GEAR) {
  return eligibleLootPool(NORMAL_LOOT_TABLES[encounterId], ownedIds, healerId, catalogue);
}

// Bonus rewards draw from the chapter catalogue outside this boss's normal
// table. They may also appear on other route nodes: label Boss Bonus, not Exclusive.
export function buildBossBonusLootTables(chapters = CHAPTERS, catalogue = GEAR, normalTables = buildNormalLootTables(chapters, catalogue)) {
  return Object.fromEntries(chapters.flatMap((chapter, chapterIndex) => chapter.nodes
    .filter(node => node.kind === 'boss')
    .map(node => [node.encounter, catalogue
      .filter(item => item.chapter === (chapter.ordinal ?? chapterIndex + 1) && !normalTables[node.encounter]?.includes(item.id))
      .map(item => item.id)])));
}

export const BOSS_BONUS_LOOT_TABLES = Object.freeze(buildBossBonusLootTables());
export const eligibleBossBonusLootForEncounter = (encounterId, ownedIds, healerId, catalogue = GEAR) => eligibleLootPool(BOSS_BONUS_LOOT_TABLES[encounterId], ownedIds, healerId, catalogue);

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
