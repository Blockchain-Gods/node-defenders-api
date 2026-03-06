-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "externalWallet" TEXT,
    "web3AuthId" TEXT,
    "soulBalance" TEXT NOT NULL DEFAULT '0',
    "godsBalance" TEXT NOT NULL DEFAULT '0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,
    "modeId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "soulEarned" TEXT NOT NULL DEFAULT '0',
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,
    "modeId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "roundsSurvived" INTEGER NOT NULL DEFAULT 0,
    "enemiesKilled" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceItem" (
    "id" TEXT NOT NULL,
    "typeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "metadataURI" TEXT NOT NULL,
    "rarity" INTEGER NOT NULL DEFAULT 0,
    "gameId" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MarketplaceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "buyPriceSoul" TEXT NOT NULL,
    "buyPriceGods" TEXT NOT NULL,
    "listed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerNFT" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "typeId" INTEGER NOT NULL,
    "isRented" BOOLEAN NOT NULL DEFAULT false,
    "rentedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerNFT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SbtAchievement" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "typeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "mintedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SbtAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_walletAddress_key" ON "Player"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Player_web3AuthId_key" ON "Player"("web3AuthId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_playerId_gameId_modeId_key" ON "LeaderboardEntry"("playerId", "gameId", "modeId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceItem_typeId_key" ON "MarketplaceItem"("typeId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceListing_itemId_key" ON "MarketplaceListing"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerNFT_tokenId_key" ON "PlayerNFT"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "SbtAchievement_tokenId_key" ON "SbtAchievement"("tokenId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MarketplaceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerNFT" ADD CONSTRAINT "PlayerNFT_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbtAchievement" ADD CONSTRAINT "SbtAchievement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
