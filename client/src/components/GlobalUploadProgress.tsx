
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useUpload } from "@/context/UploadContext";

const GlobalUploadProgress = () => {
  const { batches } = useUpload();

  if (batches.length === 0) return null;

  // Compute overall progress
  const overallUploadedBytes = batches.reduce(
    (sum, batch) => sum + batch.uploadedBytes,
    0
  );
  const overallTotalSize = batches.reduce(
    (sum, batch) => sum + batch.totalSize,
    0
  );
  const overallProgress =
    overallTotalSize > 0 ? (overallUploadedBytes / overallTotalSize) * 100 : 0;
  const overallUploadedMB = (overallUploadedBytes / (1024 * 1024)).toFixed(2);
  const overallTotalMB = (overallTotalSize / (1024 * 1024)).toFixed(2);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 left-4 space-y-2 z-50"
      >
        <motion.div
          key="overall-upload"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-background/80 backdrop-blur-sm p-4 rounded-lg shadow-lg border w-64"
        >
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">
              Uploading {batches.length} {batches.length === 1 ? 'file' : 'files'}...
            </span>
          </div>
          <div className="space-y-1">
            <Progress value={Math.min(overallProgress, 100)} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {overallUploadedMB} MB / {overallTotalMB} MB
              </span>
              <span>{Math.min(Math.round(overallProgress), 100)}%</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GlobalUploadProgress;
