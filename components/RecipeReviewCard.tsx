"use client";

import type { FlaggedItem, Recipe, ReviewReason } from "@/types/recipe";

interface RecipeReviewCardProps {
  recipe: Recipe;
  flagging: boolean;
  flaggedItems: FlaggedItem[];
  onToggleFlag: (item: FlaggedItem) => void;
  onReasonChange: (item: FlaggedItem, reason: ReviewReason) => void;
}

interface ReasonOption {
  value: ReviewReason;
  label: string;
}

const INGREDIENT_REASONS: ReasonOption[] = [
  { value: "WRONG_QUANTITY", label: "Menge ist falsch" },
  { value: "WRONG_UNIT", label: "Einheit ist falsch" },
  { value: "HALLUCINATED_INGREDIENT", label: "Zutat gehört nicht in das Rezept" },
  { value: "OTHER", label: "Anderer Grund" },
];

const STEP_REASONS: ReasonOption[] = [
  { value: "WRONG_TIME_OR_TEMPERATURE", label: "Zeit oder Temperatur ist falsch" },
  { value: "HALLUCINATED_STEP", label: "Schritt gehört nicht in das Rezept" },
  { value: "OTHER", label: "Inhalt des Schritts ist falsch / anderer Grund" },
];

const MISSING_INGREDIENT_REASON: ReasonOption[] = [{ value: "OMITTED_INGREDIENT", label: "Eine Zutat fehlt" }];
const MISSING_STEP_REASON: ReasonOption[] = [{ value: "OMITTED_STEP", label: "Ein Arbeitsschritt fehlt" }];

function getFlaggedItem(
  flaggedItems: FlaggedItem[],
  field: FlaggedItem["field"],
  index: number
): FlaggedItem | undefined {
  return flaggedItems.find((f) => f.field === field && f.index === index);
}

function formatIngredient(ingredient: Recipe["ingredients"][number]): string {
  return [ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(" ").trim();
}

function Row({
  children,
  flagging,
  item,
  flaggedItem,
  reasonOptions,
  onToggleFlag,
  onReasonChange,
}: {
  children: React.ReactNode;
  flagging: boolean;
  item: FlaggedItem;
  flaggedItem?: FlaggedItem;
  reasonOptions: ReasonOption[];
  onToggleFlag: (item: FlaggedItem) => void;
  onReasonChange: (item: FlaggedItem, reason: ReviewReason) => void;
}) {
  if (!flagging) {
    return <div className="py-2 px-1">{children}</div>;
  }

  const flagged = Boolean(flaggedItem);

  return (
    <div
      className={`rounded-lg border transition-colors ${
        flagged ? "bg-red-100 border-red-400" : "bg-white border-gray-200"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggleFlag(item)}
        className={`w-full text-left py-3 px-3 rounded-lg transition-colors ${
          flagged ? "text-red-900" : "hover:bg-gray-50 active:bg-gray-100"
        }`}
      >
        {children}
      </button>

      {flagged && (
        <div className="px-3 pb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Warum ist diese Stelle auffällig?</label>
          <select
            value={flaggedItem?.reason ?? ""}
            onChange={(event) => onReasonChange(item, event.target.value as ReviewReason)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            <option value="" disabled>
              Begründung auswählen…
            </option>
            {reasonOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default function RecipeReviewCard({
  recipe,
  flagging,
  flaggedItems,
  onToggleFlag,
  onReasonChange,
}: RecipeReviewCardProps) {
  return (
    <div className="w-full max-w-xl bg-white p-5 sm:p-8 rounded-2xl shadow-md border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{recipe.title}</h2>

      <section className="mb-8">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Zutaten</h3>
        <div className="space-y-2">
          {recipe.ingredients.map((ingredient, index) => {
            const item: FlaggedItem = { field: "INGREDIENT", index };
            return (
              <Row
                key={index}
                flagging={flagging}
                item={item}
                flaggedItem={getFlaggedItem(flaggedItems, "INGREDIENT", index)}
                reasonOptions={INGREDIENT_REASONS}
                onToggleFlag={onToggleFlag}
                onReasonChange={onReasonChange}
              >
                • {formatIngredient(ingredient)}
              </Row>
            );
          })}
          {flagging && (
            <Row
              flagging
              item={{ field: "INGREDIENT", index: -1 }}
              flaggedItem={getFlaggedItem(flaggedItems, "INGREDIENT", -1)}
              reasonOptions={MISSING_INGREDIENT_REASON}
              onToggleFlag={onToggleFlag}
              onReasonChange={onReasonChange}
            >
              <span className="italic">Es fehlt eine Zutat</span>
            </Row>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Zubereitung</h3>
        <div className="space-y-2">
          {recipe.steps.map((step, index) => {
            const item: FlaggedItem = { field: "STEP", index };
            return (
              <Row
                key={index}
                flagging={flagging}
                item={item}
                flaggedItem={getFlaggedItem(flaggedItems, "STEP", index)}
                reasonOptions={STEP_REASONS}
                onToggleFlag={onToggleFlag}
                onReasonChange={onReasonChange}
              >
                <strong>{index + 1}.</strong> {step}
              </Row>
            );
          })}
          {flagging && (
            <Row
              flagging
              item={{ field: "STEP", index: -1 }}
              flaggedItem={getFlaggedItem(flaggedItems, "STEP", -1)}
              reasonOptions={MISSING_STEP_REASON}
              onToggleFlag={onToggleFlag}
              onReasonChange={onReasonChange}
            >
              <span className="italic">Es fehlt ein Schritt</span>
            </Row>
          )}
        </div>
      </section>
    </div>
  );
}
