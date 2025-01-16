import { S3Client } from "@aws-sdk/client-s3";
import { Image } from "@/types/gallery";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.VITE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.VITE_R2_SECRET_ACCESS_KEY || "",
  },
});

export const R2_BUCKET_NAME = process.env.VITE_R2_BUCKET_NAME || "";

export const getR2Url = (publicId: string, optimize: boolean = false) => {
  if (!publicId) return "/fallback-image.jpg";
  const baseUrl = optimize
    ? `${import.meta.env.VITE_IMAGE_WORKER}/thumb`
    : import.meta.env.VITE_R2_PUBLIC_URL;

  if (!publicId.startsWith("uploads/originals/")) {
    return `${baseUrl}/uploads/originals/${publicId}`;
  }
  return `${baseUrl}/${publicId}`;
};

export const getR2ImageUrl = (
  image: Image | null | undefined,
  optimize: boolean = false,
) => {
  if (!image || !image.url) return "/fallback-image.jpg";
  if (optimize) {
    const urlParts = image.url.split("/");
    const filename = urlParts[urlParts.length - 1];
    return `${import.meta.env.VITE_IMAGE_WORKER}/thumb/${filename}`;
  }
  return image.url;
};
