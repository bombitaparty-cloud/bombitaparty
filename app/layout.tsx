import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Cormorant_Garamond, Knewave, Manrope, Permanent_Marker } from "next/font/google";
import { site } from "@/data/site";
import { socials } from "@/data/social";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-bebas", display: "swap" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["italic", "normal"],
  variable: "--font-cormorant",
  display: "swap",
});
const brush = Knewave({ subsets: ["latin"], weight: "400", variable: "--font-brush-face", display: "block" });
const hand = Permanent_Marker({ subsets: ["latin"], weight: "400", variable: "--font-hand-face", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: "%s | BOMBITA NYC" },
  description: site.description,
  keywords: ["Bombita", "NYC nightlife", "Latin party NYC", "reggaeton NYC", "bachata NYC", "Latin DJs New York", "Uptown NYC events", "Bombita Wear"],
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: "BOMBITA",
    title: site.title,
    description: site.description,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: site.title, description: site.description },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
  // Lets env(safe-area-inset-*) work on notched iPhones (bottom bar, sticky CTAs).
  viewportFit: "cover",
};

/** Runs before paint: flags JS, decides whether the preloader plays. */
const introScript = `(function(){var d=document.documentElement;d.classList.add('js');try{var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;var seen=sessionStorage.getItem('bombita-intro');var p=location.pathname;if(rm||seen||p.indexOf('/admin')===0)d.dataset.intro='skip';}catch(e){}})();`;

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "BOMBITA",
  url: site.url,
  logo: `${site.url}/logos/bombita-lockup.png`,
  sameAs: socials.map((s) => s.url),
  address: { "@type": "PostalAddress", addressLocality: "New York", addressRegion: "NY", addressCountry: "US" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${bebas.variable} ${cormorant.variable} ${brush.variable} ${hand.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
        <link rel="preconnect" href="https://images.unsplash.com" />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
