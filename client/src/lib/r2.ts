
import { S3Client } from "@aws-sdk/client-s3";
import { Image } from "@/types/gallery";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.VITE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.VITE_R2_SECRET_ACCESS_KEY || ""
  }
});

export const R2_BUCKET_NAME = process.env.VITE_R2_BUCKET_NAME || "";

export const getR2Url = (publicId: string) => {
  if (!publicId) return "/fallback-image.jpg";
  return `${import.meta.env.VITE_R2_PUBLIC_URL}/${publicId}`;
};

export const getR2ImageUrl = (image: Image | null | undefined) => {
  if (!image || !image.url) return "/fallback-image.jpg";
  return image.url;
};
