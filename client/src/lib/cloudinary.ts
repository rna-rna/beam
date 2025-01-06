
export const getCloudinaryUrl = (publicId: string | null | undefined, transformations: string = '') => {
  if (!publicId || !import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) {
    console.warn('Missing publicId or cloud name:', { publicId });
    return null;
  }
  
  // Check if image requires transparency preservation
  const isPNG = publicId.toLowerCase().endsWith('.png');
  const format = isPNG ? 'f_png' : 'f_auto';
  
  // Ensure quality auto is added if not present
  const baseTransforms = transformations || 'w_1600';
  const transforms = baseTransforms.includes('q_auto') ? baseTransforms : `${baseTransforms},q_auto`;
  
  // Combine transforms with format
  const finalTransforms = `${transforms},${format}`;
  
  return `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/${finalTransforms}/${publicId}`;
};
