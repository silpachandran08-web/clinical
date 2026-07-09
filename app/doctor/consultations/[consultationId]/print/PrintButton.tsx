"use client";

import { PrinterIcon } from "../../../../DashboardIcons";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()}>
      <PrinterIcon size={15} /> Print
    </button>
  );
}
