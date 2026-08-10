"use client";

import type { FlaggedItem, Recipe } from "@/types/recipe";

interface RecipeReviewCardProps {
  recipe: Recipe;
  flagging: boolean;
  flaggedItems: FlaggedItem[];
  onToggleFlag: (item: FlaggedItem) => void;
}

function isFlagged(flaggedItems: FlaggedItem[], field: FlaggedItem["field"], index: number): boolean {
  return flaggedItems.some((f) => f.field === field && f.index === index);
}

function formatIngredient(ingredient: Recipe["ingredients"][number]): string {
  return [ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(" ").trim();
}

function Row({
  children,
  flagging,
  flagged,
  onClick,
}: {
  children: React.ReactNode;
  flagging: boolean;
  flagged: boolean;
  onClick: () => void;
}) {
  if (!flagging) {
    return <div className="py-2 px-1">{children}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left py-3 px-3 rounded-lg border transition-colors ${
        flagged
          ? "bg-red-100 border-red-400 text-red-900"
          : "bg-white border-gray-200 hover:bg-gray-50 active:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function RecipeReviewCard({ recipe, flagging, flaggedItems, onToggleFlag }: RecipeReviewCardProps) {
  return (
    <div className="w-full max-w-xl bg-white p-5 sm:p-8 rounded-2xl shadow-md border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{recipe.title}</h2>

      <section className="mb-8">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Zutaten</h3>
        <div className="space-y-1">
          {recipe.ingredients.map((ingredient, index) => (
            <Row
              key={index}
              flagging={flagging}
              flagged={isFlagged(flaggedItems, "INGREDIENT", index)}
              onClick={() => onToggleFlag({ field: "INGREDIENT", index })}
            >
              • {formatIngredient(ingredient)}
            </Row>
          ))}
          {flagging && (
            <Row
              flagging
              flagged={isFlagged(flaggedItems, "INGREDIENT", -1)}
              onClick={() => onToggleFlag({ field: "INGREDIENT", index: -1 })}
            >
              <span className="italic">Es fehlt eine Zutat</span>
            </Row>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Zubereitung</h3>
        <div className="space-y-1">
          {recipe.steps.map((step, index) => (
            <Row
              key={index}
              flagging={flagging}
              flagged={isFlagged(flaggedItems, "STEP", index)}
              onClick={() => onToggleFlag({ field: "STEP", index })}
            >
              <strong>{index + 1}.</strong> {step}
            </Row>
          ))}
          {flagging && (
            <Row
              flagging
              flagged={isFlagged(flaggedItems, "STEP", -1)}
              onClick={() => onToggleFlag({ field: "STEP", index: -1 })}
            >
              <span className="italic">Es fehlt ein Schritt</span>
            </Row>
          )}
        </div>
      </section>
    </div>
  );
}
