/**
 * Sanity schema — Event.
 * Copy /sanity/schemaTypes into your Studio project (see README → "Connect Sanity").
 * Field names match lib/cms/sanity.ts, so the site picks them up automatically.
 */
type Rule = { required: () => unknown };

export const event = {
  name: "event",
  title: "Event",
  type: "document",
  fields: [
    { name: "title", title: "Event name", type: "string", validation: (r: Rule) => r.required() },
    { name: "slug", title: "Slug (URL)", type: "slug", options: { source: "title", maxLength: 96 }, validation: (r: Rule) => r.required() },
    { name: "subtitle", title: "Subtitle", type: "string", description: 'e.g. "En Vivo"' },
    { name: "tagline", title: "Tagline", type: "string", description: 'e.g. "Cerrando el verano en grande"' },
    { name: "startsAt", title: "Starts (date & time)", type: "datetime", validation: (r: Rule) => r.required() },
    { name: "endsAt", title: "Ends (date & time)", type: "datetime" },
    {
      name: "venue",
      title: "Venue",
      type: "object",
      fields: [
        { name: "name", title: "Venue name", type: "string" },
        { name: "address", title: "Address", type: "string" },
        { name: "city", title: "City", type: "string", initialValue: "New York, NY" },
        { name: "mapUrl", title: "Google Maps link", type: "url" },
      ],
    },
    { name: "artists", title: "Artists", type: "array", of: [{ type: "string" }] },
    { name: "djs", title: "DJs", type: "array", of: [{ type: "string" }] },
    { name: "description", title: "Description", type: "text", rows: 5 },
    {
      name: "flyer",
      title: "Main flyer",
      type: "image",
      options: { hotspot: true },
      fields: [{ name: "alt", title: "Alt text", type: "string" }],
      validation: (r: Rule) => r.required(),
    },
    {
      name: "gallery",
      title: "Gallery",
      type: "array",
      of: [{ type: "image", options: { hotspot: true }, fields: [{ name: "alt", title: "Alt text", type: "string" }] }],
    },
    { name: "videoUrl", title: "Video URL (MP4)", type: "url" },
    { name: "video", title: "…or upload a video", type: "file", options: { accept: "video/*" } },
    { name: "ticketUrl", title: "Ticket URL", type: "url", description: "Leave empty to use the default ticket link." },
    { name: "tableUrl", title: "Table reservation URL", type: "url" },
    {
      name: "status",
      title: "Status",
      type: "string",
      initialValue: "on-sale",
      options: {
        list: [
          { title: "Tickets on sale", value: "on-sale" },
          { title: "Few tickets left", value: "few-left" },
          { title: "Sold out", value: "sold-out" },
          { title: "Coming soon", value: "coming-soon" },
          { title: "Past", value: "past" },
        ],
        layout: "radio",
      },
    },
    { name: "featured", title: "Featured on homepage", type: "boolean", initialValue: false },
    { name: "ageLimit", title: "Minimum age", type: "number", initialValue: 21 },
    { name: "dressCode", title: "Dress code", type: "string" },
  ],
  orderings: [{ title: "Date", name: "dateAsc", by: [{ field: "startsAt", direction: "asc" }] }],
  preview: {
    select: { title: "title", subtitle: "startsAt", media: "flyer" },
  },
};
