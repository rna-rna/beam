
import React, { createContext, useContext, useState } from "react";

interface Batch {
  id: string;
  files: {
    name: string;
    size: number;
    uploadedBytes: number;
  }[];
  totalSize: number;
  uploadedBytes: number;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
}

interface UploadContextType {
  batches: Batch[];
  addBatch: (batchId: string, files: { name: string; size: number; }[]) => void;
  updateBatchProgress: (batchId: string, fileName: string, incrementBytes: number) => void;
  completeBatch: (batchId: string, success: boolean) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [batches, setBatches] = useState<Batch[]>([]);

  const addBatch = (batchId: string, files: { name: string; size: number; }[]) => {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    setBatches(prev => {
      const filtered = prev.filter(batch => batch.id !== batchId);
      return [...filtered, {
        id: batchId,
        files: files.map(f => ({ ...f, uploadedBytes: 0 })),
        totalSize,
        uploadedBytes: 0,
        progress: 0,
        status: 'uploading'
      }];
    });
  };

  const updateBatchProgress = (batchId: string, fileName: string, incrementBytes: number) => {
    setBatches(prev => prev.map(batch => {
      if (batch.id !== batchId) return batch;
      
      const updatedFiles = batch.files.map(file => {
        if (file.name !== fileName) return file;
        return {
          ...file,
          uploadedBytes: Math.min(file.uploadedBytes + incrementBytes, file.size)
        };
      });
      
      const totalUploaded = updatedFiles.reduce((sum, file) => sum + file.uploadedBytes, 0);
      
      return {
        ...batch,
        files: updatedFiles,
        uploadedBytes: totalUploaded,
        progress: (totalUploaded / batch.totalSize) * 100
      };
    }));
  };

  const completeBatch = (batchId: string, success: boolean) => {
    setBatches(prev => prev.filter(batch => batch.id !== batchId));
  };

  return (
    <UploadContext.Provider
      value={{
        batches,
        addBatch,
        updateBatchProgress,
        completeBatch
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
