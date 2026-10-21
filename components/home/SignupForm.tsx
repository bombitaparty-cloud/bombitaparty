"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Check, ChevronDown, Loader2, Lock, Mail, MapPin, User } from "lucide-react";
import { SIGNUP_CITIES, validateSignup, type SignupErrors, type SignupInput } from "@/lib/utils/validation";
import { cn } from "@/lib/utils";

const empty: SignupInput = { firstName: "", lastName: "", email: "", city: "" };

function Row({ icon, error, id, children }: { icon: ReactNode; error?: string; id: string; children: ReactNode }) {
  return (
    <div>
      <div
        className={cn(
          "flex h-14 items-center gap-4 border bg-ink-950/70 px-5 transition-colors focus-within:border-gold-300",
          error ? "border-red-400/80" : "border-white/15",
        )}
      >
        <span className="text-white/60" aria-hidden>
          {icon}
        </span>
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

const input = "h-full min-w-0 flex-1 bg-transparent text-[0.95rem] text-white placeholder:text-white/45 focus:outline-none";

/** "Join the Bombita list" form. */
export function SignupForm() {
  const [v, setV] = useState<SignupInput>(empty);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const set = (k: keyof SignupInput) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const a = (k: keyof SignupInput) => ({
    id: `signup-${k}`,
    "aria-invalid": Boolean(errors[k]),
    "aria-describedby": errors[k] ? `signup-${k}-error` : undefined,
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validateSignup(v);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`signup-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      if (!res.ok) throw new Error();
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div role="status" className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-400 text-ink-950">
          <Check className="h-6 w-6" />
        </span>
        <p className="font-display text-4xl tracking-wide">You&apos;re on the list, {v.firstName}.</p>
        <p className="text-sm text-mute">First access to tickets, tables and drops is headed your way.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <label htmlFor="signup-firstName" className="sr-only">First name</label>
      <Row id="signup-firstName" icon={<User className="h-5 w-5" strokeWidth={1.5} />} error={errors.firstName}>
        <input {...a("firstName")} autoComplete="given-name" placeholder="First Name" value={v.firstName} onChange={set("firstName")} className={input} />
      </Row>
      <label htmlFor="signup-lastName" className="sr-only">Last name</label>
      <Row id="signup-lastName" icon={<User className="h-5 w-5" strokeWidth={1.5} />}>
        <input {...a("lastName")} autoComplete="family-name" placeholder="Last Name" value={v.lastName} onChange={set("lastName")} className={input} />
      </Row>
      <label htmlFor="signup-email" className="sr-only">Email address</label>
      <Row id="signup-email" icon={<Mail className="h-5 w-5" strokeWidth={1.5} />} error={errors.email}>
        <input {...a("email")} type="email" inputMode="email" autoComplete="email" placeholder="Email Address" value={v.email} onChange={set("email")} className={input} />
      </Row>
      <label htmlFor="signup-city" className="sr-only">City</label>
      <Row id="signup-city" icon={<MapPin className="h-5 w-5" strokeWidth={1.5} />} error={errors.city}>
        <select {...a("city")} value={v.city} onChange={set("city")} className={cn(input, "appearance-none", !v.city && "text-white/45")}>
          <option value="" className="bg-ink-900">Select Your City</option>
          {SIGNUP_CITIES.map((c) => (
            <option key={c} value={c} className="bg-ink-900 text-white">
              {c}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none h-4 w-4 text-white/70" aria-hidden />
      </Row>

      <button
        type="submit"
        disabled={state === "loading"}
        className="group mt-2 flex h-16 w-full items-center justify-center gap-3 bg-gradient-to-b from-gold-300 via-gold-400 to-gold-600 text-base font-extrabold uppercase tracking-[0.12em] text-ink-950 shadow-[0_10px_40px_-12px_rgba(224,185,79,.7)] transition-[filter,transform] hover:brightness-110 active:scale-[0.99] disabled:opacity-60 md:text-lg"
      >
        {state === "loading" ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Join the Bombita list
        <span aria-hidden className="transition-transform duration-500 group-hover:translate-x-1">→</span>
      </button>
      {state === "error" && (
        <p role="alert" className="text-center text-sm text-red-300">Something went wrong. Please try again.</p>
      )}
      <p className="flex items-center justify-center gap-2 pt-2 text-center text-xs text-white/60">
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden /> No spam. Just real updates, good vibes and the best parties in NYC.
      </p>
    </form>
  );
}
