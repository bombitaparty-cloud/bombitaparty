import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { blobUploadFlow, readEvents, storageMode } from "@/lib/store/events";
import { blobAccess } from "@/lib/media/pipeline.mjs";
import { EventForm } from "@/components/admin/EventForm";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: PageProps<"/admin/events/[id]">) {
  const { id } = await params;
  const event = (await readEvents()).find((e) => e.id === id);
  if (!event) notFound();
  return (
    <>
      <Link href="/admin" className="inline-flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-mute hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> All events
      </Link>
      <div className="mb-8 mt-4 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-5xl tracking-wide">Edit event</h1>
        {event.published && (
          <a href={`/events/${event.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold-300">
            View on site <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      <EventForm event={event} storage={storageMode} flow={blobUploadFlow} access={blobAccess()} />
    </>
  );
}
