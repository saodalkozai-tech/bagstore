import { StoreSettings } from "@/types";
import {
  DEFAULT_THEME_ACCENT,
  DEFAULT_THEME_BACKGROUND,
  DEFAULT_THEME_FOREGROUND,
  DEFAULT_THEME_PRIMARY,
} from "@/lib/storage-defaults";

export function normalizeHexColor(value: unknown, fallback: string): string {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

export function normalizeStoreSettings(
  settings: StoreSettings,
  defaults: Pick<
    StoreSettings,
    | "footerCategories"
    | "quickLinks"
    | "heroImageUrl"
    | "heroImageUrls"
    | "externalDbUrl"
    | "externalDbName"
    | "externalDbApiKey"
  >,
): StoreSettings {
  const normalizedHeroImages = Array.isArray(settings.heroImageUrls)
    ? settings.heroImageUrls.map((url) => String(url).trim()).filter(Boolean)
    : [];
  const normalizedFooterCategories = Array.isArray(settings.footerCategories)
    ? settings.footerCategories.map((category) => String(category).trim()).filter(Boolean)
    : [];
  const normalizedQuickLinks = Array.isArray(settings.quickLinks)
    ? settings.quickLinks
        .map((item) => ({
          message: String(item?.message || "").trim(),
          label: String(item?.label || "").trim(),
          url: String(item?.url || "").trim(),
        }))
        .filter((item) => item.label && item.url)
    : [];

  return {
    ...settings,
    storeName: settings.storeName.trim(),
    storeEmail: settings.storeEmail.trim(),
    storePhone: settings.storePhone.trim(),
    whatsapp: settings.whatsapp.trim(),
    logoUrl: settings.logoUrl.trim(),
    faviconUrl: settings.faviconUrl.trim(),
    logoHeightNavbar: Math.max(24, Number(settings.logoHeightNavbar) || 48),
    logoHeightFooter: Math.max(24, Number(settings.logoHeightFooter) || 80),
    heroSlideIntervalSec: Math.min(15, Math.max(2, Number(settings.heroSlideIntervalSec) || 5)),
    heroImageUrls:
      normalizedHeroImages.length > 0
        ? normalizedHeroImages
        : String(settings.heroImageUrl || "").trim()
          ? [String(settings.heroImageUrl || "").trim()]
          : defaults.heroImageUrls,
    heroImageUrl:
      normalizedHeroImages[0] ||
      String(settings.heroImageUrl || "").trim() ||
      defaults.heroImageUrl,
    facebookUrl: settings.facebookUrl.trim(),
    instagramUrl: settings.instagramUrl.trim(),
    tiktokUrl: settings.tiktokUrl.trim(),
    youtubeUrl: settings.youtubeUrl.trim(),
    footerCategories:
      normalizedFooterCategories.length > 0
        ? normalizedFooterCategories
        : defaults.footerCategories,
    quickLinks:
      normalizedQuickLinks.length > 0
        ? normalizedQuickLinks
        : defaults.quickLinks,
    externalDbEnabled: Boolean(settings.externalDbEnabled),
    externalDbProvider: "supabase",
    externalDbUrl: String(settings.externalDbUrl || defaults.externalDbUrl).trim(),
    externalDbName: String(settings.externalDbName || defaults.externalDbName).trim(),
    externalDbApiKey: String(settings.externalDbApiKey || defaults.externalDbApiKey).trim(),
    visitorCount: Math.max(0, Number(settings.visitorCount) || 0),
    visitorUniqueCount: Math.max(0, Number(settings.visitorUniqueCount) || 0),
    visitorDailyStats: toSafeCounterRecord(settings.visitorDailyStats),
    visitorMonthlyStats: toSafeCounterRecord(settings.visitorMonthlyStats),
    userName: settings.userName.trim(),
    userEmail: settings.userEmail.trim(),
    themePrimaryColor: normalizeHexColor(settings.themePrimaryColor, DEFAULT_THEME_PRIMARY),
    themeAccentColor: normalizeHexColor(settings.themeAccentColor, DEFAULT_THEME_ACCENT),
    themeBackgroundColor: normalizeHexColor(settings.themeBackgroundColor, DEFAULT_THEME_BACKGROUND),
    themeForegroundColor: normalizeHexColor(settings.themeForegroundColor, DEFAULT_THEME_FOREGROUND),
  };
}

function toSafeCounterRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>(
    (acc, [key, rawValue]) => {
      const numericValue = Number(rawValue);
      if (Number.isFinite(numericValue) && numericValue >= 0) {
        acc[key] = Math.floor(numericValue);
      }
      return acc;
    },
    {},
  );
}
