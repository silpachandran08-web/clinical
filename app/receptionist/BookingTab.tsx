import type { Clinic } from "@prisma/client";
import { useState, useTransition } from "react";
import { addPatientAction, searchPatientsAction } from "@/lib/actions/receptionist";
import { WeekSlotPicker } from "./WeekSlotPicker";
import {
  SearchIcon,
  StethoscopeIcon,
} from "../DashboardIcons";

interface BookingTabProps {
  clinic: Clinic;
  allDoctors: Array<any>;
  patientQuery: string;
  patientResults: Array<any>;
  selectedDoctorId: string;
  selectedPatientName: string;
  selectedPatientPhone: string;
  week: Array<any>;
  weekStart: Date;
  nextWeekStart: Date;
  prevWeekStart: Date;
  canGoBack: boolean;
  timeZone: string;
  now: Date;
  slotQueryFn: (params: {
    doctorId: string;
    patientName: string;
    patientPhone: string;
    week?: string;
  }) => string;
  params: Record<string, any>;
  preSelectedSlotId?: string;
}

interface Patient {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  _count: { appointments: number };
}

export function BookingTab({
  clinic,
  allDoctors,
  selectedDoctorId,
  selectedPatientName,
  selectedPatientPhone,
  week,
  weekStart,
  nextWeekStart,
  prevWeekStart,
  canGoBack,
  timeZone,
  now,
  slotQueryFn,
  params,
  preSelectedSlotId,
}: BookingTabProps) {
  const activeDoctors = allDoctors.filter((d) => d.active);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({ name: "", phone: "", email: "" });
  const [isAddingPatient, startAddingTransition] = useTransition();
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState(selectedDoctorId);

  // Handle live search
  const handleSearchChange = async (text: string) => {
    setQuery(text);
    setSearchError(null);

    if (!text.trim()) {
      setSearchResults([]);
      setShowAddForm(false);
      return;
    }

    try {
      const results = await searchPatientsAction(text);
      setSearchResults(results);
      setShowAddForm(results.length === 0);
    } catch (err) {
      setSearchError("Failed to search patients");
      console.error(err);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setQuery("");
    setSearchResults([]);
    setShowAddForm(false);
    setAddFormData({ name: "", phone: "", email: "" });
  };

  const handleAddPatient = async () => {
    if (!addFormData.name.trim() || !addFormData.phone.trim()) return;

    startAddingTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("name", addFormData.name);
        formData.set("phone", addFormData.phone);
        if (addFormData.email) formData.set("email", addFormData.email);

        // Call server action and get the result
        const result = await addPatientAction(formData);

        // Auto-select the newly created patient
        if (result && result.id) {
          setSelectedPatient({
            id: result.id,
            phone: result.phone,
            name: result.name,
            email: result.email,
            _count: { appointments: 0 },
          });
          setQuery("");
          setSearchResults([]);
          setShowAddForm(false);
          setAddFormData({ name: "", phone: "", email: "" });
        }
      } catch (err) {
        setSearchError("Failed to add patient");
        console.error(err);
      }
    });
  };

  const handleChangePatient = () => {
    setSelectedPatient(null);
    setQuery("");
    setSearchResults([]);
    setShowAddForm(false);
    setAddFormData({ name: "", phone: "", email: "" });
  };

  const hasSelectedPatient = selectedPatient !== null;

  return (
    <div className="card" id="assign-doctor">
      <h2 className="card-title-icon">
        <StethoscopeIcon /> Book an Appointment
      </h2>

      {!hasSelectedPatient ? (
        <div style={{ marginBottom: 24 }}>
          {/* Search Input */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 0 }}>
              <span style={{ fontSize: "12.5px", color: "var(--text-muted)", fontWeight: 500 }}>
                Search or add patient
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by name, phone, or email..."
                style={{ marginBottom: 0 }}
              />
            </label>

            {/* Search Results Dropdown */}
            {query && (searchResults.length > 0 || showAddForm) && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "var(--surface)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "var(--radius-sm)",
                  marginTop: 4,
                  maxHeight: "250px",
                  overflowY: "auto",
                  zIndex: 10,
                  boxShadow: "var(--shadow-card)",
                }}
              >
                {searchResults.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "none",
                      background: "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border-soft)",
                      fontSize: "13.5px",
                      color: "var(--text)",
                      transition: "background 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {patient.name || patient.phone}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: 2 }}>
                      {patient.phone}
                      {patient._count.appointments > 0 && ` • ${patient._count.appointments} ${patient._count.appointments === 1 ? "visit" : "visits"}`}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchError && (
              <p style={{ fontSize: "12px", color: "var(--danger)", marginTop: 6 }}>{searchError}</p>
            )}
          </div>

          {/* Add New Patient Form */}
          {showAddForm && (
            <div style={{ marginTop: 16, padding: 12, background: "var(--surface-2)", borderRadius: "var(--radius-sm)" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                Add new patient
              </h3>
              <div className="stack" style={{ maxWidth: "100%" }}>
                <label>
                  Name
                  <input
                    type="text"
                    value={addFormData.name}
                    onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                    placeholder="Patient name"
                  />
                </label>
                <label>
                  Phone
                  <input
                    type="text"
                    value={addFormData.phone}
                    onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                    placeholder="+9665XXXXXXXX"
                  />
                </label>
                <label>
                  Email (optional)
                  <input
                    type="email"
                    value={addFormData.email}
                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                    placeholder="jane@example.com"
                  />
                </label>
                <button
                  onClick={handleAddPatient}
                  disabled={isAddingPatient || !addFormData.name.trim() || !addFormData.phone.trim()}
                  style={{ alignSelf: "flex-start" }}
                >
                  {isAddingPatient ? "Saving…" : "Add patient"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Selected Patient Card */
        <div
          style={{
            padding: 12,
            background: "var(--accent-soft)",
            border: "1px solid #c9dbfa",
            borderRadius: "var(--radius-sm)",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                {selectedPatient.name || selectedPatient.phone}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                {selectedPatient.phone}
                {selectedPatient.email && <div>{selectedPatient.email}</div>}
                {selectedPatient._count.appointments > 0 && (
                  <span className="badge" style={{ marginTop: 6, display: "inline-block" }}>
                    {selectedPatient._count.appointments} {selectedPatient._count.appointments === 1 ? "visit" : "visits"}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleChangePatient}
              style={{
                padding: "6px 12px",
                background: "transparent",
                border: "1px solid #c9dbfa",
                borderRadius: "var(--radius-sm)",
                color: "var(--accent-hover)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Change
            </button>
          </div>
        </div>
      )}

      {hasSelectedPatient && (
        <>
          {/* Doctor Selection */}
          <div style={{ marginBottom: 20 }}>
            <form className="stack" style={{ maxWidth: "100%" }}>
              <label>
                Doctor
                <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}>
                  <option value="">Choose a doctor</option>
                  {activeDoctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.department.name}
                    </option>
                  ))}
                </select>
              </label>
            </form>
          </div>

          {/* Slot Legend */}
          {selectedDoctor && (
            <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
              <span className="slot-btn open" style={{ marginRight: 6, cursor: "default" }}>
                green
              </span>
              open — click to select &nbsp;·&nbsp;
              <span className="slot-btn booked" style={{ marginLeft: 6, cursor: "default" }}>
                red
              </span>
              booked &nbsp;·&nbsp;
              <span className="slot-btn past" style={{ marginLeft: 6, cursor: "default" }}>
                gray
              </span>
              past
            </p>
          )}

          {/* Week Slot Picker */}
          {selectedDoctor && (
            <div>
              <div className="week-nav">
                <a
                  href={
                    canGoBack
                      ? slotQueryFn({
                          doctorId: selectedDoctor,
                          patientName: selectedPatient.name ?? selectedPatient.phone,
                          patientPhone: selectedPatient.phone,
                          week: prevWeekStart.toISOString().split("T")[0],
                        })
                      : undefined
                  }
                  aria-disabled={!canGoBack}
                  style={!canGoBack ? { color: "var(--text-muted)", pointerEvents: "none" } : undefined}
                >
                  ← Previous week
                </a>
                <span className="range">
                  {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone })} –{" "}
                  {nextWeekStart.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone,
                  })}
                </span>
                <a
                  href={slotQueryFn({
                    doctorId: selectedDoctor,
                    patientName: selectedPatient.name ?? selectedPatient.phone,
                    patientPhone: selectedPatient.phone,
                    week: nextWeekStart.toISOString().split("T")[0],
                  })}
                >
                  Next week →
                </a>
              </div>

              <WeekSlotPicker
                doctorId={selectedDoctor}
                patientName={selectedPatient.name ?? selectedPatient.phone}
                patientPhone={selectedPatient.phone}
                preSelectedSlotId={preSelectedSlotId}
                days={week.map((day: any) => ({
                  label: day.date.toLocaleDateString(undefined, { weekday: "short", timeZone }),
                  sub: day.date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone }),
                  slots: day.slots.map((slot: any) => ({
                    id: slot.id,
                    status: slot.status,
                    time: slot.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone }),
                    isPast: slot.startsAt.getTime() < now.getTime(),
                  })),
                }))}
              />
            </div>
          )}

          {/* Status messages */}
          {params.added === "1" && <p style={{ color: "var(--success)", marginTop: 12 }}>Patient saved.</p>}
          {params.error === "missing" && <p className="error" style={{ marginTop: 12 }}>Something went wrong — try picking the slot again.</p>}
          {params.booked === "1" && (
            <p style={{ color: "var(--success)", marginTop: 12 }}>Appointment booked — the doctor will see them once checked in.</p>
          )}
        </>
      )}
    </div>
  );
}
