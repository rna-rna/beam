import React, { createContext, useContext, useState, useEffect } from "react";

interface UploadContextType {
  isUploading: boolean;
  uploadProgress: number;
  activeUploads: string[];
  totalSize: number;
  uploadedBytes: number;
  fileCount: number;
  startUpload: (uploadId: string, totalSize: number, fileCount: number) => void;
  updateProgress: (uploadId: string, incrementBytes: number) => void;
  completeUpload: (uploadId: string) => void;
  allUploadsComplete: boolean;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

interface UploadInfo {
  totalSize: number;
  uploadedBytes: number;
  fileCount: number;
  progress: number;
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploadInfo, setUploadInfo] = useState<Record<string, UploadInfo>>({});
  const [activeUploads, setActiveUploads] = useState<string[]>([]);
  const [allUploadsComplete, setAllUploadsComplete] = useState(false);

  // Calculate overall progress across all active uploads
  const getTotalProgress = (info = uploadInfo) => {
    const uploads = Object.values(info);
    if (uploads.length === 0) return { progress: 0, totalSize: 0, uploadedBytes: 0, fileCount: 0 };

    return uploads.reduce((acc, curr) => ({
      totalSize: acc.totalSize + curr.totalSize,
      uploadedBytes: acc.uploadedBytes + curr.uploadedBytes,
      fileCount: acc.fileCount + curr.fileCount,
      progress: acc.totalSize > 0 ? (acc.uploadedBytes / acc.totalSize) * 100 : 0
    }), { totalSize: 0, uploadedBytes: 0, fileCount: 0, progress: 0 });
  };

  const startUpload = (uploadId: string, totalSize: number, fileCount: number) => {
    if (!activeUploads.includes(uploadId)) {
      setActiveUploads(prev => [...prev, uploadId]);
      setUploadInfo(prev => ({
        ...prev,
        [uploadId]: {
          totalSize,
          uploadedBytes: 0,
          fileCount,
          progress: 0
        },
      }));
    }
  };

  const updateProgress = (uploadId: string, incrementBytes: number) => {
    setUploadInfo(prev => {
      const upload = prev[uploadId];
      if (!upload) return prev;

      const updatedUploadedBytes = Math.min(
        upload.uploadedBytes + incrementBytes,
        upload.totalSize
      );

      const updatedInfo = {
        ...prev,
        [uploadId]: {
          ...upload,
          uploadedBytes: updatedUploadedBytes,
          progress: (updatedUploadedBytes / upload.totalSize) * 100
        },
      };

      return updatedInfo;
    });
  };

  const completeUpload = (uploadId: string) => {
    setActiveUploads(prev => prev.filter(id => id !== uploadId));
    setUploadInfo(prev => {
      const { [uploadId]: removed, ...rest } = prev;
      return rest;
    });
  };

  const totalProgress = getTotalProgress();
  const isUploading = activeUploads.length > 0;

  return (
    <UploadContext.Provider
      value={{
        isUploading,
        uploadProgress: totalProgress.progress,
        activeUploads,
        totalSize: totalProgress.totalSize,
        uploadedBytes: totalProgress.uploadedBytes,
        fileCount: totalProgress.fileCount,
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