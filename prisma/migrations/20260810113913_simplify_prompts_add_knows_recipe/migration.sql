-- AlterTable
ALTER TABLE "RecipePrompt" DROP COLUMN "promptText",
DROP COLUMN "structuredReference";

-- AlterTable
ALTER TABLE "Trial" ADD COLUMN     "participantKnowsRecipe" BOOLEAN;

