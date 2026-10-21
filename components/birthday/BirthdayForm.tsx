"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, Loader2, MessageCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { CELEBRATION_TYPES, NOTES_MAX, validateBirthday, type BirthdayErrors, type BirthdayInput } from "@/lib/utils/validation";
import { nyToday } from "@/lib/utils/nyTime";
import { site } from "@/data/site";
import { cn } from "@/lib/utils";

const empty: BirthdayInput = { name: "", phone: "", email: "", type: "", date: "", guests: "", notes: "" };

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="group">
      <label htmlFor={id} className="flex justify-between text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-mute transition-colors group-focus-within:text-gold-300">
        <span>{label}</span>
        {hint}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

const box = (err?: string) =>
  cn(
    "mt-3 h-14 w-full rounded-xl border bg-ink-950/80 px-4 text-base text-white placeholder:text-white/30 transition-colors focus:border-gold-300 focus:outline-none",
    err ? "border-red-400/70" : "border-white/12",
  );

const chevron =
  "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23E0B94F%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_1rem_center] bg-no-repeat pr-10";

/** "Celebrate your birthday" — birthday / VIP table / group-night request form. */
export function BirthdayForm() {
  const [values, setValues] = useState<BirthdayInput>(empty);
  const [errors, setErrors] = useState<BirthdayErrors>({});
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const dateRef = useRef<HTMLInputElement>(null);

  // Set the earliest selectable date on the client (the page itself is static).
  useEffect(() => {
    if (dateRef.current) dateRef.current.min = nyToday();
  }, [state]);

  const set = (k: keyof BirthdayInput) => (e: { target: { value: string } }) => {
    const next = { ...values, [k]: e.target.value };
    setValues(next);
    if (touched) setErrors(validateBirthday(next, nyToday()));
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    const errs = validateBirthday(values, nyToday());
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`bday-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setState("loading");
    try {
      const honeypot = (e.currentTarget.elements.namedItem("company") as HTMLInputElement | null)?.value;
      const res = await fetch("/api/birthday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, company: honeypot }),
      });
      if (!res.ok) throw new Error();
      setState("done");
      setValues(empty);
      setTouched(false);
    } catch {
      setState("error");
    }
  }

  const aria = (k: keyof BirthdayInput) => ({
    id: `bday-${k}`,
    name: k,
    "aria-invalid": Boolean(errors[k]),
    "aria-describedby": errors[k] ? `bday-${k}-error` : undefined,
  });

  return (
    <div className="relative overflow-hidden rounded-3xl border border-gold-400/25 bg-ink-900/80 p-6 shadow-[0_0_120px_-50px_rgba(224,185,79,.55)] sm:p-10">
      <AnimatePresence mode="wait">
        {state === "done" ? (
          <motion.div key="done" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} role="status" className="flex min-h-[460px] flex-col items-start justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-400 text-ink-950">
              <Check className="h-6 w-6" />
            </span>
            <h3 className="mt-8 font-display text-5xl uppercase leading-[0.9] tracking-wide">
              Let&apos;s <span className="text-gold-300">celebrate.</span>
            </h3>
            <p className="mt-4 max-w-md text-mute">
              Your request is in. The Bombita team will reach out shortly to match you with the right night, table or package.
              Want to move faster? Message us on WhatsApp.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={site.tableUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-14 items-center justify-center gap-2 rounded-full bg-[#25D366] px-7 text-sm font-bold uppercase tracking-[0.14em] text-ink-950 hover:brightness-110"
              >
                <MessageCircle className="h-5 w-5" /> Chat on WhatsApp
              </a>
              <button type="button" onClick={() => setState("idle")} className="h-14 px-4 text-xs font-bold uppercase tracking-[0.24em] text-gold-300 hover:text-gold-200">
                Plan another night
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={onSubmit} noValidate initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field id="bday-name" label="Full name" error={errors.name}>
                <input {...aria("name")} autoComplete="name" value={values.name} onChange={set("name")} className={box(errors.name)} placeholder="Your full name" />
              </Field>
            </div>
            <Field id="bday-phone" label="Phone number" error={errors.phone}>
              <input {...aria("phone")} type="tel" inputMode="tel" autoComplete="tel" value={values.phone} onChange={set("phone")} className={box(errors.phone)} placeholder="+1 (646) 000-0000" />
            </Field>
            <Field id="bday-email" label="Email address" error={errors.email}>
              <input {...aria("email")} type="email" inputMode="email" autoComplete="email" value={values.email} onChange={set("email")} className={box(errors.email)} placeholder="you@email.com" />
            </Field>
            <Field id="bday-type" label="Celebration type" error={errors.type}>
              <select {...aria("type")} value={values.type} onChange={set("type")} className={cn(box(errors.type), chevron, !values.type && "text-white/40")}>
                <option value="" disabled className="bg-ink-900">
                  Select
                </option>
                {CELEBRATION_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-ink-900 text-white">
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="bday-date" label="Event date" error={errors.date}>
              <input ref={dateRef} {...aria("date")} type="date" value={values.date} onChange={set("date")} className={cn(box(errors.date), "[color-scheme:dark]", !values.date && "text-white/40")} />
            </Field>
            <div className="md:col-span-2">
              <Field id="bday-guests" label="Group size" error={errors.guests}>
                <input {...aria("guests")} type="number" inputMode="numeric" min={1} max={200} value={values.guests} onChange={set("guests")} className={box(errors.guests)} placeholder="How many guests?" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field
                id="bday-notes"
                label="Notes"
                error={errors.notes}
                hint={<span className="normal-case tracking-normal text-mute-2">{values.notes.length}/{NOTES_MAX}</span>}
              >
                <textarea
                  {...aria("notes")}
                  rows={4}
                  maxLength={NOTES_MAX}
                  value={values.notes}
                  onChange={set("notes")}
                  className={cn(box(errors.notes), "h-auto resize-none py-4")}
                  placeholder="Bottles, cake, sparklers, a shout-out from the DJ… tell us everything."
                />
              </Field>
            </div>
            {/* Honeypot */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <input name="company" tabIndex={-1} autoComplete="off" />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={state === "loading"}
                className="flex h-16 w-full items-center justify-center gap-3 rounded-full bg-gradient-to-b from-gold-300 via-gold-400 to-gold-600 text-base font-extrabold uppercase tracking-[0.14em] text-ink-950 transition-[filter] hover:brightness-110 disabled:opacity-70"
              >
                {state === "loading" ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {state === "loading" ? "Sending" : "Start planning"}
              </button>
              {state === "error" && (
                <p role="alert" className="mt-3 text-center text-sm text-red-300">
                  Something went wrong. Please try again, or message us on WhatsApp.
                </p>
              )}
              <p className="mt-4 text-center text-xs text-mute-2">
                Prefer to talk now?{" "}
                <a href={site.tableUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#25D366] hover:underline">
                  Message us on WhatsApp
                </a>
              </p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
