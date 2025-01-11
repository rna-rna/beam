
import React, { createContext, useContext, useState } from "react";

interface UploadContextType {
  isUploading: boolean;
  uploadProgress: number;
  activeUploads: string[];
  totalSize: number;
  uploadedBytes: number;
  fileCount: number;
  startUpload: (uploadId: string, totalSize: number, fileCount: number) => void;
  updateProgress: (uploadedBytes: number) => void;
  completeUpload: (uploadId: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [activeUploads, setActiveUploads] = useState<string[]>([]);
  const [fileCount, setFileCount] = useState(0);

  const startUpload = (uploadId: string, totalSize: number, fileCount: number) => {
    setActiveUploads([uploadId]); // Single upload session
    setTotalSize(totalSize);
    setUploadedBytes(0);
    setFileCount(fileCount);
    setIsUploading(true);
  };

  const updateProgress = (bytes: number) => {
    setUploadedBytes(bytes);
    setUploadProgress((bytes / totalSize) * 100);
  };

  const completeUpload = (uploadId: string) => {
    setActiveUploads((prev) => prev.filter((id) => id !== uploadId));
    if (activeUploads.length <= 1) {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadedBytes(0);
      setTotalSize(0);
      setFileCount(0);
    }
  };

  return (
    <UploadContext.Provider
      value={{
        isUploading,
        uploadProgress,
        activeUploads,
        totalSize,
        uploadedBytes,
        fileCount,
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
