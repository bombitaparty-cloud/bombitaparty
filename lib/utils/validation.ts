/** Shared (client + server) form validation. No dependencies. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const CONTACT_SUBJECTS = [
  "General inquiry",
  "Event inquiry",
  "Table / VIP reservation",
  "Partnership",
  "Press",
  "Bombita Wear",
] as const;

export interface ContactInput {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export type ContactErrors = Partial<Record<keyof ContactInput, string>>;

export function validateContact(v: ContactInput): ContactErrors {
  const e: ContactErrors = {};
  if (v.name.trim().length < 2) e.name = "Please enter your name.";
  if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
  if (v.phone.trim() && !/^[+()\d\s.-]{7,20}$/.test(v.phone.trim()))
    e.phone = "Enter a valid phone number.";
  if (!CONTACT_SUBJECTS.includes(v.subject as (typeof CONTACT_SUBJECTS)[number]))
    e.subject = "Choose a subject.";
  if (v.message.trim().length < 10) e.message = "Tell us a little more (10+ characters).";
  if (v.message.length > 4000) e.message = "Message is too long.";
  return e;
}

export const validateEmail = (email: string) =>
  EMAIL_RE.test(email.trim()) ? undefined : "Enter a valid email address.";

export const SIGNUP_CITIES = [
  "Manhattan",
  "The Bronx",
  "Brooklyn",
  "Queens",
  "Staten Island",
  "New Jersey",
  "Other",
] as const;

export interface SignupInput {
  firstName: string;
  lastName: string;
  email: string;
  city: string;
}
export type SignupErrors = Partial<Record<keyof SignupInput, string>>;

export function validateSignup(v: SignupInput): SignupErrors {
  const e: SignupErrors = {};
  if (v.firstName.trim().length < 1) e.firstName = "Enter your first name.";
  if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
  if (v.city && !SIGNUP_CITIES.includes(v.city as (typeof SIGNUP_CITIES)[number])) e.city = "Choose a city.";
  return e;
}

export interface RsvpInput {
  name: string;
  email: string;
  phone: string;
  guests: string;
  event: string;
}
export type RsvpErrors = Partial<Record<keyof RsvpInput, string>>;

export function validateRsvp(v: RsvpInput): RsvpErrors {
  const e: RsvpErrors = {};
  if (v.name.trim().length < 2) e.name = "Enter your name.";
  if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
  if (v.phone.trim() && !/^[+()\d\s.-]{7,20}$/.test(v.phone.trim())) e.phone = "Enter a valid phone number.";
  const n = Number(v.guests);
  if (!Number.isInteger(n) || n < 1 || n > 10) e.guests = "Choose 1–10 guests.";
  if (!v.event) e.event = "Missing event.";
  return e;
}

/* ── Birthday / VIP / group reservations ─────────────────────── */

export const CELEBRATION_TYPES = [
  "Birthday",
  "VIP table",
  "Group night",
  "Bachelor / bachelorette",
  "Anniversary",
  "Corporate / private event",
  "Other",
] as const;

export interface BirthdayInput {
  name: string;
  phone: string;
  email: string;
  type: string;
  date: string;
  guests: string;
  notes: string;
}

export type BirthdayErrors = Partial<Record<keyof BirthdayInput, string>>;

export const NOTES_MAX = 300;

/** `today` is YYYY-MM-DD in New York so past dates are rejected. */
export function validateBirthday(v: BirthdayInput, today: string): BirthdayErrors {
  const e: BirthdayErrors = {};
  if (v.name.trim().length < 2) e.name = "Please enter your full name.";
  if (!/^[+()\d\s.-]{7,20}$/.test(v.phone.trim())) e.phone = "Enter a valid phone number.";
  if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
  if (!CELEBRATION_TYPES.includes(v.type as (typeof CELEBRATION_TYPES)[number])) e.type = "Choose what you're celebrating.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) e.date = "Pick a date.";
  else if (v.date < today) e.date = "Pick a date from today on.";
  const n = Number(v.guests);
  if (!Number.isInteger(n) || n < 1 || n > 200) e.guests = "Enter how many guests (1–200).";
  if (v.notes.length > NOTES_MAX) e.notes = `Keep notes under ${NOTES_MAX} characters.`;
  return e;
}
