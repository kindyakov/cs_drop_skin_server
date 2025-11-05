-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "transactions_expiresAt_idx" ON "transactions"("expiresAt");
