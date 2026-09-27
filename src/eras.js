import { ERAS, CHAPTERS } from './data.js';
import { chapterComplete } from './progression.js';

export const chaptersForEra = era => era.chapters.map(id => CHAPTERS.find(chapter => chapter.id === id)).filter(Boolean);
export const eraForChapter = chapter => ERAS.find(era => era.id === chapter?.eraId) || null;
export function eraUnlocked(era, completed) {
  const index = ERAS.indexOf(era);
  const previous = index > 0 ? chaptersForEra(ERAS[index - 1]).at(-1) : null;
  return index === 0 || Boolean(previous && chapterComplete(completed, previous.nodes));
}
export function eraTitle(era) {
  const chapters = chaptersForEra(era);
  return `${era.name} · Chapters ${chapters[0].ordinal}–${chapters.at(-1).ordinal}`;
}
export const itemEra = item => eraForChapter(CHAPTERS.find(chapter => chapter.ordinal === item?.chapter));
export const itemEraLabel = item => itemEra(item)?.name || 'Unknown era';
// The same provenance treatment is used for bag, equipment and reward icons.
export function itemBorderAttributes(item) {
  const era = itemEra(item);
  return era ? `data-era="${era.id}" style="--item-era-border:${era.itemBorder}"` : '';
}
