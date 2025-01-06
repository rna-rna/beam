
export const getCloudinaryUrl = (publicId: string | null | undefined, transformations: string = '') => {
  if (!publicId || !import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) {
    console.warn('Missing publicId or cloud name:', { publicId });
    return null;
  }
  
  // Ensure f_auto and q_auto are added if not present
  const baseTransforms = transformations || 'w_1600';
  const transforms = baseTransforms.includes('f_auto') ? baseTransforms : `${baseTransforms},f_auto,q_auto`;
  
  return `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/${transforms}/${publicId}`;
};
