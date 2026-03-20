import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginWithSupabase = vi.fn();
const getSupabaseSessionUser = vi.fn(async () => null);
const logoutFromSupabase = vi.fn(async () => undefined);
const listSupabaseUsers = vi.fn(async () => []);
const updateCurrentUserPasswordWithSupabase = vi.fn(async () => false);

vi.mock('@/lib/supabase-auth', () => ({
  loginWithSupabase,
  getSupabaseSessionUser,
  logoutFromSupabase,
  listSupabaseUsers,
  updateCurrentUserPasswordWithSupabase,
}));

describe('storage auth and settings', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('logs in with Supabase user data and creates a session', async () => {
    loginWithSupabase.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Admin User',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      avatar: '',
      createdAt: '2024-01-01T00:00:00.000Z',
    });

    const storage = await import('@/lib/storage');

    const user = await storage.login('admin@example.com', 'secret123');

    expect(user?.role).toBe('admin');
    expect(storage.isAuthenticated()).toBe(true);
    expect(storage.getCurrentUser()?.email).toBe('admin@example.com');
  });

  it('locks out login after repeated failures', async () => {
    loginWithSupabase.mockRejectedValue(new Error('invalid login'));
    const storage = await import('@/lib/storage');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await storage.login('admin@example.com', 'wrong-password');
      expect(result).toBeNull();
    }

    expect(storage.getLoginLockoutRemainingMs()).toBeGreaterThan(0);
    expect(await storage.login('admin@example.com', 'secret123')).toBeNull();
  });

  it('clears the session on logout', async () => {
    loginWithSupabase.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Admin User',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      avatar: '',
      createdAt: '2024-01-01T00:00:00.000Z',
    });

    const storage = await import('@/lib/storage');

    await storage.login('admin@example.com', 'secret123');
    expect(storage.isAuthenticated()).toBe(true);

    storage.logout();

    expect(storage.isAuthenticated()).toBe(false);
    expect(storage.getCurrentUser()).toBeNull();
    expect(logoutFromSupabase).toHaveBeenCalled();
  });

  it('preserves disabled cloud sync in saved settings', async () => {
    const storage = await import('@/lib/storage');

    const initial = storage.getStoreSettings();
    const saved = storage.saveStoreSettings({
      ...initial,
      externalDbEnabled: false,
      externalDbUrl: '',
      externalDbApiKey: '',
    });

    expect(saved.externalDbEnabled).toBe(false);
    expect(storage.getStoreSettings().externalDbEnabled).toBe(false);
  });
});
