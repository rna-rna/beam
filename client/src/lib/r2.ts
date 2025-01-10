
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
  if (!publicId) return "";
  return `${import.meta.env.VITE_R2_PUBLIC_URL}/beam-01/${publicId}`;
};

export const getR2ImageUrl = (image: Image) => {
  if (!image?.publicId) return "";
  return getR2Url(image.publicId);
};
