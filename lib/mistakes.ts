import { injectMistake } from "@/lib/openai";
import type {
  FlawedRecipe,
  Ingredient,
  MistakeRecord,
  MistakeTarget,
  MistakeType,
  Recipe,
} from "@/types/recipe";

const MAX_ATTEMPTS = 3; // 1 initial + 2 retries

function ingredientEqual(a: Ingredient, b: Ingredient): boolean {
  return a.name === b.name && a.quantity === b.quantity && a.unit === b.unit;
}

function ingredientsEqualExcept(
  a: Ingredient[],
  b: Ingredient[],
  skipIndex: number
): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, i) => i === skipIndex || ingredientEqual(item, b[i]));
}

function stepsEqualExcept(a: string[], b: string[], skipIndex: number): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, i) => i === skipIndex || item === b[i]);
}

function isSubsequenceExcludingIndex<T>(
  shorter: T[],
  longer: T[],
  insertedIndex: number,
  eq: (a: T, b: T) => boolean
): boolean {
  if (longer.length !== shorter.length + 1) return false;
  const withoutInserted = longer.filter((_, i) => i !== insertedIndex);
  return withoutInserted.length === shorter.length && withoutInserted.every((item, i) => eq(item, shorter[i]));
}

function isSubsequenceRemovingIndex<T>(
  longer: T[],
  shorter: T[],
  removedIndex: number,
  eq: (a: T, b: T) => boolean
): boolean {
  if (longer.length !== shorter.length + 1) return false;
  const withoutRemoved = longer.filter((_, i) => i !== removedIndex);
  return withoutRemoved.length === shorter.length && withoutRemoved.every((item, i) => eq(item, shorter[i]));
}

/**
 * Randomly picks a mistake type + exact target location that is valid for
 * the given clean recipe's shape. The server decides the target BEFORE
 * calling the model — precision comes from server-dictated targeting, not
 * from trusting the model to choose a sensible spot.
 */
export function pickMistakeTarget(clean: Recipe): MistakeTarget {
  const candidates: MistakeType[] = [];
  if (clean.ingredients.length >= 1) candidates.push("WRONG_QUANTITY", "WRONG_UNIT");
  if (clean.ingredients.length >= 2) candidates.push("OMITTED_INGREDIENT");
  candidates.push("HALLUCINATED_INGREDIENT");
  if (clean.steps.length >= 2) candidates.push("OMITTED_STEP");
  if (clean.steps.length >= 1) candidates.push("WRONG_TIME_OR_TEMPERATURE");
  candidates.push("HALLUCINATED_STEP");

  const type = candidates[Math.floor(Math.random() * candidates.length)];

  switch (type) {
    case "WRONG_QUANTITY":
    case "WRONG_UNIT":
    case "OMITTED_INGREDIENT":
      return {
        type,
        targetField: "ingredient",
        targetIndex: Math.floor(Math.random() * clean.ingredients.length),
      };
    case "HALLUCINATED_INGREDIENT":
      return {
        type,
        targetField: "ingredient",
        targetIndex: Math.floor(Math.random() * (clean.ingredients.length + 1)),
      };
    case "OMITTED_STEP":
    case "WRONG_TIME_OR_TEMPERATURE":
      return {
        type,
        targetField: "step",
        targetIndex: Math.floor(Math.random() * clean.steps.length),
      };
    case "HALLUCINATED_STEP":
      return {
        type,
        targetField: "step",
        targetIndex: Math.floor(Math.random() * (clean.steps.length + 1)),
      };
  }
}

/**
 * Authoritative structural diff between the clean recipe and the model's
 * mutated output. Returns a derived, trustworthy MistakeRecord if the
 * mutation matches EXACTLY what was asked for, or null if it doesn't
 * (in which case the caller should retry or fall back to CONTROL).
 */
function validateAndDeriveMistake(
  clean: Recipe,
  flawed: FlawedRecipe,
  target: MistakeTarget
): MistakeRecord | null {
  if (flawed.title !== clean.title) return null;

  const { type, targetField, targetIndex } = target;

  if (targetField === "ingredient") {
    if (!stepsEqualExcept(clean.steps, flawed.steps, -1)) return null; // steps fully unchanged
  }
  if (targetField === "step") {
    if (!ingredientsEqualExcept(clean.ingredients, flawed.ingredients, -1)) return null; // ingredients fully unchanged
  }

  switch (type) {
    case "WRONG_QUANTITY":
    case "WRONG_UNIT": {
      const subfield = type === "WRONG_QUANTITY" ? "quantity" : "unit";
      if (!ingredientsEqualExcept(clean.ingredients, flawed.ingredients, targetIndex)) return null;
      const before = clean.ingredients[targetIndex];
      const after = flawed.ingredients[targetIndex];
      if (!before || !after) return null;
      if (before[subfield] === after[subfield]) return null; // must actually differ
      if (before.name !== after.name) return null;
      if (subfield === "quantity" && before.unit !== after.unit) return null;
      if (subfield === "unit" && before.quantity !== after.quantity) return null;
      return {
        type,
        target_field: "ingredient",
        target_index: targetIndex,
        subfield,
        original_value: before[subfield],
        new_value: after[subfield],
      };
    }
    case "OMITTED_INGREDIENT": {
      const removed = clean.ingredients[targetIndex];
      if (!removed) return null;
      if (!isSubsequenceRemovingIndex(clean.ingredients, flawed.ingredients, targetIndex, ingredientEqual)) return null;
      return {
        type,
        target_field: "ingredient",
        target_index: targetIndex,
        subfield: "name",
        original_value: `${removed.quantity} ${removed.unit} ${removed.name}`.trim(),
        new_value: "",
      };
    }
    case "HALLUCINATED_INGREDIENT": {
      if (!isSubsequenceExcludingIndex(clean.ingredients, flawed.ingredients, targetIndex, ingredientEqual)) return null;
      const added = flawed.ingredients[targetIndex];
      if (!added) return null;
      return {
        type,
        target_field: "ingredient",
        target_index: targetIndex,
        subfield: "name",
        original_value: "",
        new_value: `${added.quantity} ${added.unit} ${added.name}`.trim(),
      };
    }
    case "OMITTED_STEP": {
      const removed = clean.steps[targetIndex];
      if (removed === undefined) return null;
      if (!isSubsequenceRemovingIndex(clean.steps, flawed.steps, targetIndex, (a, b) => a === b)) return null;
      return {
        type,
        target_field: "step",
        target_index: targetIndex,
        subfield: "text",
        original_value: removed,
        new_value: "",
      };
    }
    case "HALLUCINATED_STEP": {
      if (!isSubsequenceExcludingIndex(clean.steps, flawed.steps, targetIndex, (a, b) => a === b)) return null;
      const added = flawed.steps[targetIndex];
      if (added === undefined) return null;
      return {
        type,
        target_field: "step",
        target_index: targetIndex,
        subfield: "text",
        original_value: "",
        new_value: added,
      };
    }
    case "WRONG_TIME_OR_TEMPERATURE": {
      if (!stepsEqualExcept(clean.steps, flawed.steps, targetIndex)) return null;
      const before = clean.steps[targetIndex];
      const after = flawed.steps[targetIndex];
      if (before === undefined || after === undefined) return null;
      if (before === after) return null; // must actually differ
      const ratio = after.length / Math.max(before.length, 1);
      if (ratio < 0.5 || ratio > 2) return null; // guard against a full rewrite instead of a targeted edit
      return {
        type,
        target_field: "step",
        target_index: targetIndex,
        subfield: "text",
        original_value: before,
        new_value: after,
      };
    }
  }
}

export interface MistakeInjectionResult {
  displayRecipe: Recipe;
  mistake: MistakeRecord | null;
  fallbackOccurred: boolean;
}

/**
 * Orchestrates mistake injection for a FLAWED trial: picks a target, asks
 * the model to apply it, independently validates the result via structural
 * diff, retries on mismatch, and falls back to showing the clean (CONTROL)
 * recipe if the model can't produce a valid, precisely-scoped mutation
 * after a few attempts. The app must never show a broken/inconsistent recipe.
 */
export async function generateFlawedRecipe(clean: Recipe): Promise<MistakeInjectionResult> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const target = pickMistakeTarget(clean);
    try {
      const flawed = await injectMistake(clean, target);
      const mistake = validateAndDeriveMistake(clean, flawed, target);
      if (mistake) {
        const displayRecipe: Recipe = {
          title: flawed.title,
          ingredients: flawed.ingredients,
          steps: flawed.steps,
        };
        return { displayRecipe, mistake, fallbackOccurred: false };
      }
    } catch {
      // fall through to retry with a fresh target
    }
  }

  return { displayRecipe: clean, mistake: null, fallbackOccurred: true };
}
