-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bestDropItemId" TEXT,
ADD COLUMN     "favoriteCaseId" TEXT,
ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tradeUrl" TEXT;

-- CreateIndex
CREATE INDEX "users_isBlocked_idx" ON "users"("isBlocked");

-- CreateIndex
CREATE INDEX "users_favoriteCaseId_idx" ON "users"("favoriteCaseId");

-- CreateIndex
CREATE INDEX "users_bestDropItemId_idx" ON "users"("bestDropItemId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_favoriteCaseId_fkey" FOREIGN KEY ("favoriteCaseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_bestDropItemId_fkey" FOREIGN KEY ("bestDropItemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
