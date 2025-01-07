
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CopyLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryUrl: string;
}

export function CopyLinkModal({ isOpen, onClose, galleryUrl }: CopyLinkModalProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(galleryUrl);
    setCopied(true);
    toast({
      title: "Link copied",
      description: "Gallery link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <p>Anyone with this link can view the gallery.</p>
          <div className="flex items-center gap-2">
            <Input value={galleryUrl} readOnly />
            <Button size="icon" onClick={handleCopyLink}>
              {copied ? <CheckCircle className="text-green-500" /> : <Copy />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
