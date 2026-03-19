import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase-auth", () => ({
  getFirebaseCurrentSession: vi.fn(async () => null),
  isFirebaseAuthEnabled: vi.fn(() => false),
  signInWithFirebase: vi.fn(),
  signOutFirebase: vi.fn(async () => undefined),
}));

describe("storage auth and settings", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("logs in with local demo credentials and creates a session", async () => {
    const storage = await import("@/lib/storage");

    const user = await storage.login("admin", "admin123");

    expect(user?.role).toBe("admin");
    expect(storage.isAuthenticated()).toBe(true);
    expect(storage.getCurrentUser()?.username).toBe("admin");
  });

  it("locks out local login after repeated failures", async () => {
    const storage = await import("@/lib/storage");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await storage.login("admin", "wrong-password");
      expect(result).toBeNull();
    }

    expect(storage.getLoginLockoutRemainingMs()).toBeGreaterThan(0);
    expect(await storage.login("admin", "admin123")).toBeNull();
  });

  it("clears the session on logout", async () => {
    const storage = await import("@/lib/storage");

    await storage.login("admin", "admin123");
    expect(storage.isAuthenticated()).toBe(true);

    storage.logout();

    expect(storage.isAuthenticated()).toBe(false);
    expect(storage.getCurrentUser()).toBeNull();
  });

  it("preserves disabled cloud sync in saved settings", async () => {
    const storage = await import("@/lib/storage");

    const initial = storage.getStoreSettings();
    const saved = storage.saveStoreSettings({
      ...initial,
      externalDbEnabled: false,
      externalDbUrl: "",
      externalDbApiKey: "",
    });

    expect(saved.externalDbEnabled).toBe(false);
    expect(storage.getStoreSettings().externalDbEnabled).toBe(false);
  });
});
