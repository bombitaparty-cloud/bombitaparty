"use client";

import { useId, useState, type FormEvent } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { validateEmail } from "@/lib/utils/validation";
import { cn } from "@/lib/utils";

/** Email capture — posts to /api/subscribe. */
export function JoinForm({ className, large, compact }: { className?: string; large?: boolean; compact?: boolean }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string>();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) return setError(err);
    setError(undefined);
    setState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setState("done");
    } catch {
      setState("error");
      setError("Something went wrong. Please try again.");
    }
  }

  if (state === "done") {
    return (
      <p className={cn("flex items-center gap-3 text-sm text-gold-300", className)} role="status">
        <Check className="h-4 w-4" /> You&apos;re on the list. See you on the dance floor.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className={cn("w-full", className)}>
      <label htmlFor={id} className="sr-only">
        Email address
      </label>
      <div
        className={cn(
          "group flex items-center transition-colors duration-500",
          !compact && "border-b focus-within:border-gold-300",
          !compact && (error ? "border-red-400/70" : "border-white/25"),
        )}
      >
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : undefined}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-white placeholder:text-white/40 focus:outline-none",
            compact ? "py-3" : "py-4",
            large ? "text-lg md:text-2xl" : "text-sm",
          )}
        />
        <button
          type="submit"
          disabled={state === "loading"}
          aria-label="Join the list"
          className="flex h-12 items-center gap-3 pl-4 text-[0.6875rem] font-bold uppercase tracking-[0.24em] text-gold-300 transition-colors hover:text-white"
        >
          <span className="hidden sm:inline">Join</span>
          {state === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4 transition-transform duration-500 group-focus-within:translate-x-1" />
          )}
        </button>
      </div>
      <p id={`${id}-err`} className={cn("text-xs text-red-300", compact ? "pb-2 empty:hidden" : "mt-2 min-h-5")} role="alert">
        {error}
      </p>
    </form>
  );
}
