import { CHAPTERS, ERAS } from './data.js';
import { chapterComplete, chapterUnlocked } from './progression.js';
import { chaptersForEra, eraForChapter, eraTitle, eraUnlocked } from './eras.js';

export function chapterState(chapter, completed) {
  if (!completed) return chapter.state === 'completed' ? 'completed' : chapter.state === 'available' ? 'available' : 'locked';
  return chapterComplete(completed, chapter.nodes) ? 'completed' : chapterUnlocked(chapter, completed) ? 'available' : 'locked';
}
export function chapterCardAction(state, chapter, activeChapter) {
  if (state === 'completed') return activeChapter?.id === chapter.id ? 'Completed · Continue replay' : 'Completed · Enter to replay';
  if (state === 'available') return activeChapter?.id === chapter.id ? 'Continue chapter →' : 'Enter chapter →';
  return null;
}
export function setupChapters({ openChapter, activeChapter = () => null }) {
  const collection = document.querySelector('#chapter-list');
  const selector = document.querySelector('#era-selector');
  const previous = document.querySelector('#previous-era'), next = document.querySelector('#next-era');
  let selectedEra = eraForChapter(activeChapter()) || ERAS[0], history = new Set();
  const eraButtons = ERAS.map(era => {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.era = era.id;
    button.addEventListener('click', () => selectEra(era));
    selector.append(button); return button;
  });
  const cards = CHAPTERS.map(chapter => {
    const card = document.createElement('button');
    card.className = 'chapter-card'; card.dataset.chapter = chapter.id;
    card.innerHTML = `<span class="chapter-number">${chapter.number}</span><span class="chapter-sigil" aria-hidden="true">◇</span><strong>${chapter.name}</strong><p>${chapter.description}</p><span class="chapter-state"></span>`;
    card.addEventListener('click', () => {
      if (!chapterUnlocked(chapter, history)) return;
      selectedEra = eraForChapter(chapter); openChapter(chapter);
    });
    collection.append(card);
    return card;
  });
  function selectEra(era) {
    if (!era || !eraUnlocked(era, history)) return;
    selectedEra = era; refresh(history);
  }
  previous.addEventListener('click', () => selectEra(ERAS[ERAS.indexOf(selectedEra) - 1]));
  next.addEventListener('click', () => selectEra(ERAS[ERAS.indexOf(selectedEra) + 1]));
  function refresh(completed) {
    history = completed;
    if (!eraUnlocked(selectedEra, completed)) selectedEra = ERAS[0];
    document.querySelector('#adventures-title').textContent = eraTitle(selectedEra);
    const index = ERAS.indexOf(selectedEra), nextEra = ERAS[index + 1];
    previous.disabled = index === 0;
    next.disabled = !nextEra || !eraUnlocked(nextEra, completed);
    previous.title = previous.disabled ? 'There is no earlier era' : `Return to ${ERAS[index - 1].name}`;
    next.textContent = 'Next Era →';
    next.title = !nextEra ? 'There is no later era' : next.disabled ? `Complete ${chaptersForEra(selectedEra).at(-1).number} to unlock the next era` : 'Enter the next era';
    eraButtons.forEach((button, i) => {
      const unlocked = eraUnlocked(ERAS[i], completed);
      button.textContent = `${eraTitle(ERAS[i])}${unlocked ? '' : ' · Locked'}`;
      button.disabled = !unlocked;
      button.setAttribute('aria-pressed', String(selectedEra === ERAS[i]));
      button.title = unlocked ? eraTitle(ERAS[i]) : `Complete ${chaptersForEra(ERAS[i - 1]).at(-1).number} to unlock`;
    });
    const milestone = document.querySelector('#era-milestone');
    milestone.hidden = !nextEra || !eraUnlocked(nextEra, completed);
    milestone.textContent = nextEra ? `${selectedEra.name} conquered. ${nextEra.name} awaits — a new journey beyond ${chaptersForEra(selectedEra).at(-1).name}.` : '';
    CHAPTERS.forEach((chapter, index) => {
      const card = cards[index], state = chapterState(chapter, completed);
      card.hidden = chapter.eraId !== selectedEra.id;
      card.dataset.state = state; card.disabled = state === 'locked';
      card.querySelector('.chapter-sigil').textContent = state === 'completed' ? '✓' : state === 'available' ? '✧' : '◇';
      card.querySelector('.chapter-state').textContent = chapterCardAction(state, chapter, activeChapter()) || `Locked · Complete ${CHAPTERS[index - 1].number}`;
    });
  }
  return { refresh };
}
