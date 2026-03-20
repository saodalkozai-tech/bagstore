import { Product, StoreSettings, User, UserActivityLog } from '@/types';
import {
  CLOUD_SETTINGS_KEY,
  CLOUD_SYNC_ERROR_EVENT,
  CLOUD_TABLES,
  createDefaultSettings,
  createNormalizedSettingsForSave,
  DEFAULT_SETTINGS,
  DEFAULT_USERS,
  formatSupabaseError,
  getSessionStorageSafe,
  getSupabaseClient,
  isExternalSupabaseEnabled,
  LOGIN_LOCKOUT_MS,
  LoginGuardState,
  MAX_LOGIN_ATTEMPTS,
  MAX_USER_LOGS,
  MOCK_PRODUCTS,
  normalizeStoredProduct,
  nowMs,
  PRODUCTS_UPDATED_EVENT,
  safeParse,
  SessionMeta,
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_MAX_DURATION_MS,
  STORAGE_KEYS,
  toSafeCounterRecord,
  pruneVisitorDayStats,
  pruneVisitorMonthStats,
  UserMutationResult,
} from './storage-core';
import {
  getSupabaseSessionUser,
  listSupabaseUsers,
  loginWithSupabase,
  logoutFromSupabase,
  updateCurrentUserPasswordWithSupabase
} from './supabase-auth';

export { CLOUD_SYNC_ERROR_EVENT, PRODUCTS_UPDATED_EVENT } from './storage-core';

/**
 * تفريغ جميع البيانات المحلية من التخزين المحلي
 * سيتم حذف: المنتجات، المستخدمين، الإعدادات، السجلات، الجلسات، والبيانات الأخرى
 */
export function clearAllLocalStorage(): void {
  try {
    // حفظ الإعدادات الافتراضية قبل الحذف
    const settings = getStoreSettings();

    // تفريغ جميع البيانات المحلية
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    // إعادة تعيين الإعدادات الافتراضية
    saveStoreSettings(DEFAULT_SETTINGS);

    // إرسال حدث تحديث المنتجات
    window.dispatchEvent(new Event(PRODUCTS_UPDATED_EVENT));

    return { success: true, message: 'تم تفريغ قاعدة البيانات المحلية بنجاح' };
  } catch (error) {
    console.error('خطأ في تفريغ قاعدة البيانات المحلية:', error);
    return { success: false, message: 'فشل تفريغ قاعدة البيانات المحلية' };
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
    const [{ data: productRows, error: productError }, { data: settingsRow, error: settingsError }, { data: logsRows, error: logsError }] = await Promise.all([
      supabase.from(CLOUD_TABLES.PRODUCTS).select('id,data'),
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
    const cloudSettings = settingsRow?.data as StoreSettings | undefined;
    const cloudLogs = (logsRows || [])
      .map((row) => row.data as UserActivityLog)
      .filter((log) => log && typeof log.id === 'string' && typeof log.createdAt === 'string')
      .slice(0, MAX_USER_LOGS);

    if (cloudProducts.length > 0) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(cloudProducts));
      emitProductsUpdated();
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
  const sessionStorageSafe = getSessionStorageSafe();
  const supabaseSessionUser = await getSupabaseSessionUser();

  if (!supabaseSessionUser) {
    sessionStorageSafe?.removeItem(STORAGE_KEYS.AUTH);
    sessionStorageSafe?.removeItem(STORAGE_KEYS.SESSION);
    sessionStorageSafe?.removeItem(STORAGE_KEYS.USER);
    sessionStorageSafe?.removeItem(STORAGE_KEYS.SESSION_META);
    return;
  }

  setSessionForUser(supabaseSessionUser);
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

  let publicUser: User | null = null;

  try {
    publicUser = await loginWithSupabase(username.trim(), password);
  } catch {
    publicUser = null;
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

  void logoutFromSupabase().catch((error) => {
    console.error('Supabase sign-out failed:', error);
  });

  localStorage.removeItem(STORAGE_KEYS.AUTH);
  localStorage.removeItem(STORAGE_KEYS.SESSION);
  localStorage.removeItem(STORAGE_KEYS.USER);
};

export const getDemoCredentials = (): Array<{ username: string; password: string; role: User['role']; name: string }> =>
  [];

export const updatePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return false;
  }

  const updated = await updateCurrentUserPasswordWithSupabase(currentPassword, newPassword);
  if (!updated) {
    return false;
  }

  appendUserLog({
    action: 'password_change',
    actorId: currentUser.id,
    actorName: currentUser.name,
    details: 'تغيير كلمة المرور للحساب الحالي'
  });

  return true;
};

export const getAdminUsers = async (): Promise<User[]> => listSupabaseUsers();

export const createAdminUser = async (_payload: {
  name: string;
  username: string;
  email: string;
  role: User['role'];
  password: string;
}): Promise<UserMutationResult> => {
  return {
    success: false,
    message: 'إنشاء المستخدمين يتم من Supabase Authentication Dashboard في وضع Supabase-only.'
  };
};

export const updateAdminUser = (
  id: string,
  updates: { name: string; username: string; email: string; role: User['role'] }
): Promise<UserMutationResult> => {
  return {
    success: false,
    message: 'تعديل المستخدمين من داخل التطبيق معطل في وضع Supabase-only. عدّل profiles أو المستخدمين من Supabase Dashboard.'
  };
};

export const removeAdminUser = async (_id: string): Promise<UserMutationResult> => {
  return {
    success: false,
    message: 'حذف المستخدمين يتم من Supabase Authentication Dashboard في وضع Supabase-only.'
  };
};

export const updateAdminUserPassword = async (_id: string, _newPassword: string): Promise<UserMutationResult> => {
  return {
    success: false,
    message: 'تغيير كلمات مرور المستخدمين يتم من Supabase Authentication Dashboard في وضع Supabase-only.'
  };
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

  return createDefaultSettings(stored);
};

export const saveStoreSettings = (settings: StoreSettings): StoreSettings => {
  const normalizedSettings = createNormalizedSettingsForSave(settings);
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(normalizedSettings));
  if (isExternalSupabaseEnabled(normalizedSettings)) {
    queueCloudSync(() => syncSettingsToCloud(normalizedSettings));
  }
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
  if (isExternalSupabaseEnabled(next)) {
    queueCloudSync(() => syncSettingsToCloud(next));
  }
  window.dispatchEvent(new Event('bagstore:settings-updated'));
};
