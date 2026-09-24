import { CHAPTERS } from './data.js';
import { chapterComplete, chapterUnlocked } from './progression.js';

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
  const cards = CHAPTERS.map(chapter => {
    const card = document.createElement('button');
    card.className = 'chapter-card'; card.dataset.chapter = chapter.id;
    card.innerHTML = `<span class="chapter-number">${chapter.number}</span><span class="chapter-sigil" aria-hidden="true">◇</span><strong>${chapter.name}</strong><p>${chapter.description}</p><span class="chapter-state"></span>`;
    card.addEventListener('click', () => openChapter(chapter));
    collection.append(card);
    return card;
  });
  return { refresh(completed) {
    CHAPTERS.forEach((chapter, index) => {
      const card = cards[index], state = chapterState(chapter, completed);
      card.dataset.state = state; card.disabled = state === 'locked';
      card.querySelector('.chapter-sigil').textContent = state === 'completed' ? '✓' : state === 'available' ? '✧' : '◇';
      card.querySelector('.chapter-state').textContent = chapterCardAction(state, chapter, activeChapter()) || `Locked · Complete ${CHAPTERS[index - 1].number}`;
    });
  } };
}
