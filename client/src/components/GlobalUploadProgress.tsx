
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useUpload } from "@/context/UploadContext";

const GlobalUploadProgress = () => {
  const { batches } = useUpload();

  if (batches.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 left-4 space-y-2 z-50"
      >
        {batches.map(batch => {
          const uploadedMB = (batch.uploadedBytes / (1024 * 1024)).toFixed(2);
          const totalSizeMB = (batch.totalSize / (1024 * 1024)).toFixed(2);

          return (
            <motion.div
              key={batch.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-background/80 backdrop-blur-sm p-4 rounded-lg shadow-lg border w-64"
            >
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">
                  Uploading {batch.files.length} {batch.files.length === 1 ? 'file' : 'files'}...
                </span>
              </div>
              <div className="space-y-1">
                <Progress value={Math.min(batch.progress, 100)} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{uploadedMB} MB / {totalSizeMB} MB</span>
                  <span>{Math.min(Math.round(batch.progress), 100)}%</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
};

export default GlobalUploadProgress;
