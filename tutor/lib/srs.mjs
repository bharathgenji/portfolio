// SuperMemo-2 spaced repetition. Pure functions (nowMs injected) for testability.

const DAY = 86_400_000;

/** quality: 0–5 (0–2 = forgot, 3–5 = recalled). Returns the updated card. */
export function review(card, quality, nowMs = Date.now()) {
  let ease = card.ease ?? 2.5;
  let intervalDays = card.intervalDays ?? 0;
  let reps = card.reps ?? 0;

  if (quality < 3) {
    reps = 0;
    intervalDays = 1; // relearn tomorrow
  } else {
    reps += 1;
    if (reps === 1) intervalDays = 1;
    else if (reps === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * ease);
    ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (ease < 1.3) ease = 1.3;
  }

  return {
    ...card,
    ease: Math.round(ease * 100) / 100,
    intervalDays,
    reps,
    dueAt: new Date(nowMs + intervalDays * DAY).toISOString(),
    lastReviewed: new Date(nowMs).toISOString(),
  };
}

export function isDue(card, nowMs = Date.now()) {
  return !card.dueAt || new Date(card.dueAt).getTime() <= nowMs;
}

export function dueCards(cards, nowMs = Date.now()) {
  return cards.filter((c) => isDue(c, nowMs));
}
