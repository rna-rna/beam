import React, { createContext, useContext, useState } from "react";

interface Batch {
  id: string;
  filesCount: number;
  totalSize: number;
  uploadedBytes: number;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
}

interface UploadContextType {
  batches: Batch[];
  addBatch: (batchId: string, totalSize: number, filesCount: number) => void;
  updateBatchProgress: (batchId: string, incrementBytes: number) => void;
  completeBatch: (batchId: string, success: boolean) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [batches, setBatches] = useState<Batch[]>([]);

  const addBatch = (batchId: string, totalSize: number, filesCount: number) => {
    setBatches(prev => [...prev, {
      id: batchId,
      filesCount,
      totalSize,
      uploadedBytes: 0,
      progress: 0,
      status: 'uploading'
    }]);
  };

  const updateBatchProgress = (batchId: string, incrementBytes: number) => {
    setBatches(prev => prev.map(batch => {
      if (batch.id !== batchId) return batch;
      const uploadedBytes = Math.min(batch.uploadedBytes + incrementBytes, batch.totalSize);
      return {
        ...batch,
        uploadedBytes,
        progress: (uploadedBytes / batch.totalSize) * 100
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