import { describe, expect, it } from "vitest";
import type { StoreSettings } from "@/types";
import { normalizeStoreSettings } from "@/lib/store-settings-utils";

const baseSettings: StoreSettings = {
  storeName: "  BagStore  ",
  storeEmail: " info@example.com ",
  storePhone: " 123 ",
  whatsapp: " 456 ",
  logoUrl: " https://example.com/logo.png ",
  faviconUrl: " https://example.com/favicon.png ",
  logoHeightNavbar: 10,
  logoHeightFooter: 20,
  heroImageUrl: " https://example.com/hero.png ",
  heroImageUrls: [" https://example.com/hero-1.png ", ""],
  heroSlideIntervalSec: 99,
  facebookUrl: " facebook.com/store ",
  instagramUrl: " instagram.com/store ",
  tiktokUrl: " tiktok.com/@store ",
  youtubeUrl: " youtube.com/store ",
  footerCategories: [" حقائب ", ""],
  quickLinks: [{ message: " اذهب ", label: " الرئيسية ", url: " / " }],
  cloudinaryCloudName: " cloud ",
  cloudinaryUploadPreset: " preset ",
  cloudinaryApiKey: " key ",
  externalDbEnabled: true,
  externalDbProvider: "supabase",
  externalDbUrl: " https://db.example.com ",
  externalDbName: " bagstore ",
  externalDbApiKey: " secret ",
  themePrimaryColor: "bad",
  themeAccentColor: "#111111",
  themeBackgroundColor: "#222222",
  themeForegroundColor: "#333333",
  productsPerPage: 12,
  currency: "iqd",
  visitorCount: -1,
  visitorUniqueCount: -5,
  visitorDailyStats: { today: 3, bad: -2 },
  visitorMonthlyStats: { month: 4 },
  userName: " Admin ",
  userEmail: " admin@example.com ",
};

describe("normalizeStoreSettings", () => {
  it("normalizes strings, limits, and fallbacks", () => {
    const normalized = normalizeStoreSettings(baseSettings, {
      footerCategories: ["Default"],
      quickLinks: [{ label: "Default", url: "/", message: "" }],
      heroImageUrl: "",
      heroImageUrls: [],
      externalDbUrl: "",
      externalDbName: "",
      externalDbApiKey: "",
    });

    expect(normalized.storeName).toBe("BagStore");
    expect(normalized.logoHeightNavbar).toBe(24);
    expect(normalized.logoHeightFooter).toBe(24);
    expect(normalized.heroSlideIntervalSec).toBe(15);
    expect(normalized.heroImageUrls).toEqual(["https://example.com/hero-1.png"]);
    expect(normalized.footerCategories).toEqual(["حقائب"]);
    expect(normalized.quickLinks).toEqual([{ message: "اذهب", label: "الرئيسية", url: "/" }]);
    expect(normalized.themePrimaryColor).toBe("#d95f1f");
    expect(normalized.visitorCount).toBe(0);
    expect(normalized.visitorUniqueCount).toBe(0);
  });
});
