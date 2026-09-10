import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Surface primitive. Uses the editorial elevation tokens (--shadow-*) instead of
 * a flat hairline. Pass `interactive` for a subtle lift on hover (charts, tiles,
 * anything clickable/scannable); leave it off for static panels.
 */
function Card({
  className,
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-border bg-card text-card-foreground shadow-[var(--shadow-sm)]",
        interactive &&
          "transition-[box-shadow,transform,border-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-[var(--shadow-md)]",
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
