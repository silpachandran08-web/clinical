-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN "consultationFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "qualifications" VARCHAR(500),
ADD COLUMN "bio" VARCHAR(1000),
ADD COLUMN "specialization" VARCHAR(200),
ADD COLUMN "licenseNumber" VARCHAR(100),
ADD COLUMN "yearsOfExperience" INTEGER;

-- CreateEnum
CREATE TYPE "ChargeCategory" AS ENUM ('LAB', 'PROCEDURE', 'MEDICATION', 'OTHER');

-- CreateTable
CREATE TABLE "AppointmentCharge" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" "ChargeCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppointmentCharge_appointmentId_idx" ON "AppointmentCharge"("appointmentId");

-- AddForeignKey
ALTER TABLE "AppointmentCharge" ADD CONSTRAINT "AppointmentCharge_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE;
