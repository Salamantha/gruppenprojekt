import { z } from "zod";

export const IngredientSchema = z.object({
  name: z.string(),
  quantity: z.string(),
  unit: z.string(),
});

export const RecipeSchema = z.object({
  title: z.string(),
  ingredients: z.array(IngredientSchema),
  steps: z.array(z.string()),
});

export type Ingredient = z.infer<typeof IngredientSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;

export const MISTAKE_TYPES = [
  "WRONG_QUANTITY",
  "WRONG_UNIT",
  "OMITTED_INGREDIENT",
  "OMITTED_STEP",
  "HALLUCINATED_INGREDIENT",
  "HALLUCINATED_STEP",
  "WRONG_TIME_OR_TEMPERATURE",
] as const;

export type MistakeType = (typeof MISTAKE_TYPES)[number];

export const MISTAKE_TARGET_FIELDS = ["ingredient", "step"] as const;
export type MistakeTargetFieldLower = (typeof MISTAKE_TARGET_FIELDS)[number];

export const MISTAKE_SUBFIELDS = ["name", "quantity", "unit", "text"] as const;
export type MistakeSubfield = (typeof MISTAKE_SUBFIELDS)[number];

export const MistakeRecordSchema = z.object({
  type: z.enum(MISTAKE_TYPES),
  target_field: z.enum(MISTAKE_TARGET_FIELDS),
  target_index: z.number().int(),
  subfield: z.enum(MISTAKE_SUBFIELDS),
  original_value: z.string(),
  new_value: z.string(),
});

export type MistakeRecord = z.infer<typeof MistakeRecordSchema>;

export const FlawedRecipeSchema = RecipeSchema.extend({
  mistake_record: MistakeRecordSchema,
});

export type FlawedRecipe = z.infer<typeof FlawedRecipeSchema>;

/** What the participant marked as suspicious. index === -1 is the "etwas fehlt" (something's missing) meta-flag. */
export interface FlaggedItem {
  field: "INGREDIENT" | "STEP";
  index: number;
}

export interface MistakeTarget {
  type: MistakeType;
  targetField: MistakeTargetFieldLower;
  targetIndex: number;
}
