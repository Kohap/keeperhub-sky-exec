import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-md text-sm font-medium touch-manipulation transition-[opacity,transform,background-color,box-shadow,color] duration-(--motion-fast) ease-(--ease-out) hover:duration-(--motion-fast) hover:ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40 active:scale-[var(--scale-press)]",
  {
    variants: {
      variant: {
        primary: "btn-shine bg-accent text-accent-fg hover:opacity-90",
        ghost:
          "bg-transparent text-fg shadow-border hover:bg-surface-2 hover:shadow-border-hover aria-pressed:bg-surface-2 aria-pressed:shadow-border-hover",
        danger: "bg-danger text-paper hover:opacity-90",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-8 px-2.5 text-xs",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
    </button>
  );
}
