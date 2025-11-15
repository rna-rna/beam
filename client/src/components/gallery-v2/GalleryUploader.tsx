import React from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryUploaderProps {
  isDragActive: boolean;
  selectMode: boolean;
  onDrop: (files: File[]) => void;
  getRootProps: () => any;
  getInputProps: () => any;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const GalleryUploader: React.FC<GalleryUploaderProps> = ({
  isDragActive,
  selectMode,
  onDrop,
  getRootProps,
  getInputProps,
  inputRef,
}) => {
  return (
    <>
      {/* Hidden file input */}
      <input {...getInputProps()} ref={inputRef} />
      
      {/* Drag overlay */}
      {isDragActive && !selectMode && (
        <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <Upload className="w-16 h-16 text-primary mx-auto mb-4" style={{ opacity: 1 }} />
            <h3 className="text-xl font-semibold text-white">
              Drop images here
            </h3>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Hook to manage dropzone configuration
 */
export const useGalleryDropzone = (
  onDrop: (files: File[]) => void,
  selectMode: boolean
) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
    },
    noClick: selectMode,
    noKeyboard: selectMode,
    noDragEventsBubbling: true,
  });

  return {
    getRootProps,
    getInputProps,
    isDragActive,
  };
};