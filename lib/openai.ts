import type { FlawedRecipe, MistakeTarget, Recipe } from "@/types/recipe";
import { RecipeSchema, FlawedRecipeSchema } from "@/types/recipe";
import { getOpenAIClient } from "@/lib/openai-client";

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const ingredientProperties = {
  name: { type: "string" },
  quantity: { type: "string", description: "z.B. '200', '1/2', 'eine Prise', 'nach Geschmack'" },
  unit: { type: "string", description: "z.B. 'g', 'ml', 'EL', 'TL', '' wenn keine Einheit" },
} as const;

const recipeJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: ingredientProperties,
        required: ["name", "quantity", "unit"],
        additionalProperties: false,
      },
    },
    steps: { type: "array", items: { type: "string" } },
  },
  required: ["title", "ingredients", "steps"],
  additionalProperties: false,
} as const;

const flawedRecipeJsonSchema = {
  type: "object",
  properties: {
    ...recipeJsonSchema.properties,
    mistake_record: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [
            "WRONG_QUANTITY",
            "WRONG_UNIT",
            "WRONG_INGREDIENT_NAME",
            "OMITTED_INGREDIENT",
            "OMITTED_STEP",
            "HALLUCINATED_INGREDIENT",
            "HALLUCINATED_STEP",
            "WRONG_TIME_OR_TEMPERATURE",
          ],
        },
        target_field: { type: "string", enum: ["ingredient", "step"] },
        target_index: { type: "integer" },
        subfield: { type: "string", enum: ["name", "quantity", "unit", "text"] },
        original_value: { type: "string" },
        new_value: { type: "string" },
      },
      required: ["type", "target_field", "target_index", "subfield", "original_value", "new_value"],
      additionalProperties: false,
    },
  },
  required: ["title", "ingredients", "steps", "mistake_record"],
  additionalProperties: false,
} as const;

/**
 * Call A: turns a raw German ASR transcript of a participant FREELY describing
 * (from memory, in their own words) how to make a given dish into a strict,
 * structured recipe. There is no reference recipe to ground against — the
 * participant's own description, however they phrased it, is the source of
 * truth. This only structures what was actually said; it must not invent or
 * correct content beyond fixing obvious ASR transcription errors.
 */
export async function generateCleanRecipe(transcript: string, dishName: string): Promise<Recipe> {
  const res = await getOpenAIClient().chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content:
          "Du bekommst die automatische Transkription einer mündlichen, freien Beschreibung eines Rezepts durch eine Person, " +
          "die aus dem Gedächtnis erklärt, wie man ein bestimmtes Gericht zubereitet. Strukturiere ausschließlich das, was tatsächlich " +
          "gesagt wurde, als Rezept mit Titel, Zutaten (Name, Menge, Einheit) und Zubereitungsschritten. " +
          "Erfinde oder ergänze KEINE Zutaten, Mengen oder Schritte, die nicht erwähnt wurden — auch nicht scheinbar naheliegende. " +
          "Wenn eine Menge oder Einheit nicht genannt wurde, trage einen leeren String ein. Korrigiere ausschließlich offensichtliche " +
          "Erkennungsfehler der Spracherkennung (z.B. falsch erkannte Wörter), nicht den inhaltlichen Aufbau des Rezepts. " +
          "Antworte ausschließlich mit dem strukturierten Rezept.",
      },
      {
        role: "user",
        content: JSON.stringify({ dish_name: dishName, transcript }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "recipe", schema: recipeJsonSchema, strict: true },
    },
  });

  const raw = res.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned no content for clean recipe generation");
  return RecipeSchema.parse(JSON.parse(raw));
}

const MISTAKE_INSTRUCTIONS: Record<MistakeTarget["type"], string> = {
  WRONG_QUANTITY:
    "Ändere ausschließlich die Mengenangabe (quantity) dieser Zutat auf einen plausiblen, aber falschen Wert. Name und Einheit bleiben exakt gleich.",
  WRONG_UNIT:
    "Ändere ausschließlich die Einheit (unit) dieser Zutat auf eine plausible, aber falsche Einheit. Name und Menge bleiben exakt gleich.",
  WRONG_INGREDIENT_NAME:
    "Ändere ausschließlich den Namen (name) dieser Zutat auf eine andere, plausible aber falsche Zutat (z.B. eine geschmacklich oder farblich ähnliche Zutat). Menge und Einheit bleiben exakt gleich.",
  OMITTED_INGREDIENT:
    "Entferne genau diese Zutat vollständig aus der Zutatenliste. Alle anderen Zutaten bleiben exakt gleich und in gleicher Reihenfolge.",
  OMITTED_STEP:
    "Entferne genau diesen Schritt vollständig aus der Anleitung. Alle anderen Schritte bleiben exakt gleich und in gleicher Reihenfolge.",
  HALLUCINATED_INGREDIENT:
    "Füge an genau dieser Position eine neue, plausible, aber im Original nicht erwähnte Zutat ein. Alle bestehenden Zutaten bleiben exakt gleich und in gleicher Reihenfolge, nur um die neue Zutat verschoben.",
  HALLUCINATED_STEP:
    "Füge an genau dieser Position einen neuen, plausiblen, aber im Original nicht erwähnten Arbeitsschritt ein. Alle bestehenden Schritte bleiben exakt gleich und in gleicher Reihenfolge, nur um den neuen Schritt verschoben.",
  WRONG_TIME_OR_TEMPERATURE:
    "Ändere ausschließlich eine Zeit- oder Temperaturangabe im Text dieses Schritts auf einen plausiblen, aber falschen Wert. Der Rest des Schritttexts bleibt exakt gleich.",
};

/**
 * Call B: given a clean recipe and a server-chosen mistake target (type +
 * field + index), asks the model to apply exactly that mutation and report
 * back what it changed. The caller MUST independently validate the result
 * (see lib/mistakes.ts) — this function trusts nothing about correctness.
 */
export async function injectMistake(
  cleanRecipe: Recipe,
  target: MistakeTarget
): Promise<FlawedRecipe> {
  const instruction = MISTAKE_INSTRUCTIONS[target.type];

  const res = await getOpenAIClient().chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content:
          "Du bist Teil einer kontrollierten Studie und veränderst gezielt genau EIN Detail eines Rezepts, um einen Fehler einzubauen. " +
          "Verändere NICHTS anderes als angewiesen. Gib das vollständige, veränderte Rezept zurück sowie ein mistake_record-Objekt, " +
          "das exakt beschreibt, was du geändert hast (original_value = Wert vorher, new_value = Wert nachher).",
      },
      {
        role: "user",
        content: JSON.stringify({
          clean_recipe: cleanRecipe,
          mistake_type: target.type,
          target_field: target.targetField,
          target_index: target.targetIndex,
          instruction,
        }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "flawed_recipe", schema: flawedRecipeJsonSchema, strict: true },
    },
  });

  const raw = res.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned no content for mistake injection");
  return FlawedRecipeSchema.parse(JSON.parse(raw));
}
