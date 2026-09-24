// One request path for starting and replaying chapters. Only accept mutates
// the run store after a foreign active run triggers confirmation.
export function createChapterSwitch({ runs, getParty, confirm, onStart }) {
  let pending = null;
  const start = chapter => { runs.restart(chapter, getParty()); onStart(chapter); };
  return {
    request(chapter) {
      const current = runs.activeChapter();
      if (current && current.id !== chapter.id) {
        pending = chapter;
        confirm({ current, next: chapter });
        return 'confirmation';
      }
      pending = null;
      start(chapter);
      return 'started';
    },
    cancel() { pending = null; },
    accept() {
      if (!pending) return false;
      const chapter = pending;
      pending = null;
      start(chapter);
      return true;
    },
  };
}

export function chapterSwitchCopy(current, next) {
  return {
    title: 'Start a new chapter run?',
    loss: `Starting ${next.number} will end your current ${current.number} run. Encounters cleared in that run and its remaining Health and Mana will be reset.`,
    retained: 'Permanent progress is kept: completed and unlocked chapters, items, equipment, and talents.',
  };
}
