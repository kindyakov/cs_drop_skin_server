/*
  Warnings:

  - A unique constraint covering the columns `[trackerId]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('EXNODE', 'YOOKASSA');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "cryptoAmount" DECIMAL(18,8),
ADD COLUMN     "fiatCurrency" TEXT,
ADD COLUMN     "provider" "PaymentProvider" NOT NULL DEFAULT 'EXNODE',
ADD COLUMN     "trackerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_trackerId_key" ON "transactions"("trackerId");

-- CreateIndex
CREATE INDEX "transactions_trackerId_idx" ON "transactions"("trackerId");
