/** Sanity schemas — Photo & Video. */
type Rule = { required: () => unknown };

export const photo = {
  name: "photo",
  title: "Photo",
  type: "document",
  fields: [
    { name: "image", title: "Image", type: "image", options: { hotspot: true }, validation: (r: Rule) => r.required() },
    { name: "alt", title: "Alt text", type: "string" },
    { name: "album", title: "Album / event", type: "string" },
    {
      name: "shape",
      title: "Layout shape",
      type: "string",
      options: { list: ["portrait", "landscape", "square", "tall"] },
      initialValue: "portrait",
    },
  ],
};

export const video = {
  name: "video",
  title: "Video",
  type: "document",
  fields: [
    { name: "title", title: "Title", type: "string", validation: (r: Rule) => r.required() },
    { name: "subtitle", title: "Subtitle", type: "string" },
    { name: "url", title: "Video URL (MP4, 720p)", type: "url" },
    { name: "url1080", title: "Video URL 1080p (optional)", type: "url" },
    { name: "url4k", title: "Video URL 4K (optional)", type: "url" },
    { name: "file", title: "…or upload", type: "file", options: { accept: "video/*" } },
    { name: "previewUrl", title: "Short muted preview URL", type: "url" },
    { name: "poster", title: "Poster image", type: "image", validation: (r: Rule) => r.required() },
    { name: "duration", title: "Duration (e.g. 1:24)", type: "string" },
    { name: "featured", title: "Featured", type: "boolean" },
    { name: "order", title: "Order", type: "number" },
  ],
};

export const album = {
  name: "album",
  title: "Gallery album",
  type: "document",
  fields: [
    { name: "title", title: "Title", type: "string", validation: (r: Rule) => r.required() },
    { name: "slug", title: "Slug", type: "slug", options: { source: "title" } },
    { name: "date", title: "Event date", type: "date" },
    { name: "venue", title: "Venue", type: "string", initialValue: "Radio Hotel" },
    {
      name: "category",
      title: "Category",
      type: "string",
      options: { list: ["Live Artists", "Day Parties", "Brunch", "Throwback", "Special Events"] },
    },
    { name: "cover", title: "Cover image", type: "image", options: { hotspot: true } },
    { name: "photos", title: "Photos", type: "array", of: [{ type: "image", options: { hotspot: true } }] },
  ],
};
