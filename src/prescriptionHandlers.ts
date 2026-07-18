import { prisma } from "@/src/db/client";
import { createWhatsAppProvider } from "@/src/whatsapp";
import { sendPrescriptionReady } from "@/src/whatsapp/messageTemplates";
import type { Clinic } from "@prisma/client";

/**
 * Create a new prescription for a consultation and notify the patient.
 */
export async function createAndSendPrescription(
  consultationId: string,
  patientId: string,
  clinic: Clinic,
  medicines: Array<{
    name: string;
    dosage: string;
    frequency: string;
    durationDays: number;
    instructions?: string;
  }>
): Promise<void> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!patient) throw new Error("Patient not found");

  // Create prescription records
  const prescriptions = await Promise.all(
    medicines.map((med) =>
      prisma.prescription.create({
        data: {
          consultationId,
          patientId,
          medicineName: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          durationDays: med.durationDays,
          instructions: med.instructions,
        },
      })
    )
  );

  // Notify patient
  const provider = createWhatsAppProvider(clinic);
  await sendPrescriptionReady(provider, patient.phone, patient.name || "Patient", patient.locale);
}

/**
 * Get all active prescriptions for a patient (not yet expired).
 */
export async function getActivePrescriptions(patientId: string) {
  const now = new Date();
  return await prisma.prescription.findMany({
    where: {
      patientId,
      expiryDate: { gte: now },
    },
    include: {
      consultation: {
        include: {
          doctor: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Format prescriptions for WhatsApp display.
 */
export function formatPrescriptionsForWhatsApp(
  prescriptions: Awaited<ReturnType<typeof getActivePrescriptions>>,
  locale: string
): string {
  if (prescriptions.length === 0) {
    return locale === "AR"
      ? "لا توجد وصفات نشطة حالياً"
      : "No active prescriptions";
  }

  const header = locale === "AR" ? "💊 وصفاتك الطبية:\n\n" : "💊 Your Prescriptions:\n\n";

  const items = prescriptions.map((rx, i) => {
    const doctorName = rx.consultation.doctor.name;
    const from = locale === "AR" ? "من" : "from";

    return locale === "AR"
      ? `${i + 1}. ${rx.medicineName} ${rx.dosage}\n   ${rx.frequency} لمدة ${rx.durationDays} يوم\n   ${from} ${doctorName}\n`
      : `${i + 1}. ${rx.medicineName} ${rx.dosage}\n   ${rx.frequency} for ${rx.durationDays} days\n   ${from} Dr. ${doctorName}\n`;
  });

  return header + items.join("\n");
}

/**
 * Request a prescription refill.
 */
export async function requestRefill(
  prescriptionId: string,
  clinic: Clinic
): Promise<void> {
  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: {
      patient: true,
      consultation: {
        include: {
          doctor: true,
        },
      },
    },
  });

  if (!prescription) throw new Error("Prescription not found");

  // Create escalation for doctor review
  await prisma.staffEscalation.create({
    data: {
      clinicId: clinic.id,
      patientPhone: prescription.patient.phone,
      reason:
        prescription.patient.locale === "AR"
          ? `طلب إعادة ملء: ${prescription.medicineName} من ${prescription.consultation.doctor.name}`
          : `Refill request: ${prescription.medicineName} from Dr. ${prescription.consultation.doctor.name}`,
      urgent: false,
    },
  });

  // Notify patient
  const provider = createWhatsAppProvider(clinic);
  const message =
    prescription.patient.locale === "AR"
      ? `✅ تم استقبال طلب إعادة ملء ${prescription.medicineName}\n\nسيقوم الطبيب بالرد عليك قريباً.`
      : `✅ Your refill request for ${prescription.medicineName} has been received.\n\nThe doctor will respond soon.`;

  await provider.sendMessage(prescription.patient.phone, message);
}
