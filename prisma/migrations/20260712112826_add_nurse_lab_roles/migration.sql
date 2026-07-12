-- CreateEnum
CREATE TYPE "DepartmentKind" AS ENUM ('MEDICAL', 'NURSE', 'LAB');

-- CreateEnum
CREATE TYPE "LabFieldType" AS ENUM ('TEXT', 'NUMBER', 'TEXTAREA', 'ATTACHMENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'NURSE';
ALTER TYPE "UserRole" ADD VALUE 'LAB';

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "kind" "DepartmentKind" NOT NULL DEFAULT 'MEDICAL';

-- CreateTable
CREATE TABLE "NurseVisit" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "nurseId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "bloodPressure" TEXT NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "temperatureC" DOUBLE PRECISION,
    "pulseBpm" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NurseVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabFieldDefinition" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "LabFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "labStaffId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResultValue" (
    "id" TEXT NOT NULL,
    "labResultId" TEXT NOT NULL,
    "fieldDefinitionId" TEXT NOT NULL,
    "textValue" TEXT,

    CONSTRAINT "LabResultValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NurseVisit_appointmentId_key" ON "NurseVisit"("appointmentId");

-- CreateIndex
CREATE INDEX "NurseVisit_patientId_idx" ON "NurseVisit"("patientId");

-- CreateIndex
CREATE INDEX "NurseVisit_nurseId_idx" ON "NurseVisit"("nurseId");

-- CreateIndex
CREATE INDEX "LabFieldDefinition_clinicId_idx" ON "LabFieldDefinition"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "LabFieldDefinition_departmentId_order_key" ON "LabFieldDefinition"("departmentId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "LabResult_appointmentId_key" ON "LabResult"("appointmentId");

-- CreateIndex
CREATE INDEX "LabResult_patientId_idx" ON "LabResult"("patientId");

-- CreateIndex
CREATE INDEX "LabResultValue_fieldDefinitionId_idx" ON "LabResultValue"("fieldDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "LabResultValue_labResultId_fieldDefinitionId_key" ON "LabResultValue"("labResultId", "fieldDefinitionId");

-- AddForeignKey
ALTER TABLE "NurseVisit" ADD CONSTRAINT "NurseVisit_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurseVisit" ADD CONSTRAINT "NurseVisit_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurseVisit" ADD CONSTRAINT "NurseVisit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabFieldDefinition" ADD CONSTRAINT "LabFieldDefinition_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabFieldDefinition" ADD CONSTRAINT "LabFieldDefinition_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_labStaffId_fkey" FOREIGN KEY ("labStaffId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResultValue" ADD CONSTRAINT "LabResultValue_labResultId_fkey" FOREIGN KEY ("labResultId") REFERENCES "LabResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResultValue" ADD CONSTRAINT "LabResultValue_fieldDefinitionId_fkey" FOREIGN KEY ("fieldDefinitionId") REFERENCES "LabFieldDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
