-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable
ALTER TABLE "Consultation" ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "followUpReminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "birthYear" INTEGER,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "medicalNotes" TEXT;

-- CreateIndex
CREATE INDEX "Consultation_followUpDate_idx" ON "Consultation"("followUpDate");
