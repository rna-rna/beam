
export const getCloudinaryUrl = (publicId: string | null | undefined, transformations: string = '') => {
  if (!publicId || !import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) {
    console.warn('Missing publicId or cloud name:', { publicId });
    return null;
  }
  return `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/${transformations}/${publicId}`;
};
