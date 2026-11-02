"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Database, FileSpreadsheet, Search } from "lucide-react";
import { listDatasets } from "@/lib/api";
import { cn, pretty } from "@/lib/utils";
import { GLOBAL_NAV, datasetNav, type NavItem } from "./nav";
import type { DatasetSummary } from "@/lib/types";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  group: string;
  href: string;
  icon: React.ElementType;
}

export function CommandPalette({
  open,
  onClose,
  activeDatasetId,
}: {
  open: boolean;
  onClose: () => void;
  activeDatasetId?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load datasets whenever the palette opens; reset transient state.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    listDatasets()
      .then(setDatasets)
      .catch(() => setDatasets([]));
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(t);
  }, [open]);

  const commands = useMemo<Cmd[]>(() => {
    const navItems: NavItem[] = [
      ...GLOBAL_NAV,
      ...(activeDatasetId ? datasetNav(activeDatasetId) : []),
    ];
    const nav: Cmd[] = navItems.map((n) => ({
      id: `nav:${n.href}`,
      label: n.label,
      group: "Navigate",
      href: n.href,
      icon: n.icon,
    }));
    const data: Cmd[] = datasets.map((d) => ({
      id: `ds:${d.id}`,
      label: d.filename,
      hint: `${d.row_count.toLocaleString()} rows`,
      group: "Datasets",
      href: `/d/${d.id}`,
      icon: FileSpreadsheet,
    }));
    return [...nav, ...data];
  }, [datasets, activeDatasetId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        pretty(c.label).toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Group preserving order.
  const groups = useMemo(() => {
    const out: { name: string; items: Cmd[] }[] = [];
    for (const c of filtered) {
      let g = out.find((x) => x.name === c.group);
      if (!g) {
        g = { name: c.group, items: [] };
        out.push(g);
      }
      g.items.push(c);
    }
    return out;
  }, [filtered]);

  function run(cmd: Cmd | undefined) {
    if (!cmd) return;
    onClose();
    router.push(cmd.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(filtered[cursor]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!open) return null;

  let flatIndex = -1;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[14vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-[var(--radius)] glass shadow-[var(--shadow-lg)]">
        <div className="flex items-center gap-3 border-b border-glass-border px-4" style={{ borderColor: "var(--glass-border)" }}>
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search datasets or jump to a view…"
            className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border border-border-strong px-1.5 py-0.5 text-[0.6rem] text-muted-foreground sm:block">
            ESC
          </kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              Nothing matches “{query}”.
            </div>
          )}
          {groups.map((g) => (
            <div key={g.name} className="mb-1">
              <div className="flex items-center gap-1.5 px-2 pb-1 pt-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {g.name === "Datasets" ? <Database className="size-3" /> : null}
                {g.name}
              </div>
              {g.items.map((c) => {
                flatIndex += 1;
                const idx = flatIndex;
                const active = idx === cursor;
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => run(c)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      active ? "bg-primary/15 text-foreground" : "text-secondary-foreground hover:bg-foreground/5",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                    <span className="flex-1 truncate">{c.label}</span>
                    {c.hint && <span className="text-xs text-muted-foreground tabular-nums">{c.hint}</span>}
                    {active && <CornerDownLeft className="size-3.5 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
