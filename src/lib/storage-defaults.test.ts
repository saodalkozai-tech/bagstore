import { describe, expect, it } from "vitest";
import {
  DEFAULT_DEMO_CREDENTIALS,
  DEFAULT_THEME_ACCENT,
  DEFAULT_THEME_BACKGROUND,
  DEFAULT_THEME_FOREGROUND,
  DEFAULT_THEME_PRIMARY,
} from "@/lib/storage-defaults";

describe("storage defaults", () => {
  it("provides the expected local demo accounts", () => {
    expect(DEFAULT_DEMO_CREDENTIALS).toHaveLength(3);
    expect(DEFAULT_DEMO_CREDENTIALS.map((item) => item.role)).toEqual([
      "admin",
      "editor",
      "viewer",
    ]);
    expect(DEFAULT_DEMO_CREDENTIALS.every((item) => item.username && item.password)).toBe(true);
  });

  it("keeps the default theme colors in hex format", () => {
    for (const color of [
      DEFAULT_THEME_PRIMARY,
      DEFAULT_THEME_ACCENT,
      DEFAULT_THEME_BACKGROUND,
      DEFAULT_THEME_FOREGROUND,
    ]) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
