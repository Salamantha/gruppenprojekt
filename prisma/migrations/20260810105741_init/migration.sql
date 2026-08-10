-- CreateEnum
CREATE TYPE "StudyCondition" AS ENUM ('CONTROL', 'FLAWED');

-- CreateEnum
CREATE TYPE "MistakeType" AS ENUM ('WRONG_QUANTITY', 'WRONG_UNIT', 'OMITTED_INGREDIENT', 'OMITTED_STEP', 'HALLUCINATED_INGREDIENT', 'HALLUCINATED_STEP', 'WRONG_TIME_OR_TEMPERATURE');

-- CreateEnum
CREATE TYPE "MistakeTargetField" AS ENUM ('INGREDIENT', 'STEP');

-- CreateEnum
CREATE TYPE "TrialStatus" AS ENUM ('CREATED', 'RECORDED', 'TRANSCRIBED', 'GENERATED', 'ANSWERED', 'FAILED');

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentGivenAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "conditionSequence" JSONB NOT NULL,
    "userAgent" TEXT,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipePrompt" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "structuredReference" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RecipePrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trial" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "condition" "StudyCondition" NOT NULL,
    "status" "TrialStatus" NOT NULL DEFAULT 'CREATED',
    "audioMimeType" TEXT,
    "audioDurationMs" INTEGER,
    "rawTranscript" TEXT,
    "cleanRecipe" JSONB,
    "displayRecipe" JSONB,
    "mistakeType" "MistakeType",
    "mistakeTargetField" "MistakeTargetField",
    "mistakeTargetIndex" INTEGER,
    "mistakeSubfield" TEXT,
    "mistakeOriginalValue" TEXT,
    "mistakeNewValue" TEXT,
    "generationFallbackOccurred" BOOLEAN NOT NULL DEFAULT false,
    "participantAnswerIsFlawed" BOOLEAN,
    "participantFlaggedItems" JSONB,
    "isCorrectDetection" BOOLEAN,
    "isCorrectLocalization" BOOLEAN,
    "isFalsePositive" BOOLEAN,
    "recordingStartedAt" TIMESTAMP(3),
    "recordingEndedAt" TIMESTAMP(3),
    "reviewStartedAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),
    "timeSpentReviewMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireResponse" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "ageRange" TEXT NOT NULL,
    "occupationCategory" TEXT NOT NULL,
    "selfRatedCookingSkill" INTEGER NOT NULL,
    "selfRatedPerformance" INTEGER NOT NULL,
    "llmUsageFrequency" TEXT NOT NULL,
    "proofreadsLlmOutput" TEXT NOT NULL,
    "trustInAiAccuracy" INTEGER NOT NULL,
    "additionalComments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionnaireResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecipePrompt_title_key" ON "RecipePrompt"("title");

-- CreateIndex
CREATE INDEX "Trial_participantId_idx" ON "Trial"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireResponse_participantId_key" ON "QuestionnaireResponse"("participantId");

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "RecipePrompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireResponse" ADD CONSTRAINT "QuestionnaireResponse_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
