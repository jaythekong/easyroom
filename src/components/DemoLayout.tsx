import { ReactNode } from "react";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { DemoBanner } from "@/components/DemoBanner";
import { AppFooter } from "@/components/AppFooter";

interface DemoLayoutProps {
  children: ReactNode;
}

export function DemoLayout({ children }: DemoLayoutProps) {
  return (
    <OrganizationProvider>
      <div className="min-h-screen flex flex-col">
        <DemoBanner />
        {/* Add top padding to account for demo banner */}
        <div className="flex-1 pt-16">
          {children}
        </div>
        <AppFooter />
      </div>
    </OrganizationProvider>
  );
}