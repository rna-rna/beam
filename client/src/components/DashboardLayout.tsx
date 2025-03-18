import { DashboardSidebar } from "@/components/DashboardSidebar";
import { ReactNode, memo } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const sidebar = <DashboardSidebar />;

export const DashboardLayout = memo(function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex flex-1 bg-background min-h-[calc(100vh-64px)]">
      <aside className="hidden md:block w-64 border-r fixed top-[64px] bottom-0 left-0 overflow-y-auto">
        {sidebar}
      </aside>
      <main className="flex-1 flex flex-col w-full md:ml-64 overflow-hidden">
        {children}
      </main>
    </div>
  );
}); 