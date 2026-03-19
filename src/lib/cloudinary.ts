import { getStoreSettings } from "@/lib/storage";

function getCloudinaryConfig() {
  const settings = getStoreSettings();
  const cloudName = settings.cloudinaryCloudName?.trim();
  const uploadPreset = settings.cloudinaryUploadPreset?.trim();

  if (!cloudName || !uploadPreset) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ Cloudinary disabled: Missing config. Using placeholder URLs.');
    }
    return null;
  }

  return { cloudName, uploadPreset };
}

export async function uploadImageToCloudinary(file: File): Promise<string> {
  const config = getCloudinaryConfig();
  if (!config) {
    // Fallback: generate placeholder URL (works with img tags)
    const placeholder = `https://via.placeholder.com/800x600/${Math.floor(Math.random()*16777215).toString(16)}/ffffff?text=${encodeURIComponent(file.name)}`;
    if (import.meta.env.DEV) console.info('Used Cloudinary placeholder:', placeholder);
    return placeholder;
  }

  const { cloudName, uploadPreset } = config;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const data = await response.json() as { secure_url?: string };
    if (!data.secure_url) {
      throw new Error("Cloudinary response missing secure_url.");
    }
    return data.secure_url;
  } catch (error) {
    if (import.meta.env.DEV) console.warn('Cloudinary upload failed, using fallback:', error);
    return `https://via.placeholder.com/800x600/cccccc/666666?text=Failed+${file.name}`;
  }
}
