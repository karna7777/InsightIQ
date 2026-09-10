"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = ".csv,.tsv,.txt,.xlsx,.xls,.xlsm";

export function UploadZone({
  onFile,
  busy,
}: {
  onFile: (file: File) => void;
  busy: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function pick(files: FileList | null) {
    if (files && files.length) onFile(files[0]);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload a CSV or Excel file"
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !busy) inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!busy) pick(e.dataTransfer.files);
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center gap-5 overflow-hidden rounded-[calc(var(--radius)+0.375rem)] border border-dashed border-border bg-card px-6 py-20 text-center transition-all duration-300 ease-[var(--ease-out)]",
        "hover:border-foreground/25 hover:shadow-[var(--shadow-md)]",
        dragging && "scale-[1.01] border-solid border-primary bg-primary/5 shadow-[var(--shadow-lg)]",
        busy && "pointer-events-none",
      )}
    >
      {/* soft radial wash that intensifies on drag — pure decoration */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500",
          "bg-[radial-gradient(120%_120%_at_50%_-10%,var(--primary),transparent_55%)]",
          dragging ? "opacity-[0.06]" : "group-hover:opacity-[0.03]",
        )}
      />

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />

      <div
        className={cn(
          "relative flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-300 ease-[var(--ease-out)]",
          dragging ? "-translate-y-1 scale-110" : "group-hover:-translate-y-0.5",
        )}
      >
        {busy ? (
          <Loader2 className="size-7 animate-spin" />
        ) : (
          <UploadCloud className="size-7" />
        )}
      </div>

      <div className="relative">
        <div className="text-xl font-medium tracking-tight text-foreground">
          {busy
            ? "Building your dashboard…"
            : dragging
              ? "Release to begin"
              : "Drop a spreadsheet to begin"}
        </div>
        <div className="mt-1.5 text-sm text-muted-foreground">
          {busy
            ? "Profiling columns and computing charts"
            : "or click to choose a CSV or Excel file"}
        </div>
      </div>

      <div className="relative flex items-center gap-1.5 text-xs text-muted-foreground">
        <FileSpreadsheet className="size-3.5" />
        .csv · .xlsx · .xls — stays on your machine
      </div>
    </div>
  );
}
