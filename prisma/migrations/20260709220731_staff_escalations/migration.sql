-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "StaffEscalation" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientPhone" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "status" "EscalationStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "StaffEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffEscalation_clinicId_status_idx" ON "StaffEscalation"("clinicId", "status");

-- AddForeignKey
ALTER TABLE "StaffEscalation" ADD CONSTRAINT "StaffEscalation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
