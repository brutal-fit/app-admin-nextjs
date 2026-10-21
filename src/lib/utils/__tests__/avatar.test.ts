import { describe, expect, it } from "vitest";
import {
  AVATAR_PRESET_KEYS,
  avatarInitials,
  avatarPhotoUrl,
  avatarPresetUrl,
  avatarSources,
  toAvatarRef,
} from "@/lib/utils/avatar";
import { existsSync } from "node:fs";
import { join } from "node:path";

const URL_BASE = "https://example.supabase.co";

describe("avatar helpers", () => {
  it("has a bundled svg for every preset key", () => {
    expect(AVATAR_PRESET_KEYS).toHaveLength(12);
    for (const key of AVATAR_PRESET_KEYS) {
      expect(existsSync(join(process.cwd(), "public", "avatars", `${key}.svg`))).toBe(true);
    }
  });

  it("builds the public bucket url and encodes segments", () => {
    expect(avatarPhotoUrl("u1/me photo.jpg", `${URL_BASE}/`)).toBe(
      `${URL_BASE}/storage/v1/object/public/avatars/u1/me%20photo.jpg`,
    );
    expect(avatarPhotoUrl("../../etc/x.png", URL_BASE)).toBe(
      `${URL_BASE}/storage/v1/object/public/avatars/etc/x.png`,
    );
    expect(avatarPhotoUrl(null, URL_BASE)).toBeNull();
    expect(avatarPhotoUrl("a.png", null)).toBeNull();
  });

  it("maps a known preset to its file and an unknown one to null", () => {
    expect(avatarPresetUrl("kettlebell")).toBe("/avatars/kettlebell.svg");
    expect(avatarPresetUrl("unicorn")).toBeNull();
    expect(avatarPresetUrl(null)).toBeNull();
  });

  it("orders sources photo then preset, empty for initials", () => {
    expect(avatarSources({ path: "a.png", preset: "mat" }, URL_BASE)).toEqual([
      `${URL_BASE}/storage/v1/object/public/avatars/a.png`,
      "/avatars/mat.svg",
    ]);
    expect(avatarSources({ path: null, preset: "mat" }, URL_BASE)).toEqual(["/avatars/mat.svg"]);
    expect(avatarSources({ path: null, preset: null }, URL_BASE)).toEqual([]);
    expect(avatarSources(null, URL_BASE)).toEqual([]);
  });

  it("treats blank reader values as absent", () => {
    expect(toAvatarRef("  ", "")).toEqual({ path: null, preset: null });
    expect(toAvatarRef(" p.png ", " rope ")).toEqual({ path: "p.png", preset: "rope" });
    expect(toAvatarRef(undefined, undefined)).toEqual({ path: null, preset: null });
  });

  it("derives initials", () => {
    expect(avatarInitials("Asha Rao")).toBe("AR");
    expect(avatarInitials("asha")).toBe("A");
    expect(avatarInitials("Asha K Rao")).toBe("AR");
    expect(avatarInitials("  ")).toBe("?");
    expect(avatarInitials(null)).toBe("?");
  });
});
