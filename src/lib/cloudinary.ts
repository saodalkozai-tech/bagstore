import { getStoreSettings } from "@/lib/storage";

function getCloudinaryConfig() {
  const settings = getStoreSettings();
  const cloudName = settings.cloudinaryCloudName?.trim();
  const uploadPreset = settings.cloudinaryUploadPreset?.trim();

  if (!cloudName || !uploadPreset) {
    throw new Error('إعدادات Cloudinary غير مكتملة. أضف Cloud Name و Upload Preset أولاً.');
  }

  return { cloudName, uploadPreset };
}

export async function uploadImageToCloudinary(file: File): Promise<string> {
  const { cloudName, uploadPreset } = getCloudinaryConfig();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!response.ok) {
      throw new Error(`فشل رفع الصورة إلى Cloudinary (HTTP ${response.status}).`);
    }

    const data = await response.json() as { secure_url?: string };
    if (!data.secure_url) {
      throw new Error("استجابة Cloudinary لا تحتوي على رابط الصورة.");
    }
    return data.secure_url;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('تعذر رفع الصورة إلى Cloudinary.');
  }
}
