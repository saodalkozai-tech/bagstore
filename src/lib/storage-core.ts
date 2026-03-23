import { createClient, SupabaseClient } from '@supabase/supabase-js';
import SHA256 from 'crypto-js/sha256';
import Hex from 'crypto-js/enc-hex';

import { Product, StoreSettings, User, UserActivityLog } from '@/types';
import { MOCK_PRODUCTS, MOCK_USER } from './mockData';
import {
  DEFAULT_DEMO_CREDENTIALS,
  DEFAULT_THEME_ACCENT,
  DEFAULT_THEME_BACKGROUND,
  DEFAULT_THEME_FOREGROUND,
  DEFAULT_THEME_PRIMARY
} from './storage-defaults';
import { normalizeHexColor, normalizeStoreSettings } from './store-settings-utils';

export const STORAGE_KEYS = {
  PRODUCTS: 'bagstore_products',
  USER: 'bagstore_user',
  AUTH: 'bagstore_auth',
  USERS: 'bagstore_users',
  SETTINGS: 'bagstore_settings',
  SESSION: 'bagstore_session',
  USER_LOGS: 'bagstore_user_logs',
  SESSION_META: 'bagstore_session_meta',
  LOGIN_GUARD: 'bagstore_login_guard',
  VISITOR_TRACKED: 'bagstore_visitor_tracked',
  UNIQUE_VISITOR_TRACKED: 'bagstore_unique_visitor_tracked'
} as const;

export const MAX_USER_LOGS = 300;
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const SESSION_MAX_DURATION_MS = 8 * 60 * 60 * 1000;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MS = 10 * 60 * 1000;

export const DEFAULT_CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
export const DEFAULT_CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
export const DEFAULT_CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY || '';
export const DEFAULT_EXTERNAL_DB_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const DEFAULT_EXTERNAL_DB_API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const DEFAULT_EXTERNAL_DB_NAME = import.meta.env.VITE_SUPABASE_DB_NAME || '';

if (import.meta.env.DEV) {
  if (!DEFAULT_EXTERNAL_DB_URL) console.warn('🚨 Supabase URL missing. Set VITE_SUPABASE_URL in .env.local');
  if (!DEFAULT_EXTERNAL_DB_API_KEY) console.warn('🚨 Supabase key missing. Set VITE_SUPABASE_ANON_KEY');
}

export const CLOUD_TABLES = {
  PRODUCTS: 'bagstore_products',
  SETTINGS: 'bagstore_settings',
  USER_LOGS: 'bagstore_user_logs'
} as const;

export const CLOUD_SETTINGS_KEY = 'default';
export const CLOUD_SYNC_ERROR_EVENT = 'bagstore:cloud-sync-error';
export const PRODUCTS_UPDATED_EVENT = 'bagstore:products-updated';

export type StoredUser = User & { password: string };

export type UserMutationResult = {
  success: boolean;
  message: string;
  user?: User;
};

export type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export type SessionMeta = {
  createdAt: number;
  lastActivityAt: number;
};

export type LoginGuardState = {
  failedAttempts: number;
  lockedUntil: number;
};

export function hashPassword(password: string): string {
  return `sha256:${SHA256(password).toString(Hex)}`;
}

export function isHashedPassword(password: string): boolean {
  return password.startsWith('sha256:');
}

export function verifyPassword(rawPassword: string, storedPassword: string): boolean {
  if (isHashedPassword(storedPassword)) {
    return hashPassword(rawPassword) === storedPassword;
  }
  return storedPassword === rawPassword;
}

export const DEFAULT_USERS: StoredUser[] = DEFAULT_DEMO_CREDENTIALS.map((credential, index) => ({
  id: String(index + 1),
  name: credential.name,
  username: credential.username,
  email: credential.email,
  role: credential.role,
  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${credential.username}`,
  createdAt: '2024-01-01',
  password: hashPassword(credential.password)
}));

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'متجر الحقائب',
  storeEmail: 'info@bagstore.com',
  storePhone: '+9647516595172',
  whatsapp: '+9647516595172',
  logoUrl: '',
  faviconUrl: '',
  logoHeightNavbar: 48,
  logoHeightFooter: 80,
  heroImageUrl: '',
  heroImageUrls: [],
  heroSlideIntervalSec: 5,
  facebookUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  youtubeUrl: '',
  footerCategories: ['حقائب يد', 'حقائب كروس', 'حقائب ظهر', 'حقائب سفر'],
  quickLinks: [
    { message: 'اذهب إلى', label: 'الرئيسية', url: '/' },
    { message: 'تصفح', label: 'المنتجات', url: '/products' },
    { message: 'تعرف علينا', label: 'من نحن', url: '#' },
    { message: 'اقرأ', label: 'سياسة الإرجاع', url: '#' }
  ],
  cloudinaryCloudName: DEFAULT_CLOUDINARY_CLOUD_NAME,
  cloudinaryUploadPreset: DEFAULT_CLOUDINARY_UPLOAD_PRESET,
  cloudinaryApiKey: DEFAULT_CLOUDINARY_API_KEY,
  externalDbEnabled: !!DEFAULT_EXTERNAL_DB_URL && !!DEFAULT_EXTERNAL_DB_API_KEY,
  externalDbProvider: 'supabase',
  externalDbUrl: DEFAULT_EXTERNAL_DB_URL,
  externalDbName: DEFAULT_EXTERNAL_DB_NAME,
  externalDbApiKey: DEFAULT_EXTERNAL_DB_API_KEY,
  themePrimaryColor: DEFAULT_THEME_PRIMARY,
  themeAccentColor: DEFAULT_THEME_ACCENT,
  themeBackgroundColor: DEFAULT_THEME_BACKGROUND,
  themeForegroundColor: DEFAULT_THEME_FOREGROUND,
  productsPerPage: 12,
  currency: 'iqd',
  visitorCount: 0,
  visitorUniqueCount: 0,
  visitorDailyStats: {},
  visitorMonthlyStats: {},
  userName: MOCK_USER.name,
  userEmail: MOCK_USER.email
};

export function toSafeCounterRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
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
    {}
  );
}

export function pruneVisitorDayStats(
  stats: Record<string, number>,
  keepDays = 400
): Record<string, number> {
  const sortedKeys = Object.keys(stats).sort();
  if (sortedKeys.length <= keepDays) return stats;
  const keep = new Set(sortedKeys.slice(-keepDays));
  return sortedKeys.reduce<Record<string, number>>((acc, key) => {
    if (keep.has(key)) acc[key] = stats[key];
    return acc;
  }, {});
}

export function pruneVisitorMonthStats(
  stats: Record<string, number>,
  keepMonths = 36
): Record<string, number> {
  const sortedKeys = Object.keys(stats).sort();
  if (sortedKeys.length <= keepMonths) return stats;
  const keep = new Set(sortedKeys.slice(-keepMonths));
  return sortedKeys.reduce<Record<string, number>>((acc, key) => {
    if (keep.has(key)) acc[key] = stats[key];
    return acc;
  }, {});
}

let supabaseClientCache: SupabaseClient | null = null;
let supabaseClientCacheKey = '';

export function isExternalSupabaseEnabled(settings: StoreSettings): boolean {
  return (
    settings.externalDbEnabled &&
    settings.externalDbProvider === 'supabase' &&
    settings.externalDbUrl.trim().length > 0 &&
    settings.externalDbApiKey.trim().length > 0
  );
}

export function getSupabaseClient(settings: StoreSettings): SupabaseClient | null {
  if (!isExternalSupabaseEnabled(settings)) {
    return null;
  }

  const url = settings.externalDbUrl.trim();
  const key = settings.externalDbApiKey.trim();
  const cacheKey = `${url}::${key}`;

  if (supabaseClientCache && supabaseClientCacheKey === cacheKey) {
    return supabaseClientCache;
  }

  supabaseClientCache = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });
  supabaseClientCacheKey = cacheKey;
  return supabaseClientCache;
}

export function getStoreSettingsSafe(): StoreSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const parsed = safeParse<StoreSettings | null>(raw, null);
    return parsed ? createDefaultSettings(parsed) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getSessionStorageSafe(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function nowMs(): number {
  return Date.now();
}

export function formatSupabaseError(error: unknown, scope: string): Error {
  const err = (error || {}) as SupabaseLikeError;
  const code = err.code || '';
  const message = err.message || 'Unknown Supabase error';

  if (code === '42P01') {
    return new Error(`فشل مزامنة ${scope}: الجدول غير موجود في Supabase. تحقق من تشغيل SQL إنشاء الجداول.`);
  }

  if (code === '42501') {
    return new Error(`فشل مزامنة ${scope}: لا توجد صلاحيات كافية. تحقق من سياسات RLS للجدول.`);
  }

  if (/Invalid API key|invalid api key|JWT|Unauthorized|permission/i.test(message)) {
    return new Error(`فشل مزامنة ${scope}: مفتاح Supabase غير صحيح أو غير مخوّل.`);
  }

  return new Error(`فشل مزامنة ${scope}: ${message}`);
}

export function toPublicUser(user: StoredUser): User {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export function normalizeStoredUsers(
  users: StoredUser[]
): { users: StoredUser[]; changed: boolean } {
  let changed = false;
  const normalizedUsers = users.map((user) => {
    const normalizedPassword = isHashedPassword(user.password)
      ? user.password
      : hashPassword(user.password);
    if (normalizedPassword !== user.password) {
      changed = true;
    }
    return {
      ...user,
      password: normalizedPassword
    };
  });
  return { users: normalizedUsers, changed };
}

export function normalizeStoredProduct(raw: unknown): Product | null {
  if (!raw || typeof raw !== 'object') return null;
  const product = raw as Record<string, unknown>;

  const id = String(product.id || '').trim();
  const name = String(product.name || '').trim();
  const category = String(product.category || '').trim();
  const color = String(product.color || '').trim();
  const price = Number(product.price);
  const stock = Number(product.stock);
  const images = Array.isArray(product.images)
    ? product.images.map((image) => String(image || '').trim()).filter(Boolean)
    : [];

  if (!id || !name || !Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || stock < 0 || images.length === 0) {
    return null;
  }

  const salePriceRaw = Number(product.salePrice);
  const salePrice =
    Number.isFinite(salePriceRaw) && salePriceRaw >= 0
      ? salePriceRaw
      : undefined;
  const deliveryInfo = String(product.deliveryInfo || '').trim() || undefined;
  const createdAt = String(product.createdAt || '').trim() || new Date().toISOString();
  const updatedAt = String(product.updatedAt || '').trim() || createdAt;

  return {
    id,
    name,
    price,
    salePrice,
    images,
    category,
    color,
    deliveryInfo,
    stock: Math.floor(stock),
    inStock: typeof product.inStock === 'boolean' ? product.inStock : stock > 0,
    featured: Boolean(product.featured),
    createdAt,
    updatedAt
  };
}

export function createDefaultSettings(stored?: StoreSettings | null): StoreSettings {
  const normalizedSettings = normalizeStoreSettings(
    {
      ...DEFAULT_SETTINGS,
      ...stored
    },
    {
      footerCategories: DEFAULT_SETTINGS.footerCategories,
      quickLinks: DEFAULT_SETTINGS.quickLinks,
      heroImageUrl: DEFAULT_SETTINGS.heroImageUrl,
      heroImageUrls: DEFAULT_SETTINGS.heroImageUrls,
      externalDbUrl: DEFAULT_EXTERNAL_DB_URL,
      externalDbName: DEFAULT_EXTERNAL_DB_NAME,
      externalDbApiKey: DEFAULT_EXTERNAL_DB_API_KEY
    }
  );

  return {
    ...normalizedSettings,
    visitorDailyStats: pruneVisitorDayStats(toSafeCounterRecord(normalizedSettings.visitorDailyStats)),
    visitorMonthlyStats: pruneVisitorMonthStats(toSafeCounterRecord(normalizedSettings.visitorMonthlyStats)),
    themePrimaryColor: normalizeHexColor(normalizedSettings.themePrimaryColor, DEFAULT_THEME_PRIMARY),
    themeAccentColor: normalizeHexColor(normalizedSettings.themeAccentColor, DEFAULT_THEME_ACCENT),
    themeBackgroundColor: normalizeHexColor(normalizedSettings.themeBackgroundColor, DEFAULT_THEME_BACKGROUND),
    themeForegroundColor: normalizeHexColor(normalizedSettings.themeForegroundColor, DEFAULT_THEME_FOREGROUND)
  };
}

export function createNormalizedSettingsForSave(settings: StoreSettings): StoreSettings {
  return {
    ...normalizeStoreSettings(settings, {
      footerCategories: DEFAULT_SETTINGS.footerCategories,
      quickLinks: DEFAULT_SETTINGS.quickLinks,
      heroImageUrl: DEFAULT_SETTINGS.heroImageUrl,
      heroImageUrls: DEFAULT_SETTINGS.heroImageUrls,
      externalDbUrl: DEFAULT_EXTERNAL_DB_URL,
      externalDbName: DEFAULT_EXTERNAL_DB_NAME,
      externalDbApiKey: DEFAULT_EXTERNAL_DB_API_KEY
    }),
    visitorDailyStats: pruneVisitorDayStats(toSafeCounterRecord(settings.visitorDailyStats)),
    visitorMonthlyStats: pruneVisitorMonthStats(toSafeCounterRecord(settings.visitorMonthlyStats)),
  };
}

export { MOCK_PRODUCTS };
