import { Product, StoreSettings, User, UserActivityLog } from '@/types';
import { MOCK_PRODUCTS, MOCK_USER } from './mockData';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import SHA256 from 'crypto-js/sha256';
import Hex from 'crypto-js/enc-hex';
import {
  getFirebaseCurrentSession,
  isFirebaseAuthEnabled,
  signInWithFirebase,
  signOutFirebase
} from './firebase-auth';

const STORAGE_KEYS = {
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
};
const MAX_USER_LOGS = 300;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_MAX_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 10 * 60 * 1000; // 10 minutes

const DEFAULT_CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const DEFAULT_CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
const DEFAULT_CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY || '';
const DEFAULT_EXTERNAL_DB_URL = import.meta.env.VITE_SUPABASE_URL || '';
const DEFAULT_EXTERNAL_DB_API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const DEFAULT_EXTERNAL_DB_NAME = import.meta.env.VITE_SUPABASE_DB_NAME || '';

if (import.meta.env.DEV) {
  if (!DEFAULT_EXTERNAL_DB_URL) console.warn('🚨 Supabase URL missing. Set VITE_SUPABASE_URL in .env.local');
  if (!DEFAULT_EXTERNAL_DB_API_KEY) console.warn('🚨 Supabase key missing. Set VITE_SUPABASE_ANON_KEY');
}
const DEFAULT_THEME_PRIMARY = '#d95f1f';
const DEFAULT_THEME_ACCENT = '#d95f1f';
const DEFAULT_THEME_BACKGROUND = '#ffffff';
const DEFAULT_THEME_FOREGROUND = '#1a1a1a';
const CLOUD_TABLES = {
  PRODUCTS: 'bagstore_products',
  USERS: 'bagstore_users',
  SETTINGS: 'bagstore_settings',
  USER_LOGS: 'bagstore_user_logs'
} as const;
const CLOUD_SETTINGS_KEY = 'default';
export const CLOUD_SYNC_ERROR_EVENT = 'bagstore:cloud-sync-error';
export const PRODUCTS_UPDATED_EVENT = 'bagstore:products-updated';
type StoredUser = User & { password: string };
type UserMutationResult = {
  success: boolean;
  message: string;
  user?: User;
};
type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};
type SessionMeta = {
  createdAt: number;
  lastActivityAt: number;
};
type LoginGuardState = {
  failedAttempts: number;
  lockedUntil: number;
};

const DEFAULT_DEMO_CREDENTIALS = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin' as const,
    name: 'سعود الخزاعي',
    email: 'admin@bagstore.com'
  },
  {
    username: 'editor',
    password: 'editor123',
    role: 'editor' as const,
    name: 'سارة علي',
    email: 'editor@bagstore.com'
  },
  {
    username: 'viewer',
    password: 'viewer123',
    role: 'viewer' as const,
    name: 'محمد كريم',
    email: 'viewer@bagstore.com'
  }
];

function hashPassword(password: string): string {
  return `sha256:${SHA256(password).toString(Hex)}`;
}

function isHashedPassword(password: string): boolean {
  return password.startsWith('sha256:');
}

function verifyPassword(rawPassword: string, storedPassword: string): boolean {
  if (isHashedPassword(storedPassword)) {
    return hashPassword(rawPassword) === storedPassword;
  }
  return storedPassword === rawPassword;
}

const DEFAULT_USERS: StoredUser[] = DEFAULT_DEMO_CREDENTIALS.map((credential, index) => ({
  id: String(index + 1),
  name: credential.name,
  username: credential.username,
  email: credential.email,
  role: credential.role,
  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${credential.username}`,
  createdAt: '2024-01-01',
  password: hashPassword(credential.password)
}));

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'متجر الحقائب',
  storeEmail: 'info@bagstore.com',
  storePhone: '+9647768397293',
  whatsapp: '+9647768397293',
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

function toSafeCounterRecord(value: unknown): Record<string, number> {
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

function pruneVisitorDayStats(stats: Record<string, number>, keepDays = 400): Record<string, number> {
  const sortedKeys = Object.keys(stats).sort();
  if (sortedKeys.length <= keepDays) return stats;
  const keep = new Set(sortedKeys.slice(-keepDays));
  return sortedKeys.reduce<Record<string, number>>((acc, key) => {
    if (keep.has(key)) acc[key] = stats[key];
    return acc;
  }, {});
}

function pruneVisitorMonthStats(stats: Record<string, number>, keepMonths = 36): Record<string, number> {
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

function isExternalSupabaseEnabled(settings: StoreSettings): boolean {
  return (
    settings.externalDbProvider === 'supabase' &&
    settings.externalDbUrl.trim().length > 0 &&
    settings.externalDbApiKey.trim().length > 0
  );
}

function getSupabaseClient(settings: StoreSettings): SupabaseClient | null {
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
      persistSession: false,
      autoRefreshToken: false
    }
  });
  supabaseClientCacheKey = cacheKey;
  return supabaseClientCache;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getUserLogsInternal(): UserActivityLog[] {
  const logs = safeParse<UserActivityLog[] | null>(
    localStorage.getItem(STORAGE_KEYS.USER_LOGS),
    null
  );

  if (!Array.isArray(logs)) {
    return [];
  }

  return logs.filter((log) => log && typeof log.id === 'string' && typeof log.createdAt === 'string');
}

function saveUserLogsInternal(logs: UserActivityLog[]): void {
  const normalizedLogs = logs.slice(0, MAX_USER_LOGS);
  localStorage.setItem(
    STORAGE_KEYS.USER_LOGS,
    JSON.stringify(normalizedLogs)
  );
  queueCloudSync(() => syncUserLogsToCloud(normalizedLogs));
}

function appendUserLog(
  payload: Omit<UserActivityLog, 'id' | 'createdAt'>
): void {
  const logs = getUserLogsInternal();
  const nextLog: UserActivityLog = {
    ...payload,
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString()
  };

  logs.unshift(nextLog);
  saveUserLogsInternal(logs);
}

function getSessionStorageSafe(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function nowMs(): number {
  return Date.now();
}

function getSessionMeta(): SessionMeta | null {
  const sessionStorageSafe = getSessionStorageSafe();
  const raw = sessionStorageSafe?.getItem(STORAGE_KEYS.SESSION_META) || null;
  const meta = safeParse<SessionMeta | null>(raw, null);
  if (!meta) return null;
  if (!Number.isFinite(meta.createdAt) || !Number.isFinite(meta.lastActivityAt)) {
    return null;
  }
  return meta;
}

function setSessionMeta(meta: SessionMeta): void {
  const sessionStorageSafe = getSessionStorageSafe();
  sessionStorageSafe?.setItem(STORAGE_KEYS.SESSION_META, JSON.stringify(meta));
}

function touchSessionActivity(): void {
  const meta = getSessionMeta();
  if (!meta) return;
  setSessionMeta({
    ...meta,
    lastActivityAt: nowMs()
  });
}

function getLoginGuardState(): LoginGuardState {
  const raw = localStorage.getItem(STORAGE_KEYS.LOGIN_GUARD);
  const parsed = safeParse<LoginGuardState | null>(raw, null);
  if (!parsed) {
    return { failedAttempts: 0, lockedUntil: 0 };
  }
  return {
    failedAttempts: Number(parsed.failedAttempts) || 0,
    lockedUntil: Number(parsed.lockedUntil) || 0
  };
}

function setLoginGuardState(state: LoginGuardState): void {
  localStorage.setItem(STORAGE_KEYS.LOGIN_GUARD, JSON.stringify(state));
}

function clearLoginGuardState(): void {
  localStorage.removeItem(STORAGE_KEYS.LOGIN_GUARD);
}

function setSessionForUser(user: User): void {
  const sessionStorageSafe = getSessionStorageSafe();
  if (!sessionStorageSafe) return;

  const now = nowMs();
  sessionStorageSafe.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  sessionStorageSafe.setItem(STORAGE_KEYS.AUTH, 'true');
  sessionStorageSafe.setItem(STORAGE_KEYS.SESSION, now.toString());
  setSessionMeta({
    createdAt: now,
    lastActivityAt: now
  });
}

function normalizeHexColor(value: unknown, fallback: string): string {
  const color = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function formatSupabaseError(error: unknown, scope: string): Error {
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

function toPublicUser(user: StoredUser): User {
  const { password: _, ...safeUser } = user;
  return safeUser;
}

function normalizeStoredUsers(users: StoredUser[]): { users: StoredUser[]; changed: boolean } {
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

function getStoredUsers(): StoredUser[] {
  const storedUsers = safeParse<StoredUser[] | null>(
    localStorage.getItem(STORAGE_KEYS.USERS),
    null
  );

  if (!Array.isArray(storedUsers) || storedUsers.length === 0) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }

  const normalized = normalizeStoredUsers(storedUsers);
  if (normalized.changed) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(normalized.users));
  }

  return normalized.users;
}

function saveStoredUsers(users: StoredUser[]): void {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  queueCloudSync(() => syncUsersToCloud(users));
}

function syncCurrentUser(users: StoredUser[]): void {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const updatedCurrentUser = users.find((user) => user.id === currentUser.id);
  if (!updatedCurrentUser) {
    logout();
    return;
  }

  const sessionStorageSafe = getSessionStorageSafe();
  sessionStorageSafe?.setItem(STORAGE_KEYS.USER, JSON.stringify(toPublicUser(updatedCurrentUser)));
}

function normalizeStoredProduct(raw: unknown): Product | null {
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

async function syncProductsToCloud(products: Product[]): Promise<void> {
  const settings = getStoreSettings();
  const supabase = getSupabaseClient(settings);
  if (!supabase) return;

  const { data: existingRows, error: fetchError } = await supabase
    .from(CLOUD_TABLES.PRODUCTS)
    .select('id');

  if (fetchError) {
    throw fetchError;
  }

  const existingIds = new Set((existingRows || []).map((row) => String(row.id)));
  const nextIds = new Set(products.map((product) => product.id));
  const staleIds = [...existingIds].filter((id) => !nextIds.has(id));

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase
      .from(CLOUD_TABLES.PRODUCTS)
      .delete()
      .in('id', staleIds);

    if (deleteError) {
      throw deleteError;
    }
  }

  if (products.length === 0) {
    return;
  }

  const payload = products.map((product) => ({
    id: product.id,
    data: normalizeStoredProduct(product) || product,
    updated_at: new Date().toISOString()
  }));

  const { error: upsertError } = await supabase
    .from(CLOUD_TABLES.PRODUCTS)
    .upsert(payload, { onConflict: 'id' });

  if (upsertError) {
    throw upsertError;
  }
}

async function syncUsersToCloud(users: StoredUser[]): Promise<void> {
  const settings = getStoreSettings();
  const supabase = getSupabaseClient(settings);
  if (!supabase) return;

  const { data: existingRows, error: fetchError } = await supabase
    .from(CLOUD_TABLES.USERS)
    .select('id');

  if (fetchError) {
    throw fetchError;
  }

  const existingIds = new Set((existingRows || []).map((row) => String(row.id)));
  const nextIds = new Set(users.map((user) => user.id));
  const staleIds = [...existingIds].filter((id) => !nextIds.has(id));

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase
      .from(CLOUD_TABLES.USERS)
      .delete()
      .in('id', staleIds);

    if (deleteError) {
      throw deleteError;
    }
  }

  if (users.length === 0) {
    return;
  }

  const payload = users.map((user) => ({
    id: user.id,
    data: user,
    updated_at: new Date().toISOString()
  }));

  const { error: upsertError } = await supabase
    .from(CLOUD_TABLES.USERS)
    .upsert(payload, { onConflict: 'id' });

  if (upsertError) {
    throw upsertError;
  }
}

async function syncSettingsToCloud(settings: StoreSettings): Promise<void> {
  const supabase = getSupabaseClient(settings);
  if (!supabase) return;

  const payload = {
    key: CLOUD_SETTINGS_KEY,
    data: settings,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from(CLOUD_TABLES.SETTINGS)
    .upsert(payload, { onConflict: 'key' });

  if (error) {
    throw error;
  }
}

async function syncUserLogsToCloud(logs: UserActivityLog[]): Promise<void> {
  const settings = getStoreSettings();
  const supabase = getSupabaseClient(settings);
  if (!supabase) return;

  const { data: existingRows, error: fetchError } = await supabase
    .from(CLOUD_TABLES.USER_LOGS)
    .select('id');

  if (fetchError) {
    throw fetchError;
  }

  const existingIds = new Set((existingRows || []).map((row) => String(row.id)));
  const nextIds = new Set(logs.map((log) => log.id));
  const staleIds = [...existingIds].filter((id) => !nextIds.has(id));

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase
      .from(CLOUD_TABLES.USER_LOGS)
      .delete()
      .in('id', staleIds);

    if (deleteError) {
      throw deleteError;
    }
  }

  if (logs.length === 0) {
    return;
  }

  const payload = logs.map((log) => ({
    id: log.id,
    data: log,
    created_at: log.createdAt,
    updated_at: new Date().toISOString()
  }));

  const { error: upsertError } = await supabase
    .from(CLOUD_TABLES.USER_LOGS)
    .upsert(payload, { onConflict: 'id' });

  if (upsertError) {
    throw upsertError;
  }
}

function emitCloudSyncError(detail: { message: string }): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CLOUD_SYNC_ERROR_EVENT, { detail }));
}

function emitProductsUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PRODUCTS_UPDATED_EVENT));
}

function queueCloudSync(task: () => Promise<void>): void {
  task().catch((error) => {
    console.error('Cloud sync error:', error);
    const message =
      error instanceof Error
        ? error.message
        : String(error || 'فشل مزامنة السحابة');
    emitCloudSyncError({ message });
  });
}

export const syncLocalDataToSupabase = async (): Promise<void> => {
  const settings = getStoreSettings();
  const supabase = getSupabaseClient(settings);

  if (!supabase) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ Supabase sync skipped: Missing config. Using local storage only.');
    }
    return;
  }

  try {
    await syncProductsToCloud(getProducts());
  } catch (error) {
    throw formatSupabaseError(error, 'المنتجات');
  }

  try {
    await syncUsersToCloud(getStoredUsers());
  } catch (error) {
    throw formatSupabaseError(error, 'المستخدمين');
  }

  try {
    await syncSettingsToCloud(settings);
  } catch (error) {
    throw formatSupabaseError(error, 'الإعدادات');
  }

  try {
    await syncUserLogsToCloud(getUserLogsInternal());
  } catch (error) {
    throw formatSupabaseError(error, 'سجل نشاط المستخدمين');
  }
};

function writeDefaultLocalStateIfNeeded(): void {
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(MOCK_PRODUCTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }
}

export const initializeStorage = async (): Promise<void> => {
  writeDefaultLocalStateIfNeeded();

  const settings = getStoreSettings();
  const supabase = getSupabaseClient(settings);
  if (!supabase) return;

  try {
    const [{ data: productRows, error: productError }, { data: usersRows, error: usersError }, { data: settingsRow, error: settingsError }, { data: logsRows, error: logsError }] = await Promise.all([
      supabase.from(CLOUD_TABLES.PRODUCTS).select('id,data'),
      supabase.from(CLOUD_TABLES.USERS).select('id,data'),
      supabase
        .from(CLOUD_TABLES.SETTINGS)
        .select('key,data')
        .eq('key', CLOUD_SETTINGS_KEY)
        .maybeSingle(),
      supabase.from(CLOUD_TABLES.USER_LOGS).select('id,data,created_at').order('created_at', { ascending: false })
    ]);

    if (productError) {
      if (import.meta.env.DEV) console.warn('Supabase products fetch failed:', productError);
    }
    if (usersError) {
      if (import.meta.env.DEV) console.warn('Supabase users fetch failed:', usersError);
    }
    if (settingsError) {
      if (import.meta.env.DEV) console.warn('Supabase settings fetch failed:', settingsError);
    }
    if (logsError) {
      if (import.meta.env.DEV) console.warn('Supabase logs fetch failed:', logsError);
    }

    const rawCloudProducts = (productRows || []).map((row) => row.data);
    const cloudProducts = rawCloudProducts
      .map((rawProduct) => normalizeStoredProduct(rawProduct))
      .filter((product): product is Product => Boolean(product));
    const cloudProductsWereSanitized =
      rawCloudProducts.length !== cloudProducts.length ||
      rawCloudProducts.some((rawProduct) => {
        const normalized = normalizeStoredProduct(rawProduct);
        return !normalized || JSON.stringify(rawProduct) !== JSON.stringify(normalized);
      });
    const cloudUsers = (usersRows || [])
      .map((row) => row.data as StoredUser)
      .filter((user) => user && typeof user.id === 'string' && typeof user.password === 'string');
    const cloudSettings = settingsRow?.data as StoreSettings | undefined;
    const cloudLogs = (logsRows || [])
      .map((row) => row.data as UserActivityLog)
      .filter((log) => log && typeof log.id === 'string' && typeof log.createdAt === 'string')
      .slice(0, MAX_USER_LOGS);

    if (cloudProducts.length > 0) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(cloudProducts));
      emitProductsUpdated();
    }
    if (cloudUsers.length > 0) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cloudUsers));
    }
    if (cloudSettings) {
      const mergedCloudSettings: StoreSettings = {
        ...cloudSettings,
        externalDbEnabled: settings.externalDbEnabled,
        externalDbProvider: settings.externalDbProvider,
        externalDbUrl: settings.externalDbUrl,
        externalDbName: settings.externalDbName,
        externalDbApiKey: settings.externalDbApiKey
      };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(mergedCloudSettings));
    }
    if (cloudLogs.length > 0) {
      localStorage.setItem(STORAGE_KEYS.USER_LOGS, JSON.stringify(cloudLogs));
    }

    // If cloud is empty, publish current local state as initial seed (non-blocking).
    try {
      if (cloudProducts.length === 0) await syncProductsToCloud(getProducts());
      if (cloudProducts.length > 0 && cloudProductsWereSanitized) await syncProductsToCloud(cloudProducts);
      if (cloudUsers.length === 0) await syncUsersToCloud(getStoredUsers());
      if (!cloudSettings) await syncSettingsToCloud(getStoreSettings());
      if (cloudLogs.length === 0) await syncUserLogsToCloud(getUserLogsInternal());
    } catch (seedError) {
      if (import.meta.env.DEV) console.warn('Cloud seeding skipped:', seedError);
    }
  } catch (error) {
    console.warn('Cloud storage initialization incomplete (local mode active):', error);
  }
};

export const refreshProductsFromSupabase = async (): Promise<boolean> => {
  const settings = getStoreSettings();
  const supabase = getSupabaseClient(settings);
  if (!supabase) return false;

  const { data: productRows, error } = await supabase
    .from(CLOUD_TABLES.PRODUCTS)
    .select('id,data');

  if (error) {
    throw formatSupabaseError(error, 'المنتجات');
  }

  const cloudProducts = (productRows || [])
    .map((row) => normalizeStoredProduct(row.data))
    .filter((product): product is Product => Boolean(product));

  if (cloudProducts.length === 0) return false;

  const currentProducts = getProducts();
  if (JSON.stringify(currentProducts) === JSON.stringify(cloudProducts)) {
    return false;
  }

  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(cloudProducts));
  emitProductsUpdated();
  return true;
};

// Products Storage
export const getProducts = (): Product[] => {
  const products = safeParse<unknown[] | null>(
    localStorage.getItem(STORAGE_KEYS.PRODUCTS),
    null
  );

  if (!Array.isArray(products)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(MOCK_PRODUCTS));
    return MOCK_PRODUCTS;
  }

  const normalizedProducts = products
    .map((product) => normalizeStoredProduct(product))
    .filter((product): product is Product => Boolean(product));

  if (normalizedProducts.length !== products.length || JSON.stringify(normalizedProducts) !== JSON.stringify(products)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(normalizedProducts));
    emitProductsUpdated();
    queueCloudSync(() => syncProductsToCloud(normalizedProducts));
  }

  return normalizedProducts;
};

export const saveProducts = (products: Product[]): void => {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  emitProductsUpdated();
  queueCloudSync(() => syncProductsToCloud(products));
};

export const addProduct = (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
  const products = getProducts();
  const normalizedNewProduct = normalizeStoredProduct({
    ...product,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  const newProduct: Product = normalizedNewProduct || {
    ...product,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  products.unshift(newProduct);
  saveProducts(products);
  return newProduct;
};

export const updateProduct = (id: string, updates: Partial<Product>): Product | null => {
  const products = getProducts();
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  const nextProduct = normalizeStoredProduct({
    ...products[index],
    ...updates,
    updatedAt: new Date().toISOString()
  });
  if (!nextProduct) return null;

  products[index] = nextProduct;
  saveProducts(products);
  return products[index];
};

export const deleteProduct = (id: string): boolean => {
  const products = getProducts();
  const filtered = products.filter(p => p.id !== id);
  if (filtered.length === products.length) return false;
  
  saveProducts(filtered);
  return true;
};

export const getProductById = (id: string): Product | null => {
  const products = getProducts();
  return products.find(p => p.id === id) || null;
};

// Auth Storage
export const getCurrentUser = (): User | null => {
  const sessionStorageSafe = getSessionStorageSafe();
  const sessionUserRaw = sessionStorageSafe?.getItem(STORAGE_KEYS.USER) || null;
  if (sessionUserRaw) {
    return safeParse<User | null>(sessionUserRaw, null);
  }

  // Migration fallback from older persistent sessions.
  const legacyUserRaw = localStorage.getItem(STORAGE_KEYS.USER);
  const legacyUser = safeParse<User | null>(legacyUserRaw, null);
  if (legacyUser && sessionStorageSafe) {
    sessionStorageSafe.setItem(STORAGE_KEYS.USER, JSON.stringify(legacyUser));
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  return legacyUser;
};

export const getUserActivityLogs = (): UserActivityLog[] => getUserLogsInternal();

export const hydrateAuthSession = async (): Promise<void> => {
  if (!isFirebaseAuthEnabled()) return;

  const firebaseSession = await getFirebaseCurrentSession();
  const sessionStorageSafe = getSessionStorageSafe();

  if (!firebaseSession) {
    sessionStorageSafe?.removeItem(STORAGE_KEYS.AUTH);
    sessionStorageSafe?.removeItem(STORAGE_KEYS.SESSION);
    sessionStorageSafe?.removeItem(STORAGE_KEYS.USER);
    sessionStorageSafe?.removeItem(STORAGE_KEYS.SESSION_META);
    return;
  }

  const publicUser: User = {
    id: firebaseSession.uid,
    name: firebaseSession.displayName || firebaseSession.email.split('@')[0] || 'مستخدم',
    username: firebaseSession.email || firebaseSession.uid,
    email: firebaseSession.email || `${firebaseSession.uid}@local`,
    role: firebaseSession.role,
    avatar: firebaseSession.photoURL || undefined,
    createdAt: new Date().toISOString()
  };

  setSessionForUser(publicUser);
};

export const getLoginLockoutRemainingMs = (): number => {
  const guard = getLoginGuardState();
  return Math.max(0, guard.lockedUntil - nowMs());
};

export const removeUserActivityLog = (logId: string): boolean => {
  const logs = getUserLogsInternal();
  const nextLogs = logs.filter((log) => log.id !== logId);
  if (nextLogs.length === logs.length) {
    return false;
  }

  saveUserLogsInternal(nextLogs);
  return true;
};

export const clearUserActivityLogs = (): void => {
  saveUserLogsInternal([]);
};

export const isAuthenticated = (): boolean => {
  const sessionStorageSafe = getSessionStorageSafe();
  const sessionAuth = sessionStorageSafe?.getItem(STORAGE_KEYS.AUTH) === 'true';
  const sessionToken = Boolean(sessionStorageSafe?.getItem(STORAGE_KEYS.SESSION));

  if (sessionAuth && sessionToken) {
    const meta = getSessionMeta();
    if (!meta) {
      logout({ skipLog: true });
      return false;
    }
    const now = nowMs();
    const idleExpired = now - meta.lastActivityAt > SESSION_IDLE_TIMEOUT_MS;
    const absoluteExpired = now - meta.createdAt > SESSION_MAX_DURATION_MS;
    if (idleExpired || absoluteExpired) {
      logout({ skipLog: true });
      return false;
    }
    touchSessionActivity();
    return true;
  }

  // Migration fallback from older persistent sessions.
  const legacyAuth = localStorage.getItem(STORAGE_KEYS.AUTH) === 'true';
  const legacyToken = Boolean(localStorage.getItem(STORAGE_KEYS.SESSION));
  if (legacyAuth && legacyToken && sessionStorageSafe) {
    const now = nowMs();
    sessionStorageSafe.setItem(STORAGE_KEYS.AUTH, 'true');
    sessionStorageSafe.setItem(STORAGE_KEYS.SESSION, now.toString());
    setSessionMeta({
      createdAt: now,
      lastActivityAt: now
    });
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    return true;
  }

  return false;
};

export const login = async (username: string, password: string): Promise<User | null> => {
  if (getLoginLockoutRemainingMs() > 0) {
    return null;
  }

  const normalizedUsername = username.trim();
  let publicUser: User | null = null;

  if (isFirebaseAuthEnabled()) {
    try {
      const firebaseSession = await signInWithFirebase(normalizedUsername, password);
      publicUser = {
        id: firebaseSession.uid,
        name: firebaseSession.displayName || firebaseSession.email.split('@')[0] || 'مستخدم',
        username: firebaseSession.email || firebaseSession.uid,
        email: firebaseSession.email || `${firebaseSession.uid}@local`,
        role: firebaseSession.role,
        avatar: firebaseSession.photoURL || undefined,
        createdAt: new Date().toISOString()
      };
    } catch {
      publicUser = null;
    }
  } else {
    const users = getStoredUsers();
    const matchedUser = users.find(
      (user) =>
        user.username.toLowerCase() === normalizedUsername.toLowerCase() &&
        verifyPassword(password, user.password)
    );
    if (matchedUser) {
      publicUser = toPublicUser(matchedUser);
    }
  }

  if (publicUser) {
    setSessionForUser(publicUser);
    clearLoginGuardState();

    // Ensure auth is not persisted across full restarts.
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    localStorage.removeItem(STORAGE_KEYS.SESSION);

    appendUserLog({
      action: 'login',
      actorId: publicUser.id,
      actorName: publicUser.name,
      details: `تسجيل دخول (${publicUser.role})`
    });
    return publicUser;
  }

  const guard = getLoginGuardState();
  const failedAttempts = guard.failedAttempts + 1;
  const shouldLock = failedAttempts >= MAX_LOGIN_ATTEMPTS;
  setLoginGuardState({
    failedAttempts: shouldLock ? 0 : failedAttempts,
    lockedUntil: shouldLock ? nowMs() + LOGIN_LOCKOUT_MS : 0
  });
  return null;
};

export const logout = (options?: { skipLog?: boolean }): void => {
  const currentUser = getCurrentUser();
  if (currentUser && !options?.skipLog) {
    appendUserLog({
      action: 'logout',
      actorId: currentUser.id,
      actorName: currentUser.name,
      details: 'تسجيل خروج'
    });
  }

  const sessionStorageSafe = getSessionStorageSafe();
  sessionStorageSafe?.removeItem(STORAGE_KEYS.AUTH);
  sessionStorageSafe?.removeItem(STORAGE_KEYS.SESSION);
  sessionStorageSafe?.removeItem(STORAGE_KEYS.USER);
  sessionStorageSafe?.removeItem(STORAGE_KEYS.SESSION_META);

  if (isFirebaseAuthEnabled()) {
    void signOutFirebase().catch((error) => {
      console.error('Firebase sign-out failed:', error);
    });
  }

  localStorage.removeItem(STORAGE_KEYS.AUTH);
  localStorage.removeItem(STORAGE_KEYS.SESSION);
  localStorage.removeItem(STORAGE_KEYS.USER);
};

export const getDemoCredentials = (): Array<{ username: string; password: string; role: User['role']; name: string }> =>
  isFirebaseAuthEnabled()
    ? []
    : DEFAULT_DEMO_CREDENTIALS.map((credential) => ({
      username: credential.username,
      password: credential.password,
      role: credential.role,
      name: credential.name
    }));

export const updatePassword = (currentPassword: string, newPassword: string): boolean => {
  if (isFirebaseAuthEnabled()) {
    return false;
  }
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return false;
  }

  const users = getStoredUsers();
  const userIndex = users.findIndex((user) => user.id === currentUser.id);

  if (userIndex === -1 || !verifyPassword(currentPassword, users[userIndex].password)) {
    return false;
  }

  users[userIndex] = {
    ...users[userIndex],
    password: hashPassword(newPassword)
  };
  saveStoredUsers(users);
  syncCurrentUser(users);
  appendUserLog({
    action: 'password_change',
    actorId: currentUser.id,
    actorName: currentUser.name,
    details: 'تغيير كلمة المرور للحساب الحالي'
  });

  return true;
};

export const getAdminUsers = (): User[] => getStoredUsers().map(toPublicUser);

export const createAdminUser = (payload: {
  name: string;
  username: string;
  email: string;
  role: User['role'];
  password: string;
}): UserMutationResult => {
  if (isFirebaseAuthEnabled()) {
    return { success: false, message: 'إدارة المستخدمين تتم عبر Firebase عند تفعيل المصادقة السحابية' };
  }
  const users = getStoredUsers();
  const username = payload.username.trim().toLowerCase();
  const email = payload.email.trim().toLowerCase();

  if (!username || !payload.name.trim() || !email || !payload.password.trim()) {
    return { success: false, message: 'جميع الحقول مطلوبة' };
  }

  if (payload.password.trim().length < 6) {
    return { success: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
  }

  if (users.some((user) => user.username.toLowerCase() === username)) {
    return { success: false, message: 'اسم المستخدم موجود مسبقًا' };
  }

  if (users.some((user) => user.email.toLowerCase() === email)) {
    return { success: false, message: 'البريد الإلكتروني موجود مسبقًا' };
  }

  const newUser: StoredUser = {
    id: Date.now().toString(),
    name: payload.name.trim(),
    username,
    email,
    role: payload.role,
    createdAt: new Date().toISOString(),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    password: hashPassword(payload.password.trim())
  };

  users.push(newUser);
  saveStoredUsers(users);
  const actor = getCurrentUser();
  appendUserLog({
    action: 'user_create',
    actorId: actor?.id,
    actorName: actor?.name,
    targetUserId: newUser.id,
    targetUserName: newUser.name,
    details: `إضافة مستخدم جديد بصلاحية ${newUser.role}`
  });

  return { success: true, message: 'تمت إضافة المستخدم بنجاح', user: toPublicUser(newUser) };
};

export const updateAdminUser = (
  id: string,
  updates: { name: string; username: string; email: string; role: User['role'] }
): UserMutationResult => {
  if (isFirebaseAuthEnabled()) {
    return { success: false, message: 'تعديل المستخدمين يتم عبر Firebase عند تفعيل المصادقة السحابية' };
  }
  const users = getStoredUsers();
  const userIndex = users.findIndex((user) => user.id === id);
  if (userIndex === -1) {
    return { success: false, message: 'المستخدم غير موجود' };
  }

  const username = updates.username.trim().toLowerCase();
  const email = updates.email.trim().toLowerCase();

  if (!username || !updates.name.trim() || !email) {
    return { success: false, message: 'الاسم واسم المستخدم والبريد مطلوبة' };
  }

  if (users.some((user) => user.id !== id && user.username.toLowerCase() === username)) {
    return { success: false, message: 'اسم المستخدم موجود مسبقًا' };
  }

  if (users.some((user) => user.id !== id && user.email.toLowerCase() === email)) {
    return { success: false, message: 'البريد الإلكتروني موجود مسبقًا' };
  }

  const currentUser = users[userIndex];
  if (currentUser.role === 'admin' && updates.role !== 'admin') {
    const adminCount = users.filter((user) => user.role === 'admin').length;
    if (adminCount <= 1) {
      return { success: false, message: 'لا يمكن إزالة صلاحية آخر مدير' };
    }
  }

  const updatedUser: StoredUser = {
    ...currentUser,
    name: updates.name.trim(),
    username,
    email,
    role: updates.role
  };

  users[userIndex] = updatedUser;
  saveStoredUsers(users);
  syncCurrentUser(users);
  const actor = getCurrentUser();
  appendUserLog({
    action: 'user_update',
    actorId: actor?.id,
    actorName: actor?.name,
    targetUserId: updatedUser.id,
    targetUserName: updatedUser.name,
    details: `تحديث بيانات مستخدم (${updatedUser.role})`
  });

  return { success: true, message: 'تم تحديث المستخدم بنجاح', user: toPublicUser(updatedUser) };
};

export const removeAdminUser = (id: string): UserMutationResult => {
  if (isFirebaseAuthEnabled()) {
    return { success: false, message: 'حذف المستخدمين يتم عبر Firebase عند تفعيل المصادقة السحابية' };
  }
  const users = getStoredUsers();
  const userToDelete = users.find((user) => user.id === id);

  if (!userToDelete) {
    return { success: false, message: 'المستخدم غير موجود' };
  }

  const currentUser = getCurrentUser();
  if (currentUser?.id === id) {
    return { success: false, message: 'لا يمكنك حذف حسابك الحالي' };
  }

  if (userToDelete.role === 'admin') {
    const adminCount = users.filter((user) => user.role === 'admin').length;
    if (adminCount <= 1) {
      return { success: false, message: 'لا يمكن حذف آخر مدير في النظام' };
    }
  }

  const nextUsers = users.filter((user) => user.id !== id);
  saveStoredUsers(nextUsers);
  syncCurrentUser(nextUsers);
  const actor = getCurrentUser();
  appendUserLog({
    action: 'user_delete',
    actorId: actor?.id,
    actorName: actor?.name,
    targetUserId: userToDelete.id,
    targetUserName: userToDelete.name,
    details: `حذف مستخدم بصلاحية ${userToDelete.role}`
  });

  return { success: true, message: 'تم حذف المستخدم بنجاح' };
};

export const updateAdminUserPassword = (id: string, newPassword: string): UserMutationResult => {
  if (isFirebaseAuthEnabled()) {
    return { success: false, message: 'تعديل كلمات المرور يتم عبر Firebase عند تفعيل المصادقة السحابية' };
  }
  const users = getStoredUsers();
  const userIndex = users.findIndex((user) => user.id === id);

  if (userIndex === -1) {
    return { success: false, message: 'المستخدم غير موجود' };
  }

  if (newPassword.trim().length < 6) {
    return { success: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
  }

  users[userIndex] = {
    ...users[userIndex],
    password: hashPassword(newPassword.trim())
  };

  saveStoredUsers(users);
  syncCurrentUser(users);
  const actor = getCurrentUser();
  appendUserLog({
    action: 'user_password_update',
    actorId: actor?.id,
    actorName: actor?.name,
    targetUserId: users[userIndex].id,
    targetUserName: users[userIndex].name,
    details: 'تحديث كلمة مرور مستخدم'
  });

  return { success: true, message: 'تم تحديث كلمة مرور المستخدم' };
};

export const getStoreSettings = (): StoreSettings => {
  const stored = safeParse<StoreSettings | null>(
    localStorage.getItem(STORAGE_KEYS.SETTINGS),
    null
  );

  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }

  const mergedSettings = {
    ...DEFAULT_SETTINGS,
    ...stored
  };

  // Backward compatibility for older data that only had a single hero image field.
  const normalizedHeroImages = Array.isArray(mergedSettings.heroImageUrls)
    ? mergedSettings.heroImageUrls.map((url) => String(url).trim()).filter(Boolean)
    : [];
  const normalizedFooterCategories = Array.isArray(mergedSettings.footerCategories)
    ? mergedSettings.footerCategories
      .map((category) => String(category).trim())
      .filter(Boolean)
    : [];
  const normalizedQuickLinks = Array.isArray(mergedSettings.quickLinks)
    ? mergedSettings.quickLinks
      .map((item) => ({
        message: String(item?.message || '').trim(),
        label: String(item?.label || '').trim(),
        url: String(item?.url || '').trim()
      }))
      .filter((item) => item.label && item.url)
    : [];

  return {
    ...mergedSettings,
    heroSlideIntervalSec: Math.min(
      15,
      Math.max(2, Number(mergedSettings.heroSlideIntervalSec) || 5)
    ),
    heroImageUrls:
      normalizedHeroImages.length > 0
        ? normalizedHeroImages
        : mergedSettings.heroImageUrl.trim()
          ? [mergedSettings.heroImageUrl.trim()]
          : [],
    footerCategories:
      normalizedFooterCategories.length > 0
        ? normalizedFooterCategories
        : DEFAULT_SETTINGS.footerCategories,
    quickLinks:
      normalizedQuickLinks.length > 0
        ? normalizedQuickLinks
        : DEFAULT_SETTINGS.quickLinks,
    externalDbEnabled: true,
    externalDbProvider: 'supabase',
    externalDbUrl: String(mergedSettings.externalDbUrl || DEFAULT_EXTERNAL_DB_URL).trim(),
    externalDbName: String(mergedSettings.externalDbName || DEFAULT_EXTERNAL_DB_NAME).trim(),
    externalDbApiKey: String(mergedSettings.externalDbApiKey || DEFAULT_EXTERNAL_DB_API_KEY).trim(),
    visitorCount: Math.max(0, Number(mergedSettings.visitorCount) || 0),
    visitorUniqueCount: Math.max(0, Number(mergedSettings.visitorUniqueCount) || 0),
    visitorDailyStats: pruneVisitorDayStats(toSafeCounterRecord(mergedSettings.visitorDailyStats)),
    visitorMonthlyStats: pruneVisitorMonthStats(toSafeCounterRecord(mergedSettings.visitorMonthlyStats)),
    themePrimaryColor: normalizeHexColor(mergedSettings.themePrimaryColor, DEFAULT_THEME_PRIMARY),
    themeAccentColor: normalizeHexColor(mergedSettings.themeAccentColor, DEFAULT_THEME_ACCENT),
    themeBackgroundColor: normalizeHexColor(mergedSettings.themeBackgroundColor, DEFAULT_THEME_BACKGROUND),
    themeForegroundColor: normalizeHexColor(mergedSettings.themeForegroundColor, DEFAULT_THEME_FOREGROUND)
  };
};

export const saveStoreSettings = (settings: StoreSettings): StoreSettings => {
  const normalizedSettings: StoreSettings = {
    ...settings,
    footerCategories: settings.footerCategories
      .map((category) => category.trim())
      .filter(Boolean),
    quickLinks: settings.quickLinks
      .map((item) => ({
        message: (item.message || '').trim(),
        label: item.label.trim(),
        url: item.url.trim()
      }))
      .filter((item) => item.label && item.url),
    visitorCount: Math.max(0, Number(settings.visitorCount) || 0),
    visitorUniqueCount: Math.max(0, Number(settings.visitorUniqueCount) || 0),
    visitorDailyStats: pruneVisitorDayStats(toSafeCounterRecord(settings.visitorDailyStats)),
    visitorMonthlyStats: pruneVisitorMonthStats(toSafeCounterRecord(settings.visitorMonthlyStats)),
    externalDbEnabled: true,
    externalDbProvider: 'supabase'
  };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(normalizedSettings));
  queueCloudSync(() => syncSettingsToCloud(normalizedSettings));
  window.dispatchEvent(new Event('bagstore:settings-updated'));
  return normalizedSettings;
};

export const trackVisitorSession = (): void => {
  const sessionStorageSafe = getSessionStorageSafe();
  if (!sessionStorageSafe) return;
  const current = getStoreSettings();
  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10);
  const monthKey = dayKey.slice(0, 7);
  const alreadyTrackedSession = sessionStorageSafe.getItem(STORAGE_KEYS.VISITOR_TRACKED) === '1';
  const alreadyTrackedUnique = localStorage.getItem(STORAGE_KEYS.UNIQUE_VISITOR_TRACKED) === '1';

  let next = current;
  let changed = false;

  if (!alreadyTrackedSession) {
    const nextDaily = {
      ...toSafeCounterRecord(current.visitorDailyStats),
      [dayKey]: (current.visitorDailyStats[dayKey] || 0) + 1
    };
    const nextMonthly = {
      ...toSafeCounterRecord(current.visitorMonthlyStats),
      [monthKey]: (current.visitorMonthlyStats[monthKey] || 0) + 1
    };

    next = {
      ...next,
      visitorCount: Math.max(0, Number(next.visitorCount) || 0) + 1,
      visitorDailyStats: pruneVisitorDayStats(nextDaily),
      visitorMonthlyStats: pruneVisitorMonthStats(nextMonthly)
    };
    sessionStorageSafe.setItem(STORAGE_KEYS.VISITOR_TRACKED, '1');
    changed = true;
  }

  if (!alreadyTrackedUnique) {
    next = {
      ...next,
      visitorUniqueCount: Math.max(0, Number(next.visitorUniqueCount) || 0) + 1
    };
    localStorage.setItem(STORAGE_KEYS.UNIQUE_VISITOR_TRACKED, '1');
    changed = true;
  }

  if (!changed) return;

  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(next));
  queueCloudSync(() => syncSettingsToCloud(next));
  window.dispatchEvent(new Event('bagstore:settings-updated'));
};
