"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { validateEmail } from "@/lib/utils/validation";
import { cn } from "@/lib/utils";

/**
 * Email gate for the gallery. Visitors enter an email (no password, no
 * verification); the API saves it for the admin list and sets a cookie, then
 * the page refreshes into the full gallery.
 */
export function GalleryGate({ previews, albumCount, photoCount }: { previews: string[]; albumCount: number; photoCount: number }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [, startTransition] = useTransition();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) return setError(err);
    setError(undefined);
    setSending(true);
    try {
      const honeypot = (e.currentTarget.elements.namedItem("company") as HTMLInputElement | null)?.value;
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "gallery", company: honeypot }),
      });
      if (!res.ok) throw new Error();
      startTransition(() => router.refresh());
    } catch {
      setError("Something went wrong. Please try again.");
      setSending(false);
    }
  }

  return (
    <section aria-labelledby="gate-title" className="relative isolate overflow-hidden">
      {/* Blurred teaser of the albums */}
      <div aria-hidden className="pointer-events-none grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 md:gap-3 md:p-3">
        {previews.map((src, i) => (
          <div key={src + i} className="relative aspect-[4/3] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- small, already-optimized thumbnails */}
            <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl brightness-75" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/40 via-ink-950/75 to-ink-950" />

      <div className="absolute inset-0 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md border border-gold-400/60 bg-ink-950/85 p-6 text-center shadow-[0_0_80px_-30px_rgba(224,185,79,.6)] backdrop-blur-md md:p-8">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold-400/60 text-gold-300">
            <Lock className="h-5 w-5" aria-hidden />
          </span>
          <h2 id="gate-title" className="mt-5 font-display text-4xl uppercase leading-[0.95] tracking-wide md:text-5xl">
            Unlock the <span className="text-gold-300">gallery</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-mute">
            {photoCount > 0
              ? `${albumCount} ${albumCount === 1 ? "night" : "nights"} · ${photoCount} photos & videos. `
              : ""}
            Enter your email to see every Bombita night — it&apos;s free.
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-3 text-left">
            <label htmlFor="gate-email" className="sr-only">
              Email address
            </label>
            <div className={cn("flex h-14 items-center gap-3 border bg-ink-900 px-4 focus-within:border-gold-300", error ? "border-red-400/80" : "border-white/20")}>
              <Mail className="h-5 w-5 shrink-0 text-white/50" aria-hidden />
              <input
                id="gate-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "gate-error" : undefined}
                className="h-full min-w-0 flex-1 bg-transparent text-white placeholder:text-white/35 focus:outline-none"
              />
            </div>
            {error && (
              <p id="gate-error" role="alert" className="text-xs text-red-300">
                {error}
              </p>
            )}
            {/* Honeypot */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <input name="company" tabIndex={-1} autoComplete="off" />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="group flex h-14 w-full items-center justify-center gap-3 bg-gradient-to-b from-gold-300 via-gold-400 to-gold-600 text-sm font-extrabold uppercase tracking-[0.16em] text-ink-950 disabled:opacity-70"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {sending ? "Unlocking…" : "Unlock gallery"}
              {!sending && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />}
            </button>
          </form>
          <p className="mt-4 text-[0.7rem] leading-relaxed text-white/45">
            You&apos;ll also get Bombita event news & presales. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
