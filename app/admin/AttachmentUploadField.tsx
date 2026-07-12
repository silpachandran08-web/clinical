"use client";

import { useRef, useState } from "react";

// Larger than PhotoUploadField's 256px profile-thumbnail cap — a scanned lab
// slip or X-ray needs to stay legible, not just recognizable. Still stored
// inline as a base64 data URL in Postgres (no object storage configured yet
// in this app); a 1600px JPEG at q0.9 typically lands in the low hundreds of
// KB, versus tens of KB for a thumbnail. Fine at MVP scale for a handful of
// attachments per visit — revisit with real object storage before this field
// type sees heavy volume. Images only: canvas-based resize can't rasterize a
// PDF, so PDF upload isn't supported in v1.
const MAX_DIMENSION = 1600;

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
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function AttachmentUploadField({
  name,
  label,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  const [preview, setPreview] = useState(defaultValue ?? "");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PDF isn't supported yet).");
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
      {label} <span className="muted" style={{ fontSize: 11.5 }}>(image only)</span>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            style={{
              maxWidth: 120,
              maxHeight: 120,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-soft)",
              objectFit: "contain",
            }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            required={required && !preview}
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
              Remove
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
