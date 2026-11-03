const CLOUD_NAME = "q1pw4edf";
const UPLOAD_PRESET = "chat-app";

export const MAX_IMAGE_MB = 15;
export const MAX_VIDEO_MB = 50;

// Badi photo ko chhota karo (upload tez, quota kam kharch)
const shrinkImage = (file, max = 1280) =>
  new Promise((resolve) => {
    if (file.type === "image/gif") return resolve(file);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas
        .getContext("2d")
        .drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => resolve(b || file), "image/jpeg", 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });

// File upload karo, progress (0-100) milta rahega
export const uploadMedia = async (file, onProgress) => {
  // console.log(
  //   "PRESET CHECK:",
  //   JSON.stringify(CLOUD_NAME),
  //   JSON.stringify(UPLOAD_PRESET)
  // );

  if (!CLOUD_NAME.trim() || !UPLOAD_PRESET.trim()) {
    throw new Error("Cloudinary cloud name or preset is empty");
  }

  const kind = file.type.startsWith("video/") ? "video" : "image";
  const body = kind === "image" ? await shrinkImage(file) : file;

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", body);
    form.append("upload_preset", UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`
    );

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      console.log("CLOUDINARY RESPONSE:", xhr.status, xhr.responseText);
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ url: res.secure_url, kind });
        } else {
          reject(new Error(res.error?.message || "Upload failed"));
        }
      } catch {
        reject(new Error("Upload failed"));
      }
    };

    xhr.onerror = () =>
      reject(
        new Error(
          "Could not reach Cloudinary. Check your cloud name, preset and internet connection"
        )
      );
    xhr.send(form);
  });
};