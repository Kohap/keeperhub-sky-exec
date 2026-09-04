import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SvStage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("sv-stage pointer-events-none absolute inset-0", className)}
      aria-hidden
    >
      {children}
    </div>
  );
}
