-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'AT_STAGE';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "currentDepartmentId" TEXT;

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "isBookable" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "FlowStep" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "ownerDepartmentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "stageDepartmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlowStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlowStep_clinicId_idx" ON "FlowStep"("clinicId");

-- CreateIndex
CREATE INDEX "FlowStep_stageDepartmentId_idx" ON "FlowStep"("stageDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "FlowStep_ownerDepartmentId_order_key" ON "FlowStep"("ownerDepartmentId", "order");

-- CreateIndex
CREATE INDEX "Appointment_currentDepartmentId_idx" ON "Appointment"("currentDepartmentId");

-- AddForeignKey
ALTER TABLE "FlowStep" ADD CONSTRAINT "FlowStep_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowStep" ADD CONSTRAINT "FlowStep_ownerDepartmentId_fkey" FOREIGN KEY ("ownerDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowStep" ADD CONSTRAINT "FlowStep_stageDepartmentId_fkey" FOREIGN KEY ("stageDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_currentDepartmentId_fkey" FOREIGN KEY ("currentDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
