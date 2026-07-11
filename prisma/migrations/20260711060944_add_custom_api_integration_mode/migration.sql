-- AlterEnum
ALTER TYPE "IntegrationMode" ADD VALUE 'CUSTOM_API';

-- DropForeignKey
ALTER TABLE "AppointmentCharge" DROP CONSTRAINT "AppointmentCharge_appointmentId_fkey";

-- AlterTable
ALTER TABLE "Doctor" ALTER COLUMN "qualifications" SET DATA TYPE TEXT,
ALTER COLUMN "bio" SET DATA TYPE TEXT,
ALTER COLUMN "specialization" SET DATA TYPE TEXT,
ALTER COLUMN "licenseNumber" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "AppointmentCharge" ADD CONSTRAINT "AppointmentCharge_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
