import React from "react";
import { DemoConversionBanner } from "@/components/demo/DemoConversionBanner";
import { DemoStickyButton } from "@/components/demo/DemoStickyButton";
import { DemoProvider } from "@/contexts/DemoContext";
import { DemoAuthProvider } from "@/components/demo/DemoAuthProvider";
import { DemoOrganizationProvider } from "@/components/demo/DemoOrganizationProvider";
import DemoDashboard from "@/components/demo/DemoDashboard";

export default function DemoPage() {
  return (
    <DemoProvider>
      <DemoAuthProvider>
        <DemoOrganizationProvider>
          <div className="min-h-screen bg-background">
            {/* Conversion Banner */}
            <DemoConversionBanner />
            
            {/* Use the exact same Dashboard UI with demo data */}
            <DemoDashboard />

            {/* Sticky Conversion Button */}
            <DemoStickyButton />
          </div>
        </DemoOrganizationProvider>
      </DemoAuthProvider>
    </DemoProvider>
  );
}