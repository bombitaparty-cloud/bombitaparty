"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { TLink } from "./TLink";
import { Magnetic } from "@/components/animations/Magnetic";
import { cn, isExternal } from "@/lib/utils";

type Variant = "gold" | "outline" | "ghost" | "light" | "red";
type Size = "sm" | "md" | "lg";

interface Common {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  /** Show trailing arrow (external links get ↗). */
  arrow?: boolean;
  magnetic?: boolean;
}

type AsLink = Common & { href: string; onClick?: () => void; ariaLabel?: string };
type AsButton = Common & { href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>;

const base =
  "group/btn relative inline-flex select-none items-center justify-center gap-3 overflow-hidden whitespace-nowrap font-sans font-bold uppercase tracking-[0.22em] transition-[color,border-color,box-shadow] duration-500 ease-[var(--ease-expo)] disabled:pointer-events-none disabled:opacity-50";

const sizes: Record<Size, string> = {
  sm: "h-10 px-5 text-[0.625rem]",
  md: "h-12 px-7 text-[0.6875rem]",
  lg: "h-14 px-9 text-xs",
};

const variants: Record<Variant, string> = {
  gold:
    "bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500 bg-[length:200%_100%] bg-left text-ink-950 shadow-[0_0_0_rgba(224,185,79,0)] hover:bg-right hover:shadow-[0_10px_40px_-10px_rgba(224,185,79,.65)] [transition:background-position_.8s_var(--ease-expo),box-shadow_.5s]",
  outline:
    "border border-gold-400/70 text-gold-300 hover:border-gold-300 hover:text-ink-950",
  ghost: "text-white hover:text-gold-300 px-0 h-auto",
  red: "bg-red-500 text-white hover:bg-red-400 hover:shadow-[0_10px_40px_-10px_rgba(224,38,47,.75)]",
  light: "border border-white/25 text-white hover:border-white hover:text-ink-950",
};

function Inner({ children, variant, arrow, external }: { children: ReactNode; variant: Variant; arrow: boolean; external: boolean }) {
  const Icon = external ? ArrowUpRight : ChevronRight;
  return (
    <>
      {(variant === "outline" || variant === "light") && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 -z-0 origin-bottom scale-y-0 transition-transform duration-500 ease-[var(--ease-expo)] group-hover/btn:scale-y-100",
            variant === "outline" ? "bg-gold-400" : "bg-white",
          )}
        />
      )}
      <span className="relative z-10">{children}</span>
      {arrow && (
        <Icon
          aria-hidden
          className="relative z-10 h-3.5 w-3.5 transition-transform duration-500 ease-[var(--ease-expo)] group-hover/btn:translate-x-1"
          strokeWidth={2.2}
        />
      )}
    </>
  );
}

export function Button(props: AsLink | AsButton) {
  const { children, variant = "gold", size = "md", className, arrow = true, magnetic = true } = props;
  const cls = cn(base, sizes[size], variants[variant], variant === "ghost" && "h-auto px-0", className);

  let el: ReactNode;
  if (props.href !== undefined) {
    const external = isExternal(props.href);
    el = external ? (
      <a
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
        onClick={props.onClick}
        aria-label={props.ariaLabel}
      >
        <Inner variant={variant} arrow={arrow} external>{children}</Inner>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    ) : (
      <TLink href={props.href} className={cls} onClick={props.onClick} aria-label={props.ariaLabel}>
        <Inner variant={variant} arrow={arrow} external={false}>{children}</Inner>
      </TLink>
    );
  } else {
    const rest: Record<string, unknown> = { ...props };
    for (const k of ["children", "variant", "size", "className", "arrow", "magnetic"]) delete rest[k];
    el = (
      <button className={cls} {...rest}>
        <Inner variant={variant} arrow={arrow} external={false}>{children}</Inner>
      </button>
    );
  }

  return magnetic ? <Magnetic>{el}</Magnetic> : el;
}
