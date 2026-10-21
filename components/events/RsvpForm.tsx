"use client";

import { useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import { validateRsvp, type RsvpErrors, type RsvpInput } from "@/lib/utils/validation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const field =
  "mt-2 h-12 w-full border-b bg-transparent text-base text-white placeholder:text-white/30 focus:border-gold-300 focus:outline-none";

/** Guest-list RSVP for one event. */
export function RsvpForm({ event, eventTitle }: { event: string; eventTitle: string }) {
  const [v, setV] = useState<RsvpInput>({ name: "", email: "", phone: "", guests: "2", event });
  const [errors, setErrors] = useState<RsvpErrors>({});
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const set = (k: keyof RsvpInput) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validateRsvp(v);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`rsvp-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      if (!res.ok) throw new Error();
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div role="status" className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-400 text-ink-950">
          <Check className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-4xl tracking-wide">You&apos;re on the list.</p>
          <p className="mt-1 text-sm text-mute">
            {v.name.split(" ")[0]} +{Number(v.guests) - 1} for {eventTitle}. Show this email at the door. Guest list is not a ticket — capacity is limited.
          </p>
        </div>
      </div>
    );
  }

  const err = (k: keyof RsvpInput) =>
    errors[k] ? (
      <span id={`rsvp-${k}-error`} role="alert" className="mt-1 block text-xs text-red-300">
        {errors[k]}
      </span>
    ) : null;
  const aria = (k: keyof RsvpInput) => ({
    id: `rsvp-${k}`,
    "aria-invalid": Boolean(errors[k]),
    "aria-describedby": errors[k] ? `rsvp-${k}-error` : undefined,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 sm:grid-cols-2">
      <label className="eyebrow text-[0.6rem] text-mute">
        Full name
        <input {...aria("name")} autoComplete="name" value={v.name} onChange={set("name")} className={cn(field, errors.name ? "border-red-400/70" : "border-white/20")} />
        {err("name")}
      </label>
      <label className="eyebrow text-[0.6rem] text-mute">
        Email
        <input {...aria("email")} type="email" autoComplete="email" value={v.email} onChange={set("email")} className={cn(field, errors.email ? "border-red-400/70" : "border-white/20")} />
        {err("email")}
      </label>
      <label className="eyebrow text-[0.6rem] text-mute">
        Phone <span className="normal-case tracking-normal text-mute-2">(optional)</span>
        <input {...aria("phone")} type="tel" autoComplete="tel" value={v.phone} onChange={set("phone")} className={cn(field, errors.phone ? "border-red-400/70" : "border-white/20")} />
        {err("phone")}
      </label>
      <label className="eyebrow text-[0.6rem] text-mute">
        Party size
        <select {...aria("guests")} value={v.guests} onChange={set("guests")} className={cn(field, "border-white/20 bg-ink-900")}>
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1} {i === 0 ? "person" : "people"}
            </option>
          ))}
        </select>
        {err("guests")}
      </label>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <Button type="submit" variant="red" size="lg" disabled={state === "loading"}>
          {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "RSVP — Join guest list"}
        </Button>
        {state === "error" && <p role="alert" className="text-sm text-red-300">Something went wrong. Try again.</p>}
      </div>
    </form>
  );
}
