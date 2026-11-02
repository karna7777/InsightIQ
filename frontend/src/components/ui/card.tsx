import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Surface primitive. Editorial by default: a white panel with a hairline border
 * and soft, realistic elevation. Flags compose extra treatments:
 *   - `interactive` — subtle lift + firmer edge on hover (anything clickable)
 *   - `glass`       — frosted translucent fill (chrome, popovers, overlays)
 *   - `glow`        — a quiet forest ring to mark a featured surface
 *   - `gradientRing`— an accent-tinted border (premium accent)
 */
function Card({
  className,
  interactive = false,
  glass = false,
  glow = false,
  gradientRing = false,
  ...props
}: React.ComponentProps<"div"> & {
  interactive?: boolean;
  glass?: boolean;
  glow?: boolean;
  gradientRing?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border text-card-foreground shadow-[var(--shadow-sm)]",
        glass ? "glass" : "border-border bg-card",
        glow && "ring-1 ring-primary/15 shadow-[var(--shadow-md)]",
        gradientRing && "border-primary/30",
        interactive &&
          "transition-[box-shadow,transform,border-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)]",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-2", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("text-sm font-semibold tracking-tight", className)} {...props} />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("text-xs text-muted-foreground", className)} {...props} />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5 pt-2", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
