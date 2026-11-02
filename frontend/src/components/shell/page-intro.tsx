import { cn } from "@/lib/utils";

/** Consistent per-screen heading: eyebrow + title + optional lead and action. */
export function PageIntro({
  eyebrow,
  title,
  lead,
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-7 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{title}</h1>
        {lead && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{lead}</p>}
      </div>
      {action}
    </div>
  );
}
