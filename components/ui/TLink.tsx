"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { usePageTransition } from "@/components/animations/PageTransition";

type Props = LinkProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>;

/** next/link that plays the Bombita page transition on internal navigation. */
export function TLink({ onClick, href, target, ...rest }: Props) {
  const { navigate } = usePageTransition();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
      (target && target !== "_self")
    )
      return;
    e.preventDefault();
    navigate(typeof href === "string" ? href : (href.pathname ?? "/"));
  };

  return <Link href={href} target={target} onClick={handleClick} {...rest} />;
}
