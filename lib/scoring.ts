import type { FlaggedItem, MistakeTargetFieldLower, MistakeType } from "@/types/recipe";

export interface ScoringInput {
  condition: "CONTROL" | "FLAWED";
  mistakeType: MistakeType | null;
  mistakeTargetField: MistakeTargetFieldLower | null;
  mistakeTargetIndex: number | null;
  participantAnswerIsFlawed: boolean;
  flaggedItems: FlaggedItem[];
}

export interface ScoringResult {
  isCorrectDetection: boolean;
  isCorrectLocalization: boolean | null;
  isFalsePositive: boolean | null;
}

const OMISSION_TYPES: MistakeType[] = ["OMITTED_INGREDIENT", "OMITTED_STEP"];

export function computeScoring(input: ScoringInput): ScoringResult {
  const { condition, mistakeType, mistakeTargetField, mistakeTargetIndex, participantAnswerIsFlawed, flaggedItems } =
    input;

  const isCorrectDetection = participantAnswerIsFlawed === (condition === "FLAWED");

  if (condition === "FLAWED") {
    if (!participantAnswerIsFlawed) {
      // They missed it entirely (answered "Ja") — nothing to localize.
      return { isCorrectDetection, isCorrectLocalization: false, isFalsePositive: null };
    }

    const groundTruthIndex =
      mistakeType && OMISSION_TYPES.includes(mistakeType) ? -1 : mistakeTargetIndex;
    const groundTruthField = mistakeTargetField ? (mistakeTargetField.toUpperCase() as FlaggedItem["field"]) : null;

    const isCorrectLocalization =
      groundTruthField !== null &&
      groundTruthIndex !== null &&
      flaggedItems.some((f) => f.field === groundTruthField && f.index === groundTruthIndex);

    return { isCorrectDetection, isCorrectLocalization, isFalsePositive: null };
  }

  // CONTROL trial: no ground-truth location exists.
  const isFalsePositive = participantAnswerIsFlawed || flaggedItems.length > 0;
  return { isCorrectDetection, isCorrectLocalization: null, isFalsePositive };
}
