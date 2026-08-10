export const TOTAL_TRIALS = 6;

/** Builds a balanced, shuffled sequence of conditions for one participant's session. */
export function buildConditionSequence(totalTrials: number = TOTAL_TRIALS): ("CONTROL" | "FLAWED")[] {
  const half = Math.floor(totalTrials / 2);
  const sequence: ("CONTROL" | "FLAWED")[] = [
    ...Array(half).fill("CONTROL"),
    ...Array(totalTrials - half).fill("FLAWED"),
  ];

  // Fisher-Yates shuffle
  for (let i = sequence.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
  }
  return sequence;
}
