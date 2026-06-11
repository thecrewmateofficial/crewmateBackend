/*
  Warnings:

  - Added the required column `storageLimitGB` to the `Plan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "apiAccess" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "prioritySupport" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "storageLimitGB" INTEGER NOT NULL,
ADD COLUMN     "whatsappIntegration" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "trialDays" SET DEFAULT 7;
