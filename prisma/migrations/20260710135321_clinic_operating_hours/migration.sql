-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "closingTime" TEXT DEFAULT '18:00',
ADD COLUMN     "isOpen24_7" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openingTime" TEXT DEFAULT '08:00';
