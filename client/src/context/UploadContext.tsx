
import React, { createContext, useContext, useState } from "react";

interface UploadContextType {
  isUploading: boolean;
  uploadProgress: number;
  activeUploads: string[];
  startUpload: (uploadId: string) => void;
  updateProgress: (progress: number) => void;
  completeUpload: (uploadId: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeUploads, setActiveUploads] = useState<string[]>([]);

  const startUpload = (uploadId: string) => {
    setActiveUploads((prev) => [...prev, uploadId]);
    setIsUploading(true);
  };

  const updateProgress = (progress: number) => {
    setUploadProgress(progress);
  };

  const completeUpload = (uploadId: string) => {
    setActiveUploads((prev) => prev.filter((id) => id !== uploadId));
    if (activeUploads.length <= 1) {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <UploadContext.Provider
      value={{
        isUploading,
        uploadProgress,
        activeUploads,
        startUpload,
        updateProgress,
        completeUpload,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
}
