import { event } from "./event";
import { album, photo, video } from "./media";

/** Register in your Studio's sanity.config.ts:  schema: { types: schemaTypes } */
export const schemaTypes = [event, photo, album, video];
