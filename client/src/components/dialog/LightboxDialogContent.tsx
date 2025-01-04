
import * as React from "react";
import { cn } from "@/lib/utils";

interface LightboxDialogContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const LightboxDialogContent = React.forwardRef<
  HTMLDivElement,
  LightboxDialogContentProps
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    {...props}
    className={cn(
      "fixed inset-0 w-screen h-screen z-50 flex items-center justify-center bg-black/90 p-0",
      className
    )}
  >
    {children}
  </div>
));

LightboxDialogContent.displayName = "LightboxDialogContent";

export default LightboxDialogContent;
