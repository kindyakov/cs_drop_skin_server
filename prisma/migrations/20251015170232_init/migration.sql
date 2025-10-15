-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ItemRarity" AS ENUM ('CONSUMER', 'INDUSTRIAL', 'MIL_SPEC', 'RESTRICTED', 'CLASSIFIED', 'COVERT', 'KNIFE');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('OWNED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "steamId" TEXT,
    "vkId" TEXT,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "marketHashName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "rarity" "ItemRarity" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_items" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "chancePercent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ItemStatus" NOT NULL DEFAULT 'OWNED',

    CONSTRAINT "user_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_openings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_openings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_steamId_key" ON "users"("steamId");

-- CreateIndex
CREATE UNIQUE INDEX "users_vkId_key" ON "users"("vkId");

-- CreateIndex
CREATE INDEX "users_steamId_idx" ON "users"("steamId");

-- CreateIndex
CREATE INDEX "users_vkId_idx" ON "users"("vkId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "cases_slug_key" ON "cases"("slug");

-- CreateIndex
CREATE INDEX "cases_slug_idx" ON "cases"("slug");

-- CreateIndex
CREATE INDEX "cases_isActive_idx" ON "cases"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "items_marketHashName_key" ON "items"("marketHashName");

-- CreateIndex
CREATE INDEX "items_marketHashName_idx" ON "items"("marketHashName");

-- CreateIndex
CREATE INDEX "items_rarity_idx" ON "items"("rarity");

-- CreateIndex
CREATE INDEX "case_items_caseId_idx" ON "case_items"("caseId");

-- CreateIndex
CREATE INDEX "case_items_itemId_idx" ON "case_items"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "case_items_caseId_itemId_key" ON "case_items"("caseId", "itemId");

-- CreateIndex
CREATE INDEX "user_items_userId_idx" ON "user_items"("userId");

-- CreateIndex
CREATE INDEX "user_items_itemId_idx" ON "user_items"("itemId");

-- CreateIndex
CREATE INDEX "user_items_status_idx" ON "user_items"("status");

-- CreateIndex
CREATE INDEX "case_openings_userId_idx" ON "case_openings"("userId");

-- CreateIndex
CREATE INDEX "case_openings_caseId_idx" ON "case_openings"("caseId");

-- CreateIndex
CREATE INDEX "case_openings_openedAt_idx" ON "case_openings"("openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_paymentId_key" ON "transactions"("paymentId");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_paymentId_idx" ON "transactions"("paymentId");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- AddForeignKey
ALTER TABLE "case_items" ADD CONSTRAINT "case_items_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_items" ADD CONSTRAINT "case_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_openings" ADD CONSTRAINT "case_openings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_openings" ADD CONSTRAINT "case_openings_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_openings" ADD CONSTRAINT "case_openings_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
