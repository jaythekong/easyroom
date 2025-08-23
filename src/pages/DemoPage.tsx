import React from "react";
import { DemoConversionBanner } from "@/components/demo/DemoConversionBanner";
import { DemoStickyButton } from "@/components/demo/DemoStickyButton";
import { DemoProvider } from "@/contexts/DemoContext";
import DemoDashboard from "@/components/demo/DemoDashboard";

export default function DemoPage() {
  return (
    <DemoProvider>
      <div className="min-h-screen bg-background">
        {/* Conversion Banner */}
        <DemoConversionBanner />
        
        {/* Demo Dashboard with isolated components */}
        <DemoDashboard />

        {/* Sticky Conversion Button */}
        <DemoStickyButton />
      </div>
    </DemoProvider>
  );
}