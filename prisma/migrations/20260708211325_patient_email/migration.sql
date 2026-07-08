-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "email" TEXT;

-- CreateIndex
CREATE INDEX "Patient_clinicId_email_idx" ON "Patient"("clinicId", "email");
