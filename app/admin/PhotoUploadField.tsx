"use client";

import { useRef, useState } from "react";

// Kept small deliberately: this gets stored as a base64 data URL directly in
// Postgres (no external object storage wired up yet), so downscaling on the
// client before it ever leaves the browser keeps rows small — a 256px JPEG
// at q0.85 lands around 15-40KB, versus multiple MB for an unresized phone photo.
const MAX_DIMENSION = 256;

function resizeImage(file: File, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Not a valid image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height / width) * maxDim);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width / height) * maxDim);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function PhotoUploadField({
  name,
  label = "Profile photo",
  defaultValue,
}: {
  name: string;
  label?: string;
  defaultValue?: string | null;
}) {
  const [preview, setPreview] = useState(defaultValue ?? "");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    try {
      setPreview(await resizeImage(file, MAX_DIMENSION));
    } catch {
      setError("Could not read that image — try a different file.");
    }
  }

  function handleRemove() {
    setPreview("");
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <label>
      {label}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            overflow: "hidden",
            background: "var(--surface-2)",
            border: "1px solid var(--border-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>No photo</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ fontSize: 12.5, padding: 0, border: "none", background: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {preview && (
            <button
              type="button"
              className="secondary"
              style={{ width: "fit-content", fontSize: 12, padding: "4px 10px" }}
              onClick={handleRemove}
            >
              Remove photo
            </button>
          )}
        </div>
      </div>
      {error && (
        <span className="error" style={{ fontSize: 12 }}>
          {error}
        </span>
      )}
      <input type="hidden" name={name} value={preview} />
    </label>
  );
}
