"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type TabId = "overview" | "doctors" | "booking" | "queue" | "billing";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "doctors", label: "Doctors" },
  { id: "booking", label: "Booking" },
  { id: "queue", label: "Queue" },
  { id: "billing", label: "Billing" },
];

export function TabsNav() {
  const searchParams = useSearchParams();
  const currentTab = (searchParams.get("tab") as TabId) || "overview";

  return (
    <div className="tabs-nav">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`/receptionist?tab=${tab.id}`}
          className={`tab-link ${currentTab === tab.id ? "active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
