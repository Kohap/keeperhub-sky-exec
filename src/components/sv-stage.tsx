import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SvStage({
  children,
  className,
  strength = 10,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(max-width: 639px)").matches) return;

    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / innerWidth - 0.5;
      const ny = e.clientY / innerHeight - 0.5;
      el.style.setProperty("--sv-rx", `${(-ny * strength).toFixed(2)}deg`);
      el.style.setProperty("--sv-ry", `${(nx * strength).toFixed(2)}deg`);
    };
    const onLeave = () => {
      el.style.setProperty("--sv-rx", "0deg");
      el.style.setProperty("--sv-ry", "0deg");
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [strength]);

  return (
    <div
      ref={ref}
      className={cn("sv-stage pointer-events-none absolute inset-0", className)}
      aria-hidden
    >
      {children}
    </div>
  );
}
