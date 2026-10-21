import Link from "next/link";
import { CakeSlice, CalendarDays, ExternalLink, Images, LogOut, Plus, Users } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { logout } from "@/app/admin/actions";
import { Logo } from "@/components/ui/Logo";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/admin" className="flex items-center" aria-label="Dashboard home">
              <Logo className="[&_img]:w-12" />
            </Link>
            <nav aria-label="Admin sections" className="flex items-center gap-1">
              <Link href="/admin" className="flex h-10 items-center gap-2 px-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/80 hover:text-gold-300">
                <CalendarDays className="h-4 w-4" /> <span className="hidden sm:inline">Events</span>
              </Link>
              <Link href="/admin/media" className="flex h-10 items-center gap-2 px-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/80 hover:text-gold-300">
                <Images className="h-4 w-4" /> <span className="hidden sm:inline">Media</span>
              </Link>
              <Link href="/admin/subscribers" className="flex h-10 items-center gap-2 px-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/80 hover:text-gold-300">
                <Users className="h-4 w-4" /> <span className="hidden sm:inline">Subscribers</span>
              </Link>
              <Link href="/admin/reservations" className="flex h-10 items-center gap-2 px-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/80 hover:text-gold-300">
                <CakeSlice className="h-4 w-4" /> <span className="hidden sm:inline">Reservations</span>
              </Link>
            </nav>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/admin/events/new"
              className="flex h-10 items-center gap-2 bg-gold-400 px-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink-950 hover:bg-gold-300"
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New event</span>
            </Link>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center gap-2 border border-white/15 px-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/80 hover:border-white/40"
            >
              <ExternalLink className="h-4 w-4" /> <span className="hidden md:inline">View site</span>
            </a>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Log out"
                className="flex h-10 items-center gap-2 border border-white/15 px-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/80 hover:border-white/40"
              >
                <LogOut className="h-4 w-4" /> <span className="hidden md:inline">Log out</span>
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">{children}</main>
    </>
  );
}
