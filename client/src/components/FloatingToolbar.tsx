import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trash2, Download, Paintbrush, ArrowUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function FloatingToolbar({
  selectedCount,
  totalCount,
  onDeselect,
  onDelete,
  onDownload,
  onEdit,
  onReorder,
  onSelectAll,
}: {
  selectedCount: number;
  totalCount: number;
  onDeselect: () => void;
  onDelete: () => void;
  onDownload: (quality: 'original' | 'optimized') => void;
  onEdit: () => void;
  onReorder: () => void;
  onSelectAll: () => void;
}) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-8 w-full flex justify-center z-50"
    >
      <div className="bg-background/80 backdrop-blur-lg border rounded-lg shadow-lg p-4 flex items-center gap-6">
        <span className="text-sm font-medium">{selectedCount} selected</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onReorder}>
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Reorder
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Paintbrush className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onDownload('original')}>
                Original Files
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload('optimized')}>
                Optimized Files
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="secondary" size="sm" onClick={selectedCount === totalCount ? onDeselect : onSelectAll}>
            {selectedCount === totalCount ? "Deselect All" : "Select All"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}