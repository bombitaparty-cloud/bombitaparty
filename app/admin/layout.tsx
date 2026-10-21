import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Bombita Admin" },
  robots: { index: false, follow: false },
};

/** Admin area: no public-site chrome (nav, preloader, smooth scroll). */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-ink-950 font-sans text-white">{children}</div>;
}
