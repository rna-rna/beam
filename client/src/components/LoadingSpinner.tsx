import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  className,
  size = 24
}) => {
  return (
    <Loader2 
      className={cn("animate-spin", className)} 
      size={size}
    />
  );
}; 