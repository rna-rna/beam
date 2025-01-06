
export const getCloudinaryUrl = (publicId: string, transformations: string = '') => {
  return `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/${transformations}/${publicId}`;
};
