import { beforeEach, describe, expect, it, vi } from "vitest";

const getStoreSettingsMock = vi.fn();

vi.mock("@/lib/storage", () => ({
  getStoreSettings: () => getStoreSettingsMock(),
}));

describe("uploadImageToCloudinary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("throws a clear error when Cloudinary config is missing", async () => {
    getStoreSettingsMock.mockReturnValue({
      cloudinaryCloudName: "",
      cloudinaryUploadPreset: "",
    });

    const { uploadImageToCloudinary } = await import("@/lib/cloudinary");

    await expect(
      uploadImageToCloudinary(new File(["demo"], "bag.png", { type: "image/png" })),
    ).rejects.toThrow("إعدادات Cloudinary غير مكتملة");
  });

  it("returns the secure url when upload succeeds", async () => {
    getStoreSettingsMock.mockReturnValue({
      cloudinaryCloudName: "demo-cloud",
      cloudinaryUploadPreset: "demo-preset",
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: "https://cdn.example.com/bag.png" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { uploadImageToCloudinary } = await import("@/lib/cloudinary");
    const result = await uploadImageToCloudinary(
      new File(["demo"], "bag.png", { type: "image/png" }),
    );

    expect(result).toBe("https://cdn.example.com/bag.png");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain("/demo-cloud/image/upload");
  });

  it("throws a clear error when the upload request fails", async () => {
    getStoreSettingsMock.mockReturnValue({
      cloudinaryCloudName: "demo-cloud",
      cloudinaryUploadPreset: "demo-preset",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    );

    const { uploadImageToCloudinary } = await import("@/lib/cloudinary");

    await expect(
      uploadImageToCloudinary(new File(["demo"], "bag.png", { type: "image/png" })),
    ).rejects.toThrow("HTTP 401");
  });
});
