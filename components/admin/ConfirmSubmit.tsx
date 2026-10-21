"use client";

import type { ReactNode } from "react";

/** Submit button that asks for confirmation first (used for delete). */
export function ConfirmSubmit({ message, className, children, label }: { message: string; className?: string; children: ReactNode; label: string }) {
  return (
    <button
      type="submit"
      aria-label={label}
      title={label}
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
