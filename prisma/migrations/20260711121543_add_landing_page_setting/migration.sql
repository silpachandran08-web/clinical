-- CreateTable
CREATE TABLE "LandingPageSetting" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "variant" TEXT NOT NULL DEFAULT 'classic',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPageSetting_pkey" PRIMARY KEY ("id")
);
