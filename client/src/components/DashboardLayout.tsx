import { DashboardSidebar } from "@/components/DashboardSidebar";
import { ReactNode, memo } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const sidebar = <DashboardSidebar />;

export const DashboardLayout = memo(function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex flex-1 bg-background min-h-screen">
      <aside className="hidden md:block w-64 border-r fixed top-[64px] bottom-0 left-0">
        {sidebar}
      </aside>
      <main className="flex-1 flex flex-col md:ml-64">
        {children}
      </main>
    </div>
  );
}); 