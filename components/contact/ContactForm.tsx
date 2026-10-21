"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { CONTACT_SUBJECTS, validateContact, type ContactErrors, type ContactInput } from "@/lib/utils/validation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const empty: ContactInput = { name: "", email: "", phone: "", subject: "", message: "" };

function Field({
  id,
  label,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="group relative">
      <label htmlFor={id} className="eyebrow flex justify-between text-[0.6rem] text-mute transition-colors group-focus-within:text-gold-300">
        <span>{label}</span>
        {optional && <span className="normal-case tracking-normal text-mute-2">Optional</span>}
      </label>
      {children}
      <p id={`${id}-error`} role="alert" className="mt-2 min-h-4 text-xs text-red-300">
        {error}
      </p>
    </div>
  );
}

const inputCls = (err?: string) =>
  cn(
    "mt-2 w-full border-b bg-transparent py-3 text-base text-white placeholder:text-white/25 transition-colors duration-300 focus:border-gold-300 focus:outline-none",
    err ? "border-red-400/70" : "border-white/20",
  );

export function ContactForm() {
  const params = useSearchParams();
  // Inquiry cards link here with ?subject=event|partnership|general…
  const preset = params.get("subject")?.toLowerCase();
  const presetSubject = preset ? (CONTACT_SUBJECTS.find((s) => s.toLowerCase().startsWith(preset)) ?? "") : "";
  const [values, setValues] = useState<ContactInput>({ ...empty, subject: presetSubject });
  const [errors, setErrors] = useState<ContactErrors>({});
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const set = (k: keyof ContactInput) => (e: { target: { value: string } }) => {
    const next = { ...values, [k]: e.target.value };
    setValues(next);
    if (touched) setErrors(validateContact(next));
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    const errs = validateContact(values);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      document.getElementById(`contact-${first}`)?.focus();
      return;
    }
    setState("loading");
    try {
      const honeypot = (e.currentTarget.elements.namedItem("company") as HTMLInputElement | null)?.value;
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, company: honeypot }),
      });
      if (!res.ok) throw new Error();
      setState("done");
      setValues(empty);
    } catch {
      setState("error");
    }
  }

  const aria = (k: keyof ContactInput) => ({
    id: `contact-${k}`,
    "aria-invalid": Boolean(errors[k]),
    "aria-describedby": errors[k] ? `contact-${k}-error` : undefined,
  });

  return (
    <AnimatePresence mode="wait">
      {state === "done" ? (
        <motion.div
          key="done"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-[420px] flex-col items-start justify-center border border-gold-500/30 p-10"
          role="status"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-400 text-ink-950">
            <Check className="h-6 w-6" />
          </span>
          <h3 className="mt-8 font-display text-5xl tracking-wide">Message received.</h3>
          <p className="mt-3 max-w-md text-mute">Thank you — the Bombita team will get back to you shortly.</p>
          <button type="button" onClick={() => setState("idle")} className="link-lux mt-8 text-xs font-bold uppercase tracking-[0.24em] text-gold-300">
            Send another message
          </button>
        </motion.div>
      ) : (
        <motion.form key="form" onSubmit={onSubmit} noValidate initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-x-8 gap-y-6 md:grid-cols-2">
          <Field id="contact-name" label="Name" error={errors.name}>
            <input {...aria("name")} name="name" autoComplete="name" value={values.name} onChange={set("name")} className={inputCls(errors.name)} placeholder="Your name" />
          </Field>
          <Field id="contact-email" label="Email" error={errors.email}>
            <input {...aria("email")} name="email" type="email" inputMode="email" autoComplete="email" value={values.email} onChange={set("email")} className={inputCls(errors.email)} placeholder="you@email.com" />
          </Field>
          <Field id="contact-phone" label="Phone" error={errors.phone} optional>
            <input {...aria("phone")} name="phone" type="tel" inputMode="tel" autoComplete="tel" value={values.phone} onChange={set("phone")} className={inputCls(errors.phone)} placeholder="+1 (212) 000-0000" />
          </Field>
          <Field id="contact-subject" label="Subject" error={errors.subject}>
            <select {...aria("subject")} name="subject" value={values.subject} onChange={set("subject")} className={cn(inputCls(errors.subject), "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23E0B94F%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_0.25rem_center] bg-no-repeat", !values.subject && "text-white/40")}>
              <option value="" disabled className="bg-ink-900">
                Choose a subject
              </option>
              {CONTACT_SUBJECTS.map((s) => (
                <option key={s} value={s} className="bg-ink-900 text-white">
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field id="contact-message" label="Message" error={errors.message}>
              <textarea {...aria("message")} name="message" rows={5} value={values.message} onChange={set("message")} className={cn(inputCls(errors.message), "resize-none")} placeholder="Tell us about your night, event or idea…" />
            </Field>
          </div>
          {/* Honeypot */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Company <input name="company" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <div className="flex flex-col gap-4 md:col-span-2 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-mute-2">We usually reply within 1–2 business days.</p>
            <Button type="submit" size="lg" disabled={state === "loading"} arrow={state !== "loading"}>
              {state === "loading" ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending
                </span>
              ) : (
                "Send message"
              )}
            </Button>
          </div>
          {state === "error" && (
            <p role="alert" className="text-sm text-red-300 md:col-span-2">
              Something went wrong sending your message. Please try again or email us directly.
            </p>
          )}
        </motion.form>
      )}
    </AnimatePresence>
  );
}
