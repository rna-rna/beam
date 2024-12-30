import React from 'react';
import { InlineEdit } from "@/components/InlineEdit";

interface HeaderBarProps {
  title: string;
  actions?: React.ReactNode;
  onTitleChange?: (newTitle: string) => Promise<void>;
  subtitle?: string;
}

export function HeaderBar({ 
  title, 
  actions, 
  onTitleChange,
  subtitle 
}: HeaderBarProps) {
  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-8 border-b">
      <div className="flex items-center justify-between">
        <div>
          {onTitleChange ? (
            <InlineEdit
              value={title}
              onSave={onTitleChange}
              className="text-3xl font-bold"
            />
          ) : (
            <h1 className="text-3xl font-bold">{title}</h1>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
