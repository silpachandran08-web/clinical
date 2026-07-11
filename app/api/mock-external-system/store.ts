// Throwaway in-memory fixture standing in for a clinic's own booking system,
// used only to verify CustomApiAdapter end-to-end against a foreign JSON
// shape (different field names than ours). Not part of the shipped product
// — dev/test convenience only.

export const DOCTORS = [
  { docId: "doc_1", fullName: "Dr. Layla Al-Faisal", dept: { label: "Dermatology" } },
  { docId: "doc_2", fullName: "Dr. Omar Nasser", dept: { label: "Pediatrics" } },
];

export interface MockSlot {
  id: string;
  doctor: { id: string; name: string };
  start: string;
  end: string;
  booked: boolean;
}

export const SLOTS: MockSlot[] = [
  {
    id: "slot_1",
    doctor: { id: "doc_1", name: "Dr. Layla Al-Faisal" },
    start: "2026-07-12T09:00:00.000Z",
    end: "2026-07-12T09:20:00.000Z",
    booked: false,
  },
  {
    id: "slot_2",
    doctor: { id: "doc_1", name: "Dr. Layla Al-Faisal" },
    start: "2026-07-12T09:20:00.000Z",
    end: "2026-07-12T09:40:00.000Z",
    booked: false,
  },
  {
    id: "slot_3",
    doctor: { id: "doc_2", name: "Dr. Omar Nasser" },
    start: "2026-07-13T10:00:00.000Z",
    end: "2026-07-13T10:20:00.000Z",
    booked: false,
  },
];

export interface MockAppointment {
  apptId: string;
  doctor: { name: string };
  when: string;
  patientPhone: string;
  patientName: string;
  cancelled: boolean;
}

export const APPOINTMENTS: MockAppointment[] = [];
