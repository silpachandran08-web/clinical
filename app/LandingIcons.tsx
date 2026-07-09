const common = {
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ChatIcon() {
  return (
    <svg {...common}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function CalendarGridIcon() {
  return (
    <svg {...common}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 3v3M16 3v3" />
      <path d="M7.5 13h2.5M11.5 13H14M15.5 13H17M7.5 16.5h2.5M11.5 16.5H14" />
    </svg>
  );
}

export function DesktopIcon() {
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
      <path d="M7 8.5l2 2-2 2M12.5 12.5h2.5" />
    </svg>
  );
}

export function StethoscopeIcon() {
  return (
    <svg {...common}>
      <path d="M6 4v6a4 4 0 0 0 8 0V4" />
      <path d="M6 4H4.5M14 4h1.5" />
      <path d="M14 10v2a6 6 0 0 1-12 0v-1.5" />
      <circle cx="19" cy="15" r="2.2" />
      <path d="M19 12.8V10" />
    </svg>
  );
}

export function BellRepeatIcon() {
  return (
    <svg {...common}>
      <path d="M9 17a3 3 0 0 0 6 0" />
      <path d="M6 17V11a6 6 0 0 1 9.4-4.95" />
      <path d="M18 8V6a6 6 0 0 0-1.4-3.85" />
      <path d="M16.5 2.3 18 3.8l1.7-1.3" />
    </svg>
  );
}

export function ChartIcon() {
  return (
    <svg {...common}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7.5 16v-4M12 16V8M16.5 16v-6.5" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}
