import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { blobUploadFlow, storageMode } from "@/lib/store/events";
import { blobAccess } from "@/lib/media/pipeline.mjs";
import { EventForm } from "@/components/admin/EventForm";

export const metadata: Metadata = { title: "New event" };

export default function NewEventPage() {
  return (
    <>
      <Link href="/admin" className="inline-flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-mute hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> All events
      </Link>
      <h1 className="mb-8 mt-4 font-display text-5xl tracking-wide">New event</h1>
      <EventForm storage={storageMode} flow={blobUploadFlow} access={blobAccess()} />
    </>
  );
}
