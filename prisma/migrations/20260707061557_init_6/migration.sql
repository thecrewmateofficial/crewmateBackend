/*
  Warnings:

  - The primary key for the `Registration` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `RegistrationId` on the `Registration` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Tenant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[companySlug]` on the table `Registration` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companySlug]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `companySlug` to the `Registration` table without a default value. This is not possible if the table is not empty.
  - The required column `registrationId` was added to the `Registration` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `companyName` to the `Tenant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companySlug` to the `Tenant` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Tenant_adminUrl_key";

-- DropIndex
DROP INDEX "Tenant_appUrl_key";

-- DropIndex
DROP INDEX "Tenant_customAdminUrl_key";

-- DropIndex
DROP INDEX "Tenant_customAppUrl_key";

-- DropIndex
DROP INDEX "Tenant_slug_key";

-- AlterTable
ALTER TABLE "Registration" DROP CONSTRAINT "Registration_pkey",
DROP COLUMN "RegistrationId",
ADD COLUMN     "companySlug" TEXT NOT NULL,
ADD COLUMN     "razorpaySubscriptionId" TEXT,
ADD COLUMN     "registrationId" TEXT NOT NULL,
ADD CONSTRAINT "Registration_pkey" PRIMARY KEY ("registrationId");

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "slug",
ADD COLUMN     "companyName" TEXT NOT NULL,
ADD COLUMN     "companySlug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Registration_companySlug_key" ON "Registration"("companySlug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_companySlug_key" ON "Tenant"("companySlug");
