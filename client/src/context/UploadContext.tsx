
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
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

interface UploadInfo {
  totalSize: number;
  uploadedBytes: number;
  fileCount: number;
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeUploads, setActiveUploads] = useState<string[]>(() => {
    const persisted = sessionStorage.getItem("uploadState");
    return persisted ? JSON.parse(persisted).activeUploads : [];
  });
  const [uploadInfo, setUploadInfo] = useState<Record<string, UploadInfo>>(() => {
    const persisted = sessionStorage.getItem("uploadState");
    return persisted ? JSON.parse(persisted).uploadInfo : {};
  });

  useEffect(() => {
    sessionStorage.setItem("uploadState", JSON.stringify({
      activeUploads,
      uploadInfo,
      isUploading,
      uploadProgress
    }));
  }, [activeUploads, uploadInfo, isUploading, uploadProgress]);

  const getTotalProgress = (info = uploadInfo) => {
    const total = Object.values(info).reduce(
      (acc, curr) => ({
        totalSize: acc.totalSize + curr.totalSize,
        uploadedBytes: acc.uploadedBytes + curr.uploadedBytes,
        fileCount: acc.fileCount + curr.fileCount,
      }),
      { totalSize: 0, uploadedBytes: 0, fileCount: 0 }
    );

    return {
      progress: total.totalSize > 0 ? (total.uploadedBytes / total.totalSize) * 100 : 0,
      ...total,
    };
  };

  const startUpload = (uploadId: string, totalSize: number, fileCount: number) => {
    setActiveUploads(prev => [...prev, uploadId]);
    setUploadInfo(prev => ({
      ...prev,
      [uploadId]: {
        totalSize,
        uploadedBytes: 0,
        fileCount,
      },
    }));
    setIsUploading(true);
  };

  const updateProgress = (uploadId: string, incrementBytes: number) => {
    setUploadInfo(prev => {
      const upload = prev[uploadId];
      if (!upload) return prev;

      const updatedUploadedBytes = upload.uploadedBytes + incrementBytes;
      const updatedInfo = {
        ...prev,
        [uploadId]: {
          ...upload,
          uploadedBytes: Math.min(updatedUploadedBytes, upload.totalSize),
        },
      };

      const { progress } = getTotalProgress(updatedInfo);
      setUploadProgress(progress);

      return updatedInfo;
    });
  };

  const completeUpload = (uploadId: string) => {
    setActiveUploads(prev => prev.filter(id => id !== uploadId));
    setUploadInfo(prev => {
      const { [uploadId]: removed, ...rest } = prev;
      const { progress } = getTotalProgress(rest);
      setUploadProgress(progress);
      return rest;
    });

    if (activeUploads.length <= 1) {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const totalProgress = getTotalProgress();

  return (
    <UploadContext.Provider
      value={{
        isUploading,
        uploadProgress,
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
