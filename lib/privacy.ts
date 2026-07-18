// PII-masking helpers for anything that leaves the database boundary —
// server logs, error messages, audit-log detail strings. Never use these
// for data shown to the staff dashboards themselves (staff legitimately
// see full patient contact details there).

/** +9665XXXXXXXX -> +9665*****XX — keeps country code and last 2 digits. */
export function maskPhone(phone: string): string {
  if (!phone) return phone;
  const keepStart = phone.startsWith("+") ? 5 : 4;
  if (phone.length <= keepStart + 2) return phone.replace(/\d/g, "*");
  return (
    phone.slice(0, keepStart) +
    "*".repeat(phone.length - keepStart - 2) +
    phone.slice(-2)
  );
}

/** jane.doe@example.com -> j***@example.com */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  return `${local.charAt(0)}***@${domain}`;
}
