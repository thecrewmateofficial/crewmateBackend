/*
  Warnings:

  - You are about to drop the column `paymentCompleted` on the `Registration` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Registration" DROP COLUMN "paymentCompleted",
ADD COLUMN     "paymentAuthenticatedCompleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "paymentAuthenticatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "paymentAuthenticatedCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "signupAt" TIMESTAMP(3);
