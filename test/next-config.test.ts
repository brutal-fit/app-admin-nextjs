import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("next.config headers", () => {
  it("sends upgrade-insecure-requests and nosniff on every path", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const all = rules.find((rule) => rule.source === "/(.*)");
    expect(all).toBeDefined();
    expect(all?.headers).toEqual(
      expect.arrayContaining([
        { key: "Content-Security-Policy", value: "upgrade-insecure-requests" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ]),
    );
  });
});
