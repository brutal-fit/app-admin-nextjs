import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AVATAR_PRESET_KEYS } from "@/lib/utils/avatar";

const dir = join(process.cwd(), "public", "avatars");
const appDir = join(process.cwd(), "..", "app-fe-flutter", "assets", "avatars");

describe("preset avatar files", () => {
  it("has exactly one svg per preset key and nothing else", () => {
    const files = readdirSync(dir).sort();
    expect(files).toEqual(AVATAR_PRESET_KEYS.map((k) => `${k}.svg`).sort());
  });

  it.each(AVATAR_PRESET_KEYS)("%s.svg is a 128x128 circular svg", (key) => {
    const svg = readFileSync(join(dir, `${key}.svg`), "utf8");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('viewBox="0 0 128 128"');
    expect(svg).toContain("<circle");
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
  });

  it.each(AVATAR_PRESET_KEYS)("%s.svg matches the app's asset", (key) => {
    const appFile = join(appDir, `${key}.svg`);
    // The sibling repo may be absent in isolated checkouts.
    if (!existsSync(appFile)) return;
    expect(readFileSync(join(dir, `${key}.svg`), "utf8")).toBe(readFileSync(appFile, "utf8"));
  });
});
