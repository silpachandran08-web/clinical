import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
          background: "linear-gradient(135deg, #0891b2, #2563eb)",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4v6a4 4 0 0 0 8 0V4" />
          <path d="M6 4H4.5M14 4h1.5" />
          <path d="M14 10v2a6 6 0 0 1-12 0v-1.5" />
          <circle cx="19" cy="15" r="2.2" />
          <path d="M19 12.8V10" />
        </svg>
      </div>
    ),
    size,
  );
}
