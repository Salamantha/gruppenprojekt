-- AlterTable
ALTER TABLE "QuestionnaireResponse" DROP COLUMN "selfRatedCookingSkill",
DROP COLUMN "trustInAiAccuracy",
ADD COLUMN     "trustInAiContent" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Trial" ADD COLUMN     "rejectedPromptIds" JSONB NOT NULL DEFAULT '[]';
