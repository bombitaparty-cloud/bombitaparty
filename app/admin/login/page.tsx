import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin, adminConfigured } from "@/lib/admin/auth";
import { Lockup } from "@/components/ui/Logo";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLogin() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <Lockup className="mx-auto w-40" priority />
        <h1 className="mt-8 text-center font-display text-4xl tracking-wide">Event dashboard</h1>
        <p className="mt-2 text-center text-sm text-mute">Sign in to add and schedule Bombita events.</p>
        <div className="mt-8 border border-white/10 bg-ink-900/60 p-6">
          {adminConfigured() ? (
            <LoginForm />
          ) : (
            <p className="text-sm leading-relaxed text-mute">
              The dashboard isn&apos;t set up yet. Add an <code className="text-gold-300">ADMIN_PASSWORD</code> environment
              variable to the project and redeploy.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
