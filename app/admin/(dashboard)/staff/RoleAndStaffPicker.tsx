"use client";

import { useState } from "react";

type Role = "RECEPTIONIST" | "DOCTOR" | "NURSE" | "LAB";

interface DoctorOption {
  id: string;
  name: string;
  departmentName: string;
  departmentKind: "MEDICAL" | "NURSE" | "LAB";
}

const ROLE_TO_KIND: Record<Exclude<Role, "RECEPTIONIST">, "MEDICAL" | "NURSE" | "LAB"> = {
  DOCTOR: "MEDICAL",
  NURSE: "NURSE",
  LAB: "LAB",
};

interface Props {
  unlinkedDoctors: DoctorOption[];
  hasLabDepartment: boolean;
  defaultRole?: Role;
  defaultDoctorId?: string;
}

export function RoleAndStaffPicker({ unlinkedDoctors, hasLabDepartment, defaultRole = "RECEPTIONIST", defaultDoctorId = "" }: Props) {
  const [role, setRole] = useState<Role>(defaultRole);
  const showLab = hasLabDepartment || defaultRole === "LAB";
  const needsStaffRecord = role !== "RECEPTIONIST";
  const eligibleKind = needsStaffRecord ? ROLE_TO_KIND[role] : null;
  const eligibleDoctors = needsStaffRecord
    ? unlinkedDoctors.filter((d) => d.departmentKind === eligibleKind)
    : [];
  const kindLabel = eligibleKind === "MEDICAL" ? "medical" : eligibleKind?.toLowerCase();

  return (
    <>
      <label>
        Role
        <select name="role" required value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="RECEPTIONIST">Receptionist</option>
          <option value="DOCTOR">Doctor</option>
          <option value="NURSE">Nurse</option>
          {showLab && <option value="LAB">Lab</option>}
        </select>
      </label>
      {needsStaffRecord && (
        <>
          <label>
            Which staff record is this?
            {eligibleDoctors.length > 0 ? (
              <select name="doctorId" defaultValue={defaultDoctorId} required>
                <option value="" disabled>
                  Choose one…
                </option>
                {eligibleDoctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.departmentName}
                  </option>
                ))}
              </select>
            ) : (
              <select name="doctorId" disabled>
                <option>— none available —</option>
              </select>
            )}
          </label>
          {eligibleDoctors.length === 0 && (
            <p className="muted" style={{ marginTop: -4, fontSize: 12.5 }}>
              No unlinked {kindLabel} staff records. Add one under{" "}
              <a href="/admin/doctors">Doctors</a> first (pick a {kindLabel === "medical" ? "medical" : `${kindLabel}-kind`} department).
            </p>
          )}
        </>
      )}
    </>
  );
}
