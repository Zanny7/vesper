import { CHAPTERS } from './data.js';
import { chapterComplete, chapterUnlocked } from './progression.js';

export function chapterState(chapter, completed) {
  if (!completed) return chapter.state === 'completed' ? 'completed' : chapter.state === 'available' ? 'available' : 'locked';
  return chapterComplete(completed, chapter.nodes) ? 'completed' : chapterUnlocked(chapter, completed) ? 'available' : 'locked';
}
export function setupChapters({ openChapter }) {
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
      card.querySelector('.chapter-state').textContent = state === 'completed' ? 'Completed · Start / Resume run' : state === 'available' ? 'Enter chapter →' : `Locked · Complete ${CHAPTERS[index - 1].number}`;
    });
  } };
}
