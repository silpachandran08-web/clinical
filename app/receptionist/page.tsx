import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClinic, listDoctors } from "@/src/adminHandlers";
import {
  formatDayParam,
  formatWeekParam,
  getDayParam,
  getWeekStart,
  listDoctorsStatusForDay,
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
  statusDay?: string;
  slotId?: string;
  tab?: string;
};

function slotQuery(params: {
  doctorId: string;
  patientName: string;
  patientPhone: string;
  week?: string;
}) {
  const q = new URLSearchParams();
  q.set("tab", "booking");
  q.set("doctorId", params.doctorId);
  if (params.patientName) q.set("patientName", params.patientName);
  if (params.patientPhone) q.set("patientPhone", params.patientPhone);
  if (params.week) q.set("week", params.week);
  return `/receptionist?${q.toString()}#assign-doctor`;
}

export default async function ReceptionistPage({
  searchParams,
}: {
  searchParams: Promise<ReceptionistParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;

  const clinic = await getClinic(session.clinicId);
  const timeZone = clinic.timezone;

  const today = getDayParam(undefined, timeZone);
  const statusDay = getDayParam(params.statusDay, timeZone);
  const isToday = statusDay.getTime() === today.getTime();
  const prevDay = new Date(statusDay.getTime() - DAY_MS);
  const nextDay = new Date(statusDay.getTime() + DAY_MS);
  const canGoBackDay = statusDay > today;

  const [appointments, todayDoctorStatus, browsedDoctorStatus, allDoctors, escalations] = await Promise.all([
    listTodayAppointments(session.clinicId, timeZone),
    listDoctorsStatusForDay(session.clinicId, today),
    isToday ? Promise.resolve(null) : listDoctorsStatusForDay(session.clinicId, statusDay),
    listDoctors(session.clinicId),
    listOpenEscalations(session.clinicId),
  ]);
  const doctorStatus = browsedDoctorStatus ?? todayDoctorStatus;

  // Fetch multi-week slots for Doctors tab (current week + 3 weeks ahead)
  const currentWeekStart = getWeekStart(undefined, timeZone);
  const doctorsWithWeeks = await Promise.all(
    allDoctors
      .filter((d) => d.active)
      .map(async (doc) => {
        const weeksData = [];
        for (let i = 0; i < 4; i++) {
          const weekStart = new Date(
            currentWeekStart.getTime() + i * 7 * 24 * 60 * 60 * 1000
          );
          const weekEnd = new Date(
            weekStart.getTime() + 7 * 24 * 60 * 60 * 1000
          );
          const slots = await listWeekSlots(session.clinicId, doc.id, weekStart);
          const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone })}`;
          weeksData.push({ weekStart, weekLabel, days: slots });
        }
        return {
          id: doc.id,
          name: doc.name,
          department: doc.department,
          isLive: todayDoctorStatus.find((d) => d.id === doc.id)?.isLive ?? false,
          weeksData,
        };
      })
  );

  const activeDoctors = allDoctors.filter((d) => d.active);
  const selectedDoctorId = params.doctorId ?? "";

  const weekStart = getWeekStart(params.week, timeZone);
  const prevWeekStart = new Date(weekStart.getTime() - 7 * DAY_MS);
  const nextWeekStart = new Date(weekStart.getTime() + 7 * DAY_MS);
  const thisWeekStart = getWeekStart(undefined, timeZone);
  const canGoBack = weekStart > thisWeekStart;

  const week = selectedDoctorId ? await listWeekSlots(session.clinicId, selectedDoctorId, weekStart) : [];

  const patientQuery = params.patientQuery ?? "";
  const patientResults = patientQuery ? await searchPatients(session.clinicId, patientQuery) : [];

  const selectedPatientName = params.patientName ?? "";
  const selectedPatientPhone = params.patientPhone ?? "";
  const hasSelectedPatient = Boolean(selectedPatientPhone);

  const waitingCount = todayDoctorStatus.reduce((sum, d) => sum + d.waiting.length, 0);
  const inProgressCount = todayDoctorStatus.filter((d) => d.inProgressWith).length;
  const now = new Date();
  const currentTab = params.tab || "overview";

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
          <DoctorsTab clinic={clinic} doctors={doctorsWithWeeks} />
        )}

        {currentTab === "booking" && (
          <BookingTab
            clinic={clinic}
            allDoctors={allDoctors}
            patientQuery={patientQuery}
            patientResults={patientResults}
            selectedDoctorId={selectedDoctorId}
            selectedPatientName={selectedPatientName}
            selectedPatientPhone={selectedPatientPhone}
            week={week}
            weekStart={weekStart}
            nextWeekStart={nextWeekStart}
            prevWeekStart={prevWeekStart}
            canGoBack={canGoBack}
            timeZone={timeZone}
            now={now}
            slotQueryFn={slotQuery}
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
