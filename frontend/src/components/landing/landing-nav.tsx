"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useScroll } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Brand } from "@/components/shell/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Features", href: "#features", id: "features" },
  { label: "How it works", href: "#how", id: "how" },
  { label: "The loop", href: "#loop", id: "loop" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("");
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy: highlight the section currently in view.
  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter(Boolean) as HTMLElement[];
    if (!sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-border bg-background/80 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Brand href="/" />

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                "relative px-3 py-2 text-sm transition-colors",
                active === l.id ? "text-foreground" : "text-secondary-foreground hover:text-foreground",
              )}
            >
              {l.label}
              {active === l.id && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/app"
            className="group hidden items-center gap-1.5 rounded-[0.55rem] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-sm)] transition-all hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-md)] sm:flex"
          >
            Launch InsightIQ
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            className="grid size-9 place-items-center rounded-lg text-foreground hover:bg-foreground/6 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* reading progress */}
      <motion.span
        aria-hidden
        style={{ scaleX: scrollYProgress }}
        className={cn(
          "absolute bottom-0 left-0 h-0.5 w-full origin-left bg-primary transition-opacity duration-300",
          scrolled ? "opacity-100" : "opacity-0",
        )}
      />

      {/* mobile sheet */}
      {open && (
        <div className="border-b border-border bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-secondary-foreground hover:bg-foreground/5 hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/app"
              className="mt-2 flex items-center justify-center gap-1.5 rounded-[0.55rem] bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Launch InsightIQ <ArrowRight className="size-3.5" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
