"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { ADMIN_COOKIE, adminConfigured, checkPassword, createSessionValue, requireAdmin, sessionCookie } from "@/lib/admin/auth";
import { parseEventForm, type EventFormState } from "@/lib/admin/eventForm";
import { readEvents, writeEvents } from "@/lib/store/events";
import { EVENTS_TAG } from "@/lib/cms";
import type { StoredEvent } from "@/lib/cms/types";

/** Refresh every public page that shows events. */
function refreshSite() {
  updateTag(EVENTS_TAG);
  revalidatePath("/", "layout");
}

/* ───────────── Auth ───────────── */

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  if (!adminConfigured()) return { error: "Admin is not set up yet: add ADMIN_PASSWORD to the environment." };
  if (!checkPassword(String(formData.get("password") ?? ""))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return { error: "Wrong password." };
  }
  (await cookies()).set(sessionCookie(createSessionValue()));
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

/* ───────────── Events ───────────── */

export async function saveEvent(_prev: EventFormState | undefined, formData: FormData): Promise<EventFormState> {
  await requireAdmin();
  const parsed = parseEventForm(formData);
  if (parsed.errors) return { errors: parsed.errors, message: "Please fix the highlighted fields." };

  const id = String(formData.get("id") ?? "");
  const all = await readEvents();
  const existing = id ? all.find((e) => e.id === id) : undefined;
  if (id && !existing) return { message: "This event no longer exists — it may have been deleted." };
  if (all.some((e) => e.slug === parsed.event.slug && e.id !== id)) {
    return { errors: { slug: "Another event already uses this URL." }, message: "Please fix the highlighted fields." };
  }

  const now = new Date().toISOString();
  const saved: StoredEvent = existing
    ? { ...existing, ...parsed.event, updatedAt: now }
    : { ...parsed.event, id: randomUUID(), createdAt: now, updatedAt: now };

  let next = existing ? all.map((e) => (e.id === saved.id ? saved : e)) : [...all, saved];
  // Only one event can lead the homepage.
  if (saved.featured) next = next.map((e) => (e.id === saved.id ? e : { ...e, featured: false }));

  try {
    await writeEvents(next);
  } catch (err) {
    return { message: err instanceof Error ? err.message : "Could not save the event." };
  }
  refreshSite();
  redirect(`/admin?saved=${encodeURIComponent(saved.title)}`);
}

export async function deleteEvent(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const all = await readEvents();
  const gone = all.find((e) => e.id === id);
  await writeEvents(all.filter((e) => e.id !== id));
  refreshSite();
  redirect(`/admin?deleted=${encodeURIComponent(gone?.title ?? "Event")}`);
}

export async function duplicateEvent(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const all = await readEvents();
  const src = all.find((e) => e.id === id);
  if (!src) redirect("/admin");
  const now = new Date().toISOString();
  let slug = `${src.slug}-copy`;
  for (let n = 2; all.some((e) => e.slug === slug); n++) slug = `${src.slug}-copy-${n}`;
  const copy: StoredEvent = { ...src, id: randomUUID(), slug, title: `${src.title} (copy)`, featured: false, published: false, publishAt: undefined, createdAt: now, updatedAt: now };
  await writeEvents([...all, copy]);
  redirect(`/admin/events/${copy.id}`);
}

export async function setFeatured(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const all = await readEvents();
  await writeEvents(all.map((e) => ({ ...e, featured: e.id === id ? !e.featured : false })));
  refreshSite();
  redirect("/admin");
}

export async function setPublished(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const publish = formData.get("publish") === "1";
  const all = await readEvents();
  await writeEvents(all.map((e) => (e.id === id ? { ...e, published: publish, publishAt: undefined, updatedAt: new Date().toISOString() } : e)));
  refreshSite();
  redirect("/admin");
}
