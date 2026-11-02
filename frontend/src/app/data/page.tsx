"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Search, UploadCloud } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { RecentDatasets } from "@/components/recent-datasets";
import { uploadDataset } from "@/lib/api";

export default function DataLibraryPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const upload = await uploadDataset(files[0]);
      try {
        sessionStorage.setItem(`iq:name:${upload.dataset_id}`, upload.filename);
      } catch {}
      router.push(`/d/${upload.dataset_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="Datasets"
      subtitle="Every file you've analyzed"
      actions={
        <label className="hidden cursor-pointer items-center gap-2 rounded-[0.55rem] bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-sm)] transition-all hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-md)] sm:flex">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
          <span>Upload</span>
          <input
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm"
            className="hidden"
            disabled={busy}
            onChange={(e) => onPick(e.target.files)}
          />
        </label>
      }
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search datasets…"
              className="h-10 w-full rounded-full border border-border bg-card/60 pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60"
            />
          </div>
          {/* mobile upload */}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-border-strong bg-card/60 px-4 py-2 text-sm font-medium sm:hidden">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
            Upload file
            <input
              type="file"
              accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm"
              className="hidden"
              disabled={busy}
              onChange={(e) => onPick(e.target.files)}
            />
          </label>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-[var(--radius)] border border-[var(--sem-crit)]/40 bg-[var(--sem-crit-bg)] px-4 py-3.5 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--sem-crit)]" />
            <div className="text-muted-foreground">{error}</div>
          </div>
        )}

        <RecentDatasets query={query} />
      </div>
    </AppShell>
  );
}
