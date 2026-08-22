-- AlterTable
ALTER TABLE "Trial"
ADD COLUMN "rejectedPromptIds" JSONB,
ADD COLUMN "recordingAttempts" INTEGER NOT NULL DEFAULT 0;
