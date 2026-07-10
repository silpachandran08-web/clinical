import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClinic, listDoctors } from "@/src/adminHandlers";
import {
  getDayParam,
  getWeekStart,
  listDoctorsStatusForDay,
  listMultiWeekSlotsForDoctors,
  listOpenEscalations,
  listTodayAppointments,
  listWeekSlots,
  searchPatients,
} from "@/src/receptionistHandlers";
import { AutoRefresh } from "../AutoRefresh";
import { CalendarIcon, CheckCircleIcon, ClockIcon, StethoscopeIcon } from "../DashboardIcons";
import { TabsNav } from "./TabsNav";
import { OverviewTab } from "./OverviewTab";
import { BookingTab } from "./BookingTab";
import { QueueTab } from "./QueueTab";
import { BillingTab } from "./BillingTab";
import { DoctorsTab } from "./DoctorsTab";

const DAY_MS = 24 * 60 * 60 * 1000;

type ReceptionistParams = {
  doctorId?: string;
  error?: string;
  booked?: string;
  patientQuery?: string;
  added?: string;
  patientName?: string;
  patientPhone?: string;
  week?: string;
  slotId?: string;
  tab?: string;
};

export default async function ReceptionistPage({
  searchParams,
}: {
  searchParams: Promise<ReceptionistParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const currentTab = params.tab || "overview";

  const clinic = await getClinic(session.clinicId);
  const timeZone = clinic.timezone;

  const today = getDayParam(undefined, timeZone);
  const selectedDoctorId = params.doctorId ?? "";
  const patientQuery = params.patientQuery ?? "";

  const weekStart = getWeekStart(params.week, timeZone);
  const prevWeekStart = new Date(weekStart.getTime() - 7 * DAY_MS);
  const nextWeekStart = new Date(weekStart.getTime() + 7 * DAY_MS);
  const thisWeekStart = getWeekStart(undefined, timeZone);
  const canGoBack = weekStart > thisWeekStart;

  // Appointments + doctor status feed the always-visible stat cards; every
  // other dataset belongs to a single tab, so only the active tab pays for
  // its own queries (this page re-renders on every AutoRefresh poll).
  const isBooking = currentTab === "booking";
  const needsDoctorList = isBooking || currentTab === "doctors";
  const [appointments, todayDoctorStatus, allDoctors, escalations, week, patientResults] = await Promise.all([
    listTodayAppointments(session.clinicId, timeZone),
    listDoctorsStatusForDay(session.clinicId, today),
    needsDoctorList ? listDoctors(session.clinicId) : Promise.resolve([]),
    currentTab === "overview" ? listOpenEscalations(session.clinicId) : Promise.resolve([]),
    isBooking && selectedDoctorId
      ? listWeekSlots(session.clinicId, selectedDoctorId, weekStart)
      : Promise.resolve([]),
    isBooking && patientQuery ? searchPatients(session.clinicId, patientQuery) : Promise.resolve([]),
  ]);

  // Doctors tab: multi-week slot grids (current week + 3 ahead), all doctors
  // and weeks fetched in one batched query.
  const currentWeekStart = getWeekStart(undefined, timeZone);
  let doctorsWithWeeks: Array<{
    id: string;
    name: string;
    department: (typeof allDoctors)[number]["department"];
    isLive: boolean;
    weeksData: Array<{ weekStart: Date; weekLabel: string; days: Awaited<ReturnType<typeof listWeekSlots>> }>;
  }> = [];
  if (currentTab === "doctors") {
    const activeDoctors = allDoctors.filter((d) => d.active);
    const weeksByDoctor = await listMultiWeekSlotsForDoctors(
      session.clinicId,
      activeDoctors.map((d) => d.id),
      currentWeekStart,
      4
    );
    doctorsWithWeeks = activeDoctors.map((doc) => ({
      id: doc.id,
      name: doc.name,
      department: doc.department,
      isLive: todayDoctorStatus.find((d) => d.id === doc.id)?.isLive ?? false,
      weeksData: (weeksByDoctor.get(doc.id) ?? []).map((days, i) => {
        const wkStart = new Date(currentWeekStart.getTime() + i * 7 * DAY_MS);
        const wkEnd = new Date(wkStart.getTime() + 7 * DAY_MS);
        const weekLabel = `${wkStart.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone })} – ${wkEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone })}`;
        return { weekStart: wkStart, weekLabel, days };
      }),
    }));
  }

  const selectedPatientName = params.patientName ?? "";
  const selectedPatientPhone = params.patientPhone ?? "";

  const waitingCount = todayDoctorStatus.reduce((sum, d) => sum + d.waiting.length, 0);
  const inProgressCount = todayDoctorStatus.filter((d) => d.inProgressWith).length;
  const now = new Date();

  return (
    <div>
      <AutoRefresh />
      <div className="page-header">
        <h1>Reception Desk</h1>
        <span className="date">
          {now.toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone,
          })}
        </span>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon"><StethoscopeIcon /></div>
          <div className="stat-value">{todayDoctorStatus.length}</div>
          <div className="stat-label">Doctors active</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><CalendarIcon /></div>
          <div className="stat-value">{appointments.length}</div>
          <div className="stat-label">Appointments</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><CheckCircleIcon /></div>
          <div className="stat-value">{inProgressCount}</div>
          <div className="stat-label">In consultation</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><ClockIcon /></div>
          <div className="stat-value">{waitingCount}</div>
          <div className="stat-label">Waiting</div>
        </div>
      </div>

      <TabsNav />

      <div style={{ padding: "0 24px", maxWidth: "1400px", margin: "0 auto" }}>
        {currentTab === "overview" && (
          <OverviewTab
            clinic={clinic}
            todayDoctorStatus={todayDoctorStatus}
            appointments={appointments}
            escalations={escalations}
            timeZone={timeZone}
          />
        )}

        {currentTab === "doctors" && (
          <DoctorsTab clinic={clinic} doctors={doctorsWithWeeks} now={now} />
        )}

        {currentTab === "booking" && (
          <BookingTab
            clinic={clinic}
            allDoctors={allDoctors.map((d) => ({
              id: d.id,
              name: d.name,
              active: d.active,
              department: { name: d.department.name },
            }))}
            patientQuery={patientQuery}
            patientResults={patientResults}
            selectedDoctorId={selectedDoctorId}
            selectedPatientName={selectedPatientName}
            selectedPatientPhone={selectedPatientPhone}
            week={week.map((day: any) => ({
              ...day,
              date: day.date.toISOString(),
              slots: day.slots.map((slot: any) => ({
                ...slot,
                startsAt: slot.startsAt.toISOString(),
              })),
            }))}
            weekStart={weekStart.toISOString()}
            nextWeekStart={nextWeekStart.toISOString()}
            prevWeekStart={prevWeekStart.toISOString()}
            canGoBack={canGoBack}
            timeZone={timeZone}
            now={now.toISOString()}
            params={params}
            preSelectedSlotId={params.slotId}
          />
        )}

        {currentTab === "queue" && (
          <QueueTab appointments={appointments} timeZone={timeZone} />
        )}

        {currentTab === "billing" && <BillingTab clinic={clinic} timeZone={timeZone} />}
      </div>
    </div>
  );
}
