let noteFn = null;

export function setRewardsNoteWriter(fn) {
  noteFn = typeof fn === 'function' ? fn : null;
}

export function writeRewardsNote(title, body) {
  try {
    noteFn?.(title, body);
  } catch {
    /* ignore */
  }
}
