import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Spinner } from "@/components/ui/Spinner";

type Variant = "primary" | "secondary" | "ghost" | "subtle" | "danger" | "orange";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover border border-transparent",
  secondary: "bg-white text-ink-soft border border-border hover:bg-surface hover:border-border-strong",
  ghost: "bg-transparent text-ink-soft border border-transparent hover:bg-surface-muted",
  subtle: "bg-primary-soft text-primary-hover border border-primary-border hover:bg-[#e7e2ff]",
  danger: "bg-danger text-white border border-transparent hover:bg-[#c43f4f]",
  orange: "bg-accent-orange text-white border border-transparent hover:bg-[#e0812e]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[12.5px] gap-1.5",
  md: "h-9 px-3.5 text-[13px] gap-2",
  lg: "h-11 px-5 text-[14px] gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center rounded-[9px] font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-55",
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {loading ? <Spinner size={14} /> : icon}
      {children}
      {iconRight}
    </button>
  );
}
