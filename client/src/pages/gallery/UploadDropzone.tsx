import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  canUpload: boolean;
  onDrop: (files: File[]) => void;
}

export default function UploadDropzone({ canUpload, onDrop }: UploadDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    disabled: !canUpload,
    noClick: true,
    noKeyboard: true,
  });

  return (
    <div {...getRootProps()} className="relative">
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <Upload className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white">Drop images here</h3>
          </div>
        </div>
      )}
    </div>
  );
}
