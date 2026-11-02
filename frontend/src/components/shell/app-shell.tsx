"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Command,
  Menu,
  PanelLeft,
  PanelLeftClose,
  X,
} from "lucide-react";
import { Brand } from "@/components/shell/brand";
import { CommandPalette } from "@/components/shell/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { GLOBAL_NAV, datasetNav, type NavItem } from "@/components/shell/nav";
import { cn } from "@/lib/utils";

export interface ActiveDataset {
  id: string;
  filename: string;
}

export function AppShell({
  title,
  subtitle,
  dataset,
  actions,
  children,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  dataset?: ActiveDataset;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const pathname = usePathname();

  // Restore the collapsed preference.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("iq:sidebar") === "collapsed");
    } catch {}
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("iq:sidebar", next ? "collapsed" : "open");
      } catch {}
      return next;
    });
  }, []);

  // Close the mobile drawer on route change.
  useEffect(() => setDrawer(false), [pathname]);

  // Global ⌘K / Ctrl-K to open the command palette.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-dvh">
      {/* ---- desktop sidebar ---- */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur-xl transition-[width] duration-300 ease-[var(--ease-out)] md:flex",
          collapsed ? "w-[70px]" : "w-[248px]",
        )}
      >
        <SidebarBody
          collapsed={collapsed}
          dataset={dataset}
          onToggle={toggleCollapsed}
        />
      </aside>

      {/* ---- mobile drawer ---- */}
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[260px] border-r border-border glass">
            <div className="flex justify-end p-3">
              <button
                onClick={() => setDrawer(false)}
                className="grid size-8 place-items-center rounded-lg hover:bg-foreground/10"
                aria-label="Close menu"
              >
                <X className="size-4" />
              </button>
            </div>
            <SidebarBody collapsed={false} dataset={dataset} />
          </aside>
        </div>
      )}

      {/* ---- main column ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setDrawer(true)}
            className="grid size-9 place-items-center rounded-lg hover:bg-foreground/10 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>

          <div className="min-w-0 flex-1">
            {title && (
              <div className="truncate font-display text-sm font-semibold tracking-tight sm:text-[0.95rem]">
                {title}
              </div>
            )}
            {subtitle && (
              <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
            )}
          </div>

          <button
            onClick={() => setPalette(true)}
            className="hidden items-center gap-2 rounded-full border border-border-strong bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground sm:flex"
            aria-label="Open command palette"
          >
            <Command className="size-3.5" />
            Search
            <kbd className="rounded bg-foreground/10 px-1.5 py-0.5 text-[0.6rem] font-medium">⌘K</kbd>
          </button>

          {actions}
          <ThemeToggle />
        </header>

        <main className="flex-1">{children}</main>
      </div>

      <CommandPalette
        open={palette}
        onClose={() => setPalette(false)}
        activeDatasetId={dataset?.id}
      />
    </div>
  );
}

function SidebarBody({
  collapsed,
  dataset,
  onToggle,
}: {
  collapsed: boolean;
  dataset?: ActiveDataset;
  onToggle?: () => void;
}) {
  return (
    <>
      <div
        className={cn(
          "flex h-14 items-center border-b border-border px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <Brand href="/" compact={collapsed} />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <NavGroup label="Platform" items={GLOBAL_NAV} collapsed={collapsed} />
        {dataset && (
          <div>
            {!collapsed && (
              <div className="mb-2 px-2">
                <div className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Analysis
                </div>
                <div className="mt-1 truncate text-xs font-medium text-secondary-foreground" title={dataset.filename}>
                  {dataset.filename}
                </div>
              </div>
            )}
            <NavGroup items={datasetNav(dataset.id)} collapsed={collapsed} exactFor={`/d/${dataset.id}`} />
          </div>
        )}
      </nav>

      {onToggle && (
        <div className="border-t border-border p-3">
          <button
            onClick={onToggle}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground",
              collapsed && "justify-center",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      )}
    </>
  );
}

function NavGroup({
  label,
  items,
  collapsed,
  exactFor,
}: {
  label?: string;
  items: NavItem[];
  collapsed: boolean;
  exactFor?: string;
}) {
  const pathname = usePathname();
  return (
    <div>
      {label && !collapsed && (
        <div className="mb-2 px-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
      )}
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active =
            item.href === exactFor
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  collapsed && "justify-center",
                  active
                    ? "bg-primary/12 text-foreground"
                    : "text-secondary-foreground hover:bg-foreground/5 hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                )}
                <Icon
                  className={cn(
                    "size-[1.1rem] shrink-0 transition-colors",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && item.step != null && (
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded-full text-[0.58rem] font-semibold tabular-nums",
                      active ? "bg-primary text-primary-foreground" : "bg-foreground/10 text-muted-foreground",
                    )}
                  >
                    {item.step}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
