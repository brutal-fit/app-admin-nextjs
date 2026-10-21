/*
 * Avatar precedence, shared by every screen that shows a person: a real photo (avatar_path in
 * the public avatars bucket), then the preset the server assigned or the user picked
 * (avatar_preset, a static file under public/avatars), then initials. Pure, so it is the same
 * on the server and in the browser.
 */

/** The twelve keys private.avatar_preset_keys() allows (20261021104634_avatar_presets.sql). */
export const AVATAR_PRESET_KEYS = [
  "dumbbell",
  "kettlebell",
  "rope",
  "shoe",
  "mat",
  "glove",
  "bottle",
  "stopwatch",
  "medal",
  "whistle",
  "band",
  "plate",
] as const;

export type AvatarPreset = (typeof AVATAR_PRESET_KEYS)[number];

/** What the server says about one person's avatar; either part may be missing. */
export type AvatarRef = { path: string | null; preset: string | null };

export const AVATAR_BUCKET = "avatars";

export function isAvatarPreset(value: unknown): value is AvatarPreset {
  return typeof value === "string" && (AVATAR_PRESET_KEYS as readonly string[]).includes(value);
}

/** Builds an AvatarRef from the reader keys, treating blanks as absent. */
export function toAvatarRef(path: string | null | undefined, preset: string | null | undefined): AvatarRef {
  return {
    path: path?.trim() ? path.trim() : null,
    preset: preset?.trim() ? preset.trim() : null,
  };
}

/**
 * The public URL of a photo in the avatars bucket, as storage.from('avatars').getPublicUrl
 * builds it; each segment is encoded so a path can never escape the bucket.
 */
export function avatarPhotoUrl(path: string | null | undefined, supabaseUrl: string | null | undefined): string | null {
  const clean = path?.trim().replace(/^\/+|\/+$/g, "");
  if (!clean || !supabaseUrl) return null;
  const segments = clean.split("/").filter((segment) => segment !== "" && segment !== "." && segment !== "..");
  if (segments.length === 0) return null;
  const base = supabaseUrl.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${AVATAR_BUCKET}/${segments.map(encodeURIComponent).join("/")}`;
}

/** The bundled preset file; null for an unknown key so a bad value reads as initials. */
export function avatarPresetUrl(preset: string | null | undefined): string | null {
  return isAvatarPreset(preset) ? `/avatars/${preset}.svg` : null;
}

/** Image sources in precedence order (photo, then preset); empty means initials. */
export function avatarSources(avatar: AvatarRef | null | undefined, supabaseUrl: string | null | undefined): string[] {
  if (!avatar) return [];
  return [avatarPhotoUrl(avatar.path, supabaseUrl), avatarPresetUrl(avatar.preset)].filter(
    (src): src is string => src !== null,
  );
}

/** Up to two letters from the first and last word; "?" when there is no name. */
export function avatarInitials(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = Array.from(words[0] ?? "")[0] ?? "";
  const last = words.length > 1 ? (Array.from(words[words.length - 1] ?? "")[0] ?? "") : "";
  return `${first}${last}`.toUpperCase() || "?";
}
