
import { useUpload } from "../context/UploadContext";
import { Progress } from "./ui/progress";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const GlobalUploadProgress = () => {
  const { isUploading, uploadProgress } = useUpload();

  if (!isUploading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 left-4 bg-background/80 backdrop-blur-sm p-4 rounded-lg shadow-lg border z-50 w-64"
    >
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm font-medium">Uploading...</span>
      </div>
      <Progress value={uploadProgress} className="h-2" />
      <div className="text-xs text-muted-foreground mt-1 text-right">
        {Math.round(uploadProgress)}%
      </div>
    </motion.div>
  );
};

export default GlobalUploadProgress;
