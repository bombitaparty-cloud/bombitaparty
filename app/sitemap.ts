import type { MetadataRoute } from "next";
import { site } from "@/data/site";
import { getAllEvents } from "@/lib/cms";
import { getProducts } from "@/lib/shop";

/** Re-render hourly so past events roll off and CMS edits appear without a redeploy. */
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, products] = await Promise.all([getAllEvents(), getProducts()]);
  const now = new Date();
  const pages = ["", "/events", "/birthdays", "/photos", "/videos", "/wear", "/about", "/contact"].map((p) => ({
    url: `${site.url}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.8,
  }));
  return [
    ...pages,
    ...events.map((e) => ({ url: `${site.url}/events/${e.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.9 })),
    ...products.map((p) => ({ url: `${site.url}/wear/${p.handle}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
